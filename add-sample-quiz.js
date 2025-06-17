const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

// Connect to the database
const db = new sqlite3.Database('./ai_quizzer_dev.db', (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database');
});

// Sample quiz data
const sampleQuiz = {
  quiz_id: `quiz_${uuidv4().replace(/-/g, '')}`,
  user_id: 1, // Use an existing user ID
  title: "Sample Science Quiz",
  subject: "Science",
  grade: 6,
  difficulty: "MEDIUM",
  total_questions: 3,
  max_score: 6,
  questions: JSON.stringify([
    {
      questionId: "q1",
      question: "What is the chemical symbol for water?",
      type: "multiple_choice",
      options: ["H2O", "CO2", "O2", "H2O2"],
      correctAnswer: "A",
      marks: 2,
      explanation: "Water's chemical formula is H2O (two hydrogen atoms and one oxygen atom)"
    },
    {
      questionId: "q2",
      question: "Which planet is known as the Red Planet?",
      type: "multiple_choice",
      options: ["Venus", "Mars", "Jupiter", "Saturn"],
      correctAnswer: "B",
      marks: 2,
      explanation: "Mars is called the Red Planet because of its reddish appearance"
    },
    {
      questionId: "q3",
      question: "What is the largest organ in the human body?",
      type: "multiple_choice",
      options: ["Heart", "Liver", "Skin", "Brain"],
      correctAnswer: "C",
      marks: 2,
      explanation: "The skin is the largest organ in the human body"
    }
  ])
};

// Insert the sample quiz
db.run(
  `INSERT INTO quizzes (quiz_id, user_id, title, subject, grade, difficulty, total_questions, max_score, questions, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
  [
    sampleQuiz.quiz_id,
    sampleQuiz.user_id,
    sampleQuiz.title,
    sampleQuiz.subject,
    sampleQuiz.grade,
    sampleQuiz.difficulty,
    sampleQuiz.total_questions,
    sampleQuiz.max_score,
    sampleQuiz.questions
  ],
  function(err) {
    if (err) {
      console.error('Error inserting sample quiz:', err.message);
    } else {
      console.log(`Added sample quiz with ID: ${sampleQuiz.quiz_id}`);
      console.log('Quiz details:', {
        title: sampleQuiz.title,
        subject: sampleQuiz.subject,
        grade: sampleQuiz.grade,
        difficulty: sampleQuiz.difficulty,
        questions: JSON.parse(sampleQuiz.questions).length
      });
    }
    
    // Close database connection
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed');
      }
    });
  }
);
