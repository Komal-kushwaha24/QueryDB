import json
import logging
import re
from typing import Any

from pydantic import BaseModel, Field

from app.text_to_sql.generator import GeminiLLMClient, LLMClientProtocol, MockLLMClient

logger = logging.getLogger(__name__)

AMBIGUITY_SYSTEM_INSTRUCTION = """You are a database query understanding assistant for QueryDB, a university relational database containing:
- students (id, name, email, cgpa, department)
- courses (id, name, code, credits)
- attendance (id, student_id, course_id, percentage)
- companies (id, name, industry, location)
- placements (id, student_id, company_id, package, role, placement_date)

Your job is to determine whether the user's natural language question is AMBIGUOUS.
A question is ambiguous if it lacks critical criteria required to formulate an accurate SQL query without guessing.
Examples:
- "Show top students" -> AMBIGUOUS: "top" could mean highest CGPA, highest placement package, or highest attendance.
- "Show best courses" -> AMBIGUOUS: "best" could mean highest credits, highest attendance, or most enrolled.
- "Rank companies" -> AMBIGUOUS: could mean ranked by highest package offered or by number of students hired.

A question is NOT ambiguous if it has specific criteria or clear intent.
Examples:
- "Show students whose CGPA is greater than 8" -> NOT AMBIGUOUS.
- "List all courses with their credits" -> NOT AMBIGUOUS.
- "Which companies hired students and what packages were offered?" -> NOT AMBIGUOUS.
- "Find students with attendance less than 75%" -> NOT AMBIGUOUS.

Respond ONLY with a valid JSON object matching this schema:
{
  "needs_clarification": boolean,
  "clarification_question": string or null,
  "options": string[]
}
Do NOT include any additional explanation or markdown formatting outside the JSON block.
"""


class ClarificationResult(BaseModel):
    success: bool = Field(default=True, description="Whether clarification analysis succeeded.")
    needs_clarification: bool = Field(description="Whether more information is required.")
    clarification_question: str | None = Field(default=None, description="Clarifying question to present.")
    options: list[str] = Field(default_factory=list, description="Suggested clarification choices.")


class AmbiguityService:
    """Detects query ambiguity and provides clarification options."""

    def __init__(self, llm_client: LLMClientProtocol | None = None) -> None:
        self._llm_client = llm_client

    def _fallback_heuristic(self, question: str) -> ClarificationResult:
        """Deterministic heuristic fallback when LLM is unavailable or for known ambiguous queries."""
        q = question.lower().strip()

        # Check for top/best student ambiguity
        if any(term in q for term in ["top student", "best student", "rank student", "top performers", "best performers"]):
            if "cgpa" not in q and "package" not in q and "attendance" not in q and "placement" not in q:
                return ClarificationResult(
                    success=True,
                    needs_clarification=True,
                    clarification_question="Do you want to rank students by CGPA or placement status?",
                    options=["CGPA", "Placement status"],
                )

        # Check for top/best course ambiguity
        if any(term in q for term in ["best course", "top course", "popular course", "rank course"]):
            if "credit" not in q and "attendance" not in q and "percentage" not in q:
                return ClarificationResult(
                    success=True,
                    needs_clarification=True,
                    clarification_question="Do you want to evaluate courses by attendance percentage or credits?",
                    options=["Attendance percentage", "Credits"],
                )

        # Check for company ranking ambiguity
        if any(term in q for term in ["top company", "top companies", "best company", "best companies", "rank companies"]):
            if "package" not in q and "hired" not in q and "placement" not in q:
                return ClarificationResult(
                    success=True,
                    needs_clarification=True,
                    clarification_question="Do you want to rank companies by highest package offered or number of students hired?",
                    options=["Highest package", "Number of students hired"],
                )

        return ClarificationResult(
            success=True,
            needs_clarification=False,
            clarification_question=None,
            options=[],
        )

    def clarify(
        self,
        question: str,
        schema_context: dict[str, Any] | None = None,
        llm_client: LLMClientProtocol | None = None,
    ) -> ClarificationResult:
        if not question or not question.strip():
            raise ValueError("Question cannot be empty or whitespace.")

        clean_question = question.strip()

        client = llm_client or self._llm_client
        if client is None:
            try:
                client = GeminiLLMClient()
            except Exception as exc:
                logger.info("Falling back to heuristic ambiguity analyzer: %s", exc)
                return self._fallback_heuristic(clean_question)

        prompt = f"""Analyze the following question for ambiguity in QueryDB:
User Question: "{clean_question}"

Context Metadata: {json.dumps(schema_context or {})}

Determine whether this question requires clarification. Return strictly a JSON object:
{{
  "needs_clarification": true/false,
  "clarification_question": "..." or null,
  "options": [...]
}}
"""
        try:
            raw_response = client.generate(prompt=prompt, system_instruction=AMBIGUITY_SYSTEM_INSTRUCTION)
            return self._parse_response(raw_response, clean_question)
        except Exception as exc:
            logger.warning("LLM ambiguity check failed, using heuristic: %s", exc)
            return self._fallback_heuristic(clean_question)

    def _parse_response(self, text: str, fallback_question: str) -> ClarificationResult:
        cleaned = text.strip()
        # Remove markdown code fences if present
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)

        # Match first JSON object in text
        json_match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group(0))
                needs_clarification = bool(data.get("needs_clarification", False))
                clarification_question = data.get("clarification_question") if needs_clarification else None
                options = data.get("options", []) if needs_clarification else []

                if needs_clarification and not clarification_question:
                    # Invalid LLM response, fallback to heuristic
                    return self._fallback_heuristic(fallback_question)

                return ClarificationResult(
                    success=True,
                    needs_clarification=needs_clarification,
                    clarification_question=clarification_question,
                    options=list(options) if isinstance(options, list) else [],
                )
            except Exception as exc:
                logger.warning("Failed to parse JSON from LLM ambiguity response: %s", exc)

        return self._fallback_heuristic(fallback_question)


_default_ambiguity_service: AmbiguityService | None = None


def get_ambiguity_service() -> AmbiguityService:
    global _default_ambiguity_service
    if _default_ambiguity_service is None:
        _default_ambiguity_service = AmbiguityService()
    return _default_ambiguity_service
