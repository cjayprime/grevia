"""Technique 03 — Hybrid retrieval (dense + BM25, RRF fusion).

Combines dense embedding similarity with BM25 sparse retrieval using
Reciprocal Rank Fusion so neither signal is lost.
"""


from .types import Chunk
from .t01_dense_retrieval import dense_retrieve
from .t02_bm25_retrieval import bm25_retrieve
from .logger import get_logger, log_phase

_log = get_logger("rag.t03_hybrid")


def _rrf(ranked_lists: list[list[Chunk]], k: int = 60) -> list[Chunk]:
    scores: dict[str, float] = {}
    by_source: dict[str, Chunk] = {}
    for ranked in ranked_lists:
        for rank, chunk in enumerate(ranked):
            scores[chunk.source] = scores.get(chunk.source, 0.0) + 1.0 / (k + rank + 1)
            by_source[chunk.source] = chunk
    merged = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return [
        Chunk(text=by_source[s].text, source=s, score=sc, metadata=by_source[s].metadata)
        for s, sc in merged
    ]


def hybrid_retrieve(query: str, chunks: list[Chunk], top_k: int = 8) -> list[Chunk]:
    with log_phase(_log, "hybrid_retrieve", corpus_size=len(chunks), top_k=top_k) as bag:
        dense = dense_retrieve(query, chunks, top_k=top_k * 2)
        sparse = bm25_retrieve(query, chunks, top_k=top_k * 2)
        fused = _rrf([dense, sparse])
        result = fused[:top_k]
        bag["dense_count"] = len(dense)
        bag["sparse_count"] = len(sparse)
        bag["fused_count"] = len(fused)
        bag["result_count"] = len(result)
    return result
