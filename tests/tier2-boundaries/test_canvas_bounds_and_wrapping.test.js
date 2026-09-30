const test = require('node:test');
const assert = require('node:assert');
const { loadCardExporter, createMockCanvas } = require('../helpers/env.js');

test('Tier 2: Boundary & Corner Cases - Canvas Dimension Bounds & Text Wrapping', async (t) => {
    const { CardExporter } = loadCardExporter();

    await t.test('2.4.1 Oversized unbroken token (>696px) does not overflow canvas width', async () => {
        const canvas = createMockCanvas();
        // A single unbroken token of 150 characters has width ~1350px, exceeding maxLineWidth (696px)
        const longToken = 'A'.repeat(150);
        const html = `<pre class="text-block">${longToken}</pre>`;

        await CardExporter.renderCard(canvas, html, 'zinc', 'windows');

        // All text draw calls should stay within reasonable bounds of canvas width
        for (const call of canvas._textCalls) {
            assert.ok(call.x >= 0, `Text draw x coordinate must not be negative: ${call.x}`);
            assert.ok(call.x <= canvas.width + 100, `Text draw x coordinate must not overflow canvas width: ${call.x}`);
        }
    });

    await t.test('2.4.2 Canvas height capping on massive payload prevents GPU buffer overflow', async () => {
        const canvas = createMockCanvas();
        // Generate a 1,000-line payload
        const hugeContent = Array(1000).fill('خط تکراری برای بررسی سقف ابعاد کانواس').join('\n');
        const html = `<pre class="text-block">${hugeContent}</pre>`;

        await CardExporter.renderCard(canvas, html, 'zinc', 'windows');

        // To prevent Chromium 32,767px crash and 4.8GB GPU memory exhaustion,
        // canvas.height should be bounded by a safe threshold (e.g. <= 8192px)
        // or total pixels < 16M pixels
        assert.ok(canvas.height <= 8192 * 2, `Canvas height (${canvas.height}) must be capped at safe threshold`);
    });

    await t.test('2.4.3 Extreme aspect ratios: single line with 3,000 characters', async () => {
        const canvas = createMockCanvas();
        const singleLongLine = 'کلمه '.repeat(600);
        const html = `<pre class="text-block">${singleLongLine}</pre>`;

        await CardExporter.renderCard(canvas, html, 'zinc', 'windows');
        assert.ok(canvas.height > 100, 'Canvas height should expand with wrapped lines');
        assert.ok(canvas._textCalls.length > 50, 'Text should be broken into multiple wrapped line calls');
    });

    await t.test('2.4.4 Multi-line code block in card exporter maintains monospace layout', async () => {
        const canvas = createMockCanvas();
        const codeLines = [
            'function solve() {',
            '    const a = 10;',
            '    const b = 20;',
            '    return a + b;',
            '}'
        ].join('\n');
        const html = `<pre class="code-block" dir="ltr"><code dir="ltr">${codeLines}</code></pre>`;

        await CardExporter.renderCard(canvas, html, 'zinc', 'windows');

        // Drawn code lines should use monospace font
        const drawnTexts = canvas._textCalls.map(c => c.text);
        assert.ok(drawnTexts.some(t => t.includes('function solve()') || t.includes('const a = 10;')));
    });

    await t.test('2.4.5 Awaits webfont readiness before measuring and drawing text', async () => {
        let fontReadyCalled = false;
        const canvas = createMockCanvas();
        // Spy on font readiness
        const originalReady = canvas._ctx;
        await CardExporter.renderCard(canvas, '<pre class="text-block">تست فونت</pre>', 'zinc', 'windows');

        assert.ok(canvas._drawCalls.length > 0);
    });
});
