// Verification script for quiz submission
const axios = require('axios');
const readline = require('readline');
const util = require('util');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = util.promisify(rl.question).bind(rl);

async function verifyQuizSubmission() {
  try {
    console.log('===== QUIZ SUBMISSION VERIFICATION TOOL =====');
    console.log('This script will verify if the quiz submission endpoint is working correctly');
    
    const baseUrl = await question('Enter API base URL (default: http://localhost:3000): ') || 'http://localhost:3000';
    
    // Login to get auth token
    console.log('\n[1/3] Authenticating...');
    const email = await question('Enter email: ');
    const password = await question('Enter password: ');
    
    const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, { email, password });
    
    if (!loginResponse.data.success) {
      throw new Error('Authentication failed: ' + JSON.stringify(loginResponse.data));
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Authentication successful');
    
    // Get quiz ID
    console.log('\n[2/3] Retrieving quiz...');
    const quizId = await question('Enter quiz ID (default: quiz_2e2c558b4edc424fa787f7dbaa79139b): ') || 'quiz_2e2c558b4edc424fa787f7dbaa79139b';
    
    const quizResponse = await axios.get(`${baseUrl}/api/quiz/${quizId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!quizResponse.data.success) {
      throw new Error('Failed to retrieve quiz: ' + JSON.stringify(quizResponse.data));
    }
    
    const quiz = quizResponse.data.quiz;
    console.log(`✅ Retrieved quiz: "${quiz.title}" (${quiz.quizId})`);
    console.log(`   - Subject: ${quiz.subject}, Grade: ${quiz.grade}`);
    console.log(`   - Questions: ${quiz.questions.length} of ${quiz.totalQuestions} expected`);
    
    if (!quiz.questions || quiz.questions.length === 0) {
      throw new Error('Quiz has no questions - cannot proceed with submission test');
    }
    
    // Generate responses for each question
    const responses = quiz.questions.map(q => ({
      questionId: q.questionId,
      userResponse: 'A' // Default answer for testing
    }));
    
    console.log('\n[3/3] Submitting quiz answers...');
    console.log(`Submitting ${responses.length} responses`);
    console.log('Sample response:', JSON.stringify(responses[0]));
    
    const submitResponse = await axios.post(
      `${baseUrl}/api/quiz/submit`,
      {
        quizId: quiz.quizId,
        responses
      },
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!submitResponse.data.success) {
      throw new Error('Quiz submission failed: ' + JSON.stringify(submitResponse.data));
    }
    
    const submission = submitResponse.data.submission;
    console.log('\n✅ QUIZ SUBMISSION SUCCESSFUL:');
    console.log(`   - Submission ID: ${submission.submissionId}`);
    console.log(`   - Score: ${submission.score}/${submission.maxScore} (${submission.percentage}%)`);
    console.log(`   - Completed at: ${submission.completedAt}`);
    console.log(`   - Detailed results: ${submission.detailedResults ? submission.detailedResults.length : 0} items`);
    console.log(`   - Suggestions: ${submission.suggestions ? submission.suggestions.length : 0} items`);
    
    if (!submission.detailedResults || submission.detailedResults.length === 0) {
      console.log('\n⚠️ WARNING: No detailed results returned in the submission');
    }
    
    if (!submission.suggestions || submission.suggestions.length === 0) {
      console.log('\n⚠️ WARNING: No suggestions returned in the submission');
    }
    
    console.log('\n✅ VERIFICATION COMPLETE - Quiz submission is working correctly.');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.response ? error.response.data : error.message);
    console.error('\nPlease check the server logs for more details.');
  } finally {
    rl.close();
  }
}

verifyQuizSubmission();
