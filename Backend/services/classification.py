import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import os

from models.custom_cnn import BrainTumorCNN

MODEL_PATH = "models/custom_cnn_brain.pth"
_classifier = None
_transform = None

# ── Class Index Mapping ──────────────────────────────────────────────────────
# ImageFolder sorts folders alphabetically:
#   'Normal' → index 0  (no tumor)
#   'Tumor'  → index 1  (has tumor)
# This MUST match what the training script used.
TUMOR_CLASS_IDX = 1   # index for "Tumor"
NORMAL_CLASS_IDX = 0  # index for "Normal"


def _build_model():
    """Builds the ResNet-18 architecture with the same head used during training."""
    model = models.resnet18()
    num_ftrs = model.fc.in_features
    # Must match train_classifier.py exactly: Dropout → Linear
    model.fc = nn.Sequential(
        nn.Dropout(0.4),
        nn.Linear(num_ftrs, 2)
    )
    return model


def get_classifier():
    """Lazy-loads and caches the classifier model + transform."""
    global _classifier, _transform
    if _classifier is None:
        if not os.path.exists(MODEL_PATH):
            return None
            
        try:
            device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            model = BrainTumorCNN()
            
            model.load_state_dict(torch.load(MODEL_PATH, map_location=device, weights_only=True))
            model.eval()
            model.to(device)
            _classifier = model
            
            _transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])
        except Exception as e:
            print(f"Failed to load ResNet Classifier: {e}")
            return None
            
    return _classifier, _transform


def predict_tumor(image_path: str):
    """
    Returns (tumor_detected: bool, confidence: float).

    Class mapping (alphabetical ImageFolder order):
      index 0 = 'Normal' (no tumor)
      index 1 = 'Tumor'  (has tumor)
    """
    res = get_classifier()
    if res is None:
        return None, 0.0

    model, transform = res
    device = next(model.parameters()).device

    try:
        img = Image.open(image_path).convert('RGB')
        input_tensor = transform(img).unsqueeze(0).to(device)

        with torch.no_grad():
            outputs = model(input_tensor)
            probabilities = torch.nn.functional.softmax(outputs[0], dim=0)

        score_normal = probabilities[NORMAL_CLASS_IDX].item()
        score_tumor  = probabilities[TUMOR_CLASS_IDX].item()

        tumor_detected = score_tumor > score_normal
        confidence = max(score_normal, score_tumor)

        print(f"[Classifier] Normal: {score_normal:.3f}  Tumor: {score_tumor:.3f}"
              f"  → {'TUMOR' if tumor_detected else 'NORMAL'}  conf={confidence:.3f}")

        return tumor_detected, float(confidence)

    except Exception as e:
        print(f"[Classifier] Prediction error: {e}")
        return None, 0.0


def reload_classifier():
    """Forces the model to be reloaded from disk (call after retraining)."""
    global _classifier, _transform
    _classifier = None
    _transform = None
    print("[Classifier] Cache cleared – will reload on next prediction.")
