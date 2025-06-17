const { Pool } = require('pg');
const logger = require('../utils/logger');
const { initializeSQLite } = require('./dev-database');

let pool;
let sqliteClient;
let usingPostgreSQL = true;

const connectDatabase = async () => {
  try {
    // First try PostgreSQL
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test the connection
    const client = await pool.connect();
    logger.info('✅ PostgreSQL database connected successfully');
    client.release();

    // Handle pool errors
    pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });

    usingPostgreSQL = true;
    return pool;
  } catch (error) {
    logger.warn('PostgreSQL connection failed, falling back to SQLite for development:', error.message);
      // Fallback to SQLite for development
    try {
      const db = await initializeSQLite();
      usingPostgreSQL = false;
      return db;
    } catch (sqliteError) {
      logger.error('❌ Both PostgreSQL and SQLite connections failed:', sqliteError);
      throw sqliteError;
    }
  }
};

const getPool = () => {
  if (usingPostgreSQL) {
    if (!pool) {
      throw new Error('PostgreSQL database not connected. Call connectDatabase() first.');
    }
    return pool;
  } else {
    if (!sqliteClient) {
      throw new Error('SQLite database not connected. Call connectDatabase() first.');
    }
    return sqliteClient;
  }
};

const query = async (text, params) => {
  if (usingPostgreSQL) {
    const client = await pool.connect();
    try {
      const start = Date.now();
      const result = await client.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Executed query', {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      logger.error('Database query error:', error);
      throw error;
    } finally {
      client.release();
    }
  } else {
    try {
      const start = Date.now();
      const result = await sqliteClient.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Executed SQLite query', {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        rows: result.rows ? result.rows.length : result.rowCount
      });
      
      return result;
    } catch (error) {
      logger.error('SQLite query error:', error);
      throw error;
    }
  }
};

const transaction = async (callback) => {
  if (usingPostgreSQL) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction error:', error);
      throw error;
    } finally {
      client.release();
    }
  } else {
    // SQLite doesn't support the same transaction interface
    // For now, just execute the callback
    logger.warn('Transaction not fully supported with SQLite fallback');
    return await callback(sqliteClient);
  }
};

module.exports = {
  connectDatabase,
  getPool,
  query,
  transaction
};
