import { useState, useCallback, useEffect, useRef } from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { useEditorController, Editor as EditorComponent } from '@namelesserlx/editor';
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
import { Sparkles, Loader2, Check, X, WandSparkles, PenLine, Expand, Shrink, Languages } from 'lucide-react';
import { Autocompletion } from '../extensions/Autocompletion';
import { generateContent, generateContentStream } from '../services/aiService';

type AIAction = 'polish' | 'rewrite' | 'expand' | 'shorten' | 'translate';

const AI_PROMPTS: Record<AIAction, string> = {
  polish: 'You are an expert editor. Please polish the following text, correcting grammar, improving flow, and enhancing vocabulary. Only output the polished text, nothing else.',
  rewrite: 'You are a professional writer. Rewrite the following text completely in a new, clearer style. Keep the meaning but change the wording drastically. Only output the rewritten text, nothing else.',
  expand: 'You are an author. Expand on the following text, adding more details, context, and rich descriptions. Output the expanded text and nothing else.',
  shorten: 'You are an editor. Summarize and shorten the following text to convey the main points concisely. Output only the shortened text.',
  translate: 'You are a professional translator. Translate the following text to Chinese (if it is not Chinese) or to English (if it is Chinese). Output only the translated text, nothing else.',
};

interface EditorProps {
  content?: string;
  onChange?: (html: string, text: string) => void;
  onTextUpdate?: (text: string) => void;
  editorRef?: React.MutableRefObject<any>;
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

export function Editor({ content, onChange, onTextUpdate, editorRef }: EditorProps) {
  const [editorInstance, setEditorInstance] = useState<TiptapEditor | null>(null);
  const onTextUpdateRef = useRef(onTextUpdate);
  onTextUpdateRef.current = onTextUpdate;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [showAiActions, setShowAiActions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [savedSelection, setSavedSelection] = useState<{from: number, to: number} | null>(null);

  const sampleContent = [
    '<h2>Welcome to AI Notepad</h2>',
    '<p>This playground showcases <strong>@namelesserlx/editor</strong> with custom extensions:</p>',
    '<ul>',
    '  <li><strong>CodeBlock Pro</strong> — Syntax-highlighted code blocks with Mermaid diagrams, fullscreen, folding, line numbers, and language switching</li>',
    '  <li><strong>Drag Handle</strong> — Block drag handle and slash-triggered insert menu (<kbd>/</kbd>)</li>',
    '  <li><strong>File Upload</strong> — Drag & drop or paste files directly into the editor</li>',
    '  <li><strong>AI Copilot</strong> — Tab-triggered autocompletion and selection-based AI actions</li>',
    '</ul>',
    '<p>Try typing <code>/</code> to trigger the slash menu, or drag blocks using the handle on the left.</p>',
    '<h3>JavaScript Example</h3>',
    '<pre><code class="language-javascript">function fibonacci(n) {',
    '  const fib = [0, 1];',
    '  for (let i = 2; i &lt;= n; i++) {',
    '    fib[i] = fib[i - 1] + fib[i - 2];',
    '  }',
    '  return fib.slice(0, n + 1);',
    '}',
    '',
    'console.log(fibonacci(10));',
    '// → [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55]</code></pre>',
    '<h3>Python Example</h3>',
    '<pre><code class="language-python">def merge_sort(arr):',
    '    if len(arr) &lt;= 1:',
    '        return arr',
    '    mid = len(arr) // 2',
    '    left = merge_sort(arr[:mid])',
    '    right = merge_sort(arr[mid:])',
    '    return merge(left, right)',
    '',
    'def merge(left, right):',
    '    result = []',
    '    i = j = 0',
    '    while i &lt; len(left) and j &lt; len(right):',
    '        if left[i] &lt;= right[j]:',
    '            result.append(left[i])',
    '            i += 1',
    '        else:',
    '            result.append(right[j])',
    '            j += 1',
    '    return result + left[i:] + right[j:]</code></pre>',
    '<h3>Mermaid Diagram</h3>',
    '<p>The code block below renders a flowchart using Mermaid (if supported by CodeBlock Pro):</p>',
    '<pre><code class="language-mermaid">graph TD',
    '    A[Start] --> B{Is it working?}',
    '    B -->|Yes| C[Great!]',
    '    B -->|No| D[Debug]',
    '    D --> B',
    '    C --> E[Deploy]',
    '    E --> F[Monitor]',
    '    F --> G{All good?}',
    '    G -->|Yes| H[Done]',
    '    G -->|No| D</code></pre>',
    '<hr>',
    '<p>Use the <strong>AI Assist</strong> button in the bubble menu to polish, rewrite, or translate selected text. Open the <strong>Q&A</strong> sidebar to ask questions about your document.</p>',
  ].join('\n');

  const controller = useEditorController({
    defaultContent: content || sampleContent,
    contentFormat: 'html',
    placeholder: "Press '/' for commands or start typing...",
    editorOptions: {
      features: { codeBlock: false },
    },
    extensions: [
      CodeBlockPro.configure({
        lowlight,
        locale: 'en',
        defaultLanguage: 'javascript',
        theme: 'auto',
      }),
      DragHandle,
      FileUpload.configure({
        storageMode: 'memory',
      }),
      Placeholder.configure({
        placeholder: "Press '/' for commands or start typing...",
        emptyEditorClass: 'is-editor-empty',
      }),
      Autocompletion.configure({
        fetchSuggestion: async (text) => {
          const res = await generateContent(text, {
            systemInstruction: "You are an AI completion assistant. Predict the next logical words to complete the current thought. ONLY output the continuation text. Do NOT include quotes, do NOT repeat the existing text. Keep it brief (max 15 words). Output EXACTLY the characters that should immediately follow.",
          });
          return res;
        },
      }),
    ],
    onReady: (editor) => {
      setEditorInstance(editor);
      if (editorRef) {
        editorRef.current = editor;
      }
    },
  });

  const editor = editorInstance;

  // Forward text updates to parent
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const handleUpdate = () => {
      const text = editor.getText();
      onTextUpdateRef.current?.(text);
      onChangeRef.current?.(editor.getHTML(), text);
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const handleSelChange = () => {
      if (editor.state.selection.empty) setShowAiActions(false);
    };
    editor.on('selectionUpdate', handleSelChange);
    return () => { editor.off('selectionUpdate', handleSelChange); };
  }, [editor]);

  const handleAiAction = useCallback(async (action: AIAction) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    if (!selectedText) return;

    setSavedSelection({ from, to });
    setIsLoading(true);
    setShowAiActions(false);
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
  }, [editor]);

  const applyChanges = () => {
    if (!editor || !savedSelection || !streamingText) return;
    editor.chain().focus()
      .deleteRange(savedSelection)
      .insertContentAt(savedSelection.from, streamingText)
      .run();
    setShowPreview(false);
    setStreamingText('');
    setSavedSelection(null);
  };

  const closePreview = () => {
    setShowPreview(false);
    setStreamingText('');
    setSavedSelection(null);
  };

  const aiActionSection = editor ? {
    key: 'ai-assist',
    placement: 'start' as const,
    render: (ed: TiptapEditor) => (
      <AiAssistDropdown
        editor={ed}
        onAction={handleAiAction}
        isOpen={showAiActions}
        onOpenChange={setShowAiActions}
      />
    ),
  } : null;

  return (
    <div className="relative w-full max-w-6xl mx-auto mt-12 bg-white rounded-2xl shadow-sm p-6 sm:p-8 flex flex-col" style={{ minHeight: 'calc(100vh - 160px)' }}>
      <EditorComponent
        controller={controller}
        ui={{
          bubbleMenu: {
            customSections: aiActionSection ? [aiActionSection] : [],
          },
        }}
      />

      {/* AI Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10">
          <div className="bg-white shadow-2xl border border-slate-200 rounded-xl overflow-hidden w-[400px] max-h-[60vh] flex flex-col">
            <div className="p-3 border-b border-slate-100 font-medium flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center text-sm text-slate-700">
                <Sparkles className="w-4 h-4 mr-1.5" />
                AI Preview
                {isLoading && <Loader2 className="w-3 h-3 ml-2 animate-spin" />}
              </div>
            </div>
            <div className="p-4 text-sm text-slate-700 overflow-y-auto whitespace-pre-wrap flex-1">
              {streamingText || (isLoading ? 'Thinking...' : '')}
            </div>
            {!isLoading && streamingText && (
              <div className="flex items-center justify-end p-3 border-t border-slate-100 bg-slate-50 gap-2">
                <button
                  onClick={closePreview}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors flex items-center"
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
        </div>
      )}

      <div className="absolute right-6 bottom-6 flex items-center gap-2 pointer-events-none transition-opacity">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-md rounded-full border border-slate-200/60 shadow-sm text-xs font-medium text-slate-500">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Press <kbd className="px-1.5 py-0.5 text-slate-600 bg-slate-100 rounded border border-slate-200 mx-0.5 font-sans font-semibold">Tab</kbd> to autocomplete</span>
        </div>
      </div>
    </div>
  );
}

function AiAssistDropdown({ editor, onAction, isOpen, onOpenChange }: {
  editor: TiptapEditor;
  onAction: (action: AIAction) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const aiOptions = [
    { key: 'polish', label: '润色 (Polish)', icon: <WandSparkles size={14} />, action: 'polish' as const },
    { key: 'rewrite', label: '重写 (Rewrite)', icon: <PenLine size={14} />, action: 'rewrite' as const },
    { key: 'expand', label: '扩写 (Expand)', icon: <Expand size={14} />, action: 'expand' as const },
    { key: 'shorten', label: '缩写 (Shorten)', icon: <Shrink size={14} />, action: 'shorten' as const },
    { key: 'translate', label: '翻译 (Translate)', icon: <Languages size={14} />, action: 'translate' as const },
  ];

  return (
    <BubbleMenuSelect
      ariaLabel="AI Assist"
      open={isOpen}
      onOpenChange={onOpenChange}
      options={aiOptions.map(opt => ({
        key: opt.key,
        label: opt.label,
        icon: opt.icon,
        onSelect: () => onAction(opt.action),
      }))}
    >
      <Sparkles size={14} />
      <span style={{ marginLeft: 4 }}>AI Assist</span>
    </BubbleMenuSelect>
  );
}
