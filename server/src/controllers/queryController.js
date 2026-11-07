import { clarifyQuestion, explainSQL, generateSQL } from '../services/aiService.js';
import { executeReadOnlyQuery } from '../services/queryExecutionService.js';

/**
 * Handles POST /api/query requests to coordinate clarification, AI SQL generation, safety, and execution.
 *
 * @param {import('express').Request} request
 * @param {import('express').Response} response
 */
export async function handleQuery(request, response) {
  const { question, selectedOption, clarificationAnswer, skipClarification } = request.body || {};

  if (!question || typeof question !== 'string' || !question.trim()) {
    return response.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Question is required and must be a non-empty string.'
      }
    });
  }

  let cleanQuestion = question.trim();
  const option = (selectedOption || clarificationAnswer || '').toString().trim();
  const shouldCheckClarification = !skipClarification && !option;

  if (option) {
    cleanQuestion = `${cleanQuestion} (Criterion: ${option})`;
  }

  // 1. Check if the question requires clarification (API Contract v1.0 Step 3 & 4)
  if (shouldCheckClarification) {
    try {
      const clarification = await clarifyQuestion(cleanQuestion);
      if (clarification.needsClarification) {
        return response.status(200).json({
          success: true,
          status: 'clarification_required',
          clarification: {
            question: clarification.clarificationQuestion,
            options: clarification.options
          }
        });
      }
    } catch (clarifyError) {
      console.warn('Clarification check failed, proceeding to generation:', clarifyError.message);
    }
  }

  // 2. Generate and validate SQL via FastAPI AI service
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

  // 3. Reject unsafe or invalid SQL
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

  // 4. Execute approved read-only query on PostgreSQL
  try {
    const executionResult = await executeReadOnlyQuery(aiResult.sql);

    // 5. Generate human-readable SQL explanation
    let explanation = null;
    try {
      const explainRes = await explainSQL(cleanQuestion, aiResult.sql);
      explanation = explainRes.explanation || null;
    } catch (explainError) {
      console.warn('SQL explanation failed:', explainError.message);
    }

    return response.status(200).json({
      success: true,
      status: 'completed',
      question: cleanQuestion,
      sql: aiResult.sql,
      explanation,
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

/**
 * Handles POST /api/ai/clarify requests.
 */
export async function handleClarify(request, response) {
  const { question, schema_context } = request.body || {};
  if (!question || typeof question !== 'string' || !question.trim()) {
    return response.status(422).json({
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'A non-empty question is required.'
      }
    });
  }

  try {
    const result = await clarifyQuestion(question.trim(), { schemaContext: schema_context });
    return response.status(200).json({
      success: true,
      needs_clarification: result.needsClarification,
      clarification_question: result.clarificationQuestion,
      options: result.options
    });
  } catch (error) {
    console.error('Clarification handler failed:', error.message);
    return response.status(error.statusCode || 500).json({
      success: false,
      error: {
        code: 'CLARIFICATION_FAILED',
        message: 'Unable to analyze the question.'
      }
    });
  }
}

/**
 * Handles POST /api/ai/explain requests.
 */
export async function handleExplain(request, response) {
  const { question, sql } = request.body || {};
  if (!question || typeof question !== 'string' || !question.trim() || !sql || typeof sql !== 'string' || !sql.trim()) {
    return response.status(422).json({
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'Both question and sql must be non-empty strings.'
      }
    });
  }

  try {
    const result = await explainSQL(question.trim(), sql.trim());
    return response.status(200).json({
      success: true,
      explanation: result.explanation
    });
  } catch (error) {
    console.error('Explanation handler failed:', error.message);
    return response.status(error.statusCode || 500).json({
      success: false,
      error: {
        code: 'EXPLANATION_FAILED',
        message: 'Unable to explain the SQL query.'
      }
    });
  }
}

