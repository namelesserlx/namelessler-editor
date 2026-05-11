import { createConfiguredAiAdapter } from './createAiAdapter';
import type { AiGenerateInput } from './types';

export { createAiAdapter, createConfiguredAiAdapter } from './createAiAdapter';
export { AI_PROVIDER_OPTIONS, getAiProviderOption, getDefaultAiSettings } from './providers';
export {
    clearAiSettings,
    createSettingsForProvider,
    hasAiSettings,
    loadAiSettings,
    saveAiSettings,
} from './storage';
export type { AiProvider, AiSettings, AiTextChunk } from './types';
export { AiConfigurationError } from './types';

export const generateContent = async (
    prompt: string,
    options?: Omit<AiGenerateInput, 'prompt'>,
) => {
    const adapter = createConfiguredAiAdapter();
    return adapter.generateText({ prompt, ...options });
};

export const generateContentStream = async (
    prompt: string,
    options?: Omit<AiGenerateInput, 'prompt'>,
) => {
    const adapter = createConfiguredAiAdapter();
    return adapter.streamText({ prompt, ...options });
};
