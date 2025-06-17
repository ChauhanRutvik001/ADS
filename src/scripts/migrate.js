const { connectDatabase, query } = require('../config/database');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    // Connect to database
    await connectDatabase();

    // Read and execute the init.sql file
    const sqlFilePath = path.join(__dirname, '..', '..', 'database', 'init.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      logger.error('init.sql file not found at:', sqlFilePath);
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split SQL content by statements (simple approach)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    logger.info(`Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.toLowerCase().includes('commit')) {
        continue; // Skip COMMIT statements as they're handled automatically
      }

      try {
        await query(statement);
        logger.debug(`Statement ${i + 1} executed successfully`);
      } catch (error) {
        // Ignore "already exists" errors for idempotent migrations
        if (error.message.includes('already exists') || 
            error.message.includes('does not exist') ||
            error.code === '42P07' || // relation already exists
            error.code === '42710') { // object already exists
          logger.debug(`Statement ${i + 1} skipped (already exists)`);
          continue;
        }
        
        logger.error(`Error executing statement ${i + 1}:`, error);
        throw error;
      }
    }

    logger.info('✅ Database migrations completed successfully');
    
    // Verify tables were created
    const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    logger.info('Created tables:', result.rows.map(row => row.table_name));
    
    process.exit(0);
  } catch (error) {
    logger.error('❌ Database migration failed:', error);
    process.exit(1);
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
