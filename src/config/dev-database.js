const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../utils/logger');

let db = null;

// Create or connect to SQLite database
const connectSQLite = () => {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(__dirname, '../../ai_quizzer_dev.db');
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        logger.error('SQLite connection failed:', err);
        reject(err);
      } else {
        logger.info('SQLite database connected successfully');
        resolve(db);
      }
    });
  });
};

// Create tables for SQLite
const createSQLiteTables = (db) => {
  return new Promise((resolve, reject) => {
    const sqlScript = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Quizzes table
      CREATE TABLE IF NOT EXISTS quizzes (
        quiz_id VARCHAR(50) PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        subject VARCHAR(100) NOT NULL,
        grade INTEGER NOT NULL CHECK (grade >= 1 AND grade <= 12),
        difficulty VARCHAR(10) CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
        total_questions INTEGER NOT NULL CHECK (total_questions > 0),
        max_score INTEGER NOT NULL CHECK (max_score > 0),
        questions TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Quiz submissions table
      CREATE TABLE IF NOT EXISTS quiz_submissions (
        submission_id VARCHAR(50) PRIMARY KEY,
        quiz_id VARCHAR(50) NOT NULL,
        user_id INTEGER NOT NULL,
        responses TEXT NOT NULL,
        score INTEGER NOT NULL CHECK (score >= 0),
        max_score INTEGER NOT NULL CHECK (max_score > 0),
        percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
        detailed_results TEXT,
        suggestions TEXT,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_retry BOOLEAN DEFAULT FALSE,
        original_submission_id VARCHAR(50),
        FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (original_submission_id) REFERENCES quiz_submissions(submission_id)
      );

      -- Quiz hints table
      CREATE TABLE IF NOT EXISTS quiz_hints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id VARCHAR(50) NOT NULL,
        question_id VARCHAR(50) NOT NULL,
        hint_text TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE
      );

      -- Indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_quizzes_subject ON quizzes(subject);
      CREATE INDEX IF NOT EXISTS idx_quizzes_difficulty ON quizzes(difficulty);
      CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);
      CREATE INDEX IF NOT EXISTS idx_quiz_submissions_user_id ON quiz_submissions(user_id);
      CREATE INDEX IF NOT EXISTS idx_quiz_submissions_quiz_id ON quiz_submissions(quiz_id);
      CREATE INDEX IF NOT EXISTS idx_quiz_submissions_completed_at ON quiz_submissions(completed_at);
      CREATE INDEX IF NOT EXISTS idx_quiz_hints_quiz_id ON quiz_hints(quiz_id);
    `;

    db.exec(sqlScript, (err) => {
      if (err) {
        reject(err);
      } else {
        logger.info('SQLite tables created successfully');
        resolve();
      }
    });
  });
};

// Seed sample data
const seedSQLiteData = (db) => {
  return new Promise((resolve, reject) => {
    // Clear existing data
    db.serialize(() => {
      // Seed sample user
      const insertUser = `
        INSERT OR IGNORE INTO users (id, username, email, password_hash, first_name, last_name)
        VALUES (1, 'testuser', 'test@example.com', '$2b$10$rQ8QZbKQ7rY6K9gR7wN2/.XpP0uLK1OqY9QqD6x1YqVp7Qv9ZqKpO', 'Test', 'User')
      `;

      db.run(insertUser, (err) => {
        if (err && !err.message.includes('UNIQUE constraint failed')) {
          logger.error('Error seeding user:', err);
          reject(err);
        } else {
          logger.info('✅ SQLite database seeded with sample data');
          resolve();
        }
      });
    });
  });
};

// SQLite query wrapper to match PostgreSQL interface
class SQLiteWrapper {
  constructor(db) {
    this.db = db;
  }

  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        this.db.all(sql, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve({ rows });
          }
        });
      } else if (sql.includes('RETURNING')) {
        // Handle RETURNING clause for INSERT/UPDATE
        const sqlWithoutReturning = sql.replace(/RETURNING.*$/i, '');
        this.db.run(sqlWithoutReturning, params, function(err) {
          if (err) {
            reject(err);
          } else {
            // For INSERT operations, return the inserted row with lastID
            if (sql.trim().toUpperCase().startsWith('INSERT')) {
              resolve({ rows: [{ id: this.lastID }] });
            } else {
              resolve({ rows: [] });
            }
          }
        });
      } else {
        this.db.run(sql, params, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ 
              rows: [], 
              rowCount: this.changes || 0,
              lastID: this.lastID 
            });
          }
        });
      }
    });
  }

  async end() {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          logger.error('Error closing SQLite database:', err);
        }
        resolve();
      });
    });
  }
}

// Initialize SQLite database
const initializeSQLite = async () => {
  try {
    const database = await connectSQLite();
    await createSQLiteTables(database);
    await seedSQLiteData(database);
    
    const wrapper = new SQLiteWrapper(database);
    logger.info('✅ SQLite database connected and ready for development');
    return wrapper;
  } catch (error) {
    logger.error('SQLite initialization failed:', error);
    throw error;
  }
};

module.exports = {
  initializeSQLite,
  SQLiteWrapper
};
