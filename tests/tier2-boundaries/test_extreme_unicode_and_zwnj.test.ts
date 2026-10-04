import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const test = require('node:test');
const assert = require('node:assert');
const { loadVirastar } = require('../helpers/env');

test('Tier 2: Boundary & Corner Cases - Extreme Unicode & ZWNJ Sequences', async (t) => {
    const virastar = loadVirastar();
    const ZWNJ = '\u200C';

    await t.test('2.3.1 Multiple consecutive ZWNJs are consolidated to single ZWNJ', () => {
        const input = `کتاب${ZWNJ}${ZWNJ}${ZWNJ}${ZWNJ}ها`;
        const result = virastar.normalizeCharacters(input);
        assert.strictEqual(result, `کتاب${ZWNJ}ها`, 'Consecutive ZWNJs should be deduplicated to one');
    });

    await t.test('2.3.2 ZWJ sequences and multi-character emojis are preserved without corruption', () => {
        // Family emoji: Man + ZWJ + Woman + ZWJ + Girl + ZWJ + Boy
        const familyEmoji = '👨‍👩‍👧‍👦';
        // Technologist: Woman + ZWJ + Laptop
        const womanTech = '👩‍💻';
        const rainbowFlag = '🏳️‍🌈';

        const input = `تیم توسعه: ${womanTech} و کاربر نهایی: ${familyEmoji} و پرچم: ${rainbowFlag}`;
        const output = virastar.process(input);

        assert.ok(output.includes(familyEmoji), 'Family emoji with ZWJ sequence must be preserved');
        assert.ok(output.includes(womanTech), 'Woman tech emoji must be preserved');
        assert.ok(output.includes(rainbowFlag), 'Rainbow flag emoji must be preserved');
    });

    await t.test('2.3.3 Arabic Presentation Forms (U+FB50-FDFF, U+FE70-FEFF) normalization', () => {
        // Presentation form characters like ﭖ (U+FB56 Peh isolated) and ﮊ (U+FB8A Zheh isolated)
        const presentationForms = '\uFB56\uFB8A\uFB8E\uFBE8'; // ﭖ, ﮊ, ﮎ, ﯼ
        const result = virastar.process(presentationForms);
        assert.ok(typeof result === 'string');
        assert.ok(result.length > 0);
    });

    await t.test('2.3.4 Mixed RTL scripts (Persian, Arabic, Hebrew) in single payload', () => {
        const mixed = 'فارسی (سلام) / عربي (مرحباً) / עברית (שלום)';
        const output = virastar.process(mixed);
        assert.ok(output.includes('سلام'));
        assert.ok(output.includes('مرحباً') || output.includes('مرحبا'));
        assert.ok(output.includes('שלום'));
    });

    await t.test('2.3.5 Zero-Width Space (\\u200B), Byte Order Mark (\\uFEFF) and control characters', () => {
        const ZWSP = '\u200B';
        const BOM = '\uFEFF';
        const input = `${BOM}شروع${ZWSP}متن با کاراکترهای نامرئی\x00\x07پایان`;
        const result = virastar.process(input);
        assert.ok(result.includes('شروع'));
        assert.ok(result.includes('پایان'));
    });
});
