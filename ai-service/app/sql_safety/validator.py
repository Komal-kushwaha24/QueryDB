import logging
from typing import Iterable, Sequence

from pydantic import BaseModel, Field
import sqlglot
from sqlglot import expressions as exp
from sqlglot.errors import ParseError

logger = logging.getLogger(__name__)

FORBIDDEN_EXPRESSIONS: tuple[type[exp.Expression], ...] = (
    exp.Insert,
    exp.Update,
    exp.Delete,
    exp.Drop,
    exp.Alter,
    exp.Create,
    exp.Command,
    exp.TruncateTable,
    exp.Transaction,
    exp.Commit,
    exp.Rollback,
    exp.Set,
    exp.Grant,
    exp.Revoke,
    exp.Merge,
    exp.Copy,
    exp.Kill,
)


class SQLValidationResult(BaseModel):
    is_valid: bool = Field(description="Whether the SQL is syntactically valid and complies with all rules.")
    is_safe: bool = Field(description="Whether the SQL is strictly read-only and non-destructive.")
    sanitized_sql: str = Field(default="", description="The normalized SQL query string.")
    tables_used: list[str] = Field(default_factory=list, description="Unique table names referenced in the query.")
    errors: list[str] = Field(default_factory=list, description="List of validation errors or safety violations.")


def validate_sql(
    sql: str,
    allowed_tables: Sequence[str] | Iterable[str] | None = None,
) -> SQLValidationResult:
    """Parses and validates a candidate SQL query for syntax, read-only safety, and schema boundaries."""
    if not sql or not sql.strip():
        return SQLValidationResult(
            is_valid=False,
            is_safe=False,
            sanitized_sql="",
            tables_used=[],
            errors=["SQL query cannot be empty or whitespace."],
        )

    clean_sql = sql.strip().rstrip(";")

    try:
        statements = sqlglot.parse(clean_sql, read="postgres", error_level=sqlglot.ErrorLevel.RAISE)
    except ParseError as exc:
        return SQLValidationResult(
            is_valid=False,
            is_safe=False,
            sanitized_sql=clean_sql,
            tables_used=[],
            errors=[f"SQL syntax error: {exc}"],
        )
    except Exception as exc:
        return SQLValidationResult(
            is_valid=False,
            is_safe=False,
            sanitized_sql=clean_sql,
            tables_used=[],
            errors=[f"Failed to parse SQL: {exc}"],
        )

    valid_stmts = [s for s in statements if s is not None]
    if len(valid_stmts) == 0:
        return SQLValidationResult(
            is_valid=False,
            is_safe=False,
            sanitized_sql=clean_sql,
            tables_used=[],
            errors=["SQL query contains no valid executable statements."],
        )

    if len(valid_stmts) > 1:
        return SQLValidationResult(
            is_valid=False,
            is_safe=False,
            sanitized_sql=clean_sql,
            tables_used=[],
            errors=["Multiple SQL statements are not permitted for security."],
        )

    stmt = valid_stmts[0]
    errors: list[str] = []
    is_safe = True

    # Root statement must be a Select or Union
    if not isinstance(stmt, (exp.Select, exp.Union)):
        is_safe = False
        stmt_type = stmt.key.upper() if hasattr(stmt, "key") and stmt.key else type(stmt).__name__
        errors.append(f"Statement type '{stmt_type}' is not allowed. Only read-only SELECT queries are permitted.")

    # Check for forbidden mutating or administrative expressions anywhere in the AST
    for forbidden in FORBIDDEN_EXPRESSIONS:
        matched = stmt.find(forbidden)
        if matched is not None:
            is_safe = False
            forbidden_name = forbidden.__name__.upper()
            errors.append(f"Forbidden mutating operation '{forbidden_name}' detected in query.")
            break

    # Extract CTE aliases so they are not treated as external tables
    cte_aliases = {
        cte.alias.lower()
        for cte in stmt.find_all(exp.CTE)
        if cte.alias
    }

    # Extract all real table references
    tables_used: list[str] = []
    for table_node in stmt.find_all(exp.Table):
        if table_node.name:
            table_name = table_node.name.lower()
            if table_name not in cte_aliases and table_name not in tables_used:
                tables_used.append(table_name)

    # Validate against allowed_tables if provided
    if allowed_tables is not None:
        allowed_set = {t.lower() for t in allowed_tables}
        disallowed = [t for t in tables_used if t not in allowed_set]
        if disallowed:
            errors.append(
                f"Query references tables not in the allowed schema context: {disallowed}. "
                f"Allowed tables: {sorted(allowed_set)}"
            )

    sanitized_sql = stmt.sql(dialect="postgres")
    is_valid = len(errors) == 0

    return SQLValidationResult(
        is_valid=is_valid,
        is_safe=is_safe,
        sanitized_sql=sanitized_sql,
        tables_used=tables_used,
        errors=errors,
    )
