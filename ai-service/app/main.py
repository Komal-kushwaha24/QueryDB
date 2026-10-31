import logging

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from app.rag.retrieval import RetrievalError, refresh_schema, retrieve_schema
from app.rag.schema_loader import SchemaLoaderError

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="QueryDB AI Service")


class RetrieveRequest(BaseModel):
    question: str = Field(min_length=1, max_length=10_000)
    top_k: int = Field(default=3, gt=0, le=100)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/rag/refresh")
def refresh_rag_schema() -> dict[str, int | str]:
    try:
        table_count = refresh_schema()
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
        results = retrieve_schema(request.question, request.top_k)
        return {"results": results}
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RetrievalError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except SchemaLoaderError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
