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
  },

  evaluateQuiz: async (quiz, responses) => {
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
    
    responses.forEach(response => {
      const question = quiz.questions.find(q => q.questionId === response.questionId);
      if (!question) return;
      
      const isCorrect = question.correctAnswer === response.userResponse;
      const marks = question.marks || 1;
      
      if (isCorrect) totalScore += marks;
      
      detailedResults.push({
        questionId: response.questionId,
        correct: isCorrect,
        userResponse: response.userResponse,
        correctResponse: question.correctAnswer,
        marks: isCorrect ? marks : 0,
        maxMarks: marks,
        feedback: isCorrect 
          ? 'Correct! Good work.' 
          : `Incorrect. The correct answer is ${question.correctAnswer}.`
      });
    });
    
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    
    return {
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
  },

  generateHint: async (quiz, questionId) => {
    logger.info(`[MOCK] Generating hint for question ${questionId}`);
    
    return {
      hint: `This is a mock hint for question ${questionId}. Consider looking at the key concepts related to this topic.`
    };
  }
};

module.exports = aiService;
