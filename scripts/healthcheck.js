/**
 * Health check script for AI Quizzer Backend
 * This script verifies that all components of the system are working properly.
 */

const axios = require('axios');
const { connectDatabase } = require('./src/config/database');
const { connectRedis } = require('./src/config/redis');
const logger = require('./src/utils/logger');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

async function checkHealth() {
  console.log('\n🔍 AI QUIZZER BACKEND HEALTH CHECK\n' + '='.repeat(40));
  const results = {
    api: false,
    database: false,
    redis: false,
    auth: false
  };
  
  // Check API health endpoint
  try {
    console.log('\n🌐 Checking API...');
    const response = await axios.get(`${BASE_URL}/health`);
    
    if (response.status === 200 && response.data && response.data.success) {
      console.log('✅ API is running and healthy');
      results.api = true;
    } else {
      console.error('❌ API responded but health check failed');
    }
  } catch (error) {
    console.error('❌ API health check failed:', error.message);
    console.log('   Is the server running? Try starting with "npm start"');
  }
  
  // Check database connection
  try {
    console.log('\n🗄️ Checking database connection...');
    const db = await connectDatabase();
    if (db) {
      console.log('✅ Database connection successful');
      results.database = true;
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('   Check your DATABASE_URL in .env file');
  }
  
  // Check Redis connection
  try {
    console.log('\n🔄 Checking Redis connection...');
    const redis = await connectRedis();
    if (redis) {
      console.log('✅ Redis connection successful');
      results.redis = true;
      // Clean up connection
      setTimeout(() => redis.quit(), 500);
    }
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    console.log('   Check your REDIS_URL in .env file (not critical if using database fallback)');
  }
  
  // Check authentication
  if (results.api) {
    try {
      console.log('\n🔐 Checking authentication...');
      const authResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        username: 'demo_user',
        password: 'Demo123!'
      });
      
      if (authResponse.status === 200 && authResponse.data && authResponse.data.token) {
        console.log('✅ Authentication working correctly');
        results.auth = true;
      } else {
        console.error('❌ Authentication responded but token not received');
      }
    } catch (error) {
      console.error('❌ Authentication check failed:', error.message);
    }
  }
  
  // Overall health assessment
  console.log('\n' + '='.repeat(40));
  console.log('📋 OVERALL HEALTH ASSESSMENT:');
  
  const allHealthy = Object.values(results).every(result => result === true);
  const criticalHealthy = results.api && results.database && results.auth;
  
  if (allHealthy) {
    console.log('✅ All systems operational!');
  } else if (criticalHealthy) {
    console.log('✅ Core systems operational (API, Database, Auth)');
    console.log('⚠️ Some non-critical systems have issues');
  } else {
    console.log('❌ System has critical issues that need to be fixed');
  }
  
  console.log('\nDetailed Results:');
  console.log(`- API: ${results.api ? '✅' : '❌'}`);
  console.log(`- Database: ${results.database ? '✅' : '❌'}`);
  console.log(`- Redis Cache: ${results.redis ? '✅' : '❌'}`);
  console.log(`- Authentication: ${results.auth ? '✅' : '❌'}`);
  
  console.log('\n' + '='.repeat(40));
  
  // Exit with appropriate code
  process.exit(criticalHealthy ? 0 : 1);
}

// Execute the health check
checkHealth();
