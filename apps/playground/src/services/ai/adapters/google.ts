import { readErrorMessage, readServerSentEvents } from '../stream';
import type { AiAdapter, AiGenerateInput } from '../types';

interface GoogleCandidate {
    content?: {
        parts?: Array<{ text?: string }>;
    };
}

interface GoogleResponse {
    candidates?: GoogleCandidate[];
}

function toGoogleBody(input: AiGenerateInput) {
    return {
        contents: [
            {
                role: 'user',
                parts: [{ text: input.prompt }],
            },
        ],
        ...(input.systemInstruction
            ? {
                  systemInstruction: {
                      parts: [{ text: input.systemInstruction }],
                  },
              }
            : {}),
    };
}

function readGoogleText(response: GoogleResponse) {
    return response.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
}

export function createGoogleAdapter(apiKey: string, model: string): AiAdapter {
    const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`;

    const request = async (path: string, input: AiGenerateInput) => {
        const response = await fetch(`${baseUrl}:${path}`, {
            method: 'POST',
            signal: input.signal,
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
            },
            body: JSON.stringify(toGoogleBody(input)),
        });

        if (!response.ok) {
            throw new Error(await readErrorMessage(response));
        }

        return response;
    };

    return {
        async generateText(input) {
            const response = await request('generateContent', input);
            return readGoogleText((await response.json()) as GoogleResponse);
        },
        async *streamText(input) {
            const response = await request('streamGenerateContent?alt=sse', input);
            if (!response.body) {
                throw new Error('Streaming response is not supported');
            }

            for await (const chunk of readServerSentEvents<GoogleResponse>(response.body)) {
                const text = readGoogleText(chunk);
                if (text) {
                    yield { text };
                }
            }
        },
    };
}
