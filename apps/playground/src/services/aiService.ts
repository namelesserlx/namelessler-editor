import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

const getAi = () => {
    if (!aiInstance) {
        // In Vite, use import.meta.env, but also fallback to process.env for Node compatibility during build setup if needed
        // Note: The system automatically injects GEMINI_API_KEY into process.env in the vite config
        const apiKey =
            process.env.GEMINI_API_KEY ||
            (import.meta.env as Record<string, string | undefined>).VITE_GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is required');
        }
        aiInstance = new GoogleGenAI({ apiKey });
    }
    return aiInstance;
};

// Common models
const FAST_MODEL = 'gemini-2.5-flash';
const PRO_MODEL = 'gemini-2.5-flash';

interface GenerateOptions {
    systemInstruction?: string;
    usePro?: boolean;
}

export const generateContent = async (prompt: string, options?: GenerateOptions) => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: options?.usePro ? PRO_MODEL : FAST_MODEL,
        contents: prompt,
        config: options?.systemInstruction
            ? {
                  systemInstruction: options.systemInstruction,
              }
            : undefined,
    });
    return response.text;
};

export const generateContentStream = async (prompt: string, options?: GenerateOptions) => {
    const ai = getAi();
    return await ai.models.generateContentStream({
        model: options?.usePro ? PRO_MODEL : FAST_MODEL,
        contents: prompt,
        config: options?.systemInstruction
            ? {
                  systemInstruction: options.systemInstruction,
              }
            : undefined,
    });
};
