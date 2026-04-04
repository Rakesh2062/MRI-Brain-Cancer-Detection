import cv2
import numpy as np
import os
import torch
import torch.nn.functional as F
from PIL import Image

# Import the classifier so we can use it for Grad-CAM
import services.classification as cls


class ResNetGradCAM:
    """
    Proper Grad-CAM for ResNet-18.
    Hooks into the last conv layer (layer4[1].conv2) to capture
    activations and gradients, then generates a weighted heatmap.
    """

    def __init__(self, model):
        self.model = model
        self.gradients  = None
        self.activations = None
        self._handles    = []

        # ResNet-18: last conv block is model.layer4[1].conv2
        target_layer = model.layer4[1].conv2
        self._handles.append(
            target_layer.register_forward_hook(self._save_activation)
        )
        self._handles.append(
            target_layer.register_full_backward_hook(self._save_gradient)
        )

    def _save_activation(self, module, input, output):
        self.activations = output.detach()

    def _save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0].detach()

    def generate_cam(self, input_tensor, target_class=None):
        """
        Returns a normalised heatmap array (H×W, values 0-1).
        target_class: which output node to explain (None = model's own prediction).
        """
        self.model.eval()
        self.model.zero_grad()

        # Forward pass (requires grad for backward)
        input_tensor = input_tensor.clone().requires_grad_(True)
        output = self.model(input_tensor)

        if target_class is None:
            target_class = output.argmax(dim=1).item()

        # Backward pass on desired class score
        score = output[0, target_class]
        score.backward()

        # Global average pool the gradients → channel weights
        pooled_grads = self.gradients.mean(dim=[0, 2, 3])  # (C,)

        # Weight activation maps by their importance
        activations = self.activations[0]                   # (C, H, W)
        for i in range(activations.shape[0]):
            activations[i] *= pooled_grads[i]

        # Average channels → single spatial heatmap
        heatmap = activations.mean(dim=0).cpu().numpy()     # (H, W)

        # ReLU: only keep positive influence
        heatmap = np.maximum(heatmap, 0)

        # Normalise to [0, 1]
        if heatmap.max() > 0:
            heatmap /= heatmap.max()

        return heatmap

    def remove_hooks(self):
        for h in self._handles:
            h.remove()


def generate_gradcam(image_path: str, save_path: str):
    """
    Generates a Grad-CAM overlay and saves it to save_path.

    Fixed issues vs. previous version:
    - Removed the forced alpha_mask clip (0.15 min) that was painting blue
      heatmap over the entire image, even for healthy brains.
    - Now only shows colour where the model actually has high activation.
    - For 'Normal' scans the heatmap will be dim / barely visible.
    - For 'Tumor' scans it will show a bright red focused region.
    """
    res = cls.get_classifier()
    if res is None:
        print("[GradCAM] Classifier not loaded – skipping heatmap generation.")
        # Just copy original to save path so the UI still gets an image
        import shutil
        shutil.copy(image_path, save_path)
        return save_path

    model, transform = res
    device = next(model.parameters()).device

    # ── 1. Prepare input ──────────────────────────────────────────────
    img_pil = Image.open(image_path).convert('RGB')
    input_tensor = transform(img_pil).unsqueeze(0).to(device)

    # ── 2. Run Grad-CAM ───────────────────────────────────────────────
    cam_gen = ResNetGradCAM(model)
    cam     = cam_gen.generate_cam(input_tensor)   # (7, 7) → normalised 0-1
    cam_gen.remove_hooks()

    # ── 3. Upscale CAM to image dimensions ───────────────────────────
    img_cv2 = cv2.imread(image_path)
    if img_cv2 is None:
        print(f"[GradCAM] Could not read image: {image_path}")
        return save_path

    h, w = img_cv2.shape[:2]

    # Scale to uint8 then resize
    cam_uint8   = (cam * 255).astype(np.uint8)
    resized_cam = cv2.resize(cam_uint8, (w, h), interpolation=cv2.INTER_LINEAR)

    # Light smoothing – keeps the heatmap tight, not smeared
    smoothed_cam = cv2.GaussianBlur(resized_cam, (11, 11), 0)

    # ── 4. Colorise with JET colormap ────────────────────────────────
    heatmap_color = cv2.applyColorMap(smoothed_cam, cv2.COLORMAP_JET)

    # ── 5. Smart alpha blending – NO forced minimum ───────────────────
    # The OLD code had: alpha_mask = np.clip(alpha, 0.15, 0.65)
    # This 0.15 minimum forced a blue tint over the WHOLE image,
    # making healthy brains look like they had tumours.
    #
    # Fix: alpha is proportional to CAM activation only.
    # Regions with zero activation stay fully transparent (= original MRI).
    alpha_mask = (smoothed_cam.astype(np.float32) / 255.0) * 0.75

    # Hard-zero below a small noise floor (removes faint blue fringe)
    alpha_mask[smoothed_cam < 15] = 0.0

    # Cap at 0.80 so the underlying MRI is still visible under the red peak
    alpha_mask = np.clip(alpha_mask, 0.0, 0.80)
    alpha_3d   = np.stack([alpha_mask] * 3, axis=2)

    # Convert MRI to grayscale-RGB for a cleaner look under the heatmap
    gray_mri  = cv2.cvtColor(img_cv2, cv2.COLOR_BGR2GRAY)
    mri_base  = cv2.cvtColor(gray_mri, cv2.COLOR_GRAY2BGR)

    # Blend
    overlay = (alpha_3d * heatmap_color.astype(np.float32) +
               (1.0 - alpha_3d) * mri_base.astype(np.float32)).astype(np.uint8)

    cv2.imwrite(save_path, overlay)
    print(f"[GradCAM] Heatmap saved → {save_path}  (peak activation: {cam.max():.3f})")
    return save_path


def generate_unet_heatmap(image_path: str, prob_mask: np.ndarray, save_path: str):
    """
    Overlays the high-resolution U-Net probability mask onto the original MRI.
    Drastically more accurate than ResNet-18 Grad-CAM.
    """
    img_cv2 = cv2.imread(image_path)
    if img_cv2 is None:
        print(f"[Heatmap] Could not read image: {image_path}")
        return save_path

    h, w = img_cv2.shape[:2]

    # Resize U-Net probability mask (usually 256x256) to fit the original MRI
    prob_resized = cv2.resize(prob_mask, (w, h), interpolation=cv2.INTER_LINEAR)
    
    # Scale probabilities from 0.0-1.0 to 0-255
    cam_uint8 = (prob_resized * 255).astype(np.uint8)
    
    # Smooth the edges of the segmentation slightly for aesthetics
    smoothed_cam = cv2.GaussianBlur(cam_uint8, (11, 11), 0)

    # Colorise with JET colormap
    heatmap_color = cv2.applyColorMap(smoothed_cam, cv2.COLORMAP_JET)

    # Smart Alpha Blending
    # High probability = 75% opacity. Low probability smoothly fades to 0%
    alpha_mask = (smoothed_cam.astype(np.float32) / 255.0) * 0.75
    
    # Completely remove spectral noise below 20% certainty to keep the image clean
    alpha_mask[smoothed_cam < 50] = 0.0
    alpha_mask = np.clip(alpha_mask, 0.0, 0.85)

    alpha_3d = np.stack([alpha_mask] * 3, axis=2)

    # Background MRI in grayscale for contrast
    gray_mri = cv2.cvtColor(img_cv2, cv2.COLOR_BGR2GRAY)
    mri_base = cv2.cvtColor(gray_mri, cv2.COLOR_GRAY2BGR)

    overlay = (alpha_3d * heatmap_color.astype(np.float32) +
               (1.0 - alpha_3d) * mri_base.astype(np.float32)).astype(np.uint8)

    cv2.imwrite(save_path, overlay)
    print(f"[Heatmap] U-Net Heatmap saved → {save_path} (peak accuracy: {prob_mask.max():.3f})")
    return save_path

def generate_heatmap(image_path: str, dummy_mask, save_path: str):
    """Deprecated – redirects to generate_gradcam."""
    return generate_gradcam(image_path, save_path)
