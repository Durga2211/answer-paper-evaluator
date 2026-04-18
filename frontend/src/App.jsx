import React, { useState } from 'react';
import { CreateExam, UploadPaper, ResultsDashboard } from './pages';
import { LayoutDashboard, Upload, Plus } from 'lucide-react';

function App() {
    const [activeTab, setActiveTab] = useState('create');

    return (
        <div className="flex min-h-screen bg-white">
            {/* Sidebar */}
            <aside className="w-80 border-r-4 border-black flex flex-col bg-white">
                <div className="p-10 border-b-4 border-black">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-black"></div>
                        <h1 className="text-2xl font-bold tracking-tighter uppercase">Evaluator.v1</h1>
                    </div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">Neural Grading System</p>
                </div>

                <nav className="flex-1 py-8">
                    <div
                        onClick={() => setActiveTab('create')}
                        className={`sidebar-item flex-col items-start gap-1 py-6 ${activeTab === 'create' ? 'sidebar-item-active' : ''}`}
                    >
                        <div className="flex items-center gap-4">
                            <Plus className="w-5 h-5" /> Configure Exam
                        </div>
                        <p className="text-[9px] opacity-60 ml-9 font-bold lowercase tracking-widest">Set grading criteria & model answers</p>
                    </div>
                    <div
                        onClick={() => setActiveTab('upload')}
                        className={`sidebar-item flex-col items-start gap-1 py-6 ${activeTab === 'upload' ? 'sidebar-item-active' : ''}`}
                    >
                        <div className="flex items-center gap-4">
                            <Upload className="w-5 h-5" /> Upload Paper
                        </div>
                        <p className="text-[9px] opacity-60 ml-9 font-bold lowercase tracking-widest">Scan & evaluate student submissions</p>
                    </div>
                    <div
                        onClick={() => setActiveTab('results')}
                        className={`sidebar-item flex-col items-start gap-1 py-6 ${activeTab === 'results' ? 'sidebar-item-active' : ''}`}
                    >
                        <div className="flex items-center gap-4">
                            <LayoutDashboard className="w-5 h-5" /> Results Ledger
                        </div>
                        <p className="text-[9px] opacity-60 ml-9 font-bold lowercase tracking-widest">Review analysis & manage records</p>
                    </div>
                </nav>

                <div className="p-10 border-t-4 border-black bg-gray-50">
                    <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-black">
                        <span className="w-3 h-3 bg-black animate-pulse"></span>
                        Terminal Active
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-16 relative">
                <div className="max-w-7xl mx-auto h-full">
                    {activeTab === 'create' && <CreateExam />}
                    {activeTab === 'upload' && <UploadPaper />}
                    {activeTab === 'results' && <ResultsDashboard />}
                </div>

                {/* Footer Deco */}
                <div className="absolute bottom-10 right-10 text-[10px] font-bold uppercase tracking-[0.5em] text-gray-300 pointer-events-none select-none">
                    © 1980 Neural Systems Inc.
                </div>
            </main>
        </div>
    );
}

export default App;
