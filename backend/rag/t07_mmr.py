"""Technique 07 — Maximal Marginal Relevance (MMR).

Balances relevance and diversity so the returned context window covers
multiple complementary angles rather than n near-duplicate chunks.
"""


import math

from .types import Chunk
from .embeddings import embed, embed_one
from .logger import get_logger, log_phase

_log = get_logger("rag.t07_mmr")


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1e-9
    nb = math.sqrt(sum(x * x for x in b)) or 1e-9
    return dot / (na * nb)


def mmr_retrieve(
    query: str,
    chunks: list[Chunk],
    top_k: int = 8,
    lambda_param: float = 0.6,
) -> list[Chunk]:
    if not chunks:
        return []
    with log_phase(_log, "mmr_retrieve", candidate_count=len(chunks), top_k=top_k, lambda_param=lambda_param) as bag:
        q_vec = embed_one(query)
        all_vecs = embed([c.text for c in chunks])
        q_sims = [_cosine(q_vec, v) for v in all_vecs]

        selected_indices: list[int] = []
        candidate_indices = list(range(len(chunks)))

        while len(selected_indices) < top_k and candidate_indices:
            if not selected_indices:
                best = max(candidate_indices, key=lambda i: q_sims[i])
            else:
                sel_vecs = [all_vecs[i] for i in selected_indices]
                best = max(
                    candidate_indices,
                    key=lambda i: (
                        lambda_param * q_sims[i]
                        - (1 - lambda_param) * max(_cosine(all_vecs[i], sv) for sv in sel_vecs)
                    ),
                )
            selected_indices.append(best)
            candidate_indices.remove(best)

        result = [
            Chunk(text=chunks[i].text, source=chunks[i].source,
                  score=q_sims[i], metadata=chunks[i].metadata)
            for i in selected_indices
        ]
        bag["result_count"] = len(result)
    return result
