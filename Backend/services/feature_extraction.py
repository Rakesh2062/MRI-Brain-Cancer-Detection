import numpy as np

def extract_features(segmentation_mask, tumor_detected: bool):
    """
    Computes basic features like tumor size based on the segmentation mask.
    Returns the size in arbitrary units (e.g., area in pixels converted to mm^2).
    """
    if not tumor_detected:
        return {"tumor_size_mm2": 0.0, "severity_indicator": "Low"}
    
    # Count the number of non-zero pixels in the mask
    pixel_area = np.count_nonzero(segmentation_mask)
    
    # Assuming each pixel represents 1.5mm^2 in a standard scan
    mm2_per_pixel = 1.5
    tumor_size_mm2 = pixel_area * mm2_per_pixel
    
    if tumor_size_mm2 == 0:
        severity = "None"
    elif tumor_size_mm2 < 500:
        severity = "Low"
    elif tumor_size_mm2 < 1500:
        severity = "Moderate"
    else:
        severity = "High"
        
    return {
        "tumor_size_mm2": round(tumor_size_mm2, 2),
        "severity_indicator": severity
    }
