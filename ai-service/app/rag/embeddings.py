from __future__ import annotations

import logging
import os
import threading
from typing import Any, Protocol

logger = logging.getLogger(__name__)

import numpy as np

DEFAULT_EMBEDDING_MODEL = "all-MiniLM-L6-v2"


class TextEncoder(Protocol):
    def encode(self, sentences: Any, **kwargs: Any) -> Any: ...


_model: TextEncoder | None = None
_model_name: str | None = None
_model_lock = threading.Lock()


def get_embedding_model(model_name: str | None = None) -> TextEncoder:
    global _model, _model_name
    selected_name = model_name or os.getenv("EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL)
    if _model is None:
        with _model_lock:
            if _model is None:
                logger.info("Loading sentence-transformer model %s", selected_name)
                try:
                    from sentence_transformers import SentenceTransformer
                    _model = SentenceTransformer(selected_name)
                except Exception as exc:
                    logger.exception("Failed to load sentence-transformer model %s", selected_name)
                    raise RuntimeError(
                        f"failed to initialize embedding model '{selected_name}': {exc}"
                    ) from exc
                _model_name = selected_name
                logger.info("Sentence-transformer model %s loaded once for this process", selected_name)
    if _model_name != selected_name:
        raise ValueError(f"embedding model already loaded as {_model_name}; requested {selected_name}")
    return _model


def normalize_embeddings(values: np.ndarray) -> np.ndarray:
    embeddings = np.asarray(values, dtype="float32")
    if embeddings.size == 0:
        return np.empty((0, 0), dtype="float32")
    if embeddings.ndim == 1:
        embeddings = embeddings.reshape(1, -1)
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    return embeddings / np.maximum(norms, np.finfo(np.float32).eps)


def embed_documents(documents: list[Any], encoder: TextEncoder | None = None) -> np.ndarray:
    if not documents:
        return np.empty((0, 0), dtype="float32")
    selected_encoder = encoder or get_embedding_model()
    values = selected_encoder.encode([document.text for document in documents], convert_to_numpy=True)
    return normalize_embeddings(np.asarray(values, dtype="float32"))


def embed_question(question: str, encoder: TextEncoder | None = None) -> np.ndarray:
    selected_encoder = encoder or get_embedding_model()
    values = selected_encoder.encode([question], convert_to_numpy=True)
    return normalize_embeddings(np.asarray(values, dtype="float32"))[0]
