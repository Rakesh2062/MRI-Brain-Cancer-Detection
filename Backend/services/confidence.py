import numpy as np

def calculate_confidence(tumor_detected: bool, prob_mask: np.ndarray, binary_mask: np.ndarray):
    """
    Calculates the real AI confidence based on the U-Net forward pass probability strength.
    """
    if not tumor_detected:
        # Confidence that NO tumor is present is the average of the inverse probabilities.
        # (How close to 0 is the background?)
        mean_no_tumor_conf = np.mean(1.0 - prob_mask)
        return round(float(mean_no_tumor_conf), 4)
    
    # Confidence that the tumor IS present. 
    # We take the average probability strictly inside the predicted tumor region boundaries.
    tumor_pixels_prob = prob_mask[binary_mask > 0]
    if len(tumor_pixels_prob) == 0:
        return 0.0
        
    mean_tumor_conf = np.mean(tumor_pixels_prob)
    return round(float(mean_tumor_conf), 4)
