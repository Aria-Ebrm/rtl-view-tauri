// تعامل امن با Tauri v2 API و مدیریت امکانات هوشمند RTL View

(function() {
    'use strict';

    // المان‌های DOM با محافظت از عدم وجود document در محیط‌های تست Node.js
    const doc = typeof document !== 'undefined' ? document : null;
    const contentBody = doc ? doc.getElementById('content-body') : null;
    const charCount = doc ? doc.getElementById('char-count') : null;
    const wordCount = doc ? doc.getElementById('word-count') : null;
    const btnClose = doc ? doc.getElementById('btn-close') : null;
    const btnCopy = doc ? doc.getElementById('btn-copy') : null;
    const btnCleanCopy = doc ? doc.getElementById('btn-clean-copy') : null;
    const btnVirastar = doc ? doc.getElementById('btn-virastar') : null;
    const btnDigits = doc ? doc.getElementById('btn-digits') : null;
    const btnPin = doc ? doc.getElementById('btn-pin') : null;
    const btnFontDec = doc ? doc.getElementById('btn-font-dec') : null;
    const btnFontInc = doc ? doc.getElementById('btn-font-inc') : null;
    const btnExportCard = doc ? doc.getElementById('btn-export-card') : null;
    const themeSelect = doc ? doc.getElementById('theme-select') : null;

    // متغیرهای وضعیت باز بودن منوها و مدال‌ها
    let isHamburgerOpen = false;
    let isTraySettingsOpen = false;
    let isShortcutModalOpen = false;

    // المان‌های نوار عنوان سفارشی و کنترل پنجره
    const windowTitlebar = doc ? doc.getElementById('window-titlebar') : null;
    const btnWinMinimize = doc ? doc.getElementById('btn-win-minimize') : null;
    const btnWinMaximize = doc ? doc.getElementById('btn-win-maximize') : null;
    const btnWinClose = doc ? doc.getElementById('btn-win-close') : null;
    const btnHamburger = doc ? doc.getElementById('btn-hamburger') : null;
    const hamburgerDropdown = doc ? doc.getElementById('hamburger-dropdown') : null;
    const btnCloseHamburger = doc ? doc.getElementById('btn-close-hamburger') : null;

    // المان‌های پنل تنظیمات نوار وظیفه (Tray Settings Modal)
    const traySettingsModal = doc ? doc.getElementById('tray-settings-modal') : null;
    const btnCloseTrayModal = doc ? doc.getElementById('btn-close-tray-modal') : null;
    const btnTrayModalClose = doc ? doc.getElementById('btn-tray-modal-close') : null;
    const btnTrayModalQuit = doc ? doc.getElementById('btn-tray-modal-quit') : null;
    const menuBtnOpenTraySettings = doc ? doc.getElementById('menu-btn-open-tray-settings') : null;
    const trayToggleAutostart = doc ? doc.getElementById('tray-toggle-autostart') : null;
    const trayToggleAlwaysTop = doc ? doc.getElementById('tray-toggle-always-top') : null;
    const btnTrayRepair = doc ? doc.getElementById('btn-tray-repair') : null;
    const menuBtnRepair = doc ? doc.getElementById('menu-btn-repair') : null;
    const menuBtnQuit = doc ? doc.getElementById('menu-btn-quit') : null;

    // المان‌های تغییر کلید میانبر
    const shortcutModal = doc ? doc.getElementById('shortcut-modal') : null;
    const btnCloseShortcutModal = doc ? doc.getElementById('btn-close-shortcut-modal') : null;
    const btnCancelShortcut = doc ? doc.getElementById('btn-cancel-shortcut') : null;
    const btnSaveShortcut = doc ? doc.getElementById('btn-save-shortcut') : null;
    const inputCustomShortcut = doc ? doc.getElementById('input-custom-shortcut') : null;
    const menuBtnChangeShortcut = doc ? doc.getElementById('menu-btn-change-shortcut') : null;
    const btnTrayChangeShortcut = doc ? doc.getElementById('btn-tray-change-shortcut') : null;
    const displayShortcut = doc ? doc.getElementById('display-shortcut') : null;
    const menuDisplayShortcut = doc ? doc.getElementById('menu-display-shortcut') : null;
    const trayCurrentShortcut = doc ? doc.getElementById('tray-current-shortcut') : null;

    // مدال کارت تصویری
    const cardModal = doc ? doc.getElementById('card-modal') : null;
    const cardCanvas = doc ? doc.getElementById('card-canvas') : null;
    const btnCloseModal = doc ? doc.getElementById('btn-close-modal') : null;
    const btnCancelModal = doc ? doc.getElementById('btn-cancel-modal') : null;
    const btnCopyCardImg = doc ? doc.getElementById('btn-copy-card-img') : null;
    const btnSaveCardImg = doc ? doc.getElementById('btn-save-card-img') : null;
    const btnStyleWindows = doc ? doc.getElementById('btn-style-windows') : null;
    const btnStyleMac = doc ? doc.getElementById('btn-style-mac') : null;

    // تزریق استایل بهینه‌سازی رندر برای کاهش فشار Layout در متن‌های بزرگ (>100,000 کاراکتر)
    function ensurePerfStyles() {
        if (!doc) return;
        if (!doc.getElementById('rtl-perf-styles')) {
            const style = doc.createElement('style');
            style.id = 'rtl-perf-styles';
            style.textContent = `
                .text-block, .code-block, .table-block {
                    content-visibility: auto;
                    contain-intrinsic-size: auto 24px;
                }
            `;
            const parent = doc.head || doc.documentElement || doc.body;
            if (parent && parent.appendChild) {
                parent.appendChild(style);
            }
        }
    }
    ensurePerfStyles();

    // وضعیت داخلی (State)
    const storage = typeof localStorage !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {} };
    let currentRawData = null;
    let currentCleanText = '';
    let virastarEnabled = storage.getItem('rtl_virastar') !== 'false';
    let digitsPersian = storage.getItem('rtl_digits') !== 'false';
    let currentTheme = storage.getItem('rtl_theme') || 'zinc';
    let currentFontSize = parseFloat(storage.getItem('rtl_font_size')) || 14.5;
    let currentWindowStyle = storage.getItem('rtl_window_style') || (typeof navigator !== 'undefined' && /Macintosh|Mac OS X|iPhone|iPad/.test(navigator.userAgent) ? 'mac' : 'windows');
    let currentShortcut = storage.getItem('rtl_shortcut') || 'Ctrl + Alt + F';
    let isPinned = false;

    // تنظیمات نمایش دکمه‌های نوار ابزار
    const DEFAULT_TOOLBAR_VIS = {
        'toolbar-export-card': true,
        'toolbar-clean-copy': true,
        'toolbar-copy': true,
        'toolbar-virastar': true,
        'toolbar-digits': true,
        'toolbar-font': true,
        'toolbar-pin': true,
    };

    let toolbarVisibility = Object.assign({}, DEFAULT_TOOLBAR_VIS);
    try {
        const savedVis = storage.getItem('rtl_toolbar_vis');
        if (savedVis) {
            toolbarVisibility = Object.assign({}, DEFAULT_TOOLBAR_VIS, JSON.parse(savedVis));
        }
    } catch (e) {
        console.warn('Failed to parse toolbar visibility:', e);
    }

    function applyToolbarVisibility() {
        if (!doc) return;
        for (const [id, isVisible] of Object.entries(toolbarVisibility)) {
            const el = doc.getElementById(id);
            if (el && el.classList && typeof el.classList.toggle === 'function') {
                el.classList.toggle('toolbar-item-hidden', !isVisible);
            }
            const toggleInput = (typeof doc.querySelector === 'function') ? doc.querySelector(`input[data-target="${id}"]`) : null;
            if (toggleInput) {
                toggleInput.checked = isVisible;
            }
        }
    }

    function setToolbarItemVisibility(targetId, isVisible) {
        toolbarVisibility[targetId] = isVisible;
        storage.setItem('rtl_toolbar_vis', JSON.stringify(toolbarVisibility));
        applyToolbarVisibility();
    }

    function formatShortcutDisplay(sc) {
        if (!sc) return 'Ctrl + Alt + F';
        return sc.split('+').map(part => part.trim()).join(' + ');
    }

    function getEmptyStateHtml(shortcut) {
        const sc = formatShortcutDisplay(shortcut || currentShortcut || 'Ctrl + Alt + F');
        return `<div class="empty-state" style="text-align: center; padding: 24px 16px;">
            <div style="font-size: 20px; font-weight: bold; margin-bottom: 12px; color: #60a5fa;">برنامه RTL View فعال است ✔</div>
            <p style="color: #cbd5e1; margin-bottom: 12px; font-size: 14px;">متن دلخواه خود را در هر برنامه‌ای انتخاب کنید و کلیدهای میانبر زیر را فشار دهید:</p>
            <div id="empty-state-shortcut" style="display: inline-block; background: #1e293b; border: 1px solid #475569; border-radius: 8px; padding: 8px 20px; font-size: 18px; font-weight: bold; color: #38bdf8; margin: 8px 0; letter-spacing: 1px;">${escapeHtml(sc)}</div>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 16px;">این پنجره با کلید Esc پنهان می‌شود و در نوار وظیفه کنار ساعت (System Tray) به کار خود ادامه می‌دهد.</p>
        </div>`;
    }

    function updateShortcutDisplays() {
        const formatted = formatShortcutDisplay(currentShortcut);
        if (displayShortcut) displayShortcut.textContent = formatted;
        if (menuDisplayShortcut) menuDisplayShortcut.textContent = formatted;
        if (trayCurrentShortcut) trayCurrentShortcut.textContent = formatted;

        if (currentRawData && (currentRawData.is_empty || (currentRawData.html && currentRawData.html.includes('empty-state')))) {
            renderContent();
        } else {
            const emptyStateShortcutEl = doc ? doc.getElementById('empty-state-shortcut') : null;
            if (emptyStateShortcutEl) {
                emptyStateShortcutEl.textContent = formatted;
            }
        }
    }

    // تبدیل ارقام به فارسی برای اعداد رابط کاربری
    function toFaDigits(num) {
        if (typeof window !== 'undefined' && window.Virastar && window.Virastar.toPersianDigits) {
            return window.Virastar.toPersianDigits(num);
        }
        const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return num.toString().replace(/\d/g, x => farsiDigits[x]);
    }

    // اعمال تم
    function setTheme(theme) {
        currentTheme = theme;
        if (doc && doc.documentElement) {
            doc.documentElement.setAttribute('data-theme', theme);
        }
        if (themeSelect) {
            themeSelect.value = theme;
        }
        if (doc && typeof doc.querySelectorAll === 'function') {
            const themeButtons = doc.querySelectorAll('.theme-opt-btn');
            themeButtons.forEach(btn => {
                if (btn && btn.classList && typeof btn.classList.toggle === 'function') {
                    const btnVal = btn.getAttribute('data-theme-val');
                    const isActive = (btnVal === theme) ||
                        (theme === 'zinc' && btnVal === 'geist-dark') ||
                        (theme === 'geist-dark' && btnVal === 'zinc') ||
                        (theme === 'light' && btnVal === 'geist-light') ||
                        (theme === 'geist-light' && btnVal === 'light');
                    btn.classList.toggle('active', isActive);
                }
            });
        }
        storage.setItem('rtl_theme', theme);
    }

    // اعمال اندازه قلم
    function setFontSize(size) {
        currentFontSize = Math.min(Math.max(size, 11), 24);
        if (doc && doc.body && doc.body.style) {
            doc.body.style.setProperty('--base-font-size', `${currentFontSize}px`);
        }
        storage.setItem('rtl_font_size', currentFontSize.toString());
    }

    // به‌روزرسانی شمارنده کاراکتر و کلمات (بهینه‌شده برای متن‌های بسیار بزرگ بدون تخصیص آرایه‌های سنگین)
    function updateStats(text) {
        if (!text) {
            if (charCount) charCount.textContent = '۰ کاراکتر';
            if (wordCount) wordCount.textContent = '۰ کلمه';
            return;
        }
        const clean = text.trim();
        const chars = clean.length;
        let words = 0;
        let inWord = false;
        for (let i = 0; i < clean.length; i++) {
            const code = clean.charCodeAt(i);
            if (code <= 32 || code === 160 || code === 0x200c) {
                inWord = false;
            } else if (!inWord) {
                words++;
                inWord = true;
            }
        }

        if (charCount) charCount.textContent = `${toFaDigits(chars)} کاراکتر`;
        if (wordCount) wordCount.textContent = `${toFaDigits(words)} کلمه`;
    }

    function isStrongRtl(c) {
        const code = c.charCodeAt(0);
        return (code >= 0x0590 && code <= 0x05FF)
            || (code >= 0x0600 && code <= 0x06FF)
            || (code >= 0x0750 && code <= 0x077F)
            || (code >= 0x08A0 && code <= 0x08FF)
            || (code >= 0xFB50 && code <= 0xFDFF)
            || (code >= 0xFE70 && code <= 0xFEFF)
            || code === 0x200F || code === 0x202B || code === 0x202E || code === 0x2067;
    }

    function isStrongLtr(c) {
        const code = c.charCodeAt(0);
        return (code >= 65 && code <= 90)
            || (code >= 97 && code <= 122)
            || (code >= 0x00C0 && code <= 0x024F)
            || (code >= 0x0370 && code <= 0x03FF)
            || (code >= 0x0400 && code <= 0x04FF)
            || code === 0x200E || code === 0x202A || code === 0x202D || code === 0x2066;
    }

    function detectDirection(text) {
        if (!text) return 'rtl';
        for (const c of text) {
            if (isStrongRtl(c)) return 'rtl';
            if (isStrongLtr(c)) return 'ltr';
        }
        return 'rtl';
    }

    function protectNestedBrackets(text, isRtl) {
        if (!isRtl || !text || !/[)\]}»›]/.test(text)) return text;
        const chars = Array.from(text);
        const len = chars.length;
        let result = '';

        for (let i = 0; i < len; i++) {
            const c = chars[i];
            result += c;

            if (c === ')' || c === ']' || c === '}' || c === '»' || c === '›') {
                let prevIsLtr = false;
                for (let j = i - 1; j >= 0; j--) {
                    const pj = chars[j];
                    if (isStrongLtr(pj) || (pj >= '0' && pj <= '9')) {
                        prevIsLtr = true;
                        break;
                    } else if (isStrongRtl(pj)) {
                        break;
                    }
                }

                const nextIsClosing = (i + 1 < len)
                    && (chars[i + 1] === ')'
                        || chars[i + 1] === ']'
                        || chars[i + 1] === '}'
                        || chars[i + 1] === '»'
                        || chars[i + 1] === '›');

                if (prevIsLtr && !nextIsClosing) {
                    result += '\u200F';
                }
            }
        }
        return result;
    }

    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    const URL_REGEX = /https?:\/\/[^\s<>"'`«»]+[^\s<>"'`«».,!?;:،؛؟…\)\}\]]|https?:\/\/[^\s<>"'`«»]+/g;

    // فرمت‌دهی امن کدهای درون‌خطی (`code`)، پیوندها، سبک‌های مارک‌داون و پرانتزهای تودرتو
    function formatInline(text, isRtl = null) {
        if (!text) return '';
        if (isRtl === null) {
            isRtl = detectDirection(text) === 'rtl';
        }

        const tokens = [];

        // ۱. کدهای درون‌خطی
        let working = text.replace(/`([^`\n]+)`/g, (m, inner) => {
            const tok = `\x01T${tokens.length}\x02`;
            tokens.push(`<code class="inline-code">${escapeHtml(inner)}</code>`);
            return tok;
        });

        // ۲. لینک‌های مارک‌داون [label](url)
        working = working.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s\)]+)\)/g, (m, label, url) => {
            const tok = `\x01T${tokens.length}\x02`;
            tokens.push(`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="text-link" dir="ltr">${escapeHtml(label)}</a>`);
            return tok;
        });

        // ۳. لینک‌های خام اینترنتی
        working = working.replace(URL_REGEX, (url) => {
            const tok = `\x01T${tokens.length}\x02`;
            tokens.push(`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="text-link" dir="ltr">${escapeHtml(url)}</a>`);
            return tok;
        });

        // ۴. متن پررنگ **bold** یا __bold__
        working = working.replace(/\*\*([^*\n]+)\*\*/g, (m, inner) => {
            const tok = `\x01T${tokens.length}\x02`;
            tokens.push(`<strong>${escapeHtml(inner)}</strong>`);
            return tok;
        });
        working = working.replace(/(?:^|\s)__([^_\n]+)__(?:\s|$)/g, (m, inner) => {
            const tok = `\x01T${tokens.length}\x02`;
            tokens.push(`<strong>${escapeHtml(inner)}</strong>`);
            return m.startsWith(' ') ? ` ${tok}` : tok;
        });

        // ۵. متن مورب *italic* یا _italic_
        working = working.replace(/(?:^|[^*])\*([^*\n]+)\*(?:[^*]|$)/g, (m, inner) => {
            const tok = `\x01T${tokens.length}\x02`;
            tokens.push(`<em>${escapeHtml(inner)}</em>`);
            const prefix = m.startsWith('*') ? '' : m[0];
            const suffix = m.endsWith('*') ? '' : m[m.length - 1];
            return `${prefix}${tok}${suffix}`;
        });
        working = working.replace(/(?:^|\s)_([^_\n]+)_(?:\s|$|[.,!?;:،؛؟])/g, (m, inner) => {
            const tok = `\x01T${tokens.length}\x02`;
            tokens.push(`<em>${escapeHtml(inner)}</em>`);
            const prefix = m.startsWith('_') ? '' : m[0];
            const suffix = m.endsWith('_') ? '' : m[m.length - 1];
            return `${prefix}${tok}${suffix}`;
        });

        // ۶. خط‌خورده ~~strike~~
        working = working.replace(/~~([^~\n]+)~~/g, (m, inner) => {
            const tok = `\x01T${tokens.length}\x02`;
            tokens.push(`<del>${escapeHtml(inner)}</del>`);
            return tok;
        });

        // ۷. اسکیپ بخش‌های متنی خام، اعمال حفاظت پرانتزها و بازنشانی توکن‌ها
        if (tokens.length === 0) {
            return protectNestedBrackets(escapeHtml(working), isRtl);
        }

        const parts = working.split('\x01');
        let out = '';
        if (parts[0]) {
            out += protectNestedBrackets(escapeHtml(parts[0]), isRtl);
        }
        for (let idx = 1; idx < parts.length; idx++) {
            const sub = parts[idx];
            const endTok = sub.indexOf('\x02');
            if (endTok !== -1) {
                const tokKey = sub.slice(0, endTok);
                const rest = sub.slice(endTok + 1);
                if (tokKey.startsWith('T')) {
                    const tokenIndex = Number(tokKey.slice(1));
                    if (tokens[tokenIndex] !== undefined) {
                        out += tokens[tokenIndex];
                    }
                }
                if (rest) {
                    out += protectNestedBrackets(escapeHtml(rest), isRtl);
                }
            } else {
                out += protectNestedBrackets(escapeHtml(sub), isRtl);
            }
        }

        return out;
    }

    function formatTextSegment(str) {
        return formatInline(str);
    }

    // جدول‌های رسم خط یونیکد (بدون خطوط تیره افقی ─ و ━ که در متن فارسی عادی استفاده می‌شوند)
    const VERTICAL_OR_CORNER_BOX_REGEX = /[│┃║╪╫▏▕┌┐└┘├┤┬┴┼╭╮╰╯╔╗╚╝╠╣╦╩╬]/;

    function isTableLine(line) {
        const s = line.trim();
        if (!s) return false;

        // ۱. خطوط مرزی عمودی یا تقاطع‌ها و گوشه‌های رسم خط جدول
        if (VERTICAL_OR_CORNER_BOX_REGEX.test(s)) return true;

        // ۲. خط جداکننده افقی متشکل صرفاً از کاراکترهای جدولی (بدون کلمات عادی متنی)
        const isHorizontalBorder = s.length >= 3
            && /^[\s\t─━═\-+=┌┐└┘├┤┬┴┼╔╗╚╝╠╣╦╩╬]+$/.test(s)
            && /[─━═\-+]/.test(s);
        if (isHorizontalBorder) return true;

        // ۳. بررسی جداول مارک‌داون GFM (Pipe Tables)
        const pipeCount = (s.match(/\|/g) || []).length;
        if (pipeCount === 0) return false;

        // خط تفکیک‌کننده هدر: مانند |---|---| یا --- | --- یا |:---|---:|
        const isDelimiterRow = s.split('|').every(cell => {
            const t = cell.trim();
            return t.length === 0 || (/^[-\s:]+$/.test(t) && t.includes('-'));
        }) && pipeCount >= 1 && s.includes('-');
        if (isDelimiterRow) return true;

        // استثنای فرمول‌های ریاضی و قدر مطلق: مانند |x| + |y| = z یا |a| + |b| = |c|
        const isMathFormula = /(?:^|\s)\|[^|]+\|\s*[+\-=><×÷±≈≤≥]/.test(s)
            || /\|\s*[+\-=><×÷±≈≤≥]\s*\|/.test(s);
        if (isMathFormula) return false;

        // ردیف جدول با لوله‌های کناری: | col 1 | col 2 |
        if (s.startsWith('|') && s.endsWith('|') && pipeCount >= 2) {
            return true;
        }

        // ردیف جدول بدون لوله‌های کناری: col 1 | col 2 | col 3 (حداقل ۲ لوله برای جلوگیری از تشخیص اشتباه متن با یک پایپ)
        if (!s.includes('||') && pipeCount >= 2) {
            const cells = s.split('|').map(c => c.trim());
            if (cells.length >= 3
                && cells.every(c => c.length > 0)
                && !s.endsWith(';')
                && !/^(let|const|var)\s/.test(s)
                && !/^(if|while|for)\s*\(/.test(s)) {
                return true;
            }
        }

        return false;
    }

    // اعمال هوشمند ویراستار همراه با محافظت از کدهای درون‌خطی، بلوک‌های کد و لینک‌ها
    function processWithVirastar(text, isVirastarOn, isDigitsFa) {
        if (typeof window === 'undefined' || !window.Virastar) return text;

        // ۱. محافظت از بلوک‌های کد (حتی در صورت باز ماندن فنس ``` در انتهای متن) و کدهای درون‌خطی
        const codeTokens = [];
        let protectedText = text.replace(/```[\s\S]*?(?:```|$)|`[^`\n]+`/g, (match) => {
            const token = `__RTL_CODE_TOKEN_${codeTokens.length}__`;
            codeTokens.push(match);
            return token;
        });

        // ۲. محافظت از لینک‌های اینترنتی (URL) در برابر تغییر پورت‌ها، پارامترهای کوئری و علامت سوال توسط ویراستار
        const urlTokens = [];
        protectedText = protectedText.replace(URL_REGEX, (match) => {
            const token = `__RTL_URL_TOKEN_${urlTokens.length}__`;
            urlTokens.push(match);
            return token;
        });

        // ۳. محافظت از توکن‌های فنی، هش‌های رمزنگاری، شناسه‌ها، آدرس‌های IP و هاست‌ها همراه با پورت
        const techTokens = [];
        const techRegex = /\b(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?\b|\b[A-Za-z0-9_.-]+:\d{1,5}\b|\b(?=[A-Za-z0-9_.-]*[A-Za-z])(?=[A-Za-z0-9_.-]*\d)[A-Za-z0-9_.-]+\b/g;
        protectedText = protectedText.replace(techRegex, (match) => {
            const token = `__RTL_TECH_TOKEN_${techTokens.length}__`;
            techTokens.push(match);
            return token;
        });

        let processed = (typeof window !== 'undefined' && window.Virastar)
            ? window.Virastar.process(protectedText, {
                fixHalfSpace: isVirastarOn,
                fixPunctuation: isVirastarOn,
                normalizeChars: isVirastarOn,
                cleanupSpaces: false, // حفظ ساختار خطوط کاربر
                digits: isDigitsFa ? 'persian' : 'english',
            })
            : protectedText;

        // بازگردانی توکن‌های فنی محافظت‌شده
        processed = processed.replace(/__RTL_TECH_TOKEN_([0-9۰-۹]+)__/g, (match, idx) => {
            const enDigits = (typeof window !== 'undefined' && window.Virastar) ? window.Virastar.toEnglishDigits(idx) : idx;
            return techTokens[Number(enDigits)] || match;
        });

        // بازگردانی آدرس‌های اینترنتی محافظت‌شده
        processed = processed.replace(/__RTL_URL_TOKEN_([0-9۰-۹]+)__/g, (match, idx) => {
            const enDigits = (typeof window !== 'undefined' && window.Virastar) ? window.Virastar.toEnglishDigits(idx) : idx;
            return urlTokens[Number(enDigits)] || match;
        });

        // بازگردانی کدهای درون‌خطی و بلوک‌های کد
        processed = processed.replace(/__RTL_CODE_TOKEN_([0-9۰-۹]+)__/g, (match, idx) => {
            const enDigits = (typeof window !== 'undefined' && window.Virastar) ? window.Virastar.toEnglishDigits(idx) : idx;
            return codeTokens[Number(enDigits)] || match;
        });

        return processed;
    }

    function parseHeading(line) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('#')) return null;
        let level = 0;
        for (const c of trimmed) {
            if (c === '#') {
                level++;
                if (level > 6) return null;
            } else if (c === ' ' || c === '\t') {
                break;
            } else {
                return null;
            }
        }
        if (level >= 1 && level <= 6) {
            return { level, text: trimmed.slice(level).trim() };
        }
        return null;
    }

    function isHorizontalRule(line) {
        const s = line.trim();
        if (s.length < 3) return false;
        const allDash = /^[\s\-]+$/.test(s) && (s.match(/-/g) || []).length >= 3;
        const allStar = /^[\s\*]+$/.test(s) && (s.match(/\*/g) || []).length >= 3;
        const allUnder = /^[\s_]+$/.test(s) && (s.match(/_/g) || []).length >= 3;
        return allDash || allStar || allUnder;
    }

    function stripBlockquotePrefix(line) {
        const s = line.trim();
        if (s.startsWith('>')) {
            const rest = s.slice(1);
            return rest.startsWith(' ') ? rest.slice(1) : rest;
        }
        return null;
    }

    function parseUnorderedListItem(line) {
        const s = line.trim();
        if (s.startsWith('- ') || s.startsWith('* ') || s.startsWith('+ ')) {
            return s.slice(2).trim();
        }
        return null;
    }

    function parseOrderedListItem(line) {
        const s = line.trim();
        const m = /^(\d+)\.\s+(.*)$/.exec(s);
        if (m) {
            return m[2].trim();
        }
        return null;
    }

    function parseMarkdownToHtml(text) {
        if (!text) return '';
        const lines = text.split(/\r?\n/);
        const parts = [];
        let i = 0;
        const lineCount = lines.length;

        while (i < lineCount) {
            const line = lines[i];
            const trimmed = line.trim();

            // ۱. فنس کد چندخطی
            if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
                const fence = trimmed.startsWith('```') ? '```' : '~~~';
                const lang = trimmed.slice(fence.length).trim().split(/\s+/)[0] || '';
                const codeLines = [];
                i++;
                while (i < lineCount) {
                    if (lines[i].trim().startsWith(fence)) {
                        i++;
                        break;
                    }
                    codeLines.push(lines[i]);
                    i++;
                }
                const codeContent = codeLines.join('\n');
                const langClass = lang ? ` class="language-${escapeHtml(lang)}"` : '';
                const dataLang = lang ? ` data-lang="${escapeHtml(lang)}"` : '';
                parts.push(`<pre class="code-block" dir="ltr"${dataLang}><code dir="ltr"${langClass}>${escapeHtml(codeContent)}</code></pre>`);
                continue;
            }

            // خطوط خالی
            if (!trimmed) {
                i++;
                continue;
            }

            // ۲. تیترها
            const heading = parseHeading(line);
            if (heading) {
                const dir = detectDirection(heading.text);
                parts.push(`<h${heading.level} dir="${dir}">${formatInline(heading.text, dir === 'rtl')}</h${heading.level}>`);
                i++;
                continue;
            }

            // ۳. خط افقی
            if (isHorizontalRule(line)) {
                parts.push('<hr />');
                i++;
                continue;
            }

            // ۴. نقل‌قول
            const firstQuote = stripBlockquotePrefix(line);
            if (firstQuote !== null) {
                const quoteLines = [firstQuote];
                i++;
                while (i < lineCount) {
                    const q = stripBlockquotePrefix(lines[i]);
                    if (q !== null) {
                        quoteLines.push(q);
                        i++;
                    } else {
                        break;
                    }
                }
                const combined = quoteLines.join('\n');
                const dir = detectDirection(combined);
                parts.push(`<blockquote dir="${dir}">${formatInline(combined, dir === 'rtl')}</blockquote>`);
                continue;
            }

            // ۵. لیست‌های نامرتب
            const firstUnordered = parseUnorderedListItem(line);
            if (firstUnordered !== null) {
                const items = [firstUnordered];
                i++;
                while (i < lineCount) {
                    const item = parseUnorderedListItem(lines[i]);
                    if (item !== null) {
                        items.push(item);
                        i++;
                    } else {
                        break;
                    }
                }
                const allText = items.join(' ');
                const dir = detectDirection(allText);
                const lis = items.map(it => `<li>${formatInline(it, dir === 'rtl')}</li>`).join('');
                parts.push(`<ul dir="${dir}">${lis}</ul>`);
                continue;
            }

            // ۶. لیست‌های مرتب
            const firstOrdered = parseOrderedListItem(line);
            if (firstOrdered !== null) {
                const items = [firstOrdered];
                i++;
                while (i < lineCount) {
                    const item = parseOrderedListItem(lines[i]);
                    if (item !== null) {
                        items.push(item);
                        i++;
                    } else {
                        break;
                    }
                }
                const allText = items.join(' ');
                const dir = detectDirection(allText);
                const lis = items.map(it => `<li>${formatInline(it, dir === 'rtl')}</li>`).join('');
                parts.push(`<ol dir="${dir}">${lis}</ol>`);
                continue;
            }

            // ۷. جدول‌ها
            if (isTableLine(line)) {
                const tableLines = [line];
                i++;
                while (i < lineCount && isTableLine(lines[i])) {
                    tableLines.push(lines[i]);
                    i++;
                }
                const combined = tableLines.join('\n');
                const dir = detectDirection(combined);
                parts.push(`<pre class="table-block" dir="${dir}">${escapeHtml(combined)}</pre>`);
                continue;
            }

            // ۸. پاراگراف‌های متنی عادی
            const textLines = [line];
            i++;
            while (i < lineCount) {
                const nextLine = lines[i];
                const nextTrimmed = nextLine.trim();
                if (!nextTrimmed
                    || nextTrimmed.startsWith('```')
                    || nextTrimmed.startsWith('~~~')
                    || parseHeading(nextLine)
                    || isHorizontalRule(nextLine)
                    || stripBlockquotePrefix(nextLine) !== null
                    || parseUnorderedListItem(nextLine) !== null
                    || parseOrderedListItem(nextLine) !== null
                    || isTableLine(nextLine)) {
                    break;
                }
                textLines.push(nextLine);
                i++;
            }
            const combined = textLines.join('\n');
            const dir = detectDirection(combined);
            parts.push(`<pre class="text-block" dir="auto">${formatInline(combined, dir === 'rtl')}</pre>`);
        }

        return parts.join('\n');
    }

    function applyVirastarToHtml(html, isVirastarOn, isDigitsFa) {
        if (!html) return '';
        if (!isVirastarOn && !isDigitsFa) return html;

        const preserved = [];
        let working = html.replace(/<pre\s+class="(?:code-block|table-block)"[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>/gi, (m) => {
            const token = `__HTML_PRESERVED_BLOCK_${preserved.length}__`;
            preserved.push(m);
            return token;
        });

        const tagTokens = [];
        working = working.replace(/<[^>]+>/g, (m) => {
            const token = `__HTML_TAG_TOKEN_${tagTokens.length}__`;
            tagTokens.push(m);
            return token;
        });

        let processed = processWithVirastar(working, isVirastarOn, isDigitsFa);

        processed = processed.replace(/__HTML_TAG_TOKEN_([0-9۰-۹]+)__/g, (match, idx) => {
            const enDigits = (typeof window !== 'undefined' && window.Virastar) ? window.Virastar.toEnglishDigits(idx) : idx;
            return tagTokens[Number(enDigits)] || match;
        });

        processed = processed.replace(/__HTML_PRESERVED_BLOCK_([0-9۰-۹]+)__/g, (match, idx) => {
            const enDigits = (typeof window !== 'undefined' && window.Virastar) ? window.Virastar.toEnglishDigits(idx) : idx;
            return preserved[Number(enDigits)] || match;
        });

        return processed;
    }

    // رندر مجدد محتوا با توجه به سوییچ‌های ویراستار و ارقام
    function renderContent() {
        if (!currentRawData) return;

        let rawHtml = currentRawData.html || '';

        // اگر محتوای خالی یا پیام راهنما باشد
        if (currentRawData.is_empty || rawHtml.includes('empty-state')) {
            currentCleanText = '';
            if (contentBody) {
                contentBody.innerHTML = getEmptyStateHtml(currentShortcut);
            }
            updateStats('');
            return;
        }

        // استخراج متن خام اصلی
        let plain = currentRawData.raw_text || currentRawData.plain_text || '';
        if (!plain) {
            if (doc) {
                const tempDiv = doc.createElement('div');
                tempDiv.innerHTML = rawHtml;
                plain = tempDiv.innerText;
            }
        }

        // در صورت دریافت محتوای غنی HTML
        if (currentRawData.is_html) {
            currentCleanText = plain;
            if (contentBody) {
                contentBody.innerHTML = rawHtml;
            }
            updateStats(plain);
            return;
        }

        // اعمال ویراستار و تنظیم ارقام در صورت فعال بودن با محافظت از کدها و لینک‌ها
        const processedText = processWithVirastar(plain, virastarEnabled, digitsPersian);
        currentCleanText = processedText;

        let finalHtml = '';
        if (rawHtml && rawHtml.trim() && !rawHtml.includes('empty-state')) {
            finalHtml = applyVirastarToHtml(rawHtml, virastarEnabled, digitsPersian);
        } else {
            finalHtml = parseMarkdownToHtml(processedText);
        }

        if (contentBody) {
            contentBody.textContent = '';
            contentBody.innerHTML = finalHtml || escapeHtml(processedText);
        }
        updateStats(processedText);
    }

    // به‌روزرسانی اولیه داده دریافتی
    function updateView(data) {
        if (!data) return;
        currentRawData = data;
        
        // ذخیره متن خالص برای استفاده در ویراستار، کپی و صدور عکس
        if (!currentRawData.raw_text) {
            if (doc) {
                const temp = doc.createElement('div');
                temp.innerHTML = data.html || '';
                currentRawData.raw_text = temp.innerText;
            } else {
                currentRawData.raw_text = data.html ? data.html.replace(/<[^>]*>/g, '') : '';
            }
        }
        currentRawData.plain_text = currentRawData.raw_text;

        renderContent();
    }

    // پنهان‌سازی پنجره برنامه
    async function hideApplicationWindow() {
        try {
            if (typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core) {
                await window.__TAURI__.core.invoke('hide_window');
            } else if (typeof window !== 'undefined' && window.close) {
                window.close();
            }
        } catch (err) {
            console.error('Failed to hide window:', err);
        }
    }

    // بستن پنجره یا مدال‌های فعال (با Esc)
    async function closePopup() {
        try {
            if (cardModal && cardModal.classList && cardModal.classList.contains('open')) {
                closeCardModal();
                return;
            }
            if (shortcutModal && isShortcutModalOpen) {
                closeShortcutModal();
                return;
            }
            if (traySettingsModal && isTraySettingsOpen) {
                closeTraySettingsModal();
                return;
            }
            if (hamburgerDropdown && isHamburgerOpen) {
                toggleHamburgerMenu(false);
                return;
            }
            await hideApplicationWindow();
        } catch (err) {
            console.error('Failed to close popup:', err);
        }
    }

    // باز و بسته کردن منوی همبرگری
    function toggleHamburgerMenu(forceState) {
        if (!hamburgerDropdown) return;
        if (typeof forceState === 'boolean') {
            isHamburgerOpen = forceState;
        } else {
            isHamburgerOpen = hamburgerDropdown.classList.contains('hidden') || !hamburgerDropdown.classList.contains('open');
        }
        if (isHamburgerOpen) {
            hamburgerDropdown.classList.remove('hidden');
            hamburgerDropdown.classList.add('open');
        } else {
            hamburgerDropdown.classList.add('hidden');
            hamburgerDropdown.classList.remove('open');
        }
    }

    // توابع کمکی یکپارچه باز و بسته کردن مدال‌ها
    function showModal(modalEl) {
        if (!modalEl) return;
        modalEl.classList.remove('hidden');
        modalEl.classList.add('open');
    }

    function hideModal(modalEl) {
        if (!modalEl) return;
        modalEl.classList.remove('open');
        modalEl.classList.add('hidden');
    }

    // باز و بسته کردن مدال تنظیمات ترِی
    function openTraySettingsModal() {
        toggleHamburgerMenu(false);
        isTraySettingsOpen = true;
        if (traySettingsModal) {
            showModal(traySettingsModal);
            if (trayToggleAlwaysTop) trayToggleAlwaysTop.checked = isPinned;
        }
    }

    function closeTraySettingsModal() {
        isTraySettingsOpen = false;
        hideModal(traySettingsModal);
    }

    // باز و بسته کردن مدال تغییر میانبر
    function openShortcutModal() {
        toggleHamburgerMenu(false);
        isShortcutModalOpen = true;
        if (inputCustomShortcut) inputCustomShortcut.value = formatShortcutDisplay(currentShortcut);
        showModal(shortcutModal);
    }

    function closeShortcutModal() {
        isShortcutModalOpen = false;
        hideModal(shortcutModal);
    }

    // عملیات سلامت‌سنجی و بازیابی منابع (Repair Routine)
    async function executeRepairRoutine() {
        try {
            if (typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core) {
                await window.__TAURI__.core.invoke('repair_installation');
            }
            applyToolbarVisibility();
            updateShortcutDisplays();
            setTheme(currentTheme);
            if (typeof alert !== 'undefined') {
                alert('سیستم با موفقیت بررسی و تمام منابع، کش‌ها و تنظیمات برنامه بازیابی شدند ✔');
            }
        } catch (err) {
            console.error('Repair error:', err);
            if (typeof alert !== 'undefined') {
                alert('عملیات بازیابی با خطا مواجه شد: ' + err);
            }
        }
    }

    // تغییر وضعیت پین (Always on Top)
    async function togglePin() {
        try {
            if (typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core) {
                const nextState = await window.__TAURI__.core.invoke('toggle_always_on_top');
                isPinned = nextState;
            } else {
                isPinned = !isPinned;
            }
            if (btnPin) {
                btnPin.classList.toggle('active', isPinned);
                btnPin.title = isPinned ? 'پنجره سنجاق شده است (همیشه رو)' : 'سنجاق کردن پنجره در بالا (Always on Top)';
            }
            if (trayToggleAlwaysTop) {
                trayToggleAlwaysTop.checked = isPinned;
            }
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
        if (typeof window !== 'undefined' && window.CardExporter && cardCanvas && contentBody) {
            window.CardExporter.renderCard(cardCanvas, contentBody.innerHTML, currentTheme, currentWindowStyle);
        }
    }

    // باز کردن مدال کارت تصویری
    function openCardModal() {
        toggleHamburgerMenu(false);
        const text = currentCleanText || (currentRawData && (currentRawData.raw_text || currentRawData.plain_text)) || (contentBody ? contentBody.innerText : '') || '';
        if (!text.trim()) {
            if (contentBody) {
                contentBody.innerHTML = '<p>متن نمونه برای تولید کارت تصویری در استودیوی RTL View</p>';
            }
        }
        updateStyleSwitcherUI();
        showModal(cardModal);
        renderActiveCard();
    }

    function closeCardModal() {
        hideModal(cardModal);
    }

    // ==========================================
    // رویدادهای دکمه‌ها و تعاملات
    // ==========================================

    // جابه‌جایی روان و مطمئن پنجره با کشیدن نوار عنوان (Window Dragging)
    if (windowTitlebar) {
        windowTitlebar.addEventListener('mousedown', async (e) => {
            if (e.target.closest('button, a, input, select, textarea, .hamburger-dropdown')) {
                return;
            }
            if (e.button === 0) {
                try {
                    if (typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core) {
                        await window.__TAURI__.core.invoke('start_dragging');
                    }
                } catch (err) {
                    console.error('start_dragging invoke failed:', err);
                }
            }
        });
    }

    // کنترل‌های پنجره سفارشی (Minimize, Maximize, Close)
    if (btnWinMinimize) {
        btnWinMinimize.addEventListener('click', async () => {
            if (typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core) {
                await window.__TAURI__.core.invoke('minimize_window');
            }
        });
    }

    if (btnWinMaximize) {
        btnWinMaximize.addEventListener('click', async () => {
            if (typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core) {
                await window.__TAURI__.core.invoke('toggle_maximize_window');
            }
        });
    }

    if (btnWinClose) {
        btnWinClose.addEventListener('click', async (e) => {
            if (e && e.stopPropagation) e.stopPropagation();
            toggleHamburgerMenu(false);
            await hideApplicationWindow();
        });
    }

    // دکمه منوی همبرگری
    if (btnHamburger) {
        btnHamburger.addEventListener('click', (e) => {
            if (e && e.stopPropagation) e.stopPropagation();
            toggleHamburgerMenu();
        });
    }

    // دکمه بستن داخلی منوی همبرگری
    if (btnCloseHamburger) {
        btnCloseHamburger.addEventListener('click', (e) => {
            if (e && e.stopPropagation) e.stopPropagation();
            toggleHamburgerMenu(false);
        });
    }

    // بستن منوی همبرگری هنگام کلیک در خارج از آن
    if (doc) {
        doc.addEventListener('click', (e) => {
            if (hamburgerDropdown && isHamburgerOpen) {
                if (!hamburgerDropdown.contains(e.target) && e.target !== btnHamburger && (!btnHamburger || !btnHamburger.contains(e.target))) {
                    toggleHamburgerMenu(false);
                }
            }
        });
    }

    // انتخاب تم از منوی همبرگری
    if (doc && typeof doc.querySelectorAll === 'function') {
        const themeButtons = doc.querySelectorAll('.theme-opt-btn');
        themeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const val = btn.getAttribute('data-theme-val');
                if (val) {
                    setTheme(val);
                    if (cardModal && cardModal.classList.contains('open')) {
                        renderActiveCard();
                    }
                }
            });
        });
    }

    // سوییچ‌های نمایش دکمه‌های نوار ابزار
    if (doc && typeof doc.querySelectorAll === 'function') {
        const toggleInputs = doc.querySelectorAll('.toolbar-toggles-list input[type="checkbox"]');
        toggleInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const targetId = e.target.getAttribute('data-target');
                if (targetId) {
                    setToolbarItemVisibility(targetId, e.target.checked);
                }
            });
        });
    }

    // اکشن‌های منوی همبرگری
    if (menuBtnOpenTraySettings) menuBtnOpenTraySettings.addEventListener('click', openTraySettingsModal);
    if (menuBtnChangeShortcut) menuBtnChangeShortcut.addEventListener('click', openShortcutModal);
    async function exitApplication() {
        if (typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core) {
            try {
                await window.__TAURI__.core.invoke('quit_app');
                return;
            } catch (_) {}
        }
        closePopup();
    }

    if (menuBtnRepair) menuBtnRepair.addEventListener('click', executeRepairRoutine);
    if (menuBtnQuit) menuBtnQuit.addEventListener('click', exitApplication);

    // تغییر تم از طریق سلکتور (جهت سازگاری کامل)
    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            const val = (e && e.target && e.target.value) ? e.target.value : (themeSelect.value || currentTheme);
            setTheme(val);
            if (cardModal && cardModal.classList.contains('open')) {
                renderActiveCard();
            }
        });
    }

    // مدال تنظیمات ترِی
    if (btnCloseTrayModal) btnCloseTrayModal.addEventListener('click', closeTraySettingsModal);
    if (btnTrayModalClose) btnTrayModalClose.addEventListener('click', closeTraySettingsModal);
    if (btnTrayModalQuit) btnTrayModalQuit.addEventListener('click', exitApplication);
    if (btnTrayRepair) btnTrayRepair.addEventListener('click', executeRepairRoutine);
    if (btnTrayChangeShortcut) btnTrayChangeShortcut.addEventListener('click', openShortcutModal);

    if (trayToggleAlwaysTop) {
        trayToggleAlwaysTop.addEventListener('change', async () => {
            await togglePin();
        });
    }

    if (trayToggleAutostart) {
        trayToggleAutostart.addEventListener('change', async () => {
            if (typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core) {
                try {
                    const enabled = await window.__TAURI__.core.invoke('toggle_autostart_cmd');
                    trayToggleAutostart.checked = enabled;
                } catch (e) {
                    console.error('Failed to toggle autostart:', e);
                }
            }
        });
    }

    // مدال میانبر
    if (btnCloseShortcutModal) btnCloseShortcutModal.addEventListener('click', closeShortcutModal);
    if (btnCancelShortcut) btnCancelShortcut.addEventListener('click', closeShortcutModal);

    if (doc && typeof doc.querySelectorAll === 'function') {
        const presetBtns = doc.querySelectorAll('.shortcut-preset-btn');
        presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const sc = btn.getAttribute('data-sc');
                if (sc && inputCustomShortcut) {
                    inputCustomShortcut.value = formatShortcutDisplay(sc);
                }
            });
        });
    }

    if (btnSaveShortcut) {
        btnSaveShortcut.addEventListener('click', async () => {
            if (inputCustomShortcut && inputCustomShortcut.value.trim()) {
                const newSc = inputCustomShortcut.value.trim();
                const cleanSc = newSc.replace(/\s+/g, '');
                try {
                    if (typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core) {
                        await window.__TAURI__.core.invoke('update_global_shortcut', { shortcutStr: cleanSc });
                    }
                    currentShortcut = formatShortcutDisplay(newSc);
                    storage.setItem('rtl_shortcut', currentShortcut);
                    updateShortcutDisplays();
                    closeShortcutModal();
                    showButtonFeedback(btnSaveShortcut, 'ذخیره شد!');
                } catch (err) {
                    console.error('Failed to update shortcut:', err);
                    if (typeof alert !== 'undefined') {
                        alert('امکان ثبت میانبر در ویندوز وجود ندارد:\n' + err + '\nلطفاً از ترکیب‌های استاندارد مانند Ctrl+Alt+F، Ctrl+Shift+R یا Alt+F استفاده کنید.');
                    }
                }
            }
        });
    }

    // سوییچ ویراستار
    if (btnVirastar) {
        btnVirastar.addEventListener('click', () => {
            virastarEnabled = !virastarEnabled;
            btnVirastar.classList.toggle('active', virastarEnabled);
            storage.setItem('rtl_virastar', virastarEnabled.toString());
            renderContent();
        });
    }

    function updateButtonLabel(btn, text) {
        if (!btn) return;
        const labelEl = (typeof btn.querySelector === 'function') ? btn.querySelector('.btn-label') : null;
        if (labelEl) {
            labelEl.textContent = text;
        } else {
            btn.textContent = text;
        }
    }

    function showButtonFeedback(btn, feedbackText, duration = 1500) {
        if (!btn) return;
        const labelEl = (typeof btn.querySelector === 'function') ? btn.querySelector('.btn-label') : null;
        if (labelEl) {
            const orig = labelEl.textContent;
            labelEl.textContent = feedbackText;
            setTimeout(() => {
                if (labelEl) labelEl.textContent = orig;
            }, duration);
        } else {
            const orig = btn.textContent;
            btn.textContent = feedbackText;
            setTimeout(() => {
                btn.textContent = orig;
            }, duration);
        }
    }

    // سوییچ ارقام
    if (btnDigits) {
        btnDigits.addEventListener('click', () => {
            digitsPersian = !digitsPersian;
            btnDigits.classList.toggle('active', digitsPersian);
            updateButtonLabel(btnDigits, digitsPersian ? 'ارقام ۱۲۳' : 'ارقام 123');
            storage.setItem('rtl_digits', digitsPersian.toString());
            renderContent();
        });
    }

    // دکمه کپی تمیز (استفاده از متن در حافظه بدون بازخوانی سنگین از DOM)
    if (btnCleanCopy) {
        btnCleanCopy.addEventListener('click', async () => {
            try {
                const text = currentCleanText || (contentBody ? contentBody.innerText : '');
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    await navigator.clipboard.writeText(text);
                    showButtonFeedback(btnCleanCopy, 'کپی شد!', 1600);
                }
            } catch (e) {
                console.error('Clean copy failed:', e);
            }
        });
    }

    // کپی خام
    if (btnCopy) {
        btnCopy.addEventListener('click', async () => {
            try {
                const raw = (currentRawData && currentRawData.raw_text) 
                    ? currentRawData.raw_text 
                    : ((currentRawData && currentRawData.plain_text) ? currentRawData.plain_text : (currentCleanText || (contentBody ? contentBody.innerText : '')));
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    await navigator.clipboard.writeText(raw);
                    showButtonFeedback(btnCopy, 'کپی شد!', 1500);
                }
            } catch (e) {
                console.error('Copy failed:', e);
            }
        });
    }

    // بستن
    if (btnClose) {
        btnClose.addEventListener('click', async (e) => {
            if (e && e.stopPropagation) e.stopPropagation();
            toggleHamburgerMenu(false);
            await hideApplicationWindow();
        });
    }

    // پین
    if (btnPin) btnPin.addEventListener('click', togglePin);

    // تغییر اندازه قلم
    if (btnFontDec) btnFontDec.addEventListener('click', () => setFontSize(currentFontSize - 1));
    if (btnFontInc) btnFontInc.addEventListener('click', () => setFontSize(currentFontSize + 1));

    // سوییچ استایل پنجره (ویندوز یا مک)
    if (btnStyleWindows) {
        btnStyleWindows.addEventListener('click', () => {
            currentWindowStyle = 'windows';
            storage.setItem('rtl_window_style', 'windows');
            updateStyleSwitcherUI();
            renderActiveCard();
        });
    }

    if (btnStyleMac) {
        btnStyleMac.addEventListener('click', () => {
            currentWindowStyle = 'mac';
            storage.setItem('rtl_window_style', 'mac');
            updateStyleSwitcherUI();
            renderActiveCard();
        });
    }

    // کارت تصویری
    if (btnExportCard) btnExportCard.addEventListener('click', openCardModal);
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeCardModal);
    if (btnCancelModal) btnCancelModal.addEventListener('click', closeCardModal);

    // کپی تصویر کارت به کلیپ‌بورد
    if (btnCopyCardImg) {
        btnCopyCardImg.addEventListener('click', async () => {
            try {
                if (typeof window !== 'undefined' && window.CardExporter && cardCanvas) {
                    await window.CardExporter.copyToClipboard(cardCanvas);
                    showButtonFeedback(btnCopyCardImg, 'عکس کپی شد!', 1800);
                }
            } catch (err) {
                console.error('Failed to copy card image:', err);
                if (typeof alert !== 'undefined') {
                    alert('مرورگر اجازه کپی خودکار تصویر را نداد. لطفاً از دکمه «دانلود تصویر PNG» استفاده کنید.');
                }
            }
        });
    }

    // دانلود تصویر کارت
    if (btnSaveCardImg) {
        btnSaveCardImg.addEventListener('click', () => {
            if (typeof window !== 'undefined' && window.CardExporter && cardCanvas) {
                window.CardExporter.downloadImage(cardCanvas, `rtl-card-${Date.now()}.png`);
            }
        });
    }

    // کلیدهای میانبر درون پنجره
    if (doc) {
        doc.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closePopup();
            } else if (e.altKey && (e.key === 'm' || e.key === 'M' || e.key === 'م')) {
                e.preventDefault();
                toggleHamburgerMenu();
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
    }

    // کلیک روی پس‌زمینه مدال‌ها برای بستن آن‌ها
    if (cardModal) {
        cardModal.addEventListener('click', (e) => {
            if (e.target === cardModal) closeCardModal();
        });
    }
    if (traySettingsModal) {
        traySettingsModal.addEventListener('click', (e) => {
            if (e.target === traySettingsModal) closeTraySettingsModal();
        });
    }
    if (shortcutModal) {
        shortcutModal.addEventListener('click', (e) => {
            if (e.target === shortcutModal) closeShortcutModal();
        });
    }

    // شنود رویداد دریافت متن جدید و رویدادهای سیستم ترِی از بک‌اند Rust
    if (typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.event) {
        window.__TAURI__.event.listen('new-content', (event) => {
            updateView(event.payload);
        });
        window.__TAURI__.event.listen('open-tray-settings', () => {
            openTraySettingsModal();
        });
        window.__TAURI__.event.listen('trigger-repair', () => {
            executeRepairRoutine();
        });
        window.__TAURI__.event.listen('shortcut-updated', (event) => {
            if (event.payload) {
                currentShortcut = formatShortcutDisplay(event.payload);
                storage.setItem('rtl_shortcut', currentShortcut);
                updateShortcutDisplays();
            }
        });
    }

    // بارگذاری اولیه
    if (typeof window !== 'undefined') {
        window.addEventListener('DOMContentLoaded', async () => {
            currentShortcut = formatShortcutDisplay(currentShortcut);
            setTheme(currentTheme);
            setFontSize(currentFontSize);
            applyToolbarVisibility();
            updateShortcutDisplays();
            if (btnVirastar) btnVirastar.classList.toggle('active', virastarEnabled);
            if (btnDigits) {
                btnDigits.classList.toggle('active', digitsPersian);
                updateButtonLabel(btnDigits, digitsPersian ? 'ارقام ۱۲۳' : 'ارقام 123');
            }

            try {
                if (window.__TAURI__ && window.__TAURI__.core) {
                    if (currentShortcut && currentShortcut !== 'Ctrl+Alt+F' && currentShortcut !== 'Ctrl + Alt + F') {
                        const cleanSc = currentShortcut.replace(/\s+/g, '');
                        window.__TAURI__.core.invoke('update_global_shortcut', { shortcutStr: cleanSc }).catch(e => console.warn('Custom shortcut restore failed:', e));
                    }
                    const initial = await window.__TAURI__.core.invoke('get_current_content');
                    updateView(initial);
                }
            } catch (e) {
                console.warn('Initial content fetch error:', e);
            }
        });
    }

    const RtlApp = {
        processWithVirastar,
        formatInline,
        formatTextSegment,
        escapeHtml,
        isTableLine,
        updateStats,
        renderContent,
        updateView,
        setTheme,
        setToolbarItemVisibility,
        getToolbarVisibility: () => Object.assign({}, toolbarVisibility),
        getCurrentCleanText: () => currentCleanText,
    };

    if (typeof window !== 'undefined') {
        window.RtlApp = RtlApp;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = RtlApp;
    }

})();
