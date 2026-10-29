import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  fetchDatabaseHealth,
  fetchDatabaseSchema,
  clarifyQuestion,
  generateSqlApi,
  executeQueryApi,
  setForceMockMode,
} from '../src/services/api.js';

import {
  MOCK_QUERIES,
  MOCK_DATABASE_INFO,
  MOCK_SCHEMA_METADATA,
} from '../src/services/mockData.js';

describe('QueryDB API Service & Workflow Tests', () => {
  setForceMockMode(true);

  it('1. Database health check returns connected status', async () => {
    const health = await fetchDatabaseHealth();
    assert.equal(health.connected, true);
    assert.equal(health.database, 'My College DB');
    assert.equal(health.engine, 'PostgreSQL');
  });

  it('2. Database schema metadata provides required college tables', async () => {
    const schema = await fetchDatabaseSchema();
    assert.ok(schema.tables.length >= 3);
    const tableNames = schema.tables.map((t) => t.name);
    assert.ok(tableNames.includes('students'));
    assert.ok(tableNames.includes('placements'));
    assert.ok(tableNames.includes('companies'));
  });

  it('3. Empty question validation throws error', async () => {
    await assert.rejects(
      async () => {
        await generateSqlApi('   ');
      },
      (err) => {
        assert.equal(err.code, 'INVALID_REQUEST');
        return true;
      }
    );
  });

  it('4. Valid question generates correct PostgreSQL SQL and understanding metadata', async () => {
    const question = 'Which CSE students got placed above 15 LPA?';
    const result = await generateSqlApi(question);

    assert.equal(result.success, true);
    assert.ok(result.sql.includes('SELECT'));
    assert.ok(result.sql.includes('students'));
    assert.ok(result.sql.includes('placements'));
    assert.ok(result.sql.includes('CSE'));
    assert.ok(result.understanding.tables.includes('students'));
    assert.ok(result.understanding.tables.includes('placements'));
    assert.equal(result.understanding.ambiguityCheck, 'Clear - no question needed');
    assert.equal(result.understanding.safetyCheck, 'SELECT only - passed');
  });

  it('5. Execution of generated SQL returns actual columns and records', async () => {
    const question = 'Which CSE students got placed above 15 LPA?';
    const genResult = await generateSqlApi(question);
    const execResult = await executeQueryApi(question, genResult.sql);

    assert.equal(execResult.success, true);
    assert.equal(execResult.status, 'completed');
    assert.ok(Array.isArray(execResult.columns));
    assert.ok(Array.isArray(execResult.rows));
    assert.equal(execResult.rows.length, 2);
    assert.equal(execResult.rows[0].student, 'Rahul');
    assert.equal(execResult.rows[1].student, 'Aman');
    assert.ok(execResult.executionTimeMs > 0);
  });

  it('6. Empty results scenario returns empty array without error', async () => {
    const question = 'Find students with CGPA above 10';
    const genResult = await generateSqlApi(question);
    const execResult = await executeQueryApi(question, genResult.sql);

    assert.equal(execResult.success, true);
    assert.equal(execResult.rows.length, 0);
    assert.equal(execResult.rowCount, 0);
  });

  it('7. Unsafe queries (DROP TABLE, DELETE) are rejected by safety guard', async () => {
    await assert.rejects(
      async () => {
        await generateSqlApi('DROP TABLE students;');
      },
      (err) => {
        assert.equal(err.code, 'UNSAFE_QUERY');
        assert.ok(err.message.includes('forbidden'));
        return true;
      }
    );
  });

  it('8. Ambiguous question triggers clarification workflow per API contract', async () => {
    const question = 'Show the top students';
    const result = await clarifyQuestion(question);

    assert.equal(result.success, true);
    assert.equal(result.needsClarification, true);
    assert.ok(result.clarificationQuestion.includes('rank'));
    assert.ok(result.options.length > 0);
  });

  it('9. Long result set handles multiple records correctly', async () => {
    const question = 'List all enrolled students in college';
    const genResult = await generateSqlApi(question);
    const execResult = await executeQueryApi(question, genResult.sql);

    assert.equal(execResult.success, true);
    assert.ok(execResult.rows.length > 10);
    assert.equal(execResult.columns.length, 5);
  });
});
