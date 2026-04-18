import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
            const response = await axios.get('/api/results');
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
        <div className="space-y-16">
            {/* Header Section */}
            <div className="border-b-4 border-black pb-12 flex items-center justify-between">
                <div>
                    <h1 className="text-6xl font-black tracking-tighter uppercase mb-2">Evaluation Results</h1>
                    <p className="text-gray-500 font-bold uppercase tracking-widest leading-none">_Persistent History of Student Performance</p>
                </div>
                <div className="flex items-center gap-6">
                    <button
                        onClick={exportCSV}
                        disabled={results.length === 0}
                        className="btn-secondary h-14 px-8"
                    >
                        <Download className="w-5 h-5" /> Download CSV Report
                    </button>
                    <div className="p-3 bg-white border-2 border-black text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                        Index Sync: Active
                    </div>
                </div>
            </div>

            {results.length === 0 ? (
                <div className="retro-card p-32 text-center flex flex-col items-center justify-center bg-gray-50 border-dashed">
                    <div className="w-24 h-24 bg-white border-4 border-black flex items-center justify-center mb-10 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <FileText className="w-12 h-12 text-black" />
                    </div>
                    <h3 className="text-3xl font-bold uppercase tracking-tighter mb-4 italic">No Records Found</h3>
                    <p className="text-gray-500 font-bold uppercase tracking-widest max-w-sm mx-auto leading-relaxed text-xs">
                        Upload student papers to populate the results history.
                    </p>
                </div>
            ) : (
                <div className="space-y-8">
                    {results.map((result) => (
                        <div
                            key={result.paperId}
                            className={`retro-card overflow-hidden !p-0 ${expandedId === result.paperId ? 'shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] bg-gray-50' : ''}`}
                        >
                            <div
                                className={`p-10 flex items-center justify-between cursor-pointer group hover:bg-black hover:text-white transition-colors duration-300`}
                                onClick={() => toggleExpand(result.paperId)}
                            >
                                <div className="flex items-center gap-12">
                                    <div className="relative">
                                        <div className={`w-20 h-20 border-4 border-black flex items-center justify-center transition-colors ${expandedId === result.paperId ? 'bg-black text-white' : 'bg-white text-black'}`}>
                                            <User className="w-10 h-10" />
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white border-4 border-black flex items-center justify-center shadow-lg text-black">
                                            <Check className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-4xl font-black tracking-tighter uppercase mb-2 leading-none">{result.studentName}</h3>
                                        <div className="flex items-center gap-8 text-[10px] font-bold uppercase tracking-widest opacity-60">
                                            <span className="flex items-center gap-2">
                                                ID: {result.paperId.substring(0, 8)}...
                                            </span>
                                            <span className="flex items-center gap-2">
                                                Date: {new Date(result.evaluatedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-16">
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase font-bold tracking-widest mb-1 opacity-60">Earned Marks</p>
                                        <div className="flex items-baseline justify-end gap-2">
                                            <span className="text-6xl font-black italic tracking-tighter leading-none">{result.totalMarks}</span>
                                            <span className="text-sm font-bold opacity-60">/ {result.maxMarks} PTS</span>
                                        </div>
                                    </div>
                                    <div className={`w-12 h-12 border-2 border-black flex items-center justify-center transition-all ${expandedId === result.paperId ? 'bg-black text-white rotate-180' : 'bg-white text-black'}`}>
                                        <ChevronDown className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>

                            {expandedId === result.paperId && (
                                <div className="p-12 border-t-4 border-black animate-in slide-in-from-top-4 duration-500 bg-gray-50 text-black">
                                    <div className="space-y-12">
                                        <div className="flex justify-between items-center bg-white p-6 border-2 border-black">
                                            <div className="flex items-center gap-6">
                                                <div className={`px-6 py-2 border-2 text-xl font-black uppercase tracking-widest ${result.percentage >= 40 ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-red-500 text-white border-red-400'}`}>
                                                    {result.percentage >= 40 ? 'PASS' : 'FAIL'}
                                                </div>
                                                <div className="text-2xl font-black tracking-tighter italic">{result.percentage || 0}%</div>
                                            </div>
                                            <div className="flex gap-8 text-center text-sm font-bold uppercase tracking-widest text-gray-500">
                                                <div>Attempted: <span className="text-emerald-600 block text-2xl tracking-tighter mt-1">{result.evaluation?.filter(q => q.marks > 0).length || 0}</span></div>
                                                <div>Zero / Skipped: <span className="text-red-600 block text-2xl tracking-tighter mt-1">{result.evaluation?.filter(q => q.marks === 0).length || 0}</span></div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                                    <div key={idx} className={`border-2 p-6 transition-all duration-300 hover:shadow-xl bg-white ${colorClass.replace(/bg-.*-50 /, '')}`}>
                                                        <div className="flex justify-between items-start mb-4">
                                                            <h4 className="text-xl font-black uppercase">{q.question || `Q${idx+1}`}</h4>
                                                            <div className="text-right">
                                                                <div className="text-2xl font-black tracking-tighter leading-none text-black">{q.marks} <span className="text-sm opacity-60">/ {q.maxMarks}</span></div>
                                                            </div>
                                                        </div>
                                                        <div className="h-2 w-full bg-black/10 mb-4 overflow-hidden border border-black/20">
                                                            <div className={`h-full ${barClass} transition-all`} style={{ width: `${pct}%` }}></div>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2 text-black">Feedback Reason</p>
                                                            <p className="text-sm font-medium leading-relaxed italic text-black">"{q.feedback}"</p>
                                                        </div>

                                                        {/* Sub-question breakdown */}
                                                        {q.subQuestions && q.subQuestions.length > 0 && (
                                                            <div className="mt-4 pt-4 border-t border-black/10 space-y-3">
                                                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 text-black">Sub-Question Breakdown</p>
                                                                {q.subQuestions.map((sq, sqIdx) => {
                                                                    const sqPct = (sq.marks / Math.max(sq.maxMarks, 1)) * 100;
                                                                    let sqBarClass = 'bg-red-400';
                                                                    if (sqPct >= 80) sqBarClass = 'bg-emerald-400';
                                                                    else if (sqPct >= 40) sqBarClass = 'bg-yellow-400';

                                                                    return (
                                                                        <div key={sqIdx} className="ml-4">
                                                                            <div className="flex justify-between text-xs font-bold mb-1 text-black">
                                                                                <span>{sq.question}</span>
                                                                                <span>{sq.marks}/{sq.maxMarks}</span>
                                                                            </div>
                                                                            <div className="h-1.5 w-full bg-black/5 overflow-hidden mb-1">
                                                                                <div className={`h-full ${sqBarClass} transition-all`} style={{ width: `${sqPct}%` }}></div>
                                                                            </div>
                                                                            {sq.feedback && (
                                                                                <p className="text-[10px] italic opacity-60 leading-tight text-black">{sq.feedback}</p>
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
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="p-8 border-2 border-emerald-500 bg-emerald-50">
                                                    <h3 className="text-lg font-black uppercase tracking-tight text-emerald-900 mb-6 flex items-center gap-2">
                                                        <CheckCircle2 className="w-5 h-5"/> Strengths
                                                    </h3>
                                                    <ul className="list-disc pl-5 space-y-3 font-medium text-emerald-800 text-sm leading-relaxed">
                                                        {result.strengths.map((str, idx) => <li key={idx}>{str}</li>)}
                                                    </ul>
                                                </div>
                                                <div className="p-8 border-2 border-red-500 bg-red-50">
                                                    <h3 className="text-lg font-black uppercase tracking-tight text-red-900 mb-6 flex items-center gap-2">
                                                        <AlertCircle className="w-5 h-5"/> Weaknesses
                                                    </h3>
                                                    <ul className="list-disc pl-5 space-y-3 font-medium text-red-800 text-sm leading-relaxed">
                                                        {result.weaknesses.map((wk, idx) => <li key={idx}>{wk}</li>)}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {!result.strengths && !result.weaknesses && (
                                            <div className="p-6 bg-yellow-100 border-2 border-yellow-500 text-yellow-900 text-sm font-bold uppercase tracking-widest text-center">
                                                Legacy Evaluation Record. Advanced logical insights unavailable.
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
