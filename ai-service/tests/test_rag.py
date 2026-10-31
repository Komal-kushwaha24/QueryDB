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
from app.rag.retrieval import RetrievalError, RetrievalService
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
