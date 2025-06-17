const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authorization header is required'
        }
      });
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Token is required'
        }
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Fetch current user data
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'User not found'
          }
        });
      }

      // Add user to request object
      req.user = {
        id: user.id,
        username: user.username,
        email: user.email
      };

      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Token has expired'
          }
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid token'
          }
        });
      } else {
        throw jwtError;
      }
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error during authentication'
      }
    });
  }
};

// Optional auth middleware - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (user) {
        req.user = {
          id: user.id,
          username: user.username,
          email: user.email
        };
      }
    } catch (jwtError) {
      // Ignore JWT errors in optional auth
      logger.debug('Optional auth failed:', jwtError.message);
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next(); // Continue even if there's an error
  }
};

// Admin middleware (if needed for future features)
const adminAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required'
        }
      });
    }

    // For now, we'll assume admin users have specific usernames or roles
    // In a real application, you'd have a roles system
    const adminUsers = (process.env.ADMIN_USERS || '').split(',');
    
    if (!adminUsers.includes(req.user.username)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Admin access required'
        }
      });
    }

    next();
  } catch (error) {
    logger.error('Admin auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error during admin authentication'
      }
    });
  }
};

module.exports = {
  authMiddleware,
  optionalAuth,
  adminAuth
};
