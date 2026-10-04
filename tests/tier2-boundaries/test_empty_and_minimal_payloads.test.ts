import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const test = require('node:test');
const assert = require('node:assert');
const { loadApp, loadVirastar } = require('../helpers/env');

test('Tier 2: Boundary & Corner Cases - Empty & Minimal Payloads', async (t) => {
    const virastar = loadVirastar();

    await t.test('2.1.1 Empty string returns empty fallback and 0 counters', () => {
        const app = loadApp();
        app.emitTauriEvent('new-content', {
            raw_text: '',
            html: '<div class="empty-state">متنی برای نمایش انتخاب نشده است.</div>',
            visible_length: 0,
            is_empty: true,
            is_html: false,
        });

        assert.strictEqual(virastar.process(''), '');
        assert.ok(app.elements['content-body'].innerHTML.includes('empty-state'));
        assert.strictEqual(app.elements['char-count'].textContent, '۰ کاراکتر');
        assert.strictEqual(app.elements['word-count'].textContent, '۰ کلمه');
    });

    await t.test('2.1.2 Whitespace-only string handling across spaces, tabs, and newlines', () => {
        const app = loadApp();
        const whitespaces = '   \t\r\n  \n\t  ';
        const processed = virastar.process(whitespaces);
        assert.strictEqual(processed.trim(), '');

        app.emitTauriEvent('new-content', {
            raw_text: whitespaces,
            html: '',
            visible_length: 0,
            is_empty: true,
            is_html: false,
        });

        assert.strictEqual(app.elements['word-count'].textContent, '۰ کلمه');
    });

    await t.test('2.1.3 Single character boundary tests', () => {
        const chars = ['آ', 'x', '7', '؟', '.', ' '];
        for (const ch of chars) {
            const result = virastar.process(ch);
            assert.ok(typeof result === 'string', `Processing single char "${ch}" must return a string`);
            if (ch === '7') {
                assert.strictEqual(result, '۷', 'Single digit 7 should become ۷');
            }
        }
    });

    await t.test('2.1.4 Empty inline code backticks and unpaired single backtick', () => {
        const app = loadApp();
        const input = 'این `` و این ` بک‌تیک است';
        app.emitTauriEvent('new-content', {
            raw_text: input,
            html: '',
            visible_length: input.length,
            is_empty: false,
            is_html: false,
        });

        const html = app.elements['content-body'].innerHTML;
        // Should not crash and handle without throwing syntax errors
        assert.ok(html.length > 0);
    });

    await t.test('2.1.5 Empty fenced code block (```\\n```)', () => {
        const app = loadApp();
        const input = 'متن قبل\n```\n```\nمتن بعد';
        app.emitTauriEvent('new-content', {
            raw_text: input,
            html: '',
            visible_length: input.length,
            is_empty: false,
            is_html: false,
        });

        const html = app.elements['content-body'].innerHTML;
        assert.ok(html.includes('متن قبل'));
        assert.ok(html.includes('متن بعد'));
    });

    await t.test('2.1.6 Empty HTML tags yield 0 visible characters', () => {
        const app = loadApp();
        app.emitTauriEvent('new-content', {
            raw_text: '',
            html: '<div class="html-content"><p></p><br><span></span></div>',
            visible_length: 0,
            is_empty: false,
            is_html: true,
        });

        assert.strictEqual(app.elements['char-count'].textContent, '۰ کاراکتر');
        assert.strictEqual(app.elements['word-count'].textContent, '۰ کلمه');
    });
});
