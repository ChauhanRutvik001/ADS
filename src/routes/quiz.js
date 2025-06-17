const express = require('express');
const quizController = require('../controllers/quizController');
const { authMiddleware } = require('../middleware/authMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Quiz
 *   description: Quiz generation, submission, and management
 */

// All quiz routes require authentication
router.use(authMiddleware);

// Quiz generation
router.post('/generate',
  validationMiddleware.validateGenerateQuiz,
  quizController.generateQuiz
);

// Quiz submission
router.post('/submit',
  validationMiddleware.validateSubmitQuiz,
  quizController.submitQuiz
);

// Quiz retry
router.post('/retry/:quizId',
  validationMiddleware.validateQuizId,
  quizController.retryQuiz
);

// Get quiz details
router.get('/:quizId',
  validationMiddleware.validateQuizId,
  quizController.getQuiz
);

// Get quiz hint
router.get('/:quizId/hint/:questionId',
  validationMiddleware.validateQuizId,
  validationMiddleware.validateQuestionId,
  quizController.getHint
);

// Get quiz leaderboard
router.get('/:quizId/leaderboard',
  validationMiddleware.validateQuizId,
  quizController.getLeaderboard
);

module.exports = router;
