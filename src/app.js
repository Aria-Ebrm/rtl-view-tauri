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
    const themeSelect = doc ? doc.getElementById('theme-select') : null;
    const btnExportCard = doc ? doc.getElementById('btn-export-card') : null;

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
        if (doc && doc.documentElement) {
            doc.documentElement.setAttribute('data-theme', theme);
        }
        if (themeSelect) {
            themeSelect.value = theme;
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
                contentBody.innerHTML = rawHtml;
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

    // بستن پنجره
    async function closePopup() {
        try {
            if (cardModal && cardModal.classList && cardModal.classList.contains('open')) {
                closeCardModal();
                return;
            }
            if (typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core) {
                await window.__TAURI__.core.invoke('hide_window');
            } else if (typeof window !== 'undefined' && window.close) {
                window.close();
            }
        } catch (err) {
            console.error('Failed to hide window:', err);
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

    // باز کردن مدال کارت تصویری (استفاده از متن کش‌شده برای جلوگیری از Freeze در متن‌های حجیم)
    function openCardModal() {
        const text = currentCleanText || (currentRawData && (currentRawData.raw_text || currentRawData.plain_text)) || (contentBody ? contentBody.innerText : '') || '';
        if (!text.trim() || text.includes('برنامه RTL View فعال است')) {
            alert('متنی برای ساخت کارت تصویری موجود نیست.');
            return;
        }
        updateStyleSwitcherUI();
        if (cardModal) cardModal.classList.add('open');
        renderActiveCard();
    }

    function closeCardModal() {
        if (cardModal) cardModal.classList.remove('open');
    }

    // ==========================================
    // رویدادهای دکمه‌ها و تعاملات
    // ==========================================

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
    if (btnClose) btnClose.addEventListener('click', closePopup);

    // پین
    if (btnPin) btnPin.addEventListener('click', togglePin);

    // تغییر اندازه قلم
    if (btnFontDec) btnFontDec.addEventListener('click', () => setFontSize(currentFontSize - 1));
    if (btnFontInc) btnFontInc.addEventListener('click', () => setFontSize(currentFontSize + 1));

    // تغییر تم
    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            setTheme(e.target.value);
            if (cardModal && cardModal.classList.contains('open')) {
                renderActiveCard();
            }
        });
    }

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

    // کلیک روی پس‌زمینه مدال برای بستن آن
    if (cardModal) {
        cardModal.addEventListener('click', (e) => {
            if (e.target === cardModal) {
                closeCardModal();
            }
        });
    }

    // شنود رویداد دریافت متن جدید از بک‌اند Rust
    if (typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.event) {
        window.__TAURI__.event.listen('new-content', (event) => {
            updateView(event.payload);
        });
    }

    // بارگذاری اولیه
    if (typeof window !== 'undefined') {
        window.addEventListener('DOMContentLoaded', async () => {
            setTheme(currentTheme);
            setFontSize(currentFontSize);
            if (btnVirastar) btnVirastar.classList.toggle('active', virastarEnabled);
            if (btnDigits) {
                btnDigits.classList.toggle('active', digitsPersian);
                updateButtonLabel(btnDigits, digitsPersian ? 'ارقام ۱۲۳' : 'ارقام 123');
            }

            try {
                if (window.__TAURI__ && window.__TAURI__.core) {
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
        getCurrentCleanText: () => currentCleanText,
    };

    if (typeof window !== 'undefined') {
        window.RtlApp = RtlApp;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = RtlApp;
    }

})();
