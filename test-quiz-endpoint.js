// Script to test the GET /api/quiz/:quizId endpoint
const axios = require('axios');
const readline = require('readline');
const util = require('util');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = util.promisify(rl.question).bind(rl);

async function testQuizEndpoint() {
  try {
    // Get user input
    const baseUrl = await question('Enter the base URL (default: http://localhost:3000): ') || 'http://localhost:3000';
    const quizId = await question('Enter the quiz ID (default: quiz_2e2c558b4edc424fa787f7dbaa79139b): ') || 'quiz_2e2c558b4edc424fa787f7dbaa79139b';
    
    // Get authentication token
    console.log('\nFirst, we need to authenticate to get a token...');
    const email = await question('Enter your email: ');
    const password = await question('Enter your password: ');
    
    console.log('\nAttempting to login...');
    const authResponse = await axios.post(`${baseUrl}/api/auth/login`, {
      email,
      password
    });
    
    if (!authResponse.data.success) {
      console.error('Authentication failed:', authResponse.data.error);
      process.exit(1);
    }
    
    const token = authResponse.data.token;
    console.log('Authentication successful! Token received.');
    
    // Test the quiz endpoint
    console.log(`\nTesting GET ${baseUrl}/api/quiz/${quizId}`);
    const quizResponse = await axios.get(`${baseUrl}/api/quiz/${quizId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Print results
    console.log('\n=== API Response ===');
    console.log('Status:', quizResponse.status);
    console.log('Success:', quizResponse.data.success);
    
    if (quizResponse.data.success && quizResponse.data.quiz) {
      const quiz = quizResponse.data.quiz;
      console.log('\n=== Quiz Details ===');
      console.log('Quiz ID:', quiz.quizId);
      console.log('Title:', quiz.title);
      console.log('Subject:', quiz.subject);
      console.log('Grade:', quiz.grade);
      console.log('Difficulty:', quiz.difficulty);
      console.log('Total Questions Expected:', quiz.totalQuestions);
      
      console.log('\n=== Questions Analysis ===');
      console.log('Questions Array Present:', quiz.questions ? 'Yes' : 'No');
      console.log('Questions Array Type:', Array.isArray(quiz.questions) ? 'Array' : typeof quiz.questions);
      console.log('Questions Count:', Array.isArray(quiz.questions) ? quiz.questions.length : 0);
      
      if (Array.isArray(quiz.questions) && quiz.questions.length > 0) {
        console.log('\n=== Sample Question ===');
        const sample = quiz.questions[0];
        console.log('Question ID:', sample.questionId);
        console.log('Question Text:', sample.question);
        console.log('Options Count:', Array.isArray(sample.options) ? sample.options.length : 0);
        if (Array.isArray(sample.options) && sample.options.length > 0) {
          console.log('First Option:', sample.options[0]);
        }
      } else {
        console.log('\nWARNING: No questions found in the response!');
      }
    } else {
      console.error('Failed to get quiz:', quizResponse.data.error);
    }
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  } finally {
    rl.close();
  }
}

testQuizEndpoint();
