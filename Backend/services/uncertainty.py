import random
import numpy as np

def estimate_uncertainty(prob_mask: np.ndarray = None):
    """
    Estimates the model's uncertainty using Shannon Entropy of the probability mask.
    High entropy means the AI is 'guessing' (probabilities hovering around 0.5).
    Useful for flagging cases that require manual doctor review.
    """
    if prob_mask is None:
        return {"uncertainty_score": 0.0, "requires_human_review": False}
        
    epsilon = 1e-7
    p = np.clip(prob_mask, epsilon, 1.0 - epsilon)
    
    # Shannon Entropy formula for binary classification per pixel
    entropy_map = -p * np.log2(p) - (1.0 - p) * np.log2(1.0 - p)
    average_entropy = float(np.mean(entropy_map))
    
    # Flag for manual human doctor review if the image produces very high statistical uncertainty
    requires_review = average_entropy > 0.10
    
    return {
        "uncertainty_score": round(average_entropy, 4),
        "requires_human_review": requires_review
    }
