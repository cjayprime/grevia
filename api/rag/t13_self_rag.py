"""Technique 13 — Self-RAG (retrieve-then-reflect).

After initial retrieval the LLM judges whether the retrieved context is
sufficient. If not, it formulates a follow-up retrieval query and tries
again (up to 2 iterations). Prevents confidently wrong answers when the
first retrieval misses critical data.
"""


from helpers import chat
from .types import Chunk
from .t03_hybrid_retrieval import hybrid_retrieve
from .logger import get_logger, log_phase

_log = get_logger("rag.t13_self_rag")

_REFLECT_SYSTEM = """\
You are an ESG retrieval quality judge. Given a question and retrieved passages, \
decide whether the passages contain enough information to answer the question.

Respond with JSON: {"sufficient": true} OR {"sufficient": false, "followup": "...better query..."}
No other text."""


def _reflect(query: str, chunks: list[Chunk]) -> tuple[bool, str]:
    context = "\n\n".join(f"[{c.source}] {c.text[:400]}" for c in chunks[:4])
    try:
        import json
        raw = chat(
            system=_REFLECT_SYSTEM,
            messages=[{"role": "user", "content": f"Question: {query}\n\nPassages:\n{context}"}],
            max_tokens=80,
        )
        result = json.loads(raw)
        if result.get("sufficient"):
            _log.debug("self_rag_reflection", sufficient=True)
            return True, query
        followup = result.get("followup", query)
        _log.debug("self_rag_reflection", sufficient=False, followup=followup[:120])
        return False, followup
    except Exception:
        _log.warning("self_rag_reflect_failed_assuming_sufficient")
        return True, query


def self_rag_retrieve(query: str, chunks: list[Chunk], top_k: int = 8) -> list[Chunk]:
    with log_phase(_log, "self_rag_retrieve", corpus_size=len(chunks), top_k=top_k) as bag:
        results = hybrid_retrieve(query, chunks, top_k=top_k)
        sufficient, followup = _reflect(query, results)
        bag["sufficient"] = sufficient
        if not sufficient and followup != query:
            extra = hybrid_retrieve(followup, chunks, top_k=top_k)
            seen: dict[str, Chunk] = {c.source: c for c in results}
            for c in extra:
                if c.source not in seen:
                    seen[c.source] = c
            results = sorted(seen.values(), key=lambda c: c.score, reverse=True)[:top_k]
            bag["followup_added"] = len(extra)
        bag["result_count"] = len(results)
    return results
