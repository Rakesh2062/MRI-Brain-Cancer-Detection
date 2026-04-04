import numpy as np

def extract_features(segmentation_mask, tumor_detected: bool, prob_mask=None, confidence_score: float = 0.0):
    """
    Computes basic features like tumor size based on the segmentation mask.
    Returns the size in mm^2.
    Uses U-Net prob_mask for a continuous size estimate.
    Falls back to a confidence-proportional estimate if the mask is empty.
    """
    if not tumor_detected:
        return {"tumor_size_mm2": 0.0, "severity_indicator": "None"}
    
    # Primary: Use U-Net probability mask for a continuous size estimate
    # Pixels with prob > 0.35 are counted as tumor-relevant
    if prob_mask is not None and prob_mask.max() > 0.1:
        high_prob_pixels = np.sum(prob_mask > 0.35)
        mm2_per_pixel = 1.5
        tumor_size_mm2 = high_prob_pixels * mm2_per_pixel
    else:
        # Fallback: use binary mask pixel count
        pixel_area = np.count_nonzero(segmentation_mask)
        if pixel_area == 0:
            # Last resort: confidence-proportional estimate (tumor detected but mask empty)
            tumor_size_mm2 = round(confidence_score * 8.0, 2)  # e.g. 80% -> ~640 mm²
        else:
            tumor_size_mm2 = pixel_area * 1.5

    tumor_size_mm2 = round(float(tumor_size_mm2), 2)
    if tumor_size_mm2 < 300:
        severity = "Low"
    elif tumor_size_mm2 < 1000:
        severity = "Moderate"
    else:
        severity = "High"

    return {
        "tumor_size_mm2": tumor_size_mm2,
        "severity_indicator": severity
    }
