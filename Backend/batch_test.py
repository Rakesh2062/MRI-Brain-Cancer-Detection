import os
import requests
import time
import argparse

# The default URL where the FastAPI backend is running
API_URL = "http://localhost:8000/predict"

def test_folder(folder_path):
    if not os.path.exists(folder_path):
        print(f"Error: Folder '{folder_path}' does not exist.")
        return

    # Look for common image file extensions
    valid_extensions = ('.png', '.jpg', '.jpeg')
    images = []
    
    # Recursively find all images in the folder (including 'yes'/'no' subfolders)
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            if file.lower().endswith(valid_extensions):
                images.append(os.path.join(root, file))

    if not images:
        print(f"No valid images (.png, .jpg, .jpeg) found in {folder_path}")
        return

    print(f"Found {len(images)} images in '{folder_path}'.")
    print(f"Starting batch automated testing against {API_URL}...\n")

    results = []
    
    for idx, img_path in enumerate(images, 1):
        filename = os.path.basename(img_path)
        
        # We will use the subfolder name (like 'yes' or 'no') to help identify it later
        parent_dir = os.path.basename(os.path.dirname(img_path))
        patient_id = f"BATCH_TEST_{parent_dir.upper()}_{idx}"
        
        print(f"[{idx}/{len(images)}] Testing: {parent_dir}/{filename} ... ", end="", flush=True)
        
        try:
            with open(img_path, 'rb') as f:
                # Prepare the multipart form data exactly as the frontend would
                files = {'file': (filename, f, 'image/jpeg')}
                data = {'patient_id': patient_id}
                
                # Send HTTP POST request to the local backend
                response = requests.post(API_URL, files=files, data=data)
                
            if response.status_code == 200:
                res_json = response.json()
                detected = res_json.get("tumor_detected", False)
                confidence = res_json.get("confidence", 0)
                
                print(f"{'DETECTED (YES)' if detected else 'NO TUMOR'} | Confidence: {confidence*100:.1f}%")
                
                results.append({
                    "file": filename,
                    "true_label": parent_dir, # "yes" or "no" usually
                    "detected": detected,
                    "confidence": confidence
                })
            else:
                print(f"FAILED (Status {response.status_code}): {response.text}")
        except requests.exceptions.ConnectionError:
            print("ERROR: Could not connect to API. Is your uvicorn backend running?")
        except Exception as e:
            print(f"ERROR: {e}")
            
        # Slight delay so we don't overwhelm the local API endpoint
        time.sleep(0.5) 

    # ----------------------------------------------------
    # Print the Final Summary Report
    # ----------------------------------------------------
    print("\n" + "="*50)
    print(" BATCH TEST SUMMARY REPORT")
    print("="*50)
    detected_count = sum(1 for r in results if r["detected"])
    print(f" Total Images Processed : {len(results)}")
    print(f" Tumors Detected        : {detected_count}")
    print(f" No Tumors Detected     : {len(results) - detected_count}")
    print("-" * 50)
    
    # If the user has organized the folders neatly into 'yes' and 'no' folders, calculate accuracy!
    correct = 0
    calculated_accuracy = False
    
    for r in results:
        label = r["true_label"].lower()
        if ("yes" in label or "tumor" in label or "positive" in label):
            calculated_accuracy = True
            if r["detected"]:
                correct += 1
        elif ("no" in label or "normal" in label or "negative" in label or "healthy" in label):
            calculated_accuracy = True
            if not r["detected"]:
                correct += 1
            
    if calculated_accuracy and len(results) > 0:
        accuracy = (correct / len(results)) * 100
        print(f" Approx. Model Accuracy : {accuracy:.2f}%")
        print("\n(Accuracy is calculated based on comparing the prediction")
        print("against the subfolder names being 'yes' or 'no' etc.)")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Automated Batch Testing for VaidhyaNetra AI Backend.")
    parser.add_argument("--folder", type=str, required=True, help="Absolute or relative path to the folder containing MRI images.")
    args = parser.parse_args()
    
    test_folder(args.folder)
