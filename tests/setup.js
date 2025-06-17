require('dotenv').config({ path: '.env.test' });

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
  query: jest.fn(),
  transaction: jest.fn()
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
