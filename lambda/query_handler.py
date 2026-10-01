"""
AWS Lambda Function: RAG Query Handler
Triggered by: Amazon API Gateway POST /query
Performs k-NN search against Amazon OpenSearch Serverless and generates grounded answer with Bedrock Claude 3.5.
"""
import os
import json
import time
import boto3
from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth

REGION = os.environ.get("AWS_REGION", "us-east-1")
AOSS_ENDPOINT = os.environ.get("OPENSEARCH_ENDPOINT", "").replace("https://", "").rstrip("/")
INDEX_NAME = os.environ.get("OPENSEARCH_INDEX_NAME", "documind-vectors")
EMBEDDING_MODEL_ID = os.environ.get("BEDROCK_EMBEDDING_MODEL_ID", "amazon.titan-embed-text-v2:0")
LLM_MODEL_ID = os.environ.get("BEDROCK_LLM_MODEL_ID", "anthropic.claude-3-5-sonnet-20240620-v1:0")

bedrock_client = boto3.client("bedrock-runtime", region_name=REGION)

# OpenSearch client with SigV4
credentials = boto3.Session().get_credentials()
auth = AWSV4SignerAuth(credentials, REGION, "aoss")
aoss_client = OpenSearch(
    hosts=[{"host": AOSS_ENDPOINT, "port": 443}],
    http_auth=auth,
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection
)

def handler(event, context):
    start_time = time.time()
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "OPTIONS,POST"
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    body = {}
    if "body" in event:
        body = json.loads(event["body"]) if isinstance(event["body"], str) else event["body"]

    query = body.get("query", "").strip()
    top_k = body.get("top_k", 4)
    model_id = body.get("model_id", LLM_MODEL_ID)

    if not query:
        return {
            "statusCode": 400,
            "headers": headers,
            "body": json.dumps({"error": "Query parameter is required"})
        }

    # 1. Embed query with Bedrock Titan
    embed_payload = {"inputText": query, "dimensions": 512, "normalize": True}
    embed_res = bedrock_client.invoke_model(
        modelId=EMBEDDING_MODEL_ID,
        contentType="application/json",
        accept="application/json",
        body=json.dumps(embed_payload)
    )
    query_vector = json.loads(embed_res["body"].read().decode("utf-8"))["embedding"]

    # 2. Query OpenSearch Serverless
    knn_search = {
        "size": top_k,
        "query": {
            "knn": {
                "vector": {
                    "vector": query_vector,
                    "k": top_k
                }
            }
        }
    }
    search_res = aoss_client.search(index=INDEX_NAME, body=knn_search)
    hits = search_res.get("hits", {}).get("hits", [])

    if not hits:
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({
                "answer": "No relevant documents found matching your query.",
                "citations": [],
                "latency_ms": int((time.time() - start_time) * 1000)
            })
        }

    # Format context and citations
    context_chunks = []
    citations = []
    for h in hits:
        src = h.get("_source", {})
        score = h.get("_score", 0.0)
        c_id = h.get("_id")
        context_chunks.append(
            f"--- [SOURCE ID: {c_id} | DOC: {src.get('doc_name')} | PAGE: {src.get('page_number')}] ---\n{src.get('text')}"
        )
        citations.append({
            "chunk_id": c_id,
            "doc_name": src.get("doc_name"),
            "page_number": src.get("page_number"),
            "score": round(score, 4),
            "preview": src.get("text", "")[:120] + "...",
            "full_text": src.get("text", "")
        })

    # 3. Call Claude 3.5 on Bedrock
    system_prompt = (
        "You are DocuMind AI, an enterprise RAG assistant deployed on AWS. "
        "Answer the user query strictly using the provided context chunks. "
        "Always cite source chunks inline as [Chunk: <chunk_id>, Page: <page_number>]. "
        "If the answer is absent from the context, state that explicitly without fabricating."
    )
    user_prompt = f"Context:\n{'\n\n'.join(context_chunks)}\n\nQuery: {query}\n\nAnswer:"

    claude_payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1024,
        "system": system_prompt,
        "messages": [{"role": "user", "content": user_prompt}],
        "temperature": 0.2
    }

    llm_res = bedrock_client.invoke_model(
        modelId=model_id,
        contentType="application/json",
        accept="application/json",
        body=json.dumps(claude_payload)
    )
    llm_data = json.loads(llm_res["body"].read().decode("utf-8"))
    answer = llm_data["content"][0]["text"]
    usage = llm_data.get("usage", {})

    total_latency_ms = int((time.time() - start_time) * 1000)

    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps({
            "answer": answer,
            "citations": citations,
            "model_used": model_id,
            "latency_ms": total_latency_ms,
            "tokens_used": {
                "prompt": usage.get("input_tokens", 0),
                "completion": usage.get("output_tokens", 0),
                "total": usage.get("input_tokens", 0) + usage.get("output_tokens", 0)
            }
        })
    }
