export async function* readServerSentEvents<T>(
    body: ReadableStream<Uint8Array>,
): AsyncGenerator<T> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });

        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const event of events) {
            const payload = event
                .split('\n')
                .filter((line) => line.startsWith('data:'))
                .map((line) => line.slice(5).trim())
                .join('\n');

            if (!payload || payload === '[DONE]') {
                continue;
            }

            yield JSON.parse(payload) as T;
        }

        if (done) {
            break;
        }
    }

    const payload = buffer
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('\n');

    if (payload && payload !== '[DONE]') {
        yield JSON.parse(payload) as T;
    }
}

export async function readErrorMessage(response: Response) {
    try {
        const body = (await response.json()) as {
            error?: string | { message?: string };
            message?: string;
        };

        if (typeof body.error === 'string') {
            return body.error;
        }

        return body.error?.message || body.message || response.statusText;
    } catch {
        return response.statusText;
    }
}
