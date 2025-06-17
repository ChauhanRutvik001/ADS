const sqlite3 = require('sqlite3').verbose();

// Connect to the database
const db = new sqlite3.Database('./ai_quizzer_dev.db', (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database');
});

// The quiz ID you want to check
const quizId = 'quiz_210114cf7e4548b590bbcb02d5e8163a';

// Query to find the specific quiz
console.log(`Checking if quiz with ID ${quizId} exists in the database...\n`);

db.get("SELECT quiz_id, user_id, title, subject, grade, difficulty, total_questions, max_score, created_at FROM quizzes WHERE quiz_id = ?", [quizId], (err, quiz) => {
  if (err) {
    console.error('Error querying quiz:', err.message);
    closeDb();
    return;
  }
  
  if (!quiz) {
    console.log(`❌ Quiz with ID ${quizId} NOT FOUND in the database.`);
    closeDb();
    return;
  }
  
  console.log(`✅ Quiz with ID ${quizId} EXISTS in the database.`);
  console.log('\nQuiz Details:');
  console.log('-------------');
  console.log(`Title: ${quiz.title}`);
  console.log(`Subject: ${quiz.subject}`);
  console.log(`Grade: ${quiz.grade}`);
  console.log(`Difficulty: ${quiz.difficulty}`);
  console.log(`Total Questions: ${quiz.total_questions}`);
  console.log(`Max Score: ${quiz.max_score}`);
  console.log(`Created At: ${quiz.created_at}`);
  
  // Now let's check the questions
  db.get("SELECT questions FROM quizzes WHERE quiz_id = ?", [quizId], (err, result) => {
    if (err) {
      console.error('Error querying quiz questions:', err.message);
      closeDb();
      return;
    }
    
    if (result && result.questions) {
      try {
        const questions = JSON.parse(result.questions);
        console.log(`\nThis quiz has ${questions.length} questions stored in the database.`);
        
        // Print first question as a sample
        if (questions.length > 0) {
          console.log('\nFirst question:');
          console.log('---------------');
          console.log(`Question ID: ${questions[0].questionId}`);
          console.log(`Question: ${questions[0].question}`);
          console.log(`Type: ${questions[0].type}`);
          console.log(`Correct Answer: ${questions[0].correctAnswer}`);
          
          // Compare with the expected question
          const expectedFirstQuestion = "What is the value of 5 x 7?";
          if (questions[0].question === expectedFirstQuestion) {
            console.log('\n✅ The first question matches what you expect.');
          } else {
            console.log('\n⚠️ The first question does not match what you expect.');
            console.log(`Expected: "${expectedFirstQuestion}"`);
            console.log(`Actual: "${questions[0].question}"`);
          }
        }
      } catch (e) {
        console.error('Error parsing questions JSON:', e);
        console.log('Raw questions data:', result.questions);
      }
    } else {
      console.log('\n❌ No questions found for this quiz.');
    }
    
    closeDb();
  });
});

function closeDb() {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('\nDatabase connection closed');
    }
  });
}
