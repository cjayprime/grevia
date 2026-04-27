"""Technique 02 — BM25 sparse retrieval.

Classic Okapi BM25 term-frequency ranking — excellent for exact keyword
matches such as regulation codes (ESRS E1-6, GRI 305-1) and company names.
"""


import math
from collections import Counter

from .types import Chunk
from .logger import get_logger, log_phase

_log = get_logger("rag.t02_bm25")


def _tokenize(text: str) -> list[str]:
    return text.lower().split()


def bm25_retrieve(query: str, chunks: list[Chunk], top_k: int = 8,
                  k1: float = 1.5, b: float = 0.75) -> list[Chunk]:
    if not chunks:
        return []
    with log_phase(_log, "bm25_retrieve", corpus_size=len(chunks), top_k=top_k) as bag:
        tokenized = [_tokenize(c.text) for c in chunks]
        avg_dl = sum(len(t) for t in tokenized) / len(tokenized)
        n = len(chunks)

        q_terms = _tokenize(query)
        df: dict[str, int] = Counter(
            term for doc_tokens in tokenized for term in set(doc_tokens)
        )

        scores: list[float] = []
        for doc_tokens in tokenized:
            tf_map = Counter(doc_tokens)
            dl = len(doc_tokens)
            score = 0.0
            for term in q_terms:
                tf = tf_map.get(term, 0)
                idf = math.log((n - df.get(term, 0) + 0.5) / (df.get(term, 0) + 0.5) + 1)
                score += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * dl / avg_dl))
            scores.append(score)

        ranked = sorted(zip(scores, chunks), key=lambda x: x[0], reverse=True)
        result = [
            Chunk(text=c.text, source=c.source, score=s, metadata=c.metadata)
            for s, c in ranked[:top_k]
        ]
        bag["top_score"] = round(result[0].score, 4) if result else 0
        bag["vocab_size"] = len(df)
        bag["result_count"] = len(result)
    return result
