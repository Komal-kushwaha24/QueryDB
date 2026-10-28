import 'dotenv/config';
import express from 'express';
import pool from './config/database.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'querydb-backend' });
});

app.get('/api/health/db', async (_request, response) => {
  try {
    await pool.query('SELECT 1');
    response.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Database health check failed:', error.message);
    response.status(503).json({
      status: 'error',
      database: 'disconnected',
      message: 'Unable to connect to PostgreSQL. Check the database configuration.'
    });
  }
});

app.use((_request, response) => {
  response.status(404).json({ error: 'Route not found' });
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(port, () => {
  console.log(`QueryDB API listening on port ${port}`);
});

const shutdown = async (signal) => {
  console.log(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
