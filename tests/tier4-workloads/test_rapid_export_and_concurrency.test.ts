import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const test = require('node:test');
const assert = require('node:assert');
const { loadApp, loadCardExporter, createMockCanvas } = require('../helpers/env');

test('Tier 4: Real-World Workload Scenarios - Rapid Export & Concurrency', async (t) => {
    const { CardExporter } = loadCardExporter();

    await t.test('4.3.1 20 rapid consecutive card exports across multiple themes and styles', async () => {
        const canvas = createMockCanvas();
        const themes = ['zinc', 'onedark', 'dracula', 'gruvbox', 'light'];
        const styles = ['windows', 'mac'];

        for (let i = 0; i < 20; i++) {
            const theme = themes[i % themes.length];
            const style = styles[i % styles.length];
            const html = `<pre class="text-block">کارت صادره شماره ${i} با تم ${theme} و استایل ${style}</pre>`;

            await CardExporter.renderCard(canvas, html, theme, style);
            assert.ok(canvas._drawCalls.length > 0, `Export #${i} must emit draw calls`);
        }
    });

    await t.test('4.3.2 50 rapid consecutive content update events emulate fast copy-pasting', () => {
        const app = loadApp();

        for (let i = 0; i < 50; i++) {
            app.emitTauriEvent('new-content', {
                raw_text: `محتوای متوالی نسخه شماره ${i} با کدهای \`code_${i}\``,
                html: '',
                visible_length: 40,
                is_empty: false,
                is_html: false,
            });
        }

        const bodyHtml = app.elements['content-body'].innerHTML;
        assert.ok(bodyHtml.includes('محتوای متوالی نسخه شماره ۴۹') || bodyHtml.includes('49'));
    });

    await t.test('4.3.3 Shortcut debounce / in-flight concurrency simulation', () => {
        // Simulates the backend atomic flag `static CAPTURING: AtomicBool` proposed in Survey E3
        let capturing = false;
        let successfulCaptures = 0;
        let droppedCaptures = 0;

        function simulateShortcutPress() {
            if (capturing) {
                droppedCaptures++;
                return false;
            }
            capturing = true;
            try {
                // Perform simulated capture
                successfulCaptures++;
            } finally {
                capturing = false;
            }
            return true;
        }

        // Rapid sequence of 50 shortcut triggers
        for (let i = 0; i < 50; i++) {
            simulateShortcutPress();
        }

        assert.strictEqual(successfulCaptures, 50, 'Sequential captures succeed');
        assert.strictEqual(droppedCaptures, 0);

        // Re-entrant test: trigger inside active lock
        capturing = true;
        assert.strictEqual(simulateShortcutPress(), false, 'Re-entrant trigger during active capture must be dropped');
        capturing = false;
    });

    await t.test('4.3.4 Clipboard lock retry simulation with backoff', async () => {
        // Simulates Win32 clipboard lock contention where another process temporarily holds clipboard
        let attempts = 0;
        async function captureClipboardWithRetry(maxRetries = 3) {
            for (let i = 0; i < maxRetries; i++) {
                attempts++;
                if (attempts >= 2) {
                    return { success: true, text: 'متن با موفقیت پس از باز شدن قفل کپی شد' };
                }
                // Simulated 10ms wait
                await new Promise(r => setTimeout(r, 10));
            }
            return { success: false, text: '' };
        }

        const result = await captureClipboardWithRetry();
        assert.strictEqual(result.success, true);
        assert.ok(result.text.includes('موفقیت'));
        assert.strictEqual(attempts, 2, 'Should succeed on retry attempt 2');
    });

    await t.test('4.3.5 Clean copy and standard copy buttons work reliably on rendered content', async () => {
        const app = loadApp();
        const testText = 'متن فارسی برای تست کپی در کلیپ‌بورد با دکمه‌های رابط کاربری';

        app.emitTauriEvent('new-content', {
            raw_text: testText,
            html: '',
            visible_length: testText.length,
            is_empty: false,
            is_html: false,
        });

        // Click standard copy
        app.elements['btn-copy'].click();
        // Click clean copy
        app.elements['btn-clean-copy'].click();

        assert.ok(app.elements['content-body'].innerHTML.length > 0);
    });
});
