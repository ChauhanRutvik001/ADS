const { connectDatabase } = require('../config/database');
const User = require('../models/User');
const Quiz = require('../models/Quiz');
const Submission = require('../models/Submission');
const logger = require('../utils/logger');

async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');

    // Connect to database
    await connectDatabase();

    // Check if data already exists
    const existingUsers = await User.findByUsername('demo_user');
    if (existingUsers) {
      logger.info('Database already contains seed data. Skipping...');
      process.exit(0);
    }

    // Create sample users
    logger.info('Creating sample users...');
    
    const demoUser = await User.create({
      username: 'demo_user',
      password: 'Demo123!',
      email: 'demo@aiquizzer.com'
    });

    const studentUser = await User.create({
      username: 'test_student',
      password: 'Student123!',
      email: 'student@aiquizzer.com'
    });

    const teacherUser = await User.create({
      username: 'teacher_demo',
      password: 'Teacher123!',
      email: 'teacher@aiquizzer.com'
    });

    logger.info('✅ Sample users created');

    // Create sample quizzes
    logger.info('Creating sample quizzes...');

    const mathQuiz = await Quiz.create({
      userId: teacherUser.id,
      title: 'Grade 5 Mathematics Quiz',
      subject: 'Mathematics',
      grade: 5,
      difficulty: 'EASY',
      totalQuestions: 5,
      maxScore: 10,
      questions: [
        {
          questionId: 'q1',
          question: 'What is 5 + 3?',
          type: 'multiple_choice',
          options: ['6', '7', '8', '9'],
          correctAnswer: 'C',
          marks: 2,
          explanation: '5 + 3 = 8'
        },
        {
          questionId: 'q2',
          question: 'What is 12 - 4?',
          type: 'multiple_choice',
          options: ['6', '7', '8', '9'],
          correctAnswer: 'C',
          marks: 2,
          explanation: '12 - 4 = 8'
        },
        {
          questionId: 'q3',
          question: 'What is 3 × 4?',
          type: 'multiple_choice',
          options: ['10', '11', '12', '13'],
          correctAnswer: 'C',
          marks: 2,
          explanation: '3 × 4 = 12'
        },
        {
          questionId: 'q4',
          question: 'What is 20 ÷ 4?',
          type: 'multiple_choice',
          options: ['4', '5', '6', '7'],
          correctAnswer: 'B',
          marks: 2,
          explanation: '20 ÷ 4 = 5'
        },
        {
          questionId: 'q5',
          question: 'Which number is greater: 15 or 18?',
          type: 'multiple_choice',
          options: ['15', '18', 'They are equal', 'Cannot determine'],
          correctAnswer: 'B',
          marks: 2,
          explanation: '18 is greater than 15'
        }
      ]
    });

    const scienceQuiz = await Quiz.create({
      userId: teacherUser.id,
      title: 'Grade 3 Science Quiz',
      subject: 'Science',
      grade: 3,
      difficulty: 'EASY',
      totalQuestions: 4,
      maxScore: 8,
      questions: [
        {
          questionId: 'q1',
          question: 'What do plants need to grow?',
          type: 'multiple_choice',
          options: ['Only water', 'Only sunlight', 'Water, sunlight, and air', 'Only soil'],
          correctAnswer: 'C',
          marks: 2,
          explanation: 'Plants need water, sunlight, and air (carbon dioxide) to grow through photosynthesis'
        },
        {
          questionId: 'q2',
          question: 'How many legs does a spider have?',
          type: 'multiple_choice',
          options: ['6', '8', '10', '12'],
          correctAnswer: 'B',
          marks: 2,
          explanation: 'Spiders have 8 legs'
        },
        {
          questionId: 'q3',
          question: 'What is the largest planet in our solar system?',
          type: 'multiple_choice',
          options: ['Earth', 'Mars', 'Jupiter', 'Saturn'],
          correctAnswer: 'C',
          marks: 2,
          explanation: 'Jupiter is the largest planet in our solar system'
        },
        {
          questionId: 'q4',
          question: 'What do we call animals that eat only plants?',
          type: 'multiple_choice',
          options: ['Carnivores', 'Herbivores', 'Omnivores', 'Predators'],
          correctAnswer: 'B',
          marks: 2,
          explanation: 'Herbivores are animals that eat only plants'
        }
      ]
    });

    const englishQuiz = await Quiz.create({
      userId: teacherUser.id,
      title: 'Grade 4 English Quiz',
      subject: 'English',
      grade: 4,
      difficulty: 'MEDIUM',
      totalQuestions: 3,
      maxScore: 6,
      questions: [
        {
          questionId: 'q1',
          question: 'Which word is a noun?',
          type: 'multiple_choice',
          options: ['Run', 'Happy', 'Book', 'Quickly'],
          correctAnswer: 'C',
          marks: 2,
          explanation: 'A noun is a person, place, or thing. "Book" is a thing, so it is a noun.'
        },
        {
          questionId: 'q2',
          question: 'What is the past tense of "go"?',
          type: 'multiple_choice',
          options: ['Goes', 'Going', 'Gone', 'Went'],
          correctAnswer: 'D',
          marks: 2,
          explanation: 'The past tense of "go" is "went"'
        },
        {
          questionId: 'q3',
          question: 'Which sentence is correct?',
          type: 'multiple_choice',
          options: [
            'She don\'t like ice cream',
            'She doesn\'t like ice cream',
            'She not like ice cream',
            'She no like ice cream'
          ],
          correctAnswer: 'B',
          marks: 2,
          explanation: 'The correct form is "She doesn\'t like ice cream" using the contraction of "does not"'
        }
      ]
    });

    logger.info('✅ Sample quizzes created');

    // Create sample submissions
    logger.info('Creating sample submissions...');

    // Demo user takes math quiz
    await Submission.create({
      quizId: mathQuiz.quiz_id,
      userId: demoUser.id,
      responses: [
        { questionId: 'q1', userResponse: 'C' },
        { questionId: 'q2', userResponse: 'C' },
        { questionId: 'q3', userResponse: 'C' },
        { questionId: 'q4', userResponse: 'B' },
        { questionId: 'q5', userResponse: 'B' }
      ],
      score: 10,
      maxScore: 10,
      percentage: 100.0,
      detailedResults: [
        { questionId: 'q1', userResponse: 'C', correctAnswer: 'C', isCorrect: true, marks: 2, explanation: 'Correct! 5 + 3 = 8' },
        { questionId: 'q2', userResponse: 'C', correctAnswer: 'C', isCorrect: true, marks: 2, explanation: 'Correct! 12 - 4 = 8' },
        { questionId: 'q3', userResponse: 'C', correctAnswer: 'C', isCorrect: true, marks: 2, explanation: 'Correct! 3 × 4 = 12' },
        { questionId: 'q4', userResponse: 'B', correctAnswer: 'B', isCorrect: true, marks: 2, explanation: 'Correct! 20 ÷ 4 = 5' },
        { questionId: 'q5', userResponse: 'B', correctAnswer: 'B', isCorrect: true, marks: 2, explanation: 'Correct! 18 is greater than 15' }
      ],
      suggestions: ['Excellent work! You got all questions correct.']
    });

    // Student takes science quiz with some incorrect answers
    await Submission.create({
      quizId: scienceQuiz.quiz_id,
      userId: studentUser.id,
      responses: [
        { questionId: 'q1', userResponse: 'C' },
        { questionId: 'q2', userResponse: 'A' },
        { questionId: 'q3', userResponse: 'C' },
        { questionId: 'q4', userResponse: 'B' }
      ],
      score: 6,
      maxScore: 8,
      percentage: 75.0,
      detailedResults: [
        { questionId: 'q1', userResponse: 'C', correctAnswer: 'C', isCorrect: true, marks: 2, explanation: 'Correct! Plants need water, sunlight, and air' },
        { questionId: 'q2', userResponse: 'A', correctAnswer: 'B', isCorrect: false, marks: 0, explanation: 'Incorrect. Spiders have 8 legs, not 6' },
        { questionId: 'q3', userResponse: 'C', correctAnswer: 'C', isCorrect: true, marks: 2, explanation: 'Correct! Jupiter is the largest planet' },
        { questionId: 'q4', userResponse: 'B', correctAnswer: 'B', isCorrect: true, marks: 2, explanation: 'Correct! Herbivores eat only plants' }
      ],
      suggestions: [
        'Great job! Review spider characteristics to improve your animal knowledge.',
        'Keep studying different animal facts to strengthen your science skills.'
      ]
    });

    logger.info('✅ Sample submissions created');

    logger.info('✅ Database seeding completed successfully');
    
    // Display created data summary
    const userCount = (await User.findByUsername('demo_user')) ? 3 : 0;
    console.log('\n📊 Seed Data Summary:');
    console.log(`Users created: ${userCount}`);
    console.log('Sample accounts:');
    console.log('  - demo_user / Demo123! (demo@aiquizzer.com)');
    console.log('  - test_student / Student123! (student@aiquizzer.com)');
    console.log('  - teacher_demo / Teacher123! (teacher@aiquizzer.com)');
    console.log(`Quizzes created: 3 (Math, Science, English)`);
    console.log(`Submissions created: 2 sample submissions`);
    console.log('\n🚀 You can now start the server and test with these accounts!');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
