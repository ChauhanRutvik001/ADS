const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.originalUrl} not found`,
      availableRoutes: {
        auth: [
          'POST /api/auth/login',
          'POST /api/auth/register'
        ],
        quiz: [
          'POST /api/quiz/generate',
          'POST /api/quiz/submit',
          'POST /api/quiz/retry/:quizId',
          'GET /api/quiz/:quizId/hint/:questionId'
        ],
        history: [
          'GET /api/quiz/history'
        ],
        misc: [
          'GET /health',
          'GET /api-docs'
        ]
      }
    }
  });
};

module.exports = notFound;
