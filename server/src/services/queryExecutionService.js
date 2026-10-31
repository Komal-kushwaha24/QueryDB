import pool from '../config/database.js';

/**
 * Executes an approved read-only SQL query against PostgreSQL with strict safeguards.
 *
 * @param {string} sql - The SQL statement to execute.
 * @param {object} [options]
 * @param {number} [options.statementTimeout=5000] - Statement timeout in milliseconds.
 * @returns {Promise<{ columns: string[], rows: object[], rowCount: number }>}
 */
export async function executeReadOnlyQuery(sql, options = {}) {
  if (!sql || typeof sql !== 'string' || !sql.trim()) {
    const error = new Error('SQL query cannot be empty.');
    error.code = 'INVALID_SQL';
    error.statusCode = 400;
    throw error;
  }

  const timeoutMs = options.statementTimeout || 5000;
  const client = await pool.connect();

  try {
    // 1. Enforce read-only transaction mode so mutating queries fail at DB engine level
    await client.query('BEGIN READ ONLY');

    // 2. Set strict local statement timeout to prevent long-running table locks
    await client.query(`SET LOCAL statement_timeout = ${Number(timeoutMs)}`);

    // 3. Execute the candidate SQL query
    const result = await client.query(sql);

    // 4. Commit the read-only transaction
    await client.query('COMMIT');

    const columns = result.fields ? result.fields.map((field) => field.name) : [];
    const rows = result.rows || [];
    const rowCount = typeof result.rowCount === 'number' ? result.rowCount : rows.length;

    return {
      columns,
      rows,
      rowCount
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    const executionError = new Error(
      error.message ? `PostgreSQL execution error: ${error.message}` : 'Failed to execute query.'
    );
    executionError.code = 'QUERY_EXECUTION_FAILED';
    executionError.statusCode = 500;
    executionError.originalError = error;
    throw executionError;
  } finally {
    client.release();
  }
}
