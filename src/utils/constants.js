// Application constants

// Grade levels
const GRADE_LEVELS = {
  MIN: 1,
  MAX: 12
};

// Difficulty levels
const DIFFICULTY_LEVELS = {
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD'
};

// Quiz constraints
const QUIZ_CONSTRAINTS = {
  MIN_QUESTIONS: 1,
  MAX_QUESTIONS: 50,
  MIN_SCORE: 1,
  MAX_SCORE: 500,
  MIN_TITLE_LENGTH: 3,
  MAX_TITLE_LENGTH: 255,
  MIN_SUBJECT_LENGTH: 2,
  MAX_SUBJECT_LENGTH: 50
};

// Common subjects (for validation and suggestions)
const COMMON_SUBJECTS = [
  'Mathematics',
  'Science',
  'English',
  'History',
  'Geography',
  'Physics',
  'Chemistry',
  'Biology',
  'Computer Science',
  'Art',
  'Music',
  'Physical Education',
  'Social Studies',
  'Literature',
  'Foreign Language',
  'Economics',
  'Philosophy',
  'Psychology',
  'Statistics',
  'Algebra',
  'Geometry',
  'Calculus'
];

// Response messages
const RESPONSE_MESSAGES = {
  SUCCESS: {
    QUIZ_GENERATED: 'Quiz generated successfully',
    QUIZ_SUBMITTED: 'Quiz submitted successfully',
    LOGIN_SUCCESS: 'Login successful',
    REGISTRATION_SUCCESS: 'Registration successful',
    LOGOUT_SUCCESS: 'Logout successful',
    HISTORY_RETRIEVED: 'History retrieved successfully',
    PROFILE_UPDATED: 'Profile updated successfully'
  },
  ERROR: {
    UNAUTHORIZED: 'Unauthorized access',
    INVALID_CREDENTIALS: 'Invalid username or password',
    USER_NOT_FOUND: 'User not found',
    QUIZ_NOT_FOUND: 'Quiz not found',
    SUBMISSION_NOT_FOUND: 'Submission not found',
    VALIDATION_FAILED: 'Validation failed',
    INTERNAL_ERROR: 'Internal server error',
    AI_SERVICE_ERROR: 'AI service temporarily unavailable',
    DATABASE_ERROR: 'Database operation failed',
    CACHE_ERROR: 'Cache service unavailable',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
    FILE_TOO_LARGE: 'File size exceeds limit',
    INVALID_FILE_TYPE: 'Invalid file type',
    USERNAME_EXISTS: 'Username already exists',
    EMAIL_EXISTS: 'Email already registered',
    WEAK_PASSWORD: 'Password does not meet security requirements',
    INVALID_TOKEN: 'Invalid or expired token',
    ACCESS_DENIED: 'Access denied',
    QUIZ_ALREADY_SUBMITTED: 'Quiz already submitted',
    INVALID_QUIZ_DATA: 'Invalid quiz data format',
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions'
  }
};

// HTTP Status codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
};

// Cache TTL values (in seconds)
const CACHE_TTL = {
  QUIZ: 3600, // 1 hour
  USER_HISTORY: 1800, // 30 minutes
  HINTS: 86400, // 24 hours
  USER_STATS: 3600, // 1 hour
  RECENT_ACTIVITY: 900, // 15 minutes
  LEADERBOARD: 1800 // 30 minutes
};

// Pagination defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1
};

// File upload constraints
const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  UPLOAD_PATH: 'uploads/'
};

// Rate limiting
const RATE_LIMITING = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
  SKIP_SUCCESSFUL_REQUESTS: false,
  SKIP_FAILED_REQUESTS: false
};

// JWT Configuration
const JWT_CONFIG = {
  EXPIRES_IN: '24h',
  REFRESH_EXPIRES_IN: '7d',
  ISSUER: 'ai-quizzer-backend',
  AUDIENCE: 'ai-quizzer-client'
};

// Email templates (for future email features)
const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password-reset',
  QUIZ_REMINDER: 'quiz-reminder',
  ACHIEVEMENT: 'achievement'
};

// Achievement thresholds
const ACHIEVEMENTS = {
  FIRST_QUIZ: 1,
  QUIZ_STREAK: 5,
  PERFECT_SCORE: 100,
  QUIZ_MASTER: 10,
  SUBJECT_EXPERT: 20
};

// AI Service Configuration
const AI_CONFIG = {
  MAX_RETRIES: 3,
  TIMEOUT: 30000, // 30 seconds
  TEMPERATURE: 0.7,
  MAX_TOKENS: 2000,
  FALLBACK_ENABLED: true
};

// Validation patterns
const VALIDATION_PATTERNS = {
  USERNAME: /^[a-zA-Z0-9_]{3,30}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  QUIZ_ID: /^quiz_[a-f0-9]{32}$/,
  SUBMISSION_ID: /^sub_[a-f0-9]{32}$/
};

// Performance scoring thresholds
const PERFORMANCE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 70,
  AVERAGE: 50,
  NEEDS_IMPROVEMENT: 30
};

// API versioning
const API_VERSION = {
  CURRENT: 'v1',
  SUPPORTED: ['v1'],
  DEPRECATED: []
};

module.exports = {
  GRADE_LEVELS,
  DIFFICULTY_LEVELS,
  QUIZ_CONSTRAINTS,
  COMMON_SUBJECTS,
  RESPONSE_MESSAGES,
  HTTP_STATUS,
  CACHE_TTL,
  PAGINATION,
  FILE_UPLOAD,
  RATE_LIMITING,
  JWT_CONFIG,
  EMAIL_TEMPLATES,
  ACHIEVEMENTS,
  AI_CONFIG,
  VALIDATION_PATTERNS,
  PERFORMANCE_THRESHOLDS,
  API_VERSION
};
