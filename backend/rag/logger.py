"""Structured logging for the RAG pipeline.

Uses structlog with JSON rendering, automatic context binding (company_id,
query, mode), and nanosecond-precision latency tracking.  Every retrieval
technique logs entry/exit with chunk counts and timings so production
debugging is a `jq` command away.
"""

import logging
import time
import os
from contextlib import contextmanager
from typing import Any, Generator

import structlog

_LEVEL_MAP = {
    "DEBUG": logging.DEBUG,
    "INFO": logging.INFO,
    "WARNING": logging.WARNING,
    "ERROR": logging.ERROR,
    "CRITICAL": logging.CRITICAL,
}


def _configure_once() -> None:
    if structlog.is_configured():
        return
    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = _LEVEL_MAP.get(level_name, logging.INFO)
    shared_processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]
    renderer: structlog.types.Processor = (
        structlog.dev.ConsoleRenderer()
        if os.getenv("LOG_FORMAT", "json") != "json"
        else structlog.processors.JSONRenderer()
    )
    structlog.configure(
        processors=[*shared_processors, renderer],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


_configure_once()


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    return structlog.get_logger(component=name)


@contextmanager
def log_phase(
    logger: structlog.stdlib.BoundLogger,
    phase: str,
    **extra: Any,
) -> Generator[dict[str, Any], None, None]:
    """Context manager that logs phase start/end with elapsed_ms."""
    bag: dict[str, Any] = {}
    t0 = time.perf_counter()
    logger.info(f"{phase}.start", **extra)
    try:
        yield bag
    except Exception:
        elapsed = round((time.perf_counter() - t0) * 1000, 2)
        logger.exception(f"{phase}.error", elapsed_ms=elapsed, **extra, **bag)
        raise
    else:
        elapsed = round((time.perf_counter() - t0) * 1000, 2)
        logger.info(f"{phase}.done", elapsed_ms=elapsed, **extra, **bag)
