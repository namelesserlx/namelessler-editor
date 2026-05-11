import { createDeepSeekAdapter } from './adapters/deepseek';
import { createGoogleAdapter } from './adapters/google';
import { loadAiSettings } from './storage';
import type { AiAdapter, AiSettings } from './types';
import { AiConfigurationError } from './types';

export function createAiAdapter(settings: AiSettings): AiAdapter {
    if (!settings.apiKey || !settings.model) {
        throw new AiConfigurationError();
    }

    if (settings.provider === 'deepseek') {
        return createDeepSeekAdapter(settings.apiKey, settings.model);
    }

    return createGoogleAdapter(settings.apiKey, settings.model);
}

export function createConfiguredAiAdapter(settings = loadAiSettings()) {
    if (!settings?.apiKey) {
        throw new AiConfigurationError();
    }

    return createAiAdapter(settings);
}
