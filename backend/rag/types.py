from dataclasses import dataclass, field
from typing import Any


@dataclass
class Chunk:
    text: str
    source: str
    score: float = 0.0
    metadata: dict[str, Any] = field(default_factory=dict)
