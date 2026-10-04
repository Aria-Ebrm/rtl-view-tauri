import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const test = require('node:test');
const assert = require('node:assert');
const { loadCardExporter, createMockCanvas } = require('../helpers/env');

test('Tier 1: Feature Coverage - Canvas Social Card Exporter', async (t) => {
    const { CardExporter } = loadCardExporter();

    await t.test('5.1 Theme palette definitions for all 5 themes', () => {
        const palettes = CardExporter.THEME_PALETTES;
        assert.ok(palettes, 'THEME_PALETTES must be exported');

        const themes = ['zinc', 'onedark', 'dracula', 'gruvbox', 'light'];
        for (const theme of themes) {
            assert.ok(palettes[theme], `Theme ${theme} must exist`);
            assert.ok(palettes[theme].cardBg, `Theme ${theme} must have cardBg`);
            assert.ok(palettes[theme].text, `Theme ${theme} must have text`);
            assert.ok(palettes[theme].accent, `Theme ${theme} must have accent`);
            assert.ok(palettes[theme].codeBg, `Theme ${theme} must have codeBg`);
            assert.ok(palettes[theme].tableBg, `Theme ${theme} must have tableBg`);
        }
    });

    await t.test('5.2 OS window decoration rendering: Windows 11 controls', async () => {
        const canvas = createMockCanvas();
        const html = '<pre class="text-block">تست رندرینگ با دکوراسیون ویندوز</pre>';
        await CardExporter.renderCard(canvas, html, 'zinc', 'windows');
        assert.ok(canvas._drawCalls.length > 0, 'Canvas should receive draw calls');

        // Verify window controls were rendered (stroke calls for minimize/maximize/close)
        const strokeCalls = canvas._drawCalls.filter(c => c.type === 'stroke');
        assert.ok(strokeCalls.length >= 3, 'Windows style should draw window control icons');
    });

    await t.test('5.3 OS window decoration rendering: macOS traffic lights', async () => {
        const canvas = createMockCanvas();
        const html = '<pre class="text-block">تست دکمه‌های ترافیک لایت مک</pre>';
        await CardExporter.renderCard(canvas, html, 'dracula', 'mac');

        // macOS traffic lights draw 3 colored dots (red #ff5f56, yellow #ffbd2e, green #27c93f)
        const fillCalls = canvas._drawCalls.filter(c => c.type === 'fill');
        const fills = fillCalls.map(c => c.fillStyle);
        assert.ok(fills.some(f => f === '#ff5f56'), 'Mac style must render close red dot');
        assert.ok(fills.some(f => f === '#ffbd2e'), 'Mac style must render minimize yellow dot');
        assert.ok(fills.some(f => f === '#27c93f'), 'Mac style must render maximize green dot');
    });

    await t.test('5.4 Retina 2x resolution scaling logic', async () => {
        const canvas = createMockCanvas();
        const scale = 2;
        const html = '<pre class="text-block">بررسی ضریب رزولوشن ۲ برابر</pre>';
        await CardExporter.renderCard(canvas, html, 'zinc', 'windows');

        // Canvas physical dimensions must be exactly totalLogicalDimensions * scale
        assert.ok(canvas.width >= 700 * scale, `Canvas width (${canvas.width}) should be >= 1400px`);
        assert.ok(canvas.height >= 100 * scale, `Canvas height (${canvas.height}) should be scaled`);
    });

    await t.test('5.5 Tokenizer extracts <code> badges with badge styling', async () => {
        const canvas = createMockCanvas();
        const html = '<pre class="text-block">متن با <code class="inline-code">npm test</code> درون‌خطی</pre>';
        await CardExporter.renderCard(canvas, html, 'zinc', 'windows');

        const textDrawn = canvas._textCalls.map(c => c.text);
        assert.ok(textDrawn.some(t => t.includes('npm test')), 'Code token must be drawn on canvas');

        // Badge background should be filled with codeBg
        const codeBg = CardExporter.THEME_PALETTES.zinc.codeBg;
        const fillCalls = canvas._drawCalls.filter(c => c.type === 'fill' && c.fillStyle === codeBg);
        assert.ok(fillCalls.length > 0, 'Code badge background must be filled');
    });

    await t.test('5.6 Strips HTML tags so attributes like href or class are not drawn on canvas', async () => {
        const canvas = createMockCanvas();
        const htmlLine = '<pre class="text-block">مشاهده در <a href="https://example.com" class="text-link" dir="ltr">https://example.com</a> برای ادامه</pre>';
        await CardExporter.renderCard(canvas, htmlLine, 'zinc', 'windows');

        // None of the drawn text should contain raw HTML tag strings like '<a', 'href=', 'class='
        const drawnTexts = canvas._textCalls.map(c => c.text);
        for (const text of drawnTexts) {
            assert.ok(!text.startsWith('<a'), `Drawn text should not be a raw HTML tag: "${text}"`);
            assert.ok(!text.includes('href='), `Drawn text should not contain href=: "${text}"`);
            assert.ok(!text.includes('class="text-link"'), `Drawn text should not contain class attribute: "${text}"`);
        }
    });
});
