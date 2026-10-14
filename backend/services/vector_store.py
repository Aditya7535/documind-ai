import os
import json
import numpy as np
from typing import List, Dict, Any, Optional
from backend.config import settings

class LocalVectorStore:
    def __init__(self, storage_dir: str):
        self.storage_dir = storage_dir
        self.index_file = os.path.join(storage_dir, "vector_index.json")
        self.documents_file = os.path.join(storage_dir, "documents_meta.json")
        self.chunks: List[Dict[str, Any]] = []
        self.vectors: List[List[float]] = []
        self.documents: Dict[str, Dict[str, Any]] = {}
        os.makedirs(storage_dir, exist_ok=True)
        self.load()

    def load(self):
        if os.path.exists(self.index_file):
            try:
                with open(self.index_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.chunks = data.get("chunks", [])
                    self.vectors = data.get("vectors", [])
            except Exception as e:
                print(f"[LocalVectorStore] Error loading vector index: {e}")
        if os.path.exists(self.documents_file):
            try:
                with open(self.documents_file, "r", encoding="utf-8") as f:
                    self.documents = json.load(f)
            except Exception as e:
                print(f"[LocalVectorStore] Error loading documents metadata: {e}")

    def save(self):
        try:
            with open(self.index_file, "w", encoding="utf-8") as f:
                json.dump({"chunks": self.chunks, "vectors": self.vectors}, f)
            with open(self.documents_file, "w", encoding="utf-8") as f:
                json.dump(self.documents, f, indent=2)
        except Exception as e:
            print(f"[LocalVectorStore] Error saving index: {e}")

    def add_document(self, doc_id: str, doc_name: str, file_size: int, total_pages: int, **metadata):
        entry = {
            "id": doc_id,
            "name": doc_name,
            "size": file_size,
            "pages": total_pages,
            "chunks_count": 0,
            "status": "indexed",
            "indexed_at": str(np.datetime64('now')),
            "storage_location": metadata.get("storage_location", "Local / S3"),
            "nextcloud_path": metadata.get("nextcloud_path"),
            "nextcloud_url": metadata.get("nextcloud_url"),
            "has_nextcloud": metadata.get("has_nextcloud", False),
            "source": metadata.get("source", "Upload")
        }
        for k, v in metadata.items():
            entry[k] = v
        self.documents[doc_id] = entry
        self.save()

    def update_document(self, doc_id: str, **kwargs) -> bool:
        if doc_id in self.documents:
            self.documents[doc_id].update(kwargs)
            self.save()
            return True
        return False

    def add_chunks_with_embeddings(self, chunks: List[Dict[str, Any]], embeddings: List[List[float]]):
        for chunk, emb in zip(chunks, embeddings):
            self.chunks.append(chunk)
            self.vectors.append(emb)
            doc_id = chunk.get("doc_id")
            if doc_id in self.documents:
                self.documents[doc_id]["chunks_count"] += 1
        self.save()

    def search(
        self,
        query_embedding: List[float],
        top_k: int = 4,
        threshold: float = 0.0,
        query_text: str = ""
    ) -> List[Dict[str, Any]]:
        if not self.vectors:
            return []

        import re
        q_vec = np.array(query_embedding, dtype=np.float32)
        matrix = np.array(self.vectors, dtype=np.float32)

        # Dot product for normalized vectors = cosine similarity
        similarities = np.dot(matrix, q_vec)

        # Extract meaningful query keywords for hybrid BM25-style boosting
        q_words = [w.lower() for w in re.findall(r'\b[a-zA-Z0-9_-]{2,}\b', query_text)] if query_text else []
        stop_words = {"who", "what", "where", "when", "why", "how", "is", "are", "was", "were", "the", "and", "for", "with", "about", "tell", "me"}
        keywords = [w for w in q_words if w not in stop_words]

        # Pair with chunk data
        results = []
        for idx, score in enumerate(similarities):
            val = float(score)
            chunk = self.chunks[idx]

            # Hybrid keyword boost: if query terms match words in chunk text or document name
            if keywords:
                text_lower = chunk.get("text", "").lower()
                doc_name_lower = chunk.get("doc_name", "").lower()
                matches = sum(1 for kw in keywords if kw in text_lower or kw in doc_name_lower)
                if matches > 0:
                    keyword_ratio = matches / len(keywords)
                    # Blend cosine similarity with keyword exact-match confidence
                    val = (val * 0.45) + (keyword_ratio * 0.55)

            if val >= threshold:
                chunk_copy = dict(chunk)
                chunk_copy["score"] = round(val, 4)
                results.append(chunk_copy)

        # Sort descending by similarity
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

    def list_documents(self) -> List[Dict[str, Any]]:
        return list(self.documents.values())

    def delete_document(self, doc_id: str) -> bool:
        if doc_id not in self.documents:
            return False

        # Filter out chunks and vectors belonging to doc_id
        new_chunks = []
        new_vectors = []
        for chunk, vec in zip(self.chunks, self.vectors):
            if chunk.get("doc_id") != doc_id:
                new_chunks.append(chunk)
                new_vectors.append(vec)

        self.chunks = new_chunks
        self.vectors = new_vectors
        del self.documents[doc_id]
        self.save()
        return True

    def get_stats(self) -> Dict[str, Any]:
        return {
            "engine": "Local In-Memory / Vector Cache",
            "total_documents": len(self.documents),
            "total_chunks": len(self.chunks),
            "vector_dimensions": 512,
            "status": "ready"
        }

class OpenSearchVectorStore:
    """
    Amazon OpenSearch Serverless (AOSS) Vector Engine Integration.
    Uses opensearch-py with AWS SigV4 auth for production deployment.
    """
    def __init__(self, endpoint: str, index_name: str, region: str):
        self.endpoint = endpoint.replace("https://", "").rstrip("/")
        self.index_name = index_name
        self.region = region
        self.client = None
        self._init_client()

    def _init_client(self):
        try:
            from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth
            import boto3

            credentials = boto3.Session().get_credentials()
            auth = AWSV4SignerAuth(credentials, self.region, "aoss")

            self.client = OpenSearch(
                hosts=[{"host": self.endpoint, "port": 443}],
                http_auth=auth,
                use_ssl=True,
                verify_certs=True,
                connection_class=RequestsHttpConnection
            )
            self._ensure_index()
        except Exception as e:
            print(f"[OpenSearchVectorStore] Error initializing AOSS client: {e}")

    def _ensure_index(self):
        if not self.client or not self.client.indices.exists(index=self.index_name):
            index_body = {
                "settings": {
                    "index.knn": True
                },
                "mappings": {
                    "properties": {
                        "vector": {
                            "type": "knn_vector",
                            "dimension": 512,
                            "method": {
                                "name": "hnsw",
                                "space_type": "cosinesimil",
                                "engine": "nmslib"
                            }
                        },
                        "text": {"type": "text"},
                        "doc_id": {"type": "keyword"},
                        "doc_name": {"type": "keyword"},
                        "page_number": {"type": "integer"}
                    }
                }
            }
            try:
                self.client.indices.create(index=self.index_name, body=index_body)
            except Exception as e:
                print(f"[OpenSearchVectorStore] Warning creating index: {e}")

    def add_chunks_with_embeddings(self, chunks: List[Dict[str, Any]], embeddings: List[List[float]]):
        if not self.client:
            return
        for chunk, emb in zip(chunks, embeddings):
            doc = {
                "vector": emb,
                "text": chunk["text"],
                "doc_id": chunk["doc_id"],
                "doc_name": chunk["doc_name"],
                "page_number": chunk["page_number"],
                "metadata": chunk.get("metadata", {})
            }
            self.client.index(index=self.index_name, id=chunk["id"], body=doc)

    def search(self, query_embedding: List[float], top_k: int = 4, threshold: float = 0.0) -> List[Dict[str, Any]]:
        if not self.client:
            return []
        query = {
            "size": top_k,
            "query": {
                "knn": {
                    "vector": {
                        "vector": query_embedding,
                        "k": top_k
                    }
                }
            }
        }
        res = self.client.search(index=self.index_name, body=query)
        hits = res.get("hits", {}).get("hits", [])
        results = []
        for hit in hits:
            score = hit.get("_score", 0.0)
            src = hit.get("_source", {})
            results.append({
                "id": hit.get("_id"),
                "doc_id": src.get("doc_id"),
                "doc_name": src.get("doc_name"),
                "page_number": src.get("page_number"),
                "text": src.get("text"),
                "score": round(score, 4),
                "metadata": src.get("metadata", {})
            })
        return results

    def get_stats(self) -> Dict[str, Any]:
        return {
            "engine": "Amazon OpenSearch Serverless (Vector Engine)",
            "endpoint": self.endpoint,
            "index": self.index_name,
            "status": "connected" if self.client else "disconnected"
        }

# Factory instance selector
_local_store = LocalVectorStore(settings.LOCAL_STORAGE_DIR)
_aoss_store = None

if settings.RUN_MODE == "aws" and settings.OPENSEARCH_ENDPOINT:
    try:
        _aoss_store = OpenSearchVectorStore(
            settings.OPENSEARCH_ENDPOINT,
            settings.OPENSEARCH_INDEX_NAME,
            settings.AWS_REGION
        )
    except Exception as e:
        print(f"[VectorStoreFactory] OpenSearch init failed: {e}")

def get_vector_store():
    if settings.RUN_MODE == "aws" and _aoss_store and _aoss_store.client:
        return _aoss_store
    return _local_store
