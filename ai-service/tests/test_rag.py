import io
import json
import urllib.error
from unittest.mock import Mock, patch

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.rag.documents import build_schema_documents
from app.rag.embeddings import normalize_embeddings
from app.rag.index import SchemaVectorIndex
from app.rag.retrieval import (
    RetrievalError,
    RetrievalService,
    extract_active_join_conditions,
    extract_foreign_key_edges,
    find_bridge_tables,
    format_schema_context,
    retrieve_schema_context,
)
from app.rag.schema_loader import (
    SchemaConnectionError,
    SchemaHTTPError,
    SchemaLoader,
    SchemaResponseError,
    _build_default_opener,
    _is_loopback_url,
    validate_schema_response,
)


SCHEMA = {
    "schema": "public",
    "tables": [
        {
            "name": "placements",
            "columns": [
                {"name": "id", "dataType": "integer", "isNullable": False, "isPrimaryKey": True},
                {"name": "student_id", "dataType": "integer", "isNullable": False, "isPrimaryKey": False},
            ],
            "primaryKeyColumns": ["id"],
            "foreignKeys": [{
                "sourceTable": "placements", "sourceColumn": "student_id",
                "referencedTable": "students", "referencedColumn": "id",
            }],
        },
        {
            "name": "students",
            "columns": [{"name": "id", "dataType": "integer", "isNullable": False, "isPrimaryKey": True}],
            "primaryKeyColumns": ["id"], "foreignKeys": [],
        },
    ],
}


class Response:
    def __init__(self, body: bytes, status: int = 200):
        self.body = io.BytesIO(body)
        self.status = status

    def __enter__(self): return self
    def __exit__(self, *args): return None
    def read(self): return self.body.read()


class VectorEncoder:
    def encode(self, sentences, **kwargs):
        vectors = []
        for sentence in sentences:
            text = sentence.lower()
            vectors.append([1.0 if "placements" in text or "placement" in text else 0.0,
                            1.0 if "students" in text or "student" in text else 0.0])
        return np.asarray(vectors, dtype="float32")


@pytest.mark.parametrize("payload", [None, {}, {"schema": "public", "tables": "bad"}])
def test_schema_response_validation(payload):
    with pytest.raises(SchemaResponseError):
        validate_schema_response(payload)


def test_schema_loader_reads_and_validates_success():
    opener = Mock(return_value=Response(json.dumps(SCHEMA).encode()))
    assert SchemaLoader(opener=opener).load() == SCHEMA


def test_schema_loader_connection_failure():
    opener = Mock(side_effect=urllib.error.URLError("offline"))
    with pytest.raises(SchemaConnectionError):
        SchemaLoader(opener=opener).load()


def test_schema_loader_malformed_json():
    opener = Mock(return_value=Response(b"not-json"))
    with pytest.raises(SchemaResponseError, match="malformed JSON"):
        SchemaLoader(opener=opener).load()


def test_document_generation_and_foreign_key_preservation():
    documents = build_schema_documents(SCHEMA)
    assert [document.table_name for document in documents] == ["placements", "students"]
    placements = documents[0]
    students = documents[1]

    # Outgoing relationship preservation on source table
    assert "Schema: public" in placements.description
    assert "student_id: integer" in placements.description
    assert placements.relationships == ("placements.student_id references students.id",)
    assert placements.metadata["foreignKeys"][0]["referencedTable"] == "students"
    assert "Incoming foreign-key relationships: none" in placements.description

    # Incoming relationship presence on referenced table
    assert "Foreign-key relationships: none" in students.description
    assert "Incoming foreign-key relationships: placements.student_id references students.id" in students.description


def test_document_generation_multiple_incoming_relationships():
    schema = {
        "schema": "public",
        "tables": [
            {
                "name": "students",
                "columns": [{"name": "id", "dataType": "integer", "isNullable": False, "isPrimaryKey": True}],
                "primaryKeyColumns": ["id"],
                "foreignKeys": [],
            },
            {
                "name": "companies",
                "columns": [{"name": "id", "dataType": "integer", "isNullable": False, "isPrimaryKey": True}],
                "primaryKeyColumns": ["id"],
                "foreignKeys": [],
            },
            {
                "name": "courses",
                "columns": [{"name": "id", "dataType": "integer", "isNullable": False, "isPrimaryKey": True}],
                "primaryKeyColumns": ["id"],
                "foreignKeys": [],
            },
            {
                "name": "placements",
                "columns": [
                    {"name": "id", "dataType": "integer", "isNullable": False, "isPrimaryKey": True},
                    {"name": "student_id", "dataType": "integer", "isNullable": False, "isPrimaryKey": False},
                    {"name": "company_id", "dataType": "integer", "isNullable": False, "isPrimaryKey": False},
                ],
                "primaryKeyColumns": ["id"],
                "foreignKeys": [
                    {"sourceTable": "placements", "sourceColumn": "student_id", "referencedTable": "students", "referencedColumn": "id"},
                    {"sourceTable": "placements", "sourceColumn": "company_id", "referencedTable": "companies", "referencedColumn": "id"},
                ],
            },
            {
                "name": "attendance",
                "columns": [
                    {"name": "id", "dataType": "integer", "isNullable": False, "isPrimaryKey": True},
                    {"name": "student_id", "dataType": "integer", "isNullable": False, "isPrimaryKey": False},
                    {"name": "course_id", "dataType": "integer", "isNullable": False, "isPrimaryKey": False},
                ],
                "primaryKeyColumns": ["id"],
                "foreignKeys": [
                    {"sourceTable": "attendance", "sourceColumn": "student_id", "referencedTable": "students", "referencedColumn": "id"},
                    {"sourceTable": "attendance", "sourceColumn": "course_id", "referencedTable": "courses", "referencedColumn": "id"},
                ],
            },
        ],
    }
    docs = {doc.table_name: doc for doc in build_schema_documents(schema)}

    # students has incoming references from both placements and attendance
    assert "Incoming foreign-key relationships: placements.student_id references students.id; attendance.student_id references students.id" in docs["students"].description

    # companies has incoming reference from placements
    assert "Incoming foreign-key relationships: placements.company_id references companies.id" in docs["companies"].description

    # courses has incoming reference from attendance
    assert "Incoming foreign-key relationships: attendance.course_id references courses.id" in docs["courses"].description

    # junction tables have outgoing but no incoming
    assert "Foreign-key relationships: placements.student_id references students.id; placements.company_id references companies.id" in docs["placements"].description
    assert "Incoming foreign-key relationships: none" in docs["placements"].description
    assert "Foreign-key relationships: attendance.student_id references students.id; attendance.course_id references courses.id" in docs["attendance"].description
    assert "Incoming foreign-key relationships: none" in docs["attendance"].description


def test_document_generation_isolated_table_without_relationships():
    schema = {
        "schema": "public",
        "tables": [
            {
                "name": "academic_calendar",
                "columns": [{"name": "id", "dataType": "integer", "isNullable": False, "isPrimaryKey": True}],
                "primaryKeyColumns": ["id"],
                "foreignKeys": [],
            }
        ],
    }
    docs = build_schema_documents(schema)
    assert len(docs) == 1
    assert "Foreign-key relationships: none" in docs[0].description
    assert "Incoming foreign-key relationships: none" in docs[0].description


def test_embeddings_are_normalized():
    normalized = normalize_embeddings([[3.0, 0.0], [0.0, 4.0]])
    np.testing.assert_allclose(normalized, [[1.0, 0.0], [0.0, 1.0]])


def test_faiss_mapping_and_ranking():
    documents = build_schema_documents(SCHEMA)
    vectors = np.asarray([[1.0, 0.0], [0.0, 1.0]], dtype="float32")
    index = SchemaVectorIndex()
    index.refresh(documents, vectors)
    matches = index.search(np.asarray([1.0, 0.0]), top_k=2)
    assert matches[0][0].table_name == "placements"
    assert matches[1][0].table_name == "students"


def test_retrieval_returns_predictable_results():
    loader = Mock()
    loader.load.return_value = SCHEMA
    service = RetrievalService(loader, encoder=VectorEncoder())
    assert service.refresh() == 2
    results = service.retrieve("placements", top_k=1)
    assert list(results[0]) == ["table_name", "description", "relationships", "metadata", "score"]
    assert results[0]["table_name"] == "placements"
    assert results[0]["relationships"] == ["placements.student_id references students.id"]


@pytest.mark.parametrize("question", ["", "   ", None])
def test_invalid_question(question):
    service = RetrievalService(Mock(), encoder=VectorEncoder())
    with pytest.raises(ValueError, match="question"):
        service.retrieve(question)


def test_empty_schema_and_index():
    documents = build_schema_documents({"schema": "public", "tables": []})
    assert documents == []
    index = SchemaVectorIndex()
    index.refresh(documents, np.empty((0, 0), dtype="float32"))
    assert index.search(np.asarray([1.0]), top_k=1) == []


def test_schema_loader_uses_configured_timeout(monkeypatch):
    monkeypatch.setenv("SCHEMA_API_TIMEOUT_SECONDS", "2.5")
    loader = SchemaLoader(api_url="http://example.test/schema")
    assert loader.timeout_seconds == 2.5
    assert loader.api_url == "http://example.test/schema"


def test_schema_loader_explicit_timeout_precedence_over_env(monkeypatch):
    monkeypatch.setenv("SCHEMA_API_TIMEOUT_SECONDS", "2.5")
    loader = SchemaLoader(api_url="http://example.test/schema", timeout_seconds=7.0)
    assert loader.timeout_seconds == 7.0


def test_schema_loader_invalid_timeout_validation(monkeypatch):
    with pytest.raises(ValueError, match="schema timeout must be positive"):
        SchemaLoader(timeout_seconds=-1)

    with pytest.raises(ValueError, match="schema timeout must be a number"):
        SchemaLoader(timeout_seconds="not-a-number")

    monkeypatch.setenv("SCHEMA_API_TIMEOUT_SECONDS", "invalid")
    with pytest.raises(ValueError, match="SCHEMA_API_TIMEOUT_SECONDS must be a number"):
        SchemaLoader()


def test_schema_loader_rejects_invalid_url_scheme():
    loader = SchemaLoader(api_url="ftp://example.test/schema")
    with pytest.raises(SchemaConnectionError, match="must be http or https"):
        loader.load()


@pytest.mark.parametrize("body", [b"", b"null", b'{"schema":"public","tables":{}}'])
def test_schema_loader_rejects_invalid_payload_shapes(body):
    loader = SchemaLoader(opener=lambda request, timeout: Response(body))
    if body == b'{"schema":"public","tables":{}}':
        with pytest.raises(SchemaResponseError, match="tables must be a list"):
            loader.load()
    else:
        with pytest.raises(SchemaResponseError):
            loader.load()


def test_embedding_model_is_initialized_once():
    import app.rag.embeddings as embeddings

    embeddings._model = None
    embeddings._model_name = None
    model = Mock()
    with patch("sentence_transformers.SentenceTransformer", return_value=model) as constructor:
        assert embeddings.get_embedding_model("test-model") is model
        assert embeddings.get_embedding_model("test-model") is model
        constructor.assert_called_once_with("test-model")


def test_refresh_and_retrieve_api_endpoints():
    from app.main import app

    client = TestClient(app)
    with patch("app.main.refresh_schema", return_value=5) as refresh:
        response = client.post("/rag/refresh")
        assert response.status_code == 200
        assert response.json() == {"status": "refreshed", "table_count": 5}
        refresh.assert_called_once_with()

    with patch("app.main.retrieve_schema", return_value=[{"table_name": "students"}]):
        response = client.post("/rag/retrieve", json={"question": "Which students were placed?", "top_k": 3})
        assert response.status_code == 200
        assert response.json()["results"][0]["table_name"] == "students"


def test_refresh_api_schema_failure_is_mapped_to_bad_gateway():
    from app.main import app

    with patch("app.main.refresh_schema", side_effect=SchemaConnectionError("timeout")):
        response = TestClient(app).post("/rag/refresh")
    assert response.status_code == 502
    assert "timeout" in response.json()["detail"]


def test_schema_loader_http_error_403():
    error = urllib.error.HTTPError(
        url="http://localhost:3000/api/schema",
        code=403,
        msg="Forbidden",
        hdrs={},
        fp=io.BytesIO(b"Forbidden"),
    )
    opener = Mock(side_effect=error)
    loader = SchemaLoader(opener=opener)
    with pytest.raises(SchemaHTTPError, match="schema API returned HTTP 403"):
        loader.load()


def test_schema_loader_http_error_from_status_code():
    opener = Mock(return_value=Response(b"{}", status=403))
    loader = SchemaLoader(opener=opener)
    with pytest.raises(SchemaHTTPError, match="schema API returned HTTP 403"):
        loader.load()


def test_schema_loader_timeout_error():
    opener = Mock(side_effect=TimeoutError("timed out"))
    loader = SchemaLoader(opener=opener, timeout_seconds=5.0)
    with pytest.raises(SchemaConnectionError, match="schema API timed out after 5.0s"):
        loader.load()


def test_schema_loader_url_timeout_reason():
    opener = Mock(side_effect=urllib.error.URLError("connection timed out"))
    loader = SchemaLoader(opener=opener, timeout_seconds=10.0)
    with pytest.raises(SchemaConnectionError, match="schema API timed out after 10.0s"):
        loader.load()


def test_is_loopback_url_detection():
    assert _is_loopback_url("http://localhost:3000/api/schema") is True
    assert _is_loopback_url("http://127.0.0.1:3000/api/schema") is True
    assert _is_loopback_url("http://[::1]:3000/api/schema") is True
    assert _is_loopback_url("http://0.0.0.0:3000/api/schema") is True
    assert _is_loopback_url("https://external-api.com/schema") is False


def test_loopback_opener_suppresses_proxy_even_when_env_proxy_set(monkeypatch):
    monkeypatch.setenv("HTTP_PROXY", "http://127.0.0.1:9999")
    default_opener = urllib.request.build_opener()
    loopback_opener = _build_default_opener("http://localhost:3000/api/schema")
    # Default opener has ProxyHandler when HTTP_PROXY is set
    assert any(isinstance(h, urllib.request.ProxyHandler) for h in default_opener.handlers)
    # Loopback opener explicitly suppresses ProxyHandler
    assert not any(isinstance(h, urllib.request.ProxyHandler) for h in loopback_opener.handlers)


def test_refresh_api_http_403_mapped_to_bad_gateway():
    from app.main import app

    with patch("app.main.refresh_schema", side_effect=SchemaHTTPError("schema API returned HTTP 403")):
        response = TestClient(app).post("/rag/refresh")
    assert response.status_code == 502
    assert response.json()["detail"] == "schema API returned HTTP 403"


def test_refresh_api_embedding_model_failure_is_mapped_to_service_unavailable():
    from app.main import app

    with patch("app.main.refresh_schema", side_effect=RetrievalError("failed to build schema RAG index: failed to initialize embedding model")):
        response = TestClient(app).post("/rag/refresh")
    assert response.status_code == 503
    assert "failed to initialize embedding model" in response.json()["detail"]


def test_retrieve_without_refresh_returns_conflict():
    from app.main import app

    with patch("app.main.retrieve_schema", side_effect=RetrievalError("schema index has not been refreshed")):
        response = TestClient(app).post("/rag/retrieve", json={"question": "show tables"})
    assert response.status_code == 409
    assert "schema index has not been refreshed" in response.json()["detail"]


def test_retrieval_service_reuses_existing_index():
    loader = Mock()
    loader.load.return_value = SCHEMA
    encoder = VectorEncoder()
    service = RetrievalService(loader, encoder=encoder)

    # First refresh builds index
    assert service.refresh() == 2
    assert loader.load.call_count == 1

    # Multiple retrievals reuse the index without reloading schema
    res1 = service.retrieve("placements")
    res2 = service.retrieve("students")
    assert len(res1) > 0
    assert len(res2) > 0
    assert loader.load.call_count == 1  # No additional schema loads


FIVE_TABLE_SCHEMA = {
    "schema": "public",
    "tables": [
        {
            "name": "students",
            "columns": [
                {"name": "id", "dataType": "integer", "isNullable": False, "isPrimaryKey": True},
                {"name": "name", "dataType": "character varying(100)", "isNullable": False, "isPrimaryKey": False},
                {"name": "department", "dataType": "character varying(30)", "isNullable": False, "isPrimaryKey": False},
                {"name": "cgpa", "dataType": "numeric(3,2)", "isNullable": False, "isPrimaryKey": False},
                {"name": "city", "dataType": "character varying(80)", "isNullable": False, "isPrimaryKey": False},
                {"name": "skills", "dataType": "text", "isNullable": False, "isPrimaryKey": False},
            ],
            "primaryKeyColumns": ["id"],
            "foreignKeys": [],
        },
        {
            "name": "companies",
            "columns": [
                {"name": "id", "dataType": "integer", "isNullable": False, "isPrimaryKey": True},
                {"name": "name", "dataType": "character varying(100)", "isNullable": False, "isPrimaryKey": False},
                {"name": "sector", "dataType": "character varying(80)", "isNullable": False, "isPrimaryKey": False},
                {"name": "city", "dataType": "character varying(80)", "isNullable": False, "isPrimaryKey": False},
            ],
            "primaryKeyColumns": ["id"],
            "foreignKeys": [],
        },
        {
            "name": "courses",
            "columns": [
                {"name": "id", "dataType": "integer", "isNullable": False, "isPrimaryKey": True},
                {"name": "name", "dataType": "character varying(120)", "isNullable": False, "isPrimaryKey": False},
                {"name": "department", "dataType": "character varying(30)", "isNullable": False, "isPrimaryKey": False},
                {"name": "credits", "dataType": "integer", "isNullable": False, "isPrimaryKey": False},
            ],
            "primaryKeyColumns": ["id"],
            "foreignKeys": [],
        },
        {
            "name": "placements",
            "columns": [
                {"name": "id", "dataType": "integer", "isNullable": False, "isPrimaryKey": True},
                {"name": "student_id", "dataType": "integer", "isNullable": False, "isPrimaryKey": False},
                {"name": "company_id", "dataType": "integer", "isNullable": False, "isPrimaryKey": False},
                {"name": "package", "dataType": "numeric(5,2)", "isNullable": False, "isPrimaryKey": False},
                {"name": "placement_date", "dataType": "date", "isNullable": False, "isPrimaryKey": False},
            ],
            "primaryKeyColumns": ["id"],
            "foreignKeys": [
                {
                    "sourceTable": "placements",
                    "sourceColumn": "student_id",
                    "referencedTable": "students",
                    "referencedColumn": "id",
                },
                {
                    "sourceTable": "placements",
                    "sourceColumn": "company_id",
                    "referencedTable": "companies",
                    "referencedColumn": "id",
                },
            ],
        },
        {
            "name": "attendance",
            "columns": [
                {"name": "id", "dataType": "integer", "isNullable": False, "isPrimaryKey": True},
                {"name": "student_id", "dataType": "integer", "isNullable": False, "isPrimaryKey": False},
                {"name": "course_id", "dataType": "integer", "isNullable": False, "isPrimaryKey": False},
                {"name": "percentage", "dataType": "numeric(5,2)", "isNullable": False, "isPrimaryKey": False},
            ],
            "primaryKeyColumns": ["id"],
            "foreignKeys": [
                {
                    "sourceTable": "attendance",
                    "sourceColumn": "student_id",
                    "referencedTable": "students",
                    "referencedColumn": "id",
                },
                {
                    "sourceTable": "attendance",
                    "sourceColumn": "course_id",
                    "referencedTable": "courses",
                    "referencedColumn": "id",
                },
            ],
        },
    ],
}


class FiveTableVectorEncoder:
    """Deterministic keyword-based encoder for testing QueryDB 5-table scenarios."""
    def encode(self, sentences, **kwargs):
        table_keys = ["students", "companies", "courses", "placements", "attendance"]
        vectors = []
        for sentence in sentences:
            text = sentence.lower()
            vec = [0.0] * len(table_keys)
            for i, key in enumerate(table_keys):
                if f"table: {key}" in text:
                    vec[i] = 10.0
                elif key in text:
                    vec[i] = 1.0
            vectors.append(vec)
        return np.asarray(vectors, dtype="float32")


def test_metadata_contains_structured_incoming_foreign_keys():
    docs = build_schema_documents(FIVE_TABLE_SCHEMA)
    doc_map = {d.table_name: d for d in docs}
    students_incoming = doc_map["students"].metadata.get("incomingForeignKeys", [])
    assert len(students_incoming) == 2
    ref_tables = {fk["sourceTable"] for fk in students_incoming}
    assert ref_tables == {"placements", "attendance"}


def test_bridge_table_expansion_students_and_courses():
    loader = Mock()
    loader.load.return_value = FIVE_TABLE_SCHEMA
    encoder = FiveTableVectorEncoder()
    service = RetrievalService(loader, encoder=encoder)
    service.refresh()

    # Query targeting students and courses (top_k=2)
    context = service.retrieve_context(
        question="Which students are enrolled in courses?",
        top_k=2,
        max_bridge_tables=2,
    )

    table_names = [t["table_name"] for t in context["tables"]]
    # Both students and courses are directly retrieved, attendance is added as a bridge table
    assert "students" in table_names
    assert "courses" in table_names
    assert "attendance" in table_names
    assert len(table_names) == 3

    # Check provenance and bridge flags
    tables_by_name = {t["table_name"]: t for t in context["tables"]}
    assert tables_by_name["students"]["is_bridge"] is False
    assert tables_by_name["students"]["provenance"] == "semantic"
    assert tables_by_name["students"]["score"] is not None

    assert tables_by_name["courses"]["is_bridge"] is False
    assert tables_by_name["courses"]["provenance"] == "semantic"

    assert tables_by_name["attendance"]["is_bridge"] is True
    assert tables_by_name["attendance"]["provenance"] == "relationship_expansion"
    assert tables_by_name["attendance"]["score"] is None  # Score is not fabricated

    # Check join conditions: only between active tables
    assert context["join_conditions"] == [
        "attendance.course_id = courses.id",
        "attendance.student_id = students.id",
    ]
    assert context["allowed_tables"] == ["attendance", "courses", "students"]


def test_bridge_table_expansion_students_and_companies():
    loader = Mock()
    loader.load.return_value = FIVE_TABLE_SCHEMA
    encoder = FiveTableVectorEncoder()
    service = RetrievalService(loader, encoder=encoder)
    service.refresh()

    # Query targeting students and companies (top_k=2)
    context = service.retrieve_context(
        question="Which students got placed in companies?",
        top_k=2,
        max_bridge_tables=2,
    )

    table_names = [t["table_name"] for t in context["tables"]]
    assert "students" in table_names
    assert "companies" in table_names
    assert "placements" in table_names

    tables_by_name = {t["table_name"]: t for t in context["tables"]}
    assert tables_by_name["placements"]["is_bridge"] is True
    assert tables_by_name["placements"]["provenance"] == "relationship_expansion"

    assert context["join_conditions"] == [
        "placements.company_id = companies.id",
        "placements.student_id = students.id",
    ]


def test_placement_query_direct_placements_retrieved():
    loader = Mock()
    loader.load.return_value = FIVE_TABLE_SCHEMA
    encoder = FiveTableVectorEncoder()
    service = RetrievalService(loader, encoder=encoder)
    service.refresh()

    # Query retrieving placements, students, and companies directly (top_k=3)
    context = service.retrieve_context(
        question="students companies placements package details",
        top_k=3,
        max_bridge_tables=2,
    )

    table_names = [t["table_name"] for t in context["tables"]]
    assert set(table_names) == {"placements", "students", "companies"}
    # None should be marked as bridge since all were directly retrieved
    for table in context["tables"]:
        assert table["is_bridge"] is False
        assert table["provenance"] == "semantic"

    assert context["join_conditions"] == [
        "placements.company_id = companies.id",
        "placements.student_id = students.id",
    ]


def test_disconnected_tables_no_fabricated_joins():
    disconnected_schema = {
        "schema": "public",
        "tables": [
            {
                "name": "students",
                "columns": [{"name": "id", "dataType": "integer", "isNullable": False, "isPrimaryKey": True}],
                "primaryKeyColumns": ["id"],
                "foreignKeys": [],
            },
            {
                "name": "audit_logs",
                "columns": [{"name": "log_id", "dataType": "integer", "isNullable": False, "isPrimaryKey": True}],
                "primaryKeyColumns": ["log_id"],
                "foreignKeys": [],
            },
        ],
    }
    loader = Mock()
    loader.load.return_value = disconnected_schema
    encoder = VectorEncoder()
    service = RetrievalService(loader, encoder=encoder)
    service.refresh()

    context = service.retrieve_context(
        question="students audit_logs",
        top_k=2,
        max_bridge_tables=2,
    )

    assert set(context["allowed_tables"]) == {"audit_logs", "students"}
    assert context["join_conditions"] == []
    assert "### Available Join Conditions\n- none" in context["prompt_context"]


def test_configurable_expansion_limits():
    loader = Mock()
    loader.load.return_value = FIVE_TABLE_SCHEMA
    encoder = FiveTableVectorEncoder()
    service = RetrievalService(loader, encoder=encoder)
    service.refresh()

    # With max_bridge_tables=0, no bridge tables should be added
    context_zero = service.retrieve_context(
        question="students courses",
        top_k=2,
        max_bridge_tables=0,
    )
    table_names_zero = [t["table_name"] for t in context_zero["tables"]]
    assert "attendance" not in table_names_zero
    assert context_zero["join_conditions"] == []

    # With max_bridge_tables=1, exactly one bridge table is added
    context_one = service.retrieve_context(
        question="students courses",
        top_k=2,
        max_bridge_tables=1,
    )
    table_names_one = [t["table_name"] for t in context_one["tables"]]
    assert "attendance" in table_names_one


def test_junction_completion_courses_and_attendance_includes_students():
    loader = Mock()
    loader.load.return_value = FIVE_TABLE_SCHEMA

    class CoursesAttendanceFirstEncoder:
        def encode(self, sentences, **kwargs):
            table_keys = ["courses", "attendance", "students", "placements", "companies"]
            vectors = []
            for sentence in sentences:
                text = sentence.lower()
                vec = [0.0] * len(table_keys)
                for i, key in enumerate(table_keys):
                    if f"table: {key}" in text:
                        vec[i] = 10.0
                    elif key in text:
                        vec[i] = 1.0
                vectors.append(vec)
            return np.asarray(vectors, dtype="float32")

    service = RetrievalService(loader, encoder=CoursesAttendanceFirstEncoder())
    service.refresh()

    context = service.retrieve_context(
        question="courses attendance",
        top_k=2,
        max_bridge_tables=2,
    )

    table_names = [t["table_name"] for t in context["tables"]]
    assert "courses" in table_names
    assert "attendance" in table_names
    assert "students" in table_names
    assert len(table_names) == 3

    tables_by_name = {t["table_name"]: t for t in context["tables"]}
    assert tables_by_name["courses"]["is_bridge"] is False
    assert tables_by_name["courses"]["provenance"] == "semantic"
    assert tables_by_name["attendance"]["is_bridge"] is False
    assert tables_by_name["attendance"]["provenance"] == "semantic"

    assert tables_by_name["students"]["is_bridge"] is True
    assert tables_by_name["students"]["provenance"] == "relationship_expansion"
    assert tables_by_name["students"]["score"] is None

    assert context["join_conditions"] == [
        "attendance.course_id = courses.id",
        "attendance.student_id = students.id",
    ]
    assert context["allowed_tables"] == ["attendance", "courses", "students"]


def test_junction_completion_placements_and_companies_includes_students():
    loader = Mock()
    loader.load.return_value = FIVE_TABLE_SCHEMA

    class PlacementsCompaniesFirstEncoder:
        def encode(self, sentences, **kwargs):
            table_keys = ["placements", "companies", "students", "courses", "attendance"]
            vectors = []
            for sentence in sentences:
                text = sentence.lower()
                vec = [0.0] * len(table_keys)
                for i, key in enumerate(table_keys):
                    if f"table: {key}" in text:
                        vec[i] = 10.0
                    elif key in text:
                        vec[i] = 1.0
                vectors.append(vec)
            return np.asarray(vectors, dtype="float32")

    service = RetrievalService(loader, encoder=PlacementsCompaniesFirstEncoder())
    service.refresh()

    context = service.retrieve_context(
        question="placements companies",
        top_k=2,
        max_bridge_tables=2,
    )

    table_names = [t["table_name"] for t in context["tables"]]
    assert "placements" in table_names
    assert "companies" in table_names
    assert "students" in table_names

    tables_by_name = {t["table_name"]: t for t in context["tables"]}
    assert tables_by_name["students"]["is_bridge"] is True
    assert tables_by_name["students"]["provenance"] == "relationship_expansion"
    assert tables_by_name["students"]["score"] is None

    assert context["join_conditions"] == [
        "placements.company_id = companies.id",
        "placements.student_id = students.id",
    ]


def test_courses_and_companies_no_unrelated_tables():
    loader = Mock()
    loader.load.return_value = FIVE_TABLE_SCHEMA

    class CoursesCompaniesFirstEncoder:
        def encode(self, sentences, **kwargs):
            table_keys = ["courses", "companies", "students", "placements", "attendance"]
            vectors = []
            for sentence in sentences:
                text = sentence.lower()
                vec = [0.0] * len(table_keys)
                for i, key in enumerate(table_keys):
                    if f"table: {key}" in text:
                        vec[i] = 10.0
                    elif key in text:
                        vec[i] = 1.0
                vectors.append(vec)
            return np.asarray(vectors, dtype="float32")

    service = RetrievalService(loader, encoder=CoursesCompaniesFirstEncoder())
    service.refresh()

    context = service.retrieve_context(
        question="courses companies",
        top_k=2,
        max_bridge_tables=2,
    )

    table_names = [t["table_name"] for t in context["tables"]]
    assert set(table_names) == {"courses", "companies"}
    assert context["join_conditions"] == []


def test_strict_expansion_limit_never_exceeded():
    loader = Mock()
    loader.load.return_value = FIVE_TABLE_SCHEMA

    class CoursesAttendanceFirstEncoder:
        def encode(self, sentences, **kwargs):
            table_keys = ["courses", "attendance", "students", "placements", "companies"]
            vectors = []
            for sentence in sentences:
                text = sentence.lower()
                vec = [0.0] * len(table_keys)
                for i, key in enumerate(table_keys):
                    if f"table: {key}" in text:
                        vec[i] = 10.0
                    elif key in text:
                        vec[i] = 1.0
                vectors.append(vec)
            return np.asarray(vectors, dtype="float32")

    service = RetrievalService(loader, encoder=CoursesAttendanceFirstEncoder())
    service.refresh()

    # Even if max_bridge_tables is 1, only 1 table is added
    context = service.retrieve_context(
        question="courses attendance",
        top_k=2,
        max_bridge_tables=1,
    )
    bridge_tables = [t for t in context["tables"] if t["is_bridge"]]
    assert len(bridge_tables) == 1
    assert bridge_tables[0]["table_name"] == "students"


def test_schema_context_formatter_output():
    tables = [
        {
            "table_name": "students",
            "is_bridge": False,
            "metadata": {
                "columns": [
                    {"name": "id", "dataType": "integer", "isPrimaryKey": True, "isNullable": False},
                    {"name": "name", "dataType": "varchar", "isPrimaryKey": False, "isNullable": True},
                ],
                "primaryKeyColumns": ["id"],
            },
        },
        {
            "table_name": "attendance",
            "is_bridge": True,
            "metadata": {
                "columns": [
                    {"name": "id", "dataType": "integer", "isPrimaryKey": True, "isNullable": False},
                    {"name": "student_id", "dataType": "integer", "isPrimaryKey": False, "isNullable": False},
                ],
                "primaryKeyColumns": ["id"],
            },
        },
    ]
    joins = ["attendance.student_id = students.id"]
    output = format_schema_context(tables, joins)

    assert "### Database Schema Context" in output
    assert "#### Table: students" in output
    assert "#### Table: attendance (Bridge Table)" in output
    assert "- id: integer (primary key, not nullable)" in output
    assert "- name: varchar" in output
    assert "### Available Join Conditions" in output
    assert "- attendance.student_id = students.id" in output


def test_api_backward_compatibility_retrieve():
    from app.main import app
    client = TestClient(app)

    with patch("app.main.retrieve_schema", return_value=[{
        "table_name": "students",
        "description": "Schema: public\nTable: students",
        "relationships": [],
        "metadata": {"name": "students"},
        "score": 0.85,
    }]):
        response = client.post("/rag/retrieve", json={"question": "students query", "top_k": 3})
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        first = data["results"][0]
        # Verify all 5 original fields exist and are preserved
        assert "table_name" in first
        assert "description" in first
        assert "relationships" in first
        assert "metadata" in first
        assert "score" in first


def test_api_context_endpoint_contract():
    from app.main import app
    client = TestClient(app)

    mock_context = {
        "tables": [{
            "table_name": "students",
            "description": "Schema: public\nTable: students",
            "relationships": [],
            "metadata": {"name": "students"},
            "score": 0.9,
            "is_bridge": False,
            "provenance": "semantic",
        }],
        "join_conditions": ["attendance.student_id = students.id"],
        "allowed_tables": ["attendance", "students"],
        "prompt_context": "### Database Schema Context...",
    }

    with patch("app.main.retrieve_schema_context", return_value=mock_context):
        response = client.post(
            "/rag/context",
            json={"question": "show students", "top_k": 3, "max_bridge_tables": 2},
        )
        assert response.status_code == 200
        data = response.json()
        assert "tables" in data
        assert "join_conditions" in data
        assert "allowed_tables" in data
        assert "prompt_context" in data
        assert data["allowed_tables"] == ["attendance", "students"]


def test_multi_user_and_dataset_isolation():
    loader = Mock()
    loader.load.return_value = FIVE_TABLE_SCHEMA
    encoder = FiveTableVectorEncoder()
    service = RetrievalService(loader, encoder=encoder)

    # Refresh user_1 on dataset_1
    service.refresh(user_id="user_1", dataset_id="dataset_1")

    # Refresh user_2 on dataset_2 with 2-table schema
    loader.load.return_value = SCHEMA
    service.refresh(user_id="user_2", dataset_id="dataset_2")

    # user_1 should see 5 tables
    res_1 = service.retrieve("students", user_id="user_1", dataset_id="dataset_1")
    assert len(res_1) > 0

    # user_2 should see 2 tables
    res_2 = service.retrieve("students", user_id="user_2", dataset_id="dataset_2")
    assert len(res_2) > 0

    # unrefreshed user_3 should raise RetrievalError
    with pytest.raises(RetrievalError, match="schema index has not been refreshed"):
        service.retrieve("students", user_id="user_3", dataset_id="dataset_3")


def test_failed_refresh_preserves_previous_valid_index():
    loader = Mock()
    loader.load.return_value = SCHEMA
    encoder = VectorEncoder()
    service = RetrievalService(loader, encoder=encoder)

    # First refresh succeeds
    assert service.refresh() == 2
    res_before = service.retrieve("students")
    assert len(res_before) > 0

    # Second refresh fails due to network error
    loader.load.side_effect = SchemaConnectionError("database connection timeout")
    with pytest.raises(SchemaConnectionError):
        service.refresh()

    # Previous index must remain intact and searchable!
    res_after = service.retrieve("students")
    assert len(res_after) == len(res_before)
    assert res_after[0]["table_name"] == res_before[0]["table_name"]


def test_empty_schema_refresh_fails_gracefully():
    loader = Mock()
    loader.load.return_value = {"schema": "public", "tables": []}
    service = RetrievalService(loader)
    with pytest.raises(RetrievalError, match="schema contains no tables to index"):
        service.refresh()


def test_junction_alone_attendance_expands_courses_and_students():
    loader = Mock()
    loader.load.return_value = FIVE_TABLE_SCHEMA

    class AttendanceOnlyEncoder:
        def encode(self, sentences, **kwargs):
            table_keys = ["attendance", "courses", "students", "placements", "companies"]
            vectors = []
            for sentence in sentences:
                text = sentence.lower()
                vec = [0.0] * len(table_keys)
                for i, key in enumerate(table_keys):
                    if f"table: {key}" in text:
                        vec[i] = 10.0
                    elif key in text:
                        vec[i] = 1.0
                vectors.append(vec)
            return np.asarray(vectors, dtype="float32")

    service = RetrievalService(loader, encoder=AttendanceOnlyEncoder())
    service.refresh()

    context = service.retrieve_context(
        question="attendance",
        top_k=1,
        max_bridge_tables=2,
    )

    table_names = [t["table_name"] for t in context["tables"]]
    assert len(table_names) == 3
    assert set(table_names) == {"attendance", "courses", "students"}

    tables_by_name = {t["table_name"]: t for t in context["tables"]}
    assert tables_by_name["attendance"]["is_bridge"] is False
    assert tables_by_name["attendance"]["provenance"] == "semantic"
    assert tables_by_name["attendance"]["score"] is not None

    assert tables_by_name["courses"]["is_bridge"] is True
    assert tables_by_name["courses"]["provenance"] == "relationship_expansion"
    assert tables_by_name["courses"]["score"] is None

    assert tables_by_name["students"]["is_bridge"] is True
    assert tables_by_name["students"]["provenance"] == "relationship_expansion"
    assert tables_by_name["students"]["score"] is None

    assert context["join_conditions"] == [
        "attendance.course_id = courses.id",
        "attendance.student_id = students.id",
    ]
    assert context["allowed_tables"] == ["attendance", "courses", "students"]


def test_junction_alone_placements_expands_companies_and_students():
    loader = Mock()
    loader.load.return_value = FIVE_TABLE_SCHEMA

    class PlacementsOnlyEncoder:
        def encode(self, sentences, **kwargs):
            table_keys = ["placements", "companies", "students", "courses", "attendance"]
            vectors = []
            for sentence in sentences:
                text = sentence.lower()
                vec = [0.0] * len(table_keys)
                for i, key in enumerate(table_keys):
                    if f"table: {key}" in text:
                        vec[i] = 10.0
                    elif key in text:
                        vec[i] = 1.0
                vectors.append(vec)
            return np.asarray(vectors, dtype="float32")

    service = RetrievalService(loader, encoder=PlacementsOnlyEncoder())
    service.refresh()

    context = service.retrieve_context(
        question="placements",
        top_k=1,
        max_bridge_tables=2,
    )

    table_names = [t["table_name"] for t in context["tables"]]
    assert len(table_names) == 3
    assert set(table_names) == {"placements", "companies", "students"}

    tables_by_name = {t["table_name"]: t for t in context["tables"]}
    assert tables_by_name["placements"]["is_bridge"] is False
    assert tables_by_name["placements"]["provenance"] == "semantic"
    assert tables_by_name["placements"]["score"] is not None

    assert tables_by_name["companies"]["is_bridge"] is True
    assert tables_by_name["companies"]["provenance"] == "relationship_expansion"
    assert tables_by_name["companies"]["score"] is None

    assert tables_by_name["students"]["is_bridge"] is True
    assert tables_by_name["students"]["provenance"] == "relationship_expansion"
    assert tables_by_name["students"]["score"] is None

    assert context["join_conditions"] == [
        "placements.company_id = companies.id",
        "placements.student_id = students.id",
    ]
    assert context["allowed_tables"] == ["companies", "placements", "students"]


def test_junction_alone_attendance_respects_single_bridge_limit():
    loader = Mock()
    loader.load.return_value = FIVE_TABLE_SCHEMA

    class AttendanceOnlyEncoder:
        def encode(self, sentences, **kwargs):
            table_keys = ["attendance", "courses", "students", "placements", "companies"]
            vectors = []
            for sentence in sentences:
                text = sentence.lower()
                vec = [0.0] * len(table_keys)
                for i, key in enumerate(table_keys):
                    if f"table: {key}" in text:
                        vec[i] = 10.0
                    elif key in text:
                        vec[i] = 1.0
                vectors.append(vec)
            return np.asarray(vectors, dtype="float32")

    service = RetrievalService(loader, encoder=AttendanceOnlyEncoder())
    service.refresh()

    context = service.retrieve_context(
        question="attendance",
        top_k=1,
        max_bridge_tables=1,
    )

    table_names = [t["table_name"] for t in context["tables"]]
    assert len(table_names) == 2
    # Deterministic tie-break chooses courses before students
    assert table_names == ["attendance", "courses"]

    bridge_tables = [t for t in context["tables"] if t["is_bridge"]]
    assert len(bridge_tables) == 1
    assert bridge_tables[0]["table_name"] == "courses"
    assert bridge_tables[0]["provenance"] == "relationship_expansion"

    assert context["join_conditions"] == ["attendance.course_id = courses.id"]
    assert context["allowed_tables"] == ["attendance", "courses"]
def test_junction_alone_attendance_respects_zero_bridge_limit():
    loader = Mock()
    loader.load.return_value = FIVE_TABLE_SCHEMA

    class AttendanceOnlyEncoder:
        def encode(self, sentences, **kwargs):
            table_keys = ["attendance", "courses", "students", "placements", "companies"]
            vectors = []
            for sentence in sentences:
                text = sentence.lower()
                vec = [0.0] * len(table_keys)
                for i, key in enumerate(table_keys):
                    if f"table: {key}" in text:
                        vec[i] = 10.0
                    elif key in text:
                        vec[i] = 1.0
                vectors.append(vec)
            return np.asarray(vectors, dtype="float32")

    service = RetrievalService(loader, encoder=AttendanceOnlyEncoder())
    service.refresh()

    context = service.retrieve_context(
        question="attendance",
        top_k=1,
        max_bridge_tables=0,
    )

    table_names = [t["table_name"] for t in context["tables"]]
    assert table_names == ["attendance"]
    assert context["join_conditions"] == []
    assert context["allowed_tables"] == ["attendance"]


def test_parent_alone_courses_expands_query_relevant_attendance():
    loader = Mock()
    loader.load.return_value = FIVE_TABLE_SCHEMA

    class CoursesOnlyEncoder:
        def encode(self, sentences, **kwargs):
            table_keys = ["courses", "attendance", "students", "placements", "companies"]
            vectors = []
            for sentence in sentences:
                text = sentence.lower()
                vec = [0.0] * len(table_keys)
                for i, key in enumerate(table_keys):
                    if f"table: {key}" in text:
                        vec[i] = 10.0
                    elif key == "courses" and ("course" in text or "courses" in text):
                        vec[i] = 2.0
                    elif key in text:
                        vec[i] = 1.0
                vectors.append(vec)
            return np.asarray(vectors, dtype="float32")

    service = RetrievalService(loader, encoder=CoursesOnlyEncoder())
    service.refresh()

    context = service.retrieve_context(
        question="Show attendance for each course.",
        top_k=1,
        max_bridge_tables=2,
    )

    table_names = [t["table_name"] for t in context["tables"]]
    assert len(table_names) == 3
    assert set(table_names) == {"courses", "attendance", "students"}

    tables_by_name = {t["table_name"]: t for t in context["tables"]}
    assert tables_by_name["courses"]["is_bridge"] is False
    assert tables_by_name["courses"]["provenance"] == "semantic"
    assert tables_by_name["courses"]["score"] is not None

    assert tables_by_name["attendance"]["is_bridge"] is True
    assert tables_by_name["attendance"]["provenance"] == "relationship_expansion"
    assert tables_by_name["attendance"]["score"] is None

    assert tables_by_name["students"]["is_bridge"] is True
    assert tables_by_name["students"]["provenance"] == "relationship_expansion"
    assert tables_by_name["students"]["score"] is None

    assert context["join_conditions"] == [
        "attendance.course_id = courses.id",
        "attendance.student_id = students.id",
    ]
    assert context["allowed_tables"] == ["attendance", "courses", "students"]


def test_parent_alone_courses_does_not_expand_when_query_irrelevant():
    loader = Mock()
    loader.load.return_value = FIVE_TABLE_SCHEMA

    class CoursesOnlyEncoder:
        def encode(self, sentences, **kwargs):
            table_keys = ["courses", "attendance", "students", "placements", "companies"]
            vectors = []
            for sentence in sentences:
                text = sentence.lower()
                vec = [0.0] * len(table_keys)
                for i, key in enumerate(table_keys):
                    if f"table: {key}" in text:
                        vec[i] = 10.0
                    elif key == "courses" and ("course" in text or "courses" in text):
                        vec[i] = 2.0
                    elif key in text:
                        vec[i] = 1.0
                vectors.append(vec)
            return np.asarray(vectors, dtype="float32")

    service = RetrievalService(loader, encoder=CoursesOnlyEncoder())
    service.refresh()

    context = service.retrieve_context(
        question="Show all courses with credits > 3",
        top_k=1,
        max_bridge_tables=2,
    )

    table_names = [t["table_name"] for t in context["tables"]]
    assert table_names == ["courses"]
    assert context["join_conditions"] == []
    assert context["allowed_tables"] == ["courses"]


def test_parent_alone_courses_with_single_bridge_limit():
    loader = Mock()
    loader.load.return_value = FIVE_TABLE_SCHEMA

    class CoursesOnlyEncoder:
        def encode(self, sentences, **kwargs):
            table_keys = ["courses", "attendance", "students", "placements", "companies"]
            vectors = []
            for sentence in sentences:
                text = sentence.lower()
                vec = [0.0] * len(table_keys)
                for i, key in enumerate(table_keys):
                    if f"table: {key}" in text:
                        vec[i] = 10.0
                    elif key == "courses" and ("course" in text or "courses" in text):
                        vec[i] = 2.0
                    elif key in text:
                        vec[i] = 1.0
                vectors.append(vec)
            return np.asarray(vectors, dtype="float32")

    service = RetrievalService(loader, encoder=CoursesOnlyEncoder())
    service.refresh()

    context = service.retrieve_context(
        question="Show attendance for each course.",
        top_k=1,
        max_bridge_tables=1,
    )

    table_names = [t["table_name"] for t in context["tables"]]
    assert table_names == ["courses", "attendance"]
    assert context["join_conditions"] == ["attendance.course_id = courses.id"]
    assert context["allowed_tables"] == ["attendance", "courses"]
