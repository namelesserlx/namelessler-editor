import { BG_PALETTE, type PaletteColor, TEXT_PALETTE } from '../../core/palette';
import { DEFAULT_EDITOR_LOCALE, type EditorLocale } from '../../i18n';
import type { ReactNode } from 'react';

export interface ColorOption {
    key: string;
    label?: string;
    value: string | null;
}

export interface ColorSwatchRenderContext {
    active: boolean;
    label: string;
    mode: 'text' | 'background';
    option: ColorOption;
}

export type ColorSwatchRenderer = (context: ColorSwatchRenderContext) => ReactNode;

function toColorOptions(palette: PaletteColor[]): ColorOption[] {
    return [
        { key: 'clear', value: null },
        ...palette.map((color) => ({ key: color.key, value: color.cssVar })),
    ];
}

export const TEXT_COLORS: ColorOption[] = toColorOptions(TEXT_PALETTE);
export const BACKGROUND_COLORS: ColorOption[] = toColorOptions(BG_PALETTE);

const COLOR_LABELS: Record<EditorLocale, Record<string, string>> = {
    'en-US': {
        clear: 'Clear',
        default: 'Default',
        slate: 'Slate',
        red: 'Red',
        orange: 'Orange',
        amber: 'Amber',
        green: 'Green',
        cyan: 'Cyan',
        blue: 'Blue',
        violet: 'Violet',
        pink: 'Pink',
    },
    'zh-CN': {
        clear: '清除',
        default: '默认',
        slate: '石板黑',
        red: '红色',
        orange: '橙色',
        amber: '琥珀色',
        green: '绿色',
        cyan: '青色',
        blue: '蓝色',
        violet: '紫色',
        pink: '粉色',
    },
};

export function getColorLabels(locale: EditorLocale): Record<string, string> {
    return COLOR_LABELS[locale] ?? COLOR_LABELS[DEFAULT_EDITOR_LOCALE];
}

export function getColorLabel(option: ColorOption, locale: EditorLocale): string {
    return option.label ?? getColorLabels(locale)[option.key] ?? option.key;
}
