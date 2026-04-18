import React, { useState } from 'react';
import axios from 'axios';
import { Plus, Trash2, Save, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, Upload, X, Image as ImageIcon, ChevronDown, ChevronRight, Camera } from 'lucide-react';

function CreateExam() {
    const [formData, setFormData] = useState({
        examName: '',
        subjectCode: '',
        questions: [
            {
                questionNumber: '1',
                questionText: '',
                modelAnswer: '',
                maxMarks: 10,
                subQuestions: []
            }
        ]
    });
    const [loading, setLoading] = useState(false);
    const [generatingIndex, setGeneratingIndex] = useState(null);
    const [generatingSubIndex, setGeneratingSubIndex] = useState(null);
    const [ocrLoadingIndex, setOcrLoadingIndex] = useState(null);
    const [ocrLoadingSubIndex, setOcrLoadingSubIndex] = useState(null);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);
    const [expandedQuestions, setExpandedQuestions] = useState({ 0: true });

    // ─── Question Handlers ───

    const handleExamChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setSuccess(false);
    };

    const handleQuestionChange = (index, field, value) => {
        const updatedQuestions = [...formData.questions];
        updatedQuestions[index][field] = value;

        // Auto-compute maxMarks from sub-questions if they exist
        if (field !== 'maxMarks' && updatedQuestions[index].subQuestions.length > 0) {
            updatedQuestions[index].maxMarks = updatedQuestions[index].subQuestions.reduce(
                (sum, sq) => sum + (parseFloat(sq.maxMarks) || 0), 0
            );
        }

        setFormData({ ...formData, questions: updatedQuestions });
        setSuccess(false);
    };

    const addQuestion = () => {
        const newIndex = formData.questions.length;
        setFormData({
            ...formData,
            questions: [...formData.questions, {
                questionNumber: `${newIndex + 1}`,
                questionText: '',
                modelAnswer: '',
                maxMarks: 10,
                subQuestions: []
            }]
        });
        setExpandedQuestions(prev => ({ ...prev, [newIndex]: true }));
    };

    const removeQuestion = (index) => {
        if (formData.questions.length === 1) return;
        const updatedQuestions = formData.questions.filter((_, i) => i !== index);
        setFormData({ ...formData, questions: updatedQuestions });
    };

    const toggleQuestion = (index) => {
        setExpandedQuestions(prev => ({ ...prev, [index]: !prev[index] }));
    };

    // ─── Sub-question Handlers ───

    const addSubQuestion = (qIndex) => {
        const updatedQuestions = [...formData.questions];
        const subQ = updatedQuestions[qIndex].subQuestions;
        const label = String.fromCharCode(97 + subQ.length); // a, b, c, d...
        subQ.push({
            subQuestionLabel: label,
            questionText: '',
            modelAnswer: '',
            maxMarks: 5
        });

        // Recompute parent maxMarks
        updatedQuestions[qIndex].maxMarks = subQ.reduce((sum, sq) => sum + (parseFloat(sq.maxMarks) || 0), 0);
        setFormData({ ...formData, questions: updatedQuestions });
        setSuccess(false);
    };

    const removeSubQuestion = (qIndex, sqIndex) => {
        const updatedQuestions = [...formData.questions];
        updatedQuestions[qIndex].subQuestions.splice(sqIndex, 1);

        // Re-label remaining sub-questions
        updatedQuestions[qIndex].subQuestions.forEach((sq, i) => {
            sq.subQuestionLabel = String.fromCharCode(97 + i);
        });

        // Recompute parent maxMarks
        const subQ = updatedQuestions[qIndex].subQuestions;
        if (subQ.length > 0) {
            updatedQuestions[qIndex].maxMarks = subQ.reduce((sum, sq) => sum + (parseFloat(sq.maxMarks) || 0), 0);
        }

        setFormData({ ...formData, questions: updatedQuestions });
        setSuccess(false);
    };

    const handleSubQuestionChange = (qIndex, sqIndex, field, value) => {
        const updatedQuestions = [...formData.questions];
        updatedQuestions[qIndex].subQuestions[sqIndex][field] = value;

        // Recompute parent maxMarks when sub-question marks change
        if (field === 'maxMarks') {
            updatedQuestions[qIndex].maxMarks = updatedQuestions[qIndex].subQuestions.reduce(
                (sum, sq) => sum + (parseFloat(sq.maxMarks) || 0), 0
            );
        }

        setFormData({ ...formData, questions: updatedQuestions });
        setSuccess(false);
    };

    // ─── AI Generate Model Answer ───

    const generateModelAnswer = async (index, questionText) => {
        if (!questionText) {
            setError('Please enter a question text first to generate a model answer.');
            return;
        }
        setGeneratingIndex(index);
        setError(null);
        try {
            const response = await axios.post('/api/generate/model-answer', { questionText });
            if (response.data.modelAnswer) {
                handleQuestionChange(index, 'modelAnswer', response.data.modelAnswer);
            }
        } catch (err) {
            setError('Failed to generate model answer via AI.');
        } finally {
            setGeneratingIndex(null);
        }
    };

    const generateSubModelAnswer = async (qIndex, sqIndex, questionText) => {
        if (!questionText) {
            setError('Please enter a sub-question text first.');
            return;
        }
        setGeneratingSubIndex(`${qIndex}-${sqIndex}`);
        setError(null);
        try {
            const response = await axios.post('/api/generate/model-answer', { questionText });
            if (response.data.modelAnswer) {
                handleSubQuestionChange(qIndex, sqIndex, 'modelAnswer', response.data.modelAnswer);
            }
        } catch (err) {
            setError('Failed to generate sub-question model answer via AI.');
        } finally {
            setGeneratingSubIndex(null);
        }
    };

    // ─── Model Answer Image Upload (OCR) ───

    const handleModelAnswerUpload = async (qIndex, files) => {
        if (!files || files.length === 0) return;

        setOcrLoadingIndex(qIndex);
        setError(null);

        const formDataUpload = new FormData();
        Array.from(files).forEach(file => {
            formDataUpload.append('images', file);
        });

        try {
            const response = await axios.post('/api/ocr/extract', formDataUpload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (response.data.text) {
                const existingAnswer = formData.questions[qIndex].modelAnswer;
                const newText = existingAnswer
                    ? existingAnswer + '\n\n' + response.data.text
                    : response.data.text;
                handleQuestionChange(qIndex, 'modelAnswer', newText);
            }
        } catch (err) {
            setError(`Failed to extract text from model answer images (Q${qIndex + 1}).`);
        } finally {
            setOcrLoadingIndex(null);
        }
    };

    const handleSubModelAnswerUpload = async (qIndex, sqIndex, files) => {
        if (!files || files.length === 0) return;

        setOcrLoadingSubIndex(`${qIndex}-${sqIndex}`);
        setError(null);

        const formDataUpload = new FormData();
        Array.from(files).forEach(file => {
            formDataUpload.append('images', file);
        });

        try {
            const response = await axios.post('/api/ocr/extract', formDataUpload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (response.data.text) {
                const existingAnswer = formData.questions[qIndex].subQuestions[sqIndex].modelAnswer;
                const newText = existingAnswer
                    ? existingAnswer + '\n\n' + response.data.text
                    : response.data.text;
                handleSubQuestionChange(qIndex, sqIndex, 'modelAnswer', newText);
            }
        } catch (err) {
            setError(`Failed to extract text from model answer images.`);
        } finally {
            setOcrLoadingSubIndex(null);
        }
    };

    // ─── Submit ───

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        if (!formData.examName || !formData.subjectCode) {
            setError('Exam Name and Subject Code are required.');
            setLoading(false);
            return;
        }
        for (let i = 0; i < formData.questions.length; i++) {
            const q = formData.questions[i];
            if (!q.questionText) {
                setError(`Question ${i + 1} text is required.`);
                setLoading(false);
                return;
            }
            // If no sub-questions, model answer is required at the question level
            if (q.subQuestions.length === 0 && !q.modelAnswer) {
                setError(`Question ${i + 1} needs a model answer (or add sub-questions).`);
                setLoading(false);
                return;
            }
            // If sub-questions exist, each must have text and model answer
            for (let j = 0; j < q.subQuestions.length; j++) {
                const sq = q.subQuestions[j];
                if (!sq.questionText || !sq.modelAnswer) {
                    setError(`Q${q.questionNumber}.${sq.subQuestionLabel} is incomplete.`);
                    setLoading(false);
                    return;
                }
            }
        }

        try {
            await axios.post('/api/exams', formData);
            setSuccess(true);
            setFormData({
                examName: '',
                subjectCode: '',
                questions: [{
                    questionNumber: '1',
                    questionText: '',
                    modelAnswer: '',
                    maxMarks: 10,
                    subQuestions: []
                }]
            });
            setExpandedQuestions({ 0: true });
        } catch (err) {
            setError('Failed to create configuration. System Error.');
        } finally {
            setLoading(false);
        }
    };

    // ─── Model Answer Upload Button Component (with camera capture for mobile) ───

    const ModelAnswerUploadButton = ({ isLoading, onFileChange }) => (
        <div className="flex gap-1.5 sm:gap-2 flex-wrap">
            {/* Gallery / File upload */}
            <label className={`text-[10px] font-bold uppercase flex items-center gap-1.5 sm:gap-2 transition-colors cursor-pointer px-2 sm:px-3 py-1.5 border min-h-[36px] ${isLoading ? 'text-gray-400 border-gray-200 bg-gray-50' : 'text-blue-600 active:bg-blue-100 border-blue-200 bg-blue-50'}`}>
                <input
                    type="file"
                    className="hidden"
                    onChange={(e) => onFileChange(e.target.files)}
                    accept="image/*"
                    multiple
                    disabled={isLoading}
                />
                {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                <span className="hidden sm:inline">{isLoading ? 'Extracting...' : 'Upload'}</span>
                <span className="sm:hidden">{isLoading ? '...' : 'Upload'}</span>
            </label>
            {/* Camera capture — shows on mobile */}
            <label className={`text-[10px] font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer px-2 sm:px-3 py-1.5 border min-h-[36px] ${isLoading ? 'text-gray-400 border-gray-200 bg-gray-50' : 'text-purple-600 active:bg-purple-100 border-purple-200 bg-purple-50'}`}>
                <input
                    type="file"
                    className="hidden"
                    onChange={(e) => onFileChange(e.target.files)}
                    accept="image/*"
                    capture="environment"
                    disabled={isLoading}
                />
                <Camera className="w-3 h-3" />
                <span className="hidden sm:inline">Camera</span>
            </label>
        </div>
    );

    // ─── Render ───

    return (
        <div className="space-y-8 sm:space-y-12 lg:space-y-16">
            {/* Header Section */}
            <div className="border-b-4 border-black pb-6 sm:pb-8 lg:pb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black tracking-tighter uppercase mb-1 sm:mb-2">Configure Exam</h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest leading-none text-[10px] sm:text-xs">Set dynamic questions, sub-questions & model answers</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="p-2 sm:p-3 bg-black text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                        System Ready
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
                <div className="lg:col-span-8">
                    <form onSubmit={handleSubmit} className="space-y-8 sm:space-y-12">

                        {/* Exam Meta Data */}
                        <div className="retro-card space-y-6 sm:space-y-8">
                            <h2 className="text-lg sm:text-xl font-bold uppercase tracking-tighter mb-4 sm:mb-6 flex items-center gap-4 border-b-2 border-black pb-4">
                                [01] Exam Metadata
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest mb-3 sm:mb-4">Exam Name</label>
                                    <input
                                        type="text"
                                        name="examName"
                                        value={formData.examName}
                                        onChange={handleExamChange}
                                        className="input-field text-base sm:text-lg font-bold uppercase"
                                        placeholder="E.g. Final Semester"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest mb-3 sm:mb-4">Subject Code</label>
                                    <input
                                        type="text"
                                        name="subjectCode"
                                        value={formData.subjectCode}
                                        onChange={handleExamChange}
                                        className="input-field text-base sm:text-lg font-bold uppercase"
                                        placeholder="PHY-202"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Dynamic Questions */}
                        <div className="space-y-6 sm:space-y-8">
                            <div className="flex items-center justify-between gap-4">
                                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tighter">[02] Questions</h2>
                                <button type="button" onClick={addQuestion} className="btn-secondary flex items-center gap-2 text-xs whitespace-nowrap">
                                    <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Block</span><span className="sm:hidden">Add</span>
                                </button>
                            </div>

                            {formData.questions.map((q, index) => (
                                <div key={index} className="retro-card relative bg-gray-50">
                                    {/* Question Header — Collapsible */}
                                    <div
                                        className="flex items-center justify-between cursor-pointer select-none mb-3 sm:mb-4 gap-2"
                                        onClick={() => toggleQuestion(index)}
                                    >
                                        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                                            {expandedQuestions[index]
                                                ? <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                                                : <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                                            }
                                            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider sm:tracking-widest opacity-60 truncate">
                                                <span className="hidden sm:inline">Question Block_</span>
                                                <span className="sm:hidden">Q</span>
                                                0{index + 1}
                                                {q.subQuestions.length > 0 && (
                                                    <span className="ml-2 sm:ml-4 text-[9px] sm:text-[10px] bg-black text-white px-1.5 sm:px-2 py-0.5 normal-case tracking-normal">
                                                        {q.subQuestions.length} sub-q
                                                    </span>
                                                )}
                                                <span className="ml-2 sm:ml-4 text-[9px] sm:text-[10px] text-gray-400">{q.maxMarks}m</span>
                                            </h3>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); removeQuestion(index); }}
                                            className="p-2 active:bg-black active:text-white transition-colors border-2 border-transparent active:border-black flex-shrink-0"
                                            title="Remove Question"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {expandedQuestions[index] && (
                                        <div className="space-y-5 sm:space-y-6">
                                            {/* Question Number */}
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-widest mb-3 sm:mb-4">Question Number</label>
                                                <input
                                                    type="text"
                                                    value={q.questionNumber}
                                                    onChange={(e) => handleQuestionChange(index, 'questionNumber', e.target.value)}
                                                    className="input-field text-base sm:text-lg font-bold uppercase w-1/3 sm:w-1/4"
                                                    placeholder="Q1"
                                                />
                                            </div>

                                            {/* Question Text */}
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-widest mb-3 sm:mb-4">Question Text</label>
                                                <textarea
                                                    value={q.questionText}
                                                    onChange={(e) => handleQuestionChange(index, 'questionText', e.target.value)}
                                                    className="input-field min-h-[70px] sm:min-h-[80px]"
                                                    placeholder="Enter question..."
                                                />
                                            </div>

                                            {/* Model Answer (only if no sub-questions) */}
                                            {q.subQuestions.length === 0 && (
                                                <div className="grid grid-cols-1 gap-5 sm:gap-6">
                                                    <div>
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2">
                                                            <label className="block text-[10px] font-bold uppercase tracking-widest">Model Answer</label>
                                                            <div className="flex gap-2 flex-wrap">
                                                                <ModelAnswerUploadButton
                                                                    isLoading={ocrLoadingIndex === index}
                                                                    onFileChange={(files) => handleModelAnswerUpload(index, files)}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => generateModelAnswer(index, q.questionText)}
                                                                    className="text-[10px] font-bold uppercase flex items-center gap-1.5 sm:gap-2 text-emerald-600 active:bg-emerald-100 transition-colors bg-emerald-50 px-2 sm:px-3 py-1.5 border border-emerald-200 min-h-[36px]"
                                                                    disabled={generatingIndex === index}
                                                                >
                                                                    {generatingIndex === index ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                                    <span className="hidden sm:inline">Generate with AI</span>
                                                                    <span className="sm:hidden">AI</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <textarea
                                                            value={q.modelAnswer}
                                                            onChange={(e) => handleQuestionChange(index, 'modelAnswer', e.target.value)}
                                                            className="input-field min-h-[90px] sm:min-h-[100px]"
                                                            placeholder="Expected key points... (or upload images above)"
                                                        />
                                                    </div>
                                                    <div className="w-full sm:w-1/3">
                                                        <label className="block text-[10px] font-bold uppercase tracking-widest mb-3 sm:mb-4">Max Marks</label>
                                                        <input
                                                            type="number"
                                                            value={q.maxMarks}
                                                            onChange={(e) => handleQuestionChange(index, 'maxMarks', parseInt(e.target.value) || 0)}
                                                            className="input-field font-bold text-xl"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* If sub-questions exist, show computed marks */}
                                            {q.subQuestions.length > 0 && (
                                                <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-black/5 border-2 border-dashed border-black/20">
                                                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-500">Total Marks (auto):</span>
                                                    <span className="text-xl sm:text-2xl font-black">{q.maxMarks}</span>
                                                </div>
                                            )}

                                            {/* ═══ Sub-Questions ═══ */}
                                            <div className="space-y-4">
                                                {q.subQuestions.map((sq, sqIndex) => (
                                                    <div key={sqIndex} className="ml-2 sm:ml-8 bg-white border-2 border-black p-3 sm:p-5 relative shadow-[3px_3px_0px_0px_#000] sm:shadow-[4px_4px_0px_0px_#000] transition-all">
                                                        {/* Sub-question header */}
                                                        <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                                                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2 min-w-0">
                                                                <span className="w-5 h-5 sm:w-6 sm:h-6 bg-black text-white text-[9px] sm:text-[10px] flex items-center justify-center font-black flex-shrink-0">
                                                                    {sq.subQuestionLabel}
                                                                </span>
                                                                <span className="truncate">Q{q.questionNumber}.{sq.subQuestionLabel}</span>
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeSubQuestion(index, sqIndex)}
                                                                className="p-1.5 active:bg-red-500 active:text-white transition-colors border border-transparent active:border-red-600 flex-shrink-0"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>

                                                        {/* Sub-question text */}
                                                        <div className="mb-3 sm:mb-4">
                                                            <label className="block text-[10px] font-bold uppercase tracking-widest mb-2">Sub-Question Text</label>
                                                            <textarea
                                                                value={sq.questionText}
                                                                onChange={(e) => handleSubQuestionChange(index, sqIndex, 'questionText', e.target.value)}
                                                                className="input-field min-h-[55px] sm:min-h-[60px] text-sm"
                                                                placeholder={`Enter sub-question ${sq.subQuestionLabel}...`}
                                                            />
                                                        </div>

                                                        {/* Sub-question model answer + marks */}
                                                        <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                                            <div>
                                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                                                                    <label className="block text-[10px] font-bold uppercase tracking-widest">Model Answer</label>
                                                                    <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                                                                        <ModelAnswerUploadButton
                                                                            isLoading={ocrLoadingSubIndex === `${index}-${sqIndex}`}
                                                                            onFileChange={(files) => handleSubModelAnswerUpload(index, sqIndex, files)}
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => generateSubModelAnswer(index, sqIndex, sq.questionText)}
                                                                            className="text-[10px] font-bold uppercase flex items-center gap-1.5 text-emerald-600 active:bg-emerald-100 transition-colors bg-emerald-50 px-2 py-1 border border-emerald-200 min-h-[36px]"
                                                                            disabled={generatingSubIndex === `${index}-${sqIndex}`}
                                                                        >
                                                                            {generatingSubIndex === `${index}-${sqIndex}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                                            AI
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <textarea
                                                                    value={sq.modelAnswer}
                                                                    onChange={(e) => handleSubQuestionChange(index, sqIndex, 'modelAnswer', e.target.value)}
                                                                    className="input-field min-h-[60px] sm:min-h-[70px] text-sm"
                                                                    placeholder="Model answer for this sub-question..."
                                                                />
                                                            </div>
                                                            <div className="w-1/3 sm:w-1/4">
                                                                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2">Marks</label>
                                                                <input
                                                                    type="number"
                                                                    value={sq.maxMarks}
                                                                    onChange={(e) => handleSubQuestionChange(index, sqIndex, 'maxMarks', parseInt(e.target.value) || 0)}
                                                                    className="input-field font-bold text-lg"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Add Sub-Question Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => addSubQuestion(index)}
                                                    className="ml-2 sm:ml-8 w-[calc(100%-0.5rem)] sm:w-[calc(100%-2rem)] py-3 border-2 border-dashed border-gray-400 font-bold uppercase text-[10px] sm:text-xs active:bg-black active:text-white active:border-black transition-all flex items-center justify-center gap-2 text-gray-500 min-h-[44px]"
                                                >
                                                    <Plus className="w-3 h-3" /> Add Sub-Q (Q{q.questionNumber}.{String.fromCharCode(97 + q.subQuestions.length)})
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            <button type="button" onClick={addQuestion} className="w-full py-3 sm:py-4 border-2 border-dashed border-black font-bold uppercase active:bg-black active:text-white transition-all flex items-center justify-center gap-2 text-sm min-h-[44px]">
                                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Append New Question Block</span><span className="sm:hidden">Add Question</span>
                            </button>
                        </div>

                        {/* Status Messages & Save */}
                        <div className="sticky bottom-0 sm:bottom-4 z-10">
                            <div className="retro-card bg-white p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 !shadow-[4px_4px_0px_0px_#000] sm:!shadow-xl">
                                <div className="min-w-0">
                                    {error && (
                                        <div className="flex items-center gap-2 text-red-600 font-bold text-[10px] sm:text-xs uppercase">
                                            <AlertCircle className="w-4 h-4 flex-shrink-0" /> <span className="truncate">{error}</span>
                                        </div>
                                    )}
                                    {success && (
                                        <div className="flex items-center gap-2 text-green-600 font-bold text-[10px] sm:text-xs uppercase">
                                            <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Saved Successfully
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-primary w-full sm:w-auto"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Configuration
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Sidebar Info — hidden on mobile, visible on desktop */}
                <div className="hidden lg:block lg:col-span-4 space-y-10">
                    <div className="retro-card bg-gray-50 border-dashed">
                        <div className="flex items-center gap-4 mb-6">
                            <FileText className="w-6 h-6" />
                            <h3 className="font-bold uppercase tracking-tighter text-lg">Logic Gates</h3>
                        </div>
                        <ul className="space-y-4 text-xs font-bold text-gray-500 leading-relaxed list-disc pl-4">
                            <li>Define each question clearly to aid the semantic matcher.</li>
                            <li>Model answers serve as the ground truth vector.</li>
                            <li>You can add infinite question blocks.</li>
                            <li><strong>Sub-questions:</strong> Use them for multi-part questions (Q1.a, Q1.b). Marks auto-sum.</li>
                            <li><strong>Upload Pages:</strong> Upload handwritten model answer images — OCR will extract the text automatically.</li>
                            <li><strong>Camera:</strong> On mobile, tap the camera button to capture model answer pages directly.</li>
                            <li><strong>AI Generate:</strong> Let Gemma write an ideal model answer for you.</li>
                        </ul>
                    </div>

                    {/* Live Preview */}
                    <div className="retro-card">
                        <h3 className="font-bold uppercase tracking-tighter text-lg mb-6 flex items-center gap-4 border-b-2 border-black pb-4">
                            Live Preview
                        </h3>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto">
                            {formData.questions.map((q, i) => (
                                <div key={i} className="text-xs font-mono">
                                    <div className="font-bold">
                                        Q{q.questionNumber} ({q.maxMarks}m): {q.questionText || '—'}
                                    </div>
                                    {q.subQuestions.length > 0 && (
                                        <div className="ml-4 mt-1 space-y-1 text-gray-500">
                                            {q.subQuestions.map((sq, j) => (
                                                <div key={j}>
                                                    {sq.subQuestionLabel}) ({sq.maxMarks}m): {sq.questionText || '—'}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {q.modelAnswer && (
                                        <div className="ml-4 mt-1 text-emerald-600 truncate">
                                            ✓ Model answer set ({q.modelAnswer.length} chars)
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CreateExam;
