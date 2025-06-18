# AI Quizzer Backend API Documentation

## Overview

This document provides comprehensive documentation for the AI Quizzer Backend API. The API enables developers to create educational quiz applications with AI-powered quiz generation, evaluation, and analytics features.

## Base URL

```
https://api.aiquizzer.example.com
```

For local development:
```
http://localhost:3000
```

## Authentication

### Register a New User

**Endpoint**: `POST /api/auth/register`

**Description**: Creates a new user account

**Request Body**:
```json
{
  "username": "johndoe",
  "password": "SecurePass123!",
  "email": "john.doe@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john.doe@example.com"
  }
}
```

### User Login

**Endpoint**: `POST /api/auth/login`

**Description**: Authenticates a user and provides a JWT token

**Request Body**:
```json
{
  "username": "johndoe",
  "password": "SecurePass123!"
}
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john.doe@example.com"
  }
}
```

### Get User Profile

**Endpoint**: `GET /api/auth/profile`

**Description**: Retrieves the profile of the authenticated user

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john.doe@example.com",
    "created_at": "2025-06-10T12:00:00.000Z"
  }
}
```

### Logout

**Endpoint**: `POST /api/auth/logout`

**Description**: Invalidates the user's authentication token

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Quiz Management

### Generate Quiz

**Endpoint**: `POST /api/quiz/generate`

**Description**: Generates a new quiz based on provided parameters

**Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "grade": 5,
  "Subject": "Mathematics",
  "TotalQuestions": 10,
  "MaxScore": 10,
  "Difficulty": "EASY"
}
```

**Response**:
```json
{
  "success": true,
  "quiz": {
    "quiz_id": "quiz_123abc",
    "title": "Grade 5 Mathematics Quiz",
    "subject": "Mathematics",
    "grade": 5,
    "difficulty": "EASY",
    "total_questions": 10,
    "max_score": 10,
    "questions": [
      {
        "questionId": "q1",
        "question": "What is 5 + 7?",
        "type": "multiple_choice",
        "options": ["10", "11", "12", "13"]
      },
      // More questions...
    ],
    "created_at": "2025-06-18T05:21:11.296Z"
  }
}
```

### Get Quiz Details

**Endpoint**: `GET /api/quiz/:quizId`

**Description**: Retrieves the details of a specific quiz

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "quiz": {
    "quiz_id": "quiz_123abc",
    "title": "Grade 5 Mathematics Quiz",
    "subject": "Mathematics",
    "grade": 5,
    "difficulty": "EASY",
    "questions": [
      {
        "questionId": "q1",
        "question": "What is 5 + 7?",
        "type": "multiple_choice",
        "options": ["10", "11", "12", "13"]
      },
      // More questions...
    ],
    "created_at": "2025-06-18T05:21:11.296Z"
  }
}
```

### Submit Quiz

**Endpoint**: `POST /api/quiz/submit`

**Description**: Submits a completed quiz for evaluation

**Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "quizId": "quiz_123abc",
  "responses": [
    {
      "questionId": "q1",
      "userResponse": "C"
    },
    {
      "questionId": "q2",
      "userResponse": "B"
    }
    // More responses...
  ]
}
```

**Response**:
```json
{
  "success": true,
  "submission": {
    "submissionId": "sub_456def",
    "quizId": "quiz_123abc",
    "score": 7,
    "maxScore": 10,
    "percentage": 70,
    "completedAt": "2025-06-18T05:30:45.123Z",
    "detailedResults": [
      {
        "questionId": "q1",
        "correct": true,
        "userResponse": "C",
        "correctResponse": "C",
        "marks": 1,
        "maxMarks": 1,
        "feedback": "Correct! 5 + 7 = 12."
      },
      // More results...
    ],
    "suggestions": [
      "Practice more addition problems with numbers greater than 10",
      "Review multiplication tables from 1-10"
    ]
  }
}
```

### Get Quiz Hint

**Endpoint**: `GET /api/quiz/:quizId/hint/:questionId`

**Description**: Provides a hint for a specific quiz question

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "hint": "Try adding the numbers together, remembering that 5 + 7 means the total of 5 and 7.",
  "questionId": "q1"
}
```

### Retry Quiz

**Endpoint**: `POST /api/quiz/:quizId/retry`

**Description**: Creates a new attempt for an existing quiz

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "message": "Quiz ready for retry",
  "quizId": "quiz_123abc"
}
```

## History Management

### Get Quiz History

**Endpoint**: `GET /api/history`

**Description**: Retrieves the user's quiz history, with optional filters

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `subject` (optional): Filter by subject
- `grade` (optional): Filter by grade level
- `minScore` (optional): Filter by minimum score percentage
- `from` (optional): Filter by start date (YYYY-MM-DD)
- `to` (optional): Filter by end date (YYYY-MM-DD)
- `page` (optional): Page number for pagination
- `limit` (optional): Items per page

**Response**:
```json
{
  "success": true,
  "data": {
    "submissions": [
      {
        "submission_id": "sub_456def",
        "quiz_id": "quiz_123abc",
        "score": 7,
        "max_score": 10,
        "percentage": 70,
        "completed_at": "2025-06-18T05:30:45.123Z",
        "quiz_title": "Grade 5 Mathematics Quiz",
        "subject": "Mathematics",
        "grade": 5
      },
      // More submissions...
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 25,
      "itemsPerPage": 10
    }
  }
}
```

### Get User Statistics

**Endpoint**: `GET /api/history/stats`

**Description**: Retrieves statistical information about the user's quiz performance

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "stats": {
    "totalQuizzes": 15,
    "averageScore": 75.5,
    "highestScore": 100,
    "lowestScore": 60,
    "subjectBreakdown": [
      {
        "subject": "Mathematics",
        "count": 7,
        "averageScore": 80
      },
      {
        "subject": "Science",
        "count": 5,
        "averageScore": 72
      },
      {
        "subject": "English",
        "count": 3,
        "averageScore": 68
      }
    ],
    "recentProgress": [
      {
        "date": "2025-06-15",
        "averageScore": 70
      },
      {
        "date": "2025-06-16",
        "averageScore": 75
      },
      {
        "date": "2025-06-17",
        "averageScore": 80
      }
    ]
  }
}
```

### Get Submission Details

**Endpoint**: `GET /api/history/submission/:submissionId`

**Description**: Retrieves detailed information about a specific quiz submission

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "submission": {
    "submissionId": "sub_456def",
    "quizId": "quiz_123abc",
    "score": 7,
    "maxScore": 10,
    "percentage": 70,
    "completedAt": "2025-06-18T05:30:45.123Z",
    "detailedResults": [
      {
        "questionId": "q1",
        "correct": true,
        "userResponse": "C",
        "correctResponse": "C",
        "marks": 1,
        "maxMarks": 1,
        "feedback": "Correct! 5 + 7 = 12."
      },
      // More results...
    ],
    "suggestions": [
      "Practice more addition problems with numbers greater than 10",
      "Review multiplication tables from 1-10"
    ]
  }
}
```

### Get User Subjects

**Endpoint**: `GET /api/history/subjects`

**Description**: Retrieves a list of subjects the user has taken quizzes in

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "subjects": ["Mathematics", "Science", "English", "History"]
}
```

### Get User Grades

**Endpoint**: `GET /api/history/grades`

**Description**: Retrieves a list of grade levels the user has taken quizzes in

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "grades": [3, 4, 5, 6]
}
```

## Error Handling

All API endpoints follow a consistent error format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "code": 404,  // HTTP status code
  "details": {} // Optional additional error details
}
```

## Rate Limiting

API requests are subject to rate limiting to prevent abuse. The default limits are:

- 100 requests per 15-minute window per IP address
- Authenticated requests have higher limits than unauthenticated requests

When rate limited, the API will respond with HTTP status code 429 and a descriptive error message.

## Using the API with Postman

A comprehensive Postman collection is included in the repository (`AI_Quizzer_Backend.postman_collection.json`). Import this collection into Postman to quickly test all API endpoints.
