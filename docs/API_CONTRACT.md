# QueryDB — API Contract v1.0

**Project:** QueryDB  
**Purpose:** Natural-language querying of PostgreSQL databases using AI and schema-aware RAG.

## 1. Base URLs

| Service | Development URL |
|---|---|
| React Frontend | `http://localhost:5173` |
| Express Backend | `http://localhost:3000` |
| FastAPI AI Service | `http://localhost:8000` |
| PostgreSQL | `localhost:5432` |

Frontend environment variable:

```env
VITE_API_BASE_URL=http://localhost:3000
```

Node.js backend environment variables:

```env
PORT=3000
AI_SERVICE_URL=http://localhost:8000
```

Use the existing PostgreSQL environment configuration. Do not commit passwords or other secrets.

---

## 2. Existing Backend APIs

These APIs are already implemented and tested. Preserve their existing behavior.

### 2.1 GET `/api/health`

**Owner:** Existing backend / Team Lead

Purpose: Check whether the backend is running.

Do not change the existing response format without coordinating with the team.

### 2.2 GET `/api/health/db`

**Owner:** Existing backend / Team Lead

Purpose: Check database connectivity.

Expected status: HTTP 200 when the database connection is healthy.

Preserve the existing response format.

### 2.3 GET `/api/schema`

**Owner:** Existing backend / Team Lead

Purpose: Retrieve database schema metadata.

The current implementation provides information about:
- Table names
- Column names and data types
- Column nullability
- Primary keys
- Foreign-key relationships

The existing schema endpoint has already been tested with the five project tables and four foreign-key relationships.

**Important:** Do not create a duplicate schema endpoint or unnecessarily change its response structure. The AI service can consume the schema information provided by the backend.

---

# 3. API: Generate SQL

**Endpoint:** `POST /api/ai/generate-sql`

**Owner:** Member 3 — Text-to-SQL + RAG

**Service:** FastAPI AI service

### Purpose

Convert a natural-language question into PostgreSQL SQL using relevant schema metadata and retrieved business definitions.

### Request

```json
{
  "question": "Find students whose CGPA is greater than 8"
}
```

### Response — Success

HTTP 200

```json
{
  "success": true,
  "sql": "SELECT * FROM students WHERE cgpa > 8",
  "confidence": 0.95
}
```

### Field definitions

| Field | Type | Required | Description |
|---|---|---|---|
| `question` | string | Yes | User's natural-language question |
| `success` | boolean | Yes in response | Whether SQL generation succeeded |
| `sql` | string | Yes on success | Generated PostgreSQL SQL |
| `confidence` | number or null | Yes in response | Optional model confidence estimate, if supported |

The confidence score is an estimate, not proof that the SQL is correct or safe.

### Error response

HTTP 422 for invalid input:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "A non-empty question is required."
  }
}
```

HTTP 500 for an unexpected generation failure:

```json
{
  "success": false,
  "error": {
    "code": "SQL_GENERATION_FAILED",
    "message": "SQL generation failed."
  }
}
```

### Rules

1. Use schema metadata to identify relevant tables and columns.
2. Generate PostgreSQL-compatible SQL.
3. Do not execute the generated SQL.
4. Do not return fabricated database results.
5. Do not assume that generated SQL is safe.
6. If the question is ambiguous, coordinate with the clarification workflow rather than guessing.

**Integration note:** The browser should call the Express backend for the normal application workflow. Express will call FastAPI internally. The FastAPI endpoint can also be tested directly during development.

---

# 4. API: Query Understanding / Clarification

**Endpoint:** `POST /api/ai/clarify`

**Owner:** Member 4 — Query Understanding

### Purpose

Determine whether a user's question requires clarification before SQL generation.

For example, the question "Show top students" is ambiguous because "top" could refer to CGPA, placement status, or another criterion.

### Request

```json
{
  "question": "Show the top students",
  "schema_context": {}
}
```

`schema_context` is optional. When supplied, it contains relevant schema metadata or business definitions. Member 4 should coordinate with Member 3 about the schema representation.

### Response — Clarification Required

HTTP 200

```json
{
  "success": true,
  "needs_clarification": true,
  "clarification_question": "Do you want to rank students by CGPA or placement status?",
  "options": [
    "CGPA",
    "Placement status"
  ]
}
```

### Response — No Clarification Required

HTTP 200

```json
{
  "success": true,
  "needs_clarification": false,
  "clarification_question": null,
  "options": []
}
```

### Field definitions

| Field | Type | Description |
|---|---|---|
| `question` | string | Original user question |
| `schema_context` | object, optional | Relevant schema metadata |
| `success` | boolean | Whether clarification analysis succeeded |
| `needs_clarification` | boolean | Whether more information is required |
| `clarification_question` | string or null | Question to ask the user |
| `options` | array of strings | Suggested clarification choices |

### Error response

```json
{
  "success": false,
  "error": {
    "code": "CLARIFICATION_FAILED",
    "message": "Unable to analyze the question."
  }
}
```

### Rules

1. Do not invent missing business requirements.
2. Ask a clarification question when ambiguity materially affects the query.
3. If clarification is unnecessary, set `needs_clarification` to `false`.
4. Do not execute SQL.
5. Coordinate with Member 3 to avoid duplicating SQL-generation logic.

---

# 5. API: Explain SQL

**Endpoint:** `POST /api/ai/explain`

**Owner:** Member 4 — Query Understanding

### Purpose

Explain the generated SQL in language understandable to the user.

### Request

```json
{
  "question": "Find students whose CGPA is greater than 8",
  "sql": "SELECT * FROM students WHERE cgpa > 8"
}
```

### Response — Success

HTTP 200

```json
{
  "success": true,
  "explanation": "This query retrieves all columns for students whose CGPA is greater than 8."
}
```

### Field definitions

| Field | Type | Description |
|---|---|---|
| `question` | string | Original user question |
| `sql` | string | SQL to explain |
| `success` | boolean | Whether explanation generation succeeded |
| `explanation` | string | Human-readable SQL explanation |

### Error response

```json
{
  "success": false,
  "error": {
    "code": "EXPLANATION_FAILED",
    "message": "Unable to explain the SQL query."
  }
}
```

### Rules

1. Explain what the supplied SQL actually does.
2. Do not claim that the query has been executed.
3. Do not fabricate query results.
4. Do not modify or execute the SQL as part of the explanation endpoint.

---

# 6. API: Execute User Query

**Endpoint:** `POST /api/query`

**Owner:** Team Lead

**Service:** Node.js + Express

### Purpose

Coordinate the query workflow, validate SQL, execute approved queries against PostgreSQL, and return real database results.

### Request

```json
{
  "question": "Find students whose CGPA is greater than 8"
}
```

The frontend submits the natural-language question. It does not need to generate SQL itself.

### Internal workflow

1. Receive the user's question.
2. Validate the request.
3. Send the question to the clarification service when appropriate.
4. If clarification is required, return the clarification response.
5. Otherwise, request SQL generation from FastAPI.
6. Validate the generated SQL.
7. Enforce table/column permissions and read-only restrictions.
8. Apply query timeouts and row limits.
9. Execute approved SQL using the restricted PostgreSQL account.
10. Return the actual database results.

### Response — Clarification Required

HTTP 200

```json
{
  "success": true,
  "status": "clarification_required",
  "clarification": {
    "question": "Do you want to rank students by CGPA or placement status?",
    "options": [
      "CGPA",
      "Placement status"
    ]
  }
}
```

### Response — Query Executed Successfully

HTTP 200

```json
{
  "success": true,
  "status": "completed",
  "question": "Find students whose CGPA is greater than 8",
  "sql": "SELECT * FROM students WHERE cgpa > 8",
  "explanation": "This query retrieves students whose CGPA is greater than 8.",
  "columns": [
    "id",
    "name",
    "cgpa"
  ],
  "rows": [
    {
      "id": 1,
      "name": "Rahul",
      "cgpa": 8.5
    }
  ],
  "rowCount": 1
}
```

The example contains illustrative data. In the actual application, `rows`, `columns`, and `rowCount` must come from PostgreSQL. The example SQL and explanation must correspond to the SQL actually executed.

The example shows a shortened set of columns for readability; actual returned columns depend on the query.

### Response — SQL Rejected

HTTP 400

```json
{
  "success": false,
  "status": "rejected",
  "error": {
    "code": "UNSAFE_QUERY",
    "message": "The generated SQL did not pass the safety checks."
  }
}
```

### Response — Execution Error

HTTP 500

```json
{
  "success": false,
  "status": "error",
  "error": {
    "code": "QUERY_EXECUTION_FAILED",
    "message": "The query could not be executed."
  }
}
```

### Field definitions

| Field | Type | Description |
|---|---|---|
| `success` | boolean | Whether the requested operation succeeded |
| `status` | string | `completed`, `clarification_required`, `rejected`, or `error` |
| `question` | string | Original question |
| `sql` | string | SQL actually executed |
| `explanation` | string | Optional human-readable explanation |
| `clarification` | object | Present when more information is required |
| `columns` | array of strings | Column names returned by PostgreSQL |
| `rows` | array of objects | Actual database records |
| `rowCount` | integer | Number of returned rows |
| `error` | object | Present when an operation fails |

Fields that do not apply to a particular response may be omitted. Do not return fake rows when clarification is required or execution fails.

### Security requirements

1. Only approved read-only queries may execute.
2. Use a restricted database account.
3. Validate SQL with a parser and explicit authorization checks.
4. Reject data-modifying statements and unsafe multi-statement queries.
5. Enforce statement timeouts and result-size limits.
6. Do not rely on the LLM alone for SQL safety.
7. Never expose database credentials in API responses.
8. Do not return raw database errors containing sensitive connection details.

---

# 7. Frontend Clarification Workflow

The frontend should preserve the original question and any clarification answers.

### Initial request

```json
{
  "question": "Show the top students"
}
```

### Backend clarification response

```json
{
  "success": true,
  "status": "clarification_required",
  "clarification": {
    "question": "Do you want to rank students by CGPA or placement status?",
    "options": [
      "CGPA",
      "Placement status"
    ]
  }
}
```

The UI displays the clarification question and available options.

### Submit the clarified question

For v1, the frontend can send the resolved question to the existing `POST /api/query` endpoint:

```json
{
  "question": "Show the top 10 students ranked by CGPA"
}
```

The backend then runs the normal clarification, generation, validation, and execution workflow.

**Important:** Do not add a separate clarification-answer endpoint for v1 unless the team agrees it is necessary. If conversation history or multi-turn context is later required, the contract can be extended with a `conversationId` or another agreed mechanism.

---

# 8. Common Error Format

All newly implemented endpoints should follow this format for errors:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "A clear, user-safe error message."
  }
}
```

Suggested HTTP status codes:

| Status | Meaning |
|---|---|
| `200` | Request processed successfully |
| `400` | Invalid request or unsafe query |
| `422` | Request validation failed |
| `500` | Unexpected internal error |
| `502` | Required downstream service failed |
| `504` | Downstream service timed out |

Use `502` or `504` when the Express backend cannot obtain a usable response from the AI service. Preserve the common error format.

Do not expose stack traces, credentials, or sensitive database details to the frontend.

---

# 9. Responsibilities and Ownership

| Member | Feature | Primary ownership |
|---|---|---|
| Team Lead | Safe SQL Execution | `POST /api/query`, validation, authorization, execution |
| Member 2 | Query Dashboard | React UI, API calls, results table, loading/error/clarification states |
| Member 3 | Text-to-SQL + RAG | `POST /api/ai/generate-sql`, schema retrieval, SQL generation |
| Member 4 | Query Understanding | `POST /api/ai/clarify`, `POST /api/ai/explain` |

Each member should own implementation, tests, and documentation for their feature.

Members must coordinate any changes to shared entry-point files. Separate branches alone do not prevent merge conflicts.

---

# 10. Git and Integration Rules

1. Update local `main` before creating a new feature branch.
2. Keep feature work on the assigned branch.
3. Avoid direct pushes to `main`.
4. Do not rename API fields without agreement.
5. Do not change existing endpoint behavior without review.
6. Do not modify another member's modules without coordination.
7. Test the feature locally before opening a PR.
8. Include sample requests and responses in the PR description.
9. Review and test the integrated workflow before merging.
10. Never commit `.env` files, passwords, or API keys.

### Acceptance criteria

The project is ready for an end-to-end demonstration when:

- The existing health and schema endpoints still work.
- A user can submit a natural-language question through React.
- The backend can obtain schema-aware SQL from the AI service.
- Ambiguous questions can trigger clarification.
- Unsafe SQL is rejected before execution.
- Approved queries execute against PostgreSQL.
- The UI displays actual query results.
- SQL explanation, loading states, and error states work.
- The project runs using documented setup instructions.

**End of API Contract v1.0**