"""Technique 09 — Step-back prompting.

When a query is very specific, a broader "step-back" question often retrieves
better background context. Both the original and the abstracted query are
run and results are merged.
"""


from helpers import chat
from .types import Chunk
from .t03_hybrid_retrieval import hybrid_retrieve
from .logger import get_logger, log_phase

_log = get_logger("rag.t09_step_back")

_STEPBACK_SYSTEM = """\
You are an ESG reasoning assistant. Given a specific question, produce ONE \
broader, more general version of it that would surface useful background \
context. Output only the rephrased question, nothing else."""


def _step_back(query: str) -> str:
    try:
        result = chat(
            system=_STEPBACK_SYSTEM,
            messages=[{"role": "user", "content": query}],
            max_tokens=80,
        ).strip()
        _log.debug("step_back_generated", abstract_query=result[:120])
        return result
    except Exception:
        _log.warning("step_back_llm_failed_fallback_to_original")
        return query


def step_back_retrieve(query: str, chunks: list[Chunk], top_k: int = 8) -> list[Chunk]:
    with log_phase(_log, "step_back_retrieve", corpus_size=len(chunks), top_k=top_k) as bag:
        abstract = _step_back(query)
        bag["abstracted"] = abstract != query
        specific_results = hybrid_retrieve(query, chunks, top_k=top_k)
        if abstract == query:
            bag["result_count"] = len(specific_results)
            return specific_results
        abstract_results = hybrid_retrieve(abstract, chunks, top_k=top_k // 2)
        seen: dict[str, Chunk] = {c.source: c for c in abstract_results}
        for c in specific_results:
            seen[c.source] = c
        result = sorted(seen.values(), key=lambda c: c.score, reverse=True)[:top_k]
        bag["specific_count"] = len(specific_results)
        bag["abstract_count"] = len(abstract_results)
        bag["merged_unique"] = len(seen)
        bag["result_count"] = len(result)
    return result
