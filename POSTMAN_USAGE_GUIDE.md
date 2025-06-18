# AI Quizzer Backend API - Postman Collection Usage Guide

This document explains how to use the updated Postman collection to test the AI Quizzer Backend API, with particular focus on the quiz submission workflow.

## Key Improvements Made

1. **Dynamic Quiz Response Handling**: The collection now automatically fetches question IDs from the actual quiz before submission, ensuring the responses match the questions in the database.

2. **Enhanced Test Scripts**: Added more comprehensive test scripts to validate API responses and help diagnose issues.

3. **Improved Error Handling**: Better error detection and reporting in pre-request and test scripts.

## Testing Workflow

### 1. Authentication First
- Run the "Login with Demo User" or "Login with Student User" request first
- The authentication token will be automatically saved for subsequent requests

### 2. Get or Generate a Quiz
- Use "Generate Quiz" endpoints to create a new quiz
- OR use "Get Quiz Details" with an existing quiz ID
- The question IDs from the quiz will be automatically stored for use in submission

### 3. Submit Quiz
- Run the "Submit Quiz Answers" request
- The collection will automatically use the question IDs from the previous step
- Default answers (all "A") will be submitted for testing purposes
- You'll receive detailed results showing which questions were answered correctly
- The response includes scores, detailed assessment of each answer, and learning suggestions

## Key Variables

The collection uses several important variables:

- `baseUrl`: Base URL of the API (default: http://localhost:3000)
- `authToken`: Authentication token (set automatically after login)
- `quizId`: Current quiz ID being used
- `dynamicResponses`: Automatically populated with question IDs from the current quiz
- `submissionId`: Stores the ID of the last submission

## Submit Quiz Request Technical Details

The "Submit Quiz Answers" endpoint has been enhanced with:

1. **Pre-request Script**: Fetches the quiz details to get correct question IDs
   ```javascript
   // Fetches the quiz
   const getQuizUrl = pm.variables.get('baseUrl') + '/api/quiz/' + pm.variables.get('quizId');
   // Extracts question IDs
   const responses = questions.map(q => ({
     questionId: q.questionId,
     userResponse: 'A'
   }));
   ```

2. **Dynamic Request Body**: Uses the actual question IDs from the quiz
   ```json
   {
     "quizId": "{{quizId}}",
     "responses": {{dynamicResponses}}
   }
   ```

3. **Test Script**: Validates the submission response
   ```javascript
   pm.test('Submission has expected fields', function() {
     const response = pm.response.json();
     pm.expect(response.submission).to.have.property('submissionId');
     // ...additional validation
   });
   ```

## Troubleshooting

If you encounter issues with the quiz submission:

1. Make sure you've successfully retrieved a quiz first (check the console for "Saved X question responses")
2. Verify the `dynamicResponses` variable has been populated correctly
3. Check the quiz format in the database using the provided verification scripts
4. Examine the application logs for detailed error information

### Missing Detailed Results

If you're not seeing detailed results in the submission response:

1. Run the `test-quiz-submission-results.js` script to diagnose the issue
2. Check that the questions in the quiz have proper `correctAnswer` values
3. Verify that the server logs don't show any parsing errors for the detailed_results field
4. Make sure your submissions contain valid questionId values that match the quiz

## Testing with Real Data

To test with specific answers rather than all "A":

1. Get the quiz details first
2. Modify the `dynamicResponses` variable with custom answers
3. Run the submission request

Example of custom response format:
```json
[
  {"questionId": "q1", "userResponse": "B"},
  {"questionId": "q2", "userResponse": "C"}
]
```
