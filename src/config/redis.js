const redis = require('redis');
const logger = require('../utils/logger');

let client;
let usingRedis = true;

// In-memory cache fallback
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.expirations = new Map();
  }

  async get(key) {
    // Check if key has expired
    if (this.expirations.has(key) && Date.now() > this.expirations.get(key)) {
      this.cache.delete(key);
      this.expirations.delete(key);
      return null;
    }
    return this.cache.get(key) || null;
  }

  async set(key, value, options = {}) {
    this.cache.set(key, value);
    if (options.EX) {
      // Set expiration
      this.expirations.set(key, Date.now() + (options.EX * 1000));
    }
    return 'OK';
  }

  async del(key) {
    const existed = this.cache.has(key);
    this.cache.delete(key);
    this.expirations.delete(key);
    return existed ? 1 : 0;
  }

  async exists(key) {
    if (this.expirations.has(key) && Date.now() > this.expirations.get(key)) {
      this.cache.delete(key);
      this.expirations.delete(key);
      return 0;
    }
    return this.cache.has(key) ? 1 : 0;
  }

  async expire(key, seconds) {
    if (this.cache.has(key)) {
      this.expirations.set(key, Date.now() + (seconds * 1000));
      return 1;
    }
    return 0;
  }

  async flushAll() {
    this.cache.clear();
    this.expirations.clear();
    return 'OK';
  }
}

const connectRedis = async () => {
  try {
    client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 500, // 0.5 second timeout
        commandTimeout: 500
      },
      retry_strategy: () => {
        // Don't retry, fail immediately for faster fallback
        return new Error('Redis connection failed');
      }
    });

    client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    client.on('connect', () => {
      logger.info('✅ Redis connected successfully');
    });

    client.on('ready', () => {
      logger.info('✅ Redis ready to accept commands');
    });

    client.on('end', () => {
      logger.warn('⚠️ Redis connection ended');
    });

    // Set a timeout for the connection attempt
    const connectionPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Redis connection timeout')), 1000);
    });

    await Promise.race([connectionPromise, timeoutPromise]);
    usingRedis = true;
    return client;
  } catch (error) {
    logger.warn('Redis connection failed, falling back to in-memory cache:', error.message);
    
    // Fallback to in-memory cache
    client = new MemoryCache();
    usingRedis = false;
    logger.info('✅ Using in-memory cache fallback for development');
    return client;
  }
};

const getRedisClient = () => {
  if (!client) {
    throw new Error('Redis not connected. Call connectRedis() first.');
  }
  return client;
};

// Cache utility functions
const cache = {
  async get(key) {
    try {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache GET error:', error);
      return null;
    }
  },

  async set(key, value, ttl = 3600) {
    try {
      if (usingRedis) {
        await client.setEx(key, ttl, JSON.stringify(value));
      } else {
        await client.set(key, JSON.stringify(value), { EX: ttl });
      }
      return true;
    } catch (error) {
      logger.error('Cache SET error:', error);
      return false;
    }
  },

  async del(key) {
    try {
      await client.del(key);
      return true;
    } catch (error) {
      logger.error('Cache DEL error:', error);
      return false;
    }
  },

  async exists(key) {
    try {
      const exists = await client.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', error);
      return false;
    }
  },
  async flushPattern(pattern) {
    try {
      if (usingRedis) {
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
          await client.del(keys);
        }
      } else {
        // For in-memory cache, clear keys matching pattern
        for (const key of client.cache.keys()) {
          if (key.match(pattern.replace('*', '.*'))) {
            await client.del(key);
          }
        }
      }
      return true;
    } catch (error) {
      logger.error('Cache FLUSH PATTERN error:', error);
      return false;
    }
  },  // Specific cache functions for the application
  async setQuiz(quizId, quizToCache, ttl = parseInt(process.env.CACHE_QUIZ_TTL) || 3600) {
    logger.info(`Setting cache for quiz ${quizId}`);
    
    // Clone the quiz to avoid modifying the original object
    quizToCache = JSON.parse(JSON.stringify(quizToCache));
    
    // Ensure questions is properly processed before caching
    if (quizToCache.questions) {
      if (typeof quizToCache.questions === 'string') {
        try {
          logger.info(`Converting questions string to object for quiz ${quizId} before caching`);
          quizToCache.questions = JSON.parse(quizToCache.questions);
          
          // Check if it's still a string after parsing (double encoded)
          if (typeof quizToCache.questions === 'string') {
            logger.warn(`Questions still a string after parsing, attempting second parse for quiz ${quizId}`);
            quizToCache.questions = JSON.parse(quizToCache.questions);
          }
        } catch (error) {
          logger.error(`Error parsing questions JSON before caching: ${error.message}`);
          // Try to fetch from database as fallback
          try {
            const freshQuiz = await require('../models/Quiz').findById(quizId);
            if (freshQuiz && Array.isArray(freshQuiz.questions) && freshQuiz.questions.length > 0) {
              quizToCache.questions = freshQuiz.questions;
              logger.info(`Retrieved ${quizToCache.questions.length} questions directly from database for caching`);
            } else {
              logger.warn(`Couldn't get questions from database fallback or questions array is empty for quiz ${quizId}`);
              quizToCache.questions = [];
            }
          } catch (e) {
            logger.error(`Database fallback failed: ${e.message}`);
            quizToCache.questions = [];
          }
        }
      } else if (!Array.isArray(quizToCache.questions)) {
        logger.warn(`Quiz ${quizId} questions is not a string or array, but a ${typeof quizToCache.questions}`);
        quizToCache.questions = [];
      }
    } else {
      logger.warn(`Quiz ${quizId} has no questions property before caching`);
      
      // Try to fetch from database as fallback
      try {
        const freshQuiz = await require('../models/Quiz').findById(quizId);
        if (freshQuiz && Array.isArray(freshQuiz.questions) && freshQuiz.questions.length > 0) {
          quizToCache.questions = freshQuiz.questions;
          logger.info(`Retrieved ${quizToCache.questions.length} questions directly from database for empty questions property`);
        } else {
          quizToCache.questions = [];
        }
      } catch (e) {
        logger.error(`Database fallback failed: ${e.message}`);
        quizToCache.questions = [];
      }
    }
    
    // Validate that questions is an array and each item has required properties
    if (!Array.isArray(quizToCache.questions)) {
      logger.warn(`Setting questions to empty array for quiz ${quizId} before caching`);
      quizToCache.questions = [];
    } else if (quizToCache.questions.length === 0 && quizToCache.total_questions > 0) {
      logger.warn(`Quiz ${quizId} has zero questions before caching but total_questions=${quizToCache.total_questions}`);
      
      // One last attempt to get questions from DB
      try {
        const rawResult = await db.query('SELECT questions FROM quizzes WHERE quiz_id = $1', [quizId]);
        if (rawResult.rows[0] && rawResult.rows[0].questions) {
          try {
            const dbQuestions = JSON.parse(rawResult.rows[0].questions);
            if (Array.isArray(dbQuestions) && dbQuestions.length > 0) {
              quizToCache.questions = dbQuestions;
              logger.info(`Last chance recovery: got ${dbQuestions.length} questions from direct DB query`);
            }
          } catch (e) {
            logger.error(`Error parsing questions in last chance recovery: ${e.message}`);
          }
        }
      } catch (e) {
        logger.error(`Error in last chance DB query: ${e.message}`);
      }
    } else {
      // Validate question items
      const validQuestions = quizToCache.questions.filter(q => q && q.questionId && q.question);
      if (validQuestions.length < quizToCache.questions.length) {
        logger.warn(`Quiz ${quizId} had ${quizToCache.questions.length - validQuestions.length} invalid questions that were filtered out`);
        quizToCache.questions = validQuestions;
      }
    }
    
    logger.info(`Caching quiz ${quizId} with ${quizToCache.questions.length} questions`);
    return this.set(`quiz:${quizId}`, quizToCache, ttl);
  },

  async getQuiz(quizId) {
    const quiz = await this.get(`quiz:${quizId}`);
    if (quiz) {
      // Handle case where questions might be a string in the cached object
      if (quiz.questions && typeof quiz.questions === 'string') {
        try {
          logger.info(`Got quiz ${quizId} from cache with questions as string, parsing now`);
          quiz.questions = JSON.parse(quiz.questions);
          
          // Check if it's still a string after parsing (double encoded)
          if (typeof quiz.questions === 'string') {
            logger.info('Detected double-encoded JSON for questions, parsing again');
            quiz.questions = JSON.parse(quiz.questions);
          }
        } catch (error) {
          logger.error(`Error parsing questions from cache for quiz ${quizId}: ${error.message}`);
          quiz.questions = [];
        }
      }
      
      // Validate array
      if (!Array.isArray(quiz.questions)) {
        logger.warn(`Quiz ${quizId} questions from cache is not an array (type: ${typeof quiz.questions}), setting to empty array`);
        quiz.questions = [];
      }
      
      logger.info(`Got quiz ${quizId} from cache with ${quiz.questions.length} questions`);
      
      // If zero questions in cache but should have questions based on total_questions,
      // try to get from database
      if (quiz.questions.length === 0 && quiz.total_questions > 0) {
        logger.warn(`Quiz ${quizId} has ${quiz.total_questions} expected questions but 0 actual questions in cache, attempting database fallback`);
        try {
          const freshQuiz = await require('../models/Quiz').findById(quizId);
          if (freshQuiz && Array.isArray(freshQuiz.questions) && freshQuiz.questions.length > 0) {
            quiz.questions = freshQuiz.questions;
            logger.info(`Retrieved ${quiz.questions.length} questions from database fallback`);
            
            // Update cache with fixed data
            await this.setQuiz(quizId, quiz);
          } else {
            logger.warn(`Database fallback didn't return valid questions for quiz ${quizId}`);
          }
        } catch (e) {
          logger.error(`Database fallback in getQuiz failed: ${e.message}`);
        }
      }
    }
    return quiz;
  },

  async setUserHistory(userId, history, ttl = parseInt(process.env.CACHE_HISTORY_TTL) || 1800) {
    return this.set(`history:${userId}`, history, ttl);
  },

  async getUserHistory(userId) {
    return this.get(`history:${userId}`);
  },

  async setHint(quizId, questionId, hint, ttl = parseInt(process.env.CACHE_HINTS_TTL) || 86400) {
    return this.set(`hint:${quizId}:${questionId}`, hint, ttl);
  },

  async getHint(quizId, questionId) {
    return this.get(`hint:${quizId}:${questionId}`);
  },

  async invalidateUserCache(userId) {
    await this.flushPattern(`history:${userId}*`);
    await this.flushPattern(`quiz:*:user:${userId}`);
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  cache
};
