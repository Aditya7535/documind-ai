import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    # App Mode: 'local' (offline dev/emulation) or 'aws' (live AWS Bedrock + OpenSearch + S3)
    RUN_MODE: str = os.getenv("RUN_MODE", "local")

    # AWS Configuration
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_SESSION_TOKEN: str = os.getenv("AWS_SESSION_TOKEN", "")

    # S3 Bucket
    S3_BUCKET_NAME: str = os.getenv("S3_BUCKET_NAME", "documind-rag-documents-bucket")

    # Amazon OpenSearch Serverless (AOSS) Vector Collection Endpoint
    OPENSEARCH_ENDPOINT: str = os.getenv("OPENSEARCH_ENDPOINT", "")
    OPENSEARCH_INDEX_NAME: str = os.getenv("OPENSEARCH_INDEX_NAME", "documind-vectors")

    # AWS Bedrock Model IDs
    BEDROCK_EMBEDDING_MODEL_ID: str = os.getenv(
        "BEDROCK_EMBEDDING_MODEL_ID", "amazon.titan-embed-text-v2:0"
    )
    BEDROCK_LLM_MODEL_ID: str = os.getenv(
        "BEDROCK_LLM_MODEL_ID", "anthropic.claude-3-5-sonnet-20240620-v1:0"
    )

    # RAG Tuning Parameters
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "800"))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "150"))
    DEFAULT_TOP_K: int = int(os.getenv("DEFAULT_TOP_K", "4"))
    SIMILARITY_THRESHOLD: float = float(os.getenv("SIMILARITY_THRESHOLD", "0.10"))

    # Local Storage Directory
    LOCAL_STORAGE_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage")

settings = Settings()
