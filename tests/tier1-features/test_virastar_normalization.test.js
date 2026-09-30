const test = require('node:test');
const assert = require('node:assert');
const { loadVirastar } = require('../helpers/env.js');

test('Tier 1: Feature Coverage - Virastar Character Normalization', async (t) => {
    const virastar = loadVirastar();

    await t.test('1.1 Normalizes Arabic Yeh (ي) to Persian Yeh (ی)', () => {
        const input = 'علي و مهدي كتاب را در ايران خواندند';
        const expected = 'علی و مهدی کتاب را در ایران خواندند';
        const result = virastar.normalizeCharacters(input);
        assert.strictEqual(result, expected);
        assert.ok(!result.includes('ي'), 'Output should not contain Arabic Yeh');
    });

    await t.test('1.2 Normalizes Arabic Kaf (ك) to Persian Kaf (ک)', () => {
        const input = 'كتابخانه ملي كشور';
        const expected = 'کتابخانه ملی کشور';
        const result = virastar.normalizeCharacters(input);
        assert.strictEqual(result, expected);
        assert.ok(!result.includes('ك'), 'Output should not contain Arabic Kaf');
    });

    await t.test('1.3 Normalizes Arabic Teh Marbuta (ة) to Heh (ه) at word end', () => {
        // Spec: Arabic Teh Marbuta (ة) at the end of loanwords should normalize to Persian Heh (ه)
        const input = 'مرحلة جدید و دقيقة نود';
        const result = virastar.normalizeCharacters(input);
        // We verify the normalized form matches expected Persian spelling
        const expected = 'مرحله جدید و دقیقه نود';
        assert.strictEqual(result, expected, 'Teh Marbuta should be converted to Heh at word end');
    });

    await t.test('1.4 Normalizes Hamzeh (ۀ) to Heh + Yeh (ه‌ی)', () => {
        const input = 'خانۀ بزرگ و نامۀ اداری';
        const expected = 'خانه‌ی بزرگ و نامه‌ی اداری';
        const result = virastar.normalizeCharacters(input);
        assert.strictEqual(result, expected);
        assert.ok(!result.includes('ۀ'), 'Output should not contain old Hamzeh form');
    });

    await t.test('1.5 Deduplicates and cleans whitespace around ZWNJ (\u200C)', () => {
        const ZWNJ = '\u200C';
        const input = `کتاب ${ZWNJ} ها و خانه   ${ZWNJ}   هایمان`;
        const expected = `کتاب${ZWNJ}ها و خانه${ZWNJ}هایمان`;
        const result = virastar.normalizeCharacters(input);
        assert.strictEqual(result, expected);
    });

    await t.test('1.6 Punctuation normalization: English question mark, comma, semicolon', () => {
        const input = 'چرا آمدی? شاید فردا، یا پس‌فردا; معلوم نیست!';
        const result = virastar.fixPunctuation(input);
        assert.ok(result.includes('؟'), 'English ? should convert to Persian ؟');
        assert.ok(result.includes('؛'), 'English ; should convert to Persian ؛');
        assert.ok(result.includes('،'), 'English , should convert to Persian ،');
    });

    await t.test('1.7 Normalizes English quotes to Persian guillemets « »', () => {
        const input = 'او گفت: "سلام دنیا" و رفت.';
        const result = virastar.fixPunctuation(input);
        assert.ok(result.includes('«سلام دنیا»'), 'Quotes should convert to Persian guillemets « »');
    });
});
