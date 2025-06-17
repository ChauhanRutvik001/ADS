// Test script for quiz submission
const axios = require('axios');
const readline = require('readline');
const util = require('util');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = util.promisify(rl.question).bind(rl);

async function testQuizSubmission() {
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
    
    // First, get the quiz to check available questions
    console.log(`\nFetching quiz ${quizId} to check available questions...`);
    const quizResponse = await axios.get(`${baseUrl}/api/quiz/${quizId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!quizResponse.data.success || !quizResponse.data.quiz) {
      console.error('Failed to get quiz:', quizResponse.data.error || 'Unknown error');
      process.exit(1);
    }
    
    const questions = quizResponse.data.quiz.questions || [];
    console.log(`Quiz has ${questions.length} questions`);
    
    if (questions.length === 0) {
      console.error('No questions found in the quiz. Cannot submit responses.');
      process.exit(1);
    }
    
    // Prepare submission data
    const responses = questions.map(q => ({
      questionId: q.questionId,
      userResponse: q.options && q.options.length > 0 ? 'A' : '' // Submit 'A' for all questions as a test
    }));
    
    console.log(`\nSubmitting responses for ${responses.length} questions...`);
    
    // Submit the quiz
    const submissionResponse = await axios.post(
      `${baseUrl}/api/quiz/submit`,
      {
        quizId,
        responses
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Print results
    console.log('\n=== Submission Response ===');
    console.log('Status:', submissionResponse.status);
    console.log('Success:', submissionResponse.data.success);
    
    if (submissionResponse.data.success && submissionResponse.data.submission) {
      const submission = submissionResponse.data.submission;
      console.log('\n=== Submission Details ===');
      console.log('Submission ID:', submission.submissionId);
      console.log('Score:', submission.score);
      console.log('Max Score:', submission.maxScore);
      console.log('Percentage:', submission.percentage);
      console.log('Completed At:', submission.completedAt);
      console.log('\n=== Detailed Results ===');
      if (submission.detailedResults && submission.detailedResults.length > 0) {
        console.log(`${submission.detailedResults.length} question results available`);
      } else {
        console.log('No detailed results available');
      }
    } else {
      console.error('Failed to submit quiz:', submissionResponse.data.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  } finally {
    rl.close();
  }
}

testQuizSubmission();
