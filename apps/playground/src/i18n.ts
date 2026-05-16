import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const SUPPORTED_LANGUAGES = ['en-US', 'zh-CN'] as const;
export type PlaygroundLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export type EditorLocale = PlaygroundLanguage;

const LANGUAGE_STORAGE_KEY = 'namelessler-playground-language';
const DEFAULT_LANGUAGE: PlaygroundLanguage = 'en-US';

export function resolvePlaygroundLanguage(language?: string | null): PlaygroundLanguage {
    if (!language) {
        return DEFAULT_LANGUAGE;
    }

    return language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US';
}

function getStoredLanguage(): PlaygroundLanguage | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const stored = window.localStorage?.getItem(LANGUAGE_STORAGE_KEY);
        return stored ? resolvePlaygroundLanguage(stored) : null;
    } catch {
        return null;
    }
}

function getBrowserLanguage(): PlaygroundLanguage {
    if (typeof navigator === 'undefined') {
        return DEFAULT_LANGUAGE;
    }

    const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
    return resolvePlaygroundLanguage(candidates.find(Boolean));
}

function setDocumentLanguage(language: PlaygroundLanguage) {
    if (typeof document !== 'undefined') {
        document.documentElement.lang = language;
    }
}

const initialLanguage = getStoredLanguage() ?? getBrowserLanguage();

const resources = {
    'en-US': {
        translation: {
            app: {
                title: 'Editor Playground',
                viewSource: 'View source',
                aiSettings: 'AI Settings',
                qaSummary: 'Q&A / Summary',
                languageLabel: 'Language',
                languageEnglish: 'English',
                languageChinese: 'Chinese',
                aiConfigured: 'AI configured',
                aiConfigurationCleared: 'AI configuration cleared',
            },
            editor: {
                placeholder: "Press '/' for commands or start typing...",
                autocompleteHint: 'Press <keycap>{{key}}</keycap> to autocomplete',
                aiPreview: 'AI Preview',
                closeAiPreview: 'Close AI preview',
                thinking: 'Thinking...',
                close: 'Close',
                discard: 'Discard',
                replaceSelection: 'Replace selection',
                aiNotConfigured: 'AI interface is not configured',
                aiNotConfiguredDescription: 'Choose Google or DeepSeek and add your own API key.',
                openAiSettingsDescription: 'Open AI Settings and add your own API key.',
                aiRequestFailed: 'AI request failed',
                checkProviderDescription: 'Please check the provider, model, and API key.',
                aiAssist: 'AI Assist',
                actions: {
                    polish: 'Polish',
                    rewrite: 'Rewrite',
                    expand: 'Expand',
                    shorten: 'Shorten',
                    translate: 'Translate',
                },
            },
            aiSettings: {
                title: 'AI Provider',
                description: 'Bring your own Google or DeepSeek key for this playground session.',
                provider: 'Provider',
                model: 'Model',
                apiKey: 'API Key',
                apiKeyPlaceholder: 'Paste your API key',
                testConnection: 'Test connection',
                clearConfiguration: 'Clear configuration',
                cancel: 'Cancel',
                save: 'Save',
                sessionNotice:
                    'This demo ships with no default AI key. Your key stays in this browser tab session and is used only for requests you start here.',
                connectionNotReady: 'AI connection not ready',
                connectionNotReadyDescription: 'Enter an API key and model before testing.',
                connectionVerified: 'AI connection verified',
                connectionFailed: 'AI connection failed',
                failedFetch:
                    'Request failed. Check the key, model, network, or browser CORS support.',
                genericConnectionError: 'Please check the API key, model, and network connection.',
            },
            qa: {
                title: 'Document Q&A',
                resizeLabel: 'Resize Document Q&A panel',
                initialMessage:
                    'Hi, I am your AI assistant. Ask a question about this document, or ask me to summarize it.',
                emptyDocument: 'The document is empty. Add content before asking for a summary.',
                emptyDocumentTitle: 'Document content is empty',
                emptyDocumentDescription: 'Add document content before using AI Q&A or summary.',
                summarize: 'Summarize document',
                summarizePrompt: 'Summarize this document in one sentence.',
                placeholder: 'Ask a question...',
                submit: 'Send question',
                answerFailed: 'Sorry, I encountered an error answering that.',
                systemInstruction:
                    "You are a helpful AI assistant. Answer the user's question strictly based on the provided document context. If the answer is not in the document, politely say so. Answer in the same language as the user's question. Do not rewrite, restate, or replace the user's question. Prefer concise paragraphs and short lists.",
            },
            export: {
                title: 'View Source Code',
                description: 'View document content as Markdown, JSON, or HTML.',
                empty: 'Empty content',
            },
            toast: {
                dismiss: 'Dismiss notification',
            },
        },
    },
    'zh-CN': {
        translation: {
            app: {
                title: '编辑器示例',
                viewSource: '查看源码',
                aiSettings: 'AI 设置',
                qaSummary: '问答 / 总结',
                languageLabel: '语言',
                languageEnglish: '英文',
                languageChinese: '中文',
                aiConfigured: 'AI 已配置',
                aiConfigurationCleared: 'AI 配置已清除',
            },
            editor: {
                placeholder: "输入内容，或按 '/' 打开命令菜单...",
                autocompleteHint: '按 <keycap>{{key}}</keycap> 自动补全',
                aiPreview: 'AI 预览',
                closeAiPreview: '关闭 AI 预览',
                thinking: '思考中...',
                close: '关闭',
                discard: '放弃',
                replaceSelection: '替换选区',
                aiNotConfigured: 'AI 接口未配置',
                aiNotConfiguredDescription: '请选择 Google 或 DeepSeek，并填写你自己的 API Key。',
                openAiSettingsDescription: '打开 AI 设置并填写你自己的 API Key。',
                aiRequestFailed: 'AI 请求失败',
                checkProviderDescription: '请检查服务商、模型和 API Key。',
                aiAssist: 'AI 助手',
                actions: {
                    polish: '润色',
                    rewrite: '重写',
                    expand: '扩写',
                    shorten: '缩写',
                    translate: '翻译',
                },
            },
            aiSettings: {
                title: 'AI 服务商',
                description: '为当前示例会话配置你自己的 Google 或 DeepSeek API Key。',
                provider: '服务商',
                model: '模型',
                apiKey: 'API Key',
                apiKeyPlaceholder: '粘贴你的 API Key',
                testConnection: '测试连接',
                clearConfiguration: '清除配置',
                cancel: '取消',
                save: '保存',
                sessionNotice:
                    '这个示例不会内置默认 AI Key。你的 Key 仅保存在当前浏览器标签页会话中，只会用于你主动发起的请求。',
                connectionNotReady: 'AI 连接尚未准备好',
                connectionNotReadyDescription: '测试前请先填写 API Key 和模型。',
                connectionVerified: 'AI 连接已验证',
                connectionFailed: 'AI 连接失败',
                failedFetch: '请求失败，请检查 Key、模型、网络或浏览器 CORS 支持。',
                genericConnectionError: '请检查 API Key、模型和网络连接。',
            },
            qa: {
                title: '文档问答',
                resizeLabel: '调整文档问答面板宽度',
                initialMessage: '你好，我是 AI 助手。你可以就这篇文档提问，也可以让我总结全文。',
                emptyDocument: '文档内容为空，无法总结。请先输入有效内容。',
                emptyDocumentTitle: '文档内容为空',
                emptyDocumentDescription: '请先添加文档内容，再使用 AI 问答或总结。',
                summarize: '总结全文',
                summarizePrompt: '请用一句话总结这篇文档的内容。',
                placeholder: '输入你的问题...',
                submit: '发送问题',
                answerFailed: '抱歉，回答时遇到了错误。',
                systemInstruction:
                    '你是一个可靠的 AI 助手。请严格基于给定的文档内容回答用户问题。如果文档里没有答案，请礼貌说明。回答语言应与用户问题一致。不要改写、复述或替换用户问题。优先使用简洁段落和短列表。',
            },
            export: {
                title: '查看源码',
                description: '以 Markdown、JSON 或 HTML 查看当前文档内容。',
                empty: '暂无内容',
            },
            toast: {
                dismiss: '关闭通知',
            },
        },
    },
} as const;

i18n.use(initReactI18next).init({
    resources,
    lng: initialLanguage,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: {
        escapeValue: false,
    },
    react: {
        useSuspense: false,
    },
});

setDocumentLanguage(initialLanguage);

i18n.on('languageChanged', (language) => {
    const resolvedLanguage = resolvePlaygroundLanguage(language);

    setDocumentLanguage(resolvedLanguage);
    if (typeof window !== 'undefined') {
        try {
            window.localStorage?.setItem(LANGUAGE_STORAGE_KEY, resolvedLanguage);
        } catch {
            // Language switching should still work in private or storage-restricted contexts.
        }
    }
});

export default i18n;
