import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.text_to_sql.extractor import extract_sql
from app.text_to_sql.generator import (
    GeminiLLMClient,
    LLMConfigurationError,
    LLMGenerationError,
    MockLLMClient,
    TextToSQLService,
)
from app.text_to_sql.prompt import build_sql_prompt


@pytest.fixture
def mock_retrieval_fn():
    def _mock_retrieve(question: str, top_k: int = 3, max_bridge_tables: int = 2, **kwargs):
        q = question.lower()
        if "student" in q and ("company" in q or "companies" in q or "hired" in q):
            return {
                "tables": ["students", "companies"],
                "allowed_tables": ["companies", "placements", "students"],
                "join_conditions": [
                    "placements.company_id = companies.id",
                    "placements.student_id = students.id",
                ],
                "prompt_context": "#### Table: students\n- id: integer\n- name: text\n\n#### Table: companies\n- id: integer\n- name: text\n\n#### Table: placements (bridge table)\n- student_id: integer\n- company_id: integer",
            }
        if "attendance" in q or "course" in q:
            return {
                "tables": ["attendance", "courses"],
                "allowed_tables": ["attendance", "courses", "students"],
                "join_conditions": [
                    "attendance.course_id = courses.id",
                    "attendance.student_id = students.id",
                ],
                "prompt_context": "#### Table: attendance\n- student_id: integer\n- course_id: integer\n- percentage: numeric\n\n#### Table: courses\n- id: integer\n- name: text",
            }
        return {
            "tables": ["students"],
            "allowed_tables": ["students"],
            "join_conditions": [],
            "prompt_context": "#### Table: students\n- id: integer\n- name: text",
        }

    return _mock_retrieve


def test_build_sql_prompt_structure():
    prompt = build_sql_prompt(
        question="Show all students and their courses",
        schema_context="#### Table: students\n- id: int",
        allowed_tables=["students", "courses"],
        join_conditions=["attendance.student_id = students.id"],
    )
    assert "### SCHEMA CONTEXT" in prompt
    assert "### ALLOWED TABLES" in prompt
    assert "courses, students" in prompt
    assert "### JOIN CONDITIONS" in prompt
    assert "attendance.student_id = students.id" in prompt
    assert "### USER QUESTION" in prompt
    assert "Show all students and their courses" in prompt


@pytest.mark.parametrize(
    "raw_llm,expected_sql",
    [
        ("```sql\nSELECT * FROM students;\n```", "SELECT * FROM students;"),
        ("```postgresql\nSELECT id, name FROM courses;\n```", "SELECT id, name FROM courses;"),
        ("Here is your query:\n```sql\nSELECT * FROM companies;\n```\nHope that helps!", "SELECT * FROM companies;"),
        ("SELECT * FROM placements;", "SELECT * FROM placements;"),
        ("`SELECT * FROM attendance;`", "SELECT * FROM attendance;"),
        ("", ""),
        ("   ", ""),
    ],
)
def test_extract_sql(raw_llm: str, expected_sql: str):
    assert extract_sql(raw_llm) == expected_sql


def test_gemini_client_missing_key_raises_configuration_error(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)

    with pytest.raises(LLMConfigurationError) as exc_info:
        GeminiLLMClient(api_key=None)
    assert "API key is not configured" in str(exc_info.value)


def test_text_to_sql_empty_question_raises():
    service = TextToSQLService(llm_client=MockLLMClient())
    with pytest.raises(ValueError, match="cannot be empty"):
        service.generate_sql("   ")


def test_text_to_sql_simple_query(mock_retrieval_fn):
    mock_llm = MockLLMClient()
    service = TextToSQLService(llm_client=mock_llm, retrieval_fn=mock_retrieval_fn)

    result = service.generate_sql("Show all students.")
    assert result.is_valid is True
    assert result.is_safe is True
    assert "students" in result.tables_used
    assert "SELECT" in result.sql


def test_text_to_sql_junction_query(mock_retrieval_fn):
    mock_llm = MockLLMClient()
    service = TextToSQLService(llm_client=mock_llm, retrieval_fn=mock_retrieval_fn)

    result = service.generate_sql("Which companies hired students?")
    assert result.is_valid is True
    assert result.is_safe is True
    assert "placements" in result.allowed_tables
    assert "companies" in result.tables_used
    assert len(result.validation_errors) == 0


def test_text_to_sql_disallowed_table_generates_invalid_result(mock_retrieval_fn):
    # LLM hallucinates an unapproved "users" table
    mock_llm = MockLLMClient(
        canned_responses={"students": "SELECT s.name, u.email FROM students s JOIN users u ON s.id = u.id"}
    )
    service = TextToSQLService(llm_client=mock_llm, retrieval_fn=mock_retrieval_fn)

    result = service.generate_sql("Show all students.")
    assert result.is_valid is False
    assert result.is_safe is True
    assert "users" in result.tables_used
    assert any("users" in err for err in result.validation_errors)


def test_text_to_sql_mutating_query_rejected(mock_retrieval_fn):
    # LLM hallucinates a DELETE query
    mock_llm = MockLLMClient(
        canned_responses={"students": "DELETE FROM students WHERE id = 1"}
    )
    service = TextToSQLService(llm_client=mock_llm, retrieval_fn=mock_retrieval_fn)

    result = service.generate_sql("Show all students.")
    assert result.is_valid is False
    assert result.is_safe is False
    assert any("not allowed" in err.lower() or "forbidden" in err.lower() for err in result.validation_errors)


def test_text_to_sql_llm_failure_propagates(mock_retrieval_fn):
    class BrokenLLMClient:
        def generate(self, prompt: str, system_instruction: str | None = None) -> str:
            raise LLMGenerationError("Quota exceeded on provider")

    service = TextToSQLService(llm_client=BrokenLLMClient(), retrieval_fn=mock_retrieval_fn)
    with pytest.raises(LLMGenerationError, match="Quota exceeded"):
        service.generate_sql("Show all students.")


def test_api_generate_sql_success(monkeypatch, mock_retrieval_fn):
    from app.text_to_sql import generator

    mock_llm = MockLLMClient()
    test_service = TextToSQLService(llm_client=mock_llm, retrieval_fn=mock_retrieval_fn)
    monkeypatch.setattr(generator, "_default_service", test_service)

    client = TestClient(app)
    response = client.post(
        "/sql/generate",
        json={
            "question": "Which companies hired students?",
            "top_k": 3,
            "max_bridge_tables": 2,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is True
    assert data["is_safe"] is True
    assert "sql" in data
    assert "allowed_tables" in data
    assert "join_conditions" in data
    assert "prompt_context" in data


def test_api_generate_sql_validation_errors():
    client = TestClient(app)
    # Empty question
    response = client.post("/sql/generate", json={"question": ""})
    assert response.status_code == 422


def test_api_generate_sql_missing_api_key(monkeypatch):
    from app.text_to_sql import generator

    monkeypatch.setattr(generator, "_default_service", None)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)

    client = TestClient(app)
    response = client.post(
        "/sql/generate",
        json={"question": "Show all students"},
    )
    # When no key is configured, service returns 503 Service Unavailable
    assert response.status_code == 503
    assert "API key" in response.json()["detail"]


def test_api_validate_sql_endpoint():
    client = TestClient(app)

    # Valid read-only query
    res_valid = client.post(
        "/sql/validate",
        json={"sql": "SELECT * FROM students;", "allowed_tables": ["students"]},
    )
    assert res_valid.status_code == 200
    assert res_valid.json()["is_valid"] is True
    assert res_valid.json()["is_safe"] is True

    # Dangerous mutating query
    res_invalid = client.post(
        "/sql/validate",
        json={"sql": "DROP TABLE students;", "allowed_tables": ["students"]},
    )
    assert res_invalid.status_code == 200
    assert res_invalid.json()["is_valid"] is False
    assert res_invalid.json()["is_safe"] is False
    assert len(res_invalid.json()["errors"]) > 0
