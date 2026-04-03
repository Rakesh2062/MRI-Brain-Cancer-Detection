def generate_clinical_recommendation(tumor_detected: bool, severity: str, growth_trend: str):
    """
    Generates a basic text recommendation/next steps based on the analysis.
    """
    recommendations = []
    
    if not tumor_detected:
        recommendations.append("No clear signs of tumor detected in the current scan.")
        recommendations.append("Recommend standard follow-up after 12 months.")
    else:
        if severity == "High":
            recommendations.append("Significant mass detected. URGENT review by neuro-oncologist required.")
        elif severity == "Moderate":
            recommendations.append("Moderate mass detected. Schedule consultation within 2 weeks.")
        else:
            recommendations.append("Small anomaly detected. Close observation recommended.")
            
        if growth_trend in ["Rapid Growth", "Slow Growth"]:
            recommendations.append("Tumor shows signs of growth compared to previous scan. Consider updating treatment plan.")
            
        recommendations.append("Review Grad-CAM heatmaps to verify AI's region of interest.")
        
    return " ".join(recommendations)
