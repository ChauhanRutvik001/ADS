// Test script to verify only the quiz evaluation functionality
const logger = require('./src/utils/logger');
const aiService = require('./src/__mocks__/aiService');

// Mock quiz and response data
const mockQuiz = {
  quiz_id: 'q123',
  title: 'Test Quiz',
  subject: 'Math',
  grade: 5,
  difficulty: 'EASY',
  questions: [
    {
      questionId: 'q1',
      question: 'What is 2 + 2?',
      type: 'multiple_choice',
      options: ['1', '3', '4', '5'],
      correctAnswer: 'C',
      marks: 2
    },
    {
      questionId: 'q2',
      question: 'What is 5 x 5?',
      type: 'multiple_choice',
      options: ['15', '20', '25', '30'],
      correctAnswer: 'C',
      marks: 3
    }
  ],
  max_score: 5
};

const mockResponses = [
  { questionId: 'q1', userResponse: 'C' },
  { questionId: 'q2', userResponse: 'B' }
];

async function testEvaluation() {
  console.log('========= QUIZ EVALUATION TEST =========');
  console.log(`Testing with ${mockQuiz.questions.length} questions and ${mockResponses.length} responses`);
  
  try {
    // Test the mock aiService directly
    console.log('\nTesting mock AI evaluation...');
    const result = await aiService.evaluateQuiz(mockQuiz, mockResponses);
    
    console.log('\n=== EVALUATION RESULT ===');
    console.log(`Score: ${result.totalScore}/${result.maxScore} (${result.percentage}%)`);
    console.log(`Detailed Results Count: ${result.detailedResults.length}`);
    console.log(`Suggestions Count: ${result.suggestions.length}`);
    
    // Check detailed results
    console.log('\n=== DETAILED RESULTS ===');
    if (result.detailedResults.length > 0) {
      result.detailedResults.forEach((detail, i) => {
        console.log(`\nQuestion ${i+1}:`);
        console.log(`- QuestionId: ${detail.questionId}`);
        console.log(`- User Response: ${detail.userResponse}`);
        console.log(`- Correct Answer: ${detail.correctResponse}`);
        console.log(`- Correct: ${detail.correct}`);
        console.log(`- Marks: ${detail.marks}/${detail.maxMarks}`);
      });
    } else {
      console.error('❌ No detailed results found!');
    }
    
    // Check suggestions
    console.log('\n=== SUGGESTIONS ===');
    if (result.suggestions.length > 0) {
      result.suggestions.forEach((suggestion, i) => {
        console.log(`${i+1}. ${suggestion}`);
      });
    } else {
      console.error('❌ No suggestions found!');
    }
    
    console.log('\n✅ Test completed successfully');
  } catch (error) {
    console.error('\n❌ ERROR during test:', error);
  }
}

// Run the test
testEvaluation();
