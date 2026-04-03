import os
import uuid
import cloudinary
import cloudinary.uploader
import cloudinary.api
from dotenv import load_dotenv

load_dotenv()

# Configure Cloudinary credentials from env
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", "your_cloud_name"),
    api_key=os.getenv("CLOUDINARY_API_KEY", "your_api_key"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET", "your_api_secret")
)

def upload_image(file_path_or_bytes, folder="vaidhyanetra"):
    """
    Uploads an image (file path or file-like object) to Cloudinary.
    Returns the secure URL.
    """
    try:
        # Check if dummy config is being used (to avoid crashing on mock tests without real keys)
        if os.getenv("CLOUDINARY_CLOUD_NAME") == "your_cloud_name" or not os.getenv("CLOUDINARY_CLOUD_NAME"):
            print("Warning: Real Cloudinary credentials not found. Returning a mock URL.")
            return f"https://res.cloudinary.com/mock/image/upload/v1/mock/mock_image_{uuid.uuid4().hex[:6]}.png"

        # Upload to Cloudinary
        response = cloudinary.uploader.upload(
            file_path_or_bytes, 
            folder=folder
        )
        return response.get('secure_url')
    except Exception as e:
        print(f"Cloudinary upload error: {e}")
        # Fallback for hackathon testing without internet or keys
        return f"https://mock-image-host.local/{uuid.uuid4().hex[:8]}.png"

def upload_base64_image(base64_string, folder="vaidhyanetra_heatmaps"):
    """
    Alternative method to upload base64 image string.
    """
    try:
        if os.getenv("CLOUDINARY_CLOUD_NAME") == "your_cloud_name" or not os.getenv("CLOUDINARY_CLOUD_NAME"):
            return f"https://res.cloudinary.com/mock/image/upload/v1/mock/mock_heatmap_{uuid.uuid4().hex[:6]}.png"
        
        response = cloudinary.uploader.upload(
            f"data:image/png;base64,{base64_string}",
            folder=folder
        )
        return response.get('secure_url')
    except Exception as e:
        print(f"Cloudinary Base64 upload error: {e}")
        return f"https://mock-image-host.local/heatmap_{uuid.uuid4().hex[:8]}.png"
