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
- `docs/`: project architecture and design documentation.


