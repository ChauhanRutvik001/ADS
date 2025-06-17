const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');
const { cache } = require('../config/redis');

class AIService {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'gemini';
    
    if (this.provider === 'gemini') {
      this.apiKey = process.env.GEMINI_API_KEY;
      this.model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
      this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
    } else if (this.provider === 'groq') {
      this.apiKey = process.env.GROQ_API_KEY;
      this.model = process.env.GROQ_MODEL || 'llama3-8b-8192';
      this.baseURL = 'https://api.groq.com/openai/v1';
    }
    
    if (!this.apiKey) {
      logger.warn(`${this.provider.toUpperCase()}_API_KEY not set. AI features will be limited.`);
    }
  }

  async makeRequest(messages, temperature = 0.7, maxTokens = 2000) {
    if (!this.apiKey) {
      throw new Error('AI service not configured');
    }

    try {
      if (this.provider === 'gemini') {
        return await this.makeGeminiRequest(messages, temperature, maxTokens);
      } else if (this.provider === 'groq') {
        return await this.makeGroqRequest(messages, temperature, maxTokens);
      } else {
        throw new Error(`Unsupported AI provider: ${this.provider}`);
      }
    } catch (error) {
      logger.error('AI API request failed:', error.message);
      throw error;
    }
  }

  async makeGeminiRequest(messages, temperature = 0.7, maxTokens = 2000) {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: this.model,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        }
      });

      // Convert messages to Gemini format
      const prompt = messages.map(msg => msg.content).join('\n\n');
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      logger.error('Gemini API request failed:', error.message);
      
      if (error.message?.includes('API_KEY_INVALID')) {
        throw new Error('Invalid Gemini API key');
      } else if (error.message?.includes('RATE_LIMIT_EXCEEDED')) {
        throw new Error('Gemini API rate limit exceeded');
      } else if (error.message?.includes('SERVICE_UNAVAILABLE')) {
        throw new Error('Gemini service temporarily unavailable');
      } else {
        throw new Error('Gemini request failed');
      }
    }
  }

  async makeGroqRequest(messages, temperature = 0.7, maxTokens = 2000) {
    try {
      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: this.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      logger.error('Groq API request failed:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Invalid Groq API key');
      } else if (error.response?.status === 429) {
        throw new Error('Groq API rate limit exceeded');
      } else if (error.response?.status >= 500) {
        throw new Error('Groq service temporarily unavailable');
      } else {
        throw new Error('Groq request failed');
      }
    }
  }

  generateQuizPrompt(grade, subject, totalQuestions, maxScore, difficulty) {
    return `Generate a ${difficulty} difficulty quiz for grade ${grade} students on ${subject}.

Requirements:
- Exactly ${totalQuestions} questions
- Each question worth ${Math.floor(maxScore / totalQuestions)} marks (distribute remaining marks across questions if needed)
- All questions should be multiple choice with options A, B, C, D
- Difficulty level: ${difficulty}
- Age-appropriate content for grade ${grade}
- Questions should test understanding, not just memorization
- Include a mix of question types within the subject

For ${difficulty} difficulty:
- EASY: Basic concepts, straightforward questions
- MEDIUM: Requires some analysis and application
- HARD: Complex problem-solving and critical thinking

Format the response as a valid JSON object with this exact structure:
{
  "questions": [
    {
      "questionId": "q1",
      "question": "Question text here",
      "type": "multiple_choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "A",
      "marks": 1,
      "explanation": "Brief explanation of the correct answer"
    }
  ]
}

Subject: ${subject}
Grade: ${grade}
Total Questions: ${totalQuestions}
Max Score: ${maxScore}
Difficulty: ${difficulty}

Generate the quiz now:`;
  }

  async generateQuiz(grade, subject, totalQuestions, maxScore, difficulty) {
    try {
      logger.info(`Generating ${difficulty} quiz: Grade ${grade} ${subject}, ${totalQuestions} questions`);
      
      // Check cache first
      const cacheKey = `generated_quiz:${grade}:${subject}:${totalQuestions}:${maxScore}:${difficulty}`;
      const cachedQuiz = await cache.get(cacheKey);
      
      if (cachedQuiz) {
        logger.info('Returning cached quiz');
        return cachedQuiz;
      }

      const prompt = this.generateQuizPrompt(grade, subject, totalQuestions, maxScore, difficulty);
      
      const messages = [
        {
          role: 'system',
          content: 'You are an expert educational content creator. Generate high-quality, curriculum-appropriate quiz questions. Always respond with valid JSON only, no additional text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const response = await this.makeRequest(messages, 0.8, 3000);
      
      // Parse and validate the response
      let quizData;
      try {
        // Clean the response in case there's extra text
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        
        quizData = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        logger.error('Failed to parse AI response:', parseError);
        throw new Error('Invalid response format from AI service');
      }

      // Validate the quiz structure
      if (!quizData.questions || !Array.isArray(quizData.questions)) {
        throw new Error('Invalid quiz structure: missing questions array');
      }

      if (quizData.questions.length !== totalQuestions) {
        logger.warn(`Expected ${totalQuestions} questions, got ${quizData.questions.length}`);
      }

      // Validate each question
      const validatedQuestions = quizData.questions.map((q, index) => {
        if (!q.question || !q.options || !Array.isArray(q.options) || q.options.length !== 4) {
          throw new Error(`Invalid question structure at index ${index}`);
        }

        if (!['A', 'B', 'C', 'D'].includes(q.correctAnswer)) {
          throw new Error(`Invalid correct answer at index ${index}`);
        }

        return {
          questionId: q.questionId || `q${index + 1}`,
          question: q.question,
          type: 'multiple_choice',
          options: q.options,
          correctAnswer: q.correctAnswer,
          marks: q.marks || Math.floor(maxScore / totalQuestions),
          explanation: q.explanation || 'No explanation provided'
        };
      });

      // Ensure total marks equals maxScore
      const totalMarks = validatedQuestions.reduce((sum, q) => sum + q.marks, 0);
      if (totalMarks !== maxScore) {
        const difference = maxScore - totalMarks;
        if (difference > 0 && validatedQuestions.length > 0) {
          validatedQuestions[0].marks += difference;
        }
      }

      const result = { questions: validatedQuestions };
      
      // Cache the result for 1 hour
      await cache.set(cacheKey, result, 3600);
      
      logger.info(`Successfully generated quiz with ${validatedQuestions.length} questions`);
      return result;
    } catch (error) {
      logger.error('Quiz generation failed:', error);
      throw error;
    }
  }

  generateEvaluationPrompt(quiz, responses) {
    return `Evaluate the following quiz responses and provide detailed feedback:

Quiz Information:
- Subject: ${quiz.subject}
- Grade: ${quiz.grade}
- Difficulty: ${quiz.difficulty}
- Total Questions: ${quiz.total_questions}
- Max Score: ${quiz.max_score}

Questions and User Responses:
${quiz.questions.map((q, index) => {
  const userResponse = responses.find(r => r.questionId === q.questionId);
  return `
Question ${index + 1} (${q.marks} marks):
Question: ${q.question}
Options: ${q.options.map((opt, i) => `${String.fromCharCode(65 + i)}: ${opt}`).join(', ')}
Correct Answer: ${q.correctAnswer}
User Answer: ${userResponse ? userResponse.userResponse : 'No response'}
Explanation: ${q.explanation}
`;
}).join('\n')}

Provide evaluation in this exact JSON format:
{
  "totalScore": 0,
  "maxScore": ${quiz.max_score},
  "percentage": 0.0,
  "detailedResults": [
    {
      "questionId": "q1",
      "userResponse": "A",
      "correctAnswer": "C",
      "isCorrect": false,
      "marks": 0,
      "explanation": "Detailed explanation of why this is correct/incorrect"
    }
  ],
  "suggestions": [
    "Specific learning suggestion based on incorrect answers",
    "Another helpful suggestion"
  ]
}

Requirements:
- Calculate exact scores based on marks for each question
- Provide specific explanations for each answer
- Give 2-3 constructive learning suggestions based on performance
- Make suggestions age-appropriate for grade ${quiz.grade}
- Focus on areas that need improvement based on incorrect answers`;
  }

  async evaluateQuiz(quiz, responses) {
    try {
      logger.info(`Evaluating quiz: ${quiz.quiz_id} with ${responses.length} responses`);
      
      const prompt = this.generateEvaluationPrompt(quiz, responses);
      
      const messages = [
        {
          role: 'system',
          content: 'You are an expert educator and evaluator. Provide fair, accurate, and constructive feedback. Always respond with valid JSON only, no additional text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const response = await this.makeRequest(messages, 0.3, 2000);
      
      // Parse and validate the response
      let evaluationData;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in evaluation response');
        }
        
        evaluationData = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        logger.error('Failed to parse evaluation response:', parseError);
        
        // Fallback to manual evaluation
        return this.fallbackEvaluation(quiz, responses);
      }

      // Validate evaluation structure
      if (!evaluationData.detailedResults || !Array.isArray(evaluationData.detailedResults)) {
        throw new Error('Invalid evaluation structure');
      }

      // Ensure we have results for all questions
      const questionIds = quiz.questions.map(q => q.questionId);
      const resultIds = evaluationData.detailedResults.map(r => r.questionId);
      
      if (questionIds.length !== resultIds.length) {
        logger.warn('Mismatch in question count, using fallback evaluation');
        return this.fallbackEvaluation(quiz, responses);
      }

      logger.info(`Successfully evaluated quiz: ${evaluationData.totalScore}/${evaluationData.maxScore}`);
      return evaluationData;
    } catch (error) {
      logger.error('Quiz evaluation failed, using fallback:', error);
      return this.fallbackEvaluation(quiz, responses);
    }
  }

  fallbackEvaluation(quiz, responses) {
    logger.info('Using fallback evaluation method');
    
    let totalScore = 0;
    const detailedResults = [];

    quiz.questions.forEach(question => {
      const userResponse = responses.find(r => r.questionId === question.questionId);
      const isCorrect = userResponse && userResponse.userResponse === question.correctAnswer;
      const marks = isCorrect ? question.marks : 0;
      
      totalScore += marks;

      detailedResults.push({
        questionId: question.questionId,
        userResponse: userResponse ? userResponse.userResponse : null,
        correctAnswer: question.correctAnswer,
        isCorrect,
        marks,
        explanation: isCorrect 
          ? 'Correct! Well done.' 
          : `Incorrect. The correct answer is ${question.correctAnswer}. ${question.explanation || ''}`
      });
    });

    const percentage = (totalScore / quiz.max_score) * 100;
    
    // Generate basic suggestions
    const incorrectCount = detailedResults.filter(r => !r.isCorrect).length;
    const suggestions = [];
    
    if (incorrectCount === 0) {
      suggestions.push('Excellent work! You got all questions correct.');
    } else if (percentage >= 80) {
      suggestions.push('Great job! Review the questions you missed to strengthen your understanding.');
    } else if (percentage >= 60) {
      suggestions.push(`Good effort! Focus on reviewing ${quiz.subject} concepts to improve your score.`);
    } else {
      suggestions.push(`Keep practicing! Consider reviewing the fundamentals of ${quiz.subject}.`);
      suggestions.push('Try studying with additional resources or ask for help with challenging topics.');
    }

    return {
      totalScore,
      maxScore: quiz.max_score,
      percentage: Math.round(percentage * 100) / 100,
      detailedResults,
      suggestions
    };
  }

  async generateHint(question, quiz) {
    try {
      logger.info(`Generating hint for question: ${question.questionId}`);
      
      // Check cache first
      const cacheKey = `hint:${quiz.quiz_id}:${question.questionId}`;
      const cachedHint = await cache.getHint(quiz.quiz_id, question.questionId);
      
      if (cachedHint) {
        logger.info('Returning cached hint');
        return cachedHint;
      }

      const prompt = `Generate a helpful hint for this quiz question without giving away the answer:

Question: ${question.question}
Options: ${question.options.map((opt, i) => `${String.fromCharCode(65 + i)}: ${opt}`).join(', ')}
Subject: ${quiz.subject}
Grade: ${quiz.grade}
Difficulty: ${quiz.difficulty}

Requirements:
- Don't reveal the correct answer directly
- Give a strategic approach or thinking method
- Make it age-appropriate for grade ${quiz.grade}
- Keep it concise (1-2 sentences)
- Help guide their thinking process

Generate only the hint text, no additional formatting:`;

      const messages = [
        {
          role: 'system',
          content: 'You are a helpful tutor. Provide hints that guide students to think through problems without giving away answers.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const response = await this.makeRequest(messages, 0.7, 200);
      
      // Clean up the response
      const hint = response.trim().replace(/^["']|["']$/g, '');
      
      // Cache the hint for 24 hours
      await cache.setHint(quiz.quiz_id, question.questionId, hint);
      
      logger.info('Successfully generated hint');
      return hint;
    } catch (error) {
      logger.error('Hint generation failed:', error);
      
      // Fallback hint
      return `Think carefully about the key concepts related to ${quiz.subject} for grade ${quiz.grade}. Consider each option and eliminate the ones that don't make sense.`;
    }
  }

  async testConnection() {
    try {
      if (!this.apiKey) {
        return { success: false, message: 'API key not configured' };
      }

      const messages = [
        {
          role: 'user',
          content: 'Respond with "OK" if you can read this message.'
        }
      ];

      const response = await this.makeRequest(messages, 0, 10);
      
      return { 
        success: true, 
        message: 'AI service connection successful',
        model: this.model,
        response: response.trim()
      };
    } catch (error) {
      return { 
        success: false, 
        message: error.message,
        error: error.response?.data || error.message
      };
    }
  }
}

module.exports = new AIService();
