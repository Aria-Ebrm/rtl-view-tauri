/**
 * Card Exporter for RTL View - Version 2.1.1
 * Generates beautiful, high-resolution (Retina 2x) social media cards
 * formatted with Vazirmatn font, theme palettes, inline code badges,
 * and adaptive OS window decorations (Windows 11 or macOS).
 */

(function(window) {
    'use strict';

    const THEME_PALETTES = {
        zinc: {
            bgOuter1: '#18181b',
            bgOuter2: '#09090b',
            cardBg: '#27272a',
            border: '#3f3f46',
            text: '#f4f4f5',
            muted: '#a1a1aa',
            accent: '#fbbf24',
            accentBg: 'rgba(251, 191, 36, 0.15)',
            codeBg: 'rgba(251, 191, 36, 0.09)',
            codeBorder: 'rgba(251, 191, 36, 0.25)',
            codeColor: '#fbbf24',
            tableBg: '#1f1f23',
        },
        onedark: {
            bgOuter1: '#21252b',
            bgOuter2: '#16191d',
            cardBg: '#282c34',
            border: '#3e4451',
            text: '#abb2bf',
            muted: '#5c6370',
            accent: '#61afef',
            accentBg: 'rgba(97, 175, 239, 0.15)',
            codeBg: 'rgba(97, 175, 239, 0.12)',
            codeBorder: 'rgba(97, 175, 239, 0.28)',
            codeColor: '#61afef',
            tableBg: '#1e2227',
        },
        dracula: {
            bgOuter1: '#21222c',
            bgOuter2: '#191a21',
            cardBg: '#282a36',
            border: '#44475a',
            text: '#f8f8f2',
            muted: '#6272a4',
            accent: '#bd93f9',
            accentBg: 'rgba(189, 147, 249, 0.15)',
            codeBg: 'rgba(189, 147, 249, 0.14)',
            codeBorder: 'rgba(189, 147, 249, 0.32)',
            codeColor: '#bd93f9',
            tableBg: '#1e1f29',
        },
        gruvbox: {
            bgOuter1: '#282828',
            bgOuter2: '#1d2021',
            cardBg: '#32302f',
            border: '#504945',
            text: '#ebdbb2',
            muted: '#928374',
            accent: '#fabd2f',
            accentBg: 'rgba(250, 189, 47, 0.15)',
            codeBg: 'rgba(250, 189, 47, 0.12)',
            codeBorder: 'rgba(250, 189, 47, 0.28)',
            codeColor: '#fabd2f',
            tableBg: '#282828',
        },
        light: {
            bgOuter1: '#f8fafc',
            bgOuter2: '#e2e8f0',
            cardBg: '#ffffff',
            border: '#cbd5e1',
            text: '#0f172a',
            muted: '#64748b',
            accent: '#2563eb',
            accentBg: 'rgba(37, 99, 235, 0.12)',
            codeBg: 'rgba(37, 99, 235, 0.08)',
            codeBorder: 'rgba(37, 99, 235, 0.22)',
            codeColor: '#1d4ed8',
            tableBg: '#f1f5f9',
        }
    };

    function roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    function decodeHtml(str) {
        return str
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
    }

    function hasPersian(text) {
        return /[\u0600-\u06FF]/.test(text);
    }

    /**
     * تفکیک یک خط به کلمات معمولی و کدهای درون‌خطی با حفظ ساختار
     */
    function parseLineTokens(htmlLine) {
        const tokens = [];
        // شناسایی تگ‌های code
        const codeRegex = /<code[^>]*>([\s\S]*?)<\/code>/gi;
        let lastIndex = 0;
        let match;

        while ((match = codeRegex.exec(htmlLine)) !== null) {
            const before = htmlLine.substring(lastIndex, match.index);
            if (before) {
                tokens.push({ isCode: false, text: decodeHtml(before) });
            }
            const codeVal = decodeHtml(match[1]);
            if (codeVal) {
                tokens.push({ isCode: true, text: codeVal });
            }
            lastIndex = codeRegex.lastIndex;
        }

        if (lastIndex < htmlLine.length) {
            const after = htmlLine.substring(lastIndex);
            if (after) {
                tokens.push({ isCode: false, text: decodeHtml(after) });
            }
        }

        // اگر هیچ تگ code وجود نداشت ولی کلمات انگلیسی موجود بودند، خودمان آن‌ها را تفکیک می‌کنیم
        let flatTokens = tokens;
        if (tokens.every(t => !t.isCode)) {
            flatTokens = [];
            const fullText = tokens.map(t => t.text).join('');
            const engRegex = /([a-zA-Z0-9_\-\.\:\/\@\=\\]*[a-zA-Z][a-zA-Z0-9_\-\.\:\/\@\=\\]*)/g;
            let lastIdx = 0;
            let engMatch;
            while ((engMatch = engRegex.exec(fullText)) !== null) {
                const b = fullText.substring(lastIdx, engMatch.index);
                if (b) flatTokens.push({ isCode: false, text: b });
                flatTokens.push({ isCode: true, text: engMatch[1] });
                lastIdx = engRegex.lastIndex;
            }
            if (lastIdx < fullText.length) {
                flatTokens.push({ isCode: false, text: fullText.substring(lastIdx) });
            }
        }

        // تجزیه بخش‌های متنی معمولی به کلمات برای Wrap صحیح
        const atomicItems = [];
        for (const tok of flatTokens) {
            if (tok.isCode) {
                atomicItems.push(tok);
            } else {
                const words = tok.text.split(' ');
                for (let i = 0; i < words.length; i++) {
                    const w = words[i];
                    if (w) {
                        atomicItems.push({ isCode: false, text: w });
                    }
                }
            }
        }

        return atomicItems;
    }

    /**
     * استخراج بلوک‌ها از منبع HTML پنجره
     */
    function extractBlocks(htmlSource) {
        const blocks = [];
        const container = document.createElement('div');
        container.innerHTML = htmlSource;

        const children = Array.from(container.children);
        if (children.length === 0) {
            // متن ساده
            const lines = container.innerText.split('\n');
            for (const line of lines) {
                if (!line.trim()) {
                    blocks.push({ type: 'empty' });
                } else {
                    blocks.push({ type: 'text', items: parseLineTokens(line) });
                }
            }
            return blocks;
        }

        for (const el of children) {
            if (el.classList.contains('table-block')) {
                blocks.push({
                    type: 'table',
                    text: el.innerText
                });
            } else {
                // بلوک متنی یا پاراگراف
                const rawHtml = el.innerHTML;
                const lines = rawHtml.split(/\n|<br\s*\/?>/i);
                for (const lineHtml of lines) {
                    const trimmed = lineHtml.trim();
                    if (!trimmed) {
                        blocks.push({ type: 'empty' });
                    } else {
                        blocks.push({
                            type: 'text',
                            items: parseLineTokens(lineHtml)
                        });
                    }
                }
            }
        }

        return blocks;
    }

    /**
     * رسم دکمه‌های کنترلی پنجره به سبک ویندوز ۱۱
     */
    function drawWindowsControls(ctx, startX, centerY, palette) {
        const btnWidth = 26;
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = palette.muted;
        ctx.lineCap = 'round';

        // ۱. کمینه کردن (―)
        const minX = startX + (btnWidth / 2);
        ctx.beginPath();
        ctx.moveTo(minX - 4.5, centerY + 2);
        ctx.lineTo(minX + 4.5, centerY + 2);
        ctx.stroke();

        // ۲. بیشینه کردن (▢)
        const maxX = startX + btnWidth + (btnWidth / 2);
        ctx.strokeRect(maxX - 4, centerY - 4, 8, 8);

        // ۳. بستن (✕)
        const closeX = startX + (btnWidth * 2) + (btnWidth / 2);
        ctx.beginPath();
        ctx.moveTo(closeX - 4, centerY - 4);
        ctx.lineTo(closeX + 4, centerY + 4);
        ctx.moveTo(closeX + 4, centerY - 4);
        ctx.lineTo(closeX - 4, centerY + 4);
        ctx.stroke();
    }

    /**
     * رسم دکمه‌های کنترلی پنجره به سبک macOS (سه نقطه رنگی)
     */
    function drawMacControls(ctx, startX, centerY) {
        const dotRadius = 5.5;
        const spacing = 17;

        // قرمز
        ctx.fillStyle = '#ff5f56';
        ctx.beginPath();
        ctx.arc(startX, centerY, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        // زرد
        ctx.fillStyle = '#ffbd2e';
        ctx.beginPath();
        ctx.arc(startX + spacing, centerY, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        // سبز
        ctx.fillStyle = '#27c93f';
        ctx.beginPath();
        ctx.arc(startX + (spacing * 2), centerY, dotRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * رندر کامل کارت روی Canvas با وضوح بالا
     */
    function renderCard(canvas, htmlSource, themeName = 'zinc', windowStyle = 'auto') {
        if (!canvas) return;

        const palette = THEME_PALETTES[themeName] || THEME_PALETTES.zinc;
        const ctx = canvas.getContext('2d');
        const scale = 2; // کیفیت بالای Retina

        // تشخیص سیستم‌عامل در حالت auto
        let effectiveStyle = windowStyle;
        if (effectiveStyle === 'auto') {
            const isMac = /Macintosh|Mac OS X|iPhone|iPad/.test(navigator.userAgent);
            effectiveStyle = isMac ? 'mac' : 'windows';
        }

        const cardLogicalWidth = 760;
        const outerPadding = 36;
        const innerPaddingX = 32;
        const headerHeight = 46;
        const bottomPadding = 20;
        const maxLineWidth = cardLogicalWidth - (innerPaddingX * 2);

        const textFontSize = 16.5;
        const textFont = `450 ${textFontSize}px "Vazirmatn", -apple-system, BlinkMacSystemFont, sans-serif`;
        const codeFontSize = 13.5;
        const codeFont = `550 ${codeFontSize}px Consolas, "Courier New", monospace`;
        const lineHeight = 36;

        // آماده‌سازی بلوک‌های محتوا
        const blocks = extractBlocks(htmlSource);

        // ۱. محاسبه چیدمان و ارتفاع مورد نیاز برای خطوط
        ctx.font = textFont;
        const spaceWidth = ctx.measureText(' ').width;

        const wrappedBlocks = [];

        for (const b of blocks) {
            if (b.type === 'empty') {
                wrappedBlocks.push({ type: 'empty', height: 16 });
                continue;
            }

            if (b.type === 'table') {
                const lines = b.text.split('\n');
                const tableH = (lines.length * 20) + 24;
                wrappedBlocks.push({ type: 'table', textLines: lines, height: tableH });
                continue;
            }

            // بلوک متنی با آیتم‌ها
            const lines = [];
            let currentLine = [];
            let currentLineWidth = 0;

            for (const item of b.items) {
                let itemW = 0;
                if (item.isCode) {
                    ctx.font = codeFont;
                    itemW = ctx.measureText(item.text).width + 14; // پدینگ چپ و راست بج
                } else {
                    ctx.font = textFont;
                    itemW = ctx.measureText(item.text).width;
                }

                const needed = currentLine.length > 0 ? (spaceWidth + itemW) : itemW;

                if (currentLineWidth + needed > maxLineWidth && currentLine.length > 0) {
                    lines.push({ items: currentLine, width: currentLineWidth });
                    currentLine = [{ ...item, width: itemW }];
                    currentLineWidth = itemW;
                } else {
                    currentLine.push({ ...item, width: itemW });
                    currentLineWidth += needed;
                }
            }

            if (currentLine.length > 0) {
                lines.push({ items: currentLine, width: currentLineWidth });
            }

            const blockH = lines.length * lineHeight;
            wrappedBlocks.push({ type: 'text', lines, height: blockH });
        }

        // محاسبه ارتفاع کل
        let totalContentHeight = 0;
        for (const wb of wrappedBlocks) {
            totalContentHeight += wb.height;
        }
        totalContentHeight = Math.max(totalContentHeight, 80);

        const cardLogicalHeight = headerHeight + totalContentHeight + bottomPadding;
        const totalLogicalHeight = cardLogicalHeight + (outerPadding * 2);
        const totalLogicalWidth = cardLogicalWidth + (outerPadding * 2);

        canvas.width = totalLogicalWidth * scale;
        canvas.height = totalLogicalHeight * scale;
        canvas.style.width = totalLogicalWidth + 'px';
        canvas.style.height = totalLogicalHeight + 'px';

        ctx.save();
        ctx.scale(scale, scale);

        // ۱. گرادیانت بیرونی
        const grad = ctx.createLinearGradient(0, 0, totalLogicalWidth, totalLogicalHeight);
        grad.addColorStop(0, palette.bgOuter1);
        grad.addColorStop(1, palette.bgOuter2);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, totalLogicalWidth, totalLogicalHeight);

        // ۲. کادر داخلی کارت
        const cardX = outerPadding;
        const cardY = outerPadding;
        const cardW = cardLogicalWidth;
        const cardH = cardLogicalHeight;
        const cardRadius = 14;

        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 26;
        ctx.shadowOffsetY = 12;

        ctx.fillStyle = palette.cardBg;
        roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = palette.border;
        roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
        ctx.stroke();

        // ۳. هدر کارت و دکمه‌های پنجره (ویندوز یا مک)
        const headerCenterY = cardY + (headerHeight / 2);
        const badgeW = 98;
        const badgeH = 24;
        const badgeY = cardY + ((headerHeight - badgeH) / 2);

        if (effectiveStyle === 'windows') {
            // دکمه‌های کنترل پنجره ویندوز ۱۱ در سمت راست
            const winControlsWidth = 26 * 3;
            drawWindowsControls(ctx, cardX + cardW - 16 - winControlsWidth, headerCenterY, palette);

            // بج RTL View در سمت چپ هدر
            const badgeX = cardX + 20;
            ctx.fillStyle = palette.accentBg;
            roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 6);
            ctx.fill();

            ctx.font = '600 11.5px "Vazirmatn", sans-serif';
            ctx.fillStyle = palette.accent;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('RTL View ✦', badgeX + (badgeW / 2), badgeY + (badgeH / 2));
        } else {
            // سه نقطه مک‌او‌اس در سمت چپ هدر
            drawMacControls(ctx, cardX + 24, headerCenterY);

            // بج RTL View در سمت راست هدر
            const badgeX = cardX + cardW - 20 - badgeW;
            ctx.fillStyle = palette.accentBg;
            roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 6);
            ctx.fill();

            ctx.font = '600 11.5px "Vazirmatn", sans-serif';
            ctx.fillStyle = palette.accent;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('RTL View ✦', badgeX + (badgeW / 2), badgeY + (badgeH / 2));
        }

        // خط جداکننده زیر هدر
        ctx.strokeStyle = palette.border;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cardX, cardY + headerHeight);
        ctx.lineTo(cardX + cardW, cardY + headerHeight);
        ctx.stroke();

        // ۴. رسم خطوط محتوا با بج‌های کدهای درون‌خطی و فونت مونو
        let curY = cardY + headerHeight + 14;
        const rightMargin = cardX + cardW - innerPaddingX;
        const leftMargin = cardX + innerPaddingX;

        for (const wb of wrappedBlocks) {
            if (wb.type === 'empty') {
                curY += wb.height;
                continue;
            }

            if (wb.type === 'table') {
                // رسم بلوک جدول
                const tablePadding = 12;
                const tableW = cardW - (innerPaddingX * 2);
                ctx.fillStyle = palette.tableBg;
                roundRect(ctx, leftMargin, curY, tableW, wb.height - 8, 6);
                ctx.fill();

                ctx.strokeStyle = palette.border;
                ctx.lineWidth = 0.8;
                roundRect(ctx, leftMargin, curY, tableW, wb.height - 8, 6);
                ctx.stroke();

                ctx.font = '500 12.5px Consolas, monospace';
                ctx.fillStyle = palette.text;
                ctx.direction = 'ltr';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';

                let tY = curY + tablePadding;
                for (const tline of wb.textLines) {
                    ctx.fillText(tline, leftMargin + tablePadding, tY);
                    tY += 20;
                }

                curY += wb.height;
                continue;
            }

            // رسم خطوط متنی
            for (const line of wb.lines) {
                // بررسی اینکه آیا خط کاملاً انگلیسی است یا متن فارسی دارد
                const fullLineText = line.items.map(i => i.text).join(' ');
                const isLineRtl = hasPersian(fullLineText);

                if (isLineRtl) {
                    // جریان راست‌به‌چپ (RTL) - متن از حاشیه راست شروع می‌شود
                    let curX = rightMargin;

                    for (const item of line.items) {
                        if (item.isCode) {
                            // بج کد درون‌خطی
                            const badgeH = 23;
                            const badgeY = curY + ((lineHeight - badgeH) / 2) - 3;
                            const badgeX = curX - item.width;

                            ctx.fillStyle = palette.codeBg;
                            roundRect(ctx, badgeX, badgeY, item.width, badgeH, 5);
                            ctx.fill();

                            ctx.strokeStyle = palette.codeBorder;
                            ctx.lineWidth = 1;
                            roundRect(ctx, badgeX, badgeY, item.width, badgeH, 5);
                            ctx.stroke();

                            ctx.font = codeFont;
                            ctx.fillStyle = palette.codeColor;
                            ctx.direction = 'ltr';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(item.text, badgeX + (item.width / 2), badgeY + (badgeH / 2));

                            curX -= item.width + spaceWidth;
                        } else {
                            // کلمه متنی فارسی
                            ctx.font = textFont;
                            ctx.fillStyle = palette.text;
                            ctx.direction = 'rtl';
                            ctx.textAlign = 'right';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(item.text, curX, curY + (lineHeight / 2) - 2);

                            curX -= item.width + spaceWidth;
                        }
                    }
                } else {
                    // خط کاملاً انگلیسی (مثلاً لینک‌ها یا کدهای مستقل)
                    let curX = leftMargin;

                    for (const item of line.items) {
                        if (item.isCode) {
                            const badgeH = 23;
                            const badgeY = curY + ((lineHeight - badgeH) / 2) - 3;
                            const badgeX = curX;

                            ctx.fillStyle = palette.codeBg;
                            roundRect(ctx, badgeX, badgeY, item.width, badgeH, 5);
                            ctx.fill();

                            ctx.strokeStyle = palette.codeBorder;
                            ctx.lineWidth = 1;
                            roundRect(ctx, badgeX, badgeY, item.width, badgeH, 5);
                            ctx.stroke();

                            ctx.font = codeFont;
                            ctx.fillStyle = palette.codeColor;
                            ctx.direction = 'ltr';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(item.text, badgeX + (item.width / 2), badgeY + (badgeH / 2));

                            curX += item.width + spaceWidth;
                        } else {
                            ctx.font = textFont;
                            ctx.fillStyle = palette.text;
                            ctx.direction = 'ltr';
                            ctx.textAlign = 'left';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(item.text, curX, curY + (lineHeight / 2) - 2);

                            curX += item.width + spaceWidth;
                        }
                    }
                }

                curY += lineHeight;
            }
        }

        ctx.restore();
    }

    /**
     * کپی تصویر کارت به کلیپ‌بورد
     */
    async function copyToClipboard(canvas) {
        if (!canvas) throw new Error('Canvas not found');

        return new Promise((resolve, reject) => {
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    reject(new Error('Failed to create image blob'));
                    return;
                }
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    resolve(true);
                } catch (err) {
                    reject(err);
                }
            }, 'image/png');
        });
    }

    /**
     * دانلود تصویر کارت به عنوان فایل PNG
     */
    function downloadImage(canvas, filename = 'rtl-view-card.png') {
        if (!canvas) return;
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    window.CardExporter = {
        renderCard,
        copyToClipboard,
        downloadImage,
        THEME_PALETTES
    };

})(window);
