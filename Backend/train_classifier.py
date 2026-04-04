import os
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, models, transforms
from torch.utils.data import DataLoader, random_split
import argparse
from collections import Counter

def train_model(dataset_path, val_path=None, epochs=15):
    print(f"\n{'='*60}")
    print(f"  VaidhyaNetra ResNet-18 Training")
    print(f"{'='*60}")
    print(f"Dataset: {dataset_path}")
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Device: {device}")

    # ── 1. Data Transforms ──────────────────────────────────────────
    # Strong augmentation for training to prevent overfitting
    train_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomResizedCrop(224, scale=(0.8, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(),
        transforms.RandomRotation(20),
        transforms.ColorJitter(brightness=0.3, contrast=0.3),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    # Minimal transform for validation – no augmentation
    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    # ── 2. Load Dataset ──────────────────────────────────────────────
    full_dataset = datasets.ImageFolder(dataset_path, transform=train_transform)
    class_names = full_dataset.classes
    print(f"\nClass folders found: {class_names}")
    print("  ⚠  Folder names MUST match what the model expects:")
    print("     'Normal' → No Tumor  (index 0 alphabetically)")
    print("     'Tumor'  → Has Tumor (index 1 alphabetically)")
    print(f"\nClass-to-index mapping: {full_dataset.class_to_idx}")

    class_counts = dict(Counter(full_dataset.targets))
    total_samples = sum(class_counts.values())
    print(f"Class distribution: {class_counts}  (total: {total_samples})")

    # Validate expected folders
    expected = {'Normal', 'Tumor'}
    actual = set(class_names)
    if actual != expected:
        print(f"\n❌ ERROR: Expected folders {expected}, but found {actual}")
        print("   Please rename your data folders to exactly 'Normal' and 'Tumor'")
        return

    # ── 3. Train / Validation Split ──────────────────────────────────
    if val_path and os.path.exists(val_path):
        print(f"\nUsing separate validation set: {val_path}")
        train_dataset = full_dataset
        val_dataset   = datasets.ImageFolder(val_path, transform=val_transform)
    else:
        print("\nNo separate val path given – auto-splitting 80/20")
        val_size   = int(0.2 * total_samples)
        train_size = total_samples - val_size
        train_dataset, val_dataset = random_split(
            full_dataset, [train_size, val_size],
            generator=torch.Generator().manual_seed(42)
        )

    train_loader = DataLoader(train_dataset, batch_size=16, shuffle=True,  num_workers=0, pin_memory=True)
    val_loader   = DataLoader(val_dataset,   batch_size=16, shuffle=False, num_workers=0, pin_memory=True)
    print(f"Train: {len(train_dataset)} images | Val: {len(val_dataset)} images")

    # ── 4. Class Weights (handles imbalanced data) ───────────────────
    weights = []
    for i in range(len(class_names)):
        w = total_samples / (len(class_names) * class_counts[i])
        weights.append(w)
    class_weights = torch.FloatTensor(weights).to(device)
    print(f"Class weights (Normal, Tumor): {class_weights.cpu().tolist()}")

    # ── 5. Model Setup ────────────────────────────────────────────────
    # Load pre-trained ResNet18 from ImageNet
    model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)

    # CRITICAL FIX: Unfreeze ALL layers for FULL fine-tuning
    # Freezing was the #1 cause of poor accuracy — the backbone never
    # learned MRI-specific features, only ImageNet features!
    for param in model.parameters():
        param.requires_grad = True

    # Replace head: 512 → 2 classes
    num_ftrs = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(0.4),          # Reduce overfitting on small datasets
        nn.Linear(num_ftrs, 2)
    )
    model = model.to(device)

    total_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"Trainable parameters: {total_params:,}")

    # ── 6. Loss & Optimizer ───────────────────────────────────────────
    criterion = nn.CrossEntropyLoss(weight=class_weights)

    # Use different LRs: smaller LR for pretrained backbone, larger for new head
    backbone_params = [p for n, p in model.named_parameters() if 'fc' not in n]
    head_params     = [p for n, p in model.named_parameters() if 'fc' in n]

    optimizer = optim.Adam([
        {'params': backbone_params, 'lr': 1e-4},   # slow for backbone
        {'params': head_params,     'lr': 1e-3},   # fast for new head
    ], weight_decay=1e-4)

    # Reduce LR by 50% when val accuracy stops improving
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode='max', patience=3, factor=0.5
    )

    # ── 7. Training Loop ──────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"Starting Full Fine-Tuning for {epochs} epochs...")
    print(f"{'='*60}")

    best_val_acc  = 0.0
    best_model_path = 'models/resnet18_brain_best.pth'
    os.makedirs('models', exist_ok=True)

    from tqdm import tqdm
    for epoch in range(epochs):
        # — Training phase —
        model.train()
        train_loss, train_correct = 0.0, 0

        print(f"\nEpoch {epoch+1}/{epochs}")
        for inputs, labels in tqdm(train_loader, desc="Training"):
            inputs, labels = inputs.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(inputs)
            _, preds = torch.max(outputs, 1)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            train_loss    += loss.item() * inputs.size(0)
            train_correct += torch.sum(preds == labels.data).item()

        train_loss /= len(train_dataset)
        train_acc   = train_correct / len(train_dataset)

        # — Validation phase —
        model.eval()
        val_loss, val_correct = 0.0, 0
        val_tp, val_fp, val_tn, val_fn = 0, 0, 0, 0

        with torch.no_grad():
            for inputs, labels in tqdm(val_loader, desc="Validation"):
                inputs, labels = inputs.to(device), labels.to(device)
                outputs = model(inputs)
                _, preds = torch.max(outputs, 1)
                loss = criterion(outputs, labels)
                val_loss    += loss.item() * inputs.size(0)
                val_correct += torch.sum(preds == labels.data).item()

                # Confusion matrix stats (Tumor=1, Normal=0)
                for p, l in zip(preds.cpu(), labels.cpu()):
                    if l == 1 and p == 1: val_tp += 1
                    if l == 0 and p == 1: val_fp += 1
                    if l == 0 and p == 0: val_tn += 1
                    if l == 1 and p == 0: val_fn += 1

        val_loss /= len(val_dataset)
        val_acc   = val_correct / len(val_dataset)
        sensitivity = val_tp / (val_tp + val_fn + 1e-8)  # Recall for tumor
        specificity = val_tn / (val_tn + val_fp + 1e-8)  # Recall for normal

        scheduler.step(val_acc)

        marker = " ← BEST" if val_acc > best_val_acc else ""
        print(
            f"Epoch {epoch+1:02d}/{epochs} | "
            f"Train Loss: {train_loss:.4f}  Acc: {train_acc:.4f} | "
            f"Val Loss: {val_loss:.4f}  Acc: {val_acc:.4f} | "
            f"Sens: {sensitivity:.3f}  Spec: {specificity:.3f}"
            f"{marker}"
        )

        # Save best model
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), best_model_path)

    # ── 8. Save Final Model ───────────────────────────────────────────
    final_path = 'models/resnet18_brain.pth'
    # Copy best checkpoint as the production model
    import shutil
    shutil.copy(best_model_path, final_path)

    print(f"\n{'='*60}")
    print(f"  Training Complete!")
    print(f"  Best Val Accuracy : {best_val_acc:.4f} ({best_val_acc*100:.1f}%)")
    print(f"  Model saved to    : {final_path}")
    print(f"  Class mapping     : {full_dataset.class_to_idx}")
    print(f"    Normal=0 (No Tumor)  |  Tumor=1 (Has Tumor)")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Train ResNet-18 for Brain Tumor Classification")
    parser.add_argument('--folder',     type=str, required=True,  help="Path to TRAIN folder (with Normal/ and Tumor/ subfolders)")
    parser.add_argument('--val_folder', type=str, default=None,   help="Path to VALIDATION folder (optional; auto-splits 80/20 if not provided)")
    parser.add_argument('--epochs',     type=int, default=15,     help="Number of training epochs (default: 15)")
    args = parser.parse_args()

    train_model(args.folder, args.val_path if hasattr(args, 'val_path') else args.val_folder, args.epochs)
