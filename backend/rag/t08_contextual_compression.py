"""Technique 08 — Contextual compression.

Retrieved chunks are often long and only partially relevant. This technique
uses the LLM to extract only the sentence(s) from each chunk that directly
answer the query — shrinking the context window for better LLM focus.
"""


from helpers import chat
from .types import Chunk
from .logger import get_logger, log_phase

_log = get_logger("rag.t08_compression")

_COMPRESS_SYSTEM = """\
Given a question and a passage, extract ONLY the sentences from the passage \
that are directly relevant to answering the question. \
Return the extracted sentences verbatim. If nothing is relevant, respond with \
an empty string."""


def compress_chunk(query: str, chunk: Chunk) -> Chunk:
    try:
        compressed = chat(
            system=_COMPRESS_SYSTEM,
            messages=[{"role": "user", "content": f"Question: {query}\n\nPassage: {chunk.text}"}],
            max_tokens=512,
        ).strip()
        if not compressed:
            return chunk
        return Chunk(text=compressed, source=chunk.source, score=chunk.score, metadata=chunk.metadata)
    except Exception:
        _log.warning("compress_chunk_failed", source=chunk.source)
        return chunk


def contextual_compression_retrieve(
    query: str,
    chunks: list[Chunk],
    top_k: int = 8,
) -> list[Chunk]:
    with log_phase(_log, "contextual_compression", input_count=min(len(chunks), top_k)) as bag:
        compressed = [compress_chunk(query, c) for c in chunks[:top_k]]
        result = [c for c in compressed if c.text.strip()]
        bag["llm_calls"] = min(len(chunks), top_k)
        bag["result_count"] = len(result)
        bag["dropped"] = min(len(chunks), top_k) - len(result)
    return result
