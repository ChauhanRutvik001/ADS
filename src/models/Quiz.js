const { query, transaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class Quiz {  static async create({ userId, title, subject, grade, difficulty, totalQuestions, maxScore, questions }) {
    try {
      // Log input parameters for debugging
      logger.info(`Creating quiz with: userId=${userId}, title=${title}, subject=${subject}, grade=${grade}, difficulty=${difficulty}, totalQuestions=${totalQuestions}, maxScore=${maxScore}, questions=${questions ? Array.isArray(questions) ? questions.length : 'not array' : 'undefined'}`);
      
      // If questions is not an array, make it one
      const questionArray = Array.isArray(questions) ? questions : (questions ? [questions] : []);
      
      // Ensure questions is properly serialized for storage
      const questionsJson = JSON.stringify(questionArray);
      logger.info(`Serialized ${questionArray.length} questions to JSON for storage`);
      
      const quizId = `quiz_${uuidv4().replace(/-/g, '')}`;
      const result = await query(
        `INSERT INTO quizzes (quiz_id, user_id, title, subject, grade, difficulty, total_questions, max_score, questions, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
         RETURNING quiz_id, user_id, title, subject, grade, difficulty, total_questions, max_score, questions, created_at`,
        [quizId, userId, title, subject, grade, difficulty, totalQuestions, maxScore, questionsJson]
      );
      
      let quiz = result.rows[0];
      
      // If SQLite doesn't return the row, manually create the quiz object
      if (!quiz) {
        quiz = {
          quiz_id: quizId,
          user_id: userId,
          title,
          subject,
          grade,
          difficulty,
          total_questions: totalQuestions,
          max_score: maxScore,
          questions: questionsJson, // Store as JSON string for consistency
          created_at: new Date().toISOString()
        };
      }
      
      // Ensure quiz_id is set
      if (!quiz.quiz_id) {
        quiz.quiz_id = quizId;
      }
      
      // Parse questions if they are stored as a string
      if (quiz.questions) {
        try {
          if (typeof quiz.questions === 'string') {
            quiz.questions = JSON.parse(quiz.questions);
            logger.info(`Successfully parsed questions string to object with ${quiz.questions.length} questions`);
          } else {
            logger.info(`Questions already in object form with type: ${typeof quiz.questions}`);
          }
        } catch (error) {
          logger.error('Error parsing questions JSON:', error);
          quiz.questions = [];
        }
      } else {
        logger.warn('No questions field found in quiz');
        quiz.questions = [];
      }
      
      logger.info(`Quiz created: ${quizId} by user ${userId}`);
      return quiz;
    } catch (error) {
      logger.error('Error creating quiz:', error);
      throw error;
    }
  }  static async findById(quizId) {
    try {
      const result = await query(
        'SELECT quiz_id, user_id, title, subject, grade, difficulty, total_questions, max_score, questions, created_at FROM quizzes WHERE quiz_id = $1',
        [quizId]
      );
      
      if (result.rows[0]) {
        const quiz = result.rows[0];
        
        logger.info(`Found quiz ${quizId} in database with raw questions: ${quiz.questions ? (typeof quiz.questions === 'string' ? 'string with length ' + quiz.questions.length : typeof quiz.questions) : 'undefined'}`);
        
        // Always ensure we have questions as an array
        if (quiz.questions) {
          try {
            if (typeof quiz.questions === 'string') {
              // Log the raw string for debugging
              logger.debug(`Raw questions string for quiz ${quizId}: ${quiz.questions}`);
              
              // Handle case where string might be escaped JSON
              let cleanString = quiz.questions;
              if (cleanString.startsWith('"') && cleanString.endsWith('"')) {
                try {
                  // Might be an escaped JSON string, try to unescape
                  cleanString = JSON.parse(cleanString);
                  logger.info(`Unescaped JSON string for questions in quiz ${quizId}`);
                } catch (e) {
                  logger.warn(`Failed to unescape JSON string: ${e.message}`);
                }
              }
              
              // Now parse the string (possibly unescaped)
              quiz.questions = JSON.parse(cleanString);
              logger.info(`Successfully parsed questions string to object with ${quiz.questions.length} questions`);
              
              // Extra verification if it's still a string after parsing
              if (typeof quiz.questions === 'string') {
                logger.warn(`Questions still a string after first parse, attempting second parse`);
                quiz.questions = JSON.parse(quiz.questions);
              }
            } else if (!Array.isArray(quiz.questions)) {
              logger.warn(`Quiz ${quizId} questions is not a string or array, setting to empty array`);
              quiz.questions = [];
            }
          } catch (error) {
            logger.error(`Error parsing questions JSON in findById for quiz ${quizId}: ${error.message}`);
            
            // Direct database query as fallback
            try {
              const rawResult = await query(
                'SELECT questions FROM quizzes WHERE quiz_id = $1',
                [quizId]
              );
              
              if (rawResult.rows[0] && rawResult.rows[0].questions) {
                try {
                  const rawQuestions = rawResult.rows[0].questions;
                  logger.info(`Fallback: Direct database query returned raw questions of type ${typeof rawQuestions}`);
                  
                  if (typeof rawQuestions === 'string') {
                    quiz.questions = JSON.parse(rawQuestions);
                  } else {
                    quiz.questions = rawQuestions;
                  }
                  
                  if (Array.isArray(quiz.questions)) {
                    logger.info(`Fallback successful! Retrieved ${quiz.questions.length} questions`);
                  } else {
                    logger.warn(`Fallback didn't return an array`);
                    quiz.questions = [];
                  }
                } catch (e) {
                  logger.error(`Fallback parsing failed: ${e.message}`);
                  quiz.questions = [];
                }
              } else {
                quiz.questions = [];
              }
            } catch (e) {
              logger.error(`Fallback database query failed: ${e.message}`);
              quiz.questions = [];
            }
          }
        } else {
          logger.warn(`No questions field found for quiz ${quizId}`);
          quiz.questions = [];
        }
        
        // Final validation of questions array
        if (!Array.isArray(quiz.questions)) {
          logger.warn(`Questions not an array after processing for quiz ${quizId}`);
          quiz.questions = [];
        } else if (quiz.questions.length === 0) {
          logger.warn(`Quiz ${quizId} has zero questions after processing`);
        } else {
          logger.info(`Quiz ${quizId} has ${quiz.questions.length} questions after processing`);
        }
        
        return quiz;
      }
      
      logger.warn(`Quiz ${quizId} not found in database`);
      return null;
    } catch (error) {
      logger.error(`Error finding quiz ${quizId} by ID:`, error);
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
      );      if (result.rows[0]) {
        const quiz = result.rows[0];
        if (quiz.questions) {
          quiz.questions = JSON.parse(quiz.questions);
        }
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
