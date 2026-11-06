# QueryDB

QueryDB is a college project that will let users ask questions about PostgreSQL databases in plain English. The planned workflow retrieves schema context with RAG, identifies ambiguity, generates SQL with an LLM, validates the SQL, and executes approved read-only queries. This repository contains initial scaffolding only; application logic and integrations are not implemented yet.

## Technology stack

- Frontend: React, JavaScript, Vite, and Tailwind CSS
- Main backend: Node.js, JavaScript, and Express.js
- AI service: Python, FastAPI, and Pydantic
- Retrieval: embeddings and FAISS
- SQL validation: sqlglot
- Database: PostgreSQL
- Version control: Git and GitHub

## Folder responsibilities

- `client/`: browser application and frontend API services.
- `server/`: Express API routes, controllers, services, and middleware.
- `ai-service/`: separate FastAPI service with future RAG, ambiguity, text-to-SQL, and SQL-safety modules.
- `database/`: future PostgreSQL schema and seed scripts.
- `evaluation/`: datasets and evaluation materials for later development.

## Schema-aware RAG

The AI service retrieves live table metadata from the Express `/api/schema` endpoint, builds one retrieval document per table, embeds documents with the configured Sentence Transformers model, and searches them with FAISS. See [Schema-aware RAG](docs/rag.md) for loading, refresh, retrieval, and test instructions.
- `docs/`: project architecture and design documentation.


