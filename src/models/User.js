const { query, transaction } = require('../config/database');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

class User {
  static async create({ username, password, email }) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const result = await query(
        `INSERT INTO users (username, password_hash, email, created_at, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, username, email, created_at`,
        [username, hashedPassword, email]
      );
      
      logger.info(`User created: ${username}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  static async findByUsername(username) {
    try {
      const result = await query(
        'SELECT id, username, password_hash, email, created_at, updated_at FROM users WHERE username = $1',
        [username]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by username:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const result = await query(
        'SELECT id, username, email, created_at, updated_at FROM users WHERE id = $1',
        [id]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const result = await query(
        'SELECT id, username, email, created_at, updated_at FROM users WHERE email = $1',
        [email]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  static async validatePassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      logger.error('Error validating password:', error);
      throw error;
    }
  }

  static async updatePassword(userId, newPassword) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      const result = await query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id',
        [hashedPassword, userId]
      );
      
      logger.info(`Password updated for user ID: ${userId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating password:', error);
      throw error;
    }
  }

  static async updateProfile(userId, updates) {
    try {
      const allowedFields = ['username', 'email'];
      const setClause = [];
      const values = [];
      let paramIndex = 1;

      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key) && updates[key] !== undefined) {
          setClause.push(`${key} = $${paramIndex}`);
          values.push(updates[key]);
          paramIndex++;
        }
      });

      if (setClause.length === 0) {
        throw new Error('No valid fields to update');
      }

      setClause.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(userId);

      const result = await query(
        `UPDATE users SET ${setClause.join(', ')} WHERE id = $${paramIndex} 
         RETURNING id, username, email, created_at, updated_at`,
        values
      );

      logger.info(`Profile updated for user ID: ${userId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating profile:', error);
      throw error;
    }
  }

  static async delete(userId) {
    try {
      await transaction(async (client) => {
        // Delete user's quiz submissions first
        await client.query('DELETE FROM quiz_submissions WHERE user_id = $1', [userId]);
        
        // Delete user's quizzes
        await client.query('DELETE FROM quizzes WHERE user_id = $1', [userId]);
        
        // Delete the user
        await client.query('DELETE FROM users WHERE id = $1', [userId]);
      });

      logger.info(`User deleted: ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  static async getUserStats(userId) {
    try {
      const result = await query(
        `SELECT 
          u.id,
          u.username,
          u.email,
          u.created_at,
          COUNT(DISTINCT q.quiz_id) as total_quizzes_created,
          COUNT(DISTINCT qs.submission_id) as total_submissions,
          AVG(qs.percentage) as average_score,
          MAX(qs.percentage) as best_score,
          COUNT(DISTINCT DATE(qs.completed_at)) as active_days
         FROM users u
         LEFT JOIN quizzes q ON u.id = q.user_id
         LEFT JOIN quiz_submissions qs ON u.id = qs.user_id
         WHERE u.id = $1
         GROUP BY u.id, u.username, u.email, u.created_at`,
        [userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  static async isUsernameAvailable(username, excludeUserId = null) {
    try {
      let queryText = 'SELECT id FROM users WHERE username = $1';
      let params = [username];

      if (excludeUserId) {
        queryText += ' AND id != $2';
        params.push(excludeUserId);
      }

      const result = await query(queryText, params);
      return result.rows.length === 0;
    } catch (error) {
      logger.error('Error checking username availability:', error);
      throw error;
    }
  }

  static async isEmailAvailable(email, excludeUserId = null) {
    try {
      let queryText = 'SELECT id FROM users WHERE email = $1';
      let params = [email];

      if (excludeUserId) {
        queryText += ' AND id != $2';
        params.push(excludeUserId);
      }

      const result = await query(queryText, params);
      return result.rows.length === 0;
    } catch (error) {
      logger.error('Error checking email availability:', error);
      throw error;
    }
  }
}

module.exports = User;
