import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

const getAi = () => {
    if (!aiInstance) {
        // Vite replaces this value at build time from GEMINI_API_KEY.
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is required');
        }
        aiInstance = new GoogleGenAI({ apiKey });
    }
    return aiInstance;
};

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
    return response.text ?? '';
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
