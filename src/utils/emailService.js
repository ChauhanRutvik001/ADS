const nodemailer = require('nodemailer');
const logger = require('./logger');

/**
 * Email Service for sending notifications
 */
class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  /**
   * Send quiz results email with learning suggestions
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.username - User's name
   * @param {string} options.quizTitle - Title of the quiz
   * @param {number} options.score - User's score
   * @param {number} options.maxScore - Maximum possible score
   * @param {number} options.percentage - Score as percentage
   * @param {Array} options.detailedResults - Detailed question results
   * @param {Array} options.suggestions - AI-generated learning suggestions
   * @param {number} [options.retryCount=0] - Number of retry attempts
   * @returns {Promise<boolean>} Success status
   */
  async sendQuizResults(options) {
    try {
      const { 
        to, 
        username, 
        quizTitle, 
        score, 
        maxScore, 
        percentage, 
        detailedResults = [], 
        suggestions = [],
        retryCount = 0 
      } = options;
      
      // Format the detailed results for email
      const formattedResults = detailedResults.map((result, index) => {
        return `
        <div style="margin-bottom: 10px; padding: 10px; border-left: 4px solid ${result.correct ? '#4CAF50' : '#F44336'};">
          <p><strong>Question ${index + 1}:</strong> ${result.question}</p>
          <p><strong>Your answer:</strong> ${result.userResponse}</p>
          <p><strong>Correct answer:</strong> ${result.correctResponse}</p>
          <p><strong>Result:</strong> ${result.correct ? '✓ Correct' : '✗ Incorrect'}</p>
          <p><strong>Feedback:</strong> ${result.feedback}</p>
        </div>
        `;
      }).join('');

      // Format the learning suggestions
      const formattedSuggestions = suggestions.map((suggestion, index) => {
        return `
        <div style="margin-bottom: 10px; padding: 10px; background-color: #E3F2FD; border-radius: 5px;">
          <p><strong>Suggestion ${index + 1}:</strong> ${suggestion}</p>
        </div>
        `;
      }).join('');

      // Create HTML email content
      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Quiz Results: ${quizTitle}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #3f51b5; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Your Quiz Results</h1>
        </div>
        
        <div style="padding: 20px;">
          <p>Hello ${username},</p>
          
          <p>You've completed the <strong>${quizTitle}</strong> quiz!</p>
          
          <div style="background-color: ${percentage >= 80 ? '#E8F5E9' : percentage >= 60 ? '#FFF8E1' : '#FFEBEE'}; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <h2 style="margin-top: 0;">Your Score: ${score}/${maxScore} (${percentage}%)</h2>
            <p>
              ${percentage >= 80 ? 'Excellent work! 🎉' : 
                percentage >= 60 ? 'Good job! Keep practicing! 👍' : 
                'You can improve with more practice. Keep going! 💪'}
            </p>
          </div>
          
          <h3>Summary of Your Answers:</h3>
          ${formattedResults}
          
          <h3>Learning Suggestions:</h3>
          <p>Based on your performance, here are personalized suggestions to improve your skills:</p>
          ${formattedSuggestions}
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p>Happy learning!</p>
            <p>The AI Quizzer Team</p>
          </div>
        </div>
      </body>
      </html>
      `;

      // Send email
      const info = await this.transporter.sendMail({
        from: `"AI Quizzer" <${process.env.SMTP_USER}>`,
        to,
        subject: `Quiz Results: ${quizTitle} - ${percentage}%`,
        html: htmlContent
      });

      logger.info(`Email sent to ${to} with message ID: ${info.messageId}`);
      return true;    } catch (error) {
      logger.error('Error sending email:', error);
      
      // Retry up to 2 times with exponential backoff
      if (retryCount < 2) {
        const retryDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s
        logger.info(`Retrying email send in ${retryDelay}ms (attempt ${retryCount + 1}/2)`);
        
        return new Promise((resolve) => {
          setTimeout(async () => {
            const result = await this.sendQuizResults({
              ...options,
              retryCount: retryCount + 1
            });
            resolve(result);
          }, retryDelay);
        });
      }
      
      return false;
    }
  }

  /**
   * Check if email service is configured and ready
   * @returns {boolean} True if email service is configured
   */
  isConfigured() {
    return !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );
  }
}

// Create singleton instance
const emailService = new EmailService();
module.exports = emailService;
