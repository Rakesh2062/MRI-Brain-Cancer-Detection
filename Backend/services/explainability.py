import cv2
import numpy as np
import os

def generate_heatmap(image_path: str, mask, save_path: str):
    """
    Simulates a Grad-CAM explainer. Takes the original image and overlays 
    the segmentation mask (or a heat map) representing the AI's area of focus.
    Saves the new image to `save_path` and returns it.
    """
    img = cv2.imread(image_path)
    if img is None:
         # Create a fallback blank image
         img = np.zeros((256, 256, 3), dtype=np.uint8)
         mask = np.zeros((256, 256), dtype=np.uint8)
    
    # Resize mask to match original image dimensions
    h, w, _ = img.shape
    resized_mask = cv2.resize(mask, (w, h))
    
    # 1. Smooth out the binary mask heavily to create a gradient effect
    # The mask is 255 (white) where tumor is, and 0 (black) where healthy.
    blurred_mask = cv2.GaussianBlur(resized_mask, (55, 55), 0)
    
    # 2. Apply a scientific Color Map (JET)
    # In JET: 0 (healthy) -> Blue, 128 (edge) -> Green/Yellow, 255 (tumor) -> Red
    heatmap_color = cv2.applyColorMap(blurred_mask, cv2.COLORMAP_JET)
    
    # 3. Convert the original MRI image to grayscale, then back to BGR.
    # This prevents the underlying MRI colors from clashing with our Heatmap colors.
    gray_mri = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    mri_bgr = cv2.cvtColor(gray_mri, cv2.COLOR_GRAY2BGR)
    
    # 4. Overlay the heatmap onto the grayscale MRI
    alpha = 0.45 # Transparency/Strength of the heatmap
    overlay = cv2.addWeighted(heatmap_color, alpha, mri_bgr, 1 - alpha, 0)
    
    # Save the file
    cv2.imwrite(save_path, overlay)
    
    return save_path
