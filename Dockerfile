# Multi-stage build for DocuMind AI Full-Stack Portfolio Deployment

# --- Stage 1: Build Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Runtime Environment ---
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code & sample documents
COPY backend/ ./backend/
COPY sample_docs/ ./sample_docs/

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create storage directory for documents and local vector cache
RUN mkdir -p /app/storage/docs

# Default port: Hugging Face Spaces uses 7860; Render / Railway inject $PORT dynamically
ENV RUN_MODE=local
ENV PYTHONUNBUFFERED=1
ENV PORT=7860

EXPOSE 7860 8000 10000

CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
