import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const AutocompletionKey = new PluginKey('autocompletion');

export interface AutocompletionOptions {
    fetchSuggestion: (text: string, signal?: AbortSignal) => Promise<string>;
}

const CONTEXT_WINDOW = 2000;

function normalizeForRepeatCheck(text: string) {
    return text.replace(/\s+/g, '').toLowerCase();
}

function removeRepeatedPrefix(context: string, suggestion: string) {
    const trimmedContext = context.trimEnd();
    let nextSuggestion = suggestion.trimStart();

    if (!trimmedContext || !nextSuggestion) {
        return suggestion;
    }

    if (nextSuggestion.startsWith(trimmedContext)) {
        nextSuggestion = nextSuggestion.slice(trimmedContext.length);
    } else {
        const maxOverlap = Math.min(trimmedContext.length, nextSuggestion.length);
        for (let length = maxOverlap; length >= 8; length -= 1) {
            if (trimmedContext.endsWith(nextSuggestion.slice(0, length))) {
                nextSuggestion = nextSuggestion.slice(length);
                break;
            }
        }
    }

    return nextSuggestion ? nextSuggestion.replace(/^(\n| )+/, ' ') : '';
}

function cleanSuggestionText(suggestion: string, context: string) {
    const withoutRepeatedPrefix = removeRepeatedPrefix(context, suggestion);
    const cleanSuggestion = withoutRepeatedPrefix.replace(/^(\n| )+/, ' ');
    const normalizedSuggestion = normalizeForRepeatCheck(cleanSuggestion);

    if (!normalizedSuggestion) {
        return '';
    }

    const normalizedContext = normalizeForRepeatCheck(context);
    if (
        normalizedContext.endsWith(normalizedSuggestion) ||
        (normalizedSuggestion.length >= 12 && normalizedContext.includes(normalizedSuggestion))
    ) {
        return '';
    }

    return cleanSuggestion;
}

export const Autocompletion = Extension.create<AutocompletionOptions>({
    name: 'autocompletion',

    addOptions() {
        return {
            fetchSuggestion: async () => '',
        };
    },

    addProseMirrorPlugins() {
        const fetchSuggestion = this.options.fetchSuggestion;
        let timeout: ReturnType<typeof setTimeout> | null = null;
        let activeRequest = 0;
        let activeAbortController: AbortController | null = null;
        let activeRequestText: string | null = null;
        let cooldownUntil = 0; // timestamp when we can retry after 429
        const suggestionCache = new Map<string, string>();

        // Circuit breaker: if we get a 429, stop for the specified time
        const QUOTA_COOLDOWN_MS = 60_000; // 1 minute cooldown after quota error
        // How long to wait for a non-cached suggestion
        const DEBOUNCE_MS = 1500;

        interface PluginState {
            decoration: Decoration | null;
            suggestion: string | null;
            isLoading: boolean;
        }

        const clearTimeoutIfNeeded = () => {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
        };

        const cancelActiveRequest = () => {
            if (activeAbortController) {
                activeAbortController.abort();
                activeAbortController = null;
                activeRequestText = null;
                activeRequest += 1;
            }
        };

        return [
            new Plugin({
                key: AutocompletionKey,
                state: {
                    init(): PluginState {
                        return { decoration: null, suggestion: null, isLoading: false };
                    },
                    apply(tr, value, _oldState, newState): PluginState {
                        const meta = tr.getMeta(AutocompletionKey);
                        if (meta) {
                            if (meta.type === 'setLoading') {
                                const { selection } = newState;
                                if (!selection.empty)
                                    return { decoration: null, suggestion: null, isLoading: false };

                                const ghostNode = document.createElement('span');
                                ghostNode.className =
                                    'inline-flex items-center gap-1 ml-1 align-middle text-slate-300 pointer-events-none select-none';
                                ghostNode.innerHTML = `
                  <span class="w-1.5 h-1.5 rounded-full bg-current opacity-40 animate-pulse" style="animation-duration: 1s; animation-delay: 0ms"></span>
                  <span class="w-1.5 h-1.5 rounded-full bg-current opacity-40 animate-pulse" style="animation-duration: 1s; animation-delay: 200ms"></span>
                  <span class="w-1.5 h-1.5 rounded-full bg-current opacity-40 animate-pulse" style="animation-duration: 1s; animation-delay: 400ms"></span>
                `;

                                const dec = Decoration.widget(selection.to, ghostNode, {
                                    side: 1,
                                });

                                return { decoration: dec, suggestion: null, isLoading: true };
                            }
                            if (meta.type === 'setSuggestion') {
                                if (!meta.suggestion) {
                                    return { decoration: null, suggestion: null, isLoading: false };
                                }
                                const { selection } = newState;
                                if (!selection.empty)
                                    return { decoration: null, suggestion: null, isLoading: false };

                                const ghostNode = document.createElement('span');
                                ghostNode.className =
                                    'text-slate-400 opacity-60 pointer-events-none select-none';
                                ghostNode.textContent = meta.suggestion;

                                const dec = Decoration.widget(selection.to, ghostNode, {
                                    side: 1,
                                });

                                return {
                                    decoration: dec,
                                    suggestion: meta.suggestion,
                                    isLoading: false,
                                };
                            }
                            if (meta.type === 'clear') {
                                return { decoration: null, suggestion: null, isLoading: false };
                            }
                        }

                        // Clear suggestion or loading if the user types or clicks away
                        if (tr.docChanged || tr.selectionSet) {
                            if (value.isLoading || value.suggestion || value.decoration) {
                                return { decoration: null, suggestion: null, isLoading: false };
                            }
                        }

                        return value;
                    },
                },
                props: {
                    decorations(state) {
                        const pluginState = AutocompletionKey.getState(state);
                        return pluginState?.decoration
                            ? DecorationSet.create(state.doc, [pluginState.decoration])
                            : DecorationSet.empty;
                    },
                    handleKeyDown(view, event) {
                        const pluginState = AutocompletionKey.getState(view.state);

                        if (pluginState?.suggestion && event.key === 'Tab') {
                            event.preventDefault();
                            event.stopPropagation();
                            view.dispatch(view.state.tr.insertText(pluginState.suggestion));
                            return true;
                        }

                        if (
                            (pluginState?.suggestion || pluginState?.isLoading) &&
                            event.key === 'Escape'
                        ) {
                            view.dispatch(
                                view.state.tr.setMeta(AutocompletionKey, { type: 'clear' }),
                            );
                            return true;
                        }

                        return false;
                    },
                },
                view() {
                    return {
                        update(view) {
                            const state = view.state;
                            const pluginState = AutocompletionKey.getState(state) as
                                | PluginState
                                | undefined;
                            clearTimeoutIfNeeded();

                            if (!state.selection.empty) {
                                cancelActiveRequest();
                                return;
                            }

                            const { from } = state.selection;
                            const text = state.doc.textBetween(
                                Math.max(0, from - CONTEXT_WINDOW),
                                from,
                                ' ',
                            );

                            // Only suggest if at the end of a block/line
                            const trailing = state.doc.textBetween(
                                from,
                                Math.min(state.doc.content.size, from + 10),
                                ' ',
                            );
                            if (trailing.trim().length > 0) {
                                cancelActiveRequest();
                                return;
                            }

                            if (!text.trim()) {
                                cancelActiveRequest();
                                return;
                            }

                            if (pluginState?.suggestion || pluginState?.isLoading) {
                                return;
                            }

                            // If in cooldown (after 429), silently skip
                            if (Date.now() < cooldownUntil) return;

                            if (activeAbortController) {
                                if (activeRequestText === text) {
                                    return;
                                }

                                cancelActiveRequest();
                            }

                            // Check cache
                            const cached = suggestionCache.get(text);
                            if (cached !== undefined) {
                                if (pluginState?.suggestion === cached || pluginState?.isLoading) {
                                    return;
                                }

                                // Use cached suggestion immediately
                                if (cached) {
                                    view.dispatch(
                                        view.state.tr.setMeta(AutocompletionKey, {
                                            type: 'setSuggestion',
                                            suggestion: cached,
                                        }),
                                    );
                                }
                                return;
                            }

                            timeout = setTimeout(() => {
                                // Re-check cooldown (might have changed during debounce)
                                if (Date.now() < cooldownUntil) return;

                                if (activeAbortController) return;

                                const currentSelection = view.state.selection;
                                if (!currentSelection.empty || currentSelection.from !== from)
                                    return;

                                const currentText = view.state.doc.textBetween(
                                    Math.max(0, currentSelection.from - CONTEXT_WINDOW),
                                    currentSelection.from,
                                    ' ',
                                );
                                if (currentText !== text) return;

                                const abortController = new AbortController();
                                activeAbortController = abortController;
                                activeRequestText = text;
                                const requestId = ++activeRequest;

                                view.dispatch(
                                    view.state.tr.setMeta(AutocompletionKey, {
                                        type: 'setLoading',
                                    }),
                                );

                                fetchSuggestion(text, abortController.signal)
                                    .then((suggestion) => {
                                        if (
                                            requestId !== activeRequest ||
                                            abortController.signal.aborted
                                        )
                                            return;

                                        const stillCurrentSelection = view.state.selection;
                                        if (
                                            !stillCurrentSelection.empty ||
                                            stillCurrentSelection.from !== from
                                        )
                                            return;

                                        const cleanSuggestion = cleanSuggestionText(
                                            suggestion,
                                            text,
                                        );
                                        // Cache the result (including empty, to avoid re-requesting)
                                        suggestionCache.set(text, cleanSuggestion);

                                        // Trim cache to avoid memory leak (keep last 50)
                                        if (suggestionCache.size > 50) {
                                            const firstKey = suggestionCache.keys().next().value;
                                            if (firstKey) suggestionCache.delete(firstKey);
                                        }

                                        if (cleanSuggestion) {
                                            view.dispatch(
                                                view.state.tr.setMeta(AutocompletionKey, {
                                                    type: 'setSuggestion',
                                                    suggestion: cleanSuggestion,
                                                }),
                                            );
                                        } else {
                                            view.dispatch(
                                                view.state.tr.setMeta(AutocompletionKey, {
                                                    type: 'clear',
                                                }),
                                            );
                                        }
                                    })
                                    .catch((err: unknown) => {
                                        if (abortController.signal.aborted) {
                                            return;
                                        }

                                        // Any API error → enter cooldown to stop hammering the API
                                        const e = err as {
                                            message?: string;
                                            code?: number;
                                            status?: number | string;
                                        };
                                        const errBody =
                                            typeof e?.message === 'string' ? e.message : '';
                                        const isQuotaError =
                                            e?.code === 429 ||
                                            e?.status === 429 ||
                                            e?.status === 'RESOURCE_EXHAUSTED' ||
                                            errBody.includes('429') ||
                                            errBody.includes('RESOURCE_EXHAUSTED') ||
                                            errBody.includes('quota') ||
                                            errBody.includes('Quota');

                                        cooldownUntil = Date.now() + QUOTA_COOLDOWN_MS;
                                        view.dispatch(
                                            view.state.tr.setMeta(AutocompletionKey, {
                                                type: 'clear',
                                            }),
                                        );

                                        if (isQuotaError) {
                                            console.warn(
                                                '[Autocompletion] Quota exceeded, cooling down',
                                                QUOTA_COOLDOWN_MS / 1000,
                                                's',
                                            );
                                        } else {
                                            console.error(
                                                '[Autocompletion] Error, cooling down',
                                                err,
                                            );
                                        }
                                    })
                                    .finally(() => {
                                        if (activeAbortController === abortController) {
                                            activeAbortController = null;
                                            activeRequestText = null;
                                        }
                                    });
                            }, DEBOUNCE_MS);
                        },
                        destroy() {
                            clearTimeoutIfNeeded();
                            cancelActiveRequest();
                            suggestionCache.clear();
                        },
                    };
                },
            }),
        ];
    },
});
