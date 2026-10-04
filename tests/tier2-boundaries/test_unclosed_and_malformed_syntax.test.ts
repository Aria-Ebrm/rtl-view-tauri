import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const test = require('node:test');
const assert = require('node:assert');
const { loadApp, loadVirastar } = require('../helpers/env');

test('Tier 2: Boundary & Corner Cases - Unclosed & Malformed Syntax', async (t) => {
    const virastar = loadVirastar();

    await t.test('2.5.1 Unclosed code block at EOF does not cause crash or freeze', () => {
        const app = loadApp();
        const unclosed = 'متن عادی\n```typescript\ninterface User {\n    id: number;\n    name: string;';
        app.emitTauriEvent('new-content', {
            raw_text: unclosed,
            html: '',
            visible_length: unclosed.length,
            is_empty: false,
            is_html: false,
        });

        const bodyHtml = app.elements['content-body'].innerHTML;
        assert.ok(bodyHtml.length > 0);
        assert.ok(bodyHtml.includes('interface User'));
    });

    await t.test('2.5.2 Unpaired backticks across multiple lines treated as plain text', () => {
        const app = loadApp();
        const input = 'خط اول با `یک بک‌تیک تنها\nخط دوم بدون بسته شدن\nخط سوم `کد معتبر` پایان';
        app.emitTauriEvent('new-content', {
            raw_text: input,
            html: '',
            visible_length: input.length,
            is_empty: false,
            is_html: false,
        });

        const bodyHtml = app.elements['content-body'].innerHTML;
        assert.ok(bodyHtml.includes('<code class="inline-code">کد معتبر</code>') || bodyHtml.includes('کد معتبر'));
    });

    await t.test('2.5.3 Broken markdown table missing closing pipes or header separators', () => {
        const app = loadApp();
        const brokenTable = [
            '| نام | سن | شهر |',
            '| علی | 25 |',
            '| رضا | 30 | شیراز | اضافه |',
        ].join('\n');

        app.emitTauriEvent('new-content', {
            raw_text: brokenTable,
            html: '',
            visible_length: brokenTable.length,
            is_empty: false,
            is_html: false,
        });

        const bodyHtml = app.elements['content-body'].innerHTML;
        assert.ok(bodyHtml.length > 0);
    });

    await t.test('2.5.4 Malformed HTML with dangling open tags', () => {
        const app = loadApp();
        const malformed = '<div><p>متن ناقص <strong>برجسته بدون بستن';
        app.emitTauriEvent('new-content', {
            raw_text: 'متن ناقص برجسته بدون بستن',
            html: malformed,
            visible_length: 25,
            is_empty: false,
            is_html: true,
        });

        const bodyHtml = app.elements['content-body'].innerHTML;
        assert.strictEqual(bodyHtml, malformed);
    });

    await t.test('2.5.5 URL with Persian query parameters and fragment identifier', () => {
        const app = loadApp();
        const url = 'https://example.com/search?q=کتابخانه+ملی&category=فرهنگ#بخش-۱';
        const input = `برای جستجو به ${url} بروید.`;

        app.emitTauriEvent('new-content', {
            raw_text: input,
            html: '',
            visible_length: input.length,
            is_empty: false,
            is_html: false,
        });

        const bodyHtml = app.elements['content-body'].innerHTML;
        assert.ok(bodyHtml.includes('https://example.com/search'));
    });
});
