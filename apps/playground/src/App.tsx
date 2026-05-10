import { useState, useRef } from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { Editor } from './components/Editor';
import { SidebarQA } from './components/SidebarQA';
import { ExportModal } from './components/ExportModal';
import { BookOpen, MessagesSquare, CodeSquare } from 'lucide-react';

export default function App() {
    const [editorText, setEditorText] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const editorRef = useRef<TiptapEditor | null>(null);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden">
            {/* Top Navbar */}
            <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
                <div className="flex items-center space-x-2 text-slate-900 font-bold tracking-tight">
                    <BookOpen className="w-[1.125rem] h-[1.125rem]" />
                    <span>Editor Playground</span>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        className="flex items-center space-x-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-md transition-colors"
                        onClick={() => setIsExportModalOpen(true)}
                    >
                        <CodeSquare className="w-4 h-4" />
                        <span>View Source</span>
                    </button>
                    <div className="w-px h-4 bg-slate-200"></div>
                    <button
                        className="flex items-center space-x-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-md transition-colors"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    >
                        <MessagesSquare className="w-4 h-4" />
                        <span>Q&A / Summary</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex overflow-hidden relative">
                <div className="flex-1 overflow-y-auto w-full flex justify-center pb-24 selection:bg-slate-200 selection:text-slate-900">
                    <div className="w-full h-fit flex justify-center px-4 md:px-8 relative">
                        <Editor onTextUpdate={setEditorText} editorRef={editorRef} />
                    </div>
                </div>

                <SidebarQA
                    documentText={editorText}
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />

                <ExportModal
                    isOpen={isExportModalOpen}
                    onClose={() => setIsExportModalOpen(false)}
                    editor={editorRef.current}
                />
            </main>
        </div>
    );
}
