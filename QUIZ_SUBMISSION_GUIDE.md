# Quiz Submission API Guide

This guide provides details on using the quiz submission API endpoint and troubleshooting common issues.

## Quiz Submission Endpoint

### Endpoint: `POST /api/quiz/submit`

### Request Format

```json
{
  "quizId": "quiz_123abc",
  "responses": [
    {
      "questionId": "q1",
      "userResponse": "A"
    },
    {
      "questionId": "q2",
      "userResponse": "B"
    }
  ]
}
```

### Response Format

The API response includes detailed evaluation results:

```json
{
  "success": true,
  "submission": {
    "submissionId": "sub_123abc",
    "quizId": "quiz_123abc",
    "score": 5,
    "maxScore": 10,
    "percentage": 50,
    "completedAt": "2025-06-18T05:21:11.296Z",
    "detailedResults": [
      {
        "questionId": "q1",
        "correct": true,
        "userResponse": "A",
        "correctResponse": "A",
        "marks": 3,
        "maxMarks": 5,
        "feedback": "Correct! Good work."
      },
      {
        "questionId": "q2",
        "correct": false,
        "userResponse": "B",
        "correctResponse": "C",
        "marks": 0,
        "maxMarks": 5,
        "feedback": "Incorrect. The correct answer is C."
      }
    ],
    "suggestions": [
      "Review the concepts related to question 2",
      "Try practicing similar questions to reinforce your understanding",
      "If you are unsure about a concept, ask for help"
    ]
  }
}
```

## Expected Fields in Response

The API response includes the following key fields:

- `submissionId`: Unique identifier for the submission
- `score`: Number of points earned
- `maxScore`: Maximum possible points
- `percentage`: Percentage score (0-100)
- `completedAt`: Timestamp when the quiz was submitted
- `detailedResults`: Array containing details about each question's evaluation
- `suggestions`: Array of learning suggestions based on performance

## Troubleshooting

### Missing Detailed Results

If `detailedResults` is empty or missing, check:

1. Ensure your responses array contains valid questionId values
2. Verify the quiz exists and has valid questions
3. Check that the user has permission to access the quiz

### Missing Suggestions

If `suggestions` is empty, the evaluation service might not have generated any suggestions. Try submitting a mix of correct and incorrect answers to trigger suggestion generation.

### Server Error

If you receive a 500 error:

1. Check the server logs for details
2. Verify the format of your request body
3. Ensure the quizId exists in the database

## Testing with Postman

The included Postman collection contains tests for verifying all aspects of the quiz submission API:

1. Navigate to the "Submit Quiz" request
2. The prerequest script automatically populates the responses based on the quiz questions
3. After sending the request, check the Tests tab to see if all required fields are present
4. The test verifies that `detailedResults` and `suggestions` are properly included
