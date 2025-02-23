import OpenAI from 'openai';
import pLimit from 'p-limit';
import { supabase } from './supabase';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

// Rate limiting: 1 request at a time with exponential backoff
const limit = pLimit(1);
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000;

// Function to split text into chunks
function splitIntoChunks(text: string, maxLength: number = 4000): string[] {
  const chunks: string[] = [];
  let currentChunk = '';
  
  // Split by paragraphs first
  const paragraphs = text.split('\n\n');
  
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxLength) {
      chunks.push(currentChunk);
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

// Assignment type definitions
export type AssignmentType = 'multiple_choice' | 'single_choice';

interface AssignmentPrompt {
  type: AssignmentType;
  materials: {
    title: string;
    content: string;
    summary?: string;
  }[];
  customInstructions?: string;
}

// Function to generate system prompt based on assignment type
function getSystemPrompt(type: AssignmentType): string {
  const basePrompt = `You are an expert educational content creator specializing in creating high-quality academic assignments.
Your task is to create a comprehensive assignment based on the provided course materials.
Focus on testing deep understanding and critical thinking rather than mere memorization.`;

  const typeSpecificPrompts = {
    multiple_choice: `Create a multiple-choice quiz with challenging questions that test conceptual understanding.
Each question should have 4 options with one correct answer.
Questions should vary in difficulty and cover different aspects of the material.
Each question must have exactly 4 options and one correct answer.`,

    single_choice: `Create a single-choice quiz with challenging questions that test conceptual understanding.
Each question should have 4 options with one correct answer.
Questions should vary in difficulty and cover different aspects of the material.
Each question must have exactly 4 options and one correct answer.`
  };

  return `${basePrompt}\n\n${typeSpecificPrompts[type]}`;
}

// Function to format materials for the prompt
function formatMaterialsPrompt(materials: AssignmentPrompt['materials']): string {
  // Only include essential content and summaries
  return materials.map(material => {
    const content = material.content.length > 8000 ? 
      material.content.substring(0, 8000) + '...' : 
      material.content;
      
    return `
Title: ${material.title}
${material.summary ? `Summary: ${material.summary}\n` : ''}
Content: ${content}
`;
  }).join('\n---\n');
}

// Main function to generate assignment using OpenAI
export async function generateAssignment(prompt: AssignmentPrompt) {
  return limit(async () => {
    try {
      const systemPrompt = getSystemPrompt(prompt.type);
      const materialsPrompt = formatMaterialsPrompt(prompt.materials);
      const userPrompt = `
Course Materials:
${materialsPrompt}

${prompt.customInstructions ? `Additional Instructions: ${prompt.customInstructions}` : ''}

Create a ${prompt.type} assignment based on these materials.
Include a title, description, learning objectives, and all necessary components.
Include questions, options, and correct answers.
Each question must have exactly 4 options and one correct answer.
Format the response as a JSON object with the following structure:
{
  "title": "Assignment Title",
  "description": "Assignment Description",
  "points": 10,
  "dueDate": "2025-03-01T23:59:59Z",
  "questions": [
    {
      "question": "Question text",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": 0
    }
  ]
}`;

      let attempt = 0;
      let lastError: Error | null = null;

      while (attempt < MAX_RETRIES) {
        try {
          // Add exponential backoff delay
          if (attempt > 0) {
            const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 4000,
            response_format: { type: "json_object" }
          });

          const response = completion.choices[0].message.content;
          if (!response) throw new Error('No response from OpenAI');

          // Parse and validate the response
          const assignment = JSON.parse(response);
          validateAssignment(assignment, prompt.type);

          return assignment;
        } catch (error) {
          lastError = error as Error;
          if (error instanceof OpenAI.APIError) {
            if (error.status === 429) {
              attempt++;
              continue;
            }
          }
          throw error;
        }
      }

      throw lastError || new Error('Failed to generate assignment after retries');

    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        console.error('OpenAI API Error:', error);
        switch (error.status) {
          case 429:
            throw new Error('Rate limit exceeded. Please try again in a few minutes.');
          case 400:
            throw new Error('Invalid request. Please check your inputs and try again.');
          case 401:
            throw new Error('Authentication error. Please check your API key.');
          case 500:
          case 502:
          case 503:
          case 504:
            throw new Error('OpenAI service is temporarily unavailable. Please try again later.');
          default:
            throw new Error('An error occurred while generating the assignment. Please try again.');
        }
      }
      throw error;
    }
  });
}

// Validate the generated assignment structure
function validateAssignment(assignment: any, type: AssignmentType) {
  const requiredFields = ['title', 'description', 'points', 'dueDate'];
  for (const field of requiredFields) {
    if (!assignment[field]) {
      throw new Error(`Invalid assignment: missing ${field}`);
    }
  }
  
  if (!Array.isArray(assignment.questions) || assignment.questions.length === 0) {
    throw new Error('Invalid assignment: missing or invalid questions');
  }

  for (const question of assignment.questions) {
    if (!question.question || !Array.isArray(question.options) || 
        question.options.length !== 4 || typeof question.correctAnswer !== 'number' ||
        question.correctAnswer < 0 || question.correctAnswer > 3) {
      throw new Error('Invalid assignment: malformed question structure');
    }
  }
}

// Function to analyze assignment submission using OpenAI
export async function analyzeSubmission(submissionId: string) {
  try {
    // Get submission details
    const { data: submission } = await supabase
      .from('assignment_submissions')
      .select(`
        *,
        assignment:assignments (
          title,
          description,
          content,
          learning_objectives,
          topic_mapping
        )
      `)
      .eq('id', submissionId)
      .single();

    if (!submission) throw new Error('Submission not found');

    // Prepare analysis context
    const analysisContext = {
      assignment: {
        title: submission.assignment.title,
        description: submission.assignment.description,
        objectives: submission.assignment.learning_objectives,
        questions: submission.assignment.content.questions,
      },
      submission: {
        answers: submission.answers,
        score: submission.score,
        timeSpent: submission.time_spent,
      }
    };

    // Generate analysis using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are an expert educational analyst. Analyze this assignment submission and provide detailed insights.
Focus on:
1. Performance analysis by topic
2. Strengths and areas for improvement
3. Specific recommendations for improvement
4. Learning patterns and study strategies
5. Next steps and resources

Format the response as a JSON object with the following structure:
{
  "performance_summary": "Overall analysis of performance",
  "topics_mastered": ["List of mastered topics"],
  "topics_to_review": ["List of topics needing review"],
  "detailed_analysis": {
    "strengths": ["List of specific strengths"],
    "weaknesses": ["List of specific areas to improve"],
    "patterns": ["Observed learning patterns"]
  },
  "recommendations": ["Specific actionable recommendations"],
  "study_strategies": ["Suggested study strategies"],
  "resources": ["Recommended learning resources"],
  "next_steps": ["Prioritized action items"]
}`
        },
        {
          role: "user",
          content: JSON.stringify(analysisContext)
        }
      ],
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(completion.choices[0].message.content);

    // Update submission with analysis
    await supabase
      .from('assignment_submissions')
      .update({ analysis })
      .eq('id', submissionId);

    return analysis;
  } catch (error) {
    console.error('Error analyzing submission:', error);
    throw error;
  }
}
// Function to generate course-specific answers
export async function generateCourseAnswer({
  question,
  courseId
}: {
  question: string;
  courseId: string;
}) {
  return limit(async () => {
    try {
      // Get course materials from database
      const { data: materials, error } = await supabase
        .from('course_materials')
        .select('id, title, content, content_type')
        .eq('course_id', courseId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!materials?.length) {
        return {
          answer: "I don't have access to any course materials yet. Please wait for the professor to upload some materials.",
          references: []
        };
      }

      // Prepare context from materials
      const context = materials
        .filter(m => m.content || m.content_type === 'file')
        .map(m => `
Title: ${m.title}
Content Type: ${m.content_type}
${m.content_type === 'file' ? 'File Content:' : 'Content:'}
${m.content || ''}
`)
        .join('\n\n');

      const systemPrompt = `
Course Materials:
${context}
      
You are an expert AI teaching assistant for this course.
Your primary role is to help students understand the course materials and concepts.

Guidelines:
1. Base your answers STRICTLY on the provided course materials
2. If information isn't in the materials, say "I cannot find this information in the course materials"
3. Cite specific materials used in your answers
4. Explain concepts clearly and provide examples from the materials
5. If a concept appears in multiple materials, synthesize the information
6. Encourage critical thinking by guiding students rather than giving direct answers
7. Maintain an educational, supportive, and professional tone
8. When citing materials, use their titles in your response
9. If you need to reference specific parts of the materials, quote them directly
10. For mathematical or technical concepts, break them down step by step

Remember: Your knowledge is limited to ONLY what's in the course materials.
If a student asks about something not covered in the materials, politely explain that you can only assist with topics from the course content.`;

      const userPrompt = `Question: ${question}

Please provide a comprehensive answer based solely on the course materials.
Make sure to:
1. Cite specific materials you're referencing
2. Quote relevant passages when appropriate
3. Explain concepts step by step
4. If the question cannot be answered using the materials, clearly state that
5. Suggest related topics from the materials that might be helpful`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.5,
        max_tokens: 2000
      });

      const answer = completion.choices[0].message.content;
      if (!answer) throw new Error('No response from OpenAI');

      // Find referenced materials by checking for title mentions
      const references = materials
        .filter(m => answer.toLowerCase().includes(m.title.toLowerCase()))
        .map(m => ({
          id: m.id,
          title: m.title,
          content: m.content || ''
        }));

      return {
        answer,
        references
      };

    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        console.error('OpenAI API Error:', error);
        throw new Error('I encountered an error while processing your question. Please try asking again or rephrase your question.');
      }
      throw error;
    }
  });
}