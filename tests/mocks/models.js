// Properly mocked models for testing

const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  password_hash: '$2b$10$MockPasswordHash'
};

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
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const mockSubmission = {
  submission_id: 'sub_123456',
  quiz_id: 'quiz_123456',
  user_id: 1,
  responses: [{ questionId: 'q1', userResponse: 'A' }],
  score: 8,
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
  suggestions: ['Practice more'],
  completed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  isRetry: false,
  originalSubmissionId: null
};

module.exports = {
  mockUser,
  mockQuiz,
  mockSubmission
};
