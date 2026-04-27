"""Shared embedding utility — thin wrapper so the RAG techniques stay provider-agnostic."""


import os
from functools import lru_cache

from .logger import get_logger

_log = get_logger("rag.embeddings")
_PROVIDER = os.getenv("EMBEDDING_PROVIDER", "openai")


def embed(texts: list[str]) -> list[list[float]]:
    """Return a list of embedding vectors for the given texts."""
    _log.debug("embed", provider=_PROVIDER, batch_size=len(texts))
    if _PROVIDER == "openai":
        return _openai_embed(texts)
    return _local_embed(texts)


def embed_one(text: str) -> list[float]:
    return embed([text])[0]


def _openai_embed(texts: list[str]) -> list[list[float]]:
    from openai import OpenAI
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    resp = client.embeddings.create(
        model="text-embedding-3-small",
        input=texts,
    )
    _log.debug("openai_embed_ok", count=len(resp.data), model="text-embedding-3-small")
    return [d.embedding for d in resp.data]


def _local_embed(texts: list[str]) -> list[list[float]]:
    """Fallback: simple TF-IDF-style bag-of-words vectors (no external dependency)."""
    import math
    all_words: list[set[str]] = [set(t.lower().split()) for t in texts]
    vocab = sorted({w for ws in all_words for w in ws})
    word_idx = {w: i for i, w in enumerate(vocab)}
    vecs: list[list[float]] = []
    for ws in all_words:
        v = [0.0] * len(vocab)
        for w in ws:
            v[word_idx[w]] += 1.0
        norm = math.sqrt(sum(x * x for x in v)) or 1.0
        vecs.append([x / norm for x in v])
    return vecs


@lru_cache(maxsize=2048)
def embed_cached(text: str) -> tuple[float, ...]:
    return tuple(embed_one(text))
