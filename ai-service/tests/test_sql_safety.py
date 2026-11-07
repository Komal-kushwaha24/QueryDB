import pytest

from app.sql_safety.validator import validate_sql


def test_valid_simple_select():
    result = validate_sql("SELECT id, name FROM students WHERE id = 1;")
    assert result.is_valid is True
    assert result.is_safe is True
    assert result.tables_used == ["students"]
    assert "SELECT" in result.sanitized_sql
    assert len(result.errors) == 0


def test_valid_join_select_with_allowed_tables():
    sql = """
    SELECT s.name, c.name, a.percentage
    FROM students s
    JOIN attendance a ON s.id = a.student_id
    JOIN courses c ON a.course_id = c.id
    WHERE a.percentage < 75;
    """
    allowed = ["students", "attendance", "courses"]
    result = validate_sql(sql, allowed_tables=allowed)
    assert result.is_valid is True
    assert result.is_safe is True
    assert set(result.tables_used) == {"students", "attendance", "courses"}
    assert len(result.errors) == 0


def test_valid_cte_select_ignores_cte_alias_in_tables_used():
    sql = """
    WITH high_attendance AS (
        SELECT student_id, percentage FROM attendance WHERE percentage > 90
    )
    SELECT s.name, ha.percentage
    FROM students s
    JOIN high_attendance ha ON s.id = ha.student_id;
    """
    allowed = ["students", "attendance"]
    result = validate_sql(sql, allowed_tables=allowed)
    assert result.is_valid is True
    assert result.is_safe is True
    assert "high_attendance" not in result.tables_used
    assert set(result.tables_used) == {"attendance", "students"}
    assert len(result.errors) == 0


def test_valid_union_select():
    sql = "SELECT id, name FROM students UNION SELECT id, name FROM companies;"
    result = validate_sql(sql, allowed_tables=["students", "companies"])
    assert result.is_valid is True
    assert result.is_safe is True
    assert set(result.tables_used) == {"students", "companies"}
    assert len(result.errors) == 0


def test_empty_sql_rejected():
    for empty in ["", "   ", "\n\t  ", None]:
        result = validate_sql(empty)
        assert result.is_valid is False
        assert result.is_safe is False
        assert "empty" in result.errors[0].lower()


def test_syntax_error_rejected():
    invalid_sql = "SELECT FROM WHERE;"
    result = validate_sql(invalid_sql)
    assert result.is_valid is False
    assert result.is_safe is False
    assert any("syntax" in err.lower() for err in result.errors)


def test_multiple_statements_rejected():
    sql = "SELECT * FROM students; DROP TABLE students;"
    result = validate_sql(sql)
    assert result.is_valid is False
    assert result.is_safe is False
    assert any("multiple" in err.lower() for err in result.errors)


@pytest.mark.parametrize(
    "mutating_sql",
    [
        "DROP TABLE students;",
        "DELETE FROM students WHERE id = 1;",
        "UPDATE students SET name = 'Hacked';",
        "INSERT INTO students (id, name) VALUES (99, 'New');",
        "ALTER TABLE students DROP COLUMN name;",
        "TRUNCATE TABLE students;",
    ],
)
def test_mutating_sql_rejected(mutating_sql: str):
    result = validate_sql(mutating_sql)
    assert result.is_valid is False
    assert result.is_safe is False
    assert len(result.errors) > 0


def test_disallowed_table_flagged():
    sql = "SELECT s.name, u.email FROM students s JOIN users u ON s.id = u.student_id;"
    allowed = ["students", "attendance"]
    result = validate_sql(sql, allowed_tables=allowed)
    assert result.is_valid is False
    assert result.is_safe is True
    assert "users" in result.tables_used
    assert any("users" in err for err in result.errors)


def test_case_insensitive_allowed_tables_matching():
    sql = "SELECT * FROM Students JOIN Attendance ON Students.id = Attendance.student_id;"
    allowed = ["students", "attendance"]
    result = validate_sql(sql, allowed_tables=allowed)
    assert result.is_valid is True
    assert result.is_safe is True
    assert set(result.tables_used) == {"students", "attendance"}
