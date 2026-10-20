# QueryDB Architecture

This document describes the planned service boundaries. The repository is scaffolding only; no database, AI, authentication, or query execution functionality is implemented.

## React client

The Vite-powered React application provides the user interface for submitting natural-language questions and viewing responses. Frontend services will call the Express API; the browser will not connect directly to PostgreSQL or the AI service.

## Express backend

The Node.js/Express service is the main application API. It will own request orchestration, validation at the API boundary, and communication with the separate AI service. It is the future gatekeeper for approved read-only database requests.

## FastAPI AI service

The Python/FastAPI service is separate from the main backend and will own AI-oriented operations. Pydantic will define and validate service request and response shapes.

## Retrieval and ambiguity

The RAG module will represent database schema information as embeddings and use FAISS for similarity retrieval. Retrieved schema context will inform question interpretation and SQL generation. The ambiguity module will identify questions that need clarification before generation.

## Text-to-SQL and SQL safety

The text-to-SQL module will generate candidate PostgreSQL statements using an LLM and relevant schema context. The SQL-safety module will parse and inspect candidate statements with sqlglot before the main backend considers execution. Validation is a required boundary, not a substitute for database-level read-only permissions.

## PostgreSQL

PostgreSQL is the target data store. The `database/` directory reserves schema and seed scripts. Future execution must use a restricted read-only database role and enforce query limits; connection handling is not part of this scaffold.
