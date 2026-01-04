# Backend Dockerfile for Wedding Photo App
# Using node:20 (Debian-based) instead of Alpine for better ONNX Runtime compatibility
FROM node:20

# Set working directory
WORKDIR /app

# Install system dependencies for ONNX Runtime and Sharp
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Create directories for uploads and models
RUN mkdir -p uploads models

# Expose port
EXPOSE 4000

# Default command (can be overridden in docker-compose)
CMD ["npm", "run", "dev"]

