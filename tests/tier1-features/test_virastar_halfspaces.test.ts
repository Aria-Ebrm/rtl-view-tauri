import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const test = require('node:test');
const assert = require('node:assert');
const { loadVirastar } = require('../helpers/env');

test('Tier 1: Feature Coverage - Virastar Half-Space (ZWNJ) Rules', async (t) => {
    const virastar = loadVirastar();
    const ZWNJ = '\u200C';

    await t.test('2.1 Inserts ZWNJ after verbal prefixes می and نمی', () => {
        const input = 'او می رود و نمی داند چرا';
        const expected = `او می${ZWNJ}رود و نمی${ZWNJ}داند چرا`;
        const result = virastar.fixHalfSpaces(input);
        assert.strictEqual(result, expected);
    });

    await t.test('2.2 Inserts ZWNJ before plural suffixes ها and variants', () => {
        const input = 'کتاب ها و خانه هایمان و درخت هایی در باغ';
        const expected = `کتاب${ZWNJ}ها و خانه${ZWNJ}هایمان و درخت${ZWNJ}هایی در باغ`;
        const result = virastar.fixHalfSpaces(input);
        assert.strictEqual(result, expected);
    });

    await t.test('2.3 Inserts ZWNJ before comparative suffixes تر and ترین', () => {
        const input = 'این روش سریع تر و بهترین و زیبا ترین راهکار است';
        const expected = `این روش سریع${ZWNJ}تر و بهترین و زیبا${ZWNJ}ترین راهکار است`;
        const result = virastar.fixHalfSpaces(input);
        assert.ok(result.includes(`سریع${ZWNJ}تر`));
        assert.ok(result.includes(`زیبا${ZWNJ}ترین`));
    });

    await t.test('2.4 Inserts ZWNJ before pronoun suffixes after Heh (ه غیرملفوظ)', () => {
        const input = 'نامه ام را خوانده اند و دیده ایم';
        const expected = `نامه${ZWNJ}ام را خوانده${ZWNJ}اند و دیده${ZWNJ}ایم`;
        const result = virastar.fixHalfSpaces(input);
        assert.strictEqual(result, expected);
    });

    await t.test('2.5 Inserts ZWNJ before است for past participles ending in silent Heh', () => {
        const input = 'این مطلب قبلاً گفته است و نوشته است';
        const expected = `این مطلب قبلاً گفته${ZWNJ}است و نوشته${ZWNJ}است`;
        const result = virastar.fixHalfSpaces(input);
        assert.strictEqual(result, expected);
    });

    await t.test('2.6 Does NOT insert ZWNJ before است for root consonant Heh (ه ملفوظ) nouns', () => {
        // According to PROJECT.md Feature 9 & Survey E2, nouns like راه, کوه, ماه, دانشگاه, اشتباه, گناه
        // end with root consonant /h/ and should remain independent words without ZWNJ
        const inputs = [
            'این راه است',
            'آن کوه است',
            'این کار اشتباه است',
            'اینجا دانشگاه است',
        ];
        for (const input of inputs) {
            const result = virastar.fixHalfSpaces(input);
            assert.ok(!result.includes(ZWNJ), `Should not insert ZWNJ in "${input}", got "${result}"`);
        }
    });

    await t.test('2.7 Preposition بی handling: prefix with adjective vs independent pronoun', () => {
        // Compound adjectives get ZWNJ
        const compound = virastar.fixHalfSpaces('انسانی بی هنر و بی نیاز');
        assert.ok(compound.includes(`بی${ZWNJ}هنر`), 'بی‌هنر should have ZWNJ');
        assert.ok(compound.includes(`بی${ZWNJ}نیاز`), 'بی‌نیاز should have ZWNJ');

        // Pronouns should NOT get joined into a compound
        const pronouns = virastar.fixHalfSpaces('بی من نرو و بی تو هرگز');
        assert.ok(!pronouns.includes(`بی${ZWNJ}من`), 'بی من should remain separate words');
        assert.ok(!pronouns.includes(`بی${ZWNJ}تو`), 'بی تو should remain separate words');
    });

    await t.test('2.8 Lookahead boundary supports Persian punctuation (،, ؛, ؟)', () => {
        // Target words immediately followed by Persian punctuation must still match lookahead
        const input1 = 'کتاب ها، مجله ها، روزنامه ها؛';
        const result1 = virastar.fixHalfSpaces(input1);
        assert.ok(result1.includes(`کتاب${ZWNJ}ها،`), `Expected کتاب‌ها، but got ${result1}`);
        assert.ok(result1.includes(`روزنامه${ZWNJ}ها؛`), `Expected روزنامه‌ها؛ but got ${result1}`);

        const input2 = 'آیا گفته است؟';
        const result2 = virastar.fixHalfSpaces(input2);
        assert.ok(result2.includes(`گفته${ZWNJ}است؟`), `Expected گفته‌است؟ but got ${result2}`);
    });
});
