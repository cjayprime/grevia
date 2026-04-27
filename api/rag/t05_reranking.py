"""Technique 05 — LLM cross-encoder reranking.

Takes a candidate pool from a fast retriever and reranks with a focused
LLM relevance score — effective for nuanced ESG regulatory questions.
"""


from helpers import chat
from .types import Chunk
from .logger import get_logger, log_phase

_log = get_logger("rag.t05_reranking")

_RERANK_SYSTEM = """\
You are an ESG relevance judge. Rate how relevant the passage is to the \
question on a scale of 0-10. Respond with ONLY the integer score."""


def _score(query: str, chunk: Chunk) -> float:
    try:
        raw = chat(
            system=_RERANK_SYSTEM,
            messages=[{"role": "user", "content": f"Question: {query}\n\nPassage: {chunk.text[:600]}"}],
            max_tokens=8,
        )
        return float(raw.strip())
    except Exception:
        _log.warning("rerank_score_failed", source=chunk.source)
        return chunk.score * 10


def rerank(query: str, chunks: list[Chunk], top_k: int = 8) -> list[Chunk]:
    with log_phase(_log, "rerank", candidate_count=len(chunks), top_k=top_k) as bag:
        scored = [
            Chunk(text=c.text, source=c.source, score=_score(query, c), metadata=c.metadata)
            for c in chunks
        ]
        scored.sort(key=lambda c: c.score, reverse=True)
        result = scored[:top_k]
        bag["llm_calls"] = len(chunks)
        bag["top_score"] = result[0].score if result else 0
        bag["result_count"] = len(result)
    return result
