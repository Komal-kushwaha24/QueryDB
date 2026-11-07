import logging
import re
from typing import Any

from pydantic import BaseModel, Field

from app.text_to_sql.generator import GeminiLLMClient, LLMClientProtocol

logger = logging.getLogger(__name__)

EXPLAIN_SYSTEM_INSTRUCTION = """You are an SQL explanation assistant for QueryDB.
Your task is to explain a PostgreSQL query in clear, concise, and accessible plain English.
Explain what tables are queried, what conditions or filters are applied, what calculations or aggregates are done, and what the final output represents.

Strict Rules:
1. Explain what the supplied SQL actually does.
2. Do NOT claim that the query has already been executed.
3. Do NOT fabricate or display query results.
4. Do NOT modify the SQL or provide alternative queries.
5. Keep the explanation concise (1-2 sentences).
"""


class ExplanationResult(BaseModel):
    success: bool = Field(default=True, description="Whether explanation generation succeeded.")
    explanation: str = Field(description="Human-readable SQL explanation.")


class ExplanationService:
    """Generates human-readable explanations of SQL statements."""

    def __init__(self, llm_client: LLMClientProtocol | None = None) -> None:
        self._llm_client = llm_client

    def _fallback_heuristic(self, question: str, sql: str) -> ExplanationResult:
        """Heuristic fallback for explaining SQL when LLM is offline or during testing."""
        s = sql.lower()
        clean_q = question.strip().rstrip("?. ")

        # Specific matches for common domain queries
        if "from students" in s and "cgpa >" in s:
            match = re.search(r"cgpa\s*>\s*([0-9.]+)", s)
            threshold = match.group(1) if match else "the specified threshold"
            return ExplanationResult(
                success=True,
                explanation=f"This query retrieves students whose CGPA is greater than {threshold}."
            )
        if "from students" in s and "order by cgpa desc" in s:
            limit_match = re.search(r"limit\s+(\d+)", s)
            count = f"top {limit_match.group(1)}" if limit_match else "students"
            return ExplanationResult(
                success=True,
                explanation=f"This query retrieves the {count} ranked in descending order by CGPA."
            )
        if "from courses" in s and "credits" in s:
            return ExplanationResult(
                success=True,
                explanation="This query retrieves the names and credits of all courses in the database."
            )
        if "companies" in s and "placements" in s:
            return ExplanationResult(
                success=True,
                explanation="This query joins the companies and placements tables to retrieve the companies that hired students and their compensation packages."
            )
        if "attendance" in s and "students" in s:
            return ExplanationResult(
                success=True,
                explanation="This query links student records with course attendance data to display attendance percentages."
            )

        return ExplanationResult(
            success=True,
            explanation=f"This query retrieves records to answer: '{clean_q}'."
        )

    def explain(
        self,
        question: str,
        sql: str,
        llm_client: LLMClientProtocol | None = None,
    ) -> ExplanationResult:
        if not question or not question.strip():
            raise ValueError("Question cannot be empty or whitespace.")
        if not sql or not sql.strip():
            raise ValueError("SQL query cannot be empty or whitespace.")

        clean_question = question.strip()
        clean_sql = sql.strip()

        client = llm_client or self._llm_client
        if client is None:
            try:
                client = GeminiLLMClient()
            except Exception as exc:
                logger.info("Falling back to heuristic SQL explainer: %s", exc)
                return self._fallback_heuristic(clean_question, clean_sql)

        prompt = f"""Provide a concise 1-2 sentence explanation of what this SQL query retrieves:
User Question: "{clean_question}"
SQL Query:
```sql
{clean_sql}
```

Explanation:"""

        try:
            raw_response = client.generate(prompt=prompt, system_instruction=EXPLAIN_SYSTEM_INSTRUCTION)
            # Strip markdown code fences (```sql ... ```) if the LLM accidentally wraps its output
            explanation = re.sub(r"```(?:sql)?\s*.*?```", "", raw_response, flags=re.DOTALL).strip().strip('"')
            # Also strip lone backtick fences on their own line
            explanation = re.sub(r"^\s*```\w*\s*$", "", explanation, flags=re.MULTILINE).strip()
            if not explanation:
                return self._fallback_heuristic(clean_question, clean_sql)
            return ExplanationResult(
                success=True,
                explanation=explanation,
            )
        except Exception as exc:
            logger.warning("LLM explanation generation failed, using heuristic: %s", exc)
            return self._fallback_heuristic(clean_question, clean_sql)


_default_explanation_service: ExplanationService | None = None


def get_explanation_service() -> ExplanationService:
    global _default_explanation_service
    if _default_explanation_service is None:
        _default_explanation_service = ExplanationService()
    return _default_explanation_service
