"""Technique 01 — Dense (embedding) retrieval.

Encodes the query and all corpus chunks into dense vectors and returns
the top-k chunks by cosine similarity.
"""

import math

from .types import Chunk
from .embeddings import embed_one, embed
from .logger import get_logger, log_phase

_log = get_logger("rag.t01_dense")


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1e-9
    nb = math.sqrt(sum(x * x for x in b)) or 1e-9
    return dot / (na * nb)


def dense_retrieve(query: str, chunks: list[Chunk], top_k: int = 8) -> list[Chunk]:
    if not chunks:
        return []
    with log_phase(_log, "dense_retrieve", corpus_size=len(chunks), top_k=top_k) as bag:
        q_vec = embed_one(query)
        texts = [c.text for c in chunks]
        vecs = embed(texts)
        scored = [
            Chunk(
                text=c.text,
                source=c.source,
                score=cosine(q_vec, v),
                metadata=c.metadata,
            )
            for c, v in zip(chunks, vecs)
        ]
        scored.sort(key=lambda x: x.score, reverse=True)
        result = scored[:top_k]
        bag["top_score"] = round(result[0].score, 4) if result else 0
        bag["result_count"] = len(result)
    return result
