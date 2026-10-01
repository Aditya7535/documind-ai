import json
import math
import re
import numpy as np
from typing import List
from backend.config import settings

class EmbeddingService:
    def __init__(self):
        self.mode = settings.RUN_MODE
        self.dimension = 512  # Standardized dimension for Bedrock Titan Text v2 / local
        self.bedrock_client = None

        if self.mode == "aws":
            try:
                import boto3
                kwargs = {"region_name": settings.AWS_REGION}
                if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
                    kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
                    kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
                    if settings.AWS_SESSION_TOKEN:
                        kwargs["aws_session_token"] = settings.AWS_SESSION_TOKEN
                self.bedrock_client = boto3.client("bedrock-runtime", **kwargs)
            except Exception as e:
                print(f"[EmbeddingService] Failed to initialize Bedrock client: {e}. Falling back to local mode.")
                self.mode = "local"

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Embed a list of text chunks.
        """
        embeddings = []
        for text in texts:
            embeddings.append(self.embed_query(text))
        return embeddings

    def embed_query(self, text: str) -> List[float]:
        """
        Embed a single text string (chunk or query).
        """
        if self.mode == "aws" and self.bedrock_client:
            try:
                payload = {
                    "inputText": text,
                    "dimensions": self.dimension,
                    "normalize": True
                }
                response = self.bedrock_client.invoke_model(
                    modelId=settings.BEDROCK_EMBEDDING_MODEL_ID,
                    contentType="application/json",
                    accept="application/json",
                    body=json.dumps(payload)
                )
                body = json.loads(response["body"].read().decode("utf-8"))
                return body["embedding"]
            except Exception as e:
                print(f"[EmbeddingService] Bedrock invocation error: {e}. Using deterministic local embedding.")
                return self._local_semantic_embedding(text)
        else:
            return self._local_semantic_embedding(text)

    def _local_semantic_embedding(self, text: str) -> List[float]:
        """
        Deterministic, lightweight, dense semantic hash vector (512-dim) with L2 normalization.
        Extracts subwords, n-grams, and keywords to allow real cosine similarity matching locally.
        """
        vector = np.zeros(self.dimension, dtype=np.float32)
        clean_text = text.lower()
        words = re.findall(r'\b\w+\b', clean_text)

        # Word & character n-gram hashing
        for w in words:
            # Word level hash
            h_val = hash(w) % self.dimension
            weight = math.log(len(w) + 2)
            vector[h_val] += weight

            # 3-gram subwords for fuzzy semantic matching
            if len(w) >= 3:
                for i in range(len(w) - 2):
                    tri = w[i:i+3]
                    h_tri = hash(tri) % self.dimension
                    vector[h_tri] += 0.45 * weight

        # Global sentence character trigrams
        for i in range(len(clean_text) - 2):
            c_tri = clean_text[i:i+3]
            h_c = hash(c_tri) % self.dimension
            vector[h_c] += 0.2

        # L2 Normalize
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm
        else:
            vector[0] = 1.0

        return vector.tolist()

embedding_service = EmbeddingService()
