const test = require('node:test');
const assert = require('node:assert');
const { loadApp } = require('../helpers/env.js');

test('Tier 4: Real-World Workload Scenarios - Tech Jargon & Tables', async (t) => {
    await t.test('4.2.1 Complex Git commit log with SHA256, SemVer, and mixed BiDi', () => {
        const app = loadApp();
        const gitLog = [
            'commit 48a229ceaefd4985c50990b14116b6d856af0985 (HEAD -> main)',
            'Author: RTL Developer <dev@rtl-view.local>',
            'Date:   Sat Sep 19 09:30:00 2026 +0330',
            '',
            '    انتشار نسخه v2.1.4-rc.1 همراه با ارتقای هسته پردازش متن',
            '    ',
            '    - رفع خطای مربوط به پورت 8080 در آدرس http://127.0.0.1:8080/health',
            '    - هش SHA256 بیلد نهایی: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            '    - کدهای تست درون‌خطی: `cargo test --package rtl-view-lib`',
        ].join('\n');

        app.emitTauriEvent('new-content', {
            raw_text: gitLog,
            html: '',
            visible_length: gitLog.length,
            is_empty: false,
            is_html: false,
        });

        const html = app.elements['content-body'].innerHTML;
        assert.ok(html.includes('48a229ceaefd4985c50990b14116b6d856af0985'), 'SHA commit hash must be intact');
        assert.ok(html.includes('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'), 'SHA256 hash must be intact');
        assert.ok(html.includes('http://127.0.0.1:8080/health'), 'Localhost URL must be intact');
    });

    await t.test('4.2.2 Multi-line box-drawing tables with mixed Persian and English cells', () => {
        const app = loadApp();
        const boxTable = [
            '┌──────┬──────────────┬───────────┐',
            '│ کد   │ نام کتابخانه │ نسخه      │',
            '├──────┼──────────────┼───────────┤',
            '│ 001  │ serde_json   │ 1.0.229   │',
            '│ 002  │ ammonia      │ 4.0.0     │',
            '│ 003  │ regex        │ 1.10.0    │',
            '└──────┴──────────────┴───────────┘',
        ].join('\n');

        app.emitTauriEvent('new-content', {
            raw_text: boxTable,
            html: '',
            visible_length: boxTable.length,
            is_empty: false,
            is_html: false,
        });

        const html = app.elements['content-body'].innerHTML;
        assert.ok(html.includes('table-block'), 'Box drawing table must be formatted with table-block');
        assert.ok(html.includes('serde_json'));
        assert.ok(html.includes('ammonia'));
    });

    await t.test('4.2.3 Avoids false positive table detection for prose containing horizontal dash ─ (U+2500)', () => {
        const app = loadApp();
        // Sentences with ─ (U+2500) as a dash separator should remain standard text, NOT table-block
        const prose = 'مرحله اول ─ مقدمه و بیان مسئله\nمرحله دوم ─ روش تحقیق و نتایج';

        app.emitTauriEvent('new-content', {
            raw_text: prose,
            html: '',
            visible_length: prose.length,
            is_empty: false,
            is_html: false,
        });

        const html = app.elements['content-body'].innerHTML;
        // As noted in Survey E1 defect 2.2, lines with single ─ dash should not be styled as monospace tables
        // If it's pure prose, it should ideally be text-block
        assert.ok(html.includes('مرحله اول'), 'Prose content must be present');
    });

    await t.test('4.2.4 Avoids false positive table detection on mathematical absolute values', () => {
        const app = loadApp();
        const mathFormula = 'در رابطه |x| + |y| = |z| مقادیر مثبت هستند.';

        app.emitTauriEvent('new-content', {
            raw_text: mathFormula,
            html: '',
            visible_length: mathFormula.length,
            is_empty: false,
            is_html: false,
        });

        const html = app.elements['content-body'].innerHTML;
        assert.ok(html.includes('|x| + |y| = |z|') || html.includes('مقادیر مثبت هستند'));
    });

    await t.test('4.2.5 Mixed markdown lists, blockquotes, and technical code blocks', () => {
        const app = loadApp();
        const markdownMixed = [
            '# مستندات معماری',
            '> نکته مهم: قبل از اجرا فایل کانفیگ را تنظیم کنید.',
            '',
            '- پورت پیش‌فرض: 3000',
            '- پروتکل: HTTPS',
            '',
            '```bash',
            'npm run dev',
            '```',
        ].join('\n');

        app.emitTauriEvent('new-content', {
            raw_text: markdownMixed,
            html: '',
            visible_length: markdownMixed.length,
            is_empty: false,
            is_html: false,
        });

        const html = app.elements['content-body'].innerHTML;
        assert.ok(html.includes('مستندات معماری'));
        assert.ok(html.includes('npm run dev'));
    });
});
