"""Technique 10 — HyDE (Hypothetical Document Embeddings).

Instead of embedding the raw query, the LLM first generates a hypothetical
answer and that hypothetical text is embedded — bridging the query-document
vocabulary gap common in regulatory ESG retrieval.
"""


from helpers import chat
from .types import Chunk
from .t01_dense_retrieval import dense_retrieve
from .logger import get_logger, log_phase

_log = get_logger("rag.t10_hyde")

_HYDE_SYSTEM = """\
You are an ESG expert. Write a concise, factual 3-sentence passage that \
directly answers the following question. Use specific ESG terminology, \
regulatory references, and numeric estimates where plausible."""


def _hypothetical_doc(query: str) -> str:
    try:
        result = chat(
            system=_HYDE_SYSTEM,
            messages=[{"role": "user", "content": query}],
            max_tokens=200,
        ).strip()
        _log.debug("hypothetical_doc_generated", length=len(result))
        return result
    except Exception:
        _log.warning("hyde_llm_failed_fallback_to_original")
        return query


def hyde_retrieve(query: str, chunks: list[Chunk], top_k: int = 8) -> list[Chunk]:
    with log_phase(_log, "hyde_retrieve", corpus_size=len(chunks), top_k=top_k) as bag:
        hypo = _hypothetical_doc(query)
        bag["hypo_length"] = len(hypo)
        result = dense_retrieve(hypo, chunks, top_k=top_k)
        bag["result_count"] = len(result)
    return result
