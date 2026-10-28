import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

console.log('Database configuration:', {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'QueryDB',
  user: process.env.DB_USER || 'postgres',
  passwordLoaded: Boolean(process.env.DB_PASSWORD)
});

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'QueryDB',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error.message);
});

export default pool;