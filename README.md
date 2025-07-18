# AI Quizzer Backend

A comprehensive microservice for an AI-powered quiz application with authentication, quiz generation, evaluation, and history management capabilities.

## Features

- 🔐 JWT-based authentication
- 🤖 AI-powered quiz generation using Groq API
- 📊 Intelligent quiz evaluation and scoring
- 📈 Comprehensive quiz history and analytics
- 🔄 Quiz retry functionality
- 💡 AI-generated hints (bonus feature)
- 📱 RESTful API design
- 🚀 Production-ready with Docker support

## Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL with Redis caching
- **AI Integration**: Groq API for quiz generation and evaluation
- **Authentication**: JWT tokens
- **Deployment**: Docker + cloud hosting ready

## Quick Start

### Prerequisites

- Node.js (>=16.0.0)
- PostgreSQL (>=13)
- Redis (>=6)
- Groq API key

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd Quiz_Backend
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run database migrations
```bash
npm run migrate
```

5. Start the development server
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## API Documentation

Once the server is running, visit `http://localhost:3000/api-docs` for complete API documentation.

### Core Endpoints

- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `POST /api/quiz/generate` - Generate AI-powered quiz
- `POST /api/quiz/submit` - Submit quiz answers
- `GET /api/quiz/history` - Get quiz history
- `POST /api/quiz/retry/{quizId}` - Retry a quiz
- `GET /api/quiz/{quizId}/hint/{questionId}` - Get AI hints

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ai_quizzer
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=24h

# AI Service
GROQ_API_KEY=your_groq_api_key
AI_MODEL=llama3-8b-8192

# Server
PORT=3000
NODE_ENV=development
```

## Docker Deployment

```bash
# Build the image
docker build -t ai-quizzer-backend .

# Run with docker-compose
docker-compose up -d
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint
```

## Project Structure

```
src/
├── controllers/         # Request handlers
├── middleware/          # Custom middleware
├── models/             # Database models
├── services/           # Business logic services
├── routes/             # API routes
├── utils/              # Utility functions
├── config/             # Configuration files
├── scripts/            # Database scripts
└── app.js             # Application entry point
```

## Features in Detail

### Authentication
- Secure JWT-based authentication
- Password hashing with bcrypt
- Token refresh mechanism
- Rate limiting for security

### Quiz Generation
- AI-powered question generation
- Multiple difficulty levels
- Subject-specific content
- Customizable question count and scoring

### Quiz Evaluation
- Intelligent answer evaluation
- Detailed explanations
- Personalized learning suggestions
- Performance analytics

### History Management
- Comprehensive quiz history
- Advanced filtering options
- Pagination support
- Performance tracking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
#   A D S  
 