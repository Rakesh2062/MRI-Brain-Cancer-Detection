import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import os


# ── Per-organ model cache ────────────────────────────────────────────────────
# Supports "brain" and "breast" organ types.
# Each key maps to (model, transform) or None if not yet loaded.
_classifiers = {}

# ── Class Index Mapping ──────────────────────────────────────────────────────
# ImageFolder sorts folders alphabetically:
#   'Normal' → index 0  (no tumor)
#   'Tumor'  → index 1  (has tumor)
# This MUST match what the training script used.
TUMOR_CLASS_IDX  = 1   # index for "Tumor"
NORMAL_CLASS_IDX = 0   # index for "Normal"

SUPPORTED_ORGANS = ["brain", "breast"]


def _get_model_path(organ: str) -> str:
    return f"models/resnet18_{organ}.pth"


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


def get_classifier(organ: str = "brain"):
    """
    Lazy-loads and caches the classifier model + transform for the given organ.

    Args:
        organ: One of 'brain' or 'breast'.
    Returns:
        (model, transform) tuple, or None if the model file does not exist.
    """
    organ = organ.lower()
    if organ not in SUPPORTED_ORGANS:
        print(f"[Classifier] Unknown organ type '{organ}'. Supported: {SUPPORTED_ORGANS}")
        return None

    if organ in _classifiers and _classifiers[organ] is not None:
        return _classifiers[organ]

    model_path = _get_model_path(organ)
    if not os.path.exists(model_path):
        print(f"[Classifier] Model not found at {model_path} — train the model first.")
        return None

    try:
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

        model = _build_model()
        model.load_state_dict(torch.load(model_path, map_location=device, weights_only=True))
        model.eval()
        model.to(device)

        transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                 std=[0.229, 0.224, 0.225])
        ])

        _classifiers[organ] = (model, transform)
        print(f"[Classifier] ResNet-18 [{organ.upper()}] loaded on {device}. "
              f"Class mapping: Normal={NORMAL_CLASS_IDX}, Tumor={TUMOR_CLASS_IDX}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[Classifier] Failed to load {organ} model: {e}")
        return None

    return _classifiers[organ]


def predict_tumor(image_path: str, organ: str = "brain"):
    """
    Returns (tumor_detected: bool, confidence: float).

    Args:
        image_path: Path to the scan image.
        organ:      'brain' or 'breast' — chooses the correct trained model.

    Class mapping (alphabetical ImageFolder order):
      index 0 = 'Normal' (no tumor)
      index 1 = 'Tumor'  (has tumor)
    """
    organ = organ.lower()
    res = get_classifier(organ)
    if res is None:
        print(f"[Classifier] No model available for organ='{organ}'")
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

        print(f"[Classifier:{organ.upper()}] Normal: {score_normal:.3f}  Tumor: {score_tumor:.3f}"
              f"  → {'TUMOR' if tumor_detected else 'NORMAL'}  conf={confidence:.3f}")

        return tumor_detected, float(confidence)

    except Exception as e:
        print(f"[Classifier] Prediction error ({organ}): {e}")
        return None, 0.0


def reload_classifier(organ: str = None):
    """
    Forces the model(s) to be reloaded from disk (call after retraining).
    If organ is None, clears ALL cached models.
    """
    global _classifiers
    if organ:
        _classifiers.pop(organ.lower(), None)
        print(f"[Classifier] Cache cleared for '{organ}' — will reload on next prediction.")
    else:
        _classifiers.clear()
        print("[Classifier] All caches cleared — will reload on next prediction.")
