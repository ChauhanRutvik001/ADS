const { query, transaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class Quiz {
  static async create({ userId, title, subject, grade, difficulty, totalQuestions, maxScore, questions }) {
    try {
      const quizId = `quiz_${uuidv4().replace(/-/g, '')}`;
      
      const result = await query(
        `INSERT INTO quizzes (quiz_id, user_id, title, subject, grade, difficulty, total_questions, max_score, questions, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
         RETURNING quiz_id, user_id, title, subject, grade, difficulty, total_questions, max_score, questions, created_at`,
        [quizId, userId, title, subject, grade, difficulty, totalQuestions, maxScore, JSON.stringify(questions)]
      );
      
      const quiz = result.rows[0];
      quiz.questions = JSON.parse(quiz.questions);
      
      logger.info(`Quiz created: ${quizId} by user ${userId}`);
      return quiz;
    } catch (error) {
      logger.error('Error creating quiz:', error);
      throw error;
    }
  }

  static async findById(quizId) {
    try {
      const result = await query(
        'SELECT quiz_id, user_id, title, subject, grade, difficulty, total_questions, max_score, questions, created_at FROM quizzes WHERE quiz_id = $1',
        [quizId]
      );
      
      if (result.rows[0]) {
        const quiz = result.rows[0];
        quiz.questions = JSON.parse(quiz.questions);
        return quiz;
      }
      
      return null;
    } catch (error) {
      logger.error('Error finding quiz by ID:', error);
      throw error;
    }
  }

  static async findByUserId(userId, options = {}) {
    try {
      const { limit = 10, offset = 0, subject, grade, difficulty } = options;
      
      let whereClause = 'WHERE user_id = $1';
      let params = [userId];
      let paramIndex = 2;

      if (subject) {
        whereClause += ` AND subject = $${paramIndex}`;
        params.push(subject);
        paramIndex++;
      }

      if (grade) {
        whereClause += ` AND grade = $${paramIndex}`;
        params.push(grade);
        paramIndex++;
      }

      if (difficulty) {
        whereClause += ` AND difficulty = $${paramIndex}`;
        params.push(difficulty);
        paramIndex++;
      }

      const result = await query(
        `SELECT quiz_id, user_id, title, subject, grade, difficulty, total_questions, max_score, created_at
         FROM quizzes 
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );
      
      return result.rows;
    } catch (error) {
      logger.error('Error finding quizzes by user ID:', error);
      throw error;
    }
  }

  static async update(quizId, updates) {
    try {
      const allowedFields = ['title', 'subject', 'grade', 'difficulty', 'total_questions', 'max_score', 'questions'];
      const setClause = [];
      const values = [];
      let paramIndex = 1;

      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key) && updates[key] !== undefined) {
          if (key === 'questions') {
            setClause.push(`${key} = $${paramIndex}`);
            values.push(JSON.stringify(updates[key]));
          } else {
            setClause.push(`${key} = $${paramIndex}`);
            values.push(updates[key]);
          }
          paramIndex++;
        }
      });

      if (setClause.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(quizId);

      const result = await query(
        `UPDATE quizzes SET ${setClause.join(', ')} WHERE quiz_id = $${paramIndex} 
         RETURNING quiz_id, user_id, title, subject, grade, difficulty, total_questions, max_score, questions, created_at`,
        values
      );

      if (result.rows[0]) {
        const quiz = result.rows[0];
        quiz.questions = JSON.parse(quiz.questions);
        logger.info(`Quiz updated: ${quizId}`);
        return quiz;
      }

      return null;
    } catch (error) {
      logger.error('Error updating quiz:', error);
      throw error;
    }
  }

  static async delete(quizId) {
    try {
      await transaction(async (client) => {
        // Delete quiz hints first
        await client.query('DELETE FROM quiz_hints WHERE quiz_id = $1', [quizId]);
        
        // Delete quiz submissions
        await client.query('DELETE FROM quiz_submissions WHERE quiz_id = $1', [quizId]);
        
        // Delete the quiz
        await client.query('DELETE FROM quizzes WHERE quiz_id = $1', [quizId]);
      });

      logger.info(`Quiz deleted: ${quizId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting quiz:', error);
      throw error;
    }
  }

  static async getQuizStats(quizId) {
    try {
      const result = await query(
        `SELECT 
          q.quiz_id,
          q.title,
          q.subject,
          q.grade,
          q.difficulty,
          q.total_questions,
          q.max_score,
          q.created_at,
          COUNT(qs.submission_id) as total_attempts,
          AVG(qs.percentage) as average_score,
          MAX(qs.percentage) as highest_score,
          MIN(qs.percentage) as lowest_score,
          COUNT(DISTINCT qs.user_id) as unique_users
         FROM quizzes q
         LEFT JOIN quiz_submissions qs ON q.quiz_id = qs.quiz_id
         WHERE q.quiz_id = $1
         GROUP BY q.quiz_id, q.title, q.subject, q.grade, q.difficulty, q.total_questions, q.max_score, q.created_at`,
        [quizId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting quiz stats:', error);
      throw error;
    }
  }

  static async searchQuizzes(searchOptions = {}) {
    try {
      const { 
        searchTerm, 
        subject, 
        grade, 
        difficulty, 
        userId,
        limit = 20, 
        offset = 0 
      } = searchOptions;

      let whereClause = 'WHERE 1=1';
      let params = [];
      let paramIndex = 1;

      if (searchTerm) {
        whereClause += ` AND (title ILIKE $${paramIndex} OR subject ILIKE $${paramIndex})`;
        params.push(`%${searchTerm}%`);
        paramIndex++;
      }

      if (subject) {
        whereClause += ` AND subject = $${paramIndex}`;
        params.push(subject);
        paramIndex++;
      }

      if (grade) {
        whereClause += ` AND grade = $${paramIndex}`;
        params.push(grade);
        paramIndex++;
      }

      if (difficulty) {
        whereClause += ` AND difficulty = $${paramIndex}`;
        params.push(difficulty);
        paramIndex++;
      }

      if (userId) {
        whereClause += ` AND user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }

      const result = await query(
        `SELECT quiz_id, user_id, title, subject, grade, difficulty, total_questions, max_score, created_at
         FROM quizzes 
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );

      // Get total count for pagination
      const countResult = await query(
        `SELECT COUNT(*) as total FROM quizzes ${whereClause}`,
        params
      );

      return {
        quizzes: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit,
        offset
      };
    } catch (error) {
      logger.error('Error searching quizzes:', error);
      throw error;
    }
  }

  static async getUserQuizCount(userId) {
    try {
      const result = await query(
        'SELECT COUNT(*) as count FROM quizzes WHERE user_id = $1',
        [userId]
      );

      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting user quiz count:', error);
      throw error;
    }
  }

  static async getPopularSubjects() {
    try {
      const result = await query(
        `SELECT subject, COUNT(*) as quiz_count, AVG(grade) as avg_grade
         FROM quizzes 
         GROUP BY subject 
         ORDER BY quiz_count DESC 
         LIMIT 10`
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting popular subjects:', error);
      throw error;
    }
  }

  static async validateQuizOwnership(quizId, userId) {
    try {
      const result = await query(
        'SELECT user_id FROM quizzes WHERE quiz_id = $1',
        [quizId]
      );

      if (!result.rows[0]) {
        return false;
      }

      return result.rows[0].user_id === userId;
    } catch (error) {
      logger.error('Error validating quiz ownership:', error);
      throw error;
    }
  }
}

module.exports = Quiz;
