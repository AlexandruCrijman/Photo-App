#!/bin/bash

# Model Download Script for Wedding Photo App
# Downloads required AI models for face detection and recognition

set -e

MODELS_DIR="backend/models"
SCRFD_URL="https://github.com/deepinsight/insightface/releases/download/v0.7/scrfd_2.5g_bnkps.onnx"
ARCFACE_URL="https://github.com/deepinsight/insightface/releases/download/v0.7/arcface_r50_v1.onnx"
OSNET_URL="https://github.com/KaiyangZhou/deep-person-reid/releases/download/v0.1/osnet_x0_25_market1501_256x128_amsgrad_ep50_lr0.0015_coslr_b64_fb10_softmax_labsmth_flip_jitter.pth"

echo "Creating models directory..."
mkdir -p "$MODELS_DIR"

cd "$MODELS_DIR"

# Download SCRFD model
if [ ! -f "scrfd_2.5g_bnkps.onnx" ]; then
    echo "Downloading SCRFD face detection model..."
    curl -L -o scrfd_2.5g_bnkps.onnx "$SCRFD_URL" || {
        echo "Warning: Failed to download SCRFD model from primary URL"
        echo "Alternative: Download manually from https://github.com/deepinsight/insightface/releases/tag/v0.7"
        echo "Look for: scrfd_2.5g_bnkps.onnx or scrfd_500m_bnkps.onnx"
    }
else
    echo "SCRFD model already exists, skipping..."
fi

# Download ArcFace model
if [ ! -f "arcface_r50.onnx" ]; then
    echo "Downloading ArcFace face recognition model..."
    curl -L -o arcface_r50.onnx "$ARCFACE_URL" || {
        echo "Warning: Failed to download ArcFace model from primary URL"
        echo "Alternative: Download manually from https://github.com/deepinsight/insightface/releases"
        echo "Look for: arcface_r50.onnx or arcface_r100.onnx"
    }
else
    echo "ArcFace model already exists, skipping..."
fi

# Note: OSNet model may need manual download or conversion
if [ ! -f "osnet_x0_25.onnx" ]; then
    echo "Note: OSNet model (osnet_x0_25.onnx) may need to be downloaded manually"
    echo "Source: https://github.com/KaiyangZhou/deep-person-reid"
    echo "You may need to convert from PyTorch (.pth) to ONNX format"
fi

echo ""
echo "Model download complete!"
echo "Verify models in: $MODELS_DIR"
ls -lh "$MODELS_DIR"/*.onnx 2>/dev/null || echo "No .onnx files found. Please download models manually."

