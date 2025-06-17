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

  // Mock data for testing when API key is not available
  getMockQuizData(grade, subject, numQuestions, difficulty) {
    const questions = [];
    
    for (let i = 1; i <= numQuestions; i++) {
      questions.push({
        questionId: `q${i}`,
        question: `Sample ${subject} question ${i} for grade ${grade} (${difficulty} level)`,
        type: 'multiple_choice',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'A',
        marks: 2,
        explanation: `This is a sample explanation for question ${i}`
      });
    }
    
    return {
      questions,
      metadata: {
        subject,
        grade,
        difficulty,
        totalQuestions: numQuestions,
        estimatedTime: numQuestions * 2,
        topics: ['sample topic 1', 'sample topic 2']
      }
    };
  }

  async makeRequest(messages, temperature = 0.7, maxTokens = 2000) {
    if (!this.apiKey) {
      logger.warn('AI service not configured - using mock data for testing');
      return null; // Will trigger mock mode in generateQuiz
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
      if (!this.genAI) {
        logger.error('Gemini API not initialized - GEMINI_API_KEY may be missing');
        return null;
      }
      
      logger.info(`Making Gemini API request with model ${this.model}, temperature ${temperature}, maxTokens ${maxTokens}`);
      
      const model = this.genAI.getGenerativeModel({ 
        model: this.model,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        }
      });

      // Convert messages to Gemini format
      const prompt = messages.map(msg => msg.content).join('\n\n');
      logger.info('Sending prompt to Gemini API');
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      logger.info('Received response from Gemini API');
      
      return response.text();
    } catch (error) {
      logger.error('Gemini API request failed:', error.message);
      
      // Log all error details
      logger.error('Gemini API error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        details: error.details,
      });
      
      if (error.message?.includes('API_KEY_INVALID')) {
        throw new Error('Invalid Gemini API key - please check your GEMINI_API_KEY environment variable');
      } else if (error.message?.includes('RATE_LIMIT_EXCEEDED')) {
        throw new Error('Gemini API rate limit exceeded - please try again later');
      } else if (error.message?.includes('SERVICE_UNAVAILABLE')) {
        throw new Error('Gemini service temporarily unavailable - please try again later');
      } else {
        throw new Error(`Gemini request failed: ${error.message}`);
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
      // Validate inputs
      if (!grade || !subject || !totalQuestions || !difficulty) {
        logger.error('Missing required parameters for quiz generation', { grade, subject, totalQuestions, difficulty });
        throw new Error('Missing required parameters for quiz generation');
      }
        // Normalize difficulty to uppercase 
      let normalizedDifficulty = difficulty.toUpperCase();
      
      // Validate difficulty level
      if (!['EASY', 'MEDIUM', 'HARD'].includes(normalizedDifficulty)) {
        logger.warn(`Invalid difficulty "${difficulty}" - defaulting to "MEDIUM"`);
        normalizedDifficulty = 'MEDIUM';
      }
      
      logger.info(`Generating ${normalizedDifficulty} quiz: Grade ${grade} ${subject}, ${totalQuestions} questions`);
      
      // Check cache first
      const cacheKey = `generated_quiz:${grade}:${subject}:${totalQuestions}:${maxScore}:${normalizedDifficulty}`;
      const cachedQuiz = await cache.get(cacheKey);
      
      if (cachedQuiz) {
        logger.info('Returning cached quiz');
        return cachedQuiz;
      }

      const prompt = this.generateQuizPrompt(grade, subject, totalQuestions, maxScore, normalizedDifficulty);
      logger.debug('Generated quiz prompt', { prompt });
      
      const messages = [
        {
          role: 'system',
          content: 'You are an expert educational content creator. Generate high-quality, curriculum-appropriate quiz questions. Always respond with valid JSON only, no additional text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];      logger.info('Sending request to AI service...');
      const response = await this.makeRequest(messages, 0.8, 3000);
      logger.info('Received response from AI service');
      
      // If makeRequest returns null (no API key), use mock data
      if (!response) {
        logger.info('No response from AI service - using mock quiz data');
        const mockData = this.getMockQuizData(grade, subject, totalQuestions, normalizedDifficulty);
        await cache.set(cacheKey, mockData, 3600);
        return mockData;
      }
      
      // Log the response length for debugging
      logger.info(`AI service returned a response of ${response.length} characters`);
      
      // Parse and validate the response
      let quizData;
      try {
        // Clean the response in case there's extra text
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          logger.error('Response does not contain valid JSON', { response });
          throw new Error('No JSON found in response');
        }
        
        const extractedJson = jsonMatch[0];
        logger.info(`Extracted JSON of length ${extractedJson.length}`);
        
        quizData = JSON.parse(extractedJson);
        logger.info('Successfully parsed response JSON');
      } catch (parseError) {
        logger.error('Failed to parse AI response:', parseError);
        logger.error('Raw response:', { response });
        throw new Error(`Invalid response format from AI service: ${parseError.message}`);
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
      return result;    } catch (error) {
      logger.error('Quiz generation failed:', error);
      logger.error('Error details:', { 
        message: error.message, 
        stack: error.stack,
        grade, 
        subject, 
        totalQuestions, 
        maxScore, 
        difficulty
      });
      
      // Fall back to mock data for testing/demo purposes
      if (error.message.includes('Gemini request failed') || 
          error.message.includes('AI service not configured') ||
          error.message.includes('Invalid response format') ||
          error.message.includes('API_KEY_INVALID')) {
          
        logger.warn('Falling back to mock quiz data due to AI service error');
        const mockData = this.getMockQuizData(grade, subject, totalQuestions, difficulty);
        
        // Cache the mock result briefly
        const cacheKey = `generated_quiz:${grade}:${subject}:${totalQuestions}:${maxScore}:${difficulty}`;
        await cache.set(cacheKey, mockData, 300); // 5 minutes cache for mock data
        
        return mockData;
      }
      
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
      // Make sure quiz.questions is parsed if it's a string
      if (typeof quiz.questions === 'string') {
        try {
          quiz.questions = JSON.parse(quiz.questions);
          logger.info('Parsed questions from string in evaluateQuiz');
        } catch (parseError) {
          logger.error('Failed to parse questions in evaluateQuiz:', parseError);
          quiz.questions = [];
        }
      }
      
      // Ensure questions is always an array
      if (!Array.isArray(quiz.questions)) {
        logger.warn('Quiz questions is not an array, using empty array');
        quiz.questions = [];
      }

      logger.info(`Evaluating quiz: ${quiz.quiz_id} with ${responses.length} responses and ${quiz.questions.length} questions`);
      
      // Check if we have any questions to evaluate
      if (quiz.questions.length === 0) {
        logger.error('No questions found in quiz object, cannot evaluate');
        return {
          totalScore: 0,
          maxScore: quiz.max_score || 0,
          percentage: 0,
          detailedResults: [],
          suggestions: ['Unable to evaluate quiz - no questions found.']
        };
      }

      // Log some data to understand the state
      logger.info('First question:', JSON.stringify(quiz.questions[0], null, 2));
      logger.info('First response:', JSON.stringify(responses[0], null, 2));
      
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
        logger.info('Successfully parsed AI evaluation response');
      } catch (parseError) {
        logger.error('Failed to parse evaluation response:', parseError);
        
        // Fallback to manual evaluation
        return this.fallbackEvaluation(quiz, responses);
      }

      // Validate evaluation structure
      if (!evaluationData.detailedResults || !Array.isArray(evaluationData.detailedResults)) {
        logger.error('Invalid evaluation structure, missing detailedResults array');
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
    
    // Ensure quiz questions is an array
    if (!Array.isArray(quiz.questions)) {
      logger.warn('Quiz questions is not an array in fallbackEvaluation');
      quiz.questions = [];
    }
    
    // If no questions available, return empty evaluation
    if (quiz.questions.length === 0) {
      logger.error('No questions found in quiz for fallback evaluation');
      return {
        totalScore: 0,
        maxScore: quiz.max_score || 10,
        percentage: 0,
        detailedResults: [],
        suggestions: ['Unable to evaluate quiz - no questions found.']
      };
    }
    
    let totalScore = 0;
    const detailedResults = [];

    quiz.questions.forEach(question => {
      // Ensure question has required fields
      if (!question || !question.questionId || !question.correctAnswer) {
        logger.warn(`Incomplete question data: ${JSON.stringify(question)}`);
        return; // Skip this question
      }
      
      const userResponse = responses.find(r => r.questionId === question.questionId);
      const isCorrect = userResponse && userResponse.userResponse === question.correctAnswer;
      const marks = isCorrect ? (question.marks || 1) : 0; // Default to 1 mark if not specified
      
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

    const maxScore = quiz.max_score || detailedResults.reduce((total, detail) => total + (detail.marks || 1), 0);
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    
    // Generate basic suggestions
    const incorrectCount = detailedResults.filter(r => !r.isCorrect).length;
    const suggestions = [];
    
    if (incorrectCount === 0 && detailedResults.length > 0) {
      suggestions.push('Excellent work! You got all questions correct.');
    } else if (percentage >= 80) {
      suggestions.push('Great job! Review the questions you missed to strengthen your understanding.');
    } else if (percentage >= 60) {
      suggestions.push(`Good effort! Focus on reviewing ${quiz.subject} concepts to improve your score.`);
    } else {
      suggestions.push(`Keep practicing! Consider reviewing the fundamentals of ${quiz.subject || 'this topic'}.`);
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
