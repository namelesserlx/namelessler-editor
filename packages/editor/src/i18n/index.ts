import { DEFAULT_EDITOR_LOCALE, editorMessages } from './messages';
import type { EditorLocale, EditorMessages } from './types';

function isEditorLocale(locale: string): locale is EditorLocale {
    return locale === 'en-US' || locale === 'zh-CN';
}

export function resolveEditorMessages(locale: EditorLocale): EditorMessages {
    const resolvedLocale = isEditorLocale(locale) ? locale : DEFAULT_EDITOR_LOCALE;

    return editorMessages[resolvedLocale];
}

export { DEFAULT_EDITOR_LOCALE, SUPPORTED_EDITOR_LOCALES, editorMessages } from './messages';
export type { EditorLocale, EditorMessages } from './types';
