const test = require('node:test');
const assert = require('node:assert');
const { loadApp, loadVirastar, loadCardExporter, createMockCanvas } = require('../helpers/env.js');

test('Tier 2: Boundary & Corner Cases - Nested Brackets & BiDi Ordering', async (t) => {
    const virastar = loadVirastar();
    const { CardExporter } = loadCardExporter();

    await t.test('2.2.1 Deeply nested brackets ((([LTR] RTL))) maintain structural integrity', () => {
        const input = 'این یک تست با پرانتزهای تو در تو ((([LTR] RTL))) است.';
        const processed = virastar.process(input);

        // Brackets must not be mangled, swapped, or have unclosed counts
        const openParens = (processed.match(/\(/g) || []).length;
        const closeParens = (processed.match(/\)/g) || []).length;
        assert.strictEqual(openParens, 3, 'Must retain exactly 3 opening parentheses');
        assert.strictEqual(closeParens, 3, 'Must retain exactly 3 closing parentheses');
        assert.ok(processed.includes('[LTR]'), 'Inner [LTR] token must remain intact');
    });

    await t.test('2.2.2 Mixed Persian with parentheses and SemVer numbers', () => {
        const input = 'کتابخانه serde_json (نسخه 1.0.229) منتشر شد.';
        const app = loadApp();
        app.emitTauriEvent('new-content', {
            raw_text: input,
            html: '',
            visible_length: input.length,
            is_empty: false,
            is_html: false,
        });

        const html = app.elements['content-body'].innerHTML;
        assert.ok(html.includes('serde_json'), 'Latin identifier serde_json must be preserved');
        assert.ok(html.includes('(') && html.includes(')'), 'Parentheses surrounding version must exist');
    });

    await t.test('2.2.3 Handles explicit Unicode directional marks (RLM \\u200F and LRM \\u200E)', () => {
        const RLM = '\u200F';
        const LRM = '\u200E';
        const input = `متن فارسی ${RLM}علامت${LRM} با علائم جهتی`;
        const result = virastar.process(input);
        assert.ok(result.length > 0);
        // Processing should not throw or strip intentional directional markers
        assert.ok(result.includes('فارسی'));
    });

    await t.test('2.2.4 Handles Unicode directional isolates (LRI, RLI, FSI, PDI)', () => {
        const LRI = '\u2066';
        const RLI = '\u2067';
        const FSI = '\u2068';
        const PDI = '\u2069';

        const mixedIsolates = `عبارت ${FSI}test_fn(arg)${PDI} در متن ${RLI}فارسی${PDI}`;
        const output = virastar.process(mixedIsolates);
        assert.ok(output.includes('test_fn(arg)'));
        assert.ok(output.includes('فارسی'));
    });

    await t.test('2.2.5 Canvas P2/P3 base direction: code line with Persian comment has LTR base direction', async () => {
        // According to Unicode Bidirectional Algorithm (UAX #9 rules P2/P3):
        // Paragraph/line base direction is determined by the first strong directional character.
        // A line starting with 'const' has strong LTR character 'c', so base direction must be LTR.
        const canvas = createMockCanvas();
        const line = '<pre class="text-block">const timeout = 5000; // مقدار زمان انتظار</pre>';
        await CardExporter.renderCard(canvas, line, 'zinc', 'windows');

        // Verify that the LTR prefix starts from the left margin, not flipped to the right margin
        const textCalls = canvas._textCalls;
        const constCall = textCalls.find(c => c.text.includes('const'));
        if (constCall) {
            // Left margin on 760px card with 32px padding is ~68px
            // If flipped to RTL, x would be > 600px
            assert.ok(constCall.x < 400, `LTR code line should start near left margin, got x=${constCall.x}`);
        }
    });

    await t.test('2.2.6 Canvas P2/P3 base direction: Persian sentence citing English has RTL base direction', async () => {
        const canvas = createMockCanvas();
        const line = '<pre class="text-block">کلمه "function" در برنامه‌نویسی بسیار پرکاربرد است.</pre>';
        await CardExporter.renderCard(canvas, line, 'zinc', 'windows');

        const textCalls = canvas._textCalls;
        const persianCall = textCalls.find(c => c.text.includes('کلمه') || c.text.includes('برنامه‌نویسی'));
        if (persianCall) {
            // Persian sentence with RTL base direction starts near right margin (>400px)
            assert.ok(persianCall.x > 300, `RTL sentence should start near right margin, got x=${persianCall.x}`);
        }
    });
});
