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
   */  async generateQuiz(req, res, next) {
    try {
      // Normalize field names from various formats
      const { 
        grade, 
        subject = req.body.Subject, 
        numQuestions = req.body.totalQuestions || req.body.TotalQuestions,
        totalQuestions = req.body.numQuestions || req.body.TotalQuestions,
        maxScore = req.body.MaxScore || 10, // Default maxScore to 10 if not provided
        difficulty = req.body.Difficulty
      } = req.body;
      
      // Use normalized field names
      const finalSubject = subject;
      const finalTotalQuestions = numQuestions || totalQuestions;
      const finalMaxScore = maxScore;
      const finalDifficulty = difficulty;
        const userId = req.user.id;
      
      logger.info(`Generating quiz for user ${userId}: ${finalSubject}, Grade ${grade}, ${finalDifficulty}`);        // Generate quiz using AI service
      const aiQuizData = await aiService.generateQuiz(grade, finalSubject, finalTotalQuestions, finalMaxScore, finalDifficulty);
      console.log(aiQuizData + "  data comes from AI service");
      logger.info('AI Quiz Data received:', JSON.stringify(aiQuizData, null, 2));
        // Create title
      const title = `Grade ${grade} ${finalSubject} Quiz`;      // Save quiz to database
      logger.info('Questions to be saved:', JSON.stringify(aiQuizData.questions, null, 2));
      
      // Ensure we're using the normalized field names
      const quiz = await Quiz.create({
        userId,
        title,
        subject: finalSubject,
        grade,
        difficulty: finalDifficulty,
        totalQuestions: finalTotalQuestions,
        maxScore: finalMaxScore,
        questions: aiQuizData.questions || []
      });

      logger.info('Quiz created in database:', JSON.stringify(quiz, null, 2));
      logger.info('Quiz questions type:', typeof quiz.questions);
      logger.info('Quiz questions is array:', Array.isArray(quiz.questions));
      logger.info('Quiz questions length:', Array.isArray(quiz.questions) ? quiz.questions.length : 'not an array');

      // Cache the quiz
      await cache.setQuiz(quiz.quiz_id, quiz);      logger.info(`Quiz generated successfully: ${quiz.quiz_id}`);
      
      // Important: Since the questions may be saved in the DB but not properly returned in the quiz object,
      // we'll use the original aiQuizData.questions that we know are valid
      const questions = aiQuizData.questions || [];
      logger.info(`Returning ${questions.length} questions in response from original aiQuizData`);
      
      res.status(201).json({
        success: true,
        data: {
          quiz_id: quiz.quiz_id,
          title: quiz.title,
          grade: quiz.grade,
          subject: quiz.subject,
          total_questions: quiz.total_questions,
          max_score: quiz.max_score,
          difficulty: quiz.difficulty,
          questions: questions.map(q => ({
            questionId: q.questionId,
            question: q.question,
            type: q.type,
            options: q.options,
            correctAnswer: q.correctAnswer,
            marks: q.marks,
            explanation: q.explanation
          })),
          created_at: quiz.created_at
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
   */  async submitQuiz(req, res, next) {
    try {
      const { quizId, responses: submittedResponses, answers } = req.body;
      const userId = req.user.id;

      logger.info(`Quiz submission for user ${userId}, quiz ${quizId}`);
      logger.info('Request payload:', JSON.stringify(req.body, null, 2));

      // Validate required fields
      if (!quizId) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'quizId is required'
          }
        });
      }

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
      
      // Parse questions if they're a string
      if (quiz.questions && typeof quiz.questions === 'string') {
        try {
          quiz.questions = JSON.parse(quiz.questions);
          logger.info(`Successfully parsed questions in submitQuiz, found ${quiz.questions.length} questions`);
        } catch (error) {
          logger.error('Error parsing questions in submitQuiz:', error);
          quiz.questions = [];
        }
      }

      // Ensure questions is always an array
      if (!Array.isArray(quiz.questions)) {
        logger.warn('Quiz questions is not an array in submitQuiz, initializing empty array');
        quiz.questions = [];
      }

      // Handle both response formats (responses array or answers object)
      let responses;
      if (submittedResponses && Array.isArray(submittedResponses)) {
        responses = submittedResponses;
        logger.info(`Using responses array format with ${responses.length} items`);
      } else if (answers) {
        // Convert answers object to responses array format for backward compatibility
        responses = Object.entries(answers || {}).map(([questionId, userResponse]) => ({
          questionId,
          userResponse
        }));
        logger.info(`Converted answers object to responses array with ${responses.length} items`);
      } else {
        responses = [];
        logger.warn('No responses or answers provided in the request');
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

      // Log the responses for debugging
      logger.info('Normalized responses:', JSON.stringify(responses, null, 2));

      // Check if user has already submitted this quiz (for retry logic)
      const existingSubmission = await Submission.getLastSubmission(userId, quizId);
      const isRetry = !!existingSubmission;

      // Evaluate quiz using AI service
      logger.info('Sending quiz and responses to AI service for evaluation');
      
      let evaluationResult;
      try {
        evaluationResult = await aiService.evaluateQuiz(quiz, responses);
        
        // Verify evaluation result has required fields
        if (!evaluationResult) {
          logger.error('AI service returned null evaluation result');
          evaluationResult = {
            totalScore: 0,
            maxScore: quiz.max_score || 10,
            percentage: 0,
            detailedResults: [],
            suggestions: ['Error evaluating quiz. Please try again.']
          };
        }
        
        // Ensure all fields have valid values
        evaluationResult.totalScore = evaluationResult.totalScore || 0;
        evaluationResult.maxScore = evaluationResult.maxScore || quiz.max_score || 10;
        evaluationResult.percentage = evaluationResult.percentage || 0;
        evaluationResult.detailedResults = evaluationResult.detailedResults || [];
        evaluationResult.suggestions = evaluationResult.suggestions || [];
        
      } catch (evalError) {
        logger.error('Error evaluating quiz:', evalError);
        evaluationResult = {
          totalScore: 0,
          maxScore: quiz.max_score || 10,
          percentage: 0,
          detailedResults: [],
          suggestions: ['Error evaluating quiz. Please try again.']
        };
      }

      // Create submission record
      const submission = await Submission.create({
        quizId,
        userId,
        responses,
        score: evaluationResult.totalScore,
        maxScore: evaluationResult.maxScore,
        percentage: evaluationResult.percentage,
        detailedResults: evaluationResult.detailedResults,
        suggestions: evaluationResult.suggestions,
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
      res.status(500).json({
        success: false,
        error: {
          message: 'Error submitting quiz',
          details: error.message
        }
      });
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
      
      // Try to get quiz from cache first
      let quiz = await cache.getQuiz(quizId);
      let fromCache = !!quiz;
      
      // If not in cache or questions are empty, try database directly
      if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
        logger.info(`Quiz ${quizId} not found in cache or had empty questions. Fetching from database.`);
        quiz = await Quiz.findById(quizId);
        fromCache = false;
        
        if (!quiz) {
          return res.status(404).json({
            success: false,
            error: {
              message: 'Quiz not found'
            }
          });
        }
        
        logger.info(`Quiz ${quizId} found in database with ${Array.isArray(quiz.questions) ? quiz.questions.length : 0} questions`);
      }

      // Process questions - handle case where questions is a string
      if (typeof quiz.questions === 'string') {
        try {
          logger.info(`Parsing questions string for quiz ${quizId}`);
          quiz.questions = JSON.parse(quiz.questions);
          
          // Handle double-encoded JSON
          if (typeof quiz.questions === 'string') {
            logger.info('Detected double-encoded JSON, parsing again');
            quiz.questions = JSON.parse(quiz.questions);
          }
        } catch (error) {
          logger.error(`Error parsing questions JSON: ${error.message}`);
          // Initialize as empty array if parsing fails
          quiz.questions = [];
        }
      }

      // Ensure questions is an array
      if (!Array.isArray(quiz.questions)) {
        logger.warn(`Questions for quiz ${quizId} is not an array (type: ${typeof quiz.questions}), resetting to empty array`);
        quiz.questions = [];
      }

      // If questions array is empty but there should be questions based on total_questions,
      // make one more attempt with a direct database query
      if (quiz.questions.length === 0 && quiz.total_questions > 0) {
        logger.warn(`Quiz ${quizId} has ${quiz.total_questions} expected questions but 0 actual questions. Making final database attempt.`);
        
        try {
          // Force a direct database query with no caching
          const rawQuiz = await db.query(
            `SELECT * FROM quizzes WHERE quiz_id = $1`, 
            [quizId]
          );
          
          if (rawQuiz.rows.length > 0 && rawQuiz.rows[0].questions) {
            let dbQuestions;
            try {
              dbQuestions = JSON.parse(rawQuiz.rows[0].questions);
              
              // Handle double-encoded JSON
              if (typeof dbQuestions === 'string') {
                dbQuestions = JSON.parse(dbQuestions);
              }
              
              if (Array.isArray(dbQuestions) && dbQuestions.length > 0) {
                logger.info(`Retrieved ${dbQuestions.length} questions from direct database query`);
                quiz.questions = dbQuestions;
              }
            } catch (parseError) {
              logger.error(`Error parsing questions from direct database query: ${parseError.message}`);
            }
          }
        } catch (dbError) {
          logger.error(`Database error in final questions attempt: ${dbError.message}`);
        }
      }

      // If we got questions from database but not from cache,
      // update the cache with the correct data
      if (!fromCache && Array.isArray(quiz.questions) && quiz.questions.length > 0) {
        logger.info(`Updating cache for quiz ${quizId} with ${quiz.questions.length} questions`);
        await cache.setQuiz(quizId, quiz);
      }

      // Final validation of question objects to ensure all required fields
      logger.info(`Validating ${quiz.questions.length} questions for quiz ${quizId}`);
      const validatedQuestions = [];
      
      if (Array.isArray(quiz.questions)) {
        quiz.questions.forEach(question => {
          // Check for minimum required fields
          if (question && question.questionId && question.question) {
            // Ensure options is always an array
            const options = Array.isArray(question.options) ? question.options : [];
            
            validatedQuestions.push({
              questionId: question.questionId,
              question: question.question,
              type: question.type || 'multiple_choice',
              options: options,
              marks: question.marks || 1,
              correctAnswer: question.correctAnswer,
              explanation: question.explanation || ''
            });
          } else {
            logger.warn(`Skipping invalid question: ${JSON.stringify(question)}`);
          }
        });
      }
      
      // Log final question count
      logger.info(`Final validated questions count: ${validatedQuestions.length}`);
      
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
          questions: validatedQuestions.map(q => ({
            questionId: q.questionId,
            question: q.question,
            type: q.type,
            options: q.options,
            marks: q.marks,
            // Don't include correctAnswer if user has not attempted
            ...(hasAttempted && { correctAnswer: q.correctAnswer }),
            ...(hasAttempted && { explanation: q.explanation })
          })),
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
