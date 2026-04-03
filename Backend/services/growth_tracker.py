__all__ = ["track_growth"]

def track_growth(patient_history: list, current_size_mm2: float):
    """
    Compares current scan against previous scans to track tumor progression.
    Returns growth percentage and a string describing the trend.
    """
    if not patient_history or len(patient_history) == 0:
        return {"growth_percent": 0.0, "trend": "No prior data for comparison"}
        
    # Assume patient_history is sorted by date, get the last one before current
    # In this mock, we just look at the last record's tumor_size.
    last_record = patient_history[-1]
    last_size = last_record.get("tumor_size", 0)
    
    if last_size == 0 and current_size_mm2 == 0:
         return {"growth_percent": 0.0, "trend": "Stable - No Tumor"}
         
    if last_size == 0 and current_size_mm2 > 0:
         return {"growth_percent": 100.0, "trend": "New discovery"}
         
    growth_diff = current_size_mm2 - last_size
    growth_percent = (growth_diff / last_size) * 100.0
    
    if growth_percent > 5.0:
        trend = "Rapid Growth"
    elif growth_percent > 1.0:
        trend = "Slow Growth"
    elif growth_percent < -1.0:
        trend = "Shrinking"
    else:
        trend = "Stable"
        
    return {
        "growth_percent": round(growth_percent, 2),
        "trend": trend,
        "previous_size": last_size
    }
