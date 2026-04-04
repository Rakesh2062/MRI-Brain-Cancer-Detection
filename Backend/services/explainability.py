import cv2
import numpy as np
import os
import torch
import torch.nn.functional as F
from PIL import Image

# Import the classifier so we can use it for Grad-CAM
import services.classification as cls

class ResNetGradCAM:
    def __init__(self, model):
        self.model = model
        # For ResNet-18, the last convolutional layer is layer4[1].conv2
        self.target_layer = self.model.layer4[1].conv2
        self.gradients = None
        self.activations = None
        
        # Hooks
        self.target_layer.register_forward_hook(self.save_activation)
        self.target_layer.register_full_backward_hook(self.save_gradient)

    def save_activation(self, module, input, output):
        self.activations = output

    def save_gradient(self, module, grad_input, grad_output):
        self.gradients = grad_output[0]

    def generate_cam(self, input_tensor, target_class=None):
        self.model.zero_grad()
        # Enable gradients on the input tensor
        input_tensor.requires_grad = True
        
        output = self.model(input_tensor)
        
        if target_class is None:
            # We want to explain the model's actual decision (e.g. why it said YES)
            target_class = output.argmax(dim=1).item()
            
        output[0, target_class].backward(retain_graph=True)
        
        # Pool gradients across spatial dimensions
        pooled_gradients = torch.mean(self.gradients, dim=[0, 2, 3])
        activations = self.activations.detach()[0]
        
        # Weight the activations by the gradients
        for i in range(activations.shape[0]):
            activations[i, :, :] *= pooled_gradients[i]
            
        heatmap = torch.mean(activations, dim=0).cpu().numpy()
        
        # ReLU to keep only positive influence
        heatmap = np.maximum(heatmap, 0)
        
        # Normalize between 0 and 1
        if np.max(heatmap) == 0:
            return heatmap
        heatmap /= np.max(heatmap)
        return heatmap

def generate_heatmap(image_path: str, dummy_mask, save_path: str):
    """
    Deprecated: Do not use. Use generate_gradcam instead.
    """
    pass

def generate_gradcam(image_path: str, save_path: str):
    """
    Generates a Grad-CAM Heatmap bypassing U-Net completely.
    """
    res = cls.get_classifier()
    if res is None:
        return image_path
        
    model, transform = res
    device = next(model.parameters()).device
    
    img_pil = Image.open(image_path).convert('RGB')
    input_tensor = transform(img_pil).unsqueeze(0).to(device)
    
    # 1. Run Grad-CAM 
    cam_generator = ResNetGradCAM(model)
    cam = cam_generator.generate_cam(input_tensor)
    
    # Scale from 0.0-1.0 to 0-255
    cam_uint8 = (cam * 255).astype(np.uint8)
    
    # 2. Prepare Original Image for Display
    img_cv2 = cv2.imread(image_path)
    if img_cv2 is None:
        return save_path
        
    h, w, _ = img_cv2.shape
    
    # Resize the 7x7 Grad-CAM matrix to fit the image
    resized_cam = cv2.resize(cam_uint8, (w, h))
    
    # Optional: Apply a much smaller blur to smooth blocky edges (15x15 instead of 55x55)
    # This ensures the heatmap stays tightly bound to the tumor size.
    smoothed_cam = cv2.GaussianBlur(resized_cam, (15, 15), 0)
    
    # 3. Apply JET Colormap (Red=High, Green/Yellow=Medium, Blue=Low)
    heatmap_color = cv2.applyColorMap(smoothed_cam, cv2.COLORMAP_JET)
    
    # 4. Filter the Heatmap Transparency seamlessly
    gray_mri = cv2.cvtColor(img_cv2, cv2.COLOR_BGR2GRAY)
    mri_bgr = cv2.cvtColor(gray_mri, cv2.COLOR_GRAY2BGR)
    
    # We use the activation itself as the transparency!
    # High activation -> 60% Heatmap Opacity (Red)
    # Low activation  -> fades down smoothly through Green to Blue to 0% Opacity
    alpha_mask = (smoothed_cam.astype(float) / 255.0) * 0.65
    
    # Make sure even low activations (blue) have a tiny bit of visibility (e.g. 15% opacity)
    # so you get the "light color as blue" effect around the edges
    alpha_mask = np.clip(alpha_mask, 0.15, 0.65)
    
    # Zero out the alpha completely if the original activation was effectively 0
    alpha_mask[smoothed_cam < 10] = 0.0
    
    alpha_mask_3d = np.stack([alpha_mask]*3, axis=2)
    
    # Final blend
    overlay = (alpha_mask_3d * heatmap_color + (1 - alpha_mask_3d) * mri_bgr).astype(np.uint8)
    
    # Save the file
    cv2.imwrite(save_path, overlay)
    
    return save_path
