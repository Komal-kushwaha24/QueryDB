import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { executeReadOnlyQuery } from '../src/services/queryExecutionService.js';
import pool from '../src/config/database.js';
import { app, server } from '../src/app.js';

let appServer;
let mockAiServer;

test.before(async () => {
  // 1. Ensure backend Express server is running on port 3000
  if (server) {
    if (!server.listening) {
      await new Promise((resolve) => {
        server.once('listening', resolve);
        server.once('error', () => resolve());
      });
    }
  } else {
    try {
      const res = await fetch('http://localhost:3000/api/health', {
        signal: AbortSignal.timeout(1000)
      });
      if (!res.ok) throw new Error('Not ok');
    } catch {
      appServer = app.listen(3000);
      await new Promise((resolve) => appServer.once('listening', resolve));
    }
  }

  // 2. Ensure AI service is reachable, or spin up a mock AI server on port 8001
  const aiUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8001';
  let aiRunning = false;
  try {
    const res = await fetch(`${aiUrl.replace(/\/+$/, '')}/health`, {
      signal: AbortSignal.timeout(1000)
    });
    if (res.ok) aiRunning = true;
  } catch {
    aiRunning = false;
  }

  if (!aiRunning) {
    process.env.AI_SERVICE_URL = 'http://127.0.0.1:8001';
    mockAiServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        const url = req.url;
        let payload = {};
        try { payload = JSON.parse(body); } catch {}

        res.setHeader('Content-Type', 'application/json');

        if (url.includes('/api/ai/clarify')) {
          const q = (payload.question || '').toLowerCase();
          if (q.includes('top student')) {
            res.writeHead(200);
            return res.end(JSON.stringify({
              success: true,
              needs_clarification: true,
              clarification_question: 'Do you want to rank students by CGPA or placement status?',
              options: ['CGPA', 'Placement status']
            }));
          }
          res.writeHead(200);
          return res.end(JSON.stringify({
            success: true,
            needs_clarification: false,
            clarification_question: null,
            options: []
          }));
        }

        if (url.includes('/sql/generate')) {
          res.writeHead(200);
          return res.end(JSON.stringify({
            sql: 'SELECT * FROM students LIMIT 3;',
            question: payload.question || '',
            allowed_tables: ['students'],
            join_conditions: [],
            is_valid: true,
            is_safe: true,
            tables_used: ['students'],
            validation_errors: [],
            prompt_context: ''
          }));
        }

        if (url.includes('/api/ai/explain')) {
          res.writeHead(200);
          return res.end(JSON.stringify({
            success: true,
            explanation: 'This query retrieves students whose CGPA is greater than 8.'
          }));
        }

        if (url.includes('/health')) {
          res.writeHead(200);
          return res.end(JSON.stringify({ status: 'ok' }));
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
      });
    });

    mockAiServer.listen(8001);
    await new Promise((resolve) => mockAiServer.once('listening', resolve));
  }
});

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

test('API POST /api/query end-to-end question execution returns real rows and explanation', async () => {
  const res = await fetch('http://localhost:3000/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'Show 3 students.', skipClarification: true })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.status, 'completed');
  assert.ok(data.sql.includes('students'));
  assert.ok(Array.isArray(data.columns));
  assert.ok(Array.isArray(data.rows));
  assert.ok(data.rows.length > 0);
  assert.ok(typeof data.explanation === 'string' || data.explanation === null);
});

test('API POST /api/query returns clarification for ambiguous question', async () => {
  const res = await fetch('http://localhost:3000/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'Show top students' })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.status, 'clarification_required');
  assert.ok(data.clarification);
  assert.ok(data.clarification.question);
  assert.ok(Array.isArray(data.clarification.options));
  assert.ok(data.clarification.options.length > 0);
});

test('API POST /api/query completes execution when selectedOption is provided', async () => {
  const res = await fetch('http://localhost:3000/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: 'Show top students',
      selectedOption: 'Highest CGPA'
    })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.status, 'completed');
  assert.ok(data.sql);
  assert.ok(Array.isArray(data.rows));
});

test('API POST /api/ai/clarify returns clarification status', async () => {
  const res = await fetch('http://localhost:3000/api/ai/clarify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'Show top students' })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.needs_clarification, true);
});

test('API POST /api/ai/explain returns human-readable explanation', async () => {
  const res = await fetch('http://localhost:3000/api/ai/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: 'Find students whose CGPA is greater than 8',
      sql: 'SELECT * FROM students WHERE cgpa > 8'
    })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.explanation);
  assert.ok(data.explanation.length > 5);
});

test.after(async () => {
  if (server && server.listening) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (appServer && appServer.listening) {
    await new Promise((resolve) => appServer.close(resolve));
  }
  if (mockAiServer && mockAiServer.listening) {
    await new Promise((resolve) => mockAiServer.close(resolve));
  }
  await pool.end();
});
