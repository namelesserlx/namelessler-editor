import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { Trans, useTranslation } from 'react-i18next';
import { useEditorController } from '@namelesserlx/editor/react/controller';
import { Editor as EditorComponent } from '@namelesserlx/editor/react/editor';
import { BubbleMenuSelect } from '@namelesserlx/editor/ui';
import '@namelesserlx/editor/style.css';
import { createLowlight } from 'lowlight';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import css from 'highlight.js/lib/languages/css';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml';
import sql from 'highlight.js/lib/languages/sql';
import markdown from 'highlight.js/lib/languages/markdown';
import Placeholder from '@tiptap/extension-placeholder';
import { CodeBlockPro } from '@tiptap-codeless/extension-code-block-pro';
import { DragHandle } from '@tiptap-codeless/extension-drag-handle';
import { FileUpload } from '@tiptap-codeless/extension-file-upload';
import {
    Sparkles,
    Loader2,
    Check,
    X,
    WandSparkles,
    PenLine,
    Expand,
    Shrink,
    Languages,
} from 'lucide-react';
import type { JSONContent } from '@tiptap/core';
import { Autocompletion } from '../extensions/Autocompletion';
import {
    AiConfigurationError,
    generateContent,
    generateContentStream,
    hasAiSettings,
} from '../services/aiService';
import type { ToastMessage } from './ToastStack';
import englishInitContent from '../data/init.en-US.json';
import chineseInitContent from '../data/init.zh-CN.json';
import type { EditorLocale } from '../i18n';

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

const localizedInitContent: Record<EditorLocale, JSONContent> = {
    'en-US': englishInitContent,
    'zh-CN': chineseInitContent,
};

interface EditorProps {
    content?: JSONContent;
    onChange?: (html: string, text: string) => void;
    onTextUpdate?: (text: string) => void;
    editorRef?: React.MutableRefObject<TiptapEditor | null>;
    locale: EditorLocale;
    onOpenAiSettings?: () => void;
    onNotify?: (message: Omit<ToastMessage, 'id'>) => void;
}

const lowlight = createLowlight();
lowlight.register('javascript', javascript);
lowlight.register('typescript', typescript);
lowlight.register('python', python);
lowlight.register('css', css);
lowlight.register('bash', bash);
lowlight.register('json', json);
lowlight.register('html', xml);
lowlight.register('sql', sql);
lowlight.register('markdown', markdown);

export function Editor({
    content,
    onChange,
    onTextUpdate,
    editorRef,
    locale,
    onOpenAiSettings,
    onNotify,
}: EditorProps) {
    const { t } = useTranslation();
    const [editorInstance, setEditorInstance] = useState<TiptapEditor | null>(null);
    const onTextUpdateRef = useRef(onTextUpdate);
    onTextUpdateRef.current = onTextUpdate;
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const activeRequestRef = useRef<AbortController | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [streamingText, setStreamingText] = useState('');
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [savedSelection, setSavedSelection] = useState<{ from: number; to: number } | null>(null);
    const previousLocaleRef = useRef(locale);

    const syncEditorContent = useCallback((editor: TiptapEditor) => {
        const text = editor.getText();
        onTextUpdateRef.current?.(text);
        onChangeRef.current?.(editor.getHTML(), text);
    }, []);

    const placeholder = t('editor.placeholder');
    const codeBlockLocale = locale === 'zh-CN' ? 'zh' : 'en';
    const extraExtensions = useMemo(
        () => [
            CodeBlockPro.configure({
                lowlight,
                locale: codeBlockLocale,
                defaultLanguage: 'javascript',
                theme: 'auto',
            }),
            DragHandle,
            FileUpload.configure({
                storageMode: 'memory',
            }),
            Placeholder.configure({
                placeholder,
                emptyEditorClass: 'is-editor-empty',
            }),
            Autocompletion.configure({
                fetchSuggestion: async (text, signal) => {
                    if (!hasAiSettings()) {
                        return '';
                    }

                    const res = await generateContent(
                        `TEXT BEFORE CURSOR:\n${text}\n\nContinue from the cursor. Return only the new text that should be inserted after the final character.`,
                        {
                            systemInstruction:
                                'You are an inline autocomplete engine. Continue the text after the cursor. Return only the suffix to insert. Never repeat, paraphrase, quote, summarize, or answer the text before the cursor. If there is no useful continuation, return an empty string. Keep it brief, ideally under 20 words. Output plain text only.',
                            signal,
                        },
                    );
                    return res;
                },
            }),
        ],
        [codeBlockLocale, placeholder],
    );
    const editorOptions = useMemo(
        () => ({
            features: { codeBlock: false },
        }),
        [],
    );
    const defaultContent = content ?? localizedInitContent[locale];

    const controller = useEditorController({
        defaultContent,
        contentFormat: 'json',
        locale,
        placeholder,
        editorOptions,
        extensions: extraExtensions,
        onReady: (editor) => {
            setEditorInstance(editor);
            if (editorRef) {
                editorRef.current = editor;
            }
            syncEditorContent(editor);
        },
    });

    const editor = editorInstance;

    useEffect(() => {
        return () => {
            activeRequestRef.current?.abort();
        };
    }, []);

    useEffect(() => {
        if (!editor || editor.isDestroyed || content || controller.isDirty) {
            return;
        }

        if (previousLocaleRef.current === locale) {
            return;
        }

        previousLocaleRef.current = locale;
        editor.commands.setContent(defaultContent, { emitUpdate: false });
        syncEditorContent(editor);
    }, [content, controller.isDirty, defaultContent, editor, locale, syncEditorContent]);

    // Forward text updates to parent
    useEffect(() => {
        if (!editor || editor.isDestroyed) return;

        const handleUpdate = () => syncEditorContent(editor);

        editor.on('update', handleUpdate);
        return () => {
            editor.off('update', handleUpdate);
        };
    }, [editor, syncEditorContent]);

    const handleAiAction = useCallback(
        async (action: AIAction) => {
            if (!editor) return;

            if (!hasAiSettings()) {
                onNotify?.({
                    title: t('editor.aiNotConfigured'),
                    description: t('editor.aiNotConfiguredDescription'),
                    variant: 'error',
                });
                onOpenAiSettings?.();
                return;
            }

            const { from, to } = editor.state.selection;
            const selectedText = editor.state.doc.textBetween(from, to, ' ');
            if (!selectedText) return;

            activeRequestRef.current?.abort();
            const request = new AbortController();
            activeRequestRef.current = request;

            setSavedSelection({ from, to });
            setIsLoading(true);
            setShowPreview(true);
            setStreamingText('');
            setPreviewError(null);

            try {
                const stream = await generateContentStream(selectedText, {
                    systemInstruction: AI_PROMPTS[action],
                    usePro: action === 'rewrite' || action === 'translate',
                    signal: request.signal,
                });

                let fullText = '';
                for await (const chunk of stream) {
                    if (chunk.text) {
                        fullText += chunk.text;
                        setStreamingText(fullText);
                    }
                }
            } catch (error) {
                if (request.signal.aborted) {
                    return;
                }

                const message =
                    error instanceof AiConfigurationError
                        ? t('editor.aiNotConfigured')
                        : error instanceof Error && error.message
                          ? error.message
                          : t('editor.aiRequestFailed');

                console.error(error);
                setPreviewError(message);
                onNotify?.({
                    title: message,
                    description:
                        message === t('editor.aiNotConfigured')
                            ? t('editor.openAiSettingsDescription')
                            : t('editor.checkProviderDescription'),
                    variant: 'error',
                });
            } finally {
                if (activeRequestRef.current === request) {
                    activeRequestRef.current = null;
                    setIsLoading(false);
                }
            }
        },
        [editor, onNotify, onOpenAiSettings, t],
    );

    const applyChanges = () => {
        if (!editor || !savedSelection || !streamingText) return;
        editor
            .chain()
            .focus()
            .deleteRange(savedSelection)
            .insertContentAt(savedSelection.from, streamingText)
            .run();
        setShowPreview(false);
        setStreamingText('');
        setPreviewError(null);
        setSavedSelection(null);
    };

    const closePreview = () => {
        activeRequestRef.current?.abort();
        activeRequestRef.current = null;
        setIsLoading(false);
        setShowPreview(false);
        setStreamingText('');
        setPreviewError(null);
        setSavedSelection(null);
    };

    return (
        <div
            className="relative w-full max-w-6xl mx-auto mt-12 bg-white rounded-2xl shadow-sm p-6 sm:p-8 flex flex-col"
            style={{ minHeight: 'calc(100vh - 160px)' }}
        >
            <EditorComponent
                controller={controller}
                ui={{
                    bubbleMenu: {
                        commands: (defaults, context) => [
                            {
                                id: 'ai-assist',
                                group: 'ai',
                                render: () =>
                                    editor ? (
                                        <AiAssistDropdown
                                            onAction={handleAiAction}
                                            isOpen={context.activePopover === 'ai-assist'}
                                            onOpenChange={context.setPopoverOpen('ai-assist')}
                                        />
                                    ) : null,
                            },
                            ...defaults,
                        ],
                    },
                }}
            />

            {showPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10">
                    <div className="bg-white shadow-2xl border border-slate-200 rounded-xl overflow-hidden w-[400px] max-h-[60vh] flex flex-col">
                        <div className="p-3 border-b border-slate-100 font-medium flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center text-sm text-slate-700">
                                <Sparkles className="w-4 h-4 mr-1.5" />
                                {t('editor.aiPreview')}
                                {isLoading && <Loader2 className="w-3 h-3 ml-2 animate-spin" />}
                            </div>
                            <button
                                type="button"
                                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                aria-label={t('editor.closeAiPreview')}
                                onClick={closePreview}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-4 text-sm text-slate-700 overflow-y-auto whitespace-pre-wrap flex-1">
                            {previewError ? (
                                <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-red-800">
                                    {previewError}
                                </div>
                            ) : (
                                streamingText || (isLoading ? t('editor.thinking') : '')
                            )}
                        </div>
                        {(!isLoading || previewError) && (streamingText || previewError) ? (
                            <div className="flex items-center justify-end p-3 border-t border-slate-100 bg-slate-50 gap-2">
                                <button
                                    onClick={closePreview}
                                    className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors flex items-center"
                                >
                                    <X className="w-3 h-3 mr-1" />
                                    {previewError ? t('editor.close') : t('editor.discard')}
                                </button>
                                {!previewError ? (
                                    <button
                                        onClick={applyChanges}
                                        className="px-3 py-1.5 rounded-md text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white flex items-center shadow-sm transition-colors"
                                    >
                                        <Check className="w-3 h-3 mr-1" />{' '}
                                        {t('editor.replaceSelection')}
                                    </button>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            <div className="absolute right-6 bottom-6 flex items-center gap-2 pointer-events-none transition-opacity">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-md rounded-full border border-slate-200/60 shadow-sm text-xs font-medium text-slate-500">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>
                        <Trans
                            i18nKey="editor.autocompleteHint"
                            values={{ key: 'Tab' }}
                            components={{
                                keycap: (
                                    <kbd className="px-1.5 py-0.5 text-slate-600 bg-slate-100 rounded border border-slate-200 mx-0.5 font-sans font-semibold"></kbd>
                                ),
                            }}
                        />
                    </span>
                </div>
            </div>
        </div>
    );
}

function AiAssistDropdown({
    onAction,
    isOpen,
    onOpenChange,
}: {
    onAction: (action: AIAction) => void;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { t } = useTranslation();
    const aiOptions = [
        {
            key: 'polish',
            label: t('editor.actions.polish'),
            icon: <WandSparkles size={14} />,
            action: 'polish' as const,
        },
        {
            key: 'rewrite',
            label: t('editor.actions.rewrite'),
            icon: <PenLine size={14} />,
            action: 'rewrite' as const,
        },
        {
            key: 'expand',
            label: t('editor.actions.expand'),
            icon: <Expand size={14} />,
            action: 'expand' as const,
        },
        {
            key: 'shorten',
            label: t('editor.actions.shorten'),
            icon: <Shrink size={14} />,
            action: 'shorten' as const,
        },
        {
            key: 'translate',
            label: t('editor.actions.translate'),
            icon: <Languages size={14} />,
            action: 'translate' as const,
        },
    ];

    return (
        <BubbleMenuSelect
            ariaLabel={t('editor.aiAssist')}
            open={isOpen}
            onOpenChange={onOpenChange}
            options={aiOptions.map((opt) => ({
                key: opt.key,
                label: opt.label,
                icon: opt.icon,
                onSelect: () => onAction(opt.action),
            }))}
        >
            <Sparkles size={14} />
            <span style={{ marginLeft: 4 }}>{t('editor.aiAssist')}</span>
        </BubbleMenuSelect>
    );
}
