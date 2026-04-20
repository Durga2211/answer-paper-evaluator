const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

const { extractTextFromImages } = require('../services/ocrService');
const { evaluateFullPaper, evaluateSingleQuestion } = require('../services/gemmaService');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({ storage });
const EXAMS_FILE = path.join(__dirname, '../data/exams.json');
const RESULTS_DIR = path.join(__dirname, '../data/results');

/**
 * POST /api/uploads
 * 
 * New question-wise upload flow:
 * - Receives files tagged with question numbers via field names like `question_1`, `question_2`, etc.
 * - Also accepts legacy `papers` field for backward compatibility (falls back to full-paper evaluation).
 * - req.body.usn — student ID
 * - req.body.examId — exam config ID
 * - req.body.questionMapping — JSON string mapping question numbers to their file field names
 *   e.g. '{"1": "question_1", "2": "question_2"}'
 */
router.post('/', upload.any(), async (req, res) => {
    const { usn, examId, questionMapping: questionMappingStr } = req.body;
    const files = req.files;

    if (!files || files.length === 0 || !usn || !examId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const exams = await fs.readJson(EXAMS_FILE);
        const examConfig = exams.find(e => e.examId === examId);

        if (!examConfig) {
            return res.status(404).json({ error: 'Exam configuration not found.' });
        }

        const questions = examConfig.questions || [];
        const pageImages = files.map(f => f.filename);

        // Check if question-wise mapping is provided
        if (questionMappingStr) {
            // ==========================================
            // NEW: Question-wise evaluation pipeline
            // ==========================================
            const questionMapping = JSON.parse(questionMappingStr);
            console.log("========== QUESTION-WISE EVALUATION ==========");

            const evaluationResults = [];
            let totalMarks = 0;
            let maxMarksTotal = 0;
            const allStrengths = [];
            const allWeaknesses = [];
            const ocrTexts = {};

            for (const question of questions) {
                const qNum = normaliseQNum(question);
                const fieldName = questionMapping[qNum];

                // Get files for this question
                const questionFiles = files.filter(f => f.fieldname === fieldName);

                if (!questionFiles || questionFiles.length === 0) {
                    // No files uploaded for this question — mark as not attempted
                    const maxMarks = computeMaxMarks(question);
                    evaluationResults.push({
                        question: `Q${qNum}`,
                        marks: 0,
                        maxMarks: maxMarks,
                        feedback: 'Not attempted — no answer pages uploaded for this question.',
                        subQuestions: question.subQuestions ? question.subQuestions.map(sq => ({
                            question: `Q${qNum}.${sq.subQuestionLabel || sq.questionNumber}`,
                            marks: 0,
                            maxMarks: parseFloat(sq.maxMarks) || 5,
                            feedback: 'Not attempted'
                        })) : undefined
                    });
                    maxMarksTotal += maxMarks;
                    continue;
                }

                // OCR this question's images
                const imagePaths = questionFiles.map(f => f.path);
                const studentText = await extractTextFromImages(imagePaths);
                ocrTexts[`Q${qNum}`] = studentText;

                console.log(`\n----- Q${qNum} Student Text (${studentText.length} chars) -----`);
                console.log(studentText.substring(0, 200) + (studentText.length > 200 ? '...' : ''));

                const questionText = question.questionText || question.title || '';
                const maxMarks = computeMaxMarks(question);

                // Build sub-questions array if present
                const subQuestions = question.subQuestions && question.subQuestions.length > 0
                    ? question.subQuestions.map(sq => ({
                        subQuestionLabel: sq.subQuestionLabel || sq.questionNumber || 'a',
                        questionText: sq.questionText || '',
                        modelAnswer: sq.modelAnswer || '',
                        maxMarks: parseFloat(sq.maxMarks) || 5
                    }))
                    : null;

                // Build model answer — combine parent-level + sub-question model answers
                let modelAnswer = question.modelAnswer || '';

                // If parent has no model answer but sub-questions do, combine them
                if (!modelAnswer && subQuestions && subQuestions.length > 0) {
                    const subAnswers = subQuestions
                        .filter(sq => sq.modelAnswer && sq.modelAnswer.trim())
                        .map(sq => `${sq.subQuestionLabel}) ${sq.modelAnswer}`)
                        .join('\n');
                    if (subAnswers) {
                        modelAnswer = subAnswers;
                    }
                }

                if (!modelAnswer || modelAnswer.trim().length === 0) {
                    console.warn(`[Upload] ⚠️ Q${qNum}: No model answer found — evaluation may be inaccurate.`);
                    modelAnswer = 'No model answer provided. Evaluate based on general correctness and completeness.';
                } else {
                    console.log(`[Upload] Q${qNum} Model Answer: ${modelAnswer.substring(0, 100)}${modelAnswer.length > 100 ? '...' : ''}`);
                }

                // Evaluate this question individually
                const qResult = await evaluateSingleQuestion(
                    studentText,
                    `Q${qNum}`,
                    questionText,
                    modelAnswer,
                    maxMarks,
                    subQuestions
                );

                evaluationResults.push(qResult);
                totalMarks += parseFloat(qResult.marks) || 0;
                maxMarksTotal += maxMarks;
            }

            const percentage = maxMarksTotal > 0 ? Math.round((totalMarks / maxMarksTotal) * 100) : 0;

            // Aggregate strengths and weaknesses from individual evaluations
            evaluationResults.forEach(q => {
                if (q.marks >= (q.maxMarks * 0.8)) {
                    allStrengths.push(`${q.question}: ${q.feedback}`);
                } else if (q.marks <= (q.maxMarks * 0.3)) {
                    allWeaknesses.push(`${q.question}: ${q.feedback}`);
                }
            });

            const result = {
                paperId: uuidv4(),
                examId,
                studentId: usn,
                pageImages,
                ocrTexts,

                evaluation: evaluationResults,
                totalMarks: totalMarks,
                maxMarks: maxMarksTotal,
                percentage: percentage,
                strengths: allStrengths.length > 0 ? allStrengths : ['No distinct strengths identified.'],
                weaknesses: allWeaknesses.length > 0 ? allWeaknesses : ['No distinct weaknesses identified.'],

                submittedAt: new Date().toISOString(),
                status: 'graded',
                evaluationMode: 'question-wise'
            };

            const resultFile = path.join(RESULTS_DIR, `${result.paperId}.json`);
            await fs.ensureDir(RESULTS_DIR);
            await fs.writeJson(resultFile, result, { spaces: 2 });

            return res.json(result);

        } else {
            // ==========================================
            // LEGACY: Full-paper evaluation pipeline
            // ==========================================
            const imagePaths = files.map(f => f.path);

            const extractedText = await extractTextFromImages(imagePaths);

            console.log("========== FULL PAPER EVALUATION (LEGACY) ==========");
            console.log("\n----- Student Answer Sheet -----");
            console.log(extractedText);

            let questionPaperStr = '';
            let modelAnswersStr = '';

            questions.forEach(question => {
                const qNum = normaliseQNum(question);
                const questionText = question.questionText || question.title || '';
                const maxMarks = computeMaxMarks(question);
                const modelAnswer = question.modelAnswer || 'None provided';

                questionPaperStr += `Q${qNum} (${maxMarks} marks): ${questionText}\n`;
                modelAnswersStr += `Q${qNum}: ${modelAnswer}\n`;

                // Include sub-questions in the paper string
                if (question.subQuestions && question.subQuestions.length > 0) {
                    question.subQuestions.forEach(sq => {
                        const sqLabel = sq.subQuestionLabel || sq.questionNumber || 'a';
                        questionPaperStr += `  Q${qNum}.${sqLabel} (${sq.maxMarks} marks): ${sq.questionText}\n`;
                        modelAnswersStr += `  Q${qNum}.${sqLabel}: ${sq.modelAnswer || 'None'}\n`;
                    });
                }
            });

            const aiResult = await evaluateFullPaper(extractedText, questionPaperStr, modelAnswersStr);

            const result = {
                paperId: uuidv4(),
                examId,
                studentId: usn,
                pageImages,
                ocrRawText: extractedText,

                evaluation: aiResult.questions || [],
                totalMarks: aiResult.totalMarks || 0,
                maxMarks: aiResult.maxMarks || 0,
                percentage: aiResult.percentage || 0,
                strengths: aiResult.strengths || [],
                weaknesses: aiResult.weaknesses || [],

                submittedAt: new Date().toISOString(),
                status: 'graded',
                evaluationMode: 'full-paper'
            };

            const resultFile = path.join(RESULTS_DIR, `${result.paperId}.json`);
            await fs.ensureDir(RESULTS_DIR);
            await fs.writeJson(resultFile, result, { spaces: 2 });

            return res.json(result);
        }

    } catch (error) {
        console.error('[Upload] ❌ Processing Error:', error);
        res.status(500).json({ error: 'Failed to process submission. Evaluation error.' });
    }
});

/**
 * Compute total maxMarks for a question, including sub-questions if present.
 */
function computeMaxMarks(question) {
    if (question.subQuestions && question.subQuestions.length > 0) {
        return question.subQuestions.reduce((sum, sq) => sum + (parseFloat(sq.maxMarks) || 0), 0);
    }
    return parseFloat(question.maxMarks) || 10;
}

function normaliseQNum(question) {
    return (question.questionNumber || question.qid || '1')
        .toString()
        .replace(/^Q/i, '')
        .replace(/\.$/, '')
        .trim();
}

module.exports = router;
