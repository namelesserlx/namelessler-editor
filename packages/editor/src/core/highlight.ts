import { createLowlight, type LanguageFn } from 'lowlight';

export interface EditorHighlightLanguage {
    name: string;
    label?: string;
    aliases?: string[];
    grammar: LanguageFn;
}

export type EditorLowlightRegistry = ReturnType<typeof createLowlight>;

export function createLowlightRegistry(
    languages: EditorHighlightLanguage[] = [],
): EditorLowlightRegistry {
    const lowlight = createLowlight();

    languages.forEach((language) => {
        lowlight.register(language.name, language.grammar);

        if (language.aliases?.length) {
            lowlight.registerAlias(language.name, language.aliases);
        }
    });

    return lowlight;
}

export function toCodeBlockLanguageConfig(languages: EditorHighlightLanguage[]) {
    return languages.map((language) => ({
        value: language.name,
        label: language.label ?? language.name,
        aliases: language.aliases,
    }));
}
