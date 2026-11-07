import { generateSQL } from '../services/aiService.js';
import { executeReadOnlyQuery } from '../services/queryExecutionService.js';

/**
 * Handles POST /api/query requests to coordinate AI SQL generation and safe execution.
 *
 * @param {import('express').Request} request
 * @param {import('express').Response} response
 */
export async function handleQuery(request, response) {
  const { question } = request.body || {};

  if (!question || typeof question !== 'string' || !question.trim()) {
    return response.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Question is required and must be a non-empty string.'
      }
    });
  }

  const cleanQuestion = question.trim();

  // 1. Generate and validate SQL via FastAPI AI service
  let aiResult;
  try {
    aiResult = await generateSQL(cleanQuestion);
  } catch (error) {
    console.error('AI service invocation failed:', error.message);
    const statusCode = error.statusCode || 502;
    return response.status(statusCode).json({
      success: false,
      status: 'error',
      error: {
        code: error.code || 'AI_SERVICE_ERROR',
        message: error.message || 'Unable to communicate with the AI service.'
      }
    });
  }

  // 2. Reject unsafe or invalid SQL
  if (!aiResult.isSafe || !aiResult.isValid) {
    console.warn('Generated SQL rejected by safety checks:', aiResult.validationErrors);
    return response.status(400).json({
      success: false,
      status: 'rejected',
      error: {
        code: 'UNSAFE_QUERY',
        message: 'The generated SQL did not pass the safety checks.',
        details: aiResult.validationErrors
      }
    });
  }

  // 3. Execute approved read-only query on PostgreSQL
  try {
    const executionResult = await executeReadOnlyQuery(aiResult.sql);

    return response.status(200).json({
      success: true,
      status: 'completed',
      question: cleanQuestion,
      sql: aiResult.sql,
      columns: executionResult.columns,
      rows: executionResult.rows,
      rowCount: executionResult.rowCount
    });
  } catch (error) {
    console.error('Query execution failed:', error.message);
    return response.status(500).json({
      success: false,
      status: 'error',
      error: {
        code: 'QUERY_EXECUTION_FAILED',
        message: 'The query could not be executed.'
      }
    });
  }
}
