import { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import {
    Sparkles,
    Bold,
    Italic,
    Strikethrough,
    Loader2,
    Heading1,
    Heading2,
    Check,
    X,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { generateContentStream } from '../services/aiService';

interface Props {
    editor: Editor;
}

type AIAction = 'polish' | 'rewrite' | 'expand' | 'shorten' | 'translate';

const AI_PROMPTS: Record<AIAction, string> = {
    polish: 'You are an expert editor. Please polish the following text, correcting grammar, improving flow, and enhancing vocabulary. Only output the polished text, nothing else.',
    rewrite:
        'You are a professional writer. Rewrite the following text completely in a new, clearer style. Keep the meaning but change the wording drastically. Only output the rewritten text, nothing else.',
    expand: 'You are an author. Expand on the following text, adding more details, context, and rich descriptions. Output the expanded text and nothing else.',
    shorten:
        'You are an editor. Summarize and shorten the following text to convey the main points concisely. Output only the shortened text.',
    translate:
        'You are a professional translator. Translate the following text to Chinese (if it is not Chinese) or to English (if it is Chinese). Output only the translated text, nothing else.',
};

export function EditorBubbleMenu({ editor }: Props) {
    const [isAIOpen, setIsAIOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [streamingText, setStreamingText] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [savedSelection, setSavedSelection] = useState<{ from: number; to: number } | null>(null);

    const shouldShow = ({ editor: ed }: { editor: Editor }) => {
        return !ed.state.selection.empty && ed.isEditable;
    };

    const handleAIAction = async (action: AIAction) => {
        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to, ' ');
        if (!selectedText) return;

        setSavedSelection({ from, to });
        setIsLoading(true);
        setIsAIOpen(false);
        setShowPreview(true);
        setStreamingText('');

        try {
            const stream = await generateContentStream(selectedText, {
                systemInstruction: AI_PROMPTS[action],
                usePro: action === 'rewrite' || action === 'translate',
            });

            let fullText = '';
            for await (const chunk of stream) {
                if (chunk.text) {
                    fullText += chunk.text;
                    setStreamingText(fullText);
                }
            }
        } catch (error) {
            console.error(error);
            setStreamingText('An error occurred during AI processing.');
        } finally {
            setIsLoading(false);
        }
    };

    const applyChanges = () => {
        if (savedSelection && streamingText) {
            editor
                .chain()
                .focus()
                .deleteRange(savedSelection)
                .insertContentAt(savedSelection.from, streamingText)
                .run();
        }
        closePreview();
    };

    const closePreview = () => {
        setShowPreview(false);
        setStreamingText('');
        setSavedSelection(null);
    };

    useEffect(() => {
        if (editor.state.selection.empty) setIsAIOpen(false);
    }, [editor.state.selection]);

    if (showPreview) {
        return (
            <BubbleMenu editor={editor}>
                <div className="flex flex-col bg-white shadow-xl border border-slate-200 rounded-xl overflow-hidden w-96 transform translate-y-2">
                    <div className="p-3 border-b border-slate-100 font-medium flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center text-sm text-slate-700">
                            <Sparkles className="w-4 h-4 mr-1.5" />
                            AI Preview
                            {isLoading && <Loader2 className="w-3 h-3 ml-2 animate-spin" />}
                        </div>
                    </div>
                    <div className="p-4 text-sm text-slate-700 max-h-60 overflow-y-auto whitespace-pre-wrap">
                        {streamingText || (isLoading ? 'Thinking...' : '')}
                    </div>
                    {!isLoading && streamingText && (
                        <div className="flex items-center justify-end p-2 border-t border-slate-100 bg-slate-50 gap-2">
                            <button
                                onClick={closePreview}
                                className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors flex items-center"
                            >
                                <X className="w-3 h-3 mr-1" /> Discard
                            </button>
                            <button
                                onClick={applyChanges}
                                className="px-3 py-1.5 rounded-md text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white flex items-center shadow-sm transition-colors"
                            >
                                <Check className="w-3 h-3 mr-1" /> Replace Selection
                            </button>
                        </div>
                    )}
                </div>
            </BubbleMenu>
        );
    }

    return (
        <BubbleMenu editor={editor} shouldShow={shouldShow}>
            <div className="flex items-center shadow-lg border border-slate-200 rounded-lg overflow-hidden bg-white divide-x divide-slate-100">
                {isAIOpen ? (
                    <div className="flex bg-slate-50 text-slate-700">
                        {[
                            { label: '润色 (Polish)', action: 'polish' as const },
                            { label: '重写 (Rewrite)', action: 'rewrite' as const },
                            { label: '扩写 (Expand)', action: 'expand' as const },
                            { label: '缩写 (Shorten)', action: 'shorten' as const },
                            { label: '翻译 (Translate)', action: 'translate' as const },
                        ].map((item) => (
                            <button
                                key={item.action}
                                onClick={() => handleAIAction(item.action)}
                                className="px-3 py-2 text-[13px] font-medium hover:bg-slate-100 transition-colors whitespace-nowrap"
                            >
                                {item.label}
                            </button>
                        ))}
                        <button
                            onClick={() => setIsAIOpen(false)}
                            className="px-2 py-2 hover:bg-slate-100 text-slate-500 bg-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <>
                        <button
                            onClick={() => setIsAIOpen(true)}
                            className="flex items-center px-3 py-2 text-[13px] font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
                        >
                            <Sparkles className="w-4 h-4 mr-1.5" /> AI Assist
                        </button>

                        <div className="flex items-center px-1">
                            <MenuButton
                                onClick={() => editor.chain().focus().toggleBold().run()}
                                active={editor.isActive('bold')}
                                icon={<Bold className="w-4 h-4" />}
                            />
                            <MenuButton
                                onClick={() => editor.chain().focus().toggleItalic().run()}
                                active={editor.isActive('italic')}
                                icon={<Italic className="w-4 h-4" />}
                            />
                            <MenuButton
                                onClick={() => editor.chain().focus().toggleStrike().run()}
                                active={editor.isActive('strike')}
                                icon={<Strikethrough className="w-4 h-4" />}
                            />
                            <div className="w-px h-5 mx-1 bg-slate-200"></div>
                            <MenuButton
                                onClick={() =>
                                    editor.chain().focus().toggleHeading({ level: 1 }).run()
                                }
                                active={editor.isActive('heading', { level: 1 })}
                                icon={<Heading1 className="w-4 h-4" />}
                            />
                            <MenuButton
                                onClick={() =>
                                    editor.chain().focus().toggleHeading({ level: 2 }).run()
                                }
                                active={editor.isActive('heading', { level: 2 })}
                                icon={<Heading2 className="w-4 h-4" />}
                            />
                        </div>
                    </>
                )}
            </div>
        </BubbleMenu>
    );
}

function MenuButton({
    onClick,
    active,
    icon,
}: {
    onClick: () => void;
    active: boolean;
    icon: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'p-1.5 ml-0.5 rounded hover:bg-slate-100 transition-colors first:ml-0 text-slate-600',
                active && 'bg-slate-100 text-slate-900',
            )}
        >
            {icon}
        </button>
    );
}
