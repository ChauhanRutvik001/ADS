require('dotenv').config({ path: '.env.test' });
const { mockUser, mockQuiz, mockSubmission } = require('./mocks/models');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_for_testing_only';
process.env.MOCK_AUTH = 'true';

// Mock Redis and Database for tests
jest.mock('../src/config/redis', () => ({
  connectRedis: jest.fn(),
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    setQuiz: jest.fn(),
    getQuiz: jest.fn(),
    invalidateUserCache: jest.fn()
  }
}));

jest.mock('../src/config/database', () => ({
  connectDatabase: jest.fn(),
  query: jest.fn().mockResolvedValue({ rows: [] }),
  transaction: jest.fn().mockImplementation((callback) => callback())
}));

// Mock User model
jest.mock('../src/models/User', () => ({
  findById: jest.fn().mockResolvedValue(mockUser),
  findByUsername: jest.fn().mockResolvedValue(mockUser),
  findByEmail: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockResolvedValue(mockUser),
  isUsernameAvailable: jest.fn().mockImplementation((username) => {
    // In test environments, assume 'testuser' already exists
    return Promise.resolve(username !== 'testuser');
  }),
  isEmailAvailable: jest.fn().mockResolvedValue(true),
  updateLastLogin: jest.fn().mockResolvedValue(true),
  validatePassword: jest.fn().mockImplementation((password, hash) => {
    // Mock password validation - Consider password valid only if it's "TestPass123!"
    return Promise.resolve(password === 'TestPass123!');
  }),
  getUserStats: jest.fn().mockResolvedValue({
    totalQuizzes: 5,
    averageScore: 85,
    bestSubject: 'Mathematics',
    worstSubject: 'History',
    quizzesCreated: 10,
    quizzesCompleted: 8
  }),
  getStats: jest.fn().mockResolvedValue({
    total_quizzes_created: 5,
    total_submissions: 10,
    average_score: 85
  })
}));

// Mock Quiz model
jest.mock('../src/models/Quiz', () => ({
  create: jest.fn().mockResolvedValue(mockQuiz),
  findById: jest.fn().mockResolvedValue(mockQuiz),
  findByUserId: jest.fn().mockResolvedValue([mockQuiz]),
  update: jest.fn().mockResolvedValue(mockQuiz)
}));

// Mock Submission model
jest.mock('../src/models/Submission', () => ({
  create: jest.fn().mockResolvedValue(mockSubmission),
  findById: jest.fn().mockResolvedValue(mockSubmission),
  findByUser: jest.fn().mockResolvedValue([mockSubmission]),
  findByUserId: jest.fn().mockResolvedValue({
    submissions: [{
      submission_id: 'sub_123456',
      quiz_id: 'quiz_123456',
      score: 8,
      max_score: 10,
      percentage: 80,
      completed_at: new Date().toISOString(),
      quiz_title: 'Mathematics Quiz',
      subject: 'Mathematics',
      grade: 5,
      difficulty: 'EASY',
      is_retry: false,
      original_submission_id: null
    }],
    total: 1,
    limit: 10,
    offset: 0
  }),
  findByQuizId: jest.fn().mockResolvedValue([mockSubmission]),
  getLastSubmission: jest.fn().mockResolvedValue(mockSubmission),
  getUserStats: jest.fn().mockResolvedValue({
    overall: {
      total_submissions: 10,
      unique_quizzes_attempted: 8,
      average_score: 75,
      best_score: 100,
      worst_score: 50,
      excellent_scores: 3,
      good_scores: 5,
      needs_improvement: 2,
      total_retries: 2
    },
    bySubject: [
      { subject: 'Mathematics', attempts: 5, average_score: 85, best_score: 100 },
      { subject: 'Science', attempts: 3, average_score: 70, best_score: 90 }
    ],
    byGrade: [
      { grade: 5, attempts: 6, average_score: 80, best_score: 100 },
      { grade: 6, attempts: 4, average_score: 70, best_score: 90 }
    ]
  }),
  getUserSubjects: jest.fn().mockResolvedValue(['Mathematics', 'Science', 'English']),
  getUserGrades: jest.fn().mockResolvedValue([3, 4, 5, 6])
}));

// Global test setup
beforeAll(async () => {
  // Any global setup
});

afterAll(async () => {
  // Any global cleanup
});

// Suppress console logs during testing
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};
