import logging
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from app.rag.retrieval import (
    RetrievalError,
    refresh_schema,
    retrieve_schema,
    retrieve_schema_context,
)
from app.rag.schema_loader import SchemaLoaderError

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="QueryDB AI Service")


class RefreshRequest(BaseModel):
    user_id: str = Field(default="anonymous", min_length=1, max_length=256)
    dataset_id: str = Field(default="default", min_length=1, max_length=256)


class RetrieveRequest(BaseModel):
    question: str = Field(min_length=1, max_length=10_000)
    top_k: int = Field(default=3, gt=0, le=100)
    user_id: str = Field(default="anonymous", min_length=1, max_length=256)
    dataset_id: str = Field(default="default", min_length=1, max_length=256)


class RetrieveContextRequest(BaseModel):
    question: str = Field(min_length=1, max_length=10_000)
    top_k: int = Field(default=3, gt=0, le=100)
    max_bridge_tables: int = Field(default=2, ge=0, le=10)
    user_id: str = Field(default="anonymous", min_length=1, max_length=256)
    dataset_id: str = Field(default="default", min_length=1, max_length=256)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/rag/refresh")
def refresh_rag_schema(request: RefreshRequest | None = None) -> dict[str, int | str]:
    try:
        if request is None or (request.user_id == "anonymous" and request.dataset_id == "default"):
            table_count = refresh_schema()
        else:
            table_count = refresh_schema(user_id=request.user_id, dataset_id=request.dataset_id)
        return {"status": "refreshed", "table_count": table_count}
    except SchemaLoaderError as exc:
        logger.warning("Schema refresh failed while loading schema: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except RetrievalError as exc:
        logger.exception("Schema refresh failed while building the RAG index")
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/rag/retrieve")
def retrieve_rag_schema(request: RetrieveRequest) -> dict[str, object]:
    try:
        if request.user_id == "anonymous" and request.dataset_id == "default":
            results = retrieve_schema(request.question, request.top_k)
        else:
            results = retrieve_schema(
                request.question,
                request.top_k,
                user_id=request.user_id,
                dataset_id=request.dataset_id,
            )
        return {"results": results}
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RetrievalError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except SchemaLoaderError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/rag/context")
def retrieve_rag_context(request: RetrieveContextRequest) -> dict[str, Any]:
    try:
        context = retrieve_schema_context(
            request.question,
            top_k=request.top_k,
            max_bridge_tables=request.max_bridge_tables,
            user_id=request.user_id,
            dataset_id=request.dataset_id,
        )
        return context
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RetrievalError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except SchemaLoaderError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
