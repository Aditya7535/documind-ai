"""
AWS Lambda Function: Document Ingestion Pipeline
Triggered by: Amazon S3 (s3:ObjectCreated:*) or API Gateway POST /upload
Processes document, generates Bedrock Titan embeddings, and indexes into Amazon OpenSearch Serverless.
"""
import os
import json
import urllib.parse
import boto3
from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth
from pypdf import PdfReader
import io

REGION = os.environ.get("AWS_REGION", "us-east-1")
AOSS_ENDPOINT = os.environ.get("OPENSEARCH_ENDPOINT", "").replace("https://", "").rstrip("/")
INDEX_NAME = os.environ.get("OPENSEARCH_INDEX_NAME", "documind-vectors")
EMBEDDING_MODEL_ID = os.environ.get("BEDROCK_EMBEDDING_MODEL_ID", "amazon.titan-embed-text-v2:0")

s3_client = boto3.client("s3", region_name=REGION)
bedrock_client = boto3.client("bedrock-runtime", region_name=REGION)

# Setup OpenSearch client with SigV4 auth
credentials = boto3.Session().get_credentials()
auth = AWSV4SignerAuth(credentials, REGION, "aoss")
aoss_client = OpenSearch(
    hosts=[{"host": AOSS_ENDPOINT, "port": 443}],
    http_auth=auth,
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection
)

def get_titan_embedding(text: str) -> list:
    payload = {
        "inputText": text,
        "dimensions": 512,
        "normalize": True
    }
    response = bedrock_client.invoke_model(
        modelId=EMBEDDING_MODEL_ID,
        contentType="application/json",
        accept="application/json",
        body=json.dumps(payload)
    )
    res_body = json.loads(response["body"].read().decode("utf-8"))
    return res_body["embedding"]

def handler(event, context):
    print("Received event:", json.dumps(event))

    # Check if triggered by S3 Event
    records = event.get("Records", [])
    if records and "s3" in records[0]:
        bucket = records[0]["s3"]["bucket"]["name"]
        key = urllib.parse.unquote_plus(records[0]["s3"]["object"]["key"])
        doc_name = key.split("/")[-1]
        doc_id = f"doc_{key.split('/')[-1]}"

        # Download from S3
        response = s3_client.get_object(Bucket=bucket, Key=key)
        file_bytes = response["Body"].read()

        pages_text = []
        if key.lower().endswith(".pdf"):
            reader = PdfReader(io.BytesIO(file_bytes))
            for idx, p in enumerate(reader.pages):
                txt = p.extract_text() or ""
                if txt.strip():
                    pages_text.append({"page": idx + 1, "text": txt})
        else:
            pages_text.append({"page": 1, "text": file_bytes.decode("utf-8", errors="ignore")})

        indexed_chunks = 0
        chunk_counter = 0

        for p_info in pages_text:
            page_num = p_info["page"]
            text = p_info["text"]
            # Basic chunk split
            words = text.split()
            chunk_size_words = 120
            overlap_words = 20

            for i in range(0, len(words), chunk_size_words - overlap_words):
                chunk_slice = " ".join(words[i:i + chunk_size_words])
                if len(chunk_slice.strip()) < 30:
                    continue

                emb = get_titan_embedding(chunk_slice)
                chunk_id = f"{doc_id}_p{page_num}_c{chunk_counter}"

                doc_body = {
                    "vector": emb,
                    "text": chunk_slice,
                    "doc_id": doc_id,
                    "doc_name": doc_name,
                    "page_number": page_num,
                    "metadata": {
                        "s3_bucket": bucket,
                        "s3_key": key
                    }
                }
                aoss_client.index(index=INDEX_NAME, id=chunk_id, body=doc_body)
                chunk_counter += 1
                indexed_chunks += 1

        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": f"Successfully ingested {doc_name}",
                "indexed_chunks": indexed_chunks
            })
        }

    return {"statusCode": 400, "body": json.dumps({"error": "Unknown event type"})}
