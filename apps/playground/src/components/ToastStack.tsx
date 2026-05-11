import { X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ToastMessage {
    id: string;
    title: string;
    description?: string;
    variant?: 'default' | 'error';
}

interface ToastStackProps {
    messages: ToastMessage[];
    onDismiss: (id: string) => void;
}

export function ToastStack({ messages, onDismiss }: ToastStackProps) {
    if (messages.length === 0) {
        return null;
    }

    return (
        <div className="fixed right-4 top-16 z-[80] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
            {messages.map((message) => (
                <div
                    key={message.id}
                    className={cn(
                        'rounded-lg border bg-white px-3 py-2.5 text-sm shadow-lg',
                        message.variant === 'error'
                            ? 'border-red-200 text-red-950 shadow-red-950/5'
                            : 'border-slate-200 text-slate-900',
                    )}
                >
                    <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="font-medium leading-5">{message.title}</div>
                            {message.description ? (
                                <div className="mt-0.5 text-xs leading-5 text-slate-500">
                                    {message.description}
                                </div>
                            ) : null}
                        </div>
                        <button
                            type="button"
                            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Dismiss notification"
                            onClick={() => onDismiss(message.id)}
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
