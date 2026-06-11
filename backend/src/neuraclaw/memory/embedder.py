"""Local ONNX embeddings via fastembed. CPU-only, runs in a worker thread."""

import asyncio
import json
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from fastembed import TextEmbedding

MODEL_NAME = "BAAI/bge-small-en-v1.5"
DIM = 384

_model: "TextEmbedding | None" = None
_lock = asyncio.Lock()


def _get_model() -> "TextEmbedding":
    global _model
    if _model is None:
        from fastembed import TextEmbedding  # import is slow; defer until first use

        _model = TextEmbedding(model_name=MODEL_NAME)
    return _model


async def embed(texts: list[str]) -> list[list[float]]:
    """Embed texts off the event loop. First call downloads/loads the model."""
    async with _lock:  # fastembed model is not thread-safe; serialize access
        return await asyncio.to_thread(_embed_sync, texts)


def _embed_sync(texts: list[str]) -> list[list[float]]:
    return [vec.tolist() for vec in _get_model().embed(texts)]


def to_vec_json(vector: list[float]) -> str:
    """sqlite-vec accepts JSON text vectors."""
    return json.dumps(vector)
