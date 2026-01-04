# Frontend Dockerfile for Wedding Photo App
# Multi-stage build supporting both development and production

# Development stage
FROM node:20-alpine AS development

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 5173

# Development mode: run Vite dev server
# Use npm run dev to ensure it uses the installed vite from node_modules
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Production build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build for production
RUN npm run build

# Production serve stage
FROM node:20-alpine AS production

WORKDIR /app

# Install serve globally for static file serving
RUN npm install -g serve

# Copy built files from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public

# Expose port
EXPOSE 5173

# Serve static files
CMD ["serve", "-s", "dist", "-l", "5173"]

