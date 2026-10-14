import json
import time
import re
from typing import List, Dict, Any, Tuple
from backend.config import settings

class LLMService:
    def __init__(self):
        self.mode = settings.RUN_MODE
        self.bedrock_client = None

        if self.mode == "aws":
            try:
                import boto3
                kwargs = {"region_name": settings.AWS_REGION}
                if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
                    kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
                    kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
                self.bedrock_client = boto3.client("bedrock-runtime", **kwargs)
            except Exception as e:
                print(f"[LLMService] Could not initialize Bedrock client: {e}. Falling back to simulation.")
                self.mode = "local"

    def generate_rag_answer(
        self,
        query: str,
        retrieved_chunks: List[Dict[str, Any]],
        model_id: str = None
    ) -> Dict[str, Any]:
        """
        Generate answer conditioned on retrieved chunks.
        Returns answer, citations list, latency, and token estimates.
        """
        start_time = time.time()
        chosen_model = model_id or settings.BEDROCK_LLM_MODEL_ID

        if not retrieved_chunks:
            return {
                "answer": "No relevant documents or text chunks matched your query above the similarity threshold. Try adjusting the similarity threshold or uploading relevant documents.",
                "citations": [],
                "model_used": chosen_model,
                "latency_ms": int((time.time() - start_time) * 1000),
                "tokens_used": {"prompt": 50, "completion": 30, "total": 80},
                "status": "no_context"
            }

        # Build augmented context
        context_block = "\n\n".join([
            f"--- [SOURCE CHUNK ID: {c['id']} | DOC: {c['doc_name']} | PAGE: {c['page_number']} | SIMILARITY: {c.get('score', 0):.2f}] ---\n{c['text']}"
            for c in retrieved_chunks
        ])

        system_prompt = (
            "You are DocuMind AI, an enterprise RAG assistant deployed on AWS. "
            "Your task is to answer the user question strictly using the provided context chunks.\n"
            "Rules:\n"
            "1. Answer concisely, professionally, and accurately.\n"
            "2. Whenever stating a fact or claim, cite the source chunk inline as [Chunk: <chunk_id>, Page: <page_number>].\n"
            "3. If the context does not contain sufficient details to answer the question, state: 'The provided documents do not contain enough information to answer this question.'\n"
            "4. Do NOT hallucinate facts outside the context."
        )

        user_prompt = f"Context Documents:\n{context_block}\n\nQuestion: {query}\n\nAnswer:"

        if self.mode == "aws" and self.bedrock_client:
            try:
                answer, prompt_tokens, comp_tokens = self._invoke_bedrock(
                    chosen_model, system_prompt, user_prompt
                )
            except Exception as e:
                print(f"[LLMService] Bedrock generation failed: {e}. Using intelligent fallback.")
                answer, prompt_tokens, comp_tokens = self._simulate_rag_response(query, retrieved_chunks)
        else:
            answer, prompt_tokens, comp_tokens = self._simulate_rag_response(query, retrieved_chunks)

        # Extract citations referenced in answer or match to retrieved chunks
        import urllib.parse
        citations = []
        for c in retrieved_chunks:
            clean_name = urllib.parse.unquote(c["doc_name"])
            citations.append({
                "chunk_id": c["id"],
                "doc_name": clean_name,
                "page_number": c["page_number"],
                "score": c.get("score", 0.0),
                "preview": c["text"][:140] + ("..." if len(c["text"]) > 140 else ""),
                "full_text": c["text"]
            })

        latency_ms = int((time.time() - start_time) * 1000)

        return {
            "answer": answer,
            "citations": citations,
            "model_used": chosen_model,
            "latency_ms": latency_ms,
            "tokens_used": {
                "prompt": prompt_tokens,
                "completion": comp_tokens,
                "total": prompt_tokens + comp_tokens
            },
            "status": "success"
        }

    def _invoke_bedrock(self, model_id: str, system_prompt: str, user_prompt: str) -> Tuple[str, int, int]:
        """
        Call AWS Bedrock invoke_model for Claude 3 or other models.
        """
        if "anthropic.claude" in model_id:
            payload = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1024,
                "system": system_prompt,
                "messages": [
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.2
            }
            res = self.bedrock_client.invoke_model(
                modelId=model_id,
                contentType="application/json",
                accept="application/json",
                body=json.dumps(payload)
            )
            data = json.loads(res["body"].read().decode("utf-8"))
            answer = data["content"][0]["text"]
            usage = data.get("usage", {})
            return answer, usage.get("input_tokens", 250), usage.get("output_tokens", 150)
        else:
            # Fallback for Titan or other models
            payload = {
                "inputText": f"{system_prompt}\n\n{user_prompt}",
                "textGenerationConfig": {
                    "maxTokenCount": 512,
                    "temperature": 0.2
                }
            }
            res = self.bedrock_client.invoke_model(
                modelId=model_id,
                contentType="application/json",
                accept="application/json",
                body=json.dumps(payload)
            )
            data = json.loads(res["body"].read().decode("utf-8"))
            answer = data.get("results", [{}])[0].get("outputText", "")
            return answer, 300, 150

    def _simulate_rag_response(self, query: str, chunks: List[Dict[str, Any]]) -> Tuple[str, int, int]:
        """
        Intelligent local synthesis engine for zero-cloud offline demos.
        Pulls relevant statements from retrieved chunks, filters noise/TOC dots, and crafts a grounded summary.
        """
        q_words = set(re.findall(r'\b\w{3,}\b', query.lower()))
        candidate_items = []

        for c in chunks:
            raw_text = c.get("text", "")
            # Filter out table of contents dotted lines and page number leaders
            cleaned_text = re.sub(r'\.{3,}', ' ', raw_text)
            sentences = re.split(r'(?<=[.?!])\s+|\n{2,}', cleaned_text)
            for s in sentences:
                s_clean = re.sub(r'\s+', ' ', s).strip()
                # Skip table-of-content headers or tiny fragments
                if len(s_clean) > 35 and not re.match(r'^(table of contents|list of tables|list of figures|\d+\s+list of)', s_clean, re.IGNORECASE):
                    s_words = set(re.findall(r'\b\w{3,}\b', s_clean.lower()))
                    overlap = len(q_words.intersection(s_words))
                    candidate_items.append((overlap, s_clean, c))

        # Sort by relevance to query keywords, preserving chunk order as tie-breaker
        candidate_items.sort(key=lambda x: x[0], reverse=True)
        top_candidates = [item for item in candidate_items if item[0] > 0][:3]

        if not top_candidates and candidate_items:
            top_candidates = candidate_items[:2]

        if top_candidates:
            key_points = []
            for item in top_candidates:
                text_clean = item[1].strip()
                if not text_clean.endswith(('.', '!', '?')):
                    text_clean += '.'
                key_points.append(f"• {text_clean}")
            bullet_section = "\n".join(key_points)
            source_doc = top_candidates[0][2]['doc_name']
            source_page = top_candidates[0][2]['page_number']
        else:
            first_text = re.sub(r'\.{3,}', ' ', top_chunk.get("text", "")).strip()[:200]
            if not first_text.endswith(('.', '!', '?')):
                first_text += '.'
            bullet_section = f"• {first_text}"
            source_doc = top_chunk['doc_name']
            source_page = top_chunk['page_number']

        summary = (
            f"{bullet_section}\n\n"
            f"*(Source: **{source_doc}**, Page {source_page})*"
        )

        prompt_tokens = sum(len(c.get("text", "").split()) for c in chunks) + 40
        comp_tokens = len(summary.split())
        return summary, prompt_tokens, comp_tokens

llm_service = LLMService()
