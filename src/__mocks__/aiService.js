// Mock implementation of the AI service for testing purposes
const logger = require('../utils/logger');

const aiService = {
  generateQuiz: async (grade, subject, numQuestions, maxScore, difficulty) => {
    logger.info(`[MOCK] Generating ${subject} quiz for grade ${grade}, difficulty ${difficulty}, with ${numQuestions} questions`);
    
    const questions = [];
    for (let i = 1; i <= numQuestions; i++) {
      questions.push({
        questionId: `q${i}`,
        question: `Sample ${subject} question ${i} for grade ${grade} (${difficulty} level)`,
        type: 'multiple_choice',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'A',
        marks: Math.round(maxScore / numQuestions),
        explanation: `This is a sample explanation for question ${i}`
      });
    }
    
    return {
      questions,
      metadata: {
        subject,
        grade,
        difficulty,
        totalQuestions: numQuestions,
        estimatedTime: numQuestions * 2
      }
    };
  },  evaluateQuiz: async (quiz, responses) => {
    logger.info(`[MOCK] Evaluating quiz with ${responses.length} responses`);
    
    // Handle case when quiz.questions is undefined or not an array
    if (!quiz.questions || !Array.isArray(quiz.questions)) {
      logger.warn('[MOCK] Quiz questions is missing or not an array');
      return {
        totalScore: 0,
        maxScore: 10,
        percentage: 0,
        detailedResults: [],
        suggestions: ['Could not evaluate quiz - no questions available']
      };
    }
    
    const maxScore = quiz.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
    let totalScore = 0;
    const detailedResults = [];
    
    // Log received responses and questions for debugging
    logger.info(`[MOCK] Responses received: ${JSON.stringify(responses)}`);
    logger.info(`[MOCK] Quiz has ${quiz.questions.length} questions`);
    
    // Make sure we have questions and responses - if not, add dummy data
    if (quiz.questions.length === 0) {
      logger.warn('[MOCK] No questions found, adding dummy question data');
      quiz.questions = [{
        questionId: 'q1',
        question: 'Dummy question',
        type: 'multiple_choice',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'A',
        marks: 3
      }];
    }
    
    // If no responses, add dummy response
    if (responses.length === 0) {
      logger.warn('[MOCK] No responses found, adding dummy response data');
      responses = [{
        questionId: 'q1', 
        userResponse: 'A'
      }];
    }
    
    responses.forEach(response => {
      const question = quiz.questions.find(q => q.questionId === response.questionId);
      if (!question) {
        logger.warn(`[MOCK] No matching question found for questionId: ${response.questionId}`);
        return;
      }
      
      // Default to 'A' for correctAnswer if not specified
      const correctAnswer = question.correctAnswer || 'A';
      const isCorrect = correctAnswer === response.userResponse;
      const marks = question.marks || 1;
      
      if (isCorrect) totalScore += marks;
        detailedResults.push({
        questionId: response.questionId,
        question: question.question || `Question ${response.questionId}`,
        correct: isCorrect,
        userResponse: response.userResponse,
        correctResponse: correctAnswer,
        correctAnswer: correctAnswer, // Add both field names for compatibility
        marks: isCorrect ? marks : 0,
        maxMarks: marks,
        feedback: isCorrect 
          ? 'Correct! Good work.' 
          : `Incorrect. The correct answer is ${correctAnswer}.`
      });
    });
    
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    
    // Enhanced evaluation result with more details
    const result = {
      totalScore,
      maxScore,
      percentage: Math.round(percentage),
      detailedResults,
      suggestions: [
        'Practice more regularly',
        'Review the concepts you got wrong',
        'Try a harder quiz next time'
      ]
    };
    
    logger.info(`[MOCK] Evaluation result: Score ${totalScore}/${maxScore} (${Math.round(percentage)}%)`);
    logger.info(`[MOCK] Generated ${detailedResults.length} detailed results`);
    
    // Make sure we always return the result object from the mock
    return result;return result;
  },

  generateHint: async (quiz, questionId) => {
    logger.info(`[MOCK] Generating hint for question ${questionId}`);
    
    return {
      hint: `This is a mock hint for question ${questionId}. Consider looking at the key concepts related to this topic.`
    };
  }
};

module.exports = aiService;
