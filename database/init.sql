-- AI Quizzer Database Schema
-- Version: 1.0
-- Created: 2024

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
    quiz_id VARCHAR(50) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    grade INTEGER NOT NULL CHECK (grade >= 1 AND grade <= 12),
    difficulty VARCHAR(10) CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    total_questions INTEGER NOT NULL CHECK (total_questions > 0),
    max_score INTEGER NOT NULL CHECK (max_score > 0),
    questions JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quiz submissions table
CREATE TABLE IF NOT EXISTS quiz_submissions (
    submission_id VARCHAR(50) PRIMARY KEY,
    quiz_id VARCHAR(50) REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    responses JSONB NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0),
    max_score INTEGER NOT NULL CHECK (max_score > 0),
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    detailed_results JSONB,
    suggestions JSONB,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_retry BOOLEAN DEFAULT FALSE,
    original_submission_id VARCHAR(50) REFERENCES quiz_submissions(submission_id)
);

-- Quiz hints table (bonus feature)
CREATE TABLE IF NOT EXISTS quiz_hints (
    id SERIAL PRIMARY KEY,
    quiz_id VARCHAR(50) REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
    question_id VARCHAR(50) NOT NULL,
    hint_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(quiz_id, question_id)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_subject ON quizzes(subject);
CREATE INDEX IF NOT EXISTS idx_quizzes_grade ON quizzes(grade);
CREATE INDEX IF NOT EXISTS idx_quizzes_difficulty ON quizzes(difficulty);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_quiz_id ON quiz_submissions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_user_id ON quiz_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_completed_at ON quiz_submissions(completed_at);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_percentage ON quiz_submissions(percentage);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_is_retry ON quiz_submissions(is_retry);
CREATE INDEX IF NOT EXISTS idx_quiz_hints_quiz_question ON quiz_hints(quiz_id, question_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_user_completed ON quiz_submissions(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_quizzes_subject_grade ON quizzes(subject, grade);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_quiz_user ON quiz_submissions(quiz_id, user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE OR REPLACE VIEW user_quiz_stats AS
SELECT 
    u.id as user_id,
    u.username,
    COUNT(DISTINCT q.quiz_id) as quizzes_created,
    COUNT(DISTINCT qs.submission_id) as total_submissions,
    AVG(qs.percentage) as avg_score,
    MAX(qs.percentage) as best_score,
    COUNT(DISTINCT DATE(qs.completed_at)) as active_days
FROM users u
LEFT JOIN quizzes q ON u.id = q.user_id
LEFT JOIN quiz_submissions qs ON u.id = qs.user_id
GROUP BY u.id, u.username;

CREATE OR REPLACE VIEW quiz_performance AS
SELECT 
    q.quiz_id,
    q.title,
    q.subject,
    q.grade,
    q.difficulty,
    q.created_at,
    COUNT(qs.submission_id) as total_attempts,
    COUNT(DISTINCT qs.user_id) as unique_users,
    AVG(qs.percentage) as avg_score,
    MAX(qs.percentage) as highest_score,
    MIN(qs.percentage) as lowest_score
FROM quizzes q
LEFT JOIN quiz_submissions qs ON q.quiz_id = qs.quiz_id
GROUP BY q.quiz_id, q.title, q.subject, q.grade, q.difficulty, q.created_at;

-- Function to calculate user performance trends
CREATE OR REPLACE FUNCTION get_user_performance_trend(user_id_param INTEGER, days_back INTEGER DEFAULT 30)
RETURNS TABLE(
    date_bucket DATE,
    avg_score DECIMAL,
    quiz_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(qs.completed_at) as date_bucket,
        AVG(qs.percentage) as avg_score,
        COUNT(*)::INTEGER as quiz_count
    FROM quiz_submissions qs
    WHERE qs.user_id = user_id_param 
        AND qs.completed_at >= CURRENT_DATE - INTERVAL '%s days' % days_back
    GROUP BY DATE(qs.completed_at)
    ORDER BY date_bucket;
END;
$$ LANGUAGE plpgsql;

-- Function to get popular quiz subjects
CREATE OR REPLACE FUNCTION get_popular_subjects(limit_param INTEGER DEFAULT 10)
RETURNS TABLE(
    subject VARCHAR,
    quiz_count BIGINT,
    avg_grade DECIMAL,
    total_attempts BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.subject,
        COUNT(DISTINCT q.quiz_id) as quiz_count,
        AVG(q.grade) as avg_grade,
        COUNT(qs.submission_id) as total_attempts
    FROM quizzes q
    LEFT JOIN quiz_submissions qs ON q.quiz_id = qs.quiz_id
    GROUP BY q.subject
    ORDER BY quiz_count DESC, total_attempts DESC
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Insert some sample data for testing (optional)
-- This will only run if the tables are empty

DO $$
BEGIN
    -- Check if users table is empty
    IF NOT EXISTS (SELECT 1 FROM users LIMIT 1) THEN
        -- Insert sample users
        INSERT INTO users (username, password_hash, email) VALUES
        ('demo_user', '$2b$10$rQ8Q3O0Q8Q3O0Q8Q3O0Q8Q3O0Q8Q3O0Q8Q3O0Q8Q3O0Q8Q3O0Q8Q3O', 'demo@example.com'),
        ('test_student', '$2b$10$rQ8Q3O0Q8Q3O0Q8Q3O0Q8Q3O0Q8Q3O0Q8Q3O0Q8Q3O0Q8Q3O0Q8Q3O', 'student@example.com');
        
        RAISE NOTICE 'Sample users inserted for testing';
    END IF;
END $$;

-- Grant permissions (adjust as needed for your deployment)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

COMMIT;
