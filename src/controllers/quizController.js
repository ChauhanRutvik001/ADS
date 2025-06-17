const Quiz = require('../models/Quiz');
const Submission = require('../models/Submission');
const aiService = require('../services/aiService');
const { cache } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * @swagger
 * components:
 *   schemas:
 *     GenerateQuizRequest:
 *       type: object
 *       required:
 *         - grade
 *         - Subject
 *         - TotalQuestions
 *         - MaxScore
 *         - Difficulty
 *       properties:
 *         grade:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         Subject:
 *           type: string
 *           description: Subject name
 *         TotalQuestions:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         MaxScore:
 *           type: integer
 *           minimum: 1
 *           maximum: 500
 *         Difficulty:
 *           type: string
 *           enum: [EASY, MEDIUM, HARD]
 *     SubmitQuizRequest:
 *       type: object
 *       required:
 *         - quizId
 *         - responses
 *       properties:
 *         quizId:
 *           type: string
 *         responses:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               questionId:
 *                 type: string
 *               userResponse:
 *                 type: string
 */

const quizController = {
  /**
   * @swagger
   * /api/quiz/generate:
   *   post:
   *     summary: Generate new quiz using AI
   *     tags: [Quiz]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/GenerateQuizRequest'
   *     responses:
   *       200:
   *         description: Quiz generated successfully
   *       400:
   *         description: Invalid input
   *       401:
   *         description: Unauthorized
   *       502:
   *         description: AI service error
   */
  async generateQuiz(req, res, next) {
    try {
      const { grade, Subject: subject, TotalQuestions: totalQuestions, MaxScore: maxScore, Difficulty: difficulty } = req.body;
      const userId = req.user.id;

      logger.info(`Generating quiz for user ${userId}: ${subject}, Grade ${grade}, ${difficulty}`);

      // Generate quiz using AI service
      const aiQuizData = await aiService.generateQuiz(grade, subject, totalQuestions, maxScore, difficulty);
      
      // Create title
      const title = `Grade ${grade} ${subject} Quiz`;

      // Save quiz to database
      const quiz = await Quiz.create({
        userId,
        title,
        subject,
        grade,
        difficulty,
        totalQuestions,
        maxScore,
        questions: aiQuizData.questions
      });

      // Cache the quiz
      await cache.setQuiz(quiz.quiz_id, quiz);

      logger.info(`Quiz generated successfully: ${quiz.quiz_id}`);

      res.json({
        success: true,
        quiz: {
          quizId: quiz.quiz_id,
          title: quiz.title,
          grade: quiz.grade,
          Subject: quiz.subject,
          TotalQuestions: quiz.total_questions,
          MaxScore: quiz.max_score,
          Difficulty: quiz.difficulty,
          questions: quiz.questions.map(q => ({
            questionId: q.questionId,
            question: q.question,
            type: q.type,
            options: q.options,
            correctAnswer: q.correctAnswer,
            marks: q.marks
          })),
          createdAt: quiz.created_at
        }
      });
    } catch (error) {
      logger.error('Quiz generation error:', error);
      
      if (error.message.includes('AI service')) {
        return res.status(502).json({
          success: false,
          error: {
            message: 'AI service temporarily unavailable. Please try again later.'
          }
        });
      }
      
      next(error);
    }
  },

  /**
   * @swagger
   * /api/quiz/submit:
   *   post:
   *     summary: Submit quiz answers for evaluation
   *     tags: [Quiz]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SubmitQuizRequest'
   *     responses:
   *       200:
   *         description: Quiz submitted and evaluated successfully
   *       400:
   *         description: Invalid input
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Quiz not found
   */
  async submitQuiz(req, res, next) {
    try {
      const { quizId, responses } = req.body;
      const userId = req.user.id;

      logger.info(`Quiz submission for user ${userId}, quiz ${quizId}`);

      // Find the quiz
      let quiz = await cache.getQuiz(quizId);
      
      if (!quiz) {
        quiz = await Quiz.findById(quizId);
        if (!quiz) {
          return res.status(404).json({
            success: false,
            error: {
              message: 'Quiz not found'
            }
          });
        }
        // Cache the quiz for future use
        await cache.setQuiz(quizId, quiz);
      }

      // Validate responses
      if (responses.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'At least one response is required'
          }
        });
      }

      // Check if user has already submitted this quiz (for retry logic)
      const existingSubmission = await Submission.getLastSubmission(userId, quizId);
      const isRetry = !!existingSubmission;

      // Evaluate quiz using AI service
      const evaluationResult = await aiService.evaluateQuiz(quiz, responses);

      // Create submission record
      const submission = await Submission.create({
        quizId,
        userId,
        responses,
        score: evaluationResult.totalScore,
        maxScore: evaluationResult.maxScore,
        percentage: evaluationResult.percentage,
        detailedResults: evaluationResult.detailedResults,
        suggestions: evaluationResult.suggestions || [],
        isRetry,
        originalSubmissionId: isRetry ? existingSubmission.submission_id : null
      });

      // Invalidate user cache
      await cache.invalidateUserCache(userId);

      logger.info(`Quiz submitted successfully: ${submission.submission_id}, Score: ${evaluationResult.totalScore}/${evaluationResult.maxScore}`);

      res.json({
        success: true,
        submission: {
          submissionId: submission.submission_id,
          quizId: submission.quiz_id,
          score: submission.score,
          maxScore: submission.max_score,
          percentage: submission.percentage,
          detailedResults: submission.detailed_results,
          completedAt: submission.completed_at,
          suggestions: submission.suggestions || []
        }
      });
    } catch (error) {
      logger.error('Quiz submission error:', error);
      next(error);
    }
  },

  /**
   * @swagger
   * /api/quiz/retry/{quizId}:
   *   post:
   *     summary: Retry a quiz
   *     tags: [Quiz]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: quizId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Quiz retry initialized successfully
   *       404:
   *         description: Quiz not found
   *       401:
   *         description: Unauthorized
   */
  async retryQuiz(req, res, next) {
    try {
      const { quizId } = req.params;
      const userId = req.user.id;

      logger.info(`Quiz retry request for user ${userId}, quiz ${quizId}`);

      // Find the quiz
      let quiz = await cache.getQuiz(quizId);
      
      if (!quiz) {
        quiz = await Quiz.findById(quizId);
        if (!quiz) {
          return res.status(404).json({
            success: false,
            error: {
              message: 'Quiz not found'
            }
          });
        }
      }

      // Get the last submission for retry tracking
      const lastSubmission = await Submission.getLastSubmission(userId, quizId);

      if (!lastSubmission) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'No previous submission found for this quiz'
          }
        });
      }

      // Return quiz data for retry (without answers)
      res.json({
        success: true,
        quiz: {
          quizId: quiz.quiz_id,
          title: quiz.title,
          grade: quiz.grade,
          Subject: quiz.subject,
          TotalQuestions: quiz.total_questions,
          MaxScore: quiz.max_score,
          Difficulty: quiz.difficulty,
          questions: quiz.questions.map(q => ({
            questionId: q.questionId,
            question: q.question,
            type: q.type,
            options: q.options,
            marks: q.marks
            // Note: correctAnswer is not included for retry
          })),
          isRetry: true,
          originalSubmissionId: lastSubmission.submission_id,
          previousScore: lastSubmission.percentage
        }
      });
    } catch (error) {
      logger.error('Quiz retry error:', error);
      next(error);
    }
  },

  /**
   * @swagger
   * /api/quiz/{quizId}/hint/{questionId}:
   *   get:
   *     summary: Get AI-generated hint for a question
   *     tags: [Quiz]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: quizId
   *         required: true
   *         schema:
   *           type: string
   *       - in: path
   *         name: questionId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Hint generated successfully
   *       404:
   *         description: Quiz or question not found
   *       401:
   *         description: Unauthorized
   */
  async getHint(req, res, next) {
    try {
      const { quizId, questionId } = req.params;
      const userId = req.user.id;

      logger.info(`Hint request for user ${userId}, quiz ${quizId}, question ${questionId}`);

      // Find the quiz
      let quiz = await cache.getQuiz(quizId);
      
      if (!quiz) {
        quiz = await Quiz.findById(quizId);
        if (!quiz) {
          return res.status(404).json({
            success: false,
            error: {
              message: 'Quiz not found'
            }
          });
        }
      }

      // Find the specific question
      const question = quiz.questions.find(q => q.questionId === questionId);
      
      if (!question) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Question not found'
          }
        });
      }

      // Generate hint using AI service
      const hint = await aiService.generateHint(question, quiz);

      logger.info(`Hint generated successfully for question ${questionId}`);

      res.json({
        success: true,
        hint
      });
    } catch (error) {
      logger.error('Hint generation error:', error);
      next(error);
    }
  },

  /**
   * @swagger
   * /api/quiz/{quizId}:
   *   get:
   *     summary: Get quiz details
   *     tags: [Quiz]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: quizId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Quiz details retrieved successfully
   *       404:
   *         description: Quiz not found
   *       401:
   *         description: Unauthorized
   */
  async getQuiz(req, res, next) {
    try {
      const { quizId } = req.params;
      const userId = req.user.id;

      logger.info(`Quiz details request for user ${userId}, quiz ${quizId}`);

      // Find the quiz
      let quiz = await cache.getQuiz(quizId);
      
      if (!quiz) {
        quiz = await Quiz.findById(quizId);
        if (!quiz) {
          return res.status(404).json({
            success: false,
            error: {
              message: 'Quiz not found'
            }
          });
        }
        await cache.setQuiz(quizId, quiz);
      }

      // Check if user has attempted this quiz
      const hasAttempted = await Submission.hasUserAttempted(userId, quizId);
      const lastSubmission = hasAttempted ? await Submission.getLastSubmission(userId, quizId) : null;

      // Get quiz statistics
      const stats = await Quiz.getQuizStats(quizId);

      res.json({
        success: true,
        quiz: {
          quizId: quiz.quiz_id,
          title: quiz.title,
          grade: quiz.grade,
          subject: quiz.subject,
          totalQuestions: quiz.total_questions,
          maxScore: quiz.max_score,
          difficulty: quiz.difficulty,
          createdAt: quiz.created_at,
          hasAttempted,
          lastSubmission: lastSubmission ? {
            submissionId: lastSubmission.submission_id,
            score: lastSubmission.score,
            percentage: lastSubmission.percentage,
            completedAt: lastSubmission.completed_at,
            isRetry: lastSubmission.is_retry
          } : null,
          stats: {
            totalAttempts: stats.total_attempts || 0,
            averageScore: stats.average_score ? parseFloat(stats.average_score).toFixed(2) : 0,
            highestScore: stats.highest_score ? parseFloat(stats.highest_score).toFixed(2) : 0,
            uniqueUsers: stats.unique_users || 0
          }
        }
      });
    } catch (error) {
      logger.error('Get quiz error:', error);
      next(error);
    }
  },

  /**
   * @swagger
   * /api/quiz/{quizId}/leaderboard:
   *   get:
   *     summary: Get quiz leaderboard
   *     tags: [Quiz]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: quizId
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 10
   *     responses:
   *       200:
   *         description: Leaderboard retrieved successfully
   *       404:
   *         description: Quiz not found
   */
  async getLeaderboard(req, res, next) {
    try {
      const { quizId } = req.params;
      const limit = parseInt(req.query.limit) || 10;

      logger.info(`Leaderboard request for quiz ${quizId}`);

      // Check if quiz exists
      const quiz = await Quiz.findById(quizId);
      if (!quiz) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Quiz not found'
          }
        });
      }

      // Get leaderboard
      const leaderboard = await Submission.getLeaderboard(quizId, limit);

      res.json({
        success: true,
        leaderboard: leaderboard.map((entry, index) => ({
          rank: index + 1,
          username: entry.username,
          bestScore: parseFloat(entry.best_score).toFixed(2),
          firstCompletion: entry.first_completion,
          totalAttempts: entry.total_attempts
        })),
        quiz: {
          title: quiz.title,
          subject: quiz.subject,
          grade: quiz.grade
        }
      });
    } catch (error) {
      logger.error('Leaderboard error:', error);
      next(error);
    }
  }
};

module.exports = quizController;
