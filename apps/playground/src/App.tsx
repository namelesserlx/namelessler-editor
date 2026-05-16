import { useCallback, useRef, useState } from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { useTranslation } from 'react-i18next';
import { Editor } from './components/Editor';
import { SidebarQA } from './components/SidebarQA';
import { ExportModal } from './components/ExportModal';
import { AiSettingsDialog } from './components/AiSettingsDialog';
import { ToastStack, type ToastMessage } from './components/ToastStack';
import { hasAiSettings, loadAiSettings, type AiSettings } from './services/aiService';
import { BookOpen, CodeSquare, Globe2, MessagesSquare, Settings2 } from 'lucide-react';
import { resolvePlaygroundLanguage, SUPPORTED_LANGUAGES, type PlaygroundLanguage } from './i18n';

export default function App() {
    const { t, i18n } = useTranslation();
    const currentLanguage = resolvePlaygroundLanguage(i18n.resolvedLanguage ?? i18n.language);
    const [editorText, setEditorText] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
    const [isAiConfigured, setIsAiConfigured] = useState(() => hasAiSettings(loadAiSettings()));
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const editorRef = useRef<TiptapEditor | null>(null);

    const notify = useCallback((message: Omit<ToastMessage, 'id'>) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setToasts((current) => [...current, { ...message, id }]);
        window.setTimeout(() => {
            setToasts((current) => current.filter((toast) => toast.id !== id));
        }, 3600);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const handleAiSettingsSaved = (settings: AiSettings | null) => {
        setIsAiConfigured(Boolean(settings?.apiKey));
        notify({
            title: settings ? t('app.aiConfigured') : t('app.aiConfigurationCleared'),
            description: settings ? `${settings.provider} · ${settings.model}` : undefined,
        });
    };

    const changeLanguage = (language: PlaygroundLanguage) => {
        void i18n.changeLanguage(language);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden">
            <header className="min-h-14 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6 shrink-0 shadow-sm z-10">
                <div className="flex items-center space-x-2 text-slate-900 font-bold tracking-tight">
                    <BookOpen className="w-[1.125rem] h-[1.125rem]" />
                    <span>{t('app.title')}</span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                    <button
                        className="flex items-center space-x-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-md transition-colors"
                        onClick={() => setIsExportModalOpen(true)}
                    >
                        <CodeSquare className="w-4 h-4" />
                        <span>{t('app.viewSource')}</span>
                    </button>
                    <div className="w-px h-4 bg-slate-200"></div>
                    <button
                        className="relative flex items-center space-x-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-md transition-colors"
                        onClick={() => setIsAiSettingsOpen(true)}
                    >
                        <Settings2 className="w-4 h-4" />
                        <span>{t('app.aiSettings')}</span>
                        {isAiConfigured ? (
                            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        ) : null}
                    </button>
                    <div className="w-px h-4 bg-slate-200"></div>
                    <button
                        className="flex items-center space-x-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-3 py-1.5 rounded-md transition-colors"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    >
                        <MessagesSquare className="w-4 h-4" />
                        <span>{t('app.qaSummary')}</span>
                    </button>
                    <div className="w-px h-4 bg-slate-200"></div>
                    <div
                        className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-0.5"
                        aria-label={t('app.languageLabel')}
                    >
                        <Globe2 className="ml-2 h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                        {SUPPORTED_LANGUAGES.map((language) => (
                            <button
                                key={language}
                                type="button"
                                className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                                    currentLanguage === language
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                                aria-pressed={currentLanguage === language}
                                onClick={() => changeLanguage(language)}
                            >
                                {language === 'en-US'
                                    ? t('app.languageEnglish')
                                    : t('app.languageChinese')}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden relative">
                <div className="flex-1 overflow-y-auto w-full flex justify-center pb-24 selection:bg-slate-200 selection:text-slate-900">
                    <div className="w-full h-fit flex justify-center px-4 md:px-8 relative">
                        <Editor
                            locale={currentLanguage}
                            onTextUpdate={setEditorText}
                            editorRef={editorRef}
                            onOpenAiSettings={() => setIsAiSettingsOpen(true)}
                            onNotify={notify}
                        />
                    </div>
                </div>

                <SidebarQA
                    documentText={editorText}
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    onOpenAiSettings={() => setIsAiSettingsOpen(true)}
                    onNotify={notify}
                />

                <ExportModal
                    isOpen={isExportModalOpen}
                    onClose={() => setIsExportModalOpen(false)}
                    editor={editorRef.current}
                />
            </main>

            <AiSettingsDialog
                open={isAiSettingsOpen}
                onOpenChange={setIsAiSettingsOpen}
                onSaved={handleAiSettingsSaved}
                onNotify={notify}
            />
            <ToastStack messages={toasts} onDismiss={dismissToast} />
        </div>
    );
}
