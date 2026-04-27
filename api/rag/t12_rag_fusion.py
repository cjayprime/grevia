"""Technique 12 — RAG Fusion.

Generates multiple query variants, retrieves for each, then applies
Reciprocal Rank Fusion across all result lists. Combines the benefits of
multi-query and hybrid retrieval into a single robust pipeline.
"""


import json

from helpers import chat
from .types import Chunk
from .t01_dense_retrieval import dense_retrieve
from .t02_bm25_retrieval import bm25_retrieve
from .logger import get_logger, log_phase

_log = get_logger("rag.t12_rag_fusion")

_VARIANT_SYSTEM = """\
Generate 3 alternative phrasings of the following ESG question \
that would retrieve useful but potentially different passages. \
Respond with ONLY a JSON array of 3 strings."""


def _generate_variants(query: str) -> list[str]:
    try:
        raw = chat(
            system=_VARIANT_SYSTEM,
            messages=[{"role": "user", "content": query}],
            max_tokens=200,
        )
        variants: list[str] = json.loads(raw)
        result = [query] + [v for v in variants if isinstance(v, str)][:3]
        _log.debug("fusion_variants_generated", count=len(result))
        return result
    except Exception:
        _log.warning("fusion_variant_generation_failed_fallback_to_original")
        return [query]


def _rrf(lists: list[list[Chunk]], k: int = 60) -> list[Chunk]:
    scores: dict[str, float] = {}
    by_source: dict[str, Chunk] = {}
    for ranked in lists:
        for rank, chunk in enumerate(ranked):
            scores[chunk.source] = scores.get(chunk.source, 0.0) + 1.0 / (k + rank + 1)
            by_source[chunk.source] = chunk
    return [
        Chunk(text=by_source[s].text, source=s, score=sc, metadata=by_source[s].metadata)
        for s, sc in sorted(scores.items(), key=lambda x: x[1], reverse=True)
    ]


def rag_fusion_retrieve(query: str, chunks: list[Chunk], top_k: int = 8) -> list[Chunk]:
    with log_phase(_log, "rag_fusion_retrieve", corpus_size=len(chunks), top_k=top_k) as bag:
        variants = _generate_variants(query)
        bag["variants"] = len(variants)
        all_lists: list[list[Chunk]] = []
        for q in variants:
            all_lists.append(dense_retrieve(q, chunks, top_k=top_k))
            all_lists.append(bm25_retrieve(q, chunks, top_k=top_k))
        bag["retrieval_lists"] = len(all_lists)
        result = _rrf(all_lists)[:top_k]
        bag["result_count"] = len(result)
    return result
