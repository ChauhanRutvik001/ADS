# AI Quizzer Backend - Complete Testing Guide

## 🚀 Quick Start

### Prerequisites
1. **Node.js** (v16+) installed
2. **Postman** application installed
3. **Git** for version control

### 1. Environment Setup

```bash
# Navigate to project directory
cd "c:\Users\Rutvi\OneDrive\Desktop\PlayPowerLabAssignment\Quiz_Backend"

# Install dependencies
npm install

# Run database migration
npm run migrate

# Seed database with sample data
npm run seed

# Start development server
npm run dev
```

### 2. Server Verification

The server should start successfully and show:
```
✅ SQLite database connected and ready for development
✅ Redis connected successfully
🚀 AI Quizzer Backend server running on port 3000
📚 API Documentation available at http://localhost:3000/api-docs
🏥 Health check available at http://localhost:3000/health
```

---

## 📋 API Endpoints Overview

### Base URL: `http://localhost:3000`

### 🔐 Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (requires auth)
- `POST /api/auth/refresh` - Refresh JWT token (requires auth)
- `POST /api/auth/logout` - User logout (requires auth)

### 📝 Quiz Management Endpoints
- `POST /api/quiz/generate` - Generate new quiz (requires auth)
- `GET /api/quiz/:quizId` - Get quiz details (requires auth)
- `POST /api/quiz/submit` - Submit quiz answers (requires auth)
- `GET /api/quiz/:quizId/hint/:questionId` - Get question hint (requires auth)
- `GET /api/quiz/:quizId/leaderboard` - Get quiz leaderboard (requires auth)
- `POST /api/quiz/retry/:quizId` - Retry quiz (requires auth)

### 📊 History & Analytics Endpoints
- `GET /api/history` - Get quiz history with pagination (requires auth)
- `GET /api/history/stats` - Get user statistics (requires auth)
- `GET /api/history/recent` - Get recent activity (requires auth)
- `GET /api/history/:submissionId` - Get submission details (requires auth)
- `GET /api/history/meta/subjects` - Get attempted subjects (requires auth)
- `GET /api/history/meta/grades` - Get attempted grades (requires auth)

### 🏥 System Endpoints
- `GET /health` - Health check
- `GET /` - Root endpoint
- `GET /api-docs` - Swagger API documentation

---

## 🧪 Postman Testing Setup

### 1. Import Collection
1. Open Postman
2. Click **Import** → **File** → Select `AI_Quizzer_Backend.postman_collection.json`
3. The collection will be imported with all endpoints and test scripts

### 2. Environment Variables (Auto-configured)
The collection uses these variables (automatically set by test scripts):
- `baseUrl`: http://localhost:3000
- `authToken`: JWT token (set after login)
- `userId`: User ID (set after login/register)
- `quizId`: Quiz ID (set after quiz generation)
- `submissionId`: Submission ID (set after quiz submission)

---

## 📝 Step-by-Step Testing Process

### Phase 1: System Health Check ✅

1. **Test Server Health**
   - Run: `Health Check`
   - Expected: Status 200, JSON response with server info
   - Verify: `"success": true, "message": "AI Quizzer Backend is running"`

2. **Test API Documentation**
   - Run: `API Documentation`
   - Expected: Status 200, Swagger UI HTML
   - Verify: Access http://localhost:3000/api-docs in browser

3. **Test Root Endpoint**
   - Run: `Root Endpoint`
   - Expected: Status 200, Welcome message with API info

### Phase 2: Authentication Testing 🔐

4. **Register New User**
   - Run: `Register New User`
   - Expected: Status 201, user created with JWT token
   - Verify: `authToken` and `userId` variables are set
   - Test Data: Random username/email, password: "TestPass123!"

5. **Login with Demo User**
   - Run: `Login with Demo User`
   - Expected: Status 200, successful login
   - Credentials: username: "demo_user", password: "Demo123!"
   - Verify: `authToken` is updated

6. **Login with Student User**
   - Run: `Login with Student User`
   - Expected: Status 200, successful login
   - Credentials: username: "test_student", password: "Student123!"

7. **Get User Profile**
   - Run: `Get User Profile`
   - Expected: Status 200, user profile data
   - Verify: User information matches logged-in user

8. **Refresh Token**
   - Run: `Refresh Token`
   - Expected: Status 200, new JWT token

9. **Test Unauthorized Access**
   - Run: `Unauthorized Request`
   - Expected: Status 401, "Access denied" message

10. **Test Invalid Login**
    - Run: `Invalid Login`
    - Expected: Status 401, "Invalid credentials" message

### Phase 3: Quiz Generation & Management 📝

11. **Generate Mathematics Quiz**
    - Run: `Generate Quiz - Mathematics`
    - Expected: Status 201, quiz created with questions
    - Verify: `quizId` variable is set
    - Data: Subject: Mathematics, Grade: 5, Difficulty: EASY

12. **Generate Science Quiz**
    - Run: `Generate Quiz - Science`
    - Expected: Status 201, quiz created
    - Data: Subject: Science, Grade: 6, Difficulty: MEDIUM

13. **Get Quiz Details**
    - Run: `Get Quiz Details`
    - Expected: Status 200, complete quiz with questions
    - Verify: Questions array, quiz metadata

14. **Submit Quiz Answers**
    - Run: `Submit Quiz Answers`
    - Expected: Status 200, submission results with score
    - Verify: `submissionId` variable is set
    - Data: Sample answers for quiz questions

15. **Get Quiz Hint**
    - Run: `Get Quiz Hint`
    - Expected: Status 200, hint for specific question
    - Verify: Hint text is provided

16. **Get Quiz Leaderboard**
    - Run: `Get Quiz Leaderboard`
    - Expected: Status 200, leaderboard data

17. **Retry Quiz**
    - Run: `Retry Quiz`
    - Expected: Status 200, new quiz attempt allowed

18. **Test Invalid Quiz ID**
    - Run: `Invalid Quiz ID`
    - Expected: Status 404, "Quiz not found" message

### Phase 4: History & Analytics Testing 📊

19. **Get Quiz History**
    - Run: `Get Quiz History`
    - Expected: Status 200, paginated history list
    - Verify: Pagination metadata, submission records

20. **Get History with Filters**
    - Run: `Get History with Filters`
    - Expected: Status 200, filtered results
    - Verify: Results match filter criteria

21. **Get User Statistics**
    - Run: `Get User Statistics`
    - Expected: Status 200, comprehensive stats
    - Verify: Total quizzes, average score, improvement trends

22. **Get Recent Activity**
    - Run: `Get Recent Activity`
    - Expected: Status 200, recent quiz activities

23. **Get Submission Details**
    - Run: `Get Submission Details`
    - Expected: Status 200, detailed submission info
    - Verify: Question-wise answers, scores, explanations

24. **Get User Subjects**
    - Run: `Get User Subjects`
    - Expected: Status 200, list of attempted subjects

25. **Get User Grades**
    - Run: `Get User Grades`
    - Expected: Status 200, list of attempted grade levels

### Phase 5: Error Handling Testing ❌

26. **Test Missing Required Fields**
    - Run: `Missing Required Fields`
    - Expected: Status 400, validation error messages

27. **Test Rate Limiting**
    - Make multiple rapid requests
    - Expected: Status 429 after limit exceeded

28. **Test CORS**
    - Verify cross-origin requests work properly

29. **Logout User**
    - Run: `Logout`
    - Expected: Status 200, token invalidated

---

## 🔍 Test Validation Checklist

### ✅ Authentication Flow
- [ ] User registration works with strong password validation
- [ ] Login accepts valid credentials
- [ ] JWT tokens are properly generated and validated
- [ ] Protected routes require authentication
- [ ] Invalid credentials are rejected
- [ ] Token refresh functionality works

### ✅ Quiz Generation
- [ ] AI quiz generation works for different subjects
- [ ] Grade and difficulty levels are respected
- [ ] Generated questions have proper structure
- [ ] Question types include multiple choice options
- [ ] Correct answers and explanations are provided

### ✅ Quiz Submission
- [ ] Answer submission works correctly
- [ ] Scoring calculation is accurate
- [ ] Feedback is provided for answers
- [ ] Submission history is recorded
- [ ] Duplicate submissions are handled

### ✅ Data Persistence
- [ ] User data is properly stored
- [ ] Quiz data persists between sessions
- [ ] Submission history is maintained
- [ ] Database relationships are intact

### ✅ API Response Format
- [ ] All responses follow consistent JSON structure
- [ ] Error responses include helpful messages
- [ ] Success responses include relevant data
- [ ] HTTP status codes are appropriate

### ✅ Performance & Security
- [ ] Response times are reasonable (<2s for quiz generation)
- [ ] Rate limiting prevents abuse
- [ ] Input validation prevents injection attacks
- [ ] CORS is properly configured
- [ ] Sensitive data is not exposed

---

## 🐛 Common Issues & Solutions

### Database Connection Issues
```bash
# If PostgreSQL fails, SQLite fallback should work
# Check logs for connection status
npm run dev
```

### Redis Connection Issues
```bash
# Start Redis manually if needed
redis-server
# Or use Docker
docker run -d -p 6379:6379 redis:alpine
```

### AI Service Issues
```bash
# Check .env file for API keys
# Verify GEMINI_API_KEY is set correctly
# Check AI_PROVIDER setting
```

### Port Already in Use
```bash
# Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

---

## 📊 Performance Benchmarks

### Expected Response Times
- Health check: < 50ms
- Authentication: < 200ms
- Quiz generation: < 3000ms (depends on AI service)
- Quiz submission: < 500ms
- History queries: < 300ms

### Memory Usage
- Base application: ~50MB
- With active sessions: ~100MB
- Database cache: ~20MB

---

## 🔗 Additional Resources

### Live API Documentation
- **Swagger UI**: http://localhost:3000/api-docs
- **Health Endpoint**: http://localhost:3000/health

### Sample Credentials
- **Demo User**: demo_user / Demo123!
- **Student User**: test_student / Student123!
- **Teacher User**: teacher_demo / Teacher123!

### Environment Configuration
- **Mock Auth**: Enabled (accepts any valid format credentials)
- **AI Provider**: Gemini (with fallback)
- **Database**: SQLite (development)
- **Cache**: Redis

---

## 📞 Support

If you encounter any issues:

1. Check server logs in the terminal
2. Verify all environment variables are set
3. Ensure database migrations ran successfully
4. Test with provided sample credentials first
5. Check the `/health` endpoint for system status

**Happy Testing! 🎉**
