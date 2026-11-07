import pytest
from fastapi.testclient import TestClient

from app.ambiguity.clarify import (
    AmbiguityService,
    ClarificationResult,
    get_ambiguity_service,
)
from app.ambiguity.explain import (
    ExplanationResult,
    ExplanationService,
    get_explanation_service,
)
from app.main import app
from app.text_to_sql.generator import MockLLMClient, TextToSQLService


@pytest.fixture
def mock_retrieval_fn():
    def _mock_retrieve(question: str, top_k: int = 3, max_bridge_tables: int = 2, **kwargs):
        return {
            "tables": ["courses"],
            "allowed_tables": ["courses"],
            "join_conditions": [],
            "prompt_context": "#### Table: courses\n- id: integer\n- name: text\n- credits: integer",
        }
    return _mock_retrieve


class CannedLLMClient:
    def __init__(self, responses: dict[str, str] | None = None) -> None:
        self.responses = responses or {}

    def generate(self, prompt: str, system_instruction: str | None = None) -> str:
        for k, v in self.responses.items():
            if k.lower() in prompt.lower():
                return v
        return '{"needs_clarification": false, "clarification_question": null, "options": []}'


def test_clarification_result_model():
    res = ClarificationResult(
        needs_clarification=True,
        clarification_question="Rank by CGPA or package?",
        options=["CGPA", "Package"],
    )
    assert res.success is True
    assert res.needs_clarification is True
    assert len(res.options) == 2


def test_ambiguity_service_empty_question_raises():
    service = AmbiguityService()
    with pytest.raises(ValueError, match="cannot be empty"):
        service.clarify("   ")


def test_ambiguity_service_with_mock_llm():
    mock_client = CannedLLMClient({
        "top students": '```json\n{"needs_clarification": true, "clarification_question": "Do you want to rank students by CGPA or placement status?", "options": ["CGPA", "Placement status"]}\n```',
        "cgpa > 8": '{"needs_clarification": false, "clarification_question": null, "options": []}',
    })
    service = AmbiguityService(llm_client=mock_client)

    ambig_res = service.clarify("Show the top students")
    assert ambig_res.needs_clarification is True
    assert "CGPA or placement status" in ambig_res.clarification_question
    assert ambig_res.options == ["CGPA", "Placement status"]

    clear_res = service.clarify("Find students whose CGPA > 8")
    assert clear_res.needs_clarification is False
    assert clear_res.clarification_question is None
    assert clear_res.options == []


def test_ambiguity_direct_heuristic():
    service = AmbiguityService(llm_client=None)

    # Known ambiguous queries
    r1 = service._fallback_heuristic("Show top students")
    assert r1.needs_clarification is True
    assert "CGPA or placement status" in r1.clarification_question
    assert "CGPA" in r1.options

    r2 = service._fallback_heuristic("Show the best courses")
    assert r2.needs_clarification is True
    assert "attendance percentage or credits" in r2.clarification_question

    r3 = service._fallback_heuristic("Rank companies")
    assert r3.needs_clarification is True
    assert "package" in r3.clarification_question

    # Clear query
    r4 = service._fallback_heuristic("Find students with cgpa greater than 8.5")
    assert r4.needs_clarification is False
    assert r4.options == []


def test_explanation_service_empty_inputs_raise():
    service = ExplanationService()
    with pytest.raises(ValueError, match="Question cannot be empty"):
        service.explain("  ", "SELECT * FROM students")

    with pytest.raises(ValueError, match="SQL query cannot be empty"):
        service.explain("Show students", "   ")


def test_explanation_direct_heuristic():
    service = ExplanationService(llm_client=None)
    res1 = service._fallback_heuristic(
        question="Find students whose CGPA is greater than 8",
        sql="SELECT * FROM students WHERE cgpa > 8",
    )
    assert res1.success is True
    assert "CGPA is greater than 8" in res1.explanation

    res2 = service._fallback_heuristic(
        question="Which companies hired students?",
        sql="SELECT c.name, p.package FROM companies c JOIN placements p ON c.id = p.company_id",
    )
    assert res2.success is True
    assert "companies and placements" in res2.explanation

    res3 = service._fallback_heuristic(
        question="List all courses with their credits",
        sql="SELECT name, credits FROM courses",
    )
    assert res3.success is True
    assert "credits of all courses" in res3.explanation


def test_explanation_with_mock_llm():
    mock_client = CannedLLMClient({
        "students": "This query retrieves all enrolled students from the students table."
    })
    service = ExplanationService(llm_client=mock_client)
    res = service.explain("Show students", "SELECT * FROM students")
    assert res.success is True
    assert "enrolled students" in res.explanation


# ---------------- API Endpoint Tests ----------------


def test_api_clarify_endpoint(monkeypatch):
    from app.ambiguity import clarify

    mock_llm = CannedLLMClient({
        "top students": '{"needs_clarification": true, "clarification_question": "Do you want to rank students by CGPA or placement status?", "options": ["CGPA", "Placement status"]}',
        "cgpa > 8.0": '{"needs_clarification": false, "clarification_question": null, "options": []}',
    })
    test_service = AmbiguityService(llm_client=mock_llm)
    monkeypatch.setattr(clarify, "_default_ambiguity_service", test_service)

    client = TestClient(app)

    # Empty question
    res_empty = client.post("/api/ai/clarify", json={"question": ""})
    assert res_empty.status_code == 422

    # Ambiguous question
    res_ambig = client.post("/api/ai/clarify", json={"question": "Show top students"})
    assert res_ambig.status_code == 200
    data_ambig = res_ambig.json()
    assert data_ambig["success"] is True
    assert data_ambig["needs_clarification"] is True
    assert len(data_ambig["options"]) >= 2

    # Clear question
    res_clear = client.post("/api/ai/clarify", json={"question": "Show students with CGPA > 8.0"})
    assert res_clear.status_code == 200
    data_clear = res_clear.json()
    assert data_clear["success"] is True
    assert data_clear["needs_clarification"] is False
    assert data_clear["clarification_question"] is None


def test_api_explain_endpoint(monkeypatch):
    from app.ambiguity import explain

    mock_llm = CannedLLMClient({
        "students": "This query retrieves students whose CGPA is greater than 8."
    })
    test_service = ExplanationService(llm_client=mock_llm)
    monkeypatch.setattr(explain, "_default_explanation_service", test_service)

    client = TestClient(app)

    # Missing SQL
    res_bad = client.post("/api/ai/explain", json={"question": "test", "sql": ""})
    assert res_bad.status_code == 422

    # Valid explain request
    res_ok = client.post(
        "/api/ai/explain",
        json={
            "question": "Find students whose CGPA is greater than 8",
            "sql": "SELECT * FROM students WHERE cgpa > 8",
        },
    )
    assert res_ok.status_code == 200
    data = res_ok.json()
    assert data["success"] is True
    assert "greater than 8" in data["explanation"]


def test_api_contract_generate_sql_endpoint(monkeypatch, mock_retrieval_fn):
    from app.text_to_sql import generator

    mock_llm = MockLLMClient({"courses": "SELECT * FROM courses;"})
    test_service = TextToSQLService(llm_client=mock_llm, retrieval_fn=mock_retrieval_fn)
    monkeypatch.setattr(generator, "_default_service", test_service)

    client = TestClient(app)

    # Empty question
    res_empty = client.post("/api/ai/generate-sql", json={"question": ""})
    assert res_empty.status_code == 422

    # Valid question
    res_ok = client.post("/api/ai/generate-sql", json={"question": "Show all courses"})
    assert res_ok.status_code == 200
    data = res_ok.json()
    assert data["success"] is True
    assert "courses" in data["sql"].lower()
    assert data["confidence"] == 0.95
