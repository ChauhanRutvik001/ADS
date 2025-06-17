# AI Quizzer Backend - Quick Start Guide

## Prerequisites

Before you begin, ensure you have:

- **Node.js** (version 16 or higher)
- **PostgreSQL** (version 13 or higher)
- **Redis** (version 6 or higher)
- **Groq API Key** (sign up at https://console.groq.com/)

## Installation Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
```bash
# Copy the environment template
cp .env.example .env

# Edit .env with your configuration
notepad .env  # Windows
```

### 3. Required Environment Variables

Update the `.env` file with these essential values:

```bash
# Database - Update with your PostgreSQL connection
DATABASE_URL=postgresql://username:password@localhost:5432/ai_quizzer

# Redis - Update with your Redis connection  
REDIS_URL=redis://localhost:6379

# JWT Secret - Generate a strong secret key
JWT_SECRET=your_very_long_random_secret_key_here

# Groq AI API - Get from https://console.groq.com/
GROQ_API_KEY=your_groq_api_key_here

# Enable mock authentication for testing
MOCK_AUTH=true
```

### 4. Database Setup
```bash
# Run database migrations
npm run migrate

# Seed with sample data (optional but recommended)
npm run seed
```

### 5. Start the Server
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

## Verification

1. **Health Check**: Visit http://localhost:3000/health
2. **API Documentation**: Visit http://localhost:3000/api-docs
3. **Test Login**: Use any username/password (mock auth enabled)

## Sample Test Accounts (if you ran seed)

```
Username: demo_user
Password: Demo123!
Email: demo@aiquizzer.com

Username: test_student  
Password: Student123!
Email: student@aiquizzer.com
```

## Quick API Test

### 1. Login (Mock Auth)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "anypassword"}'
```

### 2. Generate Quiz
```bash
curl -X POST http://localhost:3000/api/quiz/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "grade": 5,
    "Subject": "Mathematics", 
    "TotalQuestions": 3,
    "MaxScore": 6,
    "Difficulty": "EASY"
  }'
```

### 3. Submit Quiz
```bash
curl -X POST http://localhost:3000/api/quiz/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "quizId": "QUIZ_ID_FROM_GENERATION",
    "responses": [
      {"questionId": "q1", "userResponse": "A"},
      {"questionId": "q2", "userResponse": "B"}
    ]
  }'
```

## Common Issues & Solutions

### Database Connection Error
- Ensure PostgreSQL is running
- Check DATABASE_URL format: `postgresql://user:pass@host:port/dbname`
- Verify user has permission to create databases

### Redis Connection Error  
- Ensure Redis server is running
- Check REDIS_URL format: `redis://localhost:6379`

### AI Service Error
- Verify GROQ_API_KEY is correct
- Check internet connection
- Ensure you have API credits

### Port Already in Use
```bash
# Change port in .env file
PORT=3001

# Or kill process on port 3000
npx kill-port 3000
```

## Development Commands

```bash
# Start development server with auto-reload
npm run dev

# Run tests
npm test

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Check database migration status
npm run migrate

# Reset database (careful!)
npm run migrate && npm run seed
```

## Production Deployment

### 1. Environment Variables
Set these in your production environment:
```bash
NODE_ENV=production
DATABASE_URL=your_production_db_url
REDIS_URL=your_production_redis_url
JWT_SECRET=your_production_jwt_secret
GROQ_API_KEY=your_groq_api_key
MOCK_AUTH=false  # Disable mock auth
```

### 2. Docker Deployment
```bash
# Build image
docker build -t ai-quizzer-backend .

# Run with docker-compose
docker-compose up -d
```

### 3. Health Check
Monitor: `http://your-domain.com/health`

## Features Overview

✅ **Authentication**: JWT-based with mock mode for testing  
✅ **Quiz Generation**: AI-powered using Groq API  
✅ **Quiz Evaluation**: Intelligent scoring and feedback  
✅ **History Management**: Comprehensive quiz history  
✅ **Retry System**: Allow quiz retakes  
✅ **Hints System**: AI-generated hints  
✅ **Caching**: Redis-based performance optimization  
✅ **API Documentation**: Interactive Swagger docs  
✅ **Error Handling**: Comprehensive error management  
✅ **Logging**: Structured logging with Winston  
✅ **Validation**: Input validation and sanitization  
✅ **Rate Limiting**: API protection  
✅ **Docker Support**: Container-ready  

## Support

- **API Documentation**: http://localhost:3000/api-docs  
- **Health Check**: http://localhost:3000/health
- **Logs**: Check `logs/combined.log` and `logs/error.log`

Happy coding! 🚀
