"""Technique 04 — Query expansion via LLM synonym generation.

Before retrieval, the query is expanded with domain synonyms and
regulatory aliases so narrow queries still match broad corpus chunks.
"""


from helpers import chat
from .types import Chunk
from .t03_hybrid_retrieval import hybrid_retrieve
from .logger import get_logger, log_phase

_log = get_logger("rag.t04_query_expansion")

_EXPAND_SYSTEM = """\
You are an ESG terminology expert. Given a user query, output 3-5 short \
alternative phrasings or synonyms that would help retrieve relevant ESG \
documents. Output ONLY a JSON array of strings. No explanation."""


def _expand_query(query: str) -> list[str]:
    try:
        import json
        raw = chat(
            system=_EXPAND_SYSTEM,
            messages=[{"role": "user", "content": query}],
            max_tokens=256,
        )
        extras: list[str] = json.loads(raw)
        expanded = [query] + [e for e in extras if isinstance(e, str)][:4]
        _log.debug("query_expanded", variant_count=len(expanded))
        return expanded
    except Exception:
        _log.warning("query_expansion_failed_fallback_to_original")
        return [query]


def query_expansion_retrieve(query: str, chunks: list[Chunk], top_k: int = 8) -> list[Chunk]:
    with log_phase(_log, "query_expansion_retrieve", corpus_size=len(chunks), top_k=top_k) as bag:
        expanded = _expand_query(query)
        bag["variants"] = len(expanded)
        seen: dict[str, Chunk] = {}
        for q in expanded:
            for chunk in hybrid_retrieve(q, chunks, top_k=top_k):
                if chunk.source not in seen:
                    seen[chunk.source] = chunk
        ranked = sorted(seen.values(), key=lambda c: c.score, reverse=True)
        result = ranked[:top_k]
        bag["unique_sources"] = len(seen)
        bag["result_count"] = len(result)
    return result
