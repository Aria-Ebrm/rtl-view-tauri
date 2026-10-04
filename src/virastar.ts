/**
 * Virastar - Persian Smart Typography & Grammar Cleaner for RTL View
 * Optimized for real-time text processing, zero-width non-joiner (ZWNJ),
 * punctuation formatting, quote conversion, and numeral localization.
 */

import type { VirastarOptions, VirastarModule } from './types';

const ZWNJ = '\u200C'; // نیم‌فاصله

const FARSI_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toPersianDigits(text: string | number | null | undefined): string {
    if (!text && text !== 0) return '';
    let res = text.toString();
    // تبدیل ارقام انگلیسی به فارسی
    res = res.replace(/[0-9]/g, (w: string) => FARSI_DIGITS[+w]);
    // تبدیل ارقام عربی به فارسی
    res = res.replace(/[\u0660-\u0669]/g, (w: string) => FARSI_DIGITS[w.charCodeAt(0) - 1632]);
    return res;
}

export function toEnglishDigits(text: string | number | null | undefined): string {
    if (!text && text !== 0) return '';
    let res = text.toString();
    // ارقام فارسی به انگلیسی
    res = res.replace(/[۰-۹]/g, (w: string) => String(FARSI_DIGITS.indexOf(w)));
    // ارقام عربی به انگلیسی
    res = res.replace(/[\u0660-\u0669]/g, (w: string) => String(ARABIC_DIGITS.indexOf(w)));
    return res;
}

export function normalizeCharacters(text: string): string {
    if (!text) return '';
    return text
        // یکسان‌سازی ی و ک عربی به فارسی
        .replace(/ي/g, 'ی')
        .replace(/ك/g, 'ک')
        // تبدیل ة به ه در انتهای کلمات و مرزهای نگارشی
        .replace(/([^\s])ة(?=[\s\.,!?;:«»\(\)\[\]\{\}؟،؛"'\-–—\u200C]|$)/g, '$1ه')
        // یکسان‌سازی همزه
        .replace(/ۀ/g, 'ه‌ی')
        // حذف فاصله‌های اضافه دور نیم‌فاصله و ادغام نیم‌فاصله‌های متوالی
        .replace(/(?:\s*\u200C\s*)+/g, ZWNJ)
        .replace(/\u200C+/g, ZWNJ);
}

export function fixPunctuation(text: string): string {
    if (!text) return '';
    let res = text
        // علامت سوال انگلیسی به فارسی
        .replace(/\?/g, '؟')
        // ویرگول انگلیسی به فارسی (به جز مواردی که بین دو عدد لاتین قرار دارند)
        .replace(/([^\d]),|,(?=[^\d])/g, '$1،')
        // نقطه ویرگول انگلیسی به فارسی
        .replace(/;/g, '؛')
        // حذف فاصله‌های قبل از علائم نگارشی
        .replace(/\s+([،؛:!؟\.٪])/g, '$1')
        // اطمینان از وجود فاصله بعد از علائم نگارشی در صورتی که به کلمه چسبیده‌اند
        .replace(/([،؛:!؟])([^\s\d،؛:!؟\.\)\]\}»"'\/\\])/g, '$1 $2')
        // اصلاح سه‌نقطه
        .replace(/\.{4,}/g, '...')
        .replace(/\.{3}/g, '…');

    // تبدیل گیومه‌های انگلیسی به گیومه فارسی « »
    res = res.replace(/(^|[\s\(\[\{«])"([^"]*)"(?=[\s\.,!؟؛:»\)\]\}]|$)/g, (_match, prefix, inside) => {
        return prefix + '«' + inside.trim() + '»';
    });

    // تمیزکاری فاصله‌های داخل پرانتز و گیومه
    res = res
        .replace(/«\s+/g, '«')
        .replace(/\s+»/g, '»')
        .replace(/\(\s+/g, '(')
        .replace(/\s+\)/g, ')');

    return res;
}

export function fixHalfSpaces(text: string): string {
    if (!text) return '';
    let res = text;

    const bound = '(?=[\\s\\.,!?;:«»\\(\\)\\[\\]\\{\\}؟،؛"\'\\-–—]|$)';
    const wordCharExclusion = '[^\\s\\d\\.,!?;:«»\\(\\)\\[\\]\\{\\}؟،؛"\'\\-–—\u200C]';
    const leadBound = '(^|[\\s\\.,!?;:«»\\(\\)\\[\\]\\{\\}؟،؛"\'\\-–—\u200C])';

    // ۱. پیشوندهای «می» و «نمی»
    res = res.replace(new RegExp(`(^|[\\s\\(\\[\\{«"'\u200C])(می|نمی)\\s+(${wordCharExclusion}+)`, 'g'), `$1$2${ZWNJ}$3`);

    // ۲. پیشوند نفی «بی» (به جز قبل از ضمایر مستقل و کلمه «هیچ»)
    const independentPronouns = /^(من|تو|او|ما|شما|ایشان|آنها|آنان|اینها|هیچ)$/;
    res = res.replace(new RegExp(`(^|[\\s\\(\\[\\{«"'\u200C])(بی)\\s+(${wordCharExclusion}+)`, 'g'), (match, prefix, bi, word) => {
        if (independentPronouns.test(word)) {
            return match;
        }
        return `${prefix}${bi}${ZWNJ}${word}`;
    });

    // ۳. پسوندهای «ها»، «های»، «هایی»، «هایم»، «هایت»، «هایش»، «هایمان»، «هایتان»، «هایشان»
    res = res.replace(new RegExp(`${leadBound}(${wordCharExclusion}+)\\s+(ها|های|هایی|هایم|هایت|هایش|هایمان|هایتان|هایشان)${bound}`, 'g'), `$1$2${ZWNJ}$3`);

    // ۴. پسوندهای تفضیلی «تر»، «ترین»، «تری»
    res = res.replace(new RegExp(`${leadBound}(${wordCharExclusion}+)\\s+(تر|ترین|تری)${bound}`, 'g'), `$1$2${ZWNJ}$3`);

    // ۵. پسوندهای ضمیری و فعلی بعد از «ه» غیرملفوظ یا حروف صدادار
    res = res.replace(new RegExp(`([ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی]ه)\\s+(ام|ات|اش|ای|ایم|اید|اند)${bound}`, 'g'), `$1${ZWNJ}$2`);

    // ۶. شناسه‌های فعل مانند «گفته است» (به جز کلماتی که دارای «ه» ملفوظ ریشه‌ای هستند مانند راه، کوه، ماه، گناه، دانشگاه، اشتباه، شاه)
    const pronouncedHehRegex = /(?:[ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی]اه|کوه|گروه|شکوه|انبوه|ستوه|شبیه|توجیه|تشبیه|تنبیه|فقیه|^(?:ده|مه|گره|زره|وجه|فقه))$/;
    res = res.replace(new RegExp(`${leadBound}(${wordCharExclusion}+ه)\\s+(است)${bound}`, 'g'), (match, prefix, word, verb) => {
        if (pronouncedHehRegex.test(word)) {
            return match;
        }
        return `${prefix}${word}${ZWNJ}${verb}`;
    });

    return res;
}

export function cleanupSpaces(text: string): string {
    if (!text) return '';
    return text
        // تبدیل چند فاصله به یک فاصله
        .replace(/[ \t\f\v]+/g, ' ')
        // حذف فاصله‌های اول و آخر خطوط
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        // جلوگیری از بیش از دو خط خالی متوالی
        .replace(/\n{3,}/g, '\n\n');
}

export interface ProcessOptions {
    fixHalfSpace?: boolean;
    fixPunctuation?: boolean;
    normalizeChars?: boolean;
    cleanupSpaces?: boolean;
    digits?: 'persian' | 'english' | 'keep' | string;
    [key: string]: any;
}

/**
 * پردازش کامل ویراستاری متن
 * @param text - متن ورودی
 * @param options - تنظیمات پردازش
 * @returns متن ویرایش‌شده
 */
export function process(text: string, options: ProcessOptions = {}): string {
    if (!text) return '';

    const config = {
        fixHalfSpace: options.fixHalfSpace !== false,
        fixPunctuation: options.fixPunctuation !== false,
        normalizeChars: options.normalizeChars !== false,
        cleanupSpaces: options.cleanupSpaces !== false,
        digits: options.digits || 'persian',
    };

    let result = text;

    if (config.normalizeChars) {
        result = normalizeCharacters(result);
    }

    if (config.fixHalfSpace) {
        result = fixHalfSpaces(result);
    }

    if (config.fixPunctuation) {
        result = fixPunctuation(result);
    }

    if (config.cleanupSpaces) {
        result = cleanupSpaces(result);
    }

    if (config.digits === 'persian') {
        result = toPersianDigits(result);
    } else if (config.digits === 'english') {
        result = toEnglishDigits(result);
    }

    return result;
}

export const Virastar: VirastarModule = {
    process,
    toPersianDigits,
    toEnglishDigits,
    normalizeCharacters,
    fixHalfSpaces,
    fixPunctuation,
    cleanupSpaces
};

if (typeof window !== 'undefined') {
    (window as any).Virastar = Virastar;
}

if (typeof globalThis !== 'undefined') {
    (globalThis as any).Virastar = Virastar;
}

if (typeof (globalThis as any).module !== 'undefined' && (globalThis as any).module.exports) {
    (globalThis as any).module.exports = Virastar;
}

export default Virastar;
