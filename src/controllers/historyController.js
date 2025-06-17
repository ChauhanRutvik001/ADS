const Submission = require('../models/Submission');
const { cache } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * @swagger
 * components:
 *   schemas:
 *     HistoryResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             submissions:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   submission_id:
 *                     type: string
 *                   quiz_id:
 *                     type: string
 *                   score:
 *                     type: integer
 *                   max_score:
 *                     type: integer
 *                   percentage:
 *                     type: number
 *                   completed_at:
 *                     type: string
 *                   quiz_title:
 *                     type: string
 *                   subject:
 *                     type: string
 *                   grade:
 *                     type: integer
 *             pagination:
 *               type: object
 *               properties:
 *                 currentPage:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 totalItems:
 *                   type: integer
 *                 itemsPerPage:
 *                   type: integer
 */

const historyController = {
  /**
   * @swagger
   * /api/quiz/history:
   *   get:
   *     summary: Get user's quiz history with filtering
   *     tags: [History]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: grade
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 12
   *         description: Filter by grade level
   *       - in: query
   *         name: subject
   *         schema:
   *           type: string
   *         description: Filter by subject
   *       - in: query
   *         name: minScore
   *         schema:
   *           type: number
   *           minimum: 0
   *           maximum: 100
   *         description: Minimum score filter
   *       - in: query
   *         name: maxScore
   *         schema:
   *           type: number
   *           minimum: 0
   *           maximum: 100
   *         description: Maximum score filter
   *       - in: query
   *         name: from
   *         schema:
   *           type: string
   *           format: date
   *         description: Start date (YYYY-MM-DD)
   *       - in: query
   *         name: to
   *         schema:
   *           type: string
   *           format: date
   *         description: End date (YYYY-MM-DD)
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *         description: Items per page
   *       - in: query
   *         name: includeRetries
   *         schema:
   *           type: boolean
   *           default: true
   *         description: Include retry attempts
   *     responses:
   *       200:
   *         description: Quiz history retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/HistoryResponse'
   *       400:
   *         description: Invalid query parameters
   *       401:
   *         description: Unauthorized
   */
  async getHistory(req, res, next) {
    try {
      const userId = req.user.id;
      const {
        grade,
        subject,
        minScore,
        maxScore,
        from,
        to,
        page = 1,
        limit = 10,
        includeRetries = true
      } = req.query;

      logger.info(`History request for user ${userId} with filters:`, {
        grade, subject, minScore, maxScore, from, to, page, limit, includeRetries
      });

      // Check cache first
      const cacheKey = `history:${userId}:${JSON.stringify(req.query)}`;
      const cachedHistory = await cache.get(cacheKey);
      
      if (cachedHistory) {
        logger.info('Returning cached history');
        return res.json({
          success: true,
          data: cachedHistory
        });
      }

      // Build options for database query
      const options = {
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        includeRetries: includeRetries === 'true'
      };

      // Add filters if provided
      if (grade) options.grade = parseInt(grade);
      if (subject) options.subject = subject;
      if (minScore !== undefined) options.minScore = parseFloat(minScore);
      if (maxScore !== undefined) options.maxScore = parseFloat(maxScore);
      if (from) options.fromDate = from;
      if (to) options.toDate = to;

      // Get submissions from database
      const result = await Submission.findByUserId(userId, options);

      // Calculate pagination data
      const totalPages = Math.ceil(result.total / options.limit);
      
      const historyData = {
        submissions: result.submissions.map(submission => ({
          id: submission.submission_id,
          quiz: {
            id: submission.quiz_id,
            title: submission.quiz_title,
            subject: submission.subject,
            grade: submission.grade,
            difficulty: submission.difficulty
          },
          score: submission.score,
          totalMarks: submission.max_score,
          percentage: parseFloat(submission.percentage).toFixed(2),
          completedAt: submission.completed_at,
          isRetry: submission.is_retry
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: result.total,
          itemsPerPage: options.limit
        }
      };

      // Cache the result for 30 minutes
      await cache.set(cacheKey, historyData, 1800);

      logger.info(`History retrieved: ${result.submissions.length} submissions for user ${userId}`);

      res.json({
        success: true,
        data: historyData
      });
    } catch (error) {
      logger.error('History retrieval error:', error);
      next(error);
    }
  },

  /**
   * @swagger
   * /api/quiz/history/stats:
   *   get:
   *     summary: Get user's quiz statistics
   *     tags: [History]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User statistics retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  async getStats(req, res, next) {
    try {
      const userId = req.user.id;

      logger.info(`Stats request for user ${userId}`);

      // Check cache first
      const cacheKey = `stats:${userId}`;
      const cachedStats = await cache.get(cacheKey);
      
      if (cachedStats) {
        logger.info('Returning cached stats');
        return res.json({
          success: true,
          stats: cachedStats
        });
      }

      // Get user statistics
      const stats = await Submission.getUserStats(userId);

      // Format the statistics
      const formattedStats = {
        overall: {
          totalSubmissions: parseInt(stats.overall.total_submissions) || 0,
          uniqueQuizzesAttempted: parseInt(stats.overall.unique_quizzes_attempted) || 0,
          averageScore: stats.overall.average_score ? parseFloat(stats.overall.average_score).toFixed(2) : 0,
          bestScore: stats.overall.best_score ? parseFloat(stats.overall.best_score).toFixed(2) : 0,
          worstScore: stats.overall.worst_score ? parseFloat(stats.overall.worst_score).toFixed(2) : 0,
          excellentScores: parseInt(stats.overall.excellent_scores) || 0,
          goodScores: parseInt(stats.overall.good_scores) || 0,
          needsImprovement: parseInt(stats.overall.needs_improvement) || 0,
          totalRetries: parseInt(stats.overall.total_retries) || 0
        },
        bySubject: stats.bySubject.map(subject => ({
          subject: subject.subject,
          attempts: parseInt(subject.attempts),
          averageScore: parseFloat(subject.average_score).toFixed(2),
          bestScore: parseFloat(subject.best_score).toFixed(2)
        })),
        byGrade: stats.byGrade.map(grade => ({
          grade: parseInt(grade.grade),
          attempts: parseInt(grade.attempts),
          averageScore: parseFloat(grade.average_score).toFixed(2),
          bestScore: parseFloat(grade.best_score).toFixed(2)
        }))
      };

      // Cache the stats for 1 hour
      await cache.set(cacheKey, formattedStats, 3600);

      logger.info(`Stats retrieved for user ${userId}`);

      res.json({
        success: true,
        stats: formattedStats
      });
    } catch (error) {
      logger.error('Stats retrieval error:', error);
      next(error);
    }
  },

  /**
   * @swagger
   * /api/quiz/history/{submissionId}:
   *   get:
   *     summary: Get detailed submission results
   *     tags: [History]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: submissionId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Submission details retrieved successfully
   *       404:
   *         description: Submission not found
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Access denied
   */
  async getSubmissionDetails(req, res, next) {
    try {
      const { submissionId } = req.params;
      const userId = req.user.id;

      logger.info(`Submission details request for user ${userId}, submission ${submissionId}`);

      // Find the submission
      const submission = await Submission.findById(submissionId);
      
      if (!submission) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Submission not found'
          }
        });
      }

      // Check if the submission belongs to the requesting user
      if (submission.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied'
          }
        });
      }

      res.json({
        success: true,
        submission: {
          submissionId: submission.submission_id,
          quizId: submission.quiz_id,
          quizTitle: submission.quiz_title,
          subject: submission.subject,
          grade: submission.grade,
          difficulty: submission.difficulty,
          score: submission.score,
          maxScore: submission.max_score,
          percentage: parseFloat(submission.percentage).toFixed(2),
          completedAt: submission.completed_at,
          isRetry: submission.is_retry,
          originalSubmissionId: submission.original_submission_id,
          responses: submission.responses,
          detailedResults: submission.detailed_results,
          suggestions: submission.suggestions
        }
      });
    } catch (error) {
      logger.error('Submission details error:', error);
      next(error);
    }
  },

  /**
   * @swagger
   * /api/quiz/history/recent:
   *   get:
   *     summary: Get recent quiz activity
   *     tags: [History]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 20
   *           default: 5
   *     responses:
   *       200:
   *         description: Recent activity retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  async getRecentActivity(req, res, next) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 5;

      logger.info(`Recent activity request for user ${userId}, limit ${limit}`);

      // Check cache first
      const cacheKey = `recent:${userId}:${limit}`;
      const cachedActivity = await cache.get(cacheKey);
      
      if (cachedActivity) {
        logger.info('Returning cached recent activity');
        return res.json({
          success: true,
          recentActivity: cachedActivity
        });
      }

      // Get recent activity
      const recentActivity = await Submission.getRecentActivity(userId, limit);

      // Format the activity
      const formattedActivity = recentActivity.map(activity => ({
        submissionId: activity.submission_id,
        quizId: activity.quiz_id,
        quizTitle: activity.quiz_title,
        subject: activity.subject,
        grade: activity.grade,
        score: activity.score,
        maxScore: activity.max_score,
        percentage: parseFloat(activity.percentage).toFixed(2),
        completedAt: activity.completed_at,
        isRetry: activity.is_retry
      }));

      // Cache for 15 minutes
      await cache.set(cacheKey, formattedActivity, 900);

      logger.info(`Recent activity retrieved: ${formattedActivity.length} items for user ${userId}`);

      res.json({
        success: true,
        recentActivity: formattedActivity
      });
    } catch (error) {
      logger.error('Recent activity error:', error);
      next(error);
    }
  },

  /**
   * @swagger
   * /api/quiz/history/subjects:
   *   get:
   *     summary: Get list of subjects user has attempted
   *     tags: [History]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Subjects retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  async getSubjects(req, res, next) {
    try {
      const userId = req.user.id;

      logger.info(`Subjects request for user ${userId}`);

      // Get user stats which includes subject breakdown
      const stats = await Submission.getUserStats(userId);

      // Extract unique subjects
      const subjects = stats.bySubject.map(subject => ({
        name: subject.subject,
        attempts: parseInt(subject.attempts),
        averageScore: parseFloat(subject.average_score).toFixed(2),
        bestScore: parseFloat(subject.best_score).toFixed(2)
      }));

      res.json({
        success: true,
        subjects
      });
    } catch (error) {
      logger.error('Subjects retrieval error:', error);
      next(error);
    }
  },

  /**
   * @swagger
   * /api/quiz/history/grades:
   *   get:
   *     summary: Get list of grades user has attempted
   *     tags: [History]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Grades retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  async getGrades(req, res, next) {
    try {
      const userId = req.user.id;

      logger.info(`Grades request for user ${userId}`);

      // Get user stats which includes grade breakdown
      const stats = await Submission.getUserStats(userId);

      // Extract unique grades
      const grades = stats.byGrade.map(grade => ({
        grade: parseInt(grade.grade),
        attempts: parseInt(grade.attempts),
        averageScore: parseFloat(grade.average_score).toFixed(2),
        bestScore: parseFloat(grade.best_score).toFixed(2)
      }));

      res.json({
        success: true,
        grades
      });
    } catch (error) {
      logger.error('Grades retrieval error:', error);
      next(error);
    }
  }
};

module.exports = historyController;
