// Test script to verify quiz submission results contain detailed information
const axios = require('axios');
const readline = require('readline');
const util = require('util');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = util.promisify(rl.question).bind(rl);

async function testQuizSubmissionResults() {
  try {
    console.log('===== QUIZ SUBMISSION DETAILED RESULTS VERIFICATION =====');
    
    const baseUrl = await question('Enter API base URL (default: http://localhost:3000): ') || 'http://localhost:3000';
    
    // Login to get auth token
    console.log('\n[1/3] Authenticating...');
    const username = await question('Enter username (default: demo_user): ') || 'demo_user';
    const password = await question('Enter password (default: Demo123!): ') || 'Demo123!';
    
    const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, { 
      username, 
      password 
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Authentication failed: ' + JSON.stringify(loginResponse.data));
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Authentication successful');
    
    // Generate a new quiz for testing
    console.log('\n[2/3] Generating test quiz...');
    const generateResponse = await axios.post(
      `${baseUrl}/api/quiz/generate`,
      {
        grade: 5,
        Subject: 'Mathematics',
        TotalQuestions: 3,
        MaxScore: 9,
        Difficulty: 'EASY'
      },
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!generateResponse.data.success) {
      throw new Error('Quiz generation failed: ' + JSON.stringify(generateResponse.data));
    }
    
    const quizId = generateResponse.data.data.quiz_id;
    const questions = generateResponse.data.data.questions;
    
    console.log(`✅ Generated quiz with ID: ${quizId}`);
    console.log(`   Found ${questions.length} questions`);
    
    // Create responses for submission
    const responses = questions.map(q => ({
      questionId: q.questionId,
      userResponse: 'A'  // Use A for all to ensure some correct answers
    }));
    
    // Submit quiz answers
    console.log('\n[3/3] Submitting quiz answers...');
    console.log(`Submitting ${responses.length} responses`);
    
    const submitResponse = await axios.post(
      `${baseUrl}/api/quiz/submit`,
      {
        quizId,
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
    
    console.log('\n===== QUIZ SUBMISSION RESULTS =====');
    console.log(`Submission ID: ${submission.submissionId}`);
    console.log(`Score: ${submission.score}/${submission.maxScore} (${submission.percentage}%)`);
    console.log(`Completed at: ${submission.completedAt}`);
    
    // Check detailed results
    console.log('\n===== DETAILED RESULTS =====');
    if (submission.detailedResults && Array.isArray(submission.detailedResults)) {
      console.log(`Found ${submission.detailedResults.length} detailed results`);
      
      if (submission.detailedResults.length > 0) {
        console.log('\nSample result detail:');
        const firstResult = submission.detailedResults[0];
        console.log(`- Question ID: ${firstResult.questionId}`);
        console.log(`- Correct: ${firstResult.correct}`);
        console.log(`- User Response: ${firstResult.userResponse}`);
        console.log(`- Correct Response: ${firstResult.correctResponse}`);
        console.log(`- Marks: ${firstResult.marks}/${firstResult.maxMarks}`);
        console.log(`- Feedback: ${firstResult.feedback}`);
      }
    } else {
      console.log('❌ NO DETAILED RESULTS FOUND! API is not returning detailed evaluation.');
    }
    
    // Check suggestions
    console.log('\n===== SUGGESTIONS =====');
    if (submission.suggestions && Array.isArray(submission.suggestions)) {
      console.log(`Found ${submission.suggestions.length} suggestions`);
      
      if (submission.suggestions.length > 0) {
        console.log('\nSuggestions:');
        submission.suggestions.forEach((suggestion, index) => {
          console.log(`${index + 1}. ${suggestion}`);
        });
      }
    } else {
      console.log('❌ NO SUGGESTIONS FOUND! API is not returning suggestions.');
    }
    
    console.log('\n✅ Test completed successfully');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.response ? error.response.data : error.message);
    console.error('\nPlease check the server logs for more details.');
  } finally {
    rl.close();
  }
}

testQuizSubmissionResults();
