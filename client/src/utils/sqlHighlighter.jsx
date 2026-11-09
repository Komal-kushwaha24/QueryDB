export function formatSqlTokens(sql) {
  if (!sql) return null;

  const lines = sql.split('\n');

  return lines.map((line, lineIndex) => {
    // Regex matching keywords, functions, strings, and numbers
    const tokenRegex = /('(?:''|[^'])*'|\b(?:SELECT|FROM|WHERE|JOIN|INNER\s+JOIN|LEFT\s+JOIN|ON|GROUP\s+BY|ORDER\s+BY|LIMIT|AND|OR|AS|DESC|ASC|HAVING|IN|NOT|LIKE|IS|NULL)\b|\b(?:ROUND|AVG|COUNT|SUM|MIN|MAX)\b|\b\d+(?:\.\d+)?\b|[(),;])/gi;

    let lastIdx = 0;
    const elements = [];
    let match;

    while ((match = tokenRegex.exec(line)) !== null) {
      // Plain text before token
      if (match.index > lastIdx) {
        elements.push(line.slice(lastIdx, match.index));
      }

      const token = match[0];
      const upperToken = token.toUpperCase();

      if (/^'.*'$/.test(token)) {
        elements.push(
          <span key={`${lineIndex}-${match.index}`} className="sql-string">
            {token}
          </span>
        );
      } else if (['ROUND', 'AVG', 'COUNT', 'SUM', 'MIN', 'MAX'].includes(upperToken)) {
        elements.push(
          <span key={`${lineIndex}-${match.index}`} className="sql-func">
            {token}
          </span>
        );
      } else if (
        ['SELECT', 'FROM', 'WHERE', 'JOIN', 'ON', 'LIMIT', 'AND', 'OR', 'AS', 'DESC', 'ASC', 'HAVING', 'IN', 'NOT', 'LIKE', 'IS', 'NULL'].includes(upperToken) ||
        upperToken.includes('JOIN') ||
        upperToken.includes('BY')
      ) {
        elements.push(
          <span key={`${lineIndex}-${match.index}`} className="sql-keyword">
            {token}
          </span>
        );
      } else if (/^\d+(\.\d+)?$/.test(token)) {
        elements.push(
          <span key={`${lineIndex}-${match.index}`} className="sql-number">
            {token}
          </span>
        );
      } else if (['(', ')', ',', ';'].includes(token)) {
        elements.push(
          <span key={`${lineIndex}-${match.index}`} className="sql-punct">
            {token}
          </span>
        );
      } else {
        elements.push(token);
      }

      lastIdx = tokenRegex.lastIndex;
    }

    if (lastIdx < line.length) {
      elements.push(line.slice(lastIdx));
    }

    return (
      <div key={lineIndex} className="table-row">
        <span className="table-cell select-none pr-4 text-right opacity-40 font-mono text-xs border-r border-[var(--color-rule)] text-[var(--color-muted)]">
          {lineIndex + 1}
        </span>
        <span className="table-cell pl-4 font-mono text-xs text-[var(--color-ink)] whitespace-pre">
          {elements}
        </span>
      </div>
    );
  });
}
