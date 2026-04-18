import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, FileText, CheckCircle2, Loader2, AlertCircle, Layers, Plus, X, BarChart, ChevronDown, ChevronRight, Image as ImageIcon, Camera } from 'lucide-react';

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
            <div key={index} className={`border-2 p-4 sm:p-6 transition-all duration-300 ${colorClass}`}>
                <div className="flex justify-between items-start mb-3 sm:mb-4">
                    <h4 className="text-lg sm:text-xl font-black uppercase">{q.question}</h4>
                    <div className="text-right">
                        <div className="text-xl sm:text-2xl font-black tracking-tighter leading-none">{q.marks} <span className="text-xs sm:text-sm opacity-60">/ {q.maxMarks}</span></div>
                    </div>
                </div>
                <div className="h-2 w-full bg-black/10 mb-3 sm:mb-4 overflow-hidden">
                    <div className={`h-full ${barClass} transition-all duration-1000`} style={{ width: `${pct}%` }}></div>
                </div>
                <div>
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-60 mb-1 sm:mb-2">Feedback</p>
                    <p className="text-xs sm:text-sm font-medium leading-relaxed italic">"{q.feedback}"</p>
                </div>

                {/* Sub-question breakdown */}
                {q.subQuestions && q.subQuestions.length > 0 && (
                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-black/10 space-y-2 sm:space-y-3">
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest opacity-50">Sub-Question Breakdown</p>
                        {q.subQuestions.map((sq, sqIdx) => {
                            const sqPct = (sq.marks / Math.max(sq.maxMarks, 1)) * 100;
                            let sqBarClass = 'bg-red-400';
                            if (sqPct >= 80) sqBarClass = 'bg-emerald-400';
                            else if (sqPct >= 40) sqBarClass = 'bg-yellow-400';

                            return (
                                <div key={sqIdx} className="ml-2 sm:ml-4">
                                    <div className="flex justify-between text-[10px] sm:text-xs font-bold mb-1">
                                        <span>{sq.question}</span>
                                        <span>{sq.marks}/{sq.maxMarks}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-black/5 overflow-hidden mb-1">
                                        <div className={`h-full ${sqBarClass} transition-all duration-700`} style={{ width: `${sqPct}%` }}></div>
                                    </div>
                                    {sq.feedback && (
                                        <p className="text-[9px] sm:text-[10px] italic opacity-60 leading-tight">{sq.feedback}</p>
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
            <div key={index} className={`retro-card relative transition-all ${files.length > 0 ? '!border-emerald-500 !shadow-[4px_4px_0px_0px_rgba(16,185,129,1)] sm:!shadow-[8px_8px_0px_0px_rgba(16,185,129,1)]' : ''}`}>
                {/* Question Info */}
                <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2">
                            <span className="w-8 h-8 sm:w-10 sm:h-10 bg-black text-white text-xs sm:text-sm flex items-center justify-center font-black flex-shrink-0">
                                Q{qNum}
                            </span>
                            <div className="min-w-0">
                                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-tight leading-tight truncate">
                                    {question.questionText || 'Untitled Question'}
                                </h4>
                                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                    {maxMarks} marks
                                    {hasSubQuestions && ` • ${question.subQuestions.length} parts`}
                                </span>
                            </div>
                        </div>

                        {/* Show sub-questions */}
                        {hasSubQuestions && (
                            <div className="ml-10 sm:ml-12 mt-2 space-y-1">
                                {question.subQuestions.map((sq, j) => (
                                    <div key={j} className="text-[9px] sm:text-[10px] font-bold text-gray-400 flex items-center gap-1.5 sm:gap-2">
                                        <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-gray-200 text-gray-600 flex items-center justify-center text-[7px] sm:text-[8px] font-black flex-shrink-0">
                                            {sq.subQuestionLabel || String.fromCharCode(97 + j)}
                                        </span>
                                        <span className="truncate">{sq.questionText?.substring(0, 40) || '—'}</span>
                                        <span className="text-gray-300 flex-shrink-0">({sq.maxMarks}m)</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* File count badge */}
                    {files.length > 0 && (
                        <div className="bg-emerald-500 text-white text-[9px] sm:text-[10px] font-black px-2 sm:px-3 py-1 uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            {files.length} pg
                        </div>
                    )}
                </div>

                {/* Uploaded Files Preview */}
                {files.length > 0 && (
                    <div className="flex gap-2 sm:gap-3 mb-3 sm:mb-4 overflow-x-auto pb-2 -mx-1 px-1">
                        {files.map((item, fileIdx) => (
                            <div key={item.id} className="relative flex-shrink-0 w-16 sm:w-20 group">
                                <button
                                    onClick={() => removeFile(qNum, item.id)}
                                    className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-5 h-5 bg-black text-white flex items-center justify-center z-10 sm:opacity-0 sm:group-hover:opacity-100"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                                <div className="w-16 h-22 sm:w-20 sm:h-28 bg-gray-100 overflow-hidden border-2 border-black">
                                    {item.file.type.startsWith('image/') ? (
                                        <img src={item.preview} alt={`Page ${fileIdx + 1}`} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                                        </div>
                                    )}
                                </div>
                                <p className="text-[7px] sm:text-[8px] font-bold uppercase text-center mt-1 text-gray-500">Pg {fileIdx + 1}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Upload Buttons — Gallery + Camera */}
                <div className="flex gap-2">
                    {/* Gallery / File upload */}
                    <label className={`flex-1 flex items-center justify-center gap-2 sm:gap-3 py-3 cursor-pointer transition-all border-2 border-dashed font-bold uppercase text-[10px] sm:text-xs min-h-[44px] ${files.length > 0 ? 'border-gray-300 text-gray-400 active:border-black active:text-black' : 'border-black text-black active:bg-black active:text-white'}`}>
                        <input
                            type="file"
                            className="hidden"
                            onChange={(e) => handleFileChange(qNum, e)}
                            accept="image/*,.pdf"
                            multiple
                        />
                        {files.length > 0 ? (
                            <>
                                <Plus className="w-4 h-4" /> Add Pages
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Upload Answer Pages</span><span className="sm:hidden">Upload</span>
                            </>
                        )}
                    </label>
                    {/* Camera capture */}
                    <label className={`flex items-center justify-center gap-2 py-3 cursor-pointer transition-all border-2 border-dashed font-bold uppercase text-[10px] sm:text-xs min-h-[44px] px-4 ${files.length > 0 ? 'border-gray-300 text-gray-400 active:border-purple-500 active:text-purple-600' : 'border-purple-400 text-purple-600 bg-purple-50 active:bg-purple-100'}`}>
                        <input
                            type="file"
                            className="hidden"
                            onChange={(e) => handleFileChange(qNum, e)}
                            accept="image/*"
                            capture="environment"
                        />
                        <Camera className="w-4 h-4" />
                        <span className="hidden sm:inline">Camera</span>
                    </label>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 sm:space-y-12 lg:space-y-16">
            <div className="border-b-4 border-black pb-6 sm:pb-8 lg:pb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black tracking-tighter uppercase mb-1 sm:mb-2">Upload Paper</h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] sm:text-xs">[Status: {result ? 'Graded' : 'Awaiting Submission'}]</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
                {!result && (
                    <div className="lg:col-span-4 space-y-6 sm:space-y-8 lg:space-y-12">
                        {error && (
                            <div className="p-4 sm:p-6 lg:p-8 bg-black text-white border-2 border-black flex items-center gap-3 sm:gap-4">
                                <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white flex-shrink-0" />
                                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">{error}</p>
                            </div>
                        )}

                        <div className="retro-card">
                            <h2 className="text-lg sm:text-xl font-bold uppercase tracking-tighter mb-6 sm:mb-10 flex items-center gap-4">
                                [Student ID]
                            </h2>

                            <div className="space-y-6 sm:space-y-10">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest mb-3 sm:mb-4">Select Exam</label>
                                    <select
                                        value={selectedExamId}
                                        onChange={(e) => setSelectedExamId(e.target.value)}
                                        className="input-field font-bold uppercase cursor-pointer"
                                    >
                                        <option value="">-- Select Exam --</option>
                                        {exams.map(exam => (
                                            <option key={exam.examId} value={exam.examId}>
                                                {exam.examName || exam.subject} ({exam.subjectCode || 'N/A'})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest mb-3 sm:mb-4">USN</label>
                                    <input
                                        type="text"
                                        value={usn}
                                        onChange={(e) => setUsn(e.target.value)}
                                        className="input-field text-lg sm:text-2xl font-bold uppercase font-mono"
                                        placeholder="Student USN..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Upload Progress Stats */}
                        {selectedExam && (
                            <div className="retro-card bg-gray-50 border-dashed">
                                <h3 className="font-bold uppercase tracking-tighter text-xs sm:text-sm mb-3 sm:mb-4">Upload Progress</h3>
                                <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center">
                                    <div>
                                        <div className="text-2xl sm:text-3xl font-black">{selectedExam.questions?.length || 0}</div>
                                        <div className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-gray-400">Questions</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl sm:text-3xl font-black text-emerald-600">{getQuestionsWithFiles().length}</div>
                                        <div className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-gray-400">With Pages</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl sm:text-3xl font-black">{getTotalPages()}</div>
                                        <div className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-gray-400">Total Pgs</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {loading && (
                            <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 border-2 border-black flex items-center gap-4 sm:gap-6">
                                <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-black animate-spin flex-shrink-0" />
                                <div>
                                    <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-500">_Neural Link Active</p>
                                    <p className="text-xs sm:text-sm font-bold uppercase animate-pulse">{progress}</p>
                                    {currentEvalQuestion && (
                                        <p className="text-[9px] sm:text-[10px] text-gray-400 font-bold mt-1">Processing: {currentEvalQuestion}</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className={result ? "lg:col-span-12" : "lg:col-span-8"}>
                    {!result ? (
                        <div className="space-y-4 sm:space-y-6">
                            {/* No exam selected */}
                            {!selectedExam && (
                                <div className="min-h-[250px] sm:min-h-[400px] lg:min-h-[500px] border-4 border-dashed border-gray-300 bg-white flex flex-col items-center justify-center p-8 sm:p-14 lg:p-20 text-center">
                                    <ImageIcon className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 text-gray-200 mb-4 sm:mb-6 lg:mb-8" />
                                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold uppercase tracking-tighter mb-2 sm:mb-4 text-gray-300">Select an Exam First</h3>
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] sm:text-xs max-w-sm">
                                        Choose an exam config to begin uploading question-wise answers.
                                    </p>
                                </div>
                            )}

                            {/* Question-wise upload cards */}
                            {selectedExam && selectedExam.questions && (
                                <>
                                    <div className="flex items-center justify-between mb-2 gap-2">
                                        <h2 className="text-lg sm:text-xl lg:text-2xl font-black uppercase tracking-tighter flex items-center gap-2 sm:gap-3">
                                            <Layers className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                                            <span className="hidden sm:inline">Upload Answer Pages by Question</span>
                                            <span className="sm:hidden">Upload by Question</span>
                                        </h2>
                                    </div>
                                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 sm:mb-6">
                                        Upload pages for each question. Use camera on mobile.
                                    </p>

                                    <div className="space-y-4 sm:space-y-6">
                                        {selectedExam.questions.map((question, index) =>
                                            renderQuestionUploadCard(question, index)
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Evaluate Button */}
                            {selectedExam && getTotalPages() > 0 && !loading && (
                                <div className="fixed bottom-20 lg:bottom-8 right-4 sm:right-6 lg:right-8 z-40">
                                    <button
                                        onClick={handleUpload}
                                        className="btn-primary shadow-2xl text-sm sm:text-base sm:scale-110 lg:scale-125 origin-bottom-right"
                                    >
                                        <BarChart className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" />
                                        Evaluate ({getTotalPages()} <span className="hidden sm:inline">pages</span><span className="sm:hidden">pg</span>)
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white">
                            {/* Detailed Results UI */}
                            <div className="flex flex-col sm:flex-row border-b-4 border-black mb-8 sm:mb-12 pb-6 sm:pb-8 justify-between items-start sm:items-end gap-4">
                                <div>
                                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tighter">Report</h2>
                                    <p className="text-xs sm:text-sm font-bold tracking-widest uppercase text-gray-500">USN: {result.studentId}</p>
                                </div>
                                <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
                                     <button
                                        onClick={() => setResult(null)}
                                        className="btn-secondary flex-1 sm:flex-none h-10 sm:h-12 text-xs sm:text-sm"
                                     >
                                         New Eval
                                     </button>
                                     <button
                                        onClick={() => window.print()}
                                        className="btn-primary flex-1 sm:flex-none text-xs sm:text-sm"
                                     >
                                         Download
                                     </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12">
                                {/* Score Display */}
                                <div className="sm:col-span-1 retro-card bg-black text-white text-center p-6 sm:p-8 lg:p-12 flex flex-col items-center justify-center">
                                    <div className={`mb-4 sm:mb-6 px-3 sm:px-4 py-1.5 sm:py-2 border-2 text-xs sm:text-sm font-black uppercase tracking-widest ${result.percentage >= 40 ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-red-500 text-white border-red-400'}`}>
                                        {result.percentage >= 40 ? 'PASS' : 'FAIL'}
                                    </div>
                                    <div className="text-5xl sm:text-6xl lg:text-8xl font-black tracking-tighter italic leading-none">{result.totalMarks}</div>
                                    <div className="text-sm sm:text-lg lg:text-xl font-bold uppercase tracking-widest mt-2 border-t-2 border-white/20 pt-2 w-full">/ {result.maxMarks} PTS</div>
                                    <div className="text-xl sm:text-2xl lg:text-3xl font-black mt-4 sm:mt-8 text-gray-400">{result.percentage}%</div>
                                </div>

                                {/* Summary Card */}
                                <div className="sm:col-span-2 retro-card p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
                                    <h3 className="text-[10px] sm:text-sm font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-gray-500 mb-4 sm:mb-8 border-b-2 border-gray-100 pb-3 sm:pb-4">Exam Summary</h3>
                                    <div className="grid grid-cols-3 gap-4 sm:gap-8 flex-1 items-center">
                                        <div className="text-center">
                                            <div className="text-3xl sm:text-4xl lg:text-5xl font-black mb-1 sm:mb-2">{result.evaluation?.length || 0}</div>
                                            <div className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-500">Total</div>
                                        </div>
                                        <div className="text-center border-l-2 border-black pl-3 sm:pl-6 lg:pl-8">
                                            <div className="text-3xl sm:text-4xl lg:text-5xl font-black mb-1 sm:mb-2 text-emerald-600">
                                                {result.evaluation?.filter(q => q.marks > 0).length || 0}
                                            </div>
                                            <div className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-500">Done</div>
                                        </div>
                                        <div className="text-center border-l-2 border-black pl-3 sm:pl-6 lg:pl-8">
                                            <div className="text-3xl sm:text-4xl lg:text-5xl font-black mb-1 sm:mb-2 text-red-600">
                                                {result.evaluation?.filter(q => q.marks === 0).length || 0}
                                            </div>
                                            <div className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-500">Zero</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Question Cards */}
                            <div className="mb-8 sm:mb-12 lg:mb-16">
                                <h3 className="text-lg sm:text-xl lg:text-2xl font-black uppercase tracking-tighter mb-4 sm:mb-6 lg:mb-8 flex items-center gap-3 sm:gap-4">
                                    <Layers className="w-5 h-5 sm:w-6 sm:h-6" /> Question-wise
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                    {result.evaluation?.map((q, idx) => renderScoreCard(q, idx))}
                                </div>
                            </div>

                            {/* Insights Section */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                                <div className="retro-card border-emerald-500 bg-emerald-50">
                                    <h3 className="text-sm sm:text-lg font-black uppercase tracking-tight text-emerald-900 mb-4 sm:mb-6 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5"/> Strengths
                                    </h3>
                                    <ul className="list-disc pl-4 sm:pl-5 space-y-2 sm:space-y-3 font-medium text-emerald-800 text-xs sm:text-sm leading-relaxed">
                                        {result.strengths?.length > 0 ? result.strengths.map((str, idx) => (
                                            <li key={idx}>{str}</li>
                                        )) : <li>No distinct strengths identified.</li>}
                                    </ul>
                                </div>
                                <div className="retro-card border-red-500 bg-red-50">
                                    <h3 className="text-sm sm:text-lg font-black uppercase tracking-tight text-red-900 mb-4 sm:mb-6 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5"/> Weaknesses
                                    </h3>
                                    <ul className="list-disc pl-4 sm:pl-5 space-y-2 sm:space-y-3 font-medium text-red-800 text-xs sm:text-sm leading-relaxed">
                                        {result.weaknesses?.length > 0 ? result.weaknesses.map((wk, idx) => (
                                            <li key={idx}>{wk}</li>
                                        )) : <li>No distinct weaknesses identified.</li>}
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
