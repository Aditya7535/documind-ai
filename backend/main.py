import os
import uuid
import time
import subprocess
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel

class NextcloudIngestRequest(BaseModel):
    path: str
    name: str

class NextcloudConfigRequest(BaseModel):
    url: str
    username: str
    password: str

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

    # 5. Store in Nextcloud storage (/DocuMind)
    nextcloud_result = {"success": False, "error": "offline"}
    storage_loc = "Local / S3"
    nc_path = None
    nc_web_url = None
    has_nc = False

    try:
        from backend.services.nextcloud_service import nextcloud_service
        if nextcloud_service.test_connection():
            nextcloud_result = nextcloud_service.upload_file(file_bytes, doc_name, folder="DocuMind")
            if nextcloud_result.get("success"):
                storage_loc = f"Nextcloud: /DocuMind/{doc_name}"
                nc_path = nextcloud_result.get("nextcloud_path")
                nc_web_url = nextcloud_result.get("web_url")
                has_nc = True
    except Exception as e:
        print(f"[Upload] Nextcloud upload failed: {e}")
        nextcloud_result = {"success": False, "error": str(e)}

    # 6. Store chunks & vectors into Vector Database
    vector_store = get_vector_store()
    if hasattr(vector_store, "add_document"):
        vector_store.add_document(
            doc_id,
            doc_name,
            file_size,
            len(pages),
            storage_location=storage_loc,
            nextcloud_path=nc_path,
            nextcloud_url=nc_web_url,
            has_nextcloud=has_nc,
            file_uri=file_uri,
            source="Nextcloud + S3" if has_nc else "Local / S3"
        )
    vector_store.add_chunks_with_embeddings(chunks, embeddings)

    return {
        "doc_id": doc_id,
        "name": doc_name,
        "size": file_size,
        "pages": len(pages),
        "chunks_indexed": len(chunks),
        "file_uri": file_uri,
        "storage_location": storage_loc,
        "nextcloud": nextcloud_result,
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
        threshold=threshold,
        query_text=req.query
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
        doc_info = {}
        if hasattr(vector_store, "documents"):
            doc_info = vector_store.documents.get(doc_id, {})

        success = vector_store.delete_document(doc_id)
        if success:
            if doc_info.get("has_nextcloud") and doc_info.get("name"):
                try:
                    from backend.services.nextcloud_service import nextcloud_service
                    folder = "DocuMind" if "DocuMind" in str(doc_info.get("storage_location", "")) else ""
                    nextcloud_service.delete_file(doc_info["name"], folder=folder)
                except Exception as e:
                    print(f"[Delete] Nextcloud delete non-fatal warning: {e}")
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

@app.post("/api/nextcloud/config")
def update_nextcloud_config(config: NextcloudConfigRequest):
    """
    Update Nextcloud connection details dynamically.
    """
    from backend.services.nextcloud_service import nextcloud_service
    nextcloud_service.update_config(config.url, config.username, config.password)
    connected = nextcloud_service.test_connection()
    return {
        "connected": connected,
        "url": nextcloud_service.url,
        "username": nextcloud_service.username,
        "message": "Connected successfully to Nextcloud!" if connected else f"Configuration saved, but Nextcloud at {nextcloud_service.url} is currently unreachable."
    }

@app.post("/api/nextcloud/launch-docker")
def launch_docker_nextcloud():
    """
    Trigger docker compose up for the Nextcloud and MariaDB containers.
    """
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    try:
        res = subprocess.run(
            ["docker", "compose", "up", "-d", "nextcloud", "nextcloud-db"],
            cwd=project_root,
            capture_output=True,
            text=True,
            timeout=30
        )
        if res.returncode == 0:
            time.sleep(2)
            from backend.services.nextcloud_service import nextcloud_service
            is_ready = nextcloud_service.test_connection()
            return {
                "success": True,
                "message": "Nextcloud Docker containers started successfully.",
                "connected": is_ready,
                "stdout": res.stdout
            }
        else:
            return {
                "success": False,
                "message": "Docker daemon is not responding or Docker Desktop is not running. Please open Docker Desktop on Windows, wait for it to start, then retry.",
                "error": res.stderr
            }
    except Exception as e:
        return {
            "success": False,
            "message": f"Could not execute Docker command: {str(e)}. Please start Docker Desktop first."
        }

@app.get("/api/nextcloud/files")
def get_nextcloud_files():
    """
    List all documents in Nextcloud storage (in /DocuMind and root)
    with their corresponding RAG indexation status.
    """
    from backend.services.nextcloud_service import nextcloud_service
    if not nextcloud_service.test_connection():
        return {
            "connected": False,
            "url": nextcloud_service.url,
            "username": nextcloud_service.username,
            "files": []
        }

    raw_files = nextcloud_service.list_documents()
    vector_store = get_vector_store()
    indexed_names = {}
    if hasattr(vector_store, "documents"):
        for d_id, doc in vector_store.documents.items():
            indexed_names[doc.get("name")] = d_id

    enriched = []
    for f in raw_files:
        is_idx = f["name"] in indexed_names
        enriched.append({
            **f,
            "is_indexed": is_idx,
            "doc_id": indexed_names.get(f["name"])
        })

    return {
        "connected": True,
        "url": nextcloud_service.url,
        "username": nextcloud_service.username,
        "total_files": len(enriched),
        "files": enriched
    }

@app.post("/api/nextcloud/ingest-file")
def nextcloud_ingest_file(req: NextcloudIngestRequest):
    """
    Index a specific document from Nextcloud storage directly into the RAG vector store.
    """
    from backend.services.nextcloud_service import nextcloud_service
    if not nextcloud_service.test_connection():
        raise HTTPException(status_code=503, detail="Nextcloud is currently unreachable.")

    try:
        content = nextcloud_service.download_file(req.path)
        fname = req.name
        doc_id = f"nc_{fname.replace(' ', '_').split('.')[0]}"

        if fname.lower().endswith('.pdf'):
            pages = DocumentParser.extract_text_from_pdf(content)
        else:
            pages = DocumentParser.extract_text_from_plain(content.decode('utf-8', errors='ignore'))

        if not pages:
            raise HTTPException(status_code=400, detail="Could not extract readable text from document.")

        chunks = DocumentParser.chunk_document(doc_id, fname, pages)
        chunk_texts = [c["text"] for c in chunks]
        embeddings = embedding_service.embed_documents(chunk_texts)

        vector_store = get_vector_store()
        folder_name = "DocuMind" if "DocuMind" in req.path else "Root"
        storage_loc = f"Nextcloud: /{folder_name}/{fname}"

        if hasattr(vector_store, "add_document"):
            vector_store.add_document(
                doc_id,
                fname,
                len(content),
                len(pages),
                storage_location=storage_loc,
                nextcloud_path=req.path,
                nextcloud_url=f"{nextcloud_service.url}/index.php/apps/files/files?dir=/{folder_name}",
                has_nextcloud=True,
                source="Nextcloud Direct"
            )
        vector_store.add_chunks_with_embeddings(chunks, embeddings)

        return {
            "status": "indexed",
            "doc_id": doc_id,
            "name": fname,
            "chunks": len(chunks),
            "storage_location": storage_loc
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to ingest file: {str(e)}")

@app.post("/api/nextcloud/sync")
def nextcloud_sync():
    """
    Sync all PDF / text files from Nextcloud into vector database.
    """
    from backend.services.nextcloud_service import nextcloud_service
    if not nextcloud_service.test_connection():
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
        # Skip if already indexed
        if hasattr(vector_store, "documents"):
            existing = any(d.get("name") == fname for d in vector_store.documents.values())
            if existing:
                continue

        try:
            content = nextcloud_service.download_file(item["path"])
            doc_id = f"nc_{fname.replace(' ', '_').split('.')[0]}"

            if fname.lower().endswith('.pdf'):
                pages = DocumentParser.extract_text_from_pdf(content)
            else:
                pages = DocumentParser.extract_text_from_plain(content.decode('utf-8', errors='ignore'))

            if not pages:
                continue

            chunks = DocumentParser.chunk_document(doc_id, fname, pages)
            chunk_texts = [c["text"] for c in chunks]
            embeddings = embedding_service.embed_documents(chunk_texts)

            folder_name = item.get("folder", "DocuMind")
            storage_loc = f"Nextcloud: /{folder_name}/{fname}"

            if hasattr(vector_store, "add_document"):
                vector_store.add_document(
                    doc_id,
                    fname,
                    len(content),
                    len(pages),
                    storage_location=storage_loc,
                    nextcloud_path=item["path"],
                    nextcloud_url=item.get("web_url"),
                    has_nextcloud=True,
                    source="Nextcloud Sync"
                )
            vector_store.add_chunks_with_embeddings(chunks, embeddings)
            synced.append({"name": fname, "chunks": len(chunks), "folder": folder_name})
        except Exception as e:
            print(f"[Sync] Error indexing Nextcloud file '{fname}': {e}")

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

