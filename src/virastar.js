/**
 * Virastar - Persian Smart Typography & Grammar Cleaner for RTL View
 * Optimized for real-time text processing, zero-width non-joiner (ZWNJ),
 * punctuation formatting, quote conversion, and numeral localization.
 */

(function(window) {
    'use strict';

    const ZWNJ = '\u200C'; // نیم‌فاصله

    const FARSI_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

    function toPersianDigits(text) {
        if (!text) return '';
        let res = text.toString();
        // تبدیل ارقام انگلیسی به فارسی
        res = res.replace(/[0-9]/g, w => FARSI_DIGITS[+w]);
        // تبدیل ارقام عربی به فارسی
        res = res.replace(/[\u0660-\u0669]/g, w => FARSI_DIGITS[w.charCodeAt(0) - 1632]);
        return res;
    }

    function toEnglishDigits(text) {
        if (!text) return '';
        let res = text.toString();
        // ارقام فارسی به انگلیسی
        res = res.replace(/[۰-۹]/g, w => FARSI_DIGITS.indexOf(w));
        // ارقام عربی به انگلیسی
        res = res.replace(/[\u0660-\u0669]/g, w => ARABIC_DIGITS.indexOf(w));
        return res;
    }

    function normalizeCharacters(text) {
        return text
            // یکسان‌سازی ی و ک عربی به فارسی
            .replace(/ي/g, 'ی')
            .replace(/ك/g, 'ک')
            // تبدیل ة به ه
            .replace(/([^\s])ة\b/g, '$1ه')
            // یکسان‌سازی همزه
            .replace(/ۀ/g, 'ه‌ی')
            // حذف فاصله‌های اضافه دور نیم‌فاصله
            .replace(/\s*\u200C\s*/g, ZWNJ);
    }

    function fixPunctuation(text) {
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
        res = res.replace(/(^|[\s\(\[\{«])"([^"]*)"(?=[\s\.,!؟؛:»\)\]\}]|$)/g, (match, prefix, inside) => {
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

    function fixHalfSpaces(text) {
        let res = text;

        const bound = '(?=[\\s\\.,!?;:«»\\(\\)\\[\\]]|$)';

        // ۱. پیشوندهای «می» و «نمی»
        res = res.replace(/(^|[\s\(\[\{«])(می|نمی)\s+([^\s\d\.,!?;:«»\(\)\[\]]+)/g, `$1$2${ZWNJ}$3`);

        // ۲. پیشوند نفی «بی»
        res = res.replace(/(^|[\s\(\[\{«])(بی)\s+([^\s\d\.,!?;:«»\(\)\[\]]+)/g, `$1$2${ZWNJ}$3`);

        // ۳. پسوندهای «ها»، «های»، «هایی»، «هایم»، «هایت»، «هایش»، «هایمان»، «هایتان»، «هایشان»
        res = res.replace(new RegExp(`([^\\s\\d\\.,!?;:«»\\(\\)\\[\\]]+)\\s+(ها|های|هایی|هایم|هایت|هایش|هایمان|هایتان|هایشان)${bound}`, 'g'), `$1${ZWNJ}$2`);

        // ۴. پسوندهای تفضیلی «تر»، «ترین»، «تری»
        res = res.replace(new RegExp(`([^\\s\\d\\.,!?;:«»\\(\\)\\[\\]]+)\\s+(تر|ترین|تری)${bound}`, 'g'), `$1${ZWNJ}$2`);

        // ۵. پسوندهای ضمیری و فعلی بعد از «ه» غیرملفوظ یا حروف صدادار
        res = res.replace(new RegExp(`([ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی]ه)\\s+(ام|ات|اش|ای|ایم|اید|اند)${bound}`, 'g'), `$1${ZWNJ}$2`);

        // ۶. شناسه‌های فعل مانند «گفته است»
        res = res.replace(new RegExp(`([^\\s\\d\\.,!?;:«»\\(\\)\\[\\]]+ه)\\s+(است)${bound}`, 'g'), `$1${ZWNJ}$2`);

        return res;
    }

    function cleanupSpaces(text) {
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

    /**
     * پردازش کامل ویراستاری متن
     * @param {string} text - متن ورودی
     * @param {object} options - تنظیمات پردازش
     * @returns {string} - متن ویرایش‌شده
     */
    function process(text, options = {}) {
        if (!text) return '';

        const config = {
            fixHalfSpace: options.fixHalfSpace !== false,
            fixPunctuation: options.fixPunctuation !== false,
            normalizeChars: options.normalizeChars !== false,
            cleanupSpaces: options.cleanupSpaces !== false,
            digits: options.digits || 'persian', // 'persian', 'english', or 'keep'
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

    window.Virastar = {
        process,
        toPersianDigits,
        toEnglishDigits,
        normalizeCharacters,
        fixHalfSpaces,
        fixPunctuation,
        cleanupSpaces
    };

})(window);
