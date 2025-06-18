/**
 * Database verification script for AI Quizzer Backend
 * This script checks the database connection and structure.
 */

const { connectDatabase, query } = require('./src/config/database');
const logger = require('./src/utils/logger');

async function checkDatabase() {
  try {
    logger.info('Starting database verification...');
    
    // Connect to database
    const db = await connectDatabase();
    logger.info('✅ Database connection successful');
    
    // Check users table
    const usersResult = await query('SELECT COUNT(*) as count FROM users');
    logger.info(`✅ Users table exists with ${usersResult.rows[0].count} records`);
    
    // Check quizzes table
    const quizzesResult = await query('SELECT COUNT(*) as count FROM quizzes');
    logger.info(`✅ Quizzes table exists with ${quizzesResult.rows[0].count} records`);
    
    // Check quiz_submissions table
    const submissionsResult = await query('SELECT COUNT(*) as count FROM quiz_submissions');
    logger.info(`✅ Quiz submissions table exists with ${submissionsResult.rows[0].count} records`);
    
    // Check quiz_hints table
    const hintsResult = await query('SELECT COUNT(*) as count FROM quiz_hints');
    logger.info(`✅ Quiz hints table exists with ${hintsResult.rows[0].count} records`);
    
    logger.info('Database verification completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during database verification:', error);
    process.exit(1);
  }
}

// Execute the check
checkDatabase();
