const request = require('supertest');
const app = require('../src/app');
const Submission = require('../src/models/Submission');
const jwtUtils = require('../src/utils/jwtUtils');

// Mock the models
jest.mock('../src/models/Submission');

describe('History API', () => {
  let authToken;
  let mockSubmissionId;
  
  beforeAll(() => {
    // Create a valid token for testing
    const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
    authToken = jwtUtils.generateToken(mockUser);
    mockSubmissionId = 'sub_123456';
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/history', () => {
    test('should get quiz history with default parameters', async () => {
      // Mock the Submission.findByUser method
      const mockSubmissions = {
        submissions: [
          {
            submission_id: mockSubmissionId,
            quiz_id: 'quiz_123456',
            score: 8,
            max_score: 10,
            percentage: 80,
            completed_at: new Date().toISOString(),
            quiz_title: 'Mathematics Quiz',
            subject: 'Mathematics',
            grade: 5
          }
        ],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 1,
          itemsPerPage: 10
        }
      };
      
      Submission.findByUser.mockResolvedValue(mockSubmissions);

      const response = await request(app)
        .get('/api/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('submissions');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Submission.findByUser).toHaveBeenCalledTimes(1);
    });

    test('should filter history with provided filters', async () => {
      // Mock the Submission.findByUser method
      const mockSubmissions = {
        submissions: [
          {
            submission_id: mockSubmissionId,
            quiz_id: 'quiz_123456',
            score: 8,
            max_score: 10,
            percentage: 80,
            completed_at: '2025-06-10T12:00:00.000Z',
            quiz_title: 'Mathematics Quiz',
            subject: 'Mathematics',
            grade: 5
          }
        ],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 1,
          itemsPerPage: 10
        }
      };
      
      Submission.findByUser.mockResolvedValue(mockSubmissions);

      const response = await request(app)
        .get('/api/history')
        .query({
          subject: 'Mathematics',
          grade: 5,
          minScore: 70,
          from: '2025-06-01',
          to: '2025-06-15'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('submissions');
      expect(Submission.findByUser).toHaveBeenCalledTimes(1);
      expect(Submission.findByUser).toHaveBeenCalledWith(
        expect.any(Number),
        expect.objectContaining({
          subject: 'Mathematics',
          grade: 5,
          minScore: '70',
          from: '2025-06-01',
          to: '2025-06-15'
        })
      );
    });
  });

  describe('GET /api/history/stats', () => {
    test('should get user statistics', async () => {
      // Mock the Submission.getUserStats method
      const mockStats = {
        totalQuizzes: 10,
        averageScore: 75.5,
        highestScore: 100,
        lowestScore: 60,
        subjectBreakdown: [
          { subject: 'Mathematics', count: 5, averageScore: 80 },
          { subject: 'Science', count: 3, averageScore: 70 },
          { subject: 'English', count: 2, averageScore: 75 }
        ],
        recentProgress: [
          { date: '2025-06-10', averageScore: 75 },
          { date: '2025-06-11', averageScore: 80 }
        ]
      };
      
      Submission.getUserStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/history/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('totalQuizzes');
      expect(response.body.stats).toHaveProperty('averageScore');
      expect(response.body.stats).toHaveProperty('subjectBreakdown');
      expect(Submission.getUserStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/history/submission/:submissionId', () => {
    test('should get submission details by id', async () => {
      // Mock the Submission.findById method
      const mockSubmission = {
        submission_id: mockSubmissionId,
        quiz_id: 'quiz_123456',
        user_id: 1,
        responses: [
          { questionId: 'q1', userResponse: 'A' },
          { questionId: 'q2', userResponse: 'B' }
        ],
        score: 8,
        max_score: 10,
        percentage: 80,
        completed_at: new Date().toISOString(),
        detailed_results: [
          {
            questionId: 'q1',
            correct: true,
            userResponse: 'A',
            correctResponse: 'A',
            marks: 5,
            maxMarks: 5,
            feedback: 'Great job!'
          },
          {
            questionId: 'q2',
            correct: false,
            userResponse: 'B',
            correctResponse: 'C',
            marks: 3,
            maxMarks: 5,
            feedback: 'Close, but not quite right.'
          }
        ]
      };
      
      Submission.findById.mockResolvedValue(mockSubmission);

      const response = await request(app)
        .get(`/api/history/submission/${mockSubmissionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('submission');
      expect(response.body.submission).toHaveProperty('submissionId', mockSubmissionId);
      expect(response.body.submission).toHaveProperty('score');
      expect(response.body.submission).toHaveProperty('detailedResults');
      expect(Submission.findById).toHaveBeenCalledTimes(1);
    });

    test('should return 404 for non-existent submission', async () => {
      Submission.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/history/submission/nonexistent_id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/history/subjects', () => {
    test('should get list of subjects user has taken quizzes in', async () => {
      // Mock the Submission.getUserSubjects method
      const mockSubjects = ['Mathematics', 'Science', 'English'];
      
      Submission.getUserSubjects.mockResolvedValue(mockSubjects);

      const response = await request(app)
        .get('/api/history/subjects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('subjects');
      expect(Array.isArray(response.body.subjects)).toBeTruthy();
      expect(Submission.getUserSubjects).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/history/grades', () => {
    test('should get list of grades user has taken quizzes in', async () => {
      // Mock the Submission.getUserGrades method
      const mockGrades = [3, 4, 5, 6];
      
      Submission.getUserGrades.mockResolvedValue(mockGrades);

      const response = await request(app)
        .get('/api/history/grades')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('grades');
      expect(Array.isArray(response.body.grades)).toBeTruthy();
      expect(Submission.getUserGrades).toHaveBeenCalledTimes(1);
    });
  });
});
