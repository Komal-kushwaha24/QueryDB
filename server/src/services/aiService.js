const DEFAULT_AI_SERVICE_URL = 'http://127.0.0.1:8001';

/**
 * Calls the FastAPI AI service to retrieve schema context, generate SQL, and validate safety.
 *
 * @param {string} question - The user's natural language question.
 * @param {object} [options]
 * @param {number} [options.topK=3]
 * @param {number} [options.maxBridgeTables=2]
 * @param {number} [options.timeout=15000] - Request timeout in milliseconds.
 * @returns {Promise<{
 *   sql: string,
 *   question: string,
 *   allowedTables: string[],
 *   joinConditions: string[],
 *   isValid: boolean,
 *   isSafe: boolean,
 *   tablesUsed: string[],
 *   validationErrors: string[],
 *   promptContext: string
 * }>}
 */
export async function generateSQL(question, options = {}) {
  const baseUrl = process.env.AI_SERVICE_URL || DEFAULT_AI_SERVICE_URL;
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/sql/generate`;
  const timeoutMs = options.timeout || 15000;

  const payload = {
    question,
    top_k: options.topK ?? 3,
    max_bridge_tables: options.maxBridgeTables ?? 2,
    user_id: options.userId ?? 'anonymous',
    dataset_id: options.datasetId ?? 'default'
  };

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error) {
    if (error.name === 'TimeoutError') {
      const err = new Error(`AI service request timed out after ${timeoutMs}ms.`);
      err.code = 'AI_SERVICE_TIMEOUT';
      err.statusCode = 504;
      throw err;
    }
    const err = new Error(`Unable to reach AI service at ${baseUrl}: ${error.message}`);
    err.code = 'AI_SERVICE_UNAVAILABLE';
    err.statusCode = 502;
    throw err;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    const err = new Error('AI service returned non-JSON response.');
    err.code = 'AI_SERVICE_MALFORMED_RESPONSE';
    err.statusCode = 502;
    throw err;
  }

  if (!response.ok) {
    if (response.status === 409 && !options._isRetry) {
      console.log('RAG schema index not loaded. Attempting automatic refresh...');
      try {
        const refreshRes = await fetch(`${baseUrl.replace(/\/+$/, '')}/rag/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: payload.user_id, dataset_id: payload.dataset_id }),
          signal: AbortSignal.timeout(30000)
        });
        if (refreshRes.ok) {
          console.log('Schema refresh succeeded. Retrying SQL generation...');
          return generateSQL(question, { ...options, _isRetry: true });
        }
      } catch (refreshErr) {
        console.warn('Automatic schema refresh failed:', refreshErr.message);
      }
    }

    const message = data.detail || data.message || `AI service responded with HTTP ${response.status}`;
    const err = new Error(message);
    err.statusCode = response.status === 503 ? 503 : 502;
    err.code = response.status === 503 ? 'AI_SERVICE_UNCONFIGURED' : 'AI_SERVICE_ERROR';
    err.details = data;
    throw err;
  }

  return {
    sql: data.sql,
    question: data.question,
    allowedTables: data.allowed_tables || [],
    joinConditions: data.join_conditions || [],
    isValid: Boolean(data.is_valid),
    isSafe: Boolean(data.is_safe),
    tablesUsed: data.tables_used || [],
    validationErrors: data.validation_errors || [],
    promptContext: data.prompt_context || ''
  };
}
