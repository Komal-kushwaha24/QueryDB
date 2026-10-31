from __future__ import annotations

import logging
import threading
import time
from typing import Any

from dotenv import load_dotenv

logger = logging.getLogger(__name__)
load_dotenv()

from .documents import build_schema_documents
from .embeddings import embed_documents, embed_question
from .index import SchemaVectorIndex
from .schema_loader import SchemaLoader


class RetrievalError(RuntimeError):
    pass


class RetrievalService:
    def __init__(self, loader: SchemaLoader, encoder: Any | None = None) -> None:
        self.loader = loader
        self.encoder = encoder
        self._indexes: dict[tuple[str, str], SchemaVectorIndex] = {}
        self._lock = threading.Lock()

    def refresh(self, user_id: str = "anonymous", dataset_id: str = "default") -> int:
        scope = self._scope(user_id, dataset_id)
        started = time.monotonic()
        schema_payload = self.loader.load()
        documents = build_schema_documents(schema_payload)
        logger.info("Building RAG index for %d tables", len(documents))
        try:
            embeddings = embed_documents(documents, encoder=self.encoder)
            index = SchemaVectorIndex()
            index.refresh(documents, embeddings)
        except Exception as exc:
            if isinstance(exc, RetrievalError):
                raise
            logger.exception("Failed to build schema RAG index")
            raise RetrievalError(f"failed to build schema RAG index: {exc}") from exc
        with self._lock:
            self._indexes[scope] = index
        logger.info("Schema RAG refresh complete: %d tables in %.2fs", index.size, time.monotonic() - started)
        return index.size

    def retrieve(
        self, question: str, top_k: int = 3, user_id: str = "anonymous", dataset_id: str = "default"
    ) -> list[dict[str, Any]]:
        if not isinstance(question, str) or not question.strip():
            raise ValueError("question must be a non-empty string")
        if len(question.strip()) > 10_000:
            raise ValueError("question is too long")
        if isinstance(top_k, bool) or not isinstance(top_k, int) or top_k <= 0:
            raise ValueError("top_k must be a positive integer")

        scope = self._scope(user_id, dataset_id)
        with self._lock:
            index = self._indexes.get(scope)
        if index is None:
            raise RetrievalError("schema index has not been refreshed for this user and dataset")
        question_embedding = embed_question(question.strip(), encoder=self.encoder)
        matches = index.search(question_embedding, top_k)
        return [
            {
                "table_name": document.table_name,
                "description": document.description,
                "relationships": list(document.relationships),
                "metadata": document.metadata,
                "score": score,
            }
            for document, score in matches
        ]

    @staticmethod
    def _scope(user_id: str, dataset_id: str) -> tuple[str, str]:
        if not isinstance(user_id, str) or not user_id.strip():
            raise ValueError("user_id must be a non-empty string")
        if not isinstance(dataset_id, str) or not dataset_id.strip():
            raise ValueError("dataset_id must be a non-empty string")
        return user_id.strip(), dataset_id.strip()


_default_service = RetrievalService(SchemaLoader())


def refresh_schema(user_id: str = "anonymous", dataset_id: str = "default") -> int:
    return _default_service.refresh(user_id=user_id, dataset_id=dataset_id)


def retrieve_schema(question: str, top_k: int = 3) -> list[dict[str, Any]]:
    return _default_service.retrieve(question, top_k=top_k)
