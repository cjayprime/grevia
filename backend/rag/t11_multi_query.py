"""Technique 11 — Multi-query decomposition.

Complex ESG questions often span multiple sub-topics (e.g. "What are our
Scope 3 gaps and which policies address them?"). This technique breaks the
query into independent sub-queries, retrieves separately, and deduplicates.
"""


import json

from helpers import chat
from .types import Chunk
from .t03_hybrid_retrieval import hybrid_retrieve
from .logger import get_logger, log_phase

_log = get_logger("rag.t11_multi_query")

_DECOMPOSE_SYSTEM = """\
You are an ESG research planner. Break the user question into 2-4 \
independent sub-questions that together fully answer it. \
Output ONLY a JSON array of strings."""


def _decompose(query: str) -> list[str]:
    try:
        raw = chat(
            system=_DECOMPOSE_SYSTEM,
            messages=[{"role": "user", "content": query}],
            max_tokens=200,
        )
        parts: list[str] = json.loads(raw)
        result = [query] + [p for p in parts if isinstance(p, str)][:3]
        _log.debug("query_decomposed", sub_query_count=len(result))
        return result
    except Exception:
        _log.warning("decompose_failed_fallback_to_original")
        return [query]


def multi_query_retrieve(query: str, chunks: list[Chunk], top_k: int = 8) -> list[Chunk]:
    with log_phase(_log, "multi_query_retrieve", corpus_size=len(chunks), top_k=top_k) as bag:
        sub_queries = _decompose(query)
        bag["sub_queries"] = len(sub_queries)
        seen: dict[str, Chunk] = {}
        for q in sub_queries:
            for c in hybrid_retrieve(q, chunks, top_k=top_k):
                if c.source not in seen or c.score > seen[c.source].score:
                    seen[c.source] = c
        result = sorted(seen.values(), key=lambda c: c.score, reverse=True)[:top_k]
        bag["unique_sources"] = len(seen)
        bag["result_count"] = len(result)
    return result
