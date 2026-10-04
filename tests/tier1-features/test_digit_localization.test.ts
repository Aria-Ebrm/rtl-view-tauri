import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const test = require('node:test');
const assert = require('node:assert');
const { loadVirastar } = require('../helpers/env');

test('Tier 1: Feature Coverage - Digit Localization & Conversion', async (t) => {
    const virastar = loadVirastar();

    await t.test('3.1 Converts English digits to Persian digits', () => {
        const input = 'سال 2026 میلادی و ماه 09 و روز 19';
        const expected = 'سال ۲۰۲۶ میلادی و ماه ۰۹ و روز ۱۹';
        const result = virastar.toPersianDigits(input);
        assert.strictEqual(result, expected);
    });

    await t.test('3.2 Converts Arabic-Indic digits to Persian digits', () => {
        const arabicIndic = '١٢٣٤٥٦٧٨٩٠';
        const expected = '۱۲۳۴۵۶۷۸۹۰';
        const result = virastar.toPersianDigits(arabicIndic);
        assert.strictEqual(result, expected);
    });

    await t.test('3.3 Converts Persian digits to English digits', () => {
        const persian = 'نسخه ۲.۱.۴ منتشر شد';
        const expected = 'نسخه 2.1.4 منتشر شد';
        const result = virastar.toEnglishDigits(persian);
        assert.strictEqual(result, expected);
    });

    await t.test('3.4 Converts Arabic-Indic digits to English digits', () => {
        const arabicIndic = 'العدد ٤٥٦';
        const expected = 'العدد 456';
        const result = virastar.toEnglishDigits(arabicIndic);
        assert.strictEqual(result, expected);
    });

    await t.test('3.5 Preserves complex numerical expressions and decimals', () => {
        const input = 'مبلغ: 12,345,678.90 ریال';
        const resultFa = virastar.toPersianDigits(input);
        assert.strictEqual(resultFa, 'مبلغ: ۱۲,۳۴۵,۶۷۸.۹۰ ریال');

        const backEn = virastar.toEnglishDigits(resultFa);
        assert.strictEqual(backEn, 'مبلغ: 12,345,678.90 ریال');
    });

    await t.test('3.6 Virastar.process respects digits options: persian, english, keep', () => {
        const text = 'کد 123 و کد ۴۵۶';

        const faResult = virastar.process(text, { digits: 'persian' });
        assert.ok(faResult.includes('۱۲۳') && faResult.includes('۴۵۶'));

        const enResult = virastar.process(text, { digits: 'english' });
        assert.ok(enResult.includes('123') && enResult.includes('456'));

        const keepResult = virastar.process(text, { digits: 'keep' });
        assert.ok(keepResult.includes('123') && keepResult.includes('۴۵۶'));
    });
});
