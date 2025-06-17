// Script to fix and test quiz submission issues
const axios = require('axios');
const readline = require('readline');
const util = require('util');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = util.promisify(rl.question).bind(rl);

async function fixQuizSubmissionIssue() {
  try {
    console.log('===== Quiz API Testing Tool =====');
    console.log('This tool will help test and fix issues with quiz retrieval and submission');
    
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
    console.log('✅ Authentication successful! Token received.');
    
    // Test steps
    const steps = [
      'Get quiz details',
      'Submit quiz answers',
      'Exit'
    ];
    
    let running = true;
    while (running) {
      console.log('\n===== Available Actions =====');
      steps.forEach((step, index) => {
        console.log(`${index + 1}. ${step}`);
      });
      
      const choice = parseInt(await question('\nSelect an option (1-3): '));
      
      switch (choice) {
        case 1:
          await getQuizDetails(baseUrl, quizId, token);
          break;
        case 2:
          await submitQuiz(baseUrl, quizId, token);
          break;
        case 3:
          console.log('Exiting...');
          running = false;
          break;
        default:
          console.log('Invalid option. Please try again.');
      }
    }
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  } finally {
    rl.close();
  }
}

async function getQuizDetails(baseUrl, quizId, token) {
  console.log(`\n🔄 Fetching quiz ${quizId}...`);
  try {
    const response = await axios.get(`${baseUrl}/api/quiz/${quizId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      const quiz = response.data.quiz;
      console.log('\n✅ Quiz details retrieved successfully:');
      console.log('Quiz ID:', quiz.quizId);
      console.log('Title:', quiz.title);
      console.log('Subject:', quiz.subject);
      console.log('Grade:', quiz.grade);
      console.log('Difficulty:', quiz.difficulty);
      console.log('Total Questions:', quiz.totalQuestions);
      console.log('Actual Questions Count:', quiz.questions ? quiz.questions.length : 0);
      
      if (quiz.questions && quiz.questions.length > 0) {
        console.log('\n📋 Sample Questions:');
        quiz.questions.slice(0, 2).forEach((q, i) => {
          console.log(`\nQuestion ${i+1}: ${q.questionId}`);
          console.log('Text:', q.question);
          console.log('Type:', q.type);
          console.log('Options:', q.options);
          console.log('Marks:', q.marks);
        });
        
        return quiz.questions;
      } else {
        console.log('❌ No questions found in the quiz!');
      }
    } else {
      console.log('❌ Failed to retrieve quiz:', response.data.error);
    }
  } catch (error) {
    console.error('❌ Error fetching quiz:', error.response ? error.response.data : error.message);
  }
  
  return null;
}

async function submitQuiz(baseUrl, quizId, token) {
  try {
    console.log(`\n🔄 Preparing to submit answers for quiz ${quizId}...`);
    
    // First get the quiz to know the questions
    const questions = await getQuizDetails(baseUrl, quizId, token);
    
    if (!questions || questions.length === 0) {
      console.log('❌ Cannot submit without questions. Please check the quiz.');
      return;
    }
    
    console.log('\n📝 Generating mock answers...');
    const responses = questions.map(q => ({
      questionId: q.questionId,
      userResponse: q.options && q.options.length > 0 ? q.options[0][0] : 'A' // Use first letter of first option or default to A
    }));
    
    console.log(`Generated ${responses.length} responses. Sample responses:`);
    responses.slice(0, 3).forEach(r => {
      console.log(`- ${r.questionId}: ${r.userResponse}`);
    });
    
    const useResponses = (await question('\nSubmit these responses? (y/n): ')).toLowerCase() === 'y';
    
    if (!useResponses) {
      console.log('Submission cancelled.');
      return;
    }
    
    console.log('\n🔄 Submitting quiz answers...');
    const response = await axios.post(
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
    
    if (response.data.success) {
      const submission = response.data.submission;
      console.log('\n✅ Quiz submitted successfully:');
      console.log('Submission ID:', submission.submissionId);
      console.log('Score:', submission.score);
      console.log('Max Score:', submission.maxScore);
      console.log('Percentage:', submission.percentage);
      console.log('Completed At:', submission.completedAt);
    } else {
      console.log('❌ Quiz submission failed:', response.data.error);
    }
  } catch (error) {
    console.error('❌ Error submitting quiz:', error.response ? error.response.data.error : error.message);
    
    // Show more detailed error information
    if (error.response && error.response.data) {
      console.log('\nDetailed error information:');
      console.log(JSON.stringify(error.response.data, null, 2));
    }
  }
}

fixQuizSubmissionIssue();
