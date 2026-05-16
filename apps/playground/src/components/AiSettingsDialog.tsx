import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, KeyRound, Loader2, Settings2 } from 'lucide-react';
import {
    AI_PROVIDER_OPTIONS,
    clearAiSettings,
    createAiAdapter,
    createSettingsForProvider,
    loadAiSettings,
    saveAiSettings,
    type AiProvider,
    type AiSettings,
} from '../services/aiService';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { cn } from '../lib/utils';
import type { ToastMessage } from './ToastStack';

interface AiSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: (settings: AiSettings | null) => void;
    onNotify?: (message: Omit<ToastMessage, 'id'>) => void;
}

function getConnectionErrorDescription(error: unknown, t: ReturnType<typeof useTranslation>['t']) {
    if (error instanceof Error) {
        if (error.message === 'Failed to fetch') {
            return t('aiSettings.failedFetch');
        }

        return error.message;
    }

    return t('aiSettings.genericConnectionError');
}

export function AiSettingsDialog({ open, onOpenChange, onSaved, onNotify }: AiSettingsDialogProps) {
    const { t } = useTranslation();
    const [settings, setSettings] = useState<AiSettings>(() => {
        return loadAiSettings() ?? createSettingsForProvider('google');
    });
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const testAbortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        return () => {
            testAbortRef.current?.abort();
            testAbortRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (open) {
            setSettings(loadAiSettings() ?? createSettingsForProvider('google'));
            return;
        }

        testAbortRef.current?.abort();
        testAbortRef.current = null;
        setIsTestingConnection(false);
    }, [open]);

    const currentProvider = AI_PROVIDER_OPTIONS.find((option) => option.id === settings.provider);
    const canSave = Boolean(settings.apiKey.trim() && settings.model.trim());

    const updateProvider = (provider: AiProvider) => {
        setSettings((current) => createSettingsForProvider(provider, current));
    };

    const save = () => {
        const nextSettings = {
            ...settings,
            model: settings.model.trim(),
            apiKey: settings.apiKey.trim(),
        };
        saveAiSettings(nextSettings);
        onSaved(nextSettings);
        onOpenChange(false);
    };

    const clear = () => {
        clearAiSettings();
        const nextSettings = createSettingsForProvider(settings.provider);
        setSettings(nextSettings);
        onSaved(null);
    };

    const testConnection = async () => {
        const nextSettings = {
            ...settings,
            model: settings.model.trim(),
            apiKey: settings.apiKey.trim(),
        };

        if (!nextSettings.apiKey || !nextSettings.model) {
            onNotify?.({
                title: t('aiSettings.connectionNotReady'),
                description: t('aiSettings.connectionNotReadyDescription'),
                variant: 'error',
            });
            return;
        }

        testAbortRef.current?.abort();
        const controller = new AbortController();
        testAbortRef.current = controller;
        setIsTestingConnection(true);

        try {
            const adapter = createAiAdapter(nextSettings);
            await adapter.generateText({
                prompt: 'Reply with exactly: ok',
                systemInstruction:
                    'You are checking whether an AI configuration can receive a request. Return one short word.',
                signal: controller.signal,
            });

            if (controller.signal.aborted) {
                return;
            }

            onNotify?.({
                title: t('aiSettings.connectionVerified'),
                description: `${currentProvider?.label ?? nextSettings.provider} · ${nextSettings.model}`,
            });
        } catch (error) {
            if (controller.signal.aborted) {
                return;
            }

            onNotify?.({
                title: t('aiSettings.connectionFailed'),
                description: getConnectionErrorDescription(error, t),
                variant: 'error',
            });
        } finally {
            if (testAbortRef.current === controller) {
                testAbortRef.current = null;
                setIsTestingConnection(false);
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[92vw] gap-0 overflow-hidden border-border/80 p-0 shadow-2xl sm:max-w-lg">
                <DialogHeader className="border-b bg-muted/30 px-5 py-4">
                    <DialogTitle className="flex items-center gap-2 text-base text-foreground">
                        <span className="inline-flex size-7 items-center justify-center rounded-lg border bg-background shadow-xs">
                            <Settings2 className="h-4 w-4" />
                        </span>
                        {t('aiSettings.title')}
                    </DialogTitle>
                    <DialogDescription>{t('aiSettings.description')}</DialogDescription>
                </DialogHeader>

                <div className="grid gap-5 px-5 py-5">
                    <div className="grid gap-2">
                        <Label>{t('aiSettings.provider')}</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {AI_PROVIDER_OPTIONS.map((provider) => {
                                const active = settings.provider === provider.id;

                                return (
                                    <button
                                        key={provider.id}
                                        type="button"
                                        className={cn(
                                            'flex h-12 items-center justify-between rounded-lg border px-3 text-left text-sm transition focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                                            active
                                                ? 'border-foreground bg-foreground text-background shadow-sm'
                                                : 'border-border bg-background text-foreground hover:bg-muted/60',
                                        )}
                                        onClick={() => updateProvider(provider.id)}
                                    >
                                        <span className="font-medium">{provider.label}</span>
                                        {active ? <Check className="h-4 w-4" /> : null}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="ai-model">{t('aiSettings.model')}</Label>
                        <Input
                            id="ai-model"
                            value={settings.model}
                            className="font-mono"
                            onChange={(event) =>
                                setSettings((current) => ({
                                    ...current,
                                    model: event.target.value,
                                }))
                            }
                        />
                        <div className="flex flex-wrap gap-1.5">
                            {currentProvider?.models.map((model) => (
                                <Button
                                    key={model}
                                    type="button"
                                    size="xs"
                                    variant={settings.model === model ? 'secondary' : 'outline'}
                                    onClick={() =>
                                        setSettings((current) => ({
                                            ...current,
                                            model,
                                        }))
                                    }
                                >
                                    {model}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <div className="flex items-center justify-between gap-3">
                            <Label htmlFor="ai-api-key">{t('aiSettings.apiKey')}</Label>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-xs"
                                disabled={isTestingConnection}
                                onClick={testConnection}
                            >
                                {isTestingConnection ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : null}
                                {t('aiSettings.testConnection')}
                            </Button>
                        </div>
                        <div className="relative">
                            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="ai-api-key"
                                className="pl-9"
                                type="password"
                                value={settings.apiKey}
                                placeholder={t('aiSettings.apiKeyPlaceholder')}
                                onChange={(event) =>
                                    setSettings((current) => ({
                                        ...current,
                                        apiKey: event.target.value,
                                    }))
                                }
                            />
                        </div>
                    </div>

                    <p className="rounded-lg border bg-muted/40 px-3 py-2 text-xs leading-5 text-muted-foreground">
                        {t('aiSettings.sessionNotice')}
                    </p>
                </div>

                <DialogFooter className="mx-0 mb-0 flex-row items-center justify-between border-t border-border/70 bg-background px-5 py-4 sm:justify-between">
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="px-2 text-muted-foreground hover:text-foreground"
                        onClick={clear}
                    >
                        {t('aiSettings.clearConfiguration')}
                    </Button>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="min-w-20"
                            onClick={() => onOpenChange(false)}
                        >
                            {t('aiSettings.cancel')}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            className="min-w-20"
                            disabled={!canSave}
                            onClick={save}
                        >
                            {t('aiSettings.save')}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
