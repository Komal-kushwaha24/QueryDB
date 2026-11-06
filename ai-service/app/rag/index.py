from __future__ import annotations

from typing import Any

import numpy as np

from .documents import SchemaDocument


class SchemaVectorIndex:
    def __init__(self) -> None:
        self._index: Any = None
        self.documents: list[SchemaDocument] = []
        self.dimension: int | None = None

    @property
    def size(self) -> int:
        return len(self.documents)

    def refresh(self, documents: list[SchemaDocument], embeddings: np.ndarray) -> None:
        if not documents:
            self._index = None
            self.documents = []
            self.dimension = None
            return
        vectors = np.asarray(embeddings, dtype="float32")
        if vectors.ndim != 2 or vectors.shape[0] != len(documents):
            raise ValueError("embeddings must have one row for each schema document")
        if vectors.shape[0] == 0 or vectors.shape[1] == 0:
            raise ValueError("cannot index empty embeddings")

        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        vectors = vectors / np.maximum(norms, np.finfo(np.float32).eps)
        import faiss
        index = faiss.IndexFlatIP(vectors.shape[1])
        index.add(vectors)
        self._index = index
        self.documents = list(documents)
        self.dimension = vectors.shape[1]

    def search(self, question_embedding: np.ndarray, top_k: int = 3) -> list[tuple[SchemaDocument, float]]:
        if isinstance(top_k, bool) or not isinstance(top_k, int) or top_k <= 0:
            raise ValueError("top_k must be a positive integer")
        if self._index is None or not self.documents:
            return []
        vector = np.asarray(question_embedding, dtype="float32")
        if vector.ndim != 1:
            vector = vector.reshape(-1)
        if vector.shape[0] != self.dimension:
            raise ValueError("question embedding dimension does not match the schema index")
        norm = np.linalg.norm(vector)
        if norm:
            vector = vector / norm
        vector = vector.reshape(1, -1)

        import faiss
        scores, positions = self._index.search(vector, min(top_k, len(self.documents)))
        return [
            (self.documents[int(position)], float(score))
            for score, position in zip(scores[0], positions[0])
            if position >= 0
        ]
