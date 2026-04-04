import torch
from torchvision import datasets, models, transforms
from torch.utils.data import DataLoader
import os


def evaluate():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print("Using device:", device)

    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[
                             0.229, 0.224, 0.225])
    ])

    val_dataset = datasets.ImageFolder(
        'd:/MRI Cancer/Data/Validation', transform=val_transform)
    val_loader = DataLoader(val_dataset, batch_size=16, shuffle=False)

    model = models.resnet18(weights=None)
    model.fc = torch.nn.Sequential(
        torch.nn.Dropout(0.4),
        torch.nn.Linear(model.fc.in_features, 2)
    )
    model.load_state_dict(torch.load(
        'd:/MRI Cancer/Backend/models/resnet18_brain_best.pth', map_location=device, weights_only=True))
    model.to(device)
    model.eval()

    correct = 0
    total = 0
    with torch.no_grad():
        for inputs, labels in val_loader:
            inputs, labels = inputs.to(device), labels.to(device)
            outputs = model(inputs)
            _, preds = torch.max(outputs, 1)
            correct += torch.sum(preds == labels.data).item()
            total += labels.size(0)

    print(f"\n======================================")
    print(f"Total evaluated: {total}")
    print(f"Accuracy: {correct / total * 100:.2f}%")
    print(f"======================================\n")


if __name__ == '__main__':
    evaluate()
