const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const jwtUtils = require('../src/utils/jwtUtils');

// Mock the User model
jest.mock('../src/models/User');

describe('Authentication API', () => {
  let token;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {    test('should register a new user successfully', async () => {
      // Mock the User.findByUsername method to simulate no existing user
      User.findByUsername.mockResolvedValue(null);
      
      // Mock username availability check to return true (username is available)
      User.isUsernameAvailable.mockResolvedValue(true);
      
      // Mock the User.create method to return a mock user
      User.create.mockResolvedValue({
        id: 1,
        username: 'newuser',
        email: 'newuser@example.com'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          username: 'newuser', // Use a different username from the one used in the failing test
          password: 'TestPass123!',
          email: 'newuser@example.com'
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(User.create).toHaveBeenCalledTimes(1);
    });test('should return 400 if username already exists', async () => {
      // Mock the User.isUsernameAvailable method to simulate username already taken
      User.isUsernameAvailable.mockResolvedValue(false);
      
      // Mock the User.findByUsername method to simulate existing user
      User.findByUsername.mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'existing@example.com'
      });

      // Store original MOCK_AUTH value
      const originalMockAuth = process.env.MOCK_AUTH;
      // Disable mock auth for this test
      process.env.MOCK_AUTH = 'false';

      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send({
          username: 'testuser',
          password: 'TestPass123!',
          email: 'test@example.com'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(User.create).not.toHaveBeenCalled();
      
      // Restore original MOCK_AUTH
      process.env.MOCK_AUTH = originalMockAuth;
    });
  });

  describe('POST /api/auth/login', () => {
    test('should login successfully with valid credentials', async () => {
      // Mock the User.findByUsername method to return a mock user
      User.findByUsername.mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz', // This is not checked with MOCK_AUTH=true
        validatePassword: jest.fn().mockResolvedValue(true)
      });

      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send({
          username: 'testuser',
          password: 'TestPass123!'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      token = response.body.token;
    });    test('should return 401 with invalid credentials', async () => {
      // Mock MOCK_AUTH=false for this test
      const originalMockAuth = process.env.MOCK_AUTH;
      process.env.MOCK_AUTH = 'false';

      // Mock the User.findByUsername method to return a mock user
      User.findByUsername.mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz'
      });
      
      // Mock validatePassword to return false for invalid password
      User.validatePassword.mockResolvedValue(false);

      // Force app to use the mocked environment variable
      jest.resetModules();
      const freshApp = require('../src/app');

      const response = await request(freshApp)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send({
          username: 'testuser',
          password: 'WrongPassword!'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');

      // Restore original env var
      process.env.MOCK_AUTH = originalMockAuth;
    });
  });

  describe('GET /api/auth/profile', () => {
    test('should get user profile with valid token', async () => {
      // Create a valid token for testing
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
      const validToken = jwtUtils.generateToken(mockUser);

      // Mock the User.findById method to return a mock user
      User.findById.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('username', 'testuser');
    });

    test('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/logout', () => {
    test('should logout successfully', async () => {
      // Create a valid token for testing
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
      const validToken = jwtUtils.generateToken(mockUser);

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });
  });
});
