"""
VaidhyaNetra — Dual-Model Accuracy Evaluator
Evaluates Brain and Breast ResNet-18 classifiers separately and prints
a detailed report: Accuracy, Sensitivity, Specificity, Precision, F1-Score.
"""

import torch
import torch.nn as nn
from torchvision import datasets, models, transforms
from torch.utils.data import DataLoader
import os


# ── Config ────────────────────────────────────────────────────────────────────
EVALUATIONS = [
    {
        "organ":      "Brain",
        "model_path": "models/resnet18_brain_best.pth",
        "val_path":   "../Data/Brain/Validation",
    },
    {
        "organ":      "Breast",
        "model_path": "models/resnet18_breast_best.pth",
        "val_path":   "../Data/Breast/validation",
    },
]

BATCH_SIZE = 16


def build_model(device):
    model = models.resnet18(weights=None)
    num_ftrs = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(0.4),
        nn.Linear(num_ftrs, 2)
    )
    return model.to(device)


def evaluate_model(organ, model_path, val_path, device):
    print(f"\n{'='*56}")
    print(f"  Evaluating: {organ.upper()} TUMOR MODEL")
    print(f"{'='*56}")

    # ── Validate paths ────────────────────────────────────────────
    if not os.path.exists(model_path):
        print(f"  ❌ Model not found: {model_path}")
        return
    if not os.path.exists(val_path):
        print(f"  ❌ Validation folder not found: {val_path}")
        return

    # ── Load data ─────────────────────────────────────────────────
    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
    ])
    val_dataset = datasets.ImageFolder(val_path, transform=val_transform)
    val_loader  = DataLoader(val_dataset, batch_size=BATCH_SIZE,
                             shuffle=False, num_workers=0)

    class_names = val_dataset.classes
    print(f"  Classes found : {class_names}")
    print(f"  Class→Index   : {val_dataset.class_to_idx}")

    from collections import Counter
    dist = Counter(val_dataset.targets)
    print(f"  Distribution  : Normal={dist.get(0,0)}, Tumor={dist.get(1,0)}")
    print(f"  Total images  : {len(val_dataset)}")

    # ── Load model ────────────────────────────────────────────────
    model = build_model(device)
    model.load_state_dict(
        torch.load(model_path, map_location=device, weights_only=True)
    )
    model.eval()
    print(f"  Model loaded  : {model_path}")

    # ── Run inference ─────────────────────────────────────────────
    # Confusion matrix: Tumor=1 (positive), Normal=0 (negative)
    tp = fp = tn = fn = 0
    all_correct = 0

    with torch.no_grad():
        for inputs, labels in val_loader:
            inputs, labels = inputs.to(device), labels.to(device)
            outputs = model(inputs)
            _, preds = torch.max(outputs, 1)
            all_correct += torch.sum(preds == labels.data).item()

            for p, l in zip(preds.cpu(), labels.cpu()):
                if l == 1 and p == 1: tp += 1   # True  Positive (Tumor correctly caught)
                if l == 0 and p == 1: fp += 1   # False Positive (Normal misclassified as Tumor)
                if l == 0 and p == 0: tn += 1   # True  Negative (Normal correctly identified)
                if l == 1 and p == 0: fn += 1   # False Negative (Tumor missed — most dangerous!)

    total       = len(val_dataset)
    accuracy    = all_correct / total * 100
    sensitivity = tp / (tp + fn + 1e-8) * 100  # Recall for Tumor class
    specificity = tn / (tn + fp + 1e-8) * 100  # Recall for Normal class
    precision   = tp / (tp + fp + 1e-8) * 100  # Of all "Tumor" predictions, how many correct
    f1          = 2 * precision * sensitivity / (precision + sensitivity + 1e-8)

    # ── Print report ──────────────────────────────────────────────
    print(f"\n  ┌─────────────────────────────────────────┐")
    print(f"  │  {organ.upper()} MODEL — ACCURACY REPORT            │")
    print(f"  ├─────────────────────────────────────────┤")
    print(f"  │  Overall Accuracy   : {accuracy:>6.2f}%           │")
    print(f"  │  Sensitivity (Recall): {sensitivity:>6.2f}%          │")
    print(f"  │    (how many tumors caught)              │")
    print(f"  │  Specificity        : {specificity:>6.2f}%          │")
    print(f"  │    (how many normals correctly cleared)  │")
    print(f"  │  Precision          : {precision:>6.2f}%          │")
    print(f"  │  F1-Score           : {f1:>6.2f}%          │")
    print(f"  ├─────────────────────────────────────────┤")
    print(f"  │  Confusion Matrix:                       │")
    print(f"  │    True  Positives (TP): {tp:>4}             │")
    print(f"  │    False Positives (FP): {fp:>4}             │")
    print(f"  │    True  Negatives (TN): {tn:>4}             │")
    print(f"  │    False Negatives (FN): {fn:>4} ← Missed!  │")
    print(f"  └─────────────────────────────────────────┘")

    if fn > 0:
        print(f"\n  ⚠  {fn} tumor case(s) were MISSED (False Negatives).")
        print(f"     Consider more training epochs or data augmentation.")
    else:
        print(f"\n  ✅ No tumors missed! Model caught every positive case.")

    return {
        "organ": organ,
        "accuracy": accuracy,
        "sensitivity": sensitivity,
        "specificity": specificity,
        "precision": precision,
        "f1": f1
    }


def main():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"\nVaidhyaNetra — Dual-Model Evaluator")
    print(f"Device: {device}")

    results = []
    for cfg in EVALUATIONS:
        r = evaluate_model(cfg["organ"], cfg["model_path"], cfg["val_path"], device)
        if r:
            results.append(r)

    # ── Side-by-side comparison ───────────────────────────────────
    if len(results) == 2:
        a, b = results[0], results[1]
        print(f"\n{'='*56}")
        print(f"  SIDE-BY-SIDE COMPARISON")
        print(f"{'='*56}")
        print(f"  {'Metric':<22} {'Brain':>10} {'Breast':>10}")
        print(f"  {'-'*44}")
        for metric in ["accuracy", "sensitivity", "specificity", "precision", "f1"]:
            label = metric.capitalize()
            print(f"  {label:<22} {a[metric]:>9.2f}%  {b[metric]:>9.2f}%")
        print(f"{'='*56}\n")


if __name__ == '__main__':
    main()
