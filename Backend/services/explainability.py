import cv2
import numpy as np
import os
import torch
import torch.nn.functional as F
from PIL import Image

# Import the classifier so we can use it for Grad-CAM
import services.classification as cls


# ---------------------------------------------------------------------------
# Grad-CAM helper
# ---------------------------------------------------------------------------
class ResNetGradCAM:
    def __init__(self, model):
        self.model = model
        
        # --- DYNAMIC TARGET LAYER SELECTION ---
        # 1. Check for standard ResNet layer4 (ResNet18, 34, 50, etc.)
        if hasattr(self.model, 'layer4'):
            self.target_layer = self.model.layer4
        # 2. Check for custom BrainTumorCNN conv4
        elif hasattr(self.model, 'conv4'):
            self.target_layer = self.model.conv4
        # 3. Fallback: Automatically find the last convolutional layer
        else:
            conv_layers = [m for m in self.model.modules() if isinstance(m, torch.nn.Conv2d)]
            if conv_layers:
                self.target_layer = conv_layers[-1]
            else:
                # Absolute fallback to identity if no conv layers found (should not happen for CNNs)
                self.target_layer = self.model

        self.gradients = None
        self.activations = None

        # Register Hooks
        self.target_layer.register_forward_hook(self.save_activation)
        self.target_layer.register_full_backward_hook(self.save_gradient)

    def save_activation(self, module, input, output):
        self.activations = output

    def save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0]

    def generate_cam(self, input_tensor, target_class=None):
        self.model.zero_grad()
        input_tensor.requires_grad = True

        output = self.model(input_tensor)

        if target_class is None:
            target_class = output.argmax(dim=1).item()

        output[0, target_class].backward(retain_graph=True)

        pooled_gradients = torch.mean(self.gradients, dim=[0, 2, 3])
        activations = self.activations.detach()[0]

        for i in range(activations.shape[0]):
            activations[i, :, :] *= pooled_gradients[i]

        heatmap = torch.mean(activations, dim=0).cpu().numpy()
        heatmap = np.maximum(heatmap, 0)

        if np.max(heatmap) == 0:
            return heatmap
        heatmap /= np.max(heatmap)
        return heatmap


# ---------------------------------------------------------------------------
# Shared rendering helpers
# ---------------------------------------------------------------------------
def _contrast_stretch(arr: np.ndarray) -> np.ndarray:
    """Linearly stretch arr to fill [0, 1] so the full red-blue range is used."""
    a_min, a_max = float(arr.min()), float(arr.max())
    if a_max - a_min < 1e-6:
        a_max = a_min + 1e-6
    return (arr - a_min) / (a_max - a_min)


def _render_heatmap(img_cv2: np.ndarray,
                    prob_float: np.ndarray,
                    save_path: str,
                    threshold: float = 0.55) -> str:
    """
    Core renderer used by both U-Net and Grad-CAM paths.

    prob_float : 2-D float32 array already resized to (H, W), values in [0,1].
                 Higher value  → red  (tumour)
                 Lower  value  → blue (healthy)
    """
    h, w = img_cv2.shape[:2]

    # 1. Smooth
    smooth = cv2.GaussianBlur(prob_float, (21, 21), 0)

    # 2. To uint8 for colormap
    smooth_uint8 = (smooth * 255).clip(0, 255).astype(np.uint8)

    # 3. Full-image JET colourmap  (RED = high prob, BLUE = low prob)
    heatmap_color = cv2.applyColorMap(smooth_uint8, cv2.COLORMAP_JET)

    # 4. Greyscale MRI for anatomical context
    gray = cv2.cvtColor(img_cv2, cv2.COLOR_BGR2GRAY)
    gray_bgr = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)

    # 5. Blend: 60% heatmap  +  40% greyscale anatomy
    overlay = cv2.addWeighted(heatmap_color, 0.60, gray_bgr, 0.40, 0)

    # 6. White contour around the detected tumour boundary
    binary = (smooth > threshold).astype(np.uint8) * 255
    kernel = np.ones((5, 5), np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL,
                                   cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        cv2.drawContours(overlay, contours, -1, (255, 255, 255), 2)

    cv2.imwrite(save_path, overlay)
    return save_path


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def generate_heatmap(image_path: str, dummy_mask, save_path: str):
    """Deprecated — do not use."""
    pass


def generate_unet_heatmap(image_path: str,
                           prob_mask: np.ndarray,
                           save_path: str) -> str:
    """
    Full-image diagnostic heatmap driven by the U-Net probability mask.

    Red  = high tumour probability   (affected region)
    Blue = low  tumour probability   (normal / healthy tissue)

    The greyscale MRI is blended at 40 % opacity so anatomy stays visible.

    Parameters
    ----------
    image_path : path to the original MRI JPEG/PNG
    prob_mask  : 2-D float32 array in [0, 1] from U-Net sigmoid output
    save_path  : where to write the output image
    """
    img_cv2 = cv2.imread(image_path)
    if img_cv2 is None:
        return save_path

    h, w = img_cv2.shape[:2]

    # Resize mask → image size
    mask_resized = cv2.resize(prob_mask.astype(np.float32), (w, h),
                              interpolation=cv2.INTER_LINEAR)

    # Contrast-stretch so even a weak response fills the full colour range
    stretched = _contrast_stretch(mask_resized)

    return _render_heatmap(img_cv2, stretched, save_path)


def generate_gradcam(image_path: str, save_path: str) -> str:
    """
    Full-image Grad-CAM heatmap.

    Red  = regions driving the tumour classification decision
    Blue = regions the model considers normal tissue

    Falls back to a blue-tinted MRI if the classifier is unavailable.
    """
    res = cls.get_classifier()
    if res is None:
        _write_fallback_heatmap(image_path, save_path)
        return save_path

    model, transform = res
    device = next(model.parameters()).device

    img_pil = Image.open(image_path).convert('RGB')
    input_tensor = transform(img_pil).unsqueeze(0).to(device)

    # Run Grad-CAM
    cam_generator = ResNetGradCAM(model)
    cam = cam_generator.generate_cam(input_tensor)   # float32, small spatial dims

    img_cv2 = cv2.imread(image_path)
    if img_cv2 is None:
        return save_path

    h, w = img_cv2.shape[:2]

    # Upsample tiny CAM grid → full image size
    cam_resized = cv2.resize(cam.astype(np.float32), (w, h),
                             interpolation=cv2.INTER_CUBIC)

    # Contrast-stretch so healthy-scan outputs still show the full colour range
    cam_stretched = _contrast_stretch(cam_resized)

    return _render_heatmap(img_cv2, cam_stretched, save_path)


def _write_fallback_heatmap(image_path: str, save_path: str):
    """
    Blue-tinted greyscale heatmap used when no classifier is available.
    Ensures the heatmap is always visually distinct from the original MRI.
    """
    img = cv2.imread(image_path)
    if img is None:
        return
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape

    # Uniform-blue canvas — the entire image reads as "normal/healthy"
    blue_canvas = np.zeros((h, w, 3), dtype=np.uint8)
    blue_canvas[:, :, 0] = gray   # Blue channel carries MRI brightness

    gray_bgr = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    overlay = cv2.addWeighted(blue_canvas, 0.65, gray_bgr, 0.35, 0)
    cv2.imwrite(save_path, overlay)
