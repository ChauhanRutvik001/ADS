const Joi = require('joi');
const logger = require('../utils/logger');

// Validation schemas
const schemas = {  // Auth schemas
  login: Joi.object({
    username: Joi.string().pattern(/^[a-zA-Z0-9_]+$/).min(3).max(30).required()
      .messages({
        'string.pattern.base': 'Username must contain only letters, numbers, and underscores'
      }),
    password: Joi.string().min(6).required()
  }),

  register: Joi.object({
    username: Joi.string().pattern(/^[a-zA-Z0-9_]+$/).min(3).max(30).required()
      .messages({
        'string.pattern.base': 'Username must contain only letters, numbers, and underscores'
      }),
    password: Joi.string().min(6).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])')).required()
      .messages({
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
      }),
    email: Joi.string().email().required()
  }),  // Quiz generation schema
  generateQuiz: Joi.object({
    grade: Joi.number().integer().min(1).max(12).required(),
    // Support both camelCase and PascalCase field names
    subject: Joi.string().min(2).max(50),
    Subject: Joi.string().min(2).max(50),
    numQuestions: Joi.number().integer().min(1).max(50),
    totalQuestions: Joi.number().integer().min(1).max(50),
    TotalQuestions: Joi.number().integer().min(1).max(50),
    maxScore: Joi.number().integer().min(1).max(500),
    MaxScore: Joi.number().integer().min(1).max(500),
    difficulty: Joi.string().valid('EASY', 'MEDIUM', 'HARD'),
    Difficulty: Joi.string().valid('EASY', 'MEDIUM', 'HARD'),
    topics: Joi.array().items(Joi.string()).optional()
  }).custom((value, helpers) => {
    // Ensure one of the subject fields is present
    if (!value.subject && !value.Subject) {
      return helpers.error('any.required', { path: ['subject'] });
    }
    // Ensure one of the question count fields is present
    if (!value.numQuestions && !value.totalQuestions && !value.TotalQuestions) {
      return helpers.error('any.required', { path: ['numQuestions'] });
    }
    // Ensure one of the difficulty fields is present
    if (!value.difficulty && !value.Difficulty) {
      return helpers.error('any.required', { path: ['difficulty'] });
    }
    // Ensure one of the maxScore fields is present
    if (!value.maxScore && !value.MaxScore) {
      value.maxScore = 10; // Default value if not provided
    }
    return value;
  }),  // Quiz submission schema
  submitQuiz: Joi.object({
    quizId: Joi.string().required(),
    // Support both formats: answers object or responses array
    answers: Joi.object().pattern(
      Joi.string(),
      Joi.string()
    ),
    responses: Joi.array().items(
      Joi.object({
        questionId: Joi.string().required(),
        userResponse: Joi.string().required()
      })
    )
  }).custom((value, helpers) => {
    // Require either answers or responses, but not necessarily both
    if (!value.answers && (!value.responses || !value.responses.length)) {
      return helpers.error('object.missing', { 
        message: 'Either "answers" object or "responses" array must be provided'
      });
    }
    return value;
  }),

  // Query parameters for history
  historyQuery: Joi.object({
    grade: Joi.number().integer().min(1).max(12),
    subject: Joi.string().min(2).max(50),
    minScore: Joi.number().min(0).max(100),
    maxScore: Joi.number().min(0).max(100),
    from: Joi.date().iso(),
    to: Joi.date().iso(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    includeRetries: Joi.boolean().default(true)
  }),

  // User profile update schema
  updateProfile: Joi.object({
    username: Joi.string().alphanum().min(3).max(30),
    email: Joi.string().email()
  }).min(1),

  // Password change schema
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])')).required()
      .messages({
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
      })
  })
};

// Validation middleware factory
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn('Validation error:', { errors, data });

      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors
        }
      });
    }

    // Replace the original data with validated and sanitized data
    req[source] = value;
    next();
  };
};

// Custom validation functions
const customValidations = {
  // Validate quiz ID format
  validateQuizId: (req, res, next) => {
    const { quizId } = req.params;
    
    if (!quizId || !quizId.match(/^quiz_[a-f0-9]{32}$/)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid quiz ID format'
        }
      });
    }
    
    next();
  },

  // Validate submission ID format
  validateSubmissionId: (req, res, next) => {
    const { submissionId } = req.params;
    
    if (!submissionId || !submissionId.match(/^sub_[a-f0-9]{32}$/)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid submission ID format'
        }
      });
    }
    
    next();
  },

  // Validate question ID format
  validateQuestionId: (req, res, next) => {
    const { questionId } = req.params;
    
    if (!questionId || questionId.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Question ID is required'
        }
      });
    }
    
    next();
  },

  // Validate pagination parameters
  validatePagination: (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (page < 1) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Page must be greater than 0'
        }
      });
    }

    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Limit must be between 1 and 100'
        }
      });
    }

    req.pagination = {
      page,
      limit,
      offset: (page - 1) * limit
    };

    next();
  },

  // Validate date range
  validateDateRange: (req, res, next) => {
    const { from, to } = req.query;

    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);

      if (fromDate > toDate) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'From date cannot be later than to date'
          }
        });
      }

      if (toDate > new Date()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'To date cannot be in the future'
          }
        });
      }
    }

    next();
  }
};

// Pre-defined validation middleware
const validationMiddleware = {
  validateLogin: validate(schemas.login),
  validateRegister: validate(schemas.register),
  validateGenerateQuiz: validate(schemas.generateQuiz),
  validateSubmitQuiz: validate(schemas.submitQuiz),
  validateHistoryQuery: validate(schemas.historyQuery, 'query'),
  validateUpdateProfile: validate(schemas.updateProfile),
  validateChangePassword: validate(schemas.changePassword),
  ...customValidations
};

module.exports = validationMiddleware;
