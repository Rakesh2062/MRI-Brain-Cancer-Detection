import cv2
import numpy as np

def preprocess_image(image_path: str):
    """
    Simulates image preprocessing required for U-Net an classification models.
    Returns a resized, normalized numpy array.
    """
    try:
        # Load image via OpenCV
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError("Could not read image file.")
        
        # Resize to standard Unet input size (e.g. 256x256)
        img_resized = cv2.resize(img, (256, 256))
        
        # Convert to RGB (OpenCV uses BGR by default)
        img_rgb = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB)
        
        # 1. Preprocessing Normalization
        # A huge reason for hallucinations: Z-Score normalization mathematically explodes
        # the contrast of healthy tissue, tricking the neural network into seeing tumors!
        # The correct robust way for this specific model is dividing by the max pixel value.
        max_val = np.max(img_rgb)
        if max_val > 0:
            img_normalized = img_rgb.astype(np.float32) / max_val
        else:
            img_normalized = img_rgb.astype(np.float32)
        
        # Expand dims for batch processing (1, 256, 256, 3)
        img_batch = np.expand_dims(img_normalized, axis=0)
        
        return img_batch
    except Exception as e:
        print(f"Preprocessing error: {e}")
        # Return dummy array as fallback
        return np.zeros((1, 256, 256, 3))
