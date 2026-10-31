import test from 'node:test';
import assert from 'node:assert/strict';
import { executeReadOnlyQuery } from '../src/services/queryExecutionService.js';
import pool from '../src/config/database.js';

test('executeReadOnlyQuery executes valid SELECT query', async () => {
  const result = await executeReadOnlyQuery('SELECT 1 AS num, \'test\' AS str');
  assert.equal(result.rowCount, 1);
  assert.deepEqual(result.columns, ['num', 'str']);
  assert.equal(result.rows[0].num, 1);
  assert.equal(result.rows[0].str, 'test');
});

test('executeReadOnlyQuery retrieves actual students from PostgreSQL', async () => {
  const result = await executeReadOnlyQuery('SELECT id, name FROM students LIMIT 5');
  assert.equal(result.rowCount, 5);
  assert.deepEqual(result.columns, ['id', 'name']);
  assert.equal(result.rows.length, 5);
  assert.ok(result.rows[0].name);
});

test('executeReadOnlyQuery rejects mutating queries via read-only transaction', async () => {
  await assert.rejects(
    async () => {
      await executeReadOnlyQuery('CREATE TABLE temp_dummy (id int)');
    },
    (err) => {
      assert.equal(err.code, 'QUERY_EXECUTION_FAILED');
      assert.match(err.message, /read-only transaction/i);
      return true;
    }
  );
});

test('executeReadOnlyQuery throws on empty query', async () => {
  await assert.rejects(
    async () => {
      await executeReadOnlyQuery('   ');
    },
    (err) => {
      assert.equal(err.code, 'INVALID_SQL');
      return true;
    }
  );
});

test('API POST /api/query rejects empty question with 422', async () => {
  const res = await fetch('http://localhost:3000/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: '' })
  });

  assert.equal(res.status, 422);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.equal(data.error.code, 'VALIDATION_ERROR');
});

test('API POST /api/query end-to-end question execution returns real rows', async () => {
  const res = await fetch('http://localhost:3000/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'Show 3 students.' })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.status, 'completed');
  assert.ok(data.sql.includes('students'));
  assert.ok(Array.isArray(data.columns));
  assert.ok(Array.isArray(data.rows));
  assert.ok(data.rows.length > 0);
});

test.after(() => {
  pool.end();
});
