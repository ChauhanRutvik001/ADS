/**
 * Setup script for AI Quizzer Backend
 * This script checks prerequisites and sets up the project environment.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n📋 AI QUIZZER BACKEND SETUP\n' + '='.repeat(30));

// Check Node.js version
const nodeVersion = process.version;
console.log(`✅ Node.js Version: ${nodeVersion}`);

// Check for .env file
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('⚠️  .env file not found');
  
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created .env file from .env.example');
    console.log('⚠️  Please update your .env file with your specific configuration');
  } else {
    console.error('❌ .env.example file not found. Cannot create .env file.');
    process.exit(1);
  }
} else {
  console.log('✅ .env file exists');
}

// Check for database directory structure
const dbDir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('✅ Created database directory');
} else {
  console.log('✅ Database directory exists');
}

// Check for logs directory
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('✅ Created logs directory');
} else {
  console.log('✅ Logs directory exists');
}

// Install dependencies
try {
  console.log('\n📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully');
} catch (error) {
  console.error('❌ Error installing dependencies:', error.message);
}

// Run database migrations
console.log('\n🛠️  Would you like to run database migrations now? (y/n)');
rl.question('> ', (answer) => {
  if (answer.toLowerCase() === 'y') {
    try {
      console.log('\n🗄️  Running database migrations...');
      execSync('npm run migrate', { stdio: 'inherit' });
      console.log('✅ Database migrations completed successfully');
      
      // Seed the database
      console.log('\n🌱 Would you like to seed the database with sample data? (y/n)');
      rl.question('> ', (seedAnswer) => {
        if (seedAnswer.toLowerCase() === 'y') {
          try {
            console.log('\n🌱 Seeding database...');
            execSync('npm run seed', { stdio: 'inherit' });
            console.log('✅ Database seeded successfully');
            showStartInstructions();
            rl.close();
          } catch (error) {
            console.error('❌ Error seeding database:', error.message);
            showStartInstructions();
            rl.close();
          }
        } else {
          showStartInstructions();
          rl.close();
        }
      });
    } catch (error) {
      console.error('❌ Error running migrations:', error.message);
      rl.close();
    }
  } else {
    showStartInstructions();
    rl.close();
  }
});

function showStartInstructions() {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 Setup Complete! To start the application:');
  console.log('   - For development: npm run dev');
  console.log('   - For production: npm start');
  console.log('📚 API documentation available at: http://localhost:3000/api-docs');
  console.log('🔍 For troubleshooting, check the logs directory');
  console.log('='.repeat(50) + '\n');
}
