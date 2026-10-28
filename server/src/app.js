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

app.get('/api/schema', async (_request, response) => {
  try {
    const [tablesResult, columnsResult, foreignKeysResult] = await Promise.all([
      pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = $1 AND table_type = $2
        ORDER BY table_name
      `, ['public', 'BASE TABLE']),
      pool.query(`
        SELECT
          table_class.relname AS table_name,
          table_column.attname AS column_name,
          pg_catalog.format_type(table_column.atttypid, table_column.atttypmod) AS data_type,
          NOT table_column.attnotnull AS is_nullable,
          EXISTS (
            SELECT 1
            FROM pg_catalog.pg_constraint primary_key
            WHERE primary_key.conrelid = table_class.oid
              AND primary_key.contype = 'p'
              AND table_column.attnum = ANY(primary_key.conkey)
          ) AS is_primary_key
        FROM pg_catalog.pg_class table_class
        JOIN pg_catalog.pg_namespace table_namespace
          ON table_namespace.oid = table_class.relnamespace
        JOIN pg_catalog.pg_attribute table_column
          ON table_column.attrelid = table_class.oid
        WHERE table_namespace.nspname = $1
          AND table_class.relkind = 'r'
          AND table_column.attnum > 0
          AND NOT table_column.attisdropped
        ORDER BY table_class.relname, table_column.attnum
      `, ['public']),
      pool.query(`
        SELECT
          source_table.relname AS source_table,
          source_column.attname AS source_column,
          referenced_table.relname AS referenced_table,
          referenced_column.attname AS referenced_column
        FROM pg_catalog.pg_constraint foreign_key
        JOIN pg_catalog.pg_class source_table
          ON source_table.oid = foreign_key.conrelid
        JOIN pg_catalog.pg_namespace source_namespace
          ON source_namespace.oid = source_table.relnamespace
        JOIN pg_catalog.pg_class referenced_table
          ON referenced_table.oid = foreign_key.confrelid
        JOIN LATERAL unnest(foreign_key.conkey) WITH ORDINALITY
          AS source_keys(attnum, key_position) ON true
        JOIN LATERAL unnest(foreign_key.confkey) WITH ORDINALITY
          AS referenced_keys(attnum, key_position) ON source_keys.key_position = referenced_keys.key_position
        JOIN pg_catalog.pg_attribute source_column
          ON source_column.attrelid = source_table.oid
          AND source_column.attnum = source_keys.attnum
        JOIN pg_catalog.pg_attribute referenced_column
          ON referenced_column.attrelid = referenced_table.oid
          AND referenced_column.attnum = referenced_keys.attnum
        WHERE source_namespace.nspname = $1
          AND foreign_key.contype = 'f'
        ORDER BY source_table.relname, source_column.attnum, source_keys.key_position
      `, ['public'])
    ]);

    const tableNames = tablesResult.rows.map((row) => row.table_name);
    const tables = tableNames.map((tableName) => {
      const columns = columnsResult.rows
        .filter((row) => row.table_name === tableName)
        .map((row) => ({
          name: row.column_name,
          dataType: row.data_type,
          isNullable: row.is_nullable,
          isPrimaryKey: row.is_primary_key
        }));

      return {
        name: tableName,
        columns,
        primaryKeyColumns: columns
          .filter((column) => column.isPrimaryKey)
          .map((column) => column.name),
        foreignKeys: foreignKeysResult.rows
          .filter((row) => row.source_table === tableName)
          .map((row) => ({
            sourceTable: row.source_table,
            sourceColumn: row.source_column,
            referencedTable: row.referenced_table,
            referencedColumn: row.referenced_column
          }))
      };
    });

    response.json({ schema: 'public', tables });
  } catch (error) {
    console.error('Schema retrieval failed:', error.message);
    response.status(503).json({
      status: 'error',
      message: 'Unable to retrieve the database schema.'
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
