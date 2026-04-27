"""Technique 06 — Metadata pre-filtering.

Narrows the candidate corpus by structured metadata (source type, scope,
ESRS pillar) before any embedding comparison — dramatically improves
precision for data-type-specific questions.
"""


import re

from .types import Chunk
from .t01_dense_retrieval import dense_retrieve
from .logger import get_logger, log_phase

_log = get_logger("rag.t06_metadata_filter")

_SCOPE_RE = re.compile(r"\bscope\s*([123])\b", re.IGNORECASE)
_ESRS_PILLAR_RE = re.compile(r"\bESRS\s+([ESG])", re.IGNORECASE)
_DOC_TYPE_KEYWORDS = {
    "emission": ["emission", "scope", "tco2", "ghg", "carbon"],
    "policy": ["policy", "mdr-p", "mdr-a", "action", "governance"],
    "materiality": ["material", "topic", "impact", "financial risk"],
    "document": ["report", "document", "file", "uploaded"],
}


def _detect_filters(query: str) -> dict:
    filters: dict = {}
    m = _SCOPE_RE.search(query)
    if m:
        filters["scope"] = int(m.group(1))
    m2 = _ESRS_PILLAR_RE.search(query)
    if m2:
        filters["esrs_pillar"] = m2.group(1).upper()
    ql = query.lower()
    for dtype, kws in _DOC_TYPE_KEYWORDS.items():
        if any(kw in ql for kw in kws):
            filters["type"] = dtype
            break
    return filters


def _matches(chunk: Chunk, filters: dict) -> bool:
    if "scope" in filters and chunk.metadata.get("scope") != filters["scope"]:
        return False
    if "type" in filters and chunk.metadata.get("type") != filters["type"]:
        return False
    return True


def metadata_filtered_retrieve(query: str, chunks: list[Chunk], top_k: int = 8) -> list[Chunk]:
    with log_phase(_log, "metadata_filter", corpus_size=len(chunks), top_k=top_k) as bag:
        filters = _detect_filters(query)
        bag["detected_filters"] = filters or "none"
        filtered = [c for c in chunks if _matches(c, filters)] if filters else chunks
        if not filtered:
            _log.debug("metadata_filter.no_match_fallback_to_full_corpus")
            filtered = chunks
        bag["post_filter"] = len(filtered)
        result = dense_retrieve(query, filtered, top_k=top_k)
        bag["result_count"] = len(result)
    return result
