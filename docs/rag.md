# Schema-aware RAG

The Python RAG module retrieves the database schema through QueryDB's Express API; it never connects directly to PostgreSQL.

## Schema loading and refresh

`SchemaLoader` reads `SCHEMA_API_URL`, which defaults to `http://localhost:3000/api/schema`, and validates the JSON shape before using it. Connection failures, HTTP failures, timeouts, and malformed payloads raise typed `SchemaLoaderError` subclasses.

Start the Express API, then refresh the application index:

```powershell
Invoke-RestMethod -Method Post http://localhost:8000/rag/refresh
```

In Python:

```python
from app.rag.retrieval import refresh_schema
refresh_schema()
```

Refresh after schema changes. Refreshing replaces the index for the selected user/dataset scope and does not rebuild automatically for every question.

## Documents and embeddings

Each table becomes a retrieval document containing its schema, table name, typed columns, primary keys, foreign keys, and relationship descriptions. The original table metadata remains in each document's `metadata` field.

Documents and questions are encoded once by the process-wide `SentenceTransformer` singleton using `all-MiniLM-L6-v2` (`EMBEDDING_MODEL` can override this model). Embeddings are converted to float32 and L2-normalized.

## FAISS retrieval

`SchemaVectorIndex` uses FAISS `IndexFlatIP` and normalized vectors, so inner product equals cosine similarity. Each FAISS position is paired with the document at the same position in the index document list. Retrieval is limited by validated positive `top_k` values and is empty-safe.

Retrieve semantic table matches after refreshing:

```powershell
Invoke-RestMethod -Method Post http://localhost:8000/rag/retrieve -Body '{"question":"Which students were placed at companies?","top_k":3}' -ContentType 'application/json'
```

For future authenticated access, `RetrievalService` keys indexes by `(user_id, dataset_id)`. Callers must provide the authenticated user and selected dataset rather than sharing indexes across unrelated users.

## Tests

From the repository root, run:

```powershell
cd ai-service
.\.venv\Scripts\python.exe -m pytest
```

Tests mock the Express response and embedding encoder. They do not require Express, a model download, Gemini, or PostgreSQL.
