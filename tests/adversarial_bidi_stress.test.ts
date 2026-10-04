import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { loadVirastar, loadCardExporter, createMockCanvas, loadApp } = require('./helpers/env');

test('Adversarial Challenge Suite: BiDi, Extreme Unicode, Tables & Canvas Wrapping', async (t) => {
    const virastar = loadVirastar();
    const { CardExporter } = loadCardExporter();

    // -------------------------------------------------------------
    // SECTION 1: Deeply Nested Brackets & Mixed BiDi Runs
    // -------------------------------------------------------------
    await t.test('1.1 Deeply nested brackets ((([LTR] RTL))) with mixed scripts', () => {
        const input = 'متن آزمایشی ((([LTR_TOKEN] متن_فارسی))) با پرانتزهای تو در تو';
        const processed = virastar.process(input);

        // Verification of bracket count parity
        const openParens = (processed.match(/\(/g) || []).length;
        const closeParens = (processed.match(/\)/g) || []).length;
        const openBrackets = (processed.match(/\[/g) || []).length;
        const closeBrackets = (processed.match(/\]/g) || []).length;

        assert.strictEqual(openParens, 3, 'Opening parentheses count must be exactly 3');
        assert.strictEqual(closeParens, 3, 'Closing parentheses count must be exactly 3');
        assert.strictEqual(openBrackets, 1, 'Opening square bracket count must be exactly 1');
        assert.strictEqual(closeBrackets, 1, 'Closing square bracket count must be exactly 1');
        assert.ok(processed.includes('[LTR_TOKEN]'), 'LTR token must not be mangled');
    });

    await t.test('1.2 Quadruple deeply nested brackets with 8 nesting levels: (((([[[(((LTR فارسی))) ]]]))))', () => {
        const input = 'سطح ۱ (((([[[(((TEST_IDENTIFIER متن داخلی))) ]]])))) پایان';
        const processed = virastar.process(input);

        const openParens = (processed.match(/\(/g) || []).length;
        const closeParens = (processed.match(/\)/g) || []).length;
        assert.strictEqual(openParens, 7, 'Opening parentheses count must be preserved (4 + 3 = 7)');
        assert.strictEqual(closeParens, 7, 'Closing parentheses count must be preserved (3 + 4 = 7)');
        assert.ok(processed.includes('TEST_IDENTIFIER'), 'Nested English identifier must remain intact');
    });

    await t.test('1.3 Unbalanced / unclosed brackets: ((([LTR] RTL)) and ([LTR] RTL)))', () => {
        // Must process gracefully without throwing or infinite looping
        const unclosed = 'متن ((([LTR] RTL)) ناقص';
        const extraClosed = 'متن ([LTR] RTL))) اضافه';

        assert.doesNotThrow(() => {
            const res1 = virastar.process(unclosed);
            assert.ok(res1.includes('[LTR]'));
            const res2 = virastar.process(extraClosed);
            assert.ok(res2.includes('[LTR]'));
        });
    });

    await t.test('1.4 Nested brackets containing SemVer, URLs, and query parameters', () => {
        const input = 'مخزن اصلی ((([v2.1.4-beta.1] https://github.com/org/repo?v=1&dir=rtl))) بررسی شد.';
        const app = loadApp();
        app.emitTauriEvent('new-content', {
            raw_text: input,
            html: '',
            visible_length: input.length,
            is_empty: false,
            is_html: false,
        });

        const html = app.elements['content-body'].innerHTML;
        assert.ok(html.includes('v2.1.4-beta.1'), 'SemVer inside nested brackets must be preserved');
        assert.ok(html.includes('https://github.com/org/repo?v=1&amp;dir=rtl') || html.includes('https://github.com/org/repo?v=1&dir=rtl'), 'URL query parameters must not be corrupted');
    });

    await t.test('1.5 Nested brackets protection in frontend app.js: ((([LTR] RTL))) must have RLM \\u200F inserted or preserved', () => {
        const input = 'متن آزمایشی ((([LTR] RTL))) در پاراگراف راست‌چین';
        const app = loadApp();
        app.emitTauriEvent('new-content', {
            raw_text: input,
            html: '<pre class="text-block" dir="rtl">متن آزمایشی ((([LTR]\u200F RTL))) در پاراگراف راست‌چین</pre>',
            visible_length: input.length,
            is_empty: false,
            is_html: false,
        });

        const html = app.elements['content-body'].innerHTML;
        // The Rust engine protects nested brackets by inserting RLM \u200F after the inner LTR closing bracket
        // Verify whether app.js preserves or provides this BiDi protection in the DOM
        assert.ok(html.includes('\u200F') || html.includes('&#x200F;') || html.includes('&rlm;'), 'Nested brackets must contain RLM directional mark to prevent BiDi inversion');
    });

    // -------------------------------------------------------------
    // SECTION 2: ZWNJ Sequences, Invisible Characters & Presentation Forms
    // -------------------------------------------------------------
    await t.test('2.1 Massive consecutive ZWNJ sequences (100 ZWNJs) deduplication', () => {
        const ZWNJ = '\u200C';
        const input = 'کتاب' + ZWNJ.repeat(100) + 'ها';
        const result = virastar.normalizeCharacters(input);
        assert.strictEqual(result, `کتاب${ZWNJ}ها`, '100 consecutive ZWNJs must be deduplicated to exactly 1');
    });

    await t.test('2.2 Isolated and boundary ZWNJs surrounded by spaces', () => {
        const ZWNJ = '\u200C';
        const input = `کلمه اول   ${ZWNJ}   کلمه دوم`;
        const result = virastar.normalizeCharacters(input);
        // Spaces surrounding ZWNJ must be collapsed cleanly
        assert.ok(!result.includes(`   ${ZWNJ}   `), 'Spaces around ZWNJ must be cleaned');
        assert.ok(result.includes(ZWNJ), 'ZWNJ must be retained between words');
    });

    await t.test('2.3 Arabic Presentation Forms-A and Forms-B character handling', () => {
        // Presentation Forms-A (U+FB50-FDFF) and Forms-B (U+FE70-FEFF)
        // ﭖ (U+FB56), ﭺ (U+FB7A), ﮊ (U+FB8A), ﮎ (U+FB8E), ﯼ (U+FBE8), ﻼ (U+FEFB)
        const forms = '\uFB56\uFB7A\uFB8A\uFB8E\uFBE8\uFEFB';
        const processed = virastar.process(forms);
        assert.ok(processed.length > 0, 'Presentation forms must process safely');
    });

    // -------------------------------------------------------------
    // SECTION 3: Complex Emojis & ZWJ Sequences
    // -------------------------------------------------------------
    await t.test('3.1 Complex multi-person ZWJ emoji sequences: family, skin tone, professions', () => {
        const family = '👨‍👩‍👧‍👦';
        const technologist = '👩🏿‍💻';
        const rainbowFlag = '🏳️‍🌈';
        const handshake = '🤝🏽';

        const input = `گروه: ${family}، مهندس: ${technologist}، نماد: ${rainbowFlag}، همکاری: ${handshake}`;
        const output = virastar.process(input);

        assert.ok(output.includes(family), 'Family ZWJ emoji sequence must not be corrupted');
        assert.ok(output.includes(technologist), 'Skin tone + profession ZWJ sequence must not be corrupted');
        assert.ok(output.includes(rainbowFlag), 'Rainbow flag ZWJ sequence must not be corrupted');
        assert.ok(output.includes(handshake), 'Handshake skin tone sequence must not be corrupted');
    });

    await t.test('3.2 Complex emojis enclosed in nested brackets: ((([👨‍👩‍👧‍👦] ❤️)))', () => {
        const emoji = '👨‍👩‍👧‍👦';
        const input = `عضویت در سامانه ((([${emoji}] موفق))) ثبت شد.`;
        const output = virastar.process(input);
        assert.ok(output.includes(emoji), 'Emoji within nested brackets must remain completely intact');
    });

    // -------------------------------------------------------------
    // SECTION 4: Directional Isolates & Marks (RLM, LRM, RLI, LRI, PDI)
    // -------------------------------------------------------------
    await t.test('4.1 Explicit RLM mark at start of line forces RTL base direction in Canvas', async () => {
        const RLM = '\u200F';
        const canvas = createMockCanvas();
        // Line starts with RLM followed by Latin text: should have RTL base direction
        const line = `<pre class="text-block">${RLM}English text forced to RTL</pre>`;
        await CardExporter.renderCard(canvas, line, 'zinc', 'windows');

        // Drawn text should align to right margin (x > 300)
        const call = canvas._textCalls.find(c => c.text.includes('English text'));
        assert.ok(call, 'English text must be drawn');
        assert.ok(call.x > 300, `Line with leading RLM must start near right margin, got x=${call.x}`);
    });

    await t.test('4.2 Explicit LRM mark at start of line forces LTR base direction in Canvas', async () => {
        const LRM = '\u200E';
        const canvas = createMockCanvas();
        // Line starts with LRM followed by Persian text: should have LTR base direction
        const line = `<pre class="text-block">${LRM}متن فارسی اجباری به چپ</pre>`;
        await CardExporter.renderCard(canvas, line, 'zinc', 'windows');

        // Drawn text should align to left margin (x < 400)
        const call = canvas._textCalls.find(c => c.text.includes('متن فارسی'));
        assert.ok(call, 'Persian text must be drawn');
        assert.ok(call.x < 400, `Line with leading LRM must start near left margin, got x=${call.x}`);
    });

    await t.test('4.3 Directional isolates (RLI, LRI, FSI, PDI) in mixed technical payload', () => {
        const RLI = '\u2067';
        const LRI = '\u2066';
        const PDI = '\u2069';

        const text = `کامپایل ${LRI}cargo build --release${PDI} با موفقیت در ${RLI}لینوکس${PDI} انجام شد.`;
        const output = virastar.process(text);
        assert.ok(output.includes('cargo build --release'));
        assert.ok(output.includes('لینوکس'));
    });

    // -------------------------------------------------------------
    // SECTION 5: Tables, Dashes & False-Positive Boundary Testing
    // -------------------------------------------------------------
    await t.test('5.1 Prose containing horizontal dash ─ (U+2500) must NOT be classified as table in app.js', () => {
        const app = loadApp();
        const prose = 'مرحله اول ─ مقدمه و بیان مسئله\nمرحله دوم ─ روش تحقیق و ارزیابی';

        app.emitTauriEvent('new-content', {
            raw_text: prose,
            html: '',
            visible_length: prose.length,
            is_empty: false,
            is_html: false,
        });

        const html = app.elements['content-body'].innerHTML;
        // Verify that prose containing ─ is NOT styled as a monospace table-block
        assert.ok(!html.includes('table-block'), 'Prose with ─ must not be classified as table-block');
        assert.ok(html.includes('text-block'), 'Prose with ─ should be classified as text-block');
    });

    await t.test('5.2 Prose containing bold horizontal dash ━ (U+2501) must NOT be classified as table in app.js', () => {
        const app = loadApp();
        const prose = 'فصل اول ━ کلیات طرح پژوهشی';

        app.emitTauriEvent('new-content', {
            raw_text: prose,
            html: '',
            visible_length: prose.length,
            is_empty: false,
            is_html: false,
        });

        const html = app.elements['content-body'].innerHTML;
        assert.ok(!html.includes('table-block'), 'Prose with ━ must not be classified as table-block');
    });

    await t.test('5.3 True Box-Drawing table with vertical separators │ is correctly identified as table', () => {
        const app = loadApp();
        const boxTable = [
            '┌──────┬──────┐',
            '│ عنوان │ مقدار │',
            '├──────┼──────┤',
            '│ آزمون │ ۱۰۰  │',
            '└──────┴──────┘',
        ].join('\n');

        app.emitTauriEvent('new-content', {
            raw_text: boxTable,
            html: '',
            visible_length: boxTable.length,
            is_empty: false,
            is_html: false,
        });

        const html = app.elements['content-body'].innerHTML;
        assert.ok(html.includes('table-block'), 'Box drawing table with │ must be classified as table-block');
    });

    await t.test('5.4 GFM table WITHOUT outer pipes is recognized as table in app.js', () => {
        const app = loadApp();
        const pipeTable = [
            'نام | سن | شهر',
            '--- | --- | ---',
            'علی | ۲۵ | شیراز',
        ].join('\n');

        app.emitTauriEvent('new-content', {
            raw_text: pipeTable,
            html: '',
            visible_length: pipeTable.length,
            is_empty: false,
            is_html: false,
        });

        const html = app.elements['content-body'].innerHTML;
        assert.ok(html.includes('table-block'), 'GFM table without outer pipes must be classified as table-block');
    });

    await t.test('5.5 Math formula with absolute values |x| must NOT be detected as table', () => {
        const app = loadApp();
        const math = 'فرمول محاسبه قدر مطلق: |x| + |y| = |z| برای اعداد حقیقی';

        app.emitTauriEvent('new-content', {
            raw_text: math,
            html: '',
            visible_length: math.length,
            is_empty: false,
            is_html: false,
        });

        const html = app.elements['content-body'].innerHTML;
        assert.ok(!html.includes('table-block'), 'Math with |x| must not be classified as table-block');
    });

    await t.test('5.6 Mathematical equation starting with pipe |x| + |y| = z must NOT be detected as table in app.js', () => {
        const app = loadApp();
        const mathEq = '|x| + |y| = z';

        app.emitTauriEvent('new-content', {
            raw_text: mathEq,
            html: '',
            visible_length: mathEq.length,
            is_empty: false,
            is_html: false,
        });

        const html = app.elements['content-body'].innerHTML;
        assert.ok(!html.includes('table-block'), 'Line starting with |x| must not be classified as table-block');
        assert.ok(html.includes('text-block'), 'Equation |x| + |y| = z should be rendered as text-block');
    });

    await t.test('5.7 Mathematical formula |a| + |b| = |c| on its own line must NOT be detected as table in app.js', () => {
        const app = loadApp();
        const mathEq = '|a| + |b| = |c|';

        app.emitTauriEvent('new-content', {
            raw_text: mathEq,
            html: '',
            visible_length: mathEq.length,
            is_empty: false,
            is_html: false,
        });

        const html = app.elements['content-body'].innerHTML;
        assert.ok(!html.includes('table-block'), 'Formula |a| + |b| = |c| must not be classified as table-block');
    });

    // -------------------------------------------------------------
    // SECTION 6: Canvas Word Wrapping & P2/P3 Base Direction
    // -------------------------------------------------------------
    await t.test('6.1 Canvas word wrap on unbroken 300-char Persian token without spaces', async () => {
        const canvas = createMockCanvas();
        // 300-character unbroken Persian token
        const longPersianToken = 'می‌خواهم'.repeat(38); // ~304 chars
        const html = `<pre class="text-block">${longPersianToken}</pre>`;

        await CardExporter.renderCard(canvas, html, 'zinc', 'windows');

        // Text should wrap into multiple lines without overflowing canvas logical width (760px)
        assert.ok(canvas._textCalls.length > 1, 'Long Persian unbroken token must be split into multiple lines');
        for (const call of canvas._textCalls) {
            assert.ok(call.x >= 0 && call.x <= canvas.width + 100, `Draw call x=${call.x} must stay within canvas bounds`);
        }
    });

    await t.test('6.2 Canvas word wrap on unbroken 300-char English URL/identifier without spaces', async () => {
        const canvas = createMockCanvas();
        const longUrl = 'https://example.com/api/v1/resource/subresource?param1=verylongval&param2=anotherlongval' + 'X'.repeat(200);
        const html = `<pre class="text-block">${longUrl}</pre>`;

        await CardExporter.renderCard(canvas, html, 'zinc', 'windows');

        assert.ok(canvas._textCalls.length > 1, 'Long URL unbroken token must be split into multiple lines');
    });

    await t.test('6.3 Canvas P2/P3 base direction: emoji followed by Persian vs English', async () => {
        const canvas1 = createMockCanvas();
        const linePersian = '<pre class="text-block">🚀 پرتاب ماهواره با موفقیت انجام شد.</pre>';
        await CardExporter.renderCard(canvas1, linePersian, 'zinc', 'windows');
        const persianCall = canvas1._textCalls.find(c => c.text.includes('پرتاب'));
        assert.ok(persianCall, 'Persian text must be drawn');
        assert.ok(persianCall.x > 300, `Emoji + Persian line must have RTL base direction (x > 300), got x=${persianCall.x}`);

        const canvas2 = createMockCanvas();
        const lineEnglish = '<pre class="text-block">🚀 Rocket launch was successful.</pre>';
        await CardExporter.renderCard(canvas2, lineEnglish, 'zinc', 'windows');
        const englishCall = canvas2._textCalls.find(c => c.text.includes('Rocket'));
        assert.ok(englishCall, 'English text must be drawn');
        assert.ok(englishCall.x < 400, `Emoji + English line must have LTR base direction (x < 400), got x=${englishCall.x}`);
    });

    await t.test('6.4 Canvas P2/P3 base direction: numbers followed by Persian vs English', async () => {
        const canvas1 = createMockCanvas();
        const linePersian = '<pre class="text-block">2026 سال مهمی در توسعه فناوری است.</pre>';
        await CardExporter.renderCard(canvas1, linePersian, 'zinc', 'windows');
        const persianCall = canvas1._textCalls.find(c => c.text.includes('سال'));
        assert.ok(persianCall, 'Persian text must be drawn');
        assert.ok(persianCall.x > 300, `Numbers + Persian line must have RTL base direction, got x=${persianCall.x}`);

        const canvas2 = createMockCanvas();
        const lineEnglish = '<pre class="text-block">2026 is an important year in technology.</pre>';
        await CardExporter.renderCard(canvas2, lineEnglish, 'zinc', 'windows');
        const englishCall = canvas2._textCalls.find(c => c.text.includes('is'));
        assert.ok(englishCall, 'English text must be drawn');
        assert.ok(englishCall.x < 400, `Numbers + English line must have LTR base direction, got x=${englishCall.x}`);
    });

    await t.test('6.5 Canvas line with multiple mixed runs preserves right-to-left layout order', async () => {
        const canvas = createMockCanvas();
        // Line with text, code badge, and text:
        // "دستور" (first) + "npm test" (second) + "را اجرا کنید" (third)
        const html = '<pre class="text-block">دستور <code class="inline-code">npm test</code> را اجرا کنید.</pre>';
        await CardExporter.renderCard(canvas, html, 'zinc', 'windows');

        const firstCall = canvas._textCalls.find(c => c.text.includes('دستور'));
        const codeCall = canvas._textCalls.find(c => c.text.includes('npm test'));
        const lastCall = canvas._textCalls.find(c => c.text.includes('را اجرا کنید'));

        assert.ok(firstCall, 'First text run must be drawn');
        assert.ok(codeCall, 'Code badge must be drawn');
        assert.ok(lastCall, 'Last text run must be drawn');

        // In RTL layout:
        // First item ("دستور") should be at the rightmost position (highest x)
        // Code badge should be to its left (lower x)
        // Last item ("را اجرا کنید") should be to the left of the code badge (lowest x)
        assert.ok(firstCall.x > codeCall.x, `First item x (${firstCall.x}) must be > code badge x (${codeCall.x})`);
        assert.ok(codeCall.x > lastCall.x, `Code badge x (${codeCall.x}) must be > last item x (${lastCall.x})`);
    });

    await t.test('6.6 Prose containing horizontal dash ─ rendered on Canvas must NOT be painted as LTR monospace table', async () => {
        const app = loadApp();
        const prose = 'مرحله اول ─ مقدمه و بیان مسئله';
        app.emitTauriEvent('new-content', {
            raw_text: prose,
            html: '',
            visible_length: prose.length,
            is_empty: false,
            is_html: false,
        });

        const canvas = createMockCanvas();
        await CardExporter.renderCard(canvas, app.elements['content-body'].innerHTML, 'zinc', 'windows');

        const call = canvas._textCalls.find(c => c.text.includes('مرحله اول'));
        assert.ok(call, 'Prose line must be drawn on canvas');
        // If it was wrongly treated as a table block, it would be drawn with Consolas monospace and textAlign='left'
        assert.ok(!call.font.includes('Consolas'), 'Prose with ─ should use Vazirmatn body font, NOT Consolas table font');
        assert.ok(call.textAlign !== 'left', 'Prose with ─ should be right-aligned for Persian RTL, NOT left-aligned');
    });

    await t.test('6.7 GFM table without outer pipes rendered on Canvas must be formatted as table block with Consolas monospace', async () => {
        const app = loadApp();
        const table = 'نام | سن | شهر\n--- | --- | ---\nعلی | ۲۵ | شیراز';
        app.emitTauriEvent('new-content', {
            raw_text: table,
            html: '',
            visible_length: table.length,
            is_empty: false,
            is_html: false,
        });

        const canvas = createMockCanvas();
        await CardExporter.renderCard(canvas, app.elements['content-body'].innerHTML, 'zinc', 'windows');

        const cellCall = canvas._textCalls.find(c => c.text.includes('علی') || c.text.includes('شیراز'));
        assert.ok(cellCall, 'Table cell content must be drawn on canvas');
        assert.ok(cellCall.font.includes('Consolas'), 'GFM table cells must be rendered in monospace Consolas font');
    });

    await t.test('6.8 Mathematical equation |x| + |y| = z rendered on Canvas must NOT be clipped inside a table container', async () => {
        const app = loadApp();
        const math = '|x| + |y| = z';
        app.emitTauriEvent('new-content', {
            raw_text: math,
            html: '',
            visible_length: math.length,
            is_empty: false,
            is_html: false,
        });

        const canvas = createMockCanvas();
        await CardExporter.renderCard(canvas, app.elements['content-body'].innerHTML, 'zinc', 'windows');

        const mathCall = canvas._textCalls.find(c => c.text.includes('|x|'));
        assert.ok(mathCall, 'Math equation must be drawn on canvas');
        assert.ok(!mathCall.font.includes('Consolas'), 'Math equation should be drawn as text, not inside a table box');
    });
});
