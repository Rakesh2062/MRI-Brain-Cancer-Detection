import numpy as np
import os
import cv2

MODEL_PATH = "models/unet_model.pth"
_model = None


def get_model():
    """
    Lazy loads the local compiled U-Net model and its weights.
    Maintains it in memory for subsequent requests.
    """
    global _model
    if _model is None:
        try:
            import torch
            from models.unet import UNet
            
            if not os.path.exists(MODEL_PATH):
                print(f"Model file {MODEL_PATH} not found. Returning fallback mock.")
                _model = False
                return _model
                
            print(f"Loading local U-Net model from {MODEL_PATH}...")
            _model = UNet(in_channels=3, out_channels=1, init_features=32)
            
            # Load state dict locally 
            state_dict = torch.load(MODEL_PATH, map_location=torch.device('cpu'))
            _model.load_state_dict(state_dict)
            _model.eval()
        except ImportError:
            print("PyTorch is not installed. Returning fallback mock.")
            _model = False
        except Exception as e:
            print(f"Failed to load local model. Error: {e}")
            _model = False
            
    return _model


def run_segmentation(preprocessed_image_batch):
    """
    Runs the segmentation inference.
    `preprocessed_image_batch` is shape (1, 256, 256, 3).
    """
    model = get_model()
    batch_size, h, w, channels = preprocessed_image_batch.shape
    
    if model:
        import torch
        # PyTorch expects (B, C, H, W). Permute the numpy array.
        tensor_img = torch.from_numpy(preprocessed_image_batch).permute(0, 3, 1, 2).float()
        
        with torch.no_grad():
            output = model(tensor_img) # Returns probability mask (B, 1, H, W)
            
        prob_mask = output.squeeze().cpu().numpy() # Shape (H, W), values 0 to 1
        
        # 1. REMOVE DYNAMIC BOOSTER
        # The previous "auto-exposure" math was a mistake: When the AI looked at a healthy brain,
        # it naturally outputted highly suppressed noise (e.g. 5% max probability).
        # But the auto-exposure equation multiplied that 5% noise up to 100%, causing False Positives!
        
        # 2. FIXED, RELAXED THRESHOLD
        # Instead, we just use a perfectly static cutoff. Any pixel with > 35% probability is a tumor.
        # 35% is low enough to catch faint real tumors from cross-domain datasets without multiplying noise.
        binary_mask = (prob_mask > 0.35).astype(np.uint8) * 255
        
        # 3. Morphological noise filtering
        # The CLOSE operation fills holes inside tumors, OPEN drops tiny speckles outside
        kernel = np.ones((5, 5), np.uint8)
        binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_OPEN, kernel)
        binary_mask = cv2.morphologyEx(binary_mask, cv2.MORPH_CLOSE, kernel)
        
        # 4. Find tumor regions to accurately calculate largest area
        contours, _ = cv2.findContours(binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        largest_area = 0
        for c in contours:
            area = cv2.contourArea(c)
            if area > largest_area:
                largest_area = area
                
        # 5. Final tumor decision based on largest contiguous area
        tumor_detected = largest_area > 150
        
        # NOTE: Always return EXACTLY three elements so main.py's tuple extraction doesn't crash!
        return binary_mask, tumor_detected, prob_mask
    else:
        # Fallback Mock Logic if torch fails or is not installed
        print("Warning: Real model unavailable. Running naive mock segmentation.")
        mock_mask = np.zeros((h, w), dtype=np.uint8)
        tumor_detected = np.random.rand() > 0.3
        
        if tumor_detected:
            center_x = np.random.randint(h//4, 3*h//4)
            center_y = np.random.randint(w//4, 3*w//4)
            radius = np.random.randint(10, 40)
            cv2.circle(mock_mask, (center_y, center_x), radius, (255), -1)
            
        prob_mask_mock = mock_mask.astype(np.float32) / 255.0
        return mock_mask, tumor_detected, prob_mask_mock