import os
import uuid
import datetime
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# Import Services
from database.db_handler import db_handler
from utils.cloudinary_helper import upload_image
import services.preprocessing as prep
import services.segmentation as seg
import services.feature_extraction as feat
import services.explainability as exp
import services.confidence as conf
import services.growth_tracker as growth
import services.uncertainty as unc
import services.recommendation as rec
import services.report_generator as report_gen

load_dotenv()

app = FastAPI(title="VaidhyaNetra AI API", version="1.0.0")

# Setup CORS (allows Next.js frontend to call)
origins_env = os.getenv("CORS_ORIGINS", "http://localhost:3000,*")
origins = [origin.strip() for origin in origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Output dirs
os.makedirs("outputs/segmented_images", exist_ok=True)
os.makedirs("outputs/reports", exist_ok=True)

@app.get("/")
def read_root():
    return {"status": "VaidhyaNetra AI Backend is running"}

@app.post("/predict")
async def predict_mri(patient_id: str = Form(...), file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")
        
    # Generate unique ID for this scan
    scan_id = f"SCAN_{uuid.uuid4().hex[:8].upper()}"
    timestamp = datetime.datetime.now().isoformat()
    
    # 1. Save locally for processing
    local_img_path = f"outputs/segmented_images/{scan_id}_original.jpg"
    with open(local_img_path, "wb") as f:
        f.write(await file.read())
        
    # 2. Upload original MRI to Cloudinary
    mri_image_url = upload_image(local_img_path, folder="vaidhyanetra_mri")
    
    try:
        # --- AI PIPELINE EXECUTION ---
        
        # Preprocessing
        preprocessed_img = prep.preprocess_image(local_img_path)
        
        # Segmentation (U-Net)
        mask, tumor_detected, prob_mask = seg.run_segmentation(preprocessed_img)
        
        # Feature Extraction
        features = feat.extract_features(mask, tumor_detected)
        tumor_size = features["tumor_size_mm2"]
        severity = features["severity_indicator"]
        
        # Confidence & Uncertainty (Now calculated using real AI probabilities)
        confidence_score = conf.calculate_confidence(tumor_detected, prob_mask, mask)
        uncertainty_info = unc.estimate_uncertainty(prob_mask)
        
        # Historical Growth check
        patient_data = db_handler.get_patient(patient_id)
        patient_history = patient_data["records"] if patient_data else []
        growth_info = growth.track_growth(patient_history, tumor_size)
        
        # Explainability (Grad-CAM / Heatmap)
        heatmap_local_path = f"outputs/segmented_images/{scan_id}_heatmap.jpg"
        exp.generate_heatmap(local_img_path, mask, heatmap_local_path)
        heatmap_url = upload_image(heatmap_local_path, folder="vaidhyanetra_heatmaps")
        
        # Clinical Recommendations
        recommendation_text = rec.generate_clinical_recommendation(
            tumor_detected, severity, growth_info["trend"]
        )
        
        # --- QUALITY CONTROL (Unclear Image Rejection) ---
        # If the model cannot process the image cleanly (producing high statistical entropy/uncertainty), 
        # we reject the prediction, drop the confidence to 0%, and output a strong warning recommendation.
        if uncertainty_info["requires_human_review"]:
            tumor_detected = False
            confidence_score = 0.0
            tumor_size = 0.0
            severity = "Invalid/Unclear Scan"
            recommendation_text = "WARNING: The AI could not process this image clearly. It contains too much noise, artifacting, or is not a valid brain MRI format. Confidence has been set to 0.0. Please review manually or upload a clearer scan."
        
        # Prepare result dictionary
        result_payload = {
            "scan_id": scan_id,
            "date": timestamp,
            "mri_image_url": mri_image_url,
            "heatmap_url": heatmap_url,
            "tumor_detected": tumor_detected,
            "confidence": confidence_score,
            "tumor_size": tumor_size,
            "severity_indicator": severity,
            "uncertainty": uncertainty_info,
            "growth_trend": growth_info["trend"],
            "recommendation": recommendation_text,
            "report_url": f"/report/{scan_id}" # Local route to generate/fetch pdf
        }
        
        # Generate PDF Report Locally
        pdf_path = f"outputs/reports/{scan_id}.pdf"
        report_gen.generate_pdf_report(scan_id, patient_id, result_payload, pdf_path)
        
        # Optional: You could also upload the PDF to Cloudinary here if desired.
        
        # 3. Store in MongoDB
        db_handler.create_or_update_patient(patient_id, result_payload)
        
        return JSONResponse(content={
            "scan_id": scan_id,
            "mri_image_url": mri_image_url,
            "heatmap_url": heatmap_url,
            "tumor_detected": tumor_detected,
            "confidence": confidence_score,
            "tumor_size": tumor_size,
            "explanation": recommendation_text
        })
        
    except Exception as e:
        print(f"Pipeline error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/patient/{patient_id}")
async def get_patient_details(patient_id: str):
    data = db_handler.get_patient(patient_id)
    if not data:
        raise HTTPException(status_code=404, detail="Patient not found")
    return data


@app.get("/patients")
async def get_all_patients():
    data = db_handler.get_all_patients()
    return {"patients": data}


@app.get("/report/{scan_id}")
async def get_report_pdf(scan_id: str):
    file_path = f"outputs/reports/{scan_id}.pdf"
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="application/pdf", filename=f"{scan_id}_Report.pdf")
    raise HTTPException(status_code=404, detail="Report not found")

# To run server:
# uvicorn main:app --reload
