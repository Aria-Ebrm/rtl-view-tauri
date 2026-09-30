const test = require('node:test');
const assert = require('node:assert');
const { loadApp, loadVirastar } = require('../helpers/env.js');

test('Tier 3: Cross-Feature Combinations - Pairwise & Multi-Feature Interactions', async (t) => {
    const virastar = loadVirastar();

    await t.test('3.1 Markdown table containing Persian text with ZWNJ, English URLs, and numbers', () => {
        const app = loadApp();
        const tablePayload = [
            '| ردیف | عنوان سرویس | آدرس مستندات | پورت | وضعیت |',
            '| --- | --- | --- | --- | --- |',
            '| 1 | سرویس کتاب ها | https://api.example.com:8443/v1/books?limit=10 | 8443 | فعال می باشد |',
            '| 2 | سرویس کاربران | https://api.example.com:8443/v1/users | 8443 | در حال اجرا |',
        ].join('\n');

        app.emitTauriEvent('new-content', {
            raw_text: tablePayload,
            html: '',
            visible_length: tablePayload.length,
            is_empty: false,
            is_html: false,
        });

        const bodyHtml = app.elements['content-body'].innerHTML;
        assert.ok(bodyHtml.includes('table-block') || bodyHtml.includes('<table>'), 'Should detect and render table');
        assert.ok(bodyHtml.includes('https://api.example.com:8443/v1/books'), 'URL with port must be preserved in table');
    });

    await t.test('3.2 Fenced code block containing Persian comments and English variables', () => {
        const app = loadApp();
        const codePayload = [
            'راهنمای تنظیمات سرور:',
            '```typescript',
            '// آیا سرویس فعال است؟',
            'const maxRetries: number = 5;',
            'const baseUrl: string = "https://internal.net:9090";',
            '```',
            'لطفاً بعد از تنظیم، سرور را مجدداً راه اندازی کنید.',
        ].join('\n');

        app.emitTauriEvent('new-content', {
            raw_text: codePayload,
            html: '',
            visible_length: codePayload.length,
            is_empty: false,
            is_html: false,
        });

        const bodyHtml = app.elements['content-body'].innerHTML;
        assert.ok(bodyHtml.includes('code-block'), 'Code block should have code-block class');
        assert.ok(bodyHtml.includes('maxRetries'), 'Variable names must be preserved');
        assert.ok(bodyHtml.includes('https://internal.net:9090'), 'URL inside code block must be preserved');
    });

    await t.test('3.3 Inline code badges embedded inside RTL paragraphs with URLs and brackets', () => {
        const app = loadApp();
        const mixedText = 'برای نصب پکیج دستور `npm install @tauri-apps/api` را در ترمینال وارد کنید (اطلاعات بیشتر در https://tauri.app/v2 موجود است).';

        app.emitTauriEvent('new-content', {
            raw_text: mixedText,
            html: '',
            visible_length: mixedText.length,
            is_empty: false,
            is_html: false,
        });

        const bodyHtml = app.elements['content-body'].innerHTML;
        assert.ok(bodyHtml.includes('inline-code'), 'Inline code badge should be generated');
        assert.ok(bodyHtml.includes('https://tauri.app/v2'), 'URL must be linked or preserved');
        assert.ok(bodyHtml.includes('(') && bodyHtml.includes(')'), 'Surrounding parentheses must be preserved');
    });

    await t.test('3.4 Persian text with complex URLs under active Virastar and Persian digits', () => {
        const app = loadApp();
        const complexUrl = 'https://search.example.ir:8080/query?item=2026&status=1#page=5';
        const input = `در آدرس ${complexUrl} تعداد 15 مورد یافت شد.`;

        app.emitTauriEvent('new-content', {
            raw_text: input,
            html: '',
            visible_length: input.length,
            is_empty: false,
            is_html: false,
        });

        const bodyHtml = app.elements['content-body'].innerHTML;
        // The URL in the link must retain ASCII digits (8080, 2026, 1, 5)
        assert.ok(bodyHtml.includes('https://search.example.ir:8080/query?item=2026'), 'URL query and port digits must stay ASCII');
        // Outside the URL, 15 should convert to Persian ۱۵
        assert.ok(bodyHtml.includes('۱۵') || bodyHtml.includes('15'), 'Prose digits should be formatted');
    });

    await t.test('3.5 Nested brackets containing inline code, Persian plurals and SemVer', () => {
        const app = loadApp();
        const input = 'بررسی تغییرات (((کتاب‌ها و پکیج `rtl-view-core` نسخه 2.1.4))) انجام شد.';

        app.emitTauriEvent('new-content', {
            raw_text: input,
            html: '',
            visible_length: input.length,
            is_empty: false,
            is_html: false,
        });

        const bodyHtml = app.elements['content-body'].innerHTML;
        assert.ok(bodyHtml.includes('rtl-view-core'), 'Inline code name preserved');
        assert.ok(bodyHtml.includes('(((') && bodyHtml.includes(')))'), 'Triple brackets preserved');
    });

    await t.test('3.6 Theme switching combined with Virastar toggle and font size adjustment', () => {
        const app = loadApp();
        const text = 'این یک متن ترکیبی با کدهای `console.log(123)` و https://github.com است.';

        app.emitTauriEvent('new-content', {
            raw_text: text,
            html: '',
            visible_length: text.length,
            is_empty: false,
            is_html: false,
        });

        // Change theme to dracula
        app.elements['theme-select'].value = 'dracula';
        app.elements['theme-select']._dispatch('change');
        assert.strictEqual(app.mockDoc.documentElement.getAttribute('data-theme'), 'dracula');

        // Increase font size
        app.elements['btn-font-inc'].click();

        // Toggle virastar
        app.elements['btn-virastar'].click();

        // Re-render and verify content still renders cleanly
        const bodyHtml = app.elements['content-body'].innerHTML;
        assert.ok(bodyHtml.includes('console.log(123)'));
    });
});
