const express = require('express');
const historyController = require('../controllers/historyController');
const { authMiddleware } = require('../middleware/authMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: History
 *   description: Quiz history and statistics
 */

// All history routes require authentication
router.use(authMiddleware);

// Get quiz history with filtering
router.get('/',
  validationMiddleware.validateHistoryQuery,
  validationMiddleware.validatePagination,
  validationMiddleware.validateDateRange,
  historyController.getHistory
);

// Get user statistics
router.get('/stats',
  historyController.getStats
);

// Get recent activity
router.get('/recent',
  historyController.getRecentActivity
);

// Get user's attempted subjects
router.get('/meta/subjects',
  historyController.getSubjects
);

// Get user's attempted grades
router.get('/meta/grades',
  historyController.getGrades
);

// Get submission details - this must be last because it has a parameter
router.get('/:submissionId',
  validationMiddleware.validateSubmissionId,
  historyController.getSubmissionDetails
);

module.exports = router;
