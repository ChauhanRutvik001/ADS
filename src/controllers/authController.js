const User = require('../models/User');
const jwtUtils = require('../utils/jwtUtils');
const logger = require('../utils/logger');

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           description: User's username
 *         password:
 *           type: string
 *           description: User's password
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - username
 *         - password
 *         - email
 *       properties:
 *         username:
 *           type: string
 *           description: Unique username
 *         password:
 *           type: string
 *           description: Strong password
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         token:
 *           type: string
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             username:
 *               type: string
 *             email:
 *               type: string
 */

const authController = {
  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: User login
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LoginRequest'
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthResponse'
   *       400:
   *         description: Invalid input
   *       401:
   *         description: Invalid credentials
   */
  async login(req, res, next) {
    try {
      const { username, password } = req.body;

      logger.info(`Login attempt for username: ${username}`);

      // In mock mode, accept any username/password
      if (process.env.MOCK_AUTH === 'true') {
        logger.info('Mock authentication enabled');
        
        // Create or find user for mock authentication
        let user = await User.findByUsername(username);
        
        if (!user) {
          // Create user for mock authentication
          user = await User.create({
            username,
            password: 'mock_password',
            email: `${username}@example.com`
          });
          logger.info(`Created mock user: ${username}`);
        }

        const tokenData = jwtUtils.createTokenResponse(user);

        logger.info(`Login successful for user: ${username} (mock mode)`);
        return res.json({
          success: true,
          token: tokenData.accessToken,
          user: {
            id: user.id,
            username: user.username,
            email: user.email
          }
        });
      }

      // Find user by username
      const user = await User.findByUsername(username);
      
      if (!user) {
        logger.warn(`Login failed: User not found - ${username}`);
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid username or password'
          }
        });
      }

      // Validate password
      const isValidPassword = await User.validatePassword(password, user.password_hash);
      
      if (!isValidPassword) {
        logger.warn(`Login failed: Invalid password for user - ${username}`);
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid username or password'
          }
        });
      }

      // Generate JWT token
      const tokenData = jwtUtils.createTokenResponse(user);

      logger.info(`Login successful for user: ${username}`);
      
      res.json({
        success: true,
        token: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      next(error);
    }
  },

  /**
   * @swagger
   * /api/auth/register:
   *   post:
   *     summary: User registration
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RegisterRequest'
   *     responses:
   *       201:
   *         description: Registration successful
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthResponse'
   *       400:
   *         description: Invalid input or user already exists
   */
  async register(req, res, next) {
    try {
      const { username, password, email } = req.body;

      logger.info(`Registration attempt for username: ${username}`);

      // Check if username is available
      const usernameAvailable = await User.isUsernameAvailable(username);
      if (!usernameAvailable) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Username already exists'
          }
        });
      }

      // Check if email is available
      const emailAvailable = await User.isEmailAvailable(email);
      if (!emailAvailable) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Email already registered'
          }
        });
      }

      // Create new user
      const user = await User.create({
        username,
        password,
        email
      });

      // Generate JWT token
      const tokenData = jwtUtils.createTokenResponse(user);

      logger.info(`Registration successful for user: ${username}`);
      
      res.status(201).json({
        success: true,
        token: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } catch (error) {
      logger.error('Registration error:', error);
      next(error);
    }
  },

  /**
   * @swagger
   * /api/auth/refresh:
   *   post:
   *     summary: Refresh access token
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               refreshToken:
   *                 type: string
   *     responses:
   *       200:
   *         description: Token refreshed successfully
   *       401:
   *         description: Invalid refresh token
   */
  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Refresh token is required'
          }
        });
      }

      // Verify refresh token
      const decoded = jwtUtils.verifyToken(refreshToken);
      
      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid refresh token'
          }
        });
      }

      // Find user
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'User not found'
          }
        });
      }

      // Generate new tokens
      const tokenData = jwtUtils.createTokenResponse(user);

      logger.info(`Token refreshed for user: ${user.username}`);
      
      res.json({
        success: true,
        token: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid refresh token'
          }
        });
      }
      
      next(error);
    }
  },

  /**
   * @swagger
   * /api/auth/profile:
   *   get:
   *     summary: Get user profile
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User profile retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  async getProfile(req, res, next) {
    try {
      const userId = req.user.id;
      
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found'
          }
        });
      }

      // Get user statistics
      const stats = await User.getUserStats(userId);
      
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        },
        stats: {
          totalQuizzesCreated: stats.total_quizzes_created || 0,
          totalSubmissions: stats.total_submissions || 0,
          averageScore: stats.average_score ? parseFloat(stats.average_score).toFixed(2) : 0,
          bestScore: stats.best_score ? parseFloat(stats.best_score).toFixed(2) : 0,
          activeDays: stats.active_days || 0
        }
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      next(error);
    }
  },

  /**
   * @swagger
   * /api/auth/logout:
   *   post:
   *     summary: User logout
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Logout successful
   */
  async logout(req, res, next) {
    try {
      // In a more advanced implementation, you would blacklist the token
      // For now, we'll just return a success response
      
      logger.info(`User logged out: ${req.user.username}`);
      
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      next(error);
    }
  }
};

module.exports = authController;
