import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const geminiApiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    return {
        plugins: [react(), tailwindcss()],
        define: {
            'process.env.GEMINI_API_KEY': JSON.stringify(geminiApiKey),
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        server: {
            port: 5173,
            strictPort: true,
        },
    };
});
