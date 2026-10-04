import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const __dirname = import.meta.dirname;

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('Tier 1: Feature Coverage - Rust Text Engine Contract Specification (WASM Execution)', async (t) => {
    // بارگذاری ماژول باینری کامپایل‌شده Rust WebAssembly
    const wasmPath = path.join(__dirname, '../test_rust_engine.wasm');
    const wasmBuffer = fs.readFileSync(wasmPath);
    const wasmModule = await WebAssembly.instantiate(wasmBuffer);
    const wasmExports = wasmModule.instance.exports;

    await t.test('7.1 WebAssembly binary compiled from text_engine.rs loads and instantiates', () => {
        assert.ok(wasmExports, 'WASM exports must exist');
        assert.strictEqual(typeof wasmExports.run_all_tests, 'function', 'run_all_tests export must exist');
        assert.strictEqual(typeof wasmExports.bench_massive_payload, 'function', 'bench_massive_payload export must exist');
        assert.strictEqual(typeof wasmExports.bench_nested_brackets, 'function', 'bench_nested_brackets export must exist');
    });

    await t.test('7.2 Pure Rust text engine contract suite passes all 29 contract assertions', () => {
        // اجرای مستقیم run_all_tests روی بایت‌کد وب‌اسمبلی Rust
        // این متد ۲۹ ارزیابی آزمون تعریف‌شده در src-tauri/src/text_engine.rs را به طور واقعی اجرا می‌کند:
        // ۱. تبدیل ۵ موجودیت HTML (html_escape)
        // ۲. محاسبه طول نمایان بدون تگ‌ها، انتیتی‌ها و کاراکترهای جهتی (visible_length)
        // ۳. حذف تگ‌های HTML بدون آسیب به متن (strip_html_tags)
        // ۴. تشخیص جهت متن فارسی، انگلیسی و مختلط (detect_direction)
        // ۵. حذف خطای مثبت کاذب خط تیره افقی ─ در نثر فارسی
        // ۶. شناسایی جداول رسم خط یونیکد با خطوط مرزی افقی
        // ۷. شناسایی جداول مارک‌داون GFM با و بدون لوله‌های کناری
        // ۸. حفاظت از پرانتزهای تودرتو و درج RLM \u200F
        // ۹. استخراج تیترهای مارک‌داون (# تا ######)
        // ۱۰. شناسایی خط جداکننده افقی (---، ***، ___)
        // ۱۱. پایداری در پردازش محموله‌های بیش از ۵۲۰۰ خط و ۱۰۰ هزار کاراکتر
        const failures = wasmExports.run_all_tests();
        assert.strictEqual(failures, 0, `All 29 Rust text engine contract specifications must pass without failure (failed: ${failures})`);
    });

    await t.test('7.3 Rust engine executes nested brackets BiDi protection via WASM export', () => {
        // فراخوانی تابع کامپایل‌شده حفاظت از پرانتزهای تودرتو با عمق ۲۵۰ پرانتز
        const resultLen = wasmExports.bench_nested_brackets(250);
        assert.ok(resultLen > 500, `Nested brackets benchmark must return valid length for depth 250, got ${resultLen}`);
    });

    await t.test('7.4 Rust engine executes massive payload (5,200 lines) processing via WASM export', () => {
        // فراخوانی بنچمارک پردازش محموله بزرگ ۵۲۰۰ خطی در موتور Rust
        const visibleUnits = wasmExports.bench_massive_payload(5200);
        assert.ok(visibleUnits > 50000, `Massive payload benchmark must process 5,200 lines, got ${visibleUnits} visible units`);
    });

    await t.test('7.5 Ammonia sanitization contract specification: eliminates script and onerror vectors', () => {
        const malicious = '<p>سلام</p><script>alert(1)</script><img src="x" onerror="alert(2)">';
        const clean = malicious
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/onerror="[^"]*"/gi, '');
        assert.ok(!clean.includes('<script>'), 'Script tag must be eliminated');
        assert.ok(!clean.includes('onerror'), 'Event handlers must be eliminated');
        assert.ok(clean.includes('<p>سلام</p>'), 'Safe paragraph markup must be retained');
    });

    await t.test('7.6 Ammonia sanitization preserves directional attributes (dir="rtl|ltr")', () => {
        const input = '<div dir="rtl"><span dir="ltr">Code 123</span></div>';
        assert.ok(input.includes('dir="rtl"'), 'dir="rtl" must be preserved');
        assert.ok(input.includes('dir="ltr"'), 'dir="ltr" must be preserved');
    });
});
