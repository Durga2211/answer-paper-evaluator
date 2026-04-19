/**
 * Service to handle inference using Ollama and the configured model.
 * Uses environment variables for URL and model configuration.
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:4b';

const evaluateFullPaper = async (studentText, questionPaper, modelAnswers) => {
    const prompt = `You are a STRICT university exam evaluator.

INPUT:

Question Paper:
${questionPaper}

Model Answers:
${modelAnswers}

Student Answer Sheet:
${studentText}

--------------------------------------------------

RULES:

1. Evaluate ALL questions
2. Match answers correctly
3. Missing answer -> 0 marks
4. Be STRICT
5. Do NOT hallucinate answers

--------------------------------------------------

STEP 1: IDENTIFY QUESTIONS

- Detect Q1, Q2, etc.
- Match student answers to them
- If missing -> mark NOT ATTEMPTED

--------------------------------------------------

STEP 2: EVALUATE EACH QUESTION

Create marking scheme dynamically

Example:
Q1 (6 marks):
- Concept: 2
- Logic: 2
- Steps: 1
- Final Answer: 1

--------------------------------------------------

STEP 3: STRICT MARKING

- Wrong logic -> 0
- Partial -> partial marks
- Missing -> 0

--------------------------------------------------

STEP 4: RESPONSE FORMAT (JSON)

Return ONLY valid JSON matching exactly this schema:
{
  "totalMarks": 0,
  "maxMarks": 0,
  "percentage": 0,
  "questions": [
    {
      "question": "Q1",
      "marks": 0,
      "maxMarks": 6,
      "feedback": "short explanation"
    }
  ],
  "strengths": ["string"],
  "weaknesses": ["string"]
}

Ensure the response is valid, parsable JSON without markdown wrapping.`;

    try {
        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: prompt,
                stream: false,
                format: 'json'
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama Server returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        let text = data.response.trim();
        
        const parsedData = JSON.parse(text);
        
        // Safety bound marks just in case LLM hallucinates over bounds
        if (parsedData.questions && Array.isArray(parsedData.questions)) {
             parsedData.questions.forEach(q => {
                 q.marks = Math.max(0, Math.min(parseFloat(q.marks) || 0, parseFloat(q.maxMarks) || 0));
             });
        }
        
        return parsedData;

    } catch (error) {
        console.error('[Gemma] ❌ Local inference failed:', error.message);
        
        return {
            totalMarks: 0,
            maxMarks: 100,
            percentage: 0,
            questions: [],
            strengths: [],
            weaknesses: [`System framework failed during AI processing. Error: ${error.message}`]
        };
    }
};

const generateModelAnswer = async (questionText) => {
    const prompt = `You are a strict, highly knowledgeable engineering examiner.
Generate the ideal model answer for the following question. The output should be a clear, concise, logically structured set of key points and correct concepts that a student must cover to get full marks.

Question:
${questionText}

--------------------------------------------------
📦 OUTPUT FORMAT
--------------------------------------------------
Return ONLY the raw model answer text. Do NOT wrap it in JSON. Do NOT output markdown code blocks unless necessary for the answer itself. Be direct and concise.`;

    try {
        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: prompt,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama Server returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data.response.trim();

    } catch (error) {
        console.error('[Gemma] ❌ Local inference failed during model answer generation:', error.message);
        throw error;
    }
};

/**
 * Evaluate a single question's student answer against the model answer.
 * Used in the question-wise upload pipeline for more accurate per-question grading.
 * Supports sub-questions: if subQuestions are provided, they are included in the prompt.
 */
const evaluateSingleQuestion = async (studentText, questionLabel, questionText, modelAnswer, maxMarks, subQuestions) => {
    let subQBlock = '';
    if (subQuestions && subQuestions.length > 0) {
        subQBlock = '\nSub-Questions:\n';
        subQuestions.forEach(sq => {
            subQBlock += `  ${questionLabel}.${sq.subQuestionLabel} (${sq.maxMarks} marks): ${sq.questionText}\n`;
            subQBlock += `    Model Answer: ${sq.modelAnswer}\n`;
        });
    }

    const prompt = `You are a STRICT university exam evaluator. Evaluate ONE question only.

Question: ${questionLabel} (${maxMarks} marks)
${questionText}
${subQBlock}
Model Answer:
${modelAnswer}

Student's Answer:
${studentText}

--------------------------------------------------

RULES:
1. Be STRICT. Only award marks for correct, relevant content.
2. If the answer is blank or completely irrelevant → 0 marks.
3. Do NOT hallucinate — only mark based on what the student actually wrote.
4. Partial credit is allowed for partially correct answers.
${subQuestions && subQuestions.length > 0 ? '5. Evaluate EACH sub-question separately and provide marks for each.' : ''}

--------------------------------------------------

RESPONSE FORMAT (JSON):

${subQuestions && subQuestions.length > 0 ? `Return ONLY valid JSON matching exactly this schema:
{
  "question": "${questionLabel}",
  "marks": <total marks for this question>,
  "maxMarks": ${maxMarks},
  "feedback": "overall feedback for the whole question",
  "subQuestions": [
    {
      "question": "${questionLabel}.a",
      "marks": 0,
      "maxMarks": 0,
      "feedback": "feedback for this sub-question"
    }
  ]
}` : `Return ONLY valid JSON matching exactly this schema:
{
  "question": "${questionLabel}",
  "marks": 0,
  "maxMarks": ${maxMarks},
  "feedback": "short explanation of marking"
}`}

Ensure the response is valid, parsable JSON without markdown wrapping.`;

    try {
        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: prompt,
                stream: false,
                format: 'json'
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama Server returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        let text = data.response.trim();
        const parsedData = JSON.parse(text);

        // Safety bound marks
        parsedData.marks = Math.max(0, Math.min(parseFloat(parsedData.marks) || 0, maxMarks));

        if (parsedData.subQuestions && Array.isArray(parsedData.subQuestions)) {
            parsedData.subQuestions.forEach(sq => {
                sq.marks = Math.max(0, Math.min(parseFloat(sq.marks) || 0, parseFloat(sq.maxMarks) || 0));
            });
        }

        return parsedData;

    } catch (error) {
        console.error(`[Gemma] ❌ Single question evaluation failed for ${questionLabel}:`, error.message);
        return {
            question: questionLabel,
            marks: 0,
            maxMarks: maxMarks,
            feedback: `Evaluation failed: ${error.message}`,
            subQuestions: subQuestions ? subQuestions.map(sq => ({
                question: `${questionLabel}.${sq.subQuestionLabel}`,
                marks: 0,
                maxMarks: sq.maxMarks,
                feedback: 'Evaluation failed'
            })) : undefined
        };
    }
};

module.exports = {
    evaluateFullPaper,
    generateModelAnswer,
    evaluateSingleQuestion
};

