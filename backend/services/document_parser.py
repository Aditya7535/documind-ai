import io
import re
from typing import List, Dict, Any
from pypdf import PdfReader

class DocumentChunk(dict):
    id: str
    doc_id: str
    doc_name: str
    chunk_index: int
    page_number: int
    text: str
    metadata: Dict[str, Any]

class DocumentParser:
    @staticmethod
    def extract_text_from_pdf(file_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Extract text page-by-page from a PDF file buffer.
        Returns a list of dicts: [{"page": 1, "text": "..."}]
        """
        pages_content = []
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            for idx, page in enumerate(reader.pages):
                try:
                    text = page.extract_text() or ""
                except Exception as e:
                    print(f"[DocumentParser] Warning extracting text from PDF page {idx+1}: {e}")
                    text = ""
                # Clean up excessive whitespace
                text = re.sub(r'[ \t]+', ' ', text)
                text = re.sub(r'\n{3,}', '\n\n', text).strip()
                if text:
                    pages_content.append({"page": idx + 1, "text": text})
        except Exception as e:
            print(f"[DocumentParser] Error reading PDF: {e}")
        return pages_content

    @staticmethod
    def extract_text_from_plain(text_content: str) -> List[Dict[str, Any]]:
        """
        Extract text from raw text / markdown file.
        Treats every ~3000 chars or double formfeed as a logical page.
        """
        cleaned = re.sub(r'[ \t]+', ' ', text_content).strip()
        if not cleaned:
            return [{"page": 1, "text": "Empty document"}]
        # Partition into simulated pages if large
        page_size = 2500
        pages = []
        for i in range(0, max(len(cleaned), 1), page_size):
            chunk_slice = cleaned[i:i + page_size]
            pages.append({"page": (i // page_size) + 1, "text": chunk_slice})
        return pages

    @classmethod
    def chunk_document(
        cls,
        doc_id: str,
        doc_name: str,
        pages: List[Dict[str, Any]],
        chunk_size: int = 800,
        chunk_overlap: int = 150
    ) -> List[Dict[str, Any]]:
        """
        Recursively split document pages into overlapping text chunks with page tracking.
        """
        chunks = []
        chunk_counter = 0

        for page_info in pages:
            page_num = page_info["page"]
            text = page_info["text"]

            # Sub-split the page text into paragraphs or sentences
            separators = ["\n\n", "\n", ". ", " "]
            sub_chunks = cls._recursive_split(text, chunk_size, chunk_overlap, separators)

            for sub_text in sub_chunks:
                clean_chunk_text = sub_text.strip()
                if not clean_chunk_text:
                    continue

                chunk_id = f"{doc_id}_p{page_num}_c{chunk_counter}"
                chunks.append({
                    "id": chunk_id,
                    "doc_id": doc_id,
                    "doc_name": doc_name,
                    "chunk_index": chunk_counter,
                    "page_number": page_num,
                    "text": clean_chunk_text,
                    "metadata": {
                        "source": doc_name,
                        "page": page_num,
                        "char_count": len(clean_chunk_text)
                    }
                })
                chunk_counter += 1

        # Fallback if text was short or split resulted in no chunks
        if not chunks and pages:
            combined = " ".join(p.get("text", "").strip() for p in pages).strip()
            if not combined:
                combined = f"Document artifact: {doc_name}"
            chunks.append({
                "id": f"{doc_id}_p1_c0",
                "doc_id": doc_id,
                "doc_name": doc_name,
                "chunk_index": 0,
                "page_number": 1,
                "text": combined,
                "metadata": {
                    "source": doc_name,
                    "page": 1,
                    "char_count": len(combined)
                }
            })

        return chunks

    @classmethod
    def _recursive_split(
        cls,
        text: str,
        chunk_size: int,
        chunk_overlap: int,
        separators: List[str]
    ) -> List[str]:
        if len(text) <= chunk_size or not separators:
            return [text]

        sep = separators[0]
        splits = text.split(sep)
        chunks = []
        current_chunk = ""

        for part in splits:
            part_str = part + sep if sep != " " else part + " "
            if len(current_chunk) + len(part_str) <= chunk_size:
                current_chunk += part_str
            else:
                if current_chunk.strip():
                    chunks.append(current_chunk.strip())
                # If a single part exceeds chunk size, split with next granular separator
                if len(part_str) > chunk_size and len(separators) > 1:
                    deeper_chunks = cls._recursive_split(part, chunk_size, chunk_overlap, separators[1:])
                    chunks.extend(deeper_chunks)
                    current_chunk = ""
                else:
                    # Apply overlap from tail of previous chunk
                    overlap_seed = current_chunk[-chunk_overlap:] if len(current_chunk) > chunk_overlap else ""
                    current_chunk = overlap_seed + part_str

        if current_chunk.strip():
            chunks.append(current_chunk.strip())

        return chunks
