const jwt = require('jsonwebtoken');
const logger = require('./logger');

const jwtUtils = {
  // Generate JWT token
  generateToken(payload) {
    try {
      const token = jwt.sign(
        payload,
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRES_IN || '24h',
          issuer: 'ai-quizzer-backend',
          audience: 'ai-quizzer-client'
        }
      );
      
      return token;
    } catch (error) {
      logger.error('Error generating JWT token:', error);
      throw new Error('Token generation failed');
    }
  },

  // Verify JWT token
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'ai-quizzer-backend',
        audience: 'ai-quizzer-client'
      });
      
      return decoded;
    } catch (error) {
      logger.error('Error verifying JWT token:', error);
      throw error;
    }
  },

  // Decode JWT token without verification (for debugging)
  decodeToken(token) {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      logger.error('Error decoding JWT token:', error);
      throw error;
    }
  },

  // Generate refresh token
  generateRefreshToken(payload) {
    try {
      const token = jwt.sign(
        { ...payload, type: 'refresh' },
        process.env.JWT_SECRET,
        {
          expiresIn: '7d', // Refresh tokens last longer
          issuer: 'ai-quizzer-backend',
          audience: 'ai-quizzer-client'
        }
      );
      
      return token;
    } catch (error) {
      logger.error('Error generating refresh token:', error);
      throw new Error('Refresh token generation failed');
    }
  },

  // Extract token from Authorization header
  extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  },

  // Get token expiration time
  getTokenExpiration(token) {
    try {
      const decoded = jwt.decode(token);
      return decoded ? new Date(decoded.exp * 1000) : null;
    } catch (error) {
      logger.error('Error getting token expiration:', error);
      return null;
    }
  },

  // Check if token is expired
  isTokenExpired(token) {
    try {
      const expiration = this.getTokenExpiration(token);
      return expiration ? expiration < new Date() : true;
    } catch (error) {
      return true;
    }
  },

  // Get time until token expires (in seconds)
  getTimeUntilExpiration(token) {
    try {
      const expiration = this.getTokenExpiration(token);
      if (!expiration) {
        return 0;
      }
      
      const now = new Date();
      const timeLeft = Math.floor((expiration - now) / 1000);
      
      return Math.max(0, timeLeft);
    } catch (error) {
      return 0;
    }
  },

  // Create token response object
  createTokenResponse(user) {
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email
    };

    const accessToken = this.generateToken(payload);
    const refreshToken = this.generateRefreshToken(payload);
    
    return {
      accessToken,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      tokenType: 'Bearer',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    };
  },

  // Validate token structure
  validateTokenStructure(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Basic JWT structure check (header.payload.signature)
    const parts = token.split('.');
    return parts.length === 3;
  },

  // Generate API key (for future API access)
  generateApiKey(userId) {
    try {
      const payload = {
        userId,
        type: 'api_key',
        createdAt: Date.now()
      };

      const apiKey = jwt.sign(
        payload,
        process.env.JWT_SECRET,
        {
          expiresIn: '1y', // API keys last longer
          issuer: 'ai-quizzer-backend',
          audience: 'ai-quizzer-api'
        }
      );
      
      return apiKey;
    } catch (error) {
      logger.error('Error generating API key:', error);
      throw new Error('API key generation failed');
    }
  }
};

module.exports = jwtUtils;
