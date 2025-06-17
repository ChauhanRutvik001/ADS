#!/usr/bin/env node

/**
 * AI Quizzer Backend Setup Script
 * This script helps set up the development environment
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 AI Quizzer Backend Setup\n');

// Check if Docker Desktop is running
function checkDockerStatus() {
  return new Promise((resolve) => {
    exec('docker info', (error) => {
      resolve(!error);
    });
  });
}

// Start Docker Desktop on Windows
function startDockerDesktop() {
  return new Promise((resolve) => {
    console.log('📦 Starting Docker Desktop...');
    exec('"C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe"', (error) => {
      if (error) {
        console.log('⚠️  Could not start Docker Desktop automatically');
        resolve(false);
      } else {
        console.log('✅ Docker Desktop started');
        // Wait a bit for Docker to initialize
        setTimeout(() => resolve(true), 10000);
      }
    });
  });
}

// Setup with Docker
async function setupWithDocker() {
  console.log('🐳 Setting up with Docker...\n');
  
  return new Promise((resolve) => {
    exec('docker-compose up -d db redis', { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Failed to start Docker services:', error.message);
        resolve(false);
      } else {
        console.log('✅ Docker services started successfully');
        console.log(stdout);
        resolve(true);
      }
    });
  });
}

// Setup instructions for local PostgreSQL and Redis
function showLocalSetupInstructions() {
  console.log(`
🔧 Local Database Setup Instructions

Since Docker is not available, you'll need to install PostgreSQL and Redis locally:

📊 PostgreSQL Setup:
1. Download and install PostgreSQL from: https://www.postgresql.org/download/windows/
2. During installation, set the password for 'postgres' user to 'password'
3. Create the database:
   - Open pgAdmin or psql
   - Run: CREATE DATABASE ai_quizzer;

💾 Redis Setup:
1. Install Redis using Windows Subsystem for Linux (WSL) OR
2. Download Redis for Windows from: https://github.com/tporadowski/redis/releases
3. Start Redis server on port 6379

🔑 Environment Setup:
- Your .env file is already configured for local connections
- DATABASE_URL: postgresql://postgres:password@localhost:5432/ai_quizzer
- REDIS_URL: redis://localhost:6379

📝 Next Steps:
1. Ensure PostgreSQL and Redis are running
2. Run database migrations: npm run migrate
3. Seed the database: npm run seed
4. Start the server: npm run dev

🌐 Alternative - Use Docker:
1. Install Docker Desktop: https://www.docker.com/products/docker-desktop
2. Run: docker-compose up -d db redis
3. Continue with migrations and seeding
`);
}

// Main setup function
async function main() {
  try {
    const dockerRunning = await checkDockerStatus();
    
    if (dockerRunning) {
      console.log('✅ Docker is running\n');
      const success = await setupWithDocker();
      if (success) {
        console.log(`
🎉 Setup Complete!

Next steps:
1. Run migrations: npm run migrate
2. Seed database: npm run seed  
3. Start server: npm run dev
4. Visit: http://localhost:3000/api-docs for API documentation
`);
        return;
      }
    } else {
      console.log('⚠️  Docker is not running\n');
      
      // Try to start Docker Desktop
      const dockerStarted = await startDockerDesktop();
      if (dockerStarted) {
        const success = await setupWithDocker();
        if (success) {
          console.log(`
🎉 Setup Complete!

Next steps:
1. Run migrations: npm run migrate
2. Seed database: npm run seed
3. Start server: npm run dev
4. Visit: http://localhost:3000/api-docs for API documentation
`);
          return;
        }
      }
    }
    
    // Fallback to local setup instructions
    showLocalSetupInstructions();
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    showLocalSetupInstructions();
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
