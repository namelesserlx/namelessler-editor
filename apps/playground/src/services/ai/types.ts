export type AiProvider = 'google' | 'deepseek';

export interface AiProviderOption {
    id: AiProvider;
    label: string;
    defaultModel: string;
    models: string[];
}

export interface AiSettings {
    provider: AiProvider;
    model: string;
    apiKey: string;
}

export interface AiGenerateInput {
    prompt: string;
    systemInstruction?: string;
    usePro?: boolean;
    signal?: AbortSignal;
}

export interface AiTextChunk {
    text: string;
}

export interface AiAdapter {
    generateText(input: AiGenerateInput): Promise<string>;
    streamText(input: AiGenerateInput): AsyncIterable<AiTextChunk>;
}

export class AiConfigurationError extends Error {
    constructor(message = 'AI provider is not configured') {
        super(message);
        this.name = 'AiConfigurationError';
    }
}
