import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Download, Edit2, Check, X, Search, ChevronDown, ChevronUp, FileText, User, GraduationCap, Info, ExternalLink, Calendar, Hash, Zap, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

function ResultsDashboard() {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        fetchResults();
    }, []);

    const fetchResults = async () => {
        try {
            const response = await api.get('/api/results');
            setResults(response.data);
        } catch (e) {
            console.error('Connection failure: Records unreachable.');
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const exportCSV = () => {
        if (results.length === 0) return;

        const headers = ['Student Name', 'Question', 'Relevance', 'Marks', 'Max Marks', 'Date'];
        const rows = results.map(r => [
            r.studentName,
            r.questionText,
            r.relevance,
            r.totalMarks,
            r.maxMarks,
            new Date(r.evaluatedAt).toLocaleDateString()
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'neural_data_dump.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
            <div className="flex gap-4">
                <div className="w-4 h-4 bg-black animate-pulse"></div>
                <div className="w-4 h-4 bg-black animate-pulse delay-75"></div>
                <div className="w-4 h-4 bg-black animate-pulse delay-150"></div>
            </div>
            <p className="text-black font-bold tracking-[0.4em] text-xs uppercase">_Scanning Data Matrix</p>
        </div>
    );

    return (
        <div className="space-y-8 sm:space-y-12 lg:space-y-16">
            {/* Header Section */}
            <div className="border-b-4 border-black pb-6 sm:pb-8 lg:pb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black tracking-tighter uppercase mb-1 sm:mb-2">Results</h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest leading-none text-[10px] sm:text-xs">_Persistent History of Student Performance</p>
                </div>
                <div className="flex items-center gap-3 sm:gap-6">
                    <button
                        onClick={exportCSV}
                        disabled={results.length === 0}
                        className="btn-secondary h-10 sm:h-14 px-4 sm:px-8 text-xs sm:text-sm"
                    >
                        <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="hidden sm:inline">Download CSV</span>
                        <span className="sm:hidden">CSV</span>
                    </button>
                    <div className="p-2 sm:p-3 bg-white border-2 border-black text-[9px] sm:text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                        <span className="hidden sm:inline">Index Sync: Active</span>
                        <span className="sm:hidden">Active</span>
                    </div>
                </div>
            </div>

            {results.length === 0 ? (
                <div className="retro-card p-12 sm:p-20 lg:p-32 text-center flex flex-col items-center justify-center bg-gray-50 border-dashed">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white border-4 border-black flex items-center justify-center mb-6 sm:mb-8 lg:mb-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <FileText className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-black" />
                    </div>
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold uppercase tracking-tighter mb-2 sm:mb-4 italic">No Records Found</h3>
                    <p className="text-gray-500 font-bold uppercase tracking-widest max-w-sm mx-auto leading-relaxed text-[10px] sm:text-xs">
                        Upload student papers to populate the results history.
                    </p>
                </div>
            ) : (
                <div className="space-y-4 sm:space-y-6 lg:space-y-8">
                    {results.map((result) => (
                        <div
                            key={result.paperId}
                            className={`retro-card overflow-hidden !p-0 ${expandedId === result.paperId ? 'lg:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] bg-gray-50' : ''}`}
                        >
                            <div
                                className={`p-4 sm:p-6 lg:p-10 flex items-center justify-between cursor-pointer group transition-colors duration-300`}
                                onClick={() => toggleExpand(result.paperId)}
                            >
                                <div className="flex items-center gap-4 sm:gap-6 lg:gap-12 min-w-0">
                                    {/* Avatar — hidden on very small screens */}
                                    <div className="relative hidden sm:block flex-shrink-0">
                                        <div className={`w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 border-4 border-black flex items-center justify-center transition-colors ${expandedId === result.paperId ? 'bg-black text-white' : 'bg-white text-black'}`}>
                                            <User className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-white border-4 border-black flex items-center justify-center shadow-lg text-black">
                                            <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                                        </div>
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-lg sm:text-2xl lg:text-4xl font-black tracking-tighter uppercase mb-0.5 sm:mb-2 leading-none truncate">{result.studentName}</h3>
                                        <div className="flex items-center gap-3 sm:gap-6 lg:gap-8 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest opacity-60 flex-wrap">
                                            <span className="truncate">
                                                ID: {result.paperId.substring(0, 8)}...
                                            </span>
                                            <span className="hidden sm:flex items-center gap-2">
                                                Date: {new Date(result.evaluatedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 sm:gap-6 lg:gap-16 flex-shrink-0">
                                    <div className="text-right">
                                        <p className="text-[8px] sm:text-[10px] uppercase font-bold tracking-widest mb-0.5 sm:mb-1 opacity-60 hidden sm:block">Earned</p>
                                        <div className="flex items-baseline justify-end gap-1 sm:gap-2">
                                            <span className="text-2xl sm:text-4xl lg:text-6xl font-black italic tracking-tighter leading-none">{result.totalMarks}</span>
                                            <span className="text-[9px] sm:text-xs lg:text-sm font-bold opacity-60">/ {result.maxMarks}</span>
                                        </div>
                                    </div>
                                    <div className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 border-2 border-black flex items-center justify-center transition-all flex-shrink-0 ${expandedId === result.paperId ? 'bg-black text-white rotate-180' : 'bg-white text-black'}`}>
                                        <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                                    </div>
                                </div>
                            </div>

                            {expandedId === result.paperId && (
                                <div className="p-4 sm:p-8 lg:p-12 border-t-4 border-black bg-gray-50 text-black">
                                    <div className="space-y-6 sm:space-y-8 lg:space-y-12">
                                        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-white p-4 sm:p-6 border-2 border-black gap-4">
                                            <div className="flex items-center gap-4 sm:gap-6">
                                                <div className={`px-4 sm:px-6 py-1.5 sm:py-2 border-2 text-sm sm:text-xl font-black uppercase tracking-widest ${result.percentage >= 40 ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-red-500 text-white border-red-400'}`}>
                                                    {result.percentage >= 40 ? 'PASS' : 'FAIL'}
                                                </div>
                                                <div className="text-xl sm:text-2xl font-black tracking-tighter italic">{result.percentage || 0}%</div>
                                            </div>
                                            <div className="flex gap-4 sm:gap-8 text-center text-xs sm:text-sm font-bold uppercase tracking-widest text-gray-500">
                                                <div>Attempted: <span className="text-emerald-600 block text-lg sm:text-2xl tracking-tighter mt-0.5 sm:mt-1">{result.evaluation?.filter(q => q.marks > 0).length || 0}</span></div>
                                                <div>Zero: <span className="text-red-600 block text-lg sm:text-2xl tracking-tighter mt-0.5 sm:mt-1">{result.evaluation?.filter(q => q.marks === 0).length || 0}</span></div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                            {result.evaluation?.map((q, idx) => {
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
                                                    <div key={idx} className={`border-2 p-4 sm:p-6 transition-all duration-300 bg-white ${colorClass.replace(/bg-.*-50 /, '')}`}>
                                                        <div className="flex justify-between items-start mb-3 sm:mb-4">
                                                            <h4 className="text-lg sm:text-xl font-black uppercase">{q.question || `Q${idx+1}`}</h4>
                                                            <div className="text-right">
                                                                <div className="text-xl sm:text-2xl font-black tracking-tighter leading-none text-black">{q.marks} <span className="text-xs sm:text-sm opacity-60">/ {q.maxMarks}</span></div>
                                                            </div>
                                                        </div>
                                                        <div className="h-2 w-full bg-black/10 mb-3 sm:mb-4 overflow-hidden border border-black/20">
                                                            <div className={`h-full ${barClass} transition-all`} style={{ width: `${pct}%` }}></div>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-60 mb-1 sm:mb-2 text-black">Feedback</p>
                                                            <p className="text-xs sm:text-sm font-medium leading-relaxed italic text-black">"{q.feedback}"</p>
                                                        </div>

                                                        {/* Sub-question breakdown */}
                                                        {q.subQuestions && q.subQuestions.length > 0 && (
                                                            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-black/10 space-y-2 sm:space-y-3">
                                                                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest opacity-50 text-black">Sub-Questions</p>
                                                                {q.subQuestions.map((sq, sqIdx) => {
                                                                    const sqPct = (sq.marks / Math.max(sq.maxMarks, 1)) * 100;
                                                                    let sqBarClass = 'bg-red-400';
                                                                    if (sqPct >= 80) sqBarClass = 'bg-emerald-400';
                                                                    else if (sqPct >= 40) sqBarClass = 'bg-yellow-400';

                                                                    return (
                                                                        <div key={sqIdx} className="ml-2 sm:ml-4">
                                                                            <div className="flex justify-between text-[10px] sm:text-xs font-bold mb-1 text-black">
                                                                                <span>{sq.question}</span>
                                                                                <span>{sq.marks}/{sq.maxMarks}</span>
                                                                            </div>
                                                                            <div className="h-1.5 w-full bg-black/5 overflow-hidden mb-1">
                                                                                <div className={`h-full ${sqBarClass} transition-all`} style={{ width: `${sqPct}%` }}></div>
                                                                            </div>
                                                                            {sq.feedback && (
                                                                                <p className="text-[9px] sm:text-[10px] italic opacity-60 leading-tight text-black">{sq.feedback}</p>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {(result.strengths?.length > 0 || result.weaknesses?.length > 0) && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                                                <div className="p-4 sm:p-6 lg:p-8 border-2 border-emerald-500 bg-emerald-50">
                                                    <h3 className="text-sm sm:text-lg font-black uppercase tracking-tight text-emerald-900 mb-3 sm:mb-6 flex items-center gap-2">
                                                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5"/> Strengths
                                                    </h3>
                                                    <ul className="list-disc pl-4 sm:pl-5 space-y-2 sm:space-y-3 font-medium text-emerald-800 text-xs sm:text-sm leading-relaxed">
                                                        {result.strengths.map((str, idx) => <li key={idx}>{str}</li>)}
                                                    </ul>
                                                </div>
                                                <div className="p-4 sm:p-6 lg:p-8 border-2 border-red-500 bg-red-50">
                                                    <h3 className="text-sm sm:text-lg font-black uppercase tracking-tight text-red-900 mb-3 sm:mb-6 flex items-center gap-2">
                                                        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5"/> Weaknesses
                                                    </h3>
                                                    <ul className="list-disc pl-4 sm:pl-5 space-y-2 sm:space-y-3 font-medium text-red-800 text-xs sm:text-sm leading-relaxed">
                                                        {result.weaknesses.map((wk, idx) => <li key={idx}>{wk}</li>)}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {!result.strengths && !result.weaknesses && (
                                            <div className="p-4 sm:p-6 bg-yellow-100 border-2 border-yellow-500 text-yellow-900 text-xs sm:text-sm font-bold uppercase tracking-widest text-center">
                                                Legacy Record. Advanced insights unavailable.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ResultsDashboard;
