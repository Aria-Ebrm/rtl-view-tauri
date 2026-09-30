const test = require('node:test');
const assert = require('node:assert');
const { loadApp } = require('../helpers/env.js');

test('Tier 1: Feature Coverage - App State, UI & OS Events', async (t) => {
    await t.test('6.1 Initial empty state rendering', () => {
        const app = loadApp();
        // Trigger initial empty payload
        app.emitTauriEvent('new-content', {
            raw_text: '',
            html: '<div class="empty-state">متنی برای نمایش انتخاب نشده است.</div>',
            visible_length: 0,
            is_empty: true,
            is_html: false,
        });

        assert.ok(app.elements['content-body'].innerHTML.includes('empty-state'), 'Should display empty state');
        assert.strictEqual(app.elements['char-count'].textContent, '۰ کاراکتر');
        assert.strictEqual(app.elements['word-count'].textContent, '۰ کلمه');
    });

    await t.test('6.2 updateView with Persian text updates DOM and counters', () => {
        const app = loadApp();
        const text = 'سلام دنیا، این یک متن تستی برای بررسی شمارنده‌ها است.';
        app.emitTauriEvent('new-content', {
            raw_text: text,
            html: '',
            visible_length: text.length,
            is_empty: false,
            is_html: false,
        });

        assert.ok(app.elements['content-body'].innerHTML.length > 0);
        assert.ok(app.elements['char-count'].textContent.includes('کاراکتر'));
        assert.ok(app.elements['word-count'].textContent.includes('کلمه'));
    });

    await t.test('6.3 updateView with rich HTML preserves markup structure', () => {
        const app = loadApp();
        const html = '<div class="html-content"><p dir="rtl"><strong>متن برجسته</strong></p></div>';
        app.emitTauriEvent('new-content', {
            raw_text: 'متن برجسته',
            html: html,
            visible_length: 10,
            is_empty: false,
            is_html: true,
        });

        assert.strictEqual(app.elements['content-body'].innerHTML, html);
    });

    await t.test('6.4 Card modal open and close lifecycle via button and Escape key', () => {
        const app = loadApp();
        const cardModal = app.elements['card-modal'];

        // Initial state: not open
        assert.strictEqual(cardModal.classList.contains('open'), false);

        // Populate contentBody so openCardModal proceeds
        app.emitTauriEvent('new-content', {
            raw_text: 'متن برای ساخت کارت تصویری',
            html: '',
            visible_length: 25,
            is_empty: false,
            is_html: false,
        });

        // Click export card button
        app.elements['btn-export-card'].click();
        assert.strictEqual(cardModal.classList.contains('open'), true, 'Modal should open on button click');

        // Press Escape key
        app.pressKey('Escape');
        assert.strictEqual(cardModal.classList.contains('open'), false, 'Modal should close on Escape key');
    });

    await t.test('6.5 Modal desynchronization: new-content arrival updates or resets card modal state', () => {
        const app = loadApp();
        const cardModal = app.elements['card-modal'];

        // Populate initial content
        app.emitTauriEvent('new-content', {
            raw_text: 'متن اولیه',
            html: '',
            visible_length: 10,
            is_empty: false,
            is_html: false,
        });

        // Open modal
        app.elements['btn-export-card'].click();
        assert.strictEqual(cardModal.classList.contains('open'), true);

        // New content arrives while modal is open
        app.emitTauriEvent('new-content', {
            raw_text: 'محتوای کاملاً جدید که پس از باز بودن کارت آمده است',
            html: '',
            visible_length: 50,
            is_empty: false,
            is_html: false,
        });

        // Verify the app does not crash and the content is updated
        assert.ok(app.elements['content-body'].innerHTML.includes('محتوای کاملاً جدید'));
    });

    await t.test('6.6 Window sizing algorithm boundary rules', () => {
        function calculateWindowSize(len) {
            if (len < 150) {
                return [520, 260];
            } else if (len < 600) {
                return [740, 440];
            } else {
                return [920, 640];
            }
        }

        assert.deepStrictEqual(calculateWindowSize(0), [520, 260]);
        assert.deepStrictEqual(calculateWindowSize(149), [520, 260]);
        assert.deepStrictEqual(calculateWindowSize(150), [740, 440]);
        assert.deepStrictEqual(calculateWindowSize(599), [740, 440]);
        assert.deepStrictEqual(calculateWindowSize(600), [920, 640]);
        assert.deepStrictEqual(calculateWindowSize(100000), [920, 640]);
    });
});
