import logging
import os
import re
from typing import Any, Callable, Protocol

from pydantic import BaseModel, Field

from app.rag.retrieval import retrieve_schema_context
from app.sql_safety.validator import SQLValidationResult, validate_sql
from app.text_to_sql.extractor import extract_sql
from app.text_to_sql.prompt import SYSTEM_INSTRUCTION, build_sql_prompt

logger = logging.getLogger(__name__)


class TextToSQLError(Exception):
    """Base exception for text-to-SQL generation errors."""


class LLMConfigurationError(TextToSQLError):
    """Raised when the LLM client is missing credentials or invalidly configured."""


class LLMGenerationError(TextToSQLError):
    """Raised when the LLM provider fails during text generation."""


class LLMClientProtocol(Protocol):
    """Protocol for LLM clients that generate text given a prompt and optional system instruction."""

    def generate(self, prompt: str, system_instruction: str | None = None) -> str:
        ...


class GeminiLLMClient:
    """Production LLM client powered by the google-genai SDK."""

    def __init__(self, api_key: str | None = None, model_name: str | None = None) -> None:
        key = (
            api_key
            or os.getenv("GEMINI_API_KEY")
            or os.getenv("LLM_API_KEY")
            or os.getenv("GOOGLE_API_KEY")
        )
        if not key or not key.strip():
            raise LLMConfigurationError(
                "Gemini API key is not configured. Please set GEMINI_API_KEY or LLM_API_KEY."
            )
        self.api_key = key.strip()
        self.model_name = (
            model_name
            or os.getenv("GEMINI_MODEL")
            or "gemini-2.5-flash"
        )
        try:
            from google import genai
            self._client = genai.Client(api_key=self.api_key)
        except Exception as exc:
            raise LLMConfigurationError(f"Failed to initialize google-genai Client: {exc}") from exc

    def generate(self, prompt: str, system_instruction: str | None = None) -> str:
        try:
            from google.genai import types

            config = types.GenerateContentConfig(
                system_instruction=system_instruction or SYSTEM_INSTRUCTION,
                temperature=0.0,
            )
            response = self._client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=config,
            )
            return response.text or ""
        except Exception as exc:
            logger.exception("Gemini content generation failed: %s", exc)
            raise LLMGenerationError(f"Gemini API generation failed: {exc}") from exc


class MockLLMClient:
    """Mock LLM client for deterministic unit testing and offline development."""

    def __init__(self, canned_responses: dict[str, str] | None = None) -> None:
        self.canned_responses = canned_responses or {}
        self.calls: list[dict[str, Any]] = []

    def set_response(self, question_keyword: str, sql: str) -> None:
        self.canned_responses[question_keyword.lower()] = sql

    def generate(self, prompt: str, system_instruction: str | None = None) -> str:
        self.calls.append({"prompt": prompt, "system_instruction": system_instruction})

        for key, sql in self.canned_responses.items():
            if key.lower() in prompt.lower():
                return f"```sql\n{sql}\n```"

        # Default fallback query extraction from allowed tables in prompt if present
        match = re.search(r"### USER QUESTION\s+(.+?)\s+###", prompt, re.DOTALL)
        question = match.group(1).strip() if match else prompt

        q = question.lower()
        if "student" in q and "course" in q and "attendance" in q:
            return "```sql\nSELECT s.name, c.name, a.percentage FROM students s JOIN attendance a ON s.id = a.student_id JOIN courses c ON a.course_id = c.id;\n```"
        if "student" in q and ("company" in q or "companies" in q or "hired" in q):
            return "```sql\nSELECT s.name, c.name FROM students s JOIN placements p ON s.id = p.student_id JOIN companies c ON p.company_id = c.id;\n```"
        if "company" in q or "companies" in q or "hired" in q:
            return "```sql\nSELECT DISTINCT c.name FROM companies c JOIN placements p ON c.id = p.company_id;\n```"
        if "student" in q:
            return "```sql\nSELECT * FROM students;\n```"
        if "attendance" in q:
            return "```sql\nSELECT c.name, a.percentage FROM courses c JOIN attendance a ON c.id = a.course_id;\n```"

        return "```sql\nSELECT 1;\n```"


class TextToSQLResult(BaseModel):
    sql: str = Field(description="The final validated SQL query.")
    question: str = Field(description="The original user question.")
    allowed_tables: list[str] = Field(default_factory=list, description="Schema tables allowed for this query.")
    join_conditions: list[str] = Field(default_factory=list, description="Join conditions provided to the model.")
    prompt_context: str = Field(default="", description="The markdown schema context generated by RAG.")
    is_valid: bool = Field(description="Whether the generated SQL passed syntax and safety validation.")
    is_safe: bool = Field(description="Whether the query is strictly non-destructive (read-only SELECT).")
    tables_used: list[str] = Field(default_factory=list, description="Tables referenced in the generated query.")
    validation_errors: list[str] = Field(default_factory=list, description="Validation or safety violation errors.")
    raw_llm_response: str = Field(default="", description="Raw response text returned by the LLM.")


class TextToSQLService:
    """Coordinates RAG schema retrieval, prompt construction, LLM generation, and SQL validation."""

    def __init__(
        self,
        llm_client: LLMClientProtocol | None = None,
        retrieval_fn: Callable[..., dict[str, Any]] | None = None,
    ) -> None:
        self._llm_client = llm_client
        self._retrieval_fn = retrieval_fn or retrieve_schema_context

    def generate_sql(
        self,
        question: str,
        user_id: str = "anonymous",
        dataset_id: str = "default",
        top_k: int = 3,
        max_bridge_tables: int = 2,
        llm_client: LLMClientProtocol | None = None,
    ) -> TextToSQLResult:
        if not question or not question.strip():
            raise ValueError("Question cannot be empty or whitespace.")

        # 1. Resolve LLM client early to fail fast on missing credentials
        client = llm_client or self._llm_client
        if client is None:
            client = GeminiLLMClient()

        # 2. Retrieve schema context using RAG
        context = self._retrieval_fn(
            question=question,
            top_k=top_k,
            max_bridge_tables=max_bridge_tables,
            user_id=user_id,
            dataset_id=dataset_id,
        )

        allowed_tables: list[str] = context.get("allowed_tables", [])
        join_conditions: list[str] = context.get("join_conditions", [])
        prompt_context: str = context.get("prompt_context", "")

        # 3. Build structured prompt
        prompt = build_sql_prompt(
            question=question,
            schema_context=prompt_context,
            allowed_tables=allowed_tables,
            join_conditions=join_conditions,
        )

        # 4. Call LLM
        raw_response = client.generate(prompt=prompt, system_instruction=SYSTEM_INSTRUCTION)

        # 4. Extract SQL query
        extracted_sql = extract_sql(raw_response)

        # 5. Validate SQL safety and schema conformity
        validation: SQLValidationResult = validate_sql(
            extracted_sql,
            allowed_tables=allowed_tables,
        )

        final_sql = validation.sanitized_sql if validation.is_valid else extracted_sql

        return TextToSQLResult(
            sql=final_sql,
            question=question,
            allowed_tables=allowed_tables,
            join_conditions=join_conditions,
            prompt_context=prompt_context,
            is_valid=validation.is_valid,
            is_safe=validation.is_safe,
            tables_used=validation.tables_used,
            validation_errors=validation.errors,
            raw_llm_response=raw_response,
        )


_default_service: TextToSQLService | None = None


def get_text_to_sql_service() -> TextToSQLService:
    global _default_service
    if _default_service is None:
        _default_service = TextToSQLService()
    return _default_service
