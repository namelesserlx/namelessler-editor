import { readErrorMessage, readServerSentEvents } from '../stream';
import type { AiAdapter, AiGenerateInput } from '../types';

interface DeepSeekChoice {
    message?: {
        content?: string;
    };
    delta?: {
        content?: string;
    };
}

interface DeepSeekResponse {
    choices?: DeepSeekChoice[];
}

function toDeepSeekBody(model: string, input: AiGenerateInput, stream: boolean) {
    return {
        model,
        stream,
        messages: [
            ...(input.systemInstruction
                ? [{ role: 'system' as const, content: input.systemInstruction }]
                : []),
            { role: 'user' as const, content: input.prompt },
        ],
    };
}

export function createDeepSeekAdapter(apiKey: string, model: string): AiAdapter {
    const request = async (input: AiGenerateInput, stream: boolean) => {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            signal: input.signal,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(toDeepSeekBody(model, input, stream)),
        });

        if (!response.ok) {
            throw new Error(await readErrorMessage(response));
        }

        return response;
    };

    return {
        async generateText(input) {
            const response = await request(input, false);
            const body = (await response.json()) as DeepSeekResponse;
            return body.choices?.[0]?.message?.content ?? '';
        },
        async *streamText(input) {
            const response = await request(input, true);
            if (!response.body) {
                throw new Error('Streaming response is not supported');
            }

            for await (const chunk of readServerSentEvents<DeepSeekResponse>(response.body)) {
                const text = chunk.choices?.[0]?.delta?.content;
                if (text) {
                    yield { text };
                }
            }
        },
    };
}
