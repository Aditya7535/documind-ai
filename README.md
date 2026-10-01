# DocuMind AI: Serverless Enterprise RAG Document Q&A Search Engine

[![AWS Bedrock](https://img.shields.io/badge/AWS-Bedrock%20Claude%203.5-orange?logo=amazon-aws)](https://aws.amazon.com/bedrock/)
[![OpenSearch Serverless](https://img.shields.io/badge/Amazon-OpenSearch%20Serverless-blue?logo=amazon-aws)](https://aws.amazon.com/opensearch-service/features/serverless/)
[![Docker](https://img.shields.io/badge/Docker-Nextcloud%20%2B%20FastAPI-2496ED?logo=docker)](https://www.docker.com/)
[![React 19](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react)](https://vitejs.dev/)

An enterprise-grade **Retrieval-Augmented Generation (RAG)** platform designed to ingest complex multi-page documents (PDFs, financial filings, technical whitepapers, SaaS MSAs) and deliver verifiable, grounded answers with exact source chunk and page citations.

---

## 🏗️ Architecture & Component Overview

```mermaid
graph TD
    User([End User / Browser]) <-->|HTTPS| WebApp[React + Vite Web Dashboard]
    WebApp <-->|REST API| APIGW[FastAPI / Amazon API Gateway]

    subgraph Storage & Ingestion
        Nextcloud[(Nextcloud Document Drive)] -.->|Docker WebDAV Sync| APIGW
        S3[(Amazon S3 Raw Storage)] -->|s3:ObjectCreated| IngestLambda[AWS Lambda Ingestion]
        APIGW -->|Upload PDF/TXT| IngestLambda
    end

    subgraph Vector Engine & AI Models
        IngestLambda -->|Text Chunks| BedrockEmbed[AWS Bedrock: Titan Embeddings v2]
        BedrockEmbed -->|512-dim Normalized Vectors| AOSS[(Amazon OpenSearch Serverless)]

        APIGW -->|Query Vector Search| AOSS
        AOSS -->|Top-K Context Chunks| APIGW
        APIGW -->|Augmented Prompt + Citations| BedrockLLM[AWS Bedrock: Claude 3.5 Sonnet / Llama 3]
    end
```

---

## 🚀 Key Features

1. **Enterprise Grounding & Anti-Hallucination**:
   - Every claim is anchored with a source citation `[Chunk: <id>, Page: <page>]`.
   - Context Chunk Inspector allows one-click auditing of the exact chunk text, cosine similarity %, and document origin.
2. **Dual-Mode Portability**:
   - **Local Dev / Simulation Mode**: Instant testing with zero AWS cost or credentials using built-in deterministic semantic vector hashing and local synthesis.
   - **AWS Cloud Live Mode**: Seamless switch to AWS Bedrock (`amazon.titan-embed-text-v2:0` & `anthropic.claude-3-5-sonnet-20240620-v1:0`), Amazon OpenSearch Serverless, and Amazon S3.
3. **Docker & Nextcloud Private Cloud Integration**:
   - Runs self-hosted **Nextcloud** alongside **MariaDB**, **FastAPI Backend**, and **React Frontend** using `docker-compose.yml`.
   - One-click Nextcloud sync pulls documents directly from private enterprise storage into the vector search engine.
4. **Infrastructure as Code (AWS CDK)**:
   - Complete TypeScript CDK stack in `infra/` provisioning S3 buckets, OpenSearch Serverless collection, IAM least-privilege roles, Lambda functions, and API Gateway.

---

## 🐳 Running with Docker & Nextcloud

To launch the complete containerized stack (Nextcloud storage + MariaDB + DocuMind RAG Backend + Frontend):

```bash
docker compose up -d
```

### Container Endpoints:
- **DocuMind Web Dashboard**: [http://localhost:5173](http://localhost:5173)
- **RAG FastAPI Backend & Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Nextcloud Document Repository**: [http://localhost:8080](http://localhost:8080)
  - Default User: `admin`
  - Default Password: `admin123`

---

## 💻 Running Locally (Without Docker)

### 1. Start Backend API Server
```bash
# Activate virtual environment
.venv\Scripts\activate   # Windows
# or source .venv/bin/activate # Linux/macOS

# Launch FastAPI
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Start React Web Dashboard
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ☁️ Deploying to AWS (AWS CDK)

Ensure you have your AWS credentials configured (`aws configure`):

```bash
cd infra
npm install
npx cdk bootstrap
npx cdk deploy
```

This provisions:
- **Amazon S3**: `DocuMindDocumentBucket` with KMS encryption and event notifications.
- **Amazon OpenSearch Serverless**: `documind-vectors` vector collection with HNSW cosine similarity index.
- **AWS Lambda**: `DocuMindIngestFunction` and `DocuMindQueryFunction`.
- **Amazon API Gateway**: REST API with CORS and proxy routes.

---

## 📄 Preloaded Sample Documents
The application includes preloaded enterprise documents for immediate testing:
- **`aws_genai_rag_architecture.txt`**: Architectural breakdown of Bedrock Titan v2, chunking, and OpenSearch Serverless.
- **`q4_enterprise_financial_report.txt`**: Meridian Cloud Technologies financial filings (revenue, EBITDA margin, AI CAPEX).
- **`saas_master_services_agreement.txt`**: SaaS contract with 99.95% SLA, service credits, and AI training exclusion terms.

Click **Load Samples** in the top navigation bar to index them instantly!
