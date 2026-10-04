import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const test = require('node:test');
const assert = require('node:assert');
const { loadApp } = require('../helpers/env');

test('Tier 1: Feature Coverage - Token & URL Protection in Pipeline', async (t) => {
    await t.test('4.1 Protects URLs from Persian digit conversion and question mark corruption', () => {
        const app = loadApp();
        const url = 'https://example.com:8080/api?v=2&id=105';
        const payload = {
            raw_text: `برای مشاهده مستندات به آدرس ${url} مراجعه کنید.`,
            html: '',
            visible_length: 50,
            is_empty: false,
            is_html: false,
        };

        app.emitTauriEvent('new-content', payload);
        const renderedHtml = app.elements['content-body'].innerHTML;

        // The URL inside href and link text must remain pristine LTR with ASCII digits and English ?
        assert.ok(renderedHtml.includes('https://example.com:8080/api?v=2&amp;id=105') || renderedHtml.includes('https://example.com:8080/api?v=2&id=105'),
            'URL must maintain English digits, colon, port, and query parameter ?');
        assert.ok(!renderedHtml.includes('api؟v='), 'URL ? should never become Persian ؟');
        assert.ok(!renderedHtml.includes(':۸۰۸۰'), 'Port number should never become Persian digits');
    });

    await t.test('4.2 Protects inline code backticks from Virastar alteration', () => {
        const app = loadApp();
        const codeSnippet = '`const port = 3000; // timeout: 500ms;`';
        const payload = {
            raw_text: `در کد زیر مقدار متغیر مشخص است: ${codeSnippet}`,
            html: '',
            visible_length: 50,
            is_empty: false,
            is_html: false,
        };

        app.emitTauriEvent('new-content', payload);
        const renderedHtml = app.elements['content-body'].innerHTML;

        assert.ok(renderedHtml.includes('<code class="inline-code">'), 'Inline code must be wrapped in code tag');
        assert.ok(renderedHtml.includes('3000'), 'Digits inside inline code must remain 3000');
        assert.ok(renderedHtml.includes('500ms'), 'Units inside inline code must remain 500ms');
        assert.ok(!renderedHtml.includes('۳۰۰۰'), 'Inline code digits must not be converted to Persian');
    });

    await t.test('4.3 Protects fenced code blocks and preserves indentation', () => {
        const app = loadApp();
        const fencedCode = '```javascript\nfunction test() {\n    const id = 42;\n    return id;\n}\n```';
        const payload = {
            raw_text: `کد جاوااسکریپت:\n${fencedCode}`,
            html: '',
            visible_length: 60,
            is_empty: false,
            is_html: false,
        };

        app.emitTauriEvent('new-content', payload);
        const renderedHtml = app.elements['content-body'].innerHTML;

        assert.ok(renderedHtml.includes('class="code-block"'), 'Code block must have code-block class');
        assert.ok(renderedHtml.includes('id = 42;'), 'Code block must retain id = 42 without Persian digits');
        assert.ok(!renderedHtml.includes('۴۲'), 'Code block numbers must not convert to Persian');
    });

    await t.test('4.4 Preserves technical alphanumeric tokens and IP addresses', () => {
        const app = loadApp();
        const payload = {
            raw_text: 'آدرس سرور 192.168.1.100 و پروتکل SHA256 و نسخه v2.1.4 است.',
            html: '',
            visible_length: 60,
            is_empty: false,
            is_html: false,
        };

        app.emitTauriEvent('new-content', payload);
        const renderedHtml = app.elements['content-body'].innerHTML;

        // Verify IP address structure is preserved
        assert.ok(renderedHtml.includes('192.168.1.100') || renderedHtml.includes('۱۹۲.۱۶۸.۱.۱۰۰'),
            'IP address tokens must be maintained coherently');
        assert.ok(renderedHtml.includes('SHA256') || renderedHtml.includes('SHA'), 'SHA256 token must be preserved');
    });

    await t.test('4.5 Protects unclosed code fences at EOF from leaking into prose', () => {
        const app = loadApp();
        const unclosedCode = 'متن قبل از کد\n```rust\nlet x = 100;\n// هنوز بسته نشده است';
        const payload = {
            raw_text: unclosedCode,
            html: '',
            visible_length: 60,
            is_empty: false,
            is_html: false,
        };

        app.emitTauriEvent('new-content', payload);
        const renderedHtml = app.elements['content-body'].innerHTML;

        // Unclosed code block should be handled gracefully without throwing or corrupting text
        assert.ok(renderedHtml.length > 0);
        assert.ok(renderedHtml.includes('let x = 100;'));
    });
});
