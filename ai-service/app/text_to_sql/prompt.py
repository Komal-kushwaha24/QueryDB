from typing import Sequence

SYSTEM_INSTRUCTION = """You are QueryDB's expert PostgreSQL SQL generation engine.
Your sole job is to translate natural language questions into accurate, performant, and strictly read-only PostgreSQL queries.

MANDATORY RULES:
1. READ-ONLY QUERIES ONLY: You may only generate SELECT statements (including WITH...SELECT CTEs). Never output INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, or administrative commands.
2. ALLOWED TABLES ONLY: You MUST ONLY query the tables provided in the "ALLOWED TABLES" section. Never hallucinate or reference tables outside this list.
3. SCHEMA INTEGRITY: Use only columns listed in the provided schema context. Do not invent columns.
4. RELATIONSHIPS & JOINS: Use the exact foreign-key join conditions provided in the "JOIN CONDITIONS" section whenever tables need to be combined.
5. POSTGRESQL DIALECT: Output standard PostgreSQL syntax. Use ILIKE for case-insensitive matching where appropriate.
6. OUTPUT FORMAT: Output ONLY the SQL query wrapped in a single ```sql ... ``` markdown code block. Do NOT include explanations, greetings, or conversational preamble."""


def build_sql_prompt(
    question: str,
    schema_context: str,
    allowed_tables: Sequence[str],
    join_conditions: Sequence[str],
) -> str:
    """Builds a structured prompt for the LLM given the user question and RAG schema context."""
    tables_list = ", ".join(sorted(allowed_tables)) if allowed_tables else "None specified"
    joins_list = "\n".join(f"- {jc}" for jc in join_conditions) if join_conditions else "No join conditions specified."

    prompt_parts = [
        "### SCHEMA CONTEXT",
        schema_context.strip(),
        "",
        "### ALLOWED TABLES",
        f"You are strictly restricted to using only these tables: [{tables_list}]",
        "",
        "### JOIN CONDITIONS",
        "When joining tables, you must adhere to these established foreign-key relationships:",
        joins_list,
        "",
        "### USER QUESTION",
        question.strip(),
        "",
        "### INSTRUCTION",
        "Generate the PostgreSQL query that answers the user question above adhering strictly to all rules.",
    ]

    return "\n".join(prompt_parts)
