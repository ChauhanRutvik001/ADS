#!/usr/bin/env node

/**
 * AI Quizzer Backend - Quick API Test Script
 * This script tests all major endpoints to verify the backend is working correctly
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let authToken = '';
let userId = '';
let quizId = '';
let submissionId = '';

// Test configuration
const testConfig = {
  timeout: 10000,
  user: {
    username: `test_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'TestPass123!'
  }
};

// Helper function for API calls
async function apiCall(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      timeout: testConfig.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
      const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status || 500,
      details: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : error.message
    };
  }
}

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} - ${name}`);
  if (details) console.log(`   ${details}`);
  
  results.tests.push({ name, passed, details });
  if (passed) results.passed++;
  else results.failed++;
}

// Test functions
async function testHealthCheck() {
  console.log('\\n🏥 Testing Health Check...');
  const result = await apiCall('GET', '/health');
  logTest('Health Check', result.success && result.data?.success === true);
}

async function testRootEndpoint() {
  console.log('\\n🏠 Testing Root Endpoint...');
  const result = await apiCall('GET', '/');
  logTest('Root Endpoint', result.success && result.data?.success === true);
}

async function testUserRegistration() {
  console.log('\\n👤 Testing User Registration...');
  const result = await apiCall('POST', '/api/auth/register', testConfig.user);
  if (result.success && result.data?.success === true) {
    authToken = result.data.token;
    userId = result.data.user?.id;
    logTest('User Registration', true, `User ID: ${userId}`);
  } else {
    console.log('Registration error details:', JSON.stringify(result.details, null, 2));
    logTest('User Registration', false, result.error?.message || JSON.stringify(result.details));
  }
}

async function testUserLogin() {
  console.log('\\n🔐 Testing User Login...');
  const loginData = {
    username: 'demo_user',
    password: 'Demo123!'
  };
  
  const result = await apiCall('POST', '/api/auth/login', loginData);
  if (result.success && result.data?.success === true) {
    authToken = result.data.token;
    userId = result.data.user?.id;
    logTest('User Login (Demo User)', true, `Token received`);
  } else {
    console.log('Login error details:', JSON.stringify(result.details, null, 2));
    logTest('User Login (Demo User)', false, result.error?.message || JSON.stringify(result.details));
  }
}

async function testUserProfile() {
  console.log('\\n👥 Testing User Profile...');
  const result = await apiCall('GET', '/api/auth/profile', null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (!result.success) {
    console.log('Profile error details:', JSON.stringify(result.details, null, 2));
  }
  logTest('Get User Profile', result.success && result.data?.success === true);
}

async function testQuizGeneration() {
  console.log('\\n📝 Testing Quiz Generation...');
  const quizData = {
    subject: 'Mathematics',
    grade: 5,
    difficulty: 'EASY',
    numQuestions: 3,
    topics: ['addition', 'subtraction']
  };
  
  const result = await apiCall('POST', '/api/quiz/generate', quizData, {
    'Authorization': `Bearer ${authToken}`
  });
  console.log('Quiz generation response structure:', JSON.stringify(result, null, 2));
    if (result.success && result.data?.success === true) {
    // The quiz_id should be in result.data.data.quiz_id
    quizId = result.data.data?.quiz_id;
    console.log('Extracted quiz ID:', quizId);
    logTest('Quiz Generation', true, `Quiz ID: ${quizId}`);
  } else {
    console.log('Quiz generation error details:', JSON.stringify(result.details, null, 2));
    logTest('Quiz Generation', false, result.error?.message || JSON.stringify(result.details));
  }
}

async function testQuizRetrieval() {
  console.log('\\n📄 Testing Quiz Retrieval...');
  if (!quizId) {
    logTest('Quiz Retrieval', false, 'No quiz ID available');
    return;
  }
  
  const result = await apiCall('GET', `/api/quiz/${quizId}`, null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  logTest('Get Quiz Details', result.success && result.data?.success === true);
}

async function testQuizSubmission() {
  console.log('\\n📤 Testing Quiz Submission...');
  if (!quizId) {
    logTest('Quiz Submission', false, 'No quiz ID available');
    return;
  }
  
  const submissionData = {
    quizId: quizId,
    answers: {
      'q1': 'A',
      'q2': 'B',
      'q3': 'C'
    }
  };
  
  const result = await apiCall('POST', '/api/quiz/submit', submissionData, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (result.success && result.data?.success === true) {
    submissionId = result.data.data?.submission_id;
    logTest('Quiz Submission', true, `Submission ID: ${submissionId}`);
  } else {
    logTest('Quiz Submission', false, result.error?.message || 'Submission failed');
  }
}

async function testHistoryRetrieval() {
  console.log('\\n📊 Testing History Retrieval...');
  const result = await apiCall('GET', '/api/history?page=1&limit=5', null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  logTest('Get Quiz History', result.success && result.data?.success === true);
}

async function testUserStats() {
  console.log('\\n📈 Testing User Statistics...');
  const result = await apiCall('GET', '/api/history/stats', null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  logTest('Get User Statistics', result.success && result.data?.success === true);
}

async function testUnauthorizedAccess() {
  console.log('\\n🚫 Testing Unauthorized Access...');
  const result = await apiCall('GET', '/api/quiz/generate');
  
  logTest('Unauthorized Access Blocked', !result.success && result.status === 401);
}

async function testInvalidLogin() {
  console.log('\\n❌ Testing Invalid Login...');
  const invalidData = {
    username: 'invalid_user',
    password: 'wrong_password'
  };
  
  const result = await apiCall('POST', '/api/auth/login', invalidData);
  
  logTest('Invalid Login Rejected', !result.success && result.status === 401);
}

// Main test runner
async function runAllTests() {
  console.log('🚀 AI Quizzer Backend - API Test Suite');
  console.log('=' .repeat(50));
  
  const startTime = Date.now();
  
  try {
    // System tests
    await testHealthCheck();
    await testRootEndpoint();
    
    // Authentication tests
    await testUserRegistration();
    await testUserLogin();
    await testUserProfile();
    
    // Quiz functionality tests
    await testQuizGeneration();
    await testQuizRetrieval();
    await testQuizSubmission();
    
    // History and analytics tests
    await testHistoryRetrieval();
    await testUserStats();
    
    // Security tests
    await testUnauthorizedAccess();
    await testInvalidLogin();
    
  } catch (error) {
    console.error('\\n❌ Test suite encountered an error:', error.message);
  }
  
  // Results summary
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('\\n' + '=' .repeat(50));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.failed > 0) {
    console.log('\\n❌ Failed Tests:');
    results.tests.filter(t => !t.passed).forEach(test => {
      console.log(`  - ${test.name}: ${test.details}`);
    });
  }
  
  console.log('\\n🎉 Test suite completed!');
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Check if server is running
async function checkServerStatus() {
  try {
    await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    return true;
  } catch (error) {
    console.error('❌ Server is not running or not accessible at', BASE_URL);
    console.error('Please start the server with: npm run dev');
    return false;
  }
}

// Main execution
(async () => {
  const serverRunning = await checkServerStatus();
  if (serverRunning) {
    await runAllTests();
  } else {
    process.exit(1);
  }
})();
