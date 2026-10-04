import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const test = require('node:test');
const assert = require('node:assert');
const { loadApp, loadVirastar } = require('../helpers/env');

test('Tier 4: Real-World Workload Scenarios - Massive Payload Stress', async (t) => {
    const virastar = loadVirastar();

    await t.test('4.1.1 100,000+ characters continuous Persian prose processes in <250ms with zero panics', () => {
        // Generate a continuous Persian text exceeding 100,000 characters
        const baseParagraph = 'این یک متن آزمایشی طولانی برای بررسی پایداری، عملکرد و سرعت پردازش موتور ویراستار در برابر حجم بسیار زیاد داده‌ها است. کتاب‌ها و مجله‌های متعددی باید بدون هیچ‌گونه افت سرعت پردازش شوند. ';
        const repeatCount = Math.ceil(100000 / baseParagraph.length);
        const massivePayload = baseParagraph.repeat(repeatCount);

        assert.ok(massivePayload.length >= 100000, `Payload length is ${massivePayload.length}`);

        const startTime = performance.now();
        const processed = virastar.process(massivePayload);
        const elapsed = performance.now() - startTime;

        assert.ok(processed.length >= 100000, 'Processed length should match or exceed original');
        assert.ok(elapsed < 250, `Processing 100k+ chars should finish in <250ms, took ${elapsed.toFixed(2)}ms`);
    });

    await t.test('4.1.2 5,000+ lines of mixed content (text, code, tables) processed stably', () => {
        const app = loadApp();
        const lines = [];
        for (let i = 0; i < 1700; i++) {
            lines.push(`پاراگراف شماره ${i}: توضیح عملکرد سیستم در مقیاس بالا با مستندات https://example.com/doc/${i}`);
            lines.push('```javascript\nconst step = ' + i + ';\nconsole.log(step);\n```');
            lines.push('| شناسه | مرحله | وضعیت |\n| --- | --- | --- |\n| ' + i + ' | اجرا | موفق |');
        }
        const multiLinePayload = lines.join('\n');
        const lineCount = multiLinePayload.split('\n').length;
        assert.ok(lineCount >= 5000, `Line count is ${lineCount}`);

        const startTime = performance.now();
        app.emitTauriEvent('new-content', {
            raw_text: multiLinePayload,
            html: '',
            visible_length: multiLinePayload.length,
            is_empty: false,
            is_html: false,
        });
        const elapsed = performance.now() - startTime;

        assert.ok(app.elements['content-body'].innerHTML.length > 0);
        assert.ok(elapsed < 1000, `5,000+ lines processing should complete in <1000ms, took ${elapsed.toFixed(2)}ms`);
    });

    await t.test('4.1.3 Heap memory remains bounded during large document operations', () => {
        const initialHeap = process.memoryUsage().heapUsed;
        const largeText = 'تست بررسی نشت حافظه و پایداری تخصیص بافر در ویراستار. '.repeat(5000);

        for (let i = 0; i < 5; i++) {
            const res = virastar.process(largeText);
            assert.ok(res.length > 0);
        }

        const finalHeap = process.memoryUsage().heapUsed;
        const diffMb = (finalHeap - initialHeap) / (1024 * 1024);
        // Memory diff should not indicate massive memory leaks
        assert.ok(diffMb < 80, `Memory growth should be bounded (<80MB), grew by ${diffMb.toFixed(2)}MB`);
    });

    await t.test('4.1.4 Word and character count calculation on 100k+ character document', () => {
        const app = loadApp();
        const text = 'کلمه '.repeat(25000); // 25,000 words, ~125,000 chars

        app.emitTauriEvent('new-content', {
            raw_text: text,
            html: '',
            visible_length: text.length,
            is_empty: false,
            is_html: false,
        });

        const wordCountText = app.elements['word-count'].textContent;
        const charCountText = app.elements['char-count'].textContent;

        assert.ok(wordCountText.includes('کلمه'));
        assert.ok(charCountText.includes('کاراکتر'));
    });

    await t.test('4.1.5 Massive payload DOM structure maintains valid blocks without throwing', () => {
        const app = loadApp();
        const sampleBlocks = [];
        for (let i = 0; i < 500; i++) {
            sampleBlocks.push(`خط ${i} با کد \`val_${i}\``);
        }

        app.emitTauriEvent('new-content', {
            raw_text: sampleBlocks.join('\n'),
            html: '',
            visible_length: 5000,
            is_empty: false,
            is_html: false,
        });

        const html = app.elements['content-body'].innerHTML;
        assert.ok(html.includes('inline-code'));
    });
});
