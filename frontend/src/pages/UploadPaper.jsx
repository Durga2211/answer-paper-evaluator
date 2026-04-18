import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, FileText, CheckCircle2, Loader2, AlertCircle, Layers, Plus, X, BarChart, ChevronDown, ChevronRight, Image as ImageIcon } from 'lucide-react';

function UploadPaper() {
    const [usn, setUsn] = useState('');
    const [exams, setExams] = useState([]);
    const [selectedExamId, setSelectedExamId] = useState('');
    const [selectedExam, setSelectedExam] = useState(null);
    const [questionFiles, setQuestionFiles] = useState({});  // { questionNumber: [{ id, file, preview }] }
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState('');
    const [currentEvalQuestion, setCurrentEvalQuestion] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchExams = async () => {
            try {
                const response = await axios.get('/api/exams');
                setExams(response.data);
            } catch (err) {
                console.error("Failed to load exams", err);
            }
        };
        fetchExams();
    }, []);

    // When exam selection changes, load the exam config and reset files
    useEffect(() => {
        if (selectedExamId) {
            const exam = exams.find(e => e.examId === selectedExamId);
            setSelectedExam(exam || null);
            setQuestionFiles({});
            setResult(null);
            setError(null);
        } else {
            setSelectedExam(null);
            setQuestionFiles({});
        }
    }, [selectedExamId, exams]);

    // Cleanup previews
    useEffect(() => {
        return () => {
            Object.values(questionFiles).flat().forEach(item => {
                if (item?.preview) URL.revokeObjectURL(item.preview);
            });
        };
    }, [questionFiles]);

    const handleFileChange = (questionNumber, e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const newFiles = files.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            preview: URL.createObjectURL(file)
        }));

        setQuestionFiles(prev => ({
            ...prev,
            [questionNumber]: [...(prev[questionNumber] || []), ...newFiles]
        }));
        setError(null);
        setResult(null);
    };

    const removeFile = (questionNumber, id) => {
        setQuestionFiles(prev => {
            const updated = { ...prev };
            const removed = updated[questionNumber]?.find(f => f.id === id);
            if (removed?.preview) URL.revokeObjectURL(removed.preview);
            updated[questionNumber] = (updated[questionNumber] || []).filter(f => f.id !== id);
            if (updated[questionNumber].length === 0) delete updated[questionNumber];
            return updated;
        });
    };

    const getTotalPages = () => {
        return Object.values(questionFiles).reduce((sum, files) => sum + files.length, 0);
    };

    const getQuestionsWithFiles = () => {
        return Object.keys(questionFiles).filter(qn => questionFiles[qn]?.length > 0);
    };

    const handleUpload = async (e) => {
        if (e) e.preventDefault();

        const totalPages = getTotalPages();
        if (!usn || !selectedExamId || totalPages === 0) {
            setError('Error: Missing USN, Exam Selection, or Answer Sheets.');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        // Build form data with question-wise file mapping
        const formData = new FormData();
        formData.append('usn', usn);
        formData.append('examId', selectedExamId);

        const questionMapping = {};
        const questions = selectedExam?.questions || [];

        questions.forEach(q => {
            const qNum = (q.questionNumber || '1').toString().replace(/^Q/i, '').replace(/\.$/, '').trim();
            const fieldName = `question_${qNum}`;
            const files = questionFiles[qNum] || [];

            if (files.length > 0) {
                questionMapping[qNum] = fieldName;
                files.forEach(item => {
                    formData.append(fieldName, item.file);
                });
            }
        });

        formData.append('questionMapping', JSON.stringify(questionMapping));

        // Animated loading states
        let evalIndex = 0;
        const questionsToEval = questions.filter(q => {
            const qNum = (q.questionNumber || '1').toString().replace(/^Q/i, '').replace(/\.$/, '').trim();
            return questionFiles[qNum]?.length > 0;
        });

        setProgress('Uploading answer sheets...');
        setCurrentEvalQuestion('');

        const loadingInterval = setInterval(() => {
            if (evalIndex < questionsToEval.length) {
                const q = questionsToEval[evalIndex];
                setProgress(`Evaluating Q${q.questionNumber}...`);
                setCurrentEvalQuestion(`Q${q.questionNumber}`);
                evalIndex++;
            } else {
                setProgress('Finalizing scores...');
                setCurrentEvalQuestion('');
            }
        }, 3000);

        try {
            const response = await axios.post('/api/uploads', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult(response.data);
            setQuestionFiles({});
            setUsn('');
            setSelectedExamId('');
        } catch (err) {
            setError(err.response?.data?.error || 'Fatal Error: Upload Sequence Failed.');
        } finally {
            clearInterval(loadingInterval);
            setProgress('');
            setCurrentEvalQuestion('');
            setLoading(false);
        }
    };

    const renderScoreCard = (q, index) => {
        const pct = (q.marks / Math.max(q.maxMarks, 1)) * 100;
        let colorClass = 'border-red-500 bg-red-50 text-red-900';
        let barClass = 'bg-red-500';

        if (pct >= 80) {
            colorClass = 'border-emerald-500 bg-emerald-50 text-emerald-900';
            barClass = 'bg-emerald-500';
        } else if (pct >= 40) {
            colorClass = 'border-yellow-500 bg-yellow-50 text-yellow-900';
            barClass = 'bg-yellow-500';
        }

        return (
            <div key={index} className={`border-2 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${colorClass}`}>
                <div className="flex justify-between items-start mb-4">
                    <h4 className="text-xl font-black uppercase">{q.question}</h4>
                    <div className="text-right">
                        <div className="text-2xl font-black tracking-tighter leading-none">{q.marks} <span className="text-sm opacity-60">/ {q.maxMarks}</span></div>
                    </div>
                </div>
                <div className="h-2 w-full bg-black/10 mb-4 overflow-hidden">
                    <div className={`h-full ${barClass} transition-all duration-1000`} style={{ width: `${pct}%` }}></div>
                </div>
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">Feedback Reason</p>
                    <p className="text-sm font-medium leading-relaxed italic">"{q.feedback}"</p>
                </div>

                {/* Sub-question breakdown */}
                {q.subQuestions && q.subQuestions.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-black/10 space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Sub-Question Breakdown</p>
                        {q.subQuestions.map((sq, sqIdx) => {
                            const sqPct = (sq.marks / Math.max(sq.maxMarks, 1)) * 100;
                            let sqBarClass = 'bg-red-400';
                            if (sqPct >= 80) sqBarClass = 'bg-emerald-400';
                            else if (sqPct >= 40) sqBarClass = 'bg-yellow-400';

                            return (
                                <div key={sqIdx} className="ml-4">
                                    <div className="flex justify-between text-xs font-bold mb-1">
                                        <span>{sq.question}</span>
                                        <span>{sq.marks}/{sq.maxMarks}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-black/5 overflow-hidden mb-1">
                                        <div className={`h-full ${sqBarClass} transition-all duration-700`} style={{ width: `${sqPct}%` }}></div>
                                    </div>
                                    {sq.feedback && (
                                        <p className="text-[10px] italic opacity-60 leading-tight">{sq.feedback}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    // ─── Question Upload Card ───

    const renderQuestionUploadCard = (question, index) => {
        const qNum = (question.questionNumber || '1').toString().replace(/^Q/i, '').replace(/\.$/, '').trim();
        const files = questionFiles[qNum] || [];
        const hasSubQuestions = question.subQuestions && question.subQuestions.length > 0;
        const maxMarks = hasSubQuestions
            ? question.subQuestions.reduce((sum, sq) => sum + (parseFloat(sq.maxMarks) || 0), 0)
            : parseFloat(question.maxMarks) || 10;

        return (
            <div key={index} className={`retro-card relative transition-all ${files.length > 0 ? '!border-emerald-500 !shadow-[8px_8px_0px_0px_rgba(16,185,129,1)]' : ''}`}>
                {/* Question Info */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="w-10 h-10 bg-black text-white text-sm flex items-center justify-center font-black flex-shrink-0">
                                Q{qNum}
                            </span>
                            <div>
                                <h4 className="text-sm font-bold uppercase tracking-tight leading-tight">
                                    {question.questionText || 'Untitled Question'}
                                </h4>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                    {maxMarks} marks
                                    {hasSubQuestions && ` • ${question.subQuestions.length} parts`}
                                </span>
                            </div>
                        </div>

                        {/* Show sub-questions */}
                        {hasSubQuestions && (
                            <div className="ml-12 mt-2 space-y-1">
                                {question.subQuestions.map((sq, j) => (
                                    <div key={j} className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                                        <span className="w-4 h-4 bg-gray-200 text-gray-600 flex items-center justify-center text-[8px] font-black">
                                            {sq.subQuestionLabel || String.fromCharCode(97 + j)}
                                        </span>
                                        {sq.questionText?.substring(0, 60) || '—'}
                                        <span className="text-gray-300">({sq.maxMarks}m)</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* File count badge */}
                    {files.length > 0 && (
                        <div className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1 uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {files.length} page{files.length > 1 ? 's' : ''}
                        </div>
                    )}
                </div>

                {/* Uploaded Files Preview */}
                {files.length > 0 && (
                    <div className="flex gap-3 mb-4 overflow-x-auto pb-2">
                        {files.map((item, fileIdx) => (
                            <div key={item.id} className="relative flex-shrink-0 w-20 group">
                                <button
                                    onClick={() => removeFile(qNum, item.id)}
                                    className="absolute -top-2 -right-2 w-5 h-5 bg-black text-white flex items-center justify-center hover:scale-110 transition-transform z-10 opacity-0 group-hover:opacity-100"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                                <div className="w-20 h-28 bg-gray-100 overflow-hidden border-2 border-black">
                                    {item.file.type.startsWith('image/') ? (
                                        <img src={item.preview} alt={`Page ${fileIdx + 1}`} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <FileText className="w-6 h-6 text-gray-400" />
                                        </div>
                                    )}
                                </div>
                                <p className="text-[8px] font-bold uppercase text-center mt-1 text-gray-500">Pg {fileIdx + 1}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Upload Button */}
                <label className={`flex items-center justify-center gap-3 py-3 cursor-pointer transition-all border-2 border-dashed font-bold uppercase text-xs ${files.length > 0 ? 'border-gray-300 text-gray-400 hover:border-black hover:text-black' : 'border-black text-black hover:bg-black hover:text-white'}`}>
                    <input
                        type="file"
                        className="hidden"
                        onChange={(e) => handleFileChange(qNum, e)}
                        accept="image/*,.pdf"
                        multiple
                    />
                    {files.length > 0 ? (
                        <>
                            <Plus className="w-4 h-4" /> Add More Pages
                        </>
                    ) : (
                        <>
                            <Upload className="w-4 h-4" /> Upload Answer Pages for Q{qNum}
                        </>
                    )}
                </label>
            </div>
        );
    };

    return (
        <div className="space-y-16">
            <div className="border-b-4 border-black pb-12 flex items-center justify-between">
                <div>
                    <h1 className="text-6xl font-black tracking-tighter uppercase mb-2">Upload Student Paper</h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest">[Status: {result ? 'Graded' : 'Awaiting Submission'}]</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                {!result && (
                    <div className="lg:col-span-4 space-y-12">
                        {error && (
                            <div className="p-8 bg-black text-white border-2 border-black flex items-center gap-4">
                                <AlertCircle className="w-8 h-8 text-white flex-shrink-0" />
                                <p className="text-[10px] font-bold uppercase tracking-widest">{error}</p>
                            </div>
                        )}

                        <div className="retro-card">
                            <h2 className="text-xl font-bold uppercase tracking-tighter mb-10 flex items-center gap-4">
                                [Student Identification]
                            </h2>

                            <div className="space-y-10">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest mb-4">Select Exam</label>
                                    <select
                                        value={selectedExamId}
                                        onChange={(e) => setSelectedExamId(e.target.value)}
                                        className="input-field font-bold uppercase cursor-pointer"
                                    >
                                        <option value="">-- Select Target Exam --</option>
                                        {exams.map(exam => (
                                            <option key={exam.examId} value={exam.examId}>
                                                {exam.examName || exam.subject} ({exam.subjectCode || 'N/A'})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest mb-4">USN (Unique Student Number)</label>
                                    <input
                                        type="text"
                                        value={usn}
                                        onChange={(e) => setUsn(e.target.value)}
                                        className="input-field text-2xl font-bold uppercase font-mono"
                                        placeholder="Enter student USN..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Upload Progress Stats */}
                        {selectedExam && (
                            <div className="retro-card bg-gray-50 border-dashed">
                                <h3 className="font-bold uppercase tracking-tighter text-sm mb-4">Upload Progress</h3>
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <div className="text-3xl font-black">{selectedExam.questions?.length || 0}</div>
                                        <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Questions</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-black text-emerald-600">{getQuestionsWithFiles().length}</div>
                                        <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400">With Pages</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-black">{getTotalPages()}</div>
                                        <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Total Pages</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {loading && (
                            <div className="p-8 bg-gray-50 border-2 border-black flex items-center gap-6">
                                <Loader2 className="w-8 h-8 text-black animate-spin flex-shrink-0" />
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">_Neural Link Active</p>
                                    <p className="text-sm font-bold uppercase animate-pulse">{progress}</p>
                                    {currentEvalQuestion && (
                                        <p className="text-[10px] text-gray-400 font-bold mt-1">Processing: {currentEvalQuestion}</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className={result ? "lg:col-span-12" : "lg:col-span-8"}>
                    {!result ? (
                        <div className="space-y-6">
                            {/* No exam selected */}
                            {!selectedExam && (
                                <div className="h-full min-h-[500px] border-4 border-dashed border-gray-300 bg-white flex flex-col items-center justify-center p-20 text-center">
                                    <ImageIcon className="w-20 h-20 text-gray-200 mb-8" />
                                    <h3 className="text-2xl font-bold uppercase tracking-tighter mb-4 text-gray-300">Select an Exam First</h3>
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
                                        Choose an exam configuration from the sidebar to begin uploading question-wise answers.
                                    </p>
                                </div>
                            )}

                            {/* Question-wise upload cards */}
                            {selectedExam && selectedExam.questions && (
                                <>
                                    <div className="flex items-center justify-between mb-2">
                                        <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                                            <Layers className="w-6 h-6" />
                                            Upload Answer Pages by Question
                                        </h2>
                                    </div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">
                                        Upload the specific pages of the student's answer sheet for each question below.
                                    </p>

                                    <div className="space-y-6">
                                        {selectedExam.questions.map((question, index) =>
                                            renderQuestionUploadCard(question, index)
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Evaluate Button */}
                            {selectedExam && getTotalPages() > 0 && !loading && (
                                <div className="fixed bottom-8 right-8 z-50">
                                    <button
                                        onClick={handleUpload}
                                        className="btn-primary shadow-2xl scale-125 origin-bottom-right"
                                    >
                                        <BarChart className="w-5 h-5 mr-3" />
                                        Evaluate Full Paper ({getTotalPages()} pages)
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 bg-white">
                            {/* Detailed Results UI */}
                            <div className="flex border-b-4 border-black mb-12 pb-8 justify-between items-end">
                                <div>
                                    <h2 className="text-5xl font-black uppercase tracking-tighter">Evaluation Report</h2>
                                    <p className="text-sm font-bold tracking-widest uppercase text-gray-500">USN: {result.studentId}</p>
                                </div>
                                <div className="flex gap-4">
                                     <button
                                        onClick={() => setResult(null)}
                                        className="btn-secondary h-12"
                                     >
                                         Evaluate Another
                                     </button>
                                     <button
                                        onClick={() => window.print()}
                                        className="btn-primary"
                                     >
                                         Download PDF
                                     </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                                {/* Score Display */}
                                <div className="lg:col-span-1 retro-card bg-black text-white text-center p-12 flex flex-col items-center justify-center">
                                    <div className={`mb-6 px-4 py-2 border-2 text-sm font-black uppercase tracking-widest ${result.percentage >= 40 ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-red-500 text-white border-red-400'}`}>
                                        {result.percentage >= 40 ? 'PASS' : 'FAIL'}
                                    </div>
                                    <div className="text-8xl font-black tracking-tighter italic leading-none">{result.totalMarks}</div>
                                    <div className="text-xl font-bold uppercase tracking-widest mt-2 border-t-2 border-white/20 pt-2 w-full">/ {result.maxMarks} PTS</div>
                                    <div className="text-3xl font-black mt-8 text-gray-400">{result.percentage}%</div>
                                </div>

                                {/* Summary Card */}
                                <div className="lg:col-span-2 retro-card p-10 flex flex-col justify-between">
                                    <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-gray-500 mb-8 border-b-2 border-gray-100 pb-4">Exam Summary</h3>
                                    <div className="grid grid-cols-3 gap-8 flex-1 items-center">
                                        <div className="text-center">
                                            <div className="text-5xl font-black mb-2">{result.evaluation?.length || 0}</div>
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Total Qs</div>
                                        </div>
                                        <div className="text-center border-l-2 border-black pl-8">
                                            <div className="text-5xl font-black mb-2 text-emerald-600">
                                                {result.evaluation?.filter(q => q.marks > 0).length || 0}
                                            </div>
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Attempted</div>
                                        </div>
                                        <div className="text-center border-l-2 border-black pl-8">
                                            <div className="text-5xl font-black mb-2 text-red-600">
                                                {result.evaluation?.filter(q => q.marks === 0).length || 0}
                                            </div>
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Not Attempted / Zero</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Question Cards */}
                            <div className="mb-16">
                                <h3 className="text-2xl font-black uppercase tracking-tighter mb-8 flex items-center gap-4">
                                    <Layers className="w-6 h-6" /> Question-wise Evaluation
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {result.evaluation?.map((q, idx) => renderScoreCard(q, idx))}
                                </div>
                            </div>

                            {/* Insights Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="retro-card border-emerald-500 bg-emerald-50">
                                    <h3 className="text-lg font-black uppercase tracking-tight text-emerald-900 mb-6 flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5"/> Strengths
                                    </h3>
                                    <ul className="list-disc pl-5 space-y-3 font-medium text-emerald-800 text-sm leading-relaxed">
                                        {result.strengths?.length > 0 ? result.strengths.map((str, idx) => (
                                            <li key={idx}>{str}</li>
                                        )) : <li>No distinct strengths explicitly identified in this evaluation pass.</li>}
                                    </ul>
                                </div>
                                <div className="retro-card border-red-500 bg-red-50">
                                    <h3 className="text-lg font-black uppercase tracking-tight text-red-900 mb-6 flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5"/> Weaknesses
                                    </h3>
                                    <ul className="list-disc pl-5 space-y-3 font-medium text-red-800 text-sm leading-relaxed">
                                        {result.weaknesses?.length > 0 ? result.weaknesses.map((wk, idx) => (
                                            <li key={idx}>{wk}</li>
                                        )) : <li>No distinct weaknesses explicitly identified in this evaluation pass.</li>}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default UploadPaper;
