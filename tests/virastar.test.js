/**
 * Automated Unit Tests for Virastar Typography & Persian Rules Engine
 * Uses Node.js native test runner (node:test)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const fs = require('node:fs');

// Test both direct require (CJS/UMD export) and sandbox loading
const { loadVirastar } = require('./helpers/env.js');
let Virastar;
try {
    Virastar = require('../src/virastar.js');
} catch (_) {
    Virastar = loadVirastar();
}

describe('Virastar Engine - Module & Export', () => {
    it('should export Virastar via CommonJS require', () => {
        assert.ok(Virastar, 'Virastar module should be defined');
        assert.equal(typeof Virastar.process, 'function');
        assert.equal(typeof Virastar.normalizeCharacters, 'function');
        assert.equal(typeof Virastar.fixHalfSpaces, 'function');
        assert.equal(typeof Virastar.toPersianDigits, 'function');
        assert.equal(typeof Virastar.toEnglishDigits, 'function');
        assert.equal(typeof Virastar.fixPunctuation, 'function');
        assert.equal(typeof Virastar.cleanupSpaces, 'function');
    });

    it('should attach Virastar to window when loaded in sandbox', () => {
        const v = loadVirastar();
        assert.ok(v, 'Sandbox Virastar should be defined');
        assert.equal(typeof v.process, 'function');
    });
});

describe('Virastar - Character Normalization & Teh Marbuta', () => {
    it('should convert Arabic Yeh and Kaf to Persian equivalents', () => {
        const input = 'يك كتاب عربي';
        const expected = 'یک کتاب عربی';
        assert.equal(Virastar.normalizeCharacters(input), expected);
    });

    it('should fix Teh Marbuta at Persian word boundaries (not broken by ASCII \\b)', () => {
        // Space boundary
        assert.equal(Virastar.normalizeCharacters('مرحلة جدید'), 'مرحله جدید');
        assert.equal(Virastar.normalizeCharacters('جامعة تهران'), 'جامعه تهران');
        // End of string boundary
        assert.equal(Virastar.normalizeCharacters('مرحلة'), 'مرحله');
        // Persian punctuation boundaries
        assert.equal(Virastar.normalizeCharacters('مرحلة، دوم'), 'مرحله، دوم');
        assert.equal(Virastar.normalizeCharacters('مرحلة؟'), 'مرحله؟');
        assert.equal(Virastar.normalizeCharacters('مرحلة؛'), 'مرحله؛');
        assert.equal(Virastar.normalizeCharacters('«مرحلة»'), '«مرحله»');
        assert.equal(Virastar.normalizeCharacters('"مرحلة"'), '"مرحله"');
        assert.equal(Virastar.normalizeCharacters('(مرحلة)'), '(مرحله)');
        assert.equal(Virastar.normalizeCharacters('مرحلة-اول'), 'مرحله-اول');
    });

    it('should consolidate consecutive ZWNJ sequences and remove adjacent whitespace', () => {
        const ZWNJ = '\u200C';
        // Multiple consecutive ZWNJs
        assert.equal(Virastar.normalizeCharacters(`کتاب${ZWNJ}${ZWNJ}ها`), `کتاب${ZWNJ}ها`);
        assert.equal(Virastar.normalizeCharacters(`کتاب${ZWNJ}${ZWNJ}${ZWNJ}ها`), `کتاب${ZWNJ}ها`);
        // Spaces around ZWNJ
        assert.equal(Virastar.normalizeCharacters(`کتاب  ${ZWNJ}  ها`), `کتاب${ZWNJ}ها`);
        assert.equal(Virastar.normalizeCharacters(`کتاب ${ZWNJ} ${ZWNJ} ها`), `کتاب${ZWNJ}ها`);
    });

    it('should normalize Hamzeh ۀ to ه‌ی', () => {
        assert.equal(Virastar.normalizeCharacters('خانۀ ما'), 'خانه‌ی ما');
        assert.equal(Virastar.normalizeCharacters('نامۀ اداری'), 'نامه‌ی اداری');
    });
});

describe('Virastar - Half-Space (ZWNJ) Normalization', () => {
    const ZWNJ = '\u200C';

    it('should correctly join prefixes می and نمی', () => {
        assert.equal(Virastar.fixHalfSpaces('می روم'), `می${ZWNJ}روم`);
        assert.equal(Virastar.fixHalfSpaces('نمی دانم'), `نمی${ZWNJ}دانم`);
        assert.equal(Virastar.fixHalfSpaces('«می دانم»'), `«می${ZWNJ}دانم»`);
        assert.equal(Virastar.fixHalfSpaces('(نمی دانم)'), `(نمی${ZWNJ}دانم)`);
    });

    it('should NOT conjoin preposition بی with independent pronouns or هیچ', () => {
        assert.equal(Virastar.fixHalfSpaces('بی من نرو'), 'بی من نرو');
        assert.equal(Virastar.fixHalfSpaces('بی تو هرگز'), 'بی تو هرگز');
        assert.equal(Virastar.fixHalfSpaces('بی او چه کنم'), 'بی او چه کنم');
        assert.equal(Virastar.fixHalfSpaces('بی ما رفتند'), 'بی ما رفتند');
        assert.equal(Virastar.fixHalfSpaces('بی شما لطفی ندارد'), 'بی شما لطفی ندارد');
        assert.equal(Virastar.fixHalfSpaces('بی هیچ دلیلی'), 'بی هیچ دلیلی');
        assert.equal(Virastar.fixHalfSpaces('بی آنها'), 'بی آنها');
        assert.equal(Virastar.fixHalfSpaces('بی ایشان'), 'بی ایشان');
    });

    it('should correctly conjoin preposition بی with normal nouns and adjectives', () => {
        assert.equal(Virastar.fixHalfSpaces('بی نهایت'), `بی${ZWNJ}نهایت`);
        assert.equal(Virastar.fixHalfSpaces('بی دلیل'), `بی${ZWNJ}دلیل`);
        assert.equal(Virastar.fixHalfSpaces('بی تردید'), `بی${ZWNJ}تردید`);
        assert.equal(Virastar.fixHalfSpaces('بی تفاوت'), `بی${ZWNJ}تفاوت`);
        assert.equal(Virastar.fixHalfSpaces('بی خطر'), `بی${ZWNJ}خطر`);
        assert.equal(Virastar.fixHalfSpaces('بی گناه'), `بی${ZWNJ}گناه`);
    });

    it('should join plural suffixes (ها، های، etc.) followed by Persian and standard punctuation', () => {
        assert.equal(Virastar.fixHalfSpaces('کتاب ها'), `کتاب${ZWNJ}ها`);
        assert.equal(Virastar.fixHalfSpaces('کتاب ها،'), `کتاب${ZWNJ}ها،`);
        assert.equal(Virastar.fixHalfSpaces('کتاب ها؟'), `کتاب${ZWNJ}ها؟`);
        assert.equal(Virastar.fixHalfSpaces('کتاب ها؛'), `کتاب${ZWNJ}ها؛`);
        assert.equal(Virastar.fixHalfSpaces('«کتاب ها»'), `«کتاب${ZWNJ}ها»`);
        assert.equal(Virastar.fixHalfSpaces('"کتاب های خوب"'), `"کتاب${ZWNJ}های خوب"`);
        assert.equal(Virastar.fixHalfSpaces('کتاب هایشان را آوردند'), `کتاب${ZWNJ}هایشان را آوردند`);
        assert.equal(Virastar.fixHalfSpaces('دست هایم-'), `دست${ZWNJ}هایم-`);
    });

    it('should join comparative suffixes (تر، ترین، تری) followed by Persian punctuation', () => {
        assert.equal(Virastar.fixHalfSpaces('زیبا تر'), `زیبا${ZWNJ}تر`);
        assert.equal(Virastar.fixHalfSpaces('زیبا تر،'), `زیبا${ZWNJ}تر،`);
        assert.equal(Virastar.fixHalfSpaces('بزرگ ترین؟'), `بزرگ${ZWNJ}ترین؟`);
        assert.equal(Virastar.fixHalfSpaces('خوب تری؛'), `خوب${ZWNJ}تری؛`);
        assert.equal(Virastar.fixHalfSpaces('«سریع ترین»'), `«سریع${ZWNJ}ترین»`);
    });

    it('should NOT corrupt pronounced root Heh nouns before است', () => {
        // Words ending in root consonantal Heh /h/ must remain separated by normal space
        assert.equal(Virastar.fixHalfSpaces('این راه است'), 'این راه است');
        assert.equal(Virastar.fixHalfSpaces('آن کوه است'), 'آن کوه است');
        assert.equal(Virastar.fixHalfSpaces('شب ماه است'), 'شب ماه است');
        assert.equal(Virastar.fixHalfSpaces('این کار گناه است'), 'این کار گناه است');
        assert.equal(Virastar.fixHalfSpaces('اینجا دانشگاه است'), 'اینجا دانشگاه است');
        assert.equal(Virastar.fixHalfSpaces('این قضاوت اشتباه است'), 'این قضاوت اشتباه است');
        assert.equal(Virastar.fixHalfSpaces('او شاه است'), 'او شاه است');
        assert.equal(Virastar.fixHalfSpaces('این نگاه است'), 'این نگاه است');
        assert.equal(Virastar.fixHalfSpaces('این چاه است'), 'این چاه است');
        assert.equal(Virastar.fixHalfSpaces('این ده است'), 'این ده است');
    });

    it('should correctly conjoin past participles and silent Heh words with است', () => {
        // Past participles and adjectives ending in silent Heh (ه ناملفوظ) get ZWNJ
        assert.equal(Virastar.fixHalfSpaces('او گفته است'), `او گفته${ZWNJ}است`);
        assert.equal(Virastar.fixHalfSpaces('علی آمده است'), `علی آمده${ZWNJ}است`);
        assert.equal(Virastar.fixHalfSpaces('او رفته است'), `او رفته${ZWNJ}است`);
        assert.equal(Virastar.fixHalfSpaces('غذا خورده است'), `غذا خورده${ZWNJ}است`);
        assert.equal(Virastar.fixHalfSpaces('او بسیار خسته است'), `او بسیار خسته${ZWNJ}است`);
        assert.equal(Virastar.fixHalfSpaces('نامه نوشته است'), `نامه نوشته${ZWNJ}است`);
        assert.equal(Virastar.fixHalfSpaces('کار انجام شده است'), `کار انجام شده${ZWNJ}است`);

        // With Persian punctuation
        assert.equal(Virastar.fixHalfSpaces('آیا او آمده است؟'), `آیا او آمده${ZWNJ}است؟`);
        assert.equal(Virastar.fixHalfSpaces('او گفته است، ولی...'), `او گفته${ZWNJ}است، ولی...`);
        assert.equal(Virastar.fixHalfSpaces('رفته است؛'), `رفته${ZWNJ}است؛`);
    });
});

describe('Virastar - Punctuation & Digit Conversion', () => {
    it('should convert English punctuation to Persian equivalents', () => {
        assert.equal(Virastar.fixPunctuation('آیا می دانید?'), 'آیا می دانید؟');
        assert.equal(Virastar.fixPunctuation('کتاب, قلم'), 'کتاب، قلم');
        assert.equal(Virastar.fixPunctuation('اول; دوم'), 'اول؛ دوم');
        assert.equal(Virastar.fixPunctuation('"کتاب"'), '«کتاب»');
    });

    it('should convert digits accurately between Persian and English', () => {
        assert.equal(Virastar.toPersianDigits('1234567890'), '۱۲۳۴۵۶۷۸۹۰');
        assert.equal(Virastar.toEnglishDigits('۱۲۳۴۵۶۷۸۹۰'), '1234567890');
        // Arabic digits to Persian
        assert.equal(Virastar.toPersianDigits('١٢٣٤٥٦٧٨٩٠'), '۱۲۳۴۵۶۷۸۹۰');
    });

    it('should handle full pipeline via Virastar.process', () => {
        const text = 'اين مرحلة اول است، و بی شك ١٢٣ كتاب ها خوانده شده است?';
        const result = Virastar.process(text, {
            fixHalfSpace: true,
            fixPunctuation: true,
            normalizeChars: true,
            digits: 'persian',
        });
        const ZWNJ = '\u200C';
        assert.ok(result.includes('این مرحله اول است،'), 'Normalized yeh, teh marbuta');
        assert.ok(result.includes(`بی${ZWNJ}شک`), 'Joined bi-shek');
        assert.ok(result.includes('۱۲۳'), 'Converted to Persian digits');
        assert.ok(result.includes(`کتاب${ZWNJ}ها`), 'Joined ketabha');
        assert.ok(result.includes(`شده${ZWNJ}است؟`), 'Joined shodeh-ast with Persian question mark');
    });
});
