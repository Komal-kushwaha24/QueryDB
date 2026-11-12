/**
 * QueryDB API Client
 * Facilitates communication between the React frontend and Express backend.
 */

const API_BASE = '/api';

/**
 * Execute a natural language query or resume execution with a clarification choice.
 *
 * @param {string} question - Natural language question.
 * @param {string} [selectedOption] - Clarification option if previously requested.
 * @returns {Promise<object>} Query response with sql, rows, columns, explanation or clarification_required.
 */
export async function executeQuery(question, selectedOption = null) {
  const payload = {
    question: typeof question === 'string' ? question.trim() : '',
  };

  if (typeof selectedOption === 'string' && selectedOption.trim()) {
    payload.selectedOption = selectedOption.trim();
  }

  const response = await fetch(`${API_BASE}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || errorBody.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch the live database schema from PostgreSQL.
 *
 * @returns {Promise<{ schema: string, tables: Array }>}
 */
export async function fetchSchema() {
  const response = await fetch(`${API_BASE}/schema`);
  if (!response.ok) {
    throw new Error(`Failed to fetch schema (HTTP ${response.status})`);
  }
  return response.json();
}

/**
 * Check backend and database connectivity.
 *
 * @returns {Promise<{ status: string, database?: string }>}
 */
export async function checkHealth() {
  const response = await fetch(`${API_BASE}/health/db`);
  if (!response.ok) {
    throw new Error(`Health check failed (HTTP ${response.status})`);
  }
  return response.json();
}

