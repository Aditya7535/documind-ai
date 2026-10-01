import os
import uuid
import time
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from backend.config import settings
from backend.services.document_parser import DocumentParser
from backend.services.embedding_service import embedding_service
from backend.services.vector_store import get_vector_store
from backend.services.llm_service import llm_service
from backend.services.s3_service import s3_service

app = FastAPI(
    title="DocuMind AI - AWS Bedrock RAG Engine",
    description="Enterprise Retrieval-Augmented Generation (RAG) Document Search Engine on AWS",
    version="1.0.0"
)

# Enable CORS for local dev and Amplify / CloudFront origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str
    top_k: Optional[int] = 4
    similarity_threshold: Optional[float] = 0.10
    model_id: Optional[str] = None

frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")

@app.get("/")
def root():
    index_file = os.path.join(frontend_dist, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {
        "service": "DocuMind AI - Serverless RAG Document Engine",
        "mode": settings.RUN_MODE,
        "docs_url": "/docs"
    }

@app.get("/api/health")
def health_check():
    vector_store = get_vector_store()
    stats = vector_store.get_stats()
    return {
        "status": "healthy",
        "mode": settings.RUN_MODE,
        "region": settings.AWS_REGION,
        "embedding_model": settings.BEDROCK_EMBEDDING_MODEL_ID,
        "llm_model": settings.BEDROCK_LLM_MODEL_ID,
        "vector_store": stats
    }

@app.get("/api/stats")
def get_stats():
    vector_store = get_vector_store()
    return vector_store.get_stats()

@app.get("/api/documents")
def list_documents():
    vector_store = get_vector_store()
    if hasattr(vector_store, "list_documents"):
        return {"documents": vector_store.list_documents()}
    return {"documents": []}

@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.pdf', '.txt', '.md')):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload PDF, TXT, or MD documents."
        )

    file_bytes = await file.read()
    file_size = len(file_bytes)
    doc_id = f"doc_{uuid.uuid4().hex[:8]}"
    doc_name = file.filename

    # 1. Parse text from file
    if file.filename.lower().endswith('.pdf'):
        pages = DocumentParser.extract_text_from_pdf(file_bytes)
    else:
        text_content = file_bytes.decode('utf-8', errors='ignore')
        pages = DocumentParser.extract_text_from_plain(text_content)

    if not pages:
        raise HTTPException(
            status_code=400,
            detail="Could not extract readable text from document. Ensure it is not an image-only scanned PDF."
        )

    # 2. Chunk document text
    chunks = DocumentParser.chunk_document(
        doc_id=doc_id,
        doc_name=doc_name,
        pages=pages,
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP
    )

    if not chunks:
        raise HTTPException(
            status_code=400,
            detail="Document text was insufficient to generate indexable chunks."
        )

    # 3. Store raw document in S3 / local storage
    file_uri = s3_service.upload_file(file_bytes, doc_name, doc_id)

    # 4. Generate embeddings via Bedrock Titan (or local semantic embedder)
    chunk_texts = [c["text"] for c in chunks]
    embeddings = embedding_service.embed_documents(chunk_texts)

    # 5. Store chunks & vectors into Vector Database
    vector_store = get_vector_store()
    if hasattr(vector_store, "add_document"):
        vector_store.add_document(doc_id, doc_name, file_size, len(pages))
    vector_store.add_chunks_with_embeddings(chunks, embeddings)

    return {
        "doc_id": doc_id,
        "name": doc_name,
        "size": file_size,
        "pages": len(pages),
        "chunks_indexed": len(chunks),
        "file_uri": file_uri,
        "status": "success"
    }

@app.post("/api/query")
async def query_documents(req: QueryRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    query_start = time.time()
    vector_store = get_vector_store()

    # 1. Embed query
    query_embedding = embedding_service.embed_query(req.query)

    # 2. Perform k-NN search in vector store
    top_k = req.top_k or settings.DEFAULT_TOP_K
    threshold = req.similarity_threshold or 0.0
    retrieved_chunks = vector_store.search(
        query_embedding=query_embedding,
        top_k=top_k,
        threshold=threshold
    )

    # 3. Generate grounded RAG answer via Bedrock LLM
    result = llm_service.generate_rag_answer(
        query=req.query,
        retrieved_chunks=retrieved_chunks,
        model_id=req.model_id
    )

    total_latency_ms = int((time.time() - query_start) * 1000)
    result["total_latency_ms"] = total_latency_ms
    result["retrieved_count"] = len(retrieved_chunks)

    return result

@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: str):
    vector_store = get_vector_store()
    if hasattr(vector_store, "delete_document"):
        success = vector_store.delete_document(doc_id)
        if success:
            return {"status": "deleted", "doc_id": doc_id}
        raise HTTPException(status_code=404, detail="Document not found")
    return {"status": "unsupported", "doc_id": doc_id}

@app.post("/api/seed-samples")
def seed_samples():
    """
    Seed built-in enterprise sample documents for instant testing.
    """
    sample_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sample_docs")
    if not os.path.exists(sample_dir):
        return {"status": "no_sample_dir"}

    indexed = []
    vector_store = get_vector_store()

    for fname in os.listdir(sample_dir):
        if fname.endswith(('.txt', '.md', '.pdf')):
            path = os.path.join(sample_dir, fname)
            with open(path, "rb") as f:
                content = f.read()

            doc_id = f"sample_{fname.split('.')[0]}"
            # Skip if already indexed
            if hasattr(vector_store, "documents") and doc_id in vector_store.documents:
                continue

            if fname.endswith('.pdf'):
                pages = DocumentParser.extract_text_from_pdf(content)
            else:
                pages = DocumentParser.extract_text_from_plain(content.decode('utf-8', errors='ignore'))

            chunks = DocumentParser.chunk_document(doc_id, fname, pages)
            chunk_texts = [c["text"] for c in chunks]
            embeddings = embedding_service.embed_documents(chunk_texts)

            if hasattr(vector_store, "add_document"):
                vector_store.add_document(doc_id, fname, len(content), len(pages))
            vector_store.add_chunks_with_embeddings(chunks, embeddings)
            indexed.append({"name": fname, "chunks": len(chunks)})

    return {"status": "seeded", "documents": indexed}

@app.get("/api/nextcloud/status")
def nextcloud_status():
    from backend.services.nextcloud_service import nextcloud_service
    is_online = nextcloud_service.test_connection()
    return {
        "connected": is_online,
        "url": nextcloud_service.url,
        "username": nextcloud_service.username
    }

@app.post("/api/nextcloud/sync")
def nextcloud_sync():
    """
    Sync all PDF / text files from Nextcloud into vector database.
    """
    from backend.services.nextcloud_service import nextcloud_service
    if not nextcloud_service.test_connection():
        # If Nextcloud container is not yet initialized or reachable, return informative status
        return {
            "status": "offline",
            "message": "Nextcloud instance at " + nextcloud_service.url + " is not reachable yet. Start with `docker compose up -d`.",
            "synced": []
        }

    files = nextcloud_service.list_documents()
    synced = []
    vector_store = get_vector_store()

    for item in files:
        fname = item["name"]
        content = nextcloud_service.download_file(item["path"])
        doc_id = f"nc_{fname.split('.')[0]}"
        if hasattr(vector_store, "documents") and doc_id in vector_store.documents:
            continue

        if fname.lower().endswith('.pdf'):
            pages = DocumentParser.extract_text_from_pdf(content)
        else:
            pages = DocumentParser.extract_text_from_plain(content.decode('utf-8', errors='ignore'))

        chunks = DocumentParser.chunk_document(doc_id, fname, pages)
        chunk_texts = [c["text"] for c in chunks]
        embeddings = embedding_service.embed_documents(chunk_texts)

        if hasattr(vector_store, "add_document"):
            vector_store.add_document(doc_id, fname, len(content), len(pages))
        vector_store.add_chunks_with_embeddings(chunks, embeddings)
        synced.append({"name": fname, "chunks": len(chunks)})

    return {"status": "synced", "count": len(synced), "files": synced}

# Mount static assets and SPA catch-all when frontend build exists
if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend_assets(full_path: str):
        if full_path.startswith("api/") or full_path in ("docs", "redoc", "openapi.json"):
            raise HTTPException(status_code=404, detail="Not Found")
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))

