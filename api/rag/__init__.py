"""RAG entry point — single public function ``retrieve()``.

Pipeline (default mode "balanced"):
  1. Build corpus from DB (documents, emissions, policies, materiality)
  2. Metadata pre-filter  (t06)  — narrows candidates by detected scope/type
  3. Hybrid retrieval     (t03)  — dense + BM25 + RRF over filtered set
  4. MMR diversification  (t07)  — ensure coverage across topic types
  5. Contextual compression (t08) — strip irrelevant sentences

Advanced modes swap step 3 for a more powerful technique:
  "hyde"       — hypothetical document embeddings  (t10)
  "fusion"     — RAG Fusion multi-variant          (t12)
  "self_rag"   — retrieve-then-reflect             (t13)
  "multi"      — multi-query decomposition         (t11)
  "rerank"     — hybrid + LLM cross-encoder rerank (t05)
"""


import structlog

from .corpus import build_corpus
from .logger import get_logger, log_phase
from .types import Chunk
from .t03_hybrid_retrieval import hybrid_retrieve
from .t05_reranking import rerank
from .t06_metadata_filtering import metadata_filtered_retrieve
from .t07_mmr import mmr_retrieve
from .t08_contextual_compression import contextual_compression_retrieve
from .t10_hyde import hyde_retrieve
from .t11_multi_query import multi_query_retrieve
from .t12_rag_fusion import rag_fusion_retrieve
from .t13_self_rag import self_rag_retrieve

_log = get_logger("rag.pipeline")

# corpus cache: company_id → chunks (refreshed per request for freshness)
_corpus_cache: dict[int, list[Chunk]] = {}


async def retrieve(
    query: str,
    company_id: int,
    top_k: int = 8,
    mode: str = "balanced",
    compress: bool = True,
) -> list[dict]:
    """Retrieve the most relevant chunks for *query* from company *company_id*.

    Returns a list of dicts with keys: ``text``, ``source``, ``score``.
    """
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(company_id=company_id, mode=mode, top_k=top_k)

    with log_phase(_log, "retrieve", query_len=len(query)) as bag:
        corpus = await build_corpus(company_id)
        bag["corpus_size"] = len(corpus)

        pre_filtered = metadata_filtered_retrieve(query, corpus, top_k=min(top_k * 4, 60))
        bag["pre_filtered"] = len(pre_filtered)

        if mode == "hyde":
            candidates = hyde_retrieve(query, pre_filtered, top_k=top_k * 2)
        elif mode == "fusion":
            candidates = rag_fusion_retrieve(query, pre_filtered, top_k=top_k * 2)
        elif mode == "self_rag":
            candidates = self_rag_retrieve(query, pre_filtered, top_k=top_k * 2)
        elif mode == "multi":
            candidates = multi_query_retrieve(query, pre_filtered, top_k=top_k * 2)
        elif mode == "rerank":
            initial = hybrid_retrieve(query, pre_filtered, top_k=top_k * 3)
            candidates = rerank(query, initial, top_k=top_k * 2)
        else:
            candidates = hybrid_retrieve(query, pre_filtered, top_k=top_k * 2)
        bag["candidates"] = len(candidates)

        diverse = mmr_retrieve(query, candidates, top_k=top_k)
        bag["post_mmr"] = len(diverse)

        if compress:
            diverse = contextual_compression_retrieve(query, diverse, top_k=top_k)
            bag["post_compress"] = len(diverse)

        results = [{"text": c.text, "source": c.source, "score": round(c.score, 4)} for c in diverse]
        bag["result_count"] = len(results)

    return results


from .guardrails import GuardrailError, input_guardrail, output_guardrail, JudgeVerdict, llm_judge

__all__ = ["retrieve", "GuardrailError", "input_guardrail", "output_guardrail", "JudgeVerdict", "llm_judge"]
