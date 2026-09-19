// تعامل امن با Tauri v2 API و مدیریت امکانات هوشمند RTL View

(function() {
    'use strict';

    // المان‌های DOM
    const contentBody = document.getElementById('content-body');
    const charCount = document.getElementById('char-count');
    const wordCount = document.getElementById('word-count');
    const btnClose = document.getElementById('btn-close');
    const btnCopy = document.getElementById('btn-copy');
    const btnCleanCopy = document.getElementById('btn-clean-copy');
    const btnVirastar = document.getElementById('btn-virastar');
    const btnDigits = document.getElementById('btn-digits');
    const btnPin = document.getElementById('btn-pin');
    const btnFontDec = document.getElementById('btn-font-dec');
    const btnFontInc = document.getElementById('btn-font-inc');
    const themeSelect = document.getElementById('theme-select');
    const btnExportCard = document.getElementById('btn-export-card');

    // مدال کارت تصویری
    const cardModal = document.getElementById('card-modal');
    const cardCanvas = document.getElementById('card-canvas');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCancelModal = document.getElementById('btn-cancel-modal');
    const btnCopyCardImg = document.getElementById('btn-copy-card-img');
    const btnSaveCardImg = document.getElementById('btn-save-card-img');
    const btnStyleWindows = document.getElementById('btn-style-windows');
    const btnStyleMac = document.getElementById('btn-style-mac');

    // وضعیت داخلی (State)
    let currentRawData = null;
    let virastarEnabled = localStorage.getItem('rtl_virastar') !== 'false';
    let digitsPersian = localStorage.getItem('rtl_digits') !== 'false';
    let currentTheme = localStorage.getItem('rtl_theme') || 'zinc';
    let currentFontSize = parseFloat(localStorage.getItem('rtl_font_size')) || 14.5;
    let currentWindowStyle = localStorage.getItem('rtl_window_style') || (/Macintosh|Mac OS X|iPhone|iPad/.test(navigator.userAgent) ? 'mac' : 'windows');
    let isPinned = false;

    // تبدیل ارقام به فارسی برای اعداد رابط کاربری
    function toFaDigits(num) {
        if (window.Virastar && window.Virastar.toPersianDigits) {
            return window.Virastar.toPersianDigits(num);
        }
        const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return num.toString().replace(/\d/g, x => farsiDigits[x]);
    }

    // اعمال تم
    function setTheme(theme) {
        currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        themeSelect.value = theme;
        localStorage.setItem('rtl_theme', theme);
    }

    // اعمال اندازه قلم
    function setFontSize(size) {
        currentFontSize = Math.min(Math.max(size, 11), 24);
        document.body.style.setProperty('--base-font-size', `${currentFontSize}px`);
        localStorage.setItem('rtl_font_size', currentFontSize.toString());
    }

    // به‌روزرسانی شمارنده کاراکتر و کلمات
    function updateStats(text) {
        if (!text) {
            charCount.textContent = '۰ کاراکتر';
            wordCount.textContent = '۰ کلمه';
            return;
        }
        const clean = text.trim();
        const chars = clean.length;
        const words = clean ? clean.split(/\s+/).filter(Boolean).length : 0;

        charCount.textContent = `${toFaDigits(chars)} کاراکتر`;
        wordCount.textContent = `${toFaDigits(words)} کلمه`;
    }

    // فرمت‌دهی امن کدهای درون‌خطی (`code`) و لینک‌ها بدون کادر انداختن دور کلمات انگلیسی عادی
    function formatInline(text) {
        if (!text) return '';

        let result = '';
        let lastIndex = 0;
        const codeRegex = /`([^`\n]+)`/g;
        let match;

        while ((match = codeRegex.exec(text)) !== null) {
            const before = text.substring(lastIndex, match.index);
            if (before) {
                result += formatTextSegment(before);
            }
            const codeVal = match[1];
            result += `<code class="inline-code">${escapeHtml(codeVal)}</code>`;
            lastIndex = codeRegex.lastIndex;
        }

        if (lastIndex < text.length) {
            result += formatTextSegment(text.substring(lastIndex));
        }

        return result;
    }

    function formatTextSegment(str) {
        // تبدیل لینک‌های اینترنتی به تگ a با جهت ltr
        const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
        let out = '';
        let last = 0;
        let m;

        while ((m = urlRegex.exec(str)) !== null) {
            const before = str.substring(last, m.index);
            if (before) {
                out += escapeHtml(before);
            }
            const url = m[1];
            out += `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="text-link" dir="ltr">${escapeHtml(url)}</a>`;
            last = urlRegex.lastIndex;
        }

        if (last < str.length) {
            out += escapeHtml(str.substring(last));
        }

        return out;
    }

    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function isTableLine(line) {
        const boxChars = "│┃─━┌┐└┘├┤┬┴┼╭╮╰╯═║╔╗╚╝╠╣╦╩╬╪╫▏▕";
        for (let ch of line) {
            if (boxChars.includes(ch)) return true;
        }
        const s = line.trim();
        return s.startsWith('|') && (s.match(/\|/g) || []).length >= 2;
    }

    // اعمال هوشمند ویراستار همراه با محافظت از کدهای درون‌خطی و بلوک‌های کد
    function processWithVirastar(text, isVirastarOn, isDigitsFa) {
        if (!window.Virastar) return text;

        // محافظت از کدهای درون‌خطی `...` و بلوک‌های کد ```...``` تا ارقام یا متن آنها توسط ویراستار تغییر نکند
        const codeTokens = [];
        const protectedText = text.replace(/```[\s\S]*?```|`[^`\n]+`/g, (match) => {
            const token = `__RTL_CODE_TOKEN_${codeTokens.length}__`;
            codeTokens.push(match);
            return token;
        });

        let processed = window.Virastar.process(protectedText, {
            fixHalfSpace: isVirastarOn,
            fixPunctuation: isVirastarOn,
            normalizeChars: isVirastarOn,
            cleanupSpaces: false, // حفظ ساختار خطوط کاربر
            digits: isDigitsFa ? 'persian' : 'english',
        });

        // بازگردانی کدهای درون‌خطی
        processed = processed.replace(/__RTL_CODE_TOKEN_([0-9۰-۹]+)__/g, (match, idx) => {
            const enDigits = window.Virastar ? window.Virastar.toEnglishDigits(idx) : idx;
            return codeTokens[Number(enDigits)] || match;
        });

        return processed;
    }

    // رندر مجدد محتوا با توجه به سوییچ‌های ویراستار و ارقام
    function renderContent() {
        if (!currentRawData) return;

        let rawHtml = currentRawData.html || '';

        // اگر محتوای خالی یا پیام راهنما باشد
        if (currentRawData.is_empty || rawHtml.includes('empty-state')) {
            contentBody.innerHTML = rawHtml;
            updateStats('');
            return;
        }

        // استخراج متن خام اصلی
        let plain = currentRawData.raw_text || currentRawData.plain_text || '';
        if (!plain) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = rawHtml;
            plain = tempDiv.innerText;
        }

        // در صورت دریافت محتوای غنی HTML
        if (currentRawData.is_html) {
            contentBody.innerHTML = rawHtml;
            updateStats(plain);
            return;
        }

        // اعمال ویراستار و تنظیم ارقام در صورت فعال بودن با محافظت از کدها
        const processedText = processWithVirastar(plain, virastarEnabled, digitsPersian);

        // تفکیک خطوط به بلوک‌ها: جدول، کد چندخطی، یا پاراگراف متنی
        const lines = processedText.split('\n');
        const blocks = [];
        let inCodeBlock = false;
        let curType = null;
        let curLines = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('```')) {
                if (inCodeBlock) {
                    if (curLines.length > 0) {
                        blocks.push({ type: 'code', lines: curLines });
                        curLines = [];
                    }
                    inCodeBlock = false;
                    curType = null;
                } else {
                    if (curLines.length > 0 && curType) {
                        blocks.push({ type: curType, lines: curLines });
                        curLines = [];
                    }
                    inCodeBlock = true;
                    curType = 'code';
                }
                continue;
            }

            if (inCodeBlock) {
                curLines.push(line);
                continue;
            }

            if (!trimmed) {
                if (curLines.length > 0) curLines.push(line);
                continue;
            }

            const t = isTableLine(line) ? 'table' : 'text';
            if (t !== curType) {
                if (curLines.length > 0 && curType) {
                    blocks.push({ type: curType, lines: curLines });
                }
                curType = t;
                curLines = [line];
            } else {
                curLines.push(line);
            }
        }
        if (curLines.length > 0 && curType) {
            blocks.push({ type: curType, lines: curLines });
        }

        const htmlParts = blocks.map(b => {
            const joined = b.lines.join('\n');
            if (b.type === 'table') {
                return `<pre class="table-block">${escapeHtml(joined)}</pre>`;
            } else if (b.type === 'code') {
                return `<pre class="code-block" dir="ltr"><code dir="ltr">${escapeHtml(joined)}</code></pre>`;
            } else {
                return `<pre class="text-block">${formatInline(joined)}</pre>`;
            }
        });

        contentBody.innerHTML = htmlParts.join('\n') || escapeHtml(processedText);
        updateStats(processedText);
    }

    // به‌روزرسانی اولیه داده دریافتی
    function updateView(data) {
        if (!data) return;
        currentRawData = data;
        
        // ذخیره متن خالص برای استفاده در ویراستار، کپی و صدور عکس
        if (!currentRawData.raw_text) {
            const temp = document.createElement('div');
            temp.innerHTML = data.html || '';
            currentRawData.raw_text = temp.innerText;
        }
        currentRawData.plain_text = currentRawData.raw_text;

        renderContent();
    }

    // بستن پنجره
    async function closePopup() {
        try {
            if (cardModal.classList.contains('open')) {
                closeCardModal();
                return;
            }
            if (window.__TAURI__ && window.__TAURI__.core) {
                await window.__TAURI__.core.invoke('hide_window');
            } else {
                window.close();
            }
        } catch (err) {
            console.error('Failed to hide window:', err);
        }
    }

    // تغییر وضعیت پین (Always on Top)
    async function togglePin() {
        try {
            if (window.__TAURI__ && window.__TAURI__.core) {
                const nextState = await window.__TAURI__.core.invoke('toggle_always_on_top');
                isPinned = nextState;
            } else {
                isPinned = !isPinned;
            }
            btnPin.classList.toggle('active', isPinned);
            btnPin.title = isPinned ? 'پنجره سنجاق شده است (همیشه رو)' : 'سنجاق کردن پنجره در بالا (Always on Top)';
        } catch (err) {
            console.error('Failed to toggle pin:', err);
        }
    }

    // به‌روزرسانی ظاهر دکمه‌های استایل پنجره
    function updateStyleSwitcherUI() {
        if (btnStyleWindows && btnStyleMac) {
            btnStyleWindows.classList.toggle('active', currentWindowStyle === 'windows');
            btnStyleMac.classList.toggle('active', currentWindowStyle === 'mac');
        }
    }

    // رندر کارت تصویری فعال با حفظ بج‌های کد و استایل انتخابی
    function renderActiveCard() {
        if (window.CardExporter && cardCanvas) {
            window.CardExporter.renderCard(cardCanvas, contentBody.innerHTML, currentTheme, currentWindowStyle);
        }
    }

    // باز کردن مدال کارت تصویری
    function openCardModal() {
        const text = contentBody.innerText || '';
        if (!text.trim() || text.includes('برنامه RTL View فعال است')) {
            alert('متنی برای ساخت کارت تصویری موجود نیست.');
            return;
        }
        updateStyleSwitcherUI();
        cardModal.classList.add('open');
        renderActiveCard();
    }

    function closeCardModal() {
        cardModal.classList.remove('open');
    }

    // ==========================================
    // رویدادهای دکمه‌ها و تعاملات
    // ==========================================

    // سوییچ ویراستار
    btnVirastar.addEventListener('click', () => {
        virastarEnabled = !virastarEnabled;
        btnVirastar.classList.toggle('active', virastarEnabled);
        localStorage.setItem('rtl_virastar', virastarEnabled.toString());
        renderContent();
    });

    // سوییچ ارقام
    btnDigits.addEventListener('click', () => {
        digitsPersian = !digitsPersian;
        btnDigits.classList.toggle('active', digitsPersian);
        btnDigits.textContent = digitsPersian ? 'ارقام ۱۲۳' : 'ارقام 123';
        localStorage.setItem('rtl_digits', digitsPersian.toString());
        renderContent();
    });

    // دکمه کپی تمیز
    btnCleanCopy.addEventListener('click', async () => {
        try {
            const text = contentBody.innerText;
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                const orig = btnCleanCopy.textContent;
                btnCleanCopy.textContent = 'کپی تمیز شد ✔';
                setTimeout(() => btnCleanCopy.textContent = orig, 1600);
            }
        } catch (e) {
            console.error('Clean copy failed:', e);
        }
    });

    // کپی خام
    btnCopy.addEventListener('click', async () => {
        try {
            const raw = (currentRawData && currentRawData.raw_text) 
                ? currentRawData.raw_text 
                : ((currentRawData && currentRawData.plain_text) ? currentRawData.plain_text : contentBody.innerText);
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(raw);
                const orig = btnCopy.textContent;
                btnCopy.textContent = 'کپی شد ✔';
                setTimeout(() => btnCopy.textContent = orig, 1500);
            }
        } catch (e) {
            console.error('Copy failed:', e);
        }
    });

    // بستن
    btnClose.addEventListener('click', closePopup);

    // پین
    btnPin.addEventListener('click', togglePin);

    // تغییر اندازه قلم
    btnFontDec.addEventListener('click', () => setFontSize(currentFontSize - 1));
    btnFontInc.addEventListener('click', () => setFontSize(currentFontSize + 1));

    // تغییر تم
    themeSelect.addEventListener('change', (e) => {
        setTheme(e.target.value);
        if (cardModal.classList.contains('open')) {
            renderActiveCard();
        }
    });

    // سوییچ استایل پنجره (ویندوز یا مک)
    if (btnStyleWindows) {
        btnStyleWindows.addEventListener('click', () => {
            currentWindowStyle = 'windows';
            localStorage.setItem('rtl_window_style', 'windows');
            updateStyleSwitcherUI();
            renderActiveCard();
        });
    }

    if (btnStyleMac) {
        btnStyleMac.addEventListener('click', () => {
            currentWindowStyle = 'mac';
            localStorage.setItem('rtl_window_style', 'mac');
            updateStyleSwitcherUI();
            renderActiveCard();
        });
    }

    // کارت تصویری
    btnExportCard.addEventListener('click', openCardModal);
    btnCloseModal.addEventListener('click', closeCardModal);
    btnCancelModal.addEventListener('click', closeCardModal);

    // کپی تصویر کارت به کلیپ‌بورد
    btnCopyCardImg.addEventListener('click', async () => {
        try {
            if (window.CardExporter) {
                await window.CardExporter.copyToClipboard(cardCanvas);
                const orig = btnCopyCardImg.textContent;
                btnCopyCardImg.textContent = 'عکس کپی شد ✔';
                setTimeout(() => btnCopyCardImg.textContent = orig, 1800);
            }
        } catch (err) {
            console.error('Failed to copy card image:', err);
            alert('مرورگر اجازه کپی خودکار تصویر را نداد. لطفاً از دکمه «دانلود تصویر PNG» استفاده کنید.');
        }
    });

    // دانلود تصویر کارت
    btnSaveCardImg.addEventListener('click', () => {
        if (window.CardExporter) {
            window.CardExporter.downloadImage(cardCanvas, `rtl-card-${Date.now()}.png`);
        }
    });

    // کلیدهای میانبر درون پنجره
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closePopup();
        } else if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            setFontSize(currentFontSize + 1);
        } else if (e.ctrlKey && (e.key === '-' || e.key === '_')) {
            e.preventDefault();
            setFontSize(currentFontSize - 1);
        } else if (e.ctrlKey && e.key === '0') {
            e.preventDefault();
            setFontSize(14.5);
        }
    });

    // کلیک روی پس‌زمینه مدال برای بستن آن
    cardModal.addEventListener('click', (e) => {
        if (e.target === cardModal) {
            closeCardModal();
        }
    });

    // شنود رویداد دریافت متن جدید از بک‌اند Rust
    if (window.__TAURI__ && window.__TAURI__.event) {
        window.__TAURI__.event.listen('new-content', (event) => {
            updateView(event.payload);
        });
    }

    // بارگذاری اولیه
    window.addEventListener('DOMContentLoaded', async () => {
        setTheme(currentTheme);
        setFontSize(currentFontSize);
        btnVirastar.classList.toggle('active', virastarEnabled);
        btnDigits.classList.toggle('active', digitsPersian);
        btnDigits.textContent = digitsPersian ? 'ارقام ۱۲۳' : 'ارقام 123';

        try {
            if (window.__TAURI__ && window.__TAURI__.core) {
                const initial = await window.__TAURI__.core.invoke('get_current_content');
                updateView(initial);
            }
        } catch (e) {
            console.warn('Initial content fetch error:', e);
        }
    });

})();
