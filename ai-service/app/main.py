import logging
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from app.rag.retrieval import (
    RetrievalError,
    refresh_schema,
    retrieve_schema,
    retrieve_schema_context,
)
from app.rag.schema_loader import SchemaLoaderError
from app.ambiguity import (
    AmbiguityService,
    ClarificationResult,
    ExplanationResult,
    ExplanationService,
    get_ambiguity_service,
    get_explanation_service,
)
from app.sql_safety.validator import SQLValidationResult, validate_sql
from app.text_to_sql.generator import (
    LLMConfigurationError,
    LLMGenerationError,
    TextToSQLResult,
    get_text_to_sql_service,
)

load_dotenv()

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


class GenerateSQLRequest(BaseModel):
    question: str = Field(min_length=1, max_length=10_000)
    top_k: int = Field(default=3, gt=0, le=100)
    max_bridge_tables: int = Field(default=2, ge=0, le=10)
    user_id: str = Field(default="anonymous", min_length=1, max_length=256)
    dataset_id: str = Field(default="default", min_length=1, max_length=256)


class ValidateSQLRequest(BaseModel):
    sql: str = Field(min_length=1, max_length=10_000)
    allowed_tables: list[str] | None = None


class ClarifyRequest(BaseModel):
    question: str = Field(min_length=1, max_length=10_000)
    schema_context: dict[str, Any] | None = None


class ExplainRequest(BaseModel):
    question: str = Field(min_length=1, max_length=10_000)
    sql: str = Field(min_length=1, max_length=10_000)


class ContractGenerateSQLRequest(BaseModel):
    question: str = Field(min_length=1, max_length=10_000)


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


@app.post("/sql/generate")
def generate_sql_endpoint(request: GenerateSQLRequest) -> dict[str, Any]:
    try:
        service = get_text_to_sql_service()
        result: TextToSQLResult = service.generate_sql(
            question=request.question,
            user_id=request.user_id,
            dataset_id=request.dataset_id,
            top_k=request.top_k,
            max_bridge_tables=request.max_bridge_tables,
        )
        return result.model_dump()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except LLMConfigurationError as exc:
        logger.warning("LLM generation configuration error: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except LLMGenerationError as exc:
        logger.warning("LLM generation provider error: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except RetrievalError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except SchemaLoaderError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/sql/validate")
def validate_sql_endpoint(request: ValidateSQLRequest) -> dict[str, Any]:
    try:
        result: SQLValidationResult = validate_sql(
            sql=request.sql,
            allowed_tables=request.allowed_tables,
        )
        return result.model_dump()
    except Exception as exc:
        logger.exception("SQL validation failed unexpectedly")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/ai/clarify")
@app.post("/ambiguity/clarify")
def clarify_endpoint(request: ClarifyRequest) -> dict[str, Any]:
    try:
        service = get_ambiguity_service()
        result = service.clarify(question=request.question, schema_context=request.schema_context)
        return result.model_dump()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Clarification failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail={"code": "CLARIFICATION_FAILED", "message": "Unable to analyze the question."}
        ) from exc


@app.post("/api/ai/explain")
@app.post("/text-to-sql/explain")
def explain_endpoint(request: ExplainRequest) -> dict[str, Any]:
    try:
        service = get_explanation_service()
        result = service.explain(question=request.question, sql=request.sql)
        return result.model_dump()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Explanation generation failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail={"code": "EXPLANATION_FAILED", "message": "Unable to explain the SQL query."}
        ) from exc


@app.post("/api/ai/generate-sql")
def contract_generate_sql_endpoint(request: ContractGenerateSQLRequest) -> dict[str, Any]:
    try:
        service = get_text_to_sql_service()
        result: TextToSQLResult = service.generate_sql(question=request.question)
        if not result.is_valid:
            raise HTTPException(
                status_code=500,
                detail={"code": "SQL_GENERATION_FAILED", "message": "SQL generation failed."}
            )
        return {
            "success": True,
            "sql": result.sql,
            "confidence": 0.95
        }
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RetrievalError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except SchemaLoaderError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except LLMConfigurationError as exc:
        logger.warning("Contract SQL LLM configuration error: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except LLMGenerationError as exc:
        logger.warning("Contract SQL LLM generation provider error: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Contract SQL generation failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail={"code": "SQL_GENERATION_FAILED", "message": "SQL generation failed."}
        ) from exc
