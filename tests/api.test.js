const request = require('supertest');
const app = require('../src/app');

describe('API Health Check', () => {
  test('GET /health should return 200', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('timestamp');
  });

  test('GET / should return welcome message', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('documentation', '/api-docs');
  });

  test('GET /invalid-route should return 404', async () => {
    const response = await request(app)
      .get('/invalid-route')
      .expect(404);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body.error).toHaveProperty('message');
  });
});

describe('Authentication Endpoints', () => {
  test('POST /api/auth/login with mock auth should succeed', async () => {
    const loginData = {
      username: 'testuser',
      password: 'anypassword'
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('username', 'testuser');
  });

  test('POST /api/auth/login with invalid data should fail', async () => {
    const loginData = {
      username: 'ab', // too short
      password: '123' // too short
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData)
      .expect(400);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body.error).toHaveProperty('message', 'Validation failed');
  });

  test('POST /api/auth/register should create new user', async () => {
    const registerData = {
      username: 'newuser',
      password: 'NewUser123!',
      email: 'newuser@example.com'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(registerData)
      .expect(201);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
  });
});

describe('Protected Routes', () => {
  let authToken;

  beforeAll(async () => {
    // Get auth token for protected route tests
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'password' });
    
    authToken = loginResponse.body.token;
  });

  test('GET /api/auth/profile should return user profile', async () => {
    const response = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('user');
  });

  test('POST /api/quiz/generate should generate quiz', async () => {
    const quizData = {
      grade: 5,
      Subject: 'Mathematics',
      TotalQuestions: 3,
      MaxScore: 6,
      Difficulty: 'EASY'
    };

    const response = await request(app)
      .post('/api/quiz/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send(quizData)
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('quiz');
    expect(response.body.quiz).toHaveProperty('questions');
  });

  test('GET /api/quiz/history should return empty history for new user', async () => {
    const response = await request(app)
      .get('/api/quiz/history')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveProperty('submissions');
    expect(response.body.data).toHaveProperty('pagination');
  });

  test('Requests without auth token should fail', async () => {
    await request(app)
      .get('/api/auth/profile')
      .expect(401);

    await request(app)
      .post('/api/quiz/generate')
      .send({ grade: 5, Subject: 'Math', TotalQuestions: 3, MaxScore: 6, Difficulty: 'EASY' })
      .expect(401);
  });
});
