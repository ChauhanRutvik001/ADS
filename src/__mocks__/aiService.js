// Mock for AI Service
const mockQuiz = {
  quiz_id: 'quiz_123456',
  title: 'Mathematics Quiz Grade 5',
  subject: 'Mathematics',
  grade: 5,
  difficulty: 'EASY',
  total_questions: 10,
  max_score: 10,
  questions: [
    {
      questionId: 'q1',
      question: 'What is 2 + 2?',
      type: 'multiple_choice',
      options: ['3', '4', '5', '6'],
      correctAnswer: '4',
      marks: 1
    }
  ]
};

const mockEvaluation = {
  totalScore: 8,
  maxScore: 10,
  percentage: 80,
  detailedResults: [
    {
      questionId: 'q1',
      correct: true,
      userResponse: 'A',
      correctResponse: 'A',
      marks: 1,
      maxMarks: 1,
      feedback: 'Correct!'
    }
  ],
  suggestions: ['Practice more']
};

const aiService = {
  generateQuiz: jest.fn().mockResolvedValue(mockQuiz),
  evaluateQuiz: jest.fn().mockResolvedValue(mockEvaluation),
  generateHint: jest.fn().mockResolvedValue('This is a hint'),
  generateFeedback: jest.fn().mockResolvedValue('This is feedback'),
  generateRecommendations: jest.fn().mockResolvedValue(['Recommendation 1', 'Recommendation 2'])
};

module.exports = aiService;
