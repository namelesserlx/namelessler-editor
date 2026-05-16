import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { AiConfigurationError, generateContentStream, hasAiSettings } from '../services/aiService';
import { cn } from '../lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import type { ToastMessage } from './ToastStack';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface SidebarQAProps {
    documentText: string;
    isOpen: boolean;
    onClose: () => void;
    onOpenAiSettings?: () => void;
    onNotify?: (message: Omit<ToastMessage, 'id'>) => void;
}

const DEFAULT_SIDEBAR_WIDTH = 420;
const MIN_SIDEBAR_WIDTH = 360;
const MAX_SIDEBAR_WIDTH = 760;

function createMessageId(prefix: string) {
    return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function clampSidebarWidth(width: number) {
    const viewportMax = typeof window === 'undefined' ? MAX_SIDEBAR_WIDTH : window.innerWidth - 48;

    return Math.min(Math.max(width, MIN_SIDEBAR_WIDTH), Math.min(MAX_SIDEBAR_WIDTH, viewportMax));
}

function parseInlineMarkdown(text: string): ReactNode[] {
    const nodes: ReactNode[] = [];
    const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text))) {
        if (match.index > lastIndex) {
            nodes.push(text.slice(lastIndex, match.index));
        }

        const token = match[0];
        if (token.startsWith('**')) {
            nodes.push(
                <strong key={`${match.index}-strong`} className="font-semibold">
                    {token.slice(2, -2)}
                </strong>,
            );
        } else {
            nodes.push(
                <code
                    key={`${match.index}-code`}
                    className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.78em] text-slate-700"
                >
                    {token.slice(1, -1)}
                </code>,
            );
        }

        lastIndex = pattern.lastIndex;
    }

    if (lastIndex < text.length) {
        nodes.push(text.slice(lastIndex));
    }

    return nodes;
}

function MarkdownMessage({ content }: { content: string }) {
    const lines = content.split('\n');
    const blocks: ReactNode[] = [];

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const trimmed = line.trim();

        if (!trimmed) {
            continue;
        }

        if (trimmed.startsWith('```')) {
            const codeLines: string[] = [];
            index += 1;
            while (index < lines.length && !lines[index].trim().startsWith('```')) {
                codeLines.push(lines[index]);
                index += 1;
            }

            blocks.push(
                <pre
                    key={`code-${index}`}
                    className="my-2 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100"
                >
                    <code>{codeLines.join('\n')}</code>
                </pre>,
            );
            continue;
        }

        const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
        if (heading) {
            blocks.push(
                <div
                    key={`heading-${index}`}
                    className="mt-3 first:mt-0 text-[13px] font-semibold text-slate-950"
                >
                    {parseInlineMarkdown(heading[2])}
                </div>,
            );
            continue;
        }

        const bulletItems: string[] = [];
        while (index < lines.length) {
            const item = lines[index].trim().match(/^[-*]\s+(.+)$/);
            if (!item) break;
            bulletItems.push(item[1]);
            index += 1;
        }

        if (bulletItems.length > 0) {
            index -= 1;
            blocks.push(
                <ul key={`ul-${index}`} className="my-2 list-disc space-y-1 pl-4">
                    {bulletItems.map((item, itemIndex) => (
                        <li key={`${itemIndex}-${item}`}>{parseInlineMarkdown(item)}</li>
                    ))}
                </ul>,
            );
            continue;
        }

        const orderedItems: string[] = [];
        while (index < lines.length) {
            const item = lines[index].trim().match(/^\d+\.\s+(.+)$/);
            if (!item) break;
            orderedItems.push(item[1]);
            index += 1;
        }

        if (orderedItems.length > 0) {
            index -= 1;
            blocks.push(
                <ol key={`ol-${index}`} className="my-2 list-decimal space-y-1 pl-4">
                    {orderedItems.map((item, itemIndex) => (
                        <li key={`${itemIndex}-${item}`}>{parseInlineMarkdown(item)}</li>
                    ))}
                </ol>,
            );
            continue;
        }

        blocks.push(
            <p key={`p-${index}`} className="my-2 first:mt-0 last:mb-0">
                {parseInlineMarkdown(trimmed)}
            </p>,
        );
    }

    return <div className="space-y-1">{blocks}</div>;
}

export function SidebarQA({
    documentText,
    isOpen,
    onClose,
    onOpenAiSettings,
    onNotify,
}: SidebarQAProps) {
    const { t } = useTranslation();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'initial',
            role: 'assistant',
            content: t('qa.initialMessage'),
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
    const [isResizing, setIsResizing] = useState(false);
    const activeRequestRef = useRef<AbortController | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        setMessages((current) => {
            if (current.length !== 1 || current[0]?.id !== 'initial') {
                return current;
            }

            return [{ ...current[0], content: t('qa.initialMessage') }];
        });
    }, [t]);

    useEffect(() => {
        if (!isOpen) {
            activeRequestRef.current?.abort();
            activeRequestRef.current = null;
            setIsLoading(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isResizing) return;

        const originalCursor = document.body.style.cursor;
        const originalUserSelect = document.body.style.userSelect;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const handlePointerMove = (event: PointerEvent) => {
            setSidebarWidth(clampSidebarWidth(window.innerWidth - event.clientX));
        };
        const stopResizing = () => setIsResizing(false);

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', stopResizing, { once: true });

        return () => {
            document.body.style.cursor = originalCursor;
            document.body.style.userSelect = originalUserSelect;
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', stopResizing);
        };
    }, [isResizing]);

    const askQuestion = async (question: string) => {
        const userMsg = question.trim();
        if (!userMsg || isLoading) return;

        if (!hasAiSettings()) {
            onNotify?.({
                title: t('editor.aiNotConfigured'),
                description: t('editor.aiNotConfiguredDescription'),
                variant: 'error',
            });
            onOpenAiSettings?.();
            return;
        }

        const context = documentText.trim();
        if (!context) {
            setMessages((prev) => [
                ...prev,
                { id: createMessageId('user'), role: 'user', content: userMsg },
                {
                    id: createMessageId('assistant'),
                    role: 'assistant',
                    content: t('qa.emptyDocument'),
                },
            ]);
            onNotify?.({
                title: t('qa.emptyDocumentTitle'),
                description: t('qa.emptyDocumentDescription'),
                variant: 'error',
            });
            return;
        }

        const userMsgId = createMessageId('user');
        const assistantMsgId = createMessageId('assistant');
        const request = new AbortController();
        activeRequestRef.current = request;

        setMessages((prev) => [
            ...prev,
            { id: userMsgId, role: 'user', content: userMsg },
            { id: assistantMsgId, role: 'assistant', content: '' },
        ]);

        setIsLoading(true);

        try {
            const prompt = `Here is the document context:\n\n---\n${context}\n---\n\nUser Question: ${userMsg}`;
            const stream = await generateContentStream(prompt, {
                systemInstruction: t('qa.systemInstruction'),
                usePro: true,
                signal: request.signal,
            });

            let fullText = '';
            for await (const chunk of stream) {
                if (chunk.text) {
                    fullText += chunk.text;
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === assistantMsgId ? { ...msg, content: fullText } : msg,
                        ),
                    );
                }
            }
        } catch (error) {
            if (request.signal.aborted) return;

            const message =
                error instanceof AiConfigurationError
                    ? t('editor.aiNotConfigured')
                    : error instanceof Error && error.message
                      ? error.message
                      : t('editor.aiRequestFailed');
            console.error(error);
            onNotify?.({
                title: message,
                description: t('editor.checkProviderDescription'),
                variant: 'error',
            });
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === assistantMsgId ? { ...msg, content: t('qa.answerFailed') } : msg,
                ),
            );
        } finally {
            if (activeRequestRef.current === request) {
                activeRequestRef.current = null;
                setIsLoading(false);
            }
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const userMsg = input.trim();
        if (!userMsg || isLoading) return;

        setInput('');
        void askQuestion(userMsg);
    };

    const handleSummarize = () => {
        void askQuestion(t('qa.summarizePrompt'));
    };

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent
                className="!w-[min(var(--qa-sidebar-width),calc(100vw-48px))] !max-w-[calc(100vw-48px)] min-w-80 flex flex-col p-0 gap-0 border-l border-slate-200"
                style={
                    {
                        '--qa-sidebar-width': `${sidebarWidth}px`,
                    } as CSSProperties
                }
            >
                <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={t('qa.resizeLabel')}
                    className={cn(
                        'absolute left-0 top-0 z-10 h-full w-2 -translate-x-1 cursor-col-resize touch-none',
                        isResizing ? 'bg-slate-900/10' : 'hover:bg-slate-900/5',
                    )}
                    onPointerDown={(event) => {
                        event.preventDefault();
                        setIsResizing(true);
                    }}
                />
                <SheetHeader className="p-4 border-b border-slate-200 flex flex-row items-center justify-between bg-slate-50/50 space-y-0 text-left">
                    <SheetTitle className="font-semibold text-slate-800 flex items-center tracking-tight text-sm">
                        <Bot className="w-4 h-4 mr-2 text-slate-700" />
                        {t('qa.title')}
                    </SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                'flex gap-3',
                                msg.role === 'user' ? 'flex-row-reverse' : '',
                            )}
                        >
                            <div
                                className={cn(
                                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm',
                                    msg.role === 'assistant'
                                        ? 'bg-slate-50 text-slate-700 border border-slate-200'
                                        : 'bg-white text-slate-600 border border-slate-200',
                                )}
                            >
                                {msg.role === 'assistant' ? (
                                    <Bot className="w-4 h-4" />
                                ) : (
                                    <User className="w-4 h-4" />
                                )}
                            </div>
                            <div
                                className={cn(
                                    'px-4 py-2.5 rounded-2xl max-w-[80%] text-[13px] leading-relaxed shadow-sm',
                                    msg.role === 'user'
                                        ? 'bg-slate-900 text-white rounded-tr-sm'
                                        : 'bg-white text-slate-800 rounded-tl-sm border border-slate-200',
                                )}
                            >
                                {msg.content && msg.role === 'assistant' ? (
                                    <MarkdownMessage content={msg.content} />
                                ) : (
                                    msg.content ||
                                    (msg.role === 'assistant' && isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                                    ) : null)
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-3 bg-white border-t border-slate-100 flex justify-center">
                    <button
                        onClick={handleSummarize}
                        disabled={isLoading}
                        className="text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 px-4 py-2 rounded-full transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" /> {t('qa.summarize')}
                    </button>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={t('qa.placeholder')}
                            className="flex-1 bg-white border border-slate-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 rounded-2xl px-4 py-2 text-sm text-slate-800 outline-none transition-all shadow-sm"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            aria-label={t('qa.submit')}
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-900 text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                    </form>
                </div>
            </SheetContent>
        </Sheet>
    );
}
