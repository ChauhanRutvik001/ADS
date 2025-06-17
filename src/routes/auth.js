const express = require('express');
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and account management
 */

// Public routes
router.post('/login', 
  validationMiddleware.validateLogin,
  authController.login
);

router.post('/register', 
  validationMiddleware.validateRegister,
  authController.register
);

router.post('/refresh',
  authController.refresh
);

// Protected routes
router.get('/profile',
  authMiddleware,
  authController.getProfile
);

router.post('/logout',
  authMiddleware,
  authController.logout
);

module.exports = router;
