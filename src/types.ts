// ==============================================================================
// RTL View - TypeScript Type Definitions
// ==============================================================================

export interface VirastarOptions {
    normalizeCharacters?: boolean;
    normalizeChars?: boolean;
    fixHalfSpaces?: boolean;
    fixHalfSpace?: boolean;
    fixPunctuation?: boolean;
    cleanupSpaces?: boolean;
    digits?: 'persian' | 'english' | 'default' | string;
}

export interface VirastarModule {
    process: (text: string, options?: VirastarOptions) => string;
    toPersianDigits: (text: string) => string;
    toEnglishDigits: (text: string) => string;
    normalizeCharacters: (text: string) => string;
    fixHalfSpaces: (text: string) => string;
    fixPunctuation: (text: string) => string;
    cleanupSpaces: (text: string) => string;
}

export interface ThemePalette {
    bgOuter1: string;
    bgOuter2: string;
    cardBg: string;
    border: string;
    text: string;
    muted: string;
    accent: string;
    accentBg: string;
    codeBg: string;
    codeBorder: string;
    codeColor: string;
    tableBg: string;
}

export interface BlockToken {
    type: 'paragraph' | 'heading' | 'code' | 'table' | 'blockquote' | 'bullet' | 'empty';
    text: string;
    level?: number;
    lang?: string;
    lines?: string[];
    align?: 'right' | 'left';
    meta?: Record<string, any>;
}

export interface LineToken {
    type: 'text' | 'code' | 'url';
    text: string;
    isCode?: boolean;
    isUrl?: boolean;
}

export interface CardExporterOptions {
    theme?: string;
    osStyle?: 'windows' | 'mac';
    scale?: number;
    customTitle?: string;
}

export interface ToolbarVisibilityState {
    btnVirastar: boolean;
    btnDigits: boolean;
    btnFont: boolean;
    btnPin: boolean;
    btnExportCard: boolean;
    stats: boolean;
}

export interface AppState {
    rawContent: string;
    currentCleanText: string;
    virastarEnabled: boolean;
    digitMode: 'persian' | 'english' | 'default';
    isPinned: boolean;
    fontSize: number;
    currentTheme: string;
    osCardStyle: 'windows' | 'mac';
    toolbarVisibility: ToolbarVisibilityState;
}

declare global {
    interface Window {
        __TAURI__?: {
            core: {
                invoke: <T = any>(cmd: string, args?: Record<string, any>) => Promise<T>;
              };
            event?: {
                listen: (event: string, handler: (event: any) => void) => Promise<() => void>;
            };
        };
        Virastar?: VirastarModule;
        CardExporter?: any;
        RtlApp?: any;
    }
}
