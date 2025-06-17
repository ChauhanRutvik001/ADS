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
  },

  // Specific cache functions for the application
  async setQuiz(quizId, quiz, ttl = parseInt(process.env.CACHE_QUIZ_TTL) || 3600) {
    return this.set(`quiz:${quizId}`, quiz, ttl);
  },

  async getQuiz(quizId) {
    return this.get(`quiz:${quizId}`);
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
