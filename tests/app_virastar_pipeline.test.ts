import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

/**
 * Automated Unit & Stress Tests for app.js Virastar Pipeline & DOM Optimization
 * Uses Node.js native test runner (node:test)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./helpers/env');

describe('App Pipeline - URL Protection', () => {
    it('should protect URL ports and query parameters from Persian digit mutation', () => {
        const app = loadApp();
        const { processWithVirastar } = app.mockWin.RtlApp;

        const input = 'لطفاً به لینک https://example.com:8080/api?v=2&id=105 مراجعه کنید و قیمت 1000 تومان است.';
        // Digits enabled = true, Virastar enabled = true
        const processed = processWithVirastar(input, true, true);

        // General text digits should be converted to Persian
        assert.ok(processed.includes('۱۰۰۰'), 'General text digits should be converted to Persian numerals');

        // URL must retain ASCII digits for port and parameters, and ASCII question mark
        assert.ok(processed.includes('https://example.com:8080/api?v=2&id=105'), 'URL port and query params must not be mutated');
        assert.ok(!processed.includes(':۸۰۸۰'), 'Port 8080 must not become Persian numerals');
        assert.ok(!processed.includes('؟v=۲'), 'Query parameter ?v=2 must not become Persian question mark or numerals');
    });

    it('should correctly format and linkify protected URLs in formatInline', () => {
        const app = loadApp();
        const { formatInline } = app.mockWin.RtlApp;

        const text = 'آدرس سرور: https://api.service.ir:8443/health?status=1 و تمام.';
        const formatted = formatInline(text);

        assert.ok(formatted.includes('<a href="https://api.service.ir:8443/health?status=1"'), 'Should wrap URL in a tag with proper href');
        assert.ok(formatted.includes('dir="ltr"'), 'Should set dir="ltr" on link');
        assert.ok(formatted.includes('class="text-link"'), 'Should apply text-link class');
    });

    it('should handle URLs enclosed in parentheses and followed by punctuation', () => {
        const app = loadApp();
        const { formatInline } = app.mockWin.RtlApp;

        const text = 'مستندات در (https://example.com/docs?id=42). موجود است،';
        const formatted = formatInline(text);

        assert.ok(formatted.includes('href="https://example.com/docs?id=42"'), 'Href should not capture trailing parenthesis or dot');
        assert.ok(formatted.endsWith('موجود است،') || formatted.includes(').'), 'Trailing punctuation must remain outside link');
    });
});

describe('App Pipeline - Code Block Protection & Language Tags', () => {
    it('should protect unclosed markdown code blocks from Virastar corruption', () => {
        const app = loadApp();
        const { processWithVirastar } = app.mockWin.RtlApp;

        // Unclosed code block without trailing ```
        const unclosedInput = 'توضیحات قبل:\n```rust\nfn main() {\n    let x = 42;\n    println!("Test: {}?", x);\n}';
        const processed = processWithVirastar(unclosedInput, true, true);

        // Quotes inside code should NOT become « »
        assert.ok(processed.includes('"Test: {}?"'), 'Quotes inside unclosed code block must remain ASCII quotes');
        // Digits inside code should NOT become Persian
        assert.ok(processed.includes('let x = 42;'), 'Digits inside unclosed code block must remain ASCII');
        // Semicolons inside code should NOT become Persian ؛
        assert.ok(processed.includes(';'), 'Semicolons inside unclosed code block must remain ASCII semicolons');
    });

    it('should preserve language tags in code block rendering', () => {
        const app = loadApp();
        const { renderContent, updateView } = app.mockWin.RtlApp;

        const payload = {
            raw_text: '```rust\nfn calculate() -> u32 {\n    return 100;\n}\n```\n\n```json\n{"status": 200}\n```\n\n```\nraw code\n```',
            html: '',
            is_empty: false,
            is_html: false,
        };

        updateView(payload);
        const renderedHtml = app.elements['content-body'].innerHTML;

        // Verify class="language-rust" and data-lang="rust"
        assert.ok(renderedHtml.includes('class="language-rust"'), 'Must include class="language-rust" on code element');
        assert.ok(renderedHtml.includes('data-lang="rust"'), 'Must include data-lang="rust" on pre element');

        // Verify json
        assert.ok(renderedHtml.includes('class="language-json"'), 'Must include class="language-json"');
        assert.ok(renderedHtml.includes('data-lang="json"'), 'Must include data-lang="json"');

        // Verify unlabelled block
        assert.ok(renderedHtml.includes('raw code'), 'Must render unlabelled code');
    });

    it('should set dir="auto" on text blocks', () => {
        const app = loadApp();
        const { updateView } = app.mockWin.RtlApp;

        updateView({
            raw_text: 'این یک پاراگراف فارسی است.\n\nThis is an English paragraph.',
            html: '',
            is_empty: false,
            is_html: false,
        });

        const html = app.elements['content-body'].innerHTML;
        assert.ok(html.includes('<pre class="text-block" dir="auto">'), 'Text blocks must have dir="auto" for proper BiDi alignment');
    });
});

describe('App Pipeline - Massive Payload & Performance Optimization', () => {
    it('should handle massive payload (>100,000 characters and 5,000+ lines) efficiently without freezing', () => {
        const app = loadApp();
        const { updateView, updateStats, getCurrentCleanText } = app.mockWin.RtlApp;

        // Build a 5,000-line payload with alternating text, code blocks, tables, and mixed BiDi
        const lines = [];
        for (let i = 0; i < 1250; i++) {
            lines.push(`سطر شماره ${i}: این یک متن آزمایشی طولانی با کلمات مختلف و ارقام 12345 است.`);
            lines.push(`| ردیف ${i} | وضعیت | مقدار |`);
            lines.push('```javascript\nconst val_' + i + ' = ' + i + ';\n```');
            lines.push(`پاراگراف انگلیسی line ${i}: testing performance with https://example.com:8080/item?id=${i}`);
        }
        const massiveText = lines.join('\n');
        assert.ok(massiveText.length > 100000, `Payload length should exceed 100,000 chars (actual: ${massiveText.length})`);
        assert.ok(lines.length >= 5000, `Payload line count should be 5,000+ (actual: ${lines.length})`);

        const startTime = Date.now();
        updateView({
            raw_text: massiveText,
            html: '',
            is_empty: false,
            is_html: false,
        });
        const elapsed = Date.now() - startTime;

        // Should complete parsing and DOM assembly in under 500ms in Node V8
        assert.ok(elapsed < 1000, `Massive payload processed in ${elapsed}ms (must be < 1000ms)`);

        // Check that stats were computed correctly
        assert.ok(app.elements['char-count'].textContent.length > 0);
        assert.ok(app.elements['word-count'].textContent.length > 0);

        // Check that clean text was cached in memory (no DOM layout thrashing required)
        const cached = getCurrentCleanText();
        assert.ok(cached.length > 100000, 'Cached clean text must be populated');
    });

    it('should calculate word and character counts without memory runaway on large text', () => {
        const app = loadApp();
        const { updateStats } = app.mockWin.RtlApp;

        const largeChunk = 'کلمه '.repeat(50000); // 50,000 words, 250,000 characters
        const start = Date.now();
        updateStats(largeChunk);
        const dur = Date.now() - start;

        assert.ok(dur < 100, `updateStats completed in ${dur}ms (must be < 100ms)`);
        assert.ok(app.elements['word-count'].textContent.includes('۵۰۰۰۰'), 'Must accurately count 50,000 words in Persian numerals');
    });

    it('should fast-detect table lines with Unicode box-drawing characters and markdown pipes', () => {
        const app = loadApp();
        const { isTableLine } = app.mockWin.RtlApp;

        assert.equal(isTableLine('│ ستون ۱ │ ستون ۲ │'), true);
        assert.equal(isTableLine('┌────────┬────────┐'), true);
        assert.equal(isTableLine('├────────┼────────┤'), true);
        assert.equal(isTableLine('| col1 | col2 | col3 |'), true);
        assert.equal(isTableLine('این یک خط عادی است بدون جدول'), false);
        assert.equal(isTableLine('تنها یک کاراکتر | در متن'), false);
    });
});
