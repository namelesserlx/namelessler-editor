import { getDefaultAiSettings } from './providers';
import type { AiProvider, AiSettings } from './types';

const STORAGE_KEY = 'namelessler-editor-playground-ai-settings-v1';

function canUseSessionStorage() {
    return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function normalizeSettings(value: Partial<AiSettings> | null): AiSettings | null {
    if (!value || (value.provider !== 'google' && value.provider !== 'deepseek')) {
        return null;
    }

    const defaults = getDefaultAiSettings(value.provider);

    return {
        provider: value.provider,
        model:
            typeof value.model === 'string' && value.model.trim()
                ? value.model.trim()
                : defaults.model,
        apiKey: typeof value.apiKey === 'string' ? value.apiKey.trim() : '',
    };
}

export function loadAiSettings(): AiSettings | null {
    if (!canUseSessionStorage()) {
        return null;
    }

    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return null;
    }

    try {
        return normalizeSettings(JSON.parse(raw) as Partial<AiSettings>);
    } catch {
        return null;
    }
}

export function saveAiSettings(settings: AiSettings) {
    if (!canUseSessionStorage()) {
        return;
    }

    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function clearAiSettings() {
    if (!canUseSessionStorage()) {
        return;
    }

    window.sessionStorage.removeItem(STORAGE_KEY);
}

export function hasAiSettings(settings = loadAiSettings()) {
    return Boolean(settings?.apiKey && settings.model && settings.provider);
}

export function createSettingsForProvider(provider: AiProvider, current?: AiSettings | null) {
    const defaults = getDefaultAiSettings(provider);

    return {
        provider,
        model: current?.provider === provider && current.model ? current.model : defaults.model,
        apiKey: current?.provider === provider ? current.apiKey : '',
    };
}
