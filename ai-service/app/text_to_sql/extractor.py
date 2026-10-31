import re


def extract_sql(response_text: str) -> str:
    """Extracts clean SQL query from LLM response text, removing markdown code blocks and preamble."""
    if not response_text or not response_text.strip():
        return ""

    text = response_text.strip()

    # Pattern to match fenced code blocks like ```sql ... ``` or ``` ... ```
    pattern = r"```(?:sql|postgresql|postgres)?\s*([\s\S]*?)\s*```"
    matches = re.findall(pattern, text, flags=re.IGNORECASE)

    if matches:
        # If multiple blocks, prefer one that starts with or contains SELECT
        candidate = matches[0]
        for match in matches:
            if re.search(r"\bSELECT\b", match, re.IGNORECASE):
                candidate = match
                break
        sql = candidate.strip()
    else:
        # If no code fences found, strip common markdown backticks or line prefixes
        lines = [line.strip() for line in text.splitlines()]
        # Filter out lines that look like markdown notes or conversational intros
        sql_lines = []
        for line in lines:
            if line.startswith("```"):
                continue
            sql_lines.append(line)
        sql = "\n".join(sql_lines).strip()

    # Strip inline or enclosing backticks
    sql = sql.strip("`").strip()

    return sql
