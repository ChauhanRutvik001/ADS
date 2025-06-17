const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const db = new sqlite3.Database('./ai_quizzer_dev.db', (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database');
});

// Query to show tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
  if (err) {
    console.error('Error getting tables:', err.message);
    return;
  }
  
  console.log('\n==== DATABASE TABLES ====');
  tables.forEach((table) => {
    console.log(`- ${table.name}`);
  });
  
  // Query users
  db.all("SELECT id, username, email, created_at FROM users LIMIT 5", [], (err, users) => {
    if (err) {
      console.error('Error getting users:', err.message);
    } else {
      console.log('\n==== USERS ====');
      if (users.length === 0) {
        console.log('No users found');
      } else {
        users.forEach((user) => {
          console.log(`ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Created: ${user.created_at}`);
        });
      }
    }
    
    // Query quizzes
    db.all("SELECT quiz_id, user_id, title, subject, grade, difficulty, total_questions, created_at FROM quizzes LIMIT 5", [], (err, quizzes) => {
      if (err) {
        console.error('Error getting quizzes:', err.message);
      } else {
        console.log('\n==== QUIZZES ====');
        if (quizzes.length === 0) {
          console.log('No quizzes found');
        } else {
          quizzes.forEach((quiz) => {
            console.log(`Quiz ID: ${quiz.quiz_id}`);
            console.log(`Title: ${quiz.title}`);
            console.log(`Subject: ${quiz.subject}, Grade: ${quiz.grade}, Difficulty: ${quiz.difficulty}`);
            console.log(`Questions: ${quiz.total_questions}, Created: ${quiz.created_at}`);
            console.log('-------------------');
          });
          
          // Get details of the first quiz (including questions)
          if (quizzes.length > 0) {
            const firstQuizId = quizzes[0].quiz_id;
            db.get("SELECT questions FROM quizzes WHERE quiz_id = ?", [firstQuizId], (err, result) => {
              if (err) {
                console.error('Error getting quiz details:', err.message);
              } else if (result) {
                console.log('\n==== QUIZ QUESTIONS SAMPLE ====');
                try {
                  const questions = JSON.parse(result.questions);
                  console.log(`Found ${questions.length} questions for quiz ${firstQuizId}`);
                  if (questions.length > 0) {
                    console.log('\nFirst question:');
                    console.log(JSON.stringify(questions[0], null, 2));
                  }
                } catch (e) {
                  console.error('Error parsing questions JSON:', e);
                  console.log('Raw questions data:', result.questions);
                }
              }
              
              // Query submissions
              db.all("SELECT submission_id, quiz_id, user_id, score, max_score, percentage, completed_at FROM quiz_submissions LIMIT 5", [], (err, submissions) => {
                if (err) {
                  console.error('Error getting submissions:', err.message);
                } else {
                  console.log('\n==== QUIZ SUBMISSIONS ====');
                  if (submissions.length === 0) {
                    console.log('No submissions found');
                  } else {
                    submissions.forEach((sub) => {
                      console.log(`Submission ID: ${sub.submission_id}`);
                      console.log(`Quiz ID: ${sub.quiz_id}, User ID: ${sub.user_id}`);
                      console.log(`Score: ${sub.score}/${sub.max_score} (${sub.percentage}%)`);
                      console.log(`Completed: ${sub.completed_at}`);
                      console.log('-------------------');
                    });
                  }
                }
                
                // Close database connection
                db.close((err) => {
                  if (err) {
                    console.error('Error closing database:', err.message);
                  } else {
                    console.log('\nDatabase connection closed');
                  }
                });
              });
            });
          } else {
            db.close((err) => {
              if (err) {
                console.error('Error closing database:', err.message);
              } else {
                console.log('\nDatabase connection closed');
              }
            });
          }
        }
      }
    });
  });
});
