// Script to check if a specific quiz exists and show all its data
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'ai_quizzer_dev.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('Connected to database at', dbPath);
});

const quizId = 'quiz_2e2c558b4edc424fa787f7dbaa79139b';

// Query the database for the specific quiz
db.get('SELECT * FROM quizzes WHERE quiz_id = ?', [quizId], (err, quiz) => {
  if (err) {
    console.error('Error querying database:', err.message);
    db.close();
    return;
  }

  if (!quiz) {
    console.log(`Quiz with ID ${quizId} not found in the database.`);
    db.close();
    return;
  }

  console.log('Quiz found:');
  console.log('------------');
  console.log('ID:', quiz.quiz_id);
  console.log('User ID:', quiz.user_id);
  console.log('Title:', quiz.title);
  console.log('Difficulty:', quiz.difficulty);
  console.log('Category:', quiz.category);
  console.log('Created At:', quiz.created_at);
  
  try {
    // Parse questions if they exist
    const questions = quiz.questions ? JSON.parse(quiz.questions) : [];
    console.log('\nQuestions:');
    console.log('-----------');
    
    if (questions.length === 0) {
      console.log('No questions found (questions array is empty)');
    } else {
      // Check if we need to parse questions one more time (double encoding issue)
      let parsedQuestions = questions;
      if (typeof questions === 'string') {
        try {
          parsedQuestions = JSON.parse(questions);
          console.log('Note: Questions were double-encoded in JSON');
        } catch (parseErr) {
          console.log('Note: Questions are stored as a string but not valid JSON:', questions.substring(0, 100) + '...');
        }
      }
      
      // Display each question
      if (Array.isArray(parsedQuestions)) {
        console.log(`Found ${parsedQuestions.length} questions:`);
        parsedQuestions.forEach((q, i) => {
          console.log(`\nQuestion ${i + 1}:`);
          console.log(`Question: ${q.question}`);
          console.log(`Correct Answer: ${q.correctAnswer}`);
          console.log(`Options:`, q.options);
        });
      } else {
        console.log('Questions data is not an array:', typeof parsedQuestions, parsedQuestions);
      }
    }
    
    // Show the raw data for debugging
    console.log('\nRaw questions data:', quiz.questions);
  } catch (error) {
    console.error('\nError parsing questions JSON:', error.message);
    console.log('Raw questions data:', quiz.questions);
  }

  // Close the database connection
  db.close();
});
