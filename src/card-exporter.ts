/**
 * Card Exporter for RTL View - TypeScript Version
 * Generates beautiful, high-resolution (Retina 2x) social media cards
 * formatted with Vazirmatn font, theme palettes, inline code badges,
 * and adaptive OS window decorations (Windows 11 or macOS).
 */

import type { ThemePalette, BlockToken, LineToken, CardExporterOptions } from './types';

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
        if (!str) return '';
        return str
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ');
    }

    function stripHtmlTags(str) {
        if (!str) return '';
        return str.replace(/<[^>]*>/g, '');
    }

    const RTL_REGEX = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u07BF\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u200F\u2067]/;
    const LTR_REGEX = /[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02B8\u0370-\u03FF\u0400-\u04FF\u200E\u2066]/;

    /**
     * Determines base paragraph/line direction using Unicode Bidirectional Algorithm
     * (UAX #9 rules P2/P3: based on the first strong directional character).
     */
    function getBaseDirection(text) {
        if (!text) return 'ltr';
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (RTL_REGEX.test(ch)) return 'rtl';
            if (LTR_REGEX.test(ch)) return 'ltr';
        }
        return 'ltr';
    }

    function isRtlLine(text) {
        return getBaseDirection(text) === 'rtl';
    }

    function hasPersian(text) {
        return /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text || '');
    }

    /**
     * تفکیک یک خط به کلمات معمولی و کدهای درون‌خطی با حذف تمام تگ‌های غیرکد HTML
     */
    function parseLineTokens(htmlLine) {
        if (!htmlLine) return [];
        const tokens: any[] = [];
        // شناسایی تگ‌های code
        const codeRegex = /<code[^>]*>([\s\S]*?)<\/code>/gi;
        let lastIndex = 0;
        let match;

        while ((match = codeRegex.exec(htmlLine)) !== null) {
            const before = htmlLine.substring(lastIndex, match.index);
            if (before) {
                const cleanedBefore = stripHtmlTags(before);
                if (cleanedBefore) {
                    tokens.push({ isCode: false, text: decodeHtml(cleanedBefore) });
                }
            }
            const codeVal = decodeHtml(stripHtmlTags(match[1]));
            if (codeVal) {
                tokens.push({ isCode: true, text: codeVal });
            }
            lastIndex = codeRegex.lastIndex;
        }

        if (lastIndex < htmlLine.length) {
            const after = htmlLine.substring(lastIndex);
            if (after) {
                const cleanedAfter = stripHtmlTags(after);
                if (cleanedAfter) {
                    tokens.push({ isCode: false, text: decodeHtml(cleanedAfter) });
                }
            }
        }

        // تجزیه بخش‌های متنی معمولی به کلمات برای Wrap صحیح بدون تغییر ماهیت متن
        const atomicItems = [];
        for (const tok of tokens) {
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
     * استخراج بلوک‌ها از منبع HTML پنجره با حذف تگ‌های زائد
     */
    function extractBlocks(htmlSource) {
        const blocks: any[] = [];
        if (!htmlSource) return blocks;

        let container;
        if (typeof document !== 'undefined' && document.createElement) {
            container = document.createElement('div');
            container.innerHTML = htmlSource;
        }

        const children = (container && container.children) ? Array.from(container.children) : [];
        if (children.length === 0) {
            // متن ساده
            const textContent = container ? (container.innerText || container.textContent || htmlSource) : htmlSource;
            const lines = textContent.split(/\r?\n/);
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) {
                    blocks.push({ type: 'empty' });
                } else {
                    blocks.push({ type: 'text', items: parseLineTokens(line) });
                }
            }
            return blocks;
        }

        for (const el of (children as any[])) {
            if (el && el.classList && (el.classList.contains('table-block') || el.classList.contains('code-block'))) {
                blocks.push({
                    type: 'table',
                    text: el.innerText || el.textContent || ''
                });
            } else {
                // بلوک متنی یا پاراگراف
                const rawHtml = el.innerHTML || el.innerText || el.textContent || '';
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
     * تقسیم توکن‌های یکپارچه و بسیار طویل به قطعات کوچکتری که از عرض خط تجاوز نکنند
     */
    function splitOversizedItem(item, ctx, font, maxW) {
        ctx.font = font;
        const padding = item.isCode ? 14 : 0;
        const fullW = ctx.measureText(item.text).width + padding;
        if (fullW <= maxW || item.text.length <= 1) {
            return [{ ...item, width: fullW }];
        }

        const subItems = [];
        const chars: string[] = Array.from(String(item.text || ''));
        let curStr = '';

        for (let i = 0; i < chars.length; i++) {
            const nextStr = curStr + chars[i];
            const nextW = ctx.measureText(nextStr).width + padding;
            if (nextW > maxW && curStr.length > 0) {
                const curW = ctx.measureText(curStr).width + padding;
                subItems.push({ isCode: item.isCode, text: curStr, width: curW });
                curStr = chars[i];
            } else {
                curStr = nextStr;
            }
        }
        if (curStr.length > 0) {
            const curW = ctx.measureText(curStr).width + padding;
            subItems.push({ isCode: item.isCode, text: curStr, width: curW });
        }
        return subItems;
    }

    /**
     * رندر کامل کارت روی Canvas با وضوح بالا
     */
    async function renderCard(canvas, htmlSource, themeName = 'zinc', windowStyle = 'auto') {
        if (!canvas) return;

        // انتظار برای لود کامل فونت‌ها جهت جلوگیری از محاسبه ابعاد نادرست
        if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
            try {
                await document.fonts.ready;
            } catch (_) {
                // در صورت بروز خطا در لود فونت، با فونت‌های سیستم ادامه می‌یابد
            }
        }

        const palette = THEME_PALETTES[themeName] || THEME_PALETTES.zinc;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const scale = 2; // کیفیت بالای Retina

        // تشخیص سیستم‌عامل در حالت auto
        let effectiveStyle = windowStyle;
        if (effectiveStyle === 'auto') {
            const isMac = (typeof navigator !== 'undefined') && /Macintosh|Mac OS X|iPhone|iPad/.test(navigator.userAgent);
            effectiveStyle = isMac ? 'mac' : 'windows';
        }

        const cardLogicalWidth = 760;
        const outerPadding = 36;
        const innerPaddingX = 32;
        const headerHeight = 46;
        const footerHeight = 32;
        const maxLineWidth = 500; // عرض استاندارد ستون متن برای خوانایی بهینه و جلوگیری از سرریز

        // سقف ابعاد مجاز برای جلوگیری از خطای بافر GPU و کرش کرومیوم در متون حجیم
        const maxLogicalHeight = 4096; // حداکثر ارتفاع فیزیکی ۸۱۹۲ در مقیاس رتینا ۲
        const maxContentHeight = maxLogicalHeight - (outerPadding * 2) - headerHeight - footerHeight - 12;

        const textFontSize = 16.5;
        const textFont = `450 ${textFontSize}px "Vazirmatn", -apple-system, BlinkMacSystemFont, sans-serif`;
        const codeFontSize = 13.5;
        const codeFont = `550 ${codeFontSize}px Consolas, "Courier New", monospace`;
        const lineHeight = 36;
        const truncatedNoticeText = '... [متن ادامه دارد]';
        const truncationNoticeHeight = lineHeight;

        // آماده‌سازی بلوک‌های محتوا
        const blocks = extractBlocks(htmlSource);

        // ۱. محاسبه چیدمان و ارتفاع مورد نیاز برای خطوط
        ctx.font = textFont;
        const spaceWidth = ctx.measureText(' ').width;

        const wrappedBlocks: any[] = [];
        let accumulatedContentHeight = 0;
        let isTruncated = false;

        for (const b of blocks) {
            if (accumulatedContentHeight + lineHeight + truncationNoticeHeight > maxContentHeight) {
                isTruncated = true;
                break;
            }

            if (b.type === 'empty') {
                const h = 16;
                if (accumulatedContentHeight + h + truncationNoticeHeight > maxContentHeight) {
                    isTruncated = true;
                    break;
                }
                wrappedBlocks.push({ type: 'empty', height: h });
                accumulatedContentHeight += h;
                continue;
            }

            if (b.type === 'table') {
                const lines = b.text.split('\n');
                const tableH = (lines.length * 20) + 24;
                if (accumulatedContentHeight + tableH + truncationNoticeHeight > maxContentHeight) {
                    const allowedLines = Math.max(1, Math.floor((maxContentHeight - accumulatedContentHeight - 24 - truncationNoticeHeight) / 20));
                    if (allowedLines < lines.length) {
                        const truncatedLines = lines.slice(0, allowedLines);
                        truncatedLines.push('... [ادامه جدول کوتاه شد]');
                        const partialH = (truncatedLines.length * 20) + 24;
                        wrappedBlocks.push({ type: 'table', textLines: truncatedLines, height: partialH });
                        accumulatedContentHeight += partialH;
                        isTruncated = true;
                        break;
                    }
                }
                wrappedBlocks.push({ type: 'table', textLines: lines, height: tableH });
                accumulatedContentHeight += tableH;
                continue;
            }

            // بلوک متنی با آیتم‌ها
            const lines: any[] = [];
            let currentLine: any[] = [];
            let currentLineWidth = 0;

            // تفکیک توکن‌های بیش‌از‌حد عریض
            const processedItems = [];
            for (const item of b.items) {
                const font = item.isCode ? codeFont : textFont;
                const subs = splitOversizedItem(item, ctx, font, maxLineWidth);
                for (const sub of subs) {
                    processedItems.push(sub);
                }
            }

            let blockTruncated = false;
            for (const item of processedItems) {
                const itemW = item.width;
                const needed = currentLine.length > 0 ? (spaceWidth + itemW) : itemW;

                if (currentLineWidth + needed > maxLineWidth && currentLine.length > 0) {
                    if (accumulatedContentHeight + lineHeight + truncationNoticeHeight > maxContentHeight) {
                        blockTruncated = true;
                        isTruncated = true;
                        break;
                    }
                    lines.push({ items: currentLine, width: currentLineWidth });
                    accumulatedContentHeight += lineHeight;
                    currentLine = [{ ...item, width: itemW }];
                    currentLineWidth = itemW;
                } else {
                    currentLine.push({ ...item, width: itemW });
                    currentLineWidth += needed;
                }
            }

            if (blockTruncated) {
                if (lines.length > 0) {
                    const blockH = lines.length * lineHeight;
                    wrappedBlocks.push({ type: 'text', lines, height: blockH });
                }
                break;
            }

            if (currentLine.length > 0) {
                if (accumulatedContentHeight + lineHeight + truncationNoticeHeight > maxContentHeight) {
                    isTruncated = true;
                } else {
                    lines.push({ items: currentLine, width: currentLineWidth });
                    accumulatedContentHeight += lineHeight;
                }
            }

            if (lines.length > 0) {
                const blockH = lines.length * lineHeight;
                wrappedBlocks.push({ type: 'text', lines, height: blockH });
            }

            if (isTruncated) {
                break;
            }
        }

        if (isTruncated) {
            wrappedBlocks.push({
                type: 'text',
                isTruncationNotice: true,
                lines: [{
                    items: [{ isCode: false, text: truncatedNoticeText }],
                    width: 0
                }],
                height: truncationNoticeHeight
            });
            accumulatedContentHeight += truncationNoticeHeight;
        }

        // محاسبه ارتفاع کل
        let totalContentHeight = 0;
        for (const wb of wrappedBlocks) {
            totalContentHeight += wb.height;
        }
        totalContentHeight = Math.max(totalContentHeight, 80);

        const cardLogicalHeight = headerHeight + totalContentHeight + footerHeight + 12;
        const totalLogicalHeight = Math.min(cardLogicalHeight + (outerPadding * 2), maxLogicalHeight);
        const totalLogicalWidth = cardLogicalWidth + (outerPadding * 2);

        canvas.width = totalLogicalWidth * scale;
        canvas.height = totalLogicalHeight * scale;
        canvas.style.width = totalLogicalWidth + 'px';
        canvas.style.height = totalLogicalHeight + 'px';

        ctx.save();
        ctx.scale(scale, scale);

        // پاکسازی کامل بافر تصویر قبلی برای جلوگیری از نشت حافظه
        ctx.clearRect(0, 0, totalLogicalWidth, totalLogicalHeight);

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

            if (wb.isTruncationNotice) {
                ctx.font = 'italic 500 13px "Vazirmatn", sans-serif';
                ctx.fillStyle = palette.muted;
                ctx.direction = 'rtl';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(truncatedNoticeText, cardX + (cardW / 2), curY + (lineHeight / 2) - 2);
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

                // کلیپ کردن محتوا داخل کادر جدول برای جلوگیری از سرریز
                ctx.save();
                ctx.beginPath();
                roundRect(ctx, leftMargin, curY, tableW, wb.height - 8, 6);
                ctx.clip();

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
                ctx.restore();

                curY += wb.height;
                continue;
            }

            // رسم خطوط متنی
            for (const line of wb.lines) {
                // جهت پایه خط بر اساس استاندارد یونی‌کد P2/P3 (اولین کاراکتر جهت‌دار قوی)
                const fullLineText = line.items.map(i => i.text).join(' ');
                const isLineRtl = isRtlLine(fullLineText);

                // تجمیع کلمات متوالی غیرکد به یک رشته واحد برای تضمین اجرای کامل الگوریتم BiDi
                const runs = [];
                let currentWords = [];

                for (const item of line.items) {
                    if (item.isCode) {
                        if (currentWords.length > 0) {
                            const joined = currentWords.join(' ');
                            ctx.font = textFont;
                            runs.push({ isCode: false, text: joined, width: ctx.measureText(joined).width });
                            currentWords = [];
                        }
                        runs.push(item);
                    } else {
                        currentWords.push(item.text);
                    }
                }
                if (currentWords.length > 0) {
                    const joined = currentWords.join(' ');
                    ctx.font = textFont;
                    runs.push({ isCode: false, text: joined, width: ctx.measureText(joined).width });
                }

                if (isLineRtl) {
                    // جریان راست‌به‌چپ (RTL) - متن از حاشیه راست شروع می‌شود
                    let curX = rightMargin;

                    for (let rIdx = 0; rIdx < runs.length; rIdx++) {
                        const run = runs[rIdx];
                        if (run.isCode) {
                            // بج کد درون‌خطی
                            const badgeH = 23;
                            const badgeY = curY + ((lineHeight - badgeH) / 2) - 3;
                            const badgeX = curX - run.width;

                            ctx.fillStyle = palette.codeBg;
                            roundRect(ctx, badgeX, badgeY, run.width, badgeH, 5);
                            ctx.fill();

                            ctx.strokeStyle = palette.codeBorder;
                            ctx.lineWidth = 1;
                            roundRect(ctx, badgeX, badgeY, run.width, badgeH, 5);
                            ctx.stroke();

                            ctx.font = codeFont;
                            ctx.fillStyle = palette.codeColor;
                            ctx.direction = 'ltr';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(run.text, badgeX + (run.width / 2), badgeY + (badgeH / 2));

                            curX -= run.width;
                            if (rIdx < runs.length - 1) {
                                curX -= spaceWidth;
                            }
                        } else {
                            // رشته متنی پیوسته فارسی/انگلیسی با اجرای صحیح BiDi توسط سیستم‌عامل
                            ctx.font = textFont;
                            ctx.fillStyle = palette.text;
                            ctx.direction = 'rtl';
                            ctx.textAlign = 'right';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(run.text, curX, curY + (lineHeight / 2) - 2);

                            curX -= run.width;
                            if (rIdx < runs.length - 1) {
                                curX -= spaceWidth;
                            }
                        }
                    }
                } else {
                    // خط کاملاً چپ‌به‌راست (مانند خطوط کد، لینک‌ها، یا انگلیسی با کامنت فارسی)
                    let curX = leftMargin;

                    for (let rIdx = 0; rIdx < runs.length; rIdx++) {
                        const run = runs[rIdx];
                        if (run.isCode) {
                            const badgeH = 23;
                            const badgeY = curY + ((lineHeight - badgeH) / 2) - 3;
                            const badgeX = curX;

                            ctx.fillStyle = palette.codeBg;
                            roundRect(ctx, badgeX, badgeY, run.width, badgeH, 5);
                            ctx.fill();

                            ctx.strokeStyle = palette.codeBorder;
                            ctx.lineWidth = 1;
                            roundRect(ctx, badgeX, badgeY, run.width, badgeH, 5);
                            ctx.stroke();

                            ctx.font = codeFont;
                            ctx.fillStyle = palette.codeColor;
                            ctx.direction = 'ltr';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(run.text, badgeX + (run.width / 2), badgeY + (badgeH / 2));

                            curX += run.width;
                            if (rIdx < runs.length - 1) {
                                curX += spaceWidth;
                            }
                        } else {
                            ctx.font = textFont;
                            ctx.fillStyle = palette.text;
                            ctx.direction = 'ltr';
                            ctx.textAlign = 'left';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(run.text, curX, curY + (lineHeight / 2) - 2);

                            curX += run.width;
                            if (rIdx < runs.length - 1) {
                                curX += spaceWidth;
                            }
                        }
                    }
                }

                curY += lineHeight;
            }
        }

        // ۵. فوتر کارت (نمایشگر راست‌چین هوشمند)
        const footerY = cardY + cardH - footerHeight;
        ctx.strokeStyle = palette.border;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(cardX + 24, footerY);
        ctx.lineTo(cardX + cardW - 24, footerY);
        ctx.stroke();

        ctx.font = '400 11.5px "Vazirmatn", sans-serif';
        ctx.fillStyle = palette.muted;
        ctx.direction = 'rtl';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText('نمایشگر راست‌چین هوشمند', cardX + cardW - 24, footerY + (footerHeight / 2));

        ctx.restore();
    }

    /**
     * رندر کارت فعال روی بوم متصل به DOM
     */
    async function renderActiveCard() {
        if (typeof document === 'undefined') return;
        const canvas = document.getElementById('card-canvas');
        const contentBody = document.getElementById('content-body');
        if (!canvas || !contentBody) return;
        const theme = (typeof (window as any).currentTheme !== 'undefined' ? (window as any).currentTheme : 'zinc');
        const style = (typeof (window as any).currentWindowStyle !== 'undefined' ? (window as any).currentWindowStyle : 'auto');
        return await renderCard(canvas, contentBody.innerHTML, theme, style);
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
                    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
                        await navigator.clipboard.write([
                            new ClipboardItem({ 'image/png': blob })
                        ]);
                        resolve(true);
                    } else {
                        reject(new Error('Clipboard API not available'));
                    }
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
        link.href = '';
    }

export const CardExporter = {
    renderCard,
    renderActiveCard,
    copyToClipboard,
    downloadImage,
    extractBlocks,
    parseLineTokens,
    THEME_PALETTES,
    hasPersian,
    getBaseDirection,
    isRtlLine
};

if (typeof window !== 'undefined') {
    (window as any).CardExporter = CardExporter;
}
if (typeof globalThis !== 'undefined') {
    (globalThis as any).CardExporter = CardExporter;
}
if (typeof (globalThis as any).module !== 'undefined' && (globalThis as any).module.exports) {
    (globalThis as any).module.exports = { CardExporter, ...CardExporter };
}

export default CardExporter;
