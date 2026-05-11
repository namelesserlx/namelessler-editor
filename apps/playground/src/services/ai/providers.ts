import type { AiProvider, AiProviderOption } from './types';

export const AI_PROVIDER_OPTIONS: AiProviderOption[] = [
    {
        id: 'google',
        label: 'Google Gemini',
        defaultModel: 'gemini-2.5-flash',
        models: ['gemini-2.5-flash', 'gemini-2.5-pro'],
    },
    {
        id: 'deepseek',
        label: 'DeepSeek',
        defaultModel: 'deepseek-v4-flash',
        models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    },
];

export function getAiProviderOption(provider: AiProvider) {
    return AI_PROVIDER_OPTIONS.find((option) => option.id === provider) ?? AI_PROVIDER_OPTIONS[0];
}

export function getDefaultAiSettings(provider: AiProvider = 'google') {
    const option = getAiProviderOption(provider);

    return {
        provider,
        model: option.defaultModel,
        apiKey: '',
    };
}
