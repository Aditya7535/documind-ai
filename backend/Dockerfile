# Backend Dockerfile for DocuMind AI RAG Engine
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code and sample documents
COPY backend/ ./backend/
COPY sample_docs/ ./sample_docs/

# Create storage directory for persistence
RUN mkdir -p /app/storage/docs

EXPOSE 8000

ENV RUN_MODE=local
ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
