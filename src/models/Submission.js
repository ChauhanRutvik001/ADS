const { query, transaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class Submission {
  static async create({ quizId, userId, responses, score, maxScore, percentage, detailedResults, suggestions, isRetry = false, originalSubmissionId = null }) {
    try {
      const submissionId = `sub_${uuidv4().replace(/-/g, '')}`;
      
      const result = await query(
        `INSERT INTO quiz_submissions (
          submission_id, quiz_id, user_id, responses, score, max_score, percentage, 
          detailed_results, suggestions, completed_at, is_retry, original_submission_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10, $11)
        RETURNING submission_id, quiz_id, user_id, responses, score, max_score, percentage, 
                  detailed_results, suggestions, completed_at, is_retry, original_submission_id`,
        [
          submissionId, quizId, userId, JSON.stringify(responses), score, maxScore, percentage,
          JSON.stringify(detailedResults), JSON.stringify(suggestions), isRetry, originalSubmissionId
        ]
      );
      
      const submission = result.rows[0];
      submission.responses = JSON.parse(submission.responses);
      submission.detailed_results = JSON.parse(submission.detailed_results);
      submission.suggestions = JSON.parse(submission.suggestions);
      
      logger.info(`Quiz submission created: ${submissionId} for quiz ${quizId} by user ${userId}`);
      return submission;
    } catch (error) {
      logger.error('Error creating submission:', error);
      throw error;
    }
  }

  static async findById(submissionId) {
    try {
      const result = await query(
        `SELECT s.submission_id, s.quiz_id, s.user_id, s.responses, s.score, s.max_score, 
                s.percentage, s.detailed_results, s.suggestions, s.completed_at, s.is_retry, 
                s.original_submission_id, q.title as quiz_title, q.subject, q.grade, q.difficulty
         FROM quiz_submissions s
         JOIN quizzes q ON s.quiz_id = q.quiz_id
         WHERE s.submission_id = $1`,
        [submissionId]
      );
      
      if (result.rows[0]) {
        const submission = result.rows[0];
        submission.responses = JSON.parse(submission.responses);
        submission.detailed_results = JSON.parse(submission.detailed_results);
        submission.suggestions = JSON.parse(submission.suggestions);
        return submission;
      }
      
      return null;
    } catch (error) {
      logger.error('Error finding submission by ID:', error);
      throw error;
    }
  }

  static async findByUserId(userId, options = {}) {
    try {
      const { 
        limit = 10, 
        offset = 0, 
        subject, 
        grade, 
        minScore, 
        maxScore, 
        fromDate, 
        toDate,
        includeRetries = true 
      } = options;
      
      let whereClause = 'WHERE s.user_id = $1';
      let params = [userId];
      let paramIndex = 2;

      if (!includeRetries) {
        whereClause += ' AND s.is_retry = false';
      }

      if (subject) {
        whereClause += ` AND q.subject = $${paramIndex}`;
        params.push(subject);
        paramIndex++;
      }

      if (grade) {
        whereClause += ` AND q.grade = $${paramIndex}`;
        params.push(grade);
        paramIndex++;
      }

      if (minScore !== undefined) {
        whereClause += ` AND s.percentage >= $${paramIndex}`;
        params.push(minScore);
        paramIndex++;
      }

      if (maxScore !== undefined) {
        whereClause += ` AND s.percentage <= $${paramIndex}`;
        params.push(maxScore);
        paramIndex++;
      }

      if (fromDate) {
        whereClause += ` AND DATE(s.completed_at) >= $${paramIndex}`;
        params.push(fromDate);
        paramIndex++;
      }

      if (toDate) {
        whereClause += ` AND DATE(s.completed_at) <= $${paramIndex}`;
        params.push(toDate);
        paramIndex++;
      }

      const result = await query(
        `SELECT s.submission_id, s.quiz_id, s.score, s.max_score, s.percentage, s.completed_at, 
                s.is_retry, s.original_submission_id, q.title as quiz_title, q.subject, q.grade, q.difficulty
         FROM quiz_submissions s
         JOIN quizzes q ON s.quiz_id = q.quiz_id
         ${whereClause}
         ORDER BY s.completed_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );

      // Get total count for pagination
      const countResult = await query(
        `SELECT COUNT(*) as total 
         FROM quiz_submissions s
         JOIN quizzes q ON s.quiz_id = q.quiz_id
         ${whereClause}`,
        params
      );
      
      return {
        submissions: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit,
        offset
      };
    } catch (error) {
      logger.error('Error finding submissions by user ID:', error);
      throw error;
    }
  }

  static async findByQuizId(quizId, options = {}) {
    try {
      const { limit = 10, offset = 0, includeRetries = true } = options;
      
      let whereClause = 'WHERE s.quiz_id = $1';
      let params = [quizId];

      if (!includeRetries) {
        whereClause += ' AND s.is_retry = false';
      }

      const result = await query(
        `SELECT s.submission_id, s.user_id, s.score, s.max_score, s.percentage, s.completed_at, 
                s.is_retry, s.original_submission_id, u.username
         FROM quiz_submissions s
         JOIN users u ON s.user_id = u.id
         ${whereClause}
         ORDER BY s.completed_at DESC
         LIMIT $2 OFFSET $3`,
        [quizId, limit, offset]
      );

      // Get total count for pagination
      const countResult = await query(
        `SELECT COUNT(*) as total FROM quiz_submissions s ${whereClause}`,
        [quizId]
      );
      
      return {
        submissions: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit,
        offset
      };
    } catch (error) {
      logger.error('Error finding submissions by quiz ID:', error);
      throw error;
    }
  }

  static async getUserBestScore(userId, quizId) {
    try {
      const result = await query(
        `SELECT MAX(percentage) as best_score, MIN(completed_at) as first_attempt
         FROM quiz_submissions 
         WHERE user_id = $1 AND quiz_id = $2`,
        [userId, quizId]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting user best score:', error);
      throw error;
    }
  }

  static async getUserStats(userId) {
    try {
      const result = await query(
        `SELECT 
          COUNT(*) as total_submissions,
          COUNT(DISTINCT quiz_id) as unique_quizzes_attempted,
          AVG(percentage) as average_score,
          MAX(percentage) as best_score,
          MIN(percentage) as worst_score,
          COUNT(CASE WHEN percentage >= 80 THEN 1 END) as excellent_scores,
          COUNT(CASE WHEN percentage >= 60 AND percentage < 80 THEN 1 END) as good_scores,
          COUNT(CASE WHEN percentage < 60 THEN 1 END) as needs_improvement,
          COUNT(CASE WHEN is_retry = true THEN 1 END) as total_retries
         FROM quiz_submissions 
         WHERE user_id = $1`,
        [userId]
      );

      const subjectStats = await query(
        `SELECT 
          q.subject,
          COUNT(*) as attempts,
          AVG(s.percentage) as average_score,
          MAX(s.percentage) as best_score
         FROM quiz_submissions s
         JOIN quizzes q ON s.quiz_id = q.quiz_id
         WHERE s.user_id = $1
         GROUP BY q.subject
         ORDER BY average_score DESC`,
        [userId]
      );

      const gradeStats = await query(
        `SELECT 
          q.grade,
          COUNT(*) as attempts,
          AVG(s.percentage) as average_score,
          MAX(s.percentage) as best_score
         FROM quiz_submissions s
         JOIN quizzes q ON s.quiz_id = q.quiz_id
         WHERE s.user_id = $1
         GROUP BY q.grade
         ORDER BY q.grade`,
        [userId]
      );

      return {
        overall: result.rows[0],
        bySubject: subjectStats.rows,
        byGrade: gradeStats.rows
      };
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  static async getQuizStats(quizId) {
    try {
      const result = await query(
        `SELECT 
          COUNT(*) as total_submissions,
          COUNT(DISTINCT user_id) as unique_users,
          AVG(percentage) as average_score,
          MAX(percentage) as highest_score,
          MIN(percentage) as lowest_score,
          COUNT(CASE WHEN percentage >= 80 THEN 1 END) as excellent_scores,
          COUNT(CASE WHEN percentage >= 60 AND percentage < 80 THEN 1 END) as good_scores,
          COUNT(CASE WHEN percentage < 60 THEN 1 END) as needs_improvement,
          COUNT(CASE WHEN is_retry = true THEN 1 END) as total_retries
         FROM quiz_submissions 
         WHERE quiz_id = $1`,
        [quizId]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting quiz stats:', error);
      throw error;
    }
  }

  static async getLeaderboard(quizId, limit = 10) {
    try {
      const result = await query(
        `SELECT 
          s.user_id,
          u.username,
          MAX(s.percentage) as best_score,
          MIN(s.completed_at) as first_completion,
          COUNT(*) as total_attempts
         FROM quiz_submissions s
         JOIN users u ON s.user_id = u.id
         WHERE s.quiz_id = $1
         GROUP BY s.user_id, u.username
         ORDER BY best_score DESC, first_completion ASC
         LIMIT $2`,
        [quizId, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  static async hasUserAttempted(userId, quizId) {
    try {
      const result = await query(
        'SELECT submission_id FROM quiz_submissions WHERE user_id = $1 AND quiz_id = $2 LIMIT 1',
        [userId, quizId]
      );

      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking user attempt:', error);
      throw error;
    }
  }

  static async getLastSubmission(userId, quizId) {
    try {
      const result = await query(
        `SELECT submission_id, score, max_score, percentage, completed_at, is_retry
         FROM quiz_submissions 
         WHERE user_id = $1 AND quiz_id = $2 
         ORDER BY completed_at DESC 
         LIMIT 1`,
        [userId, quizId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting last submission:', error);
      throw error;
    }
  }

  static async delete(submissionId) {
    try {
      const result = await query(
        'DELETE FROM quiz_submissions WHERE submission_id = $1 RETURNING submission_id',
        [submissionId]
      );

      if (result.rows[0]) {
        logger.info(`Submission deleted: ${submissionId}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error deleting submission:', error);
      throw error;
    }
  }

  static async getRecentActivity(userId, limit = 5) {
    try {
      const result = await query(
        `SELECT 
          s.submission_id,
          s.quiz_id,
          s.score,
          s.max_score,
          s.percentage,
          s.completed_at,
          s.is_retry,
          q.title as quiz_title,
          q.subject,
          q.grade
         FROM quiz_submissions s
         JOIN quizzes q ON s.quiz_id = q.quiz_id
         WHERE s.user_id = $1
         ORDER BY s.completed_at DESC
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting recent activity:', error);
      throw error;
    }
  }
}

module.exports = Submission;
