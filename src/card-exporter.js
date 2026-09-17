/**
 * Card Exporter for RTL View
 * Generates beautiful, high-resolution (Retina 2x) social media cards
 * formatted with Vazirmatn font, theme palettes, and macOS-style window decorations.
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

    function wrapTextLines(ctx, text, maxWidth) {
        const paragraphs = text.split('\n');
        const lines = [];

        for (const para of paragraphs) {
            const trimmed = para.trim();
            if (!trimmed) {
                lines.push(''); // خط خالی برای حفظ پاراگراف
                continue;
            }

            const words = trimmed.split(' ');
            let currentLine = '';

            for (let i = 0; i < words.length; i++) {
                const word = words[i];
                const testLine = currentLine ? currentLine + ' ' + word : word;
                const metrics = ctx.measureText(testLine);

                if (metrics.width > maxWidth && currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            }

            if (currentLine) {
                lines.push(currentLine);
            }
        }

        return lines;
    }

    function isRtlText(text) {
        // بررسی وجود کاراکترهای فارسی / عربی
        return /[\u0600-\u06FF]/.test(text);
    }

    /**
     * رندر کارت روی Canvas مشخص
     */
    function renderCard(canvas, text, themeName = 'zinc') {
        if (!canvas) return;

        const palette = THEME_PALETTES[themeName] || THEME_PALETTES.zinc;
        const ctx = canvas.getContext('2d');
        const scale = 2; // وضوح بالا برای رتینا

        const cardLogicalWidth = 740;
        const outerPadding = 36;
        const innerPaddingX = 36;
        const headerHeight = 44;
        const footerHeight = 40;
        const fontSize = 21;
        const lineHeight = 36;

        // محاسبه خطوط متن
        ctx.font = `450 ${fontSize}px "Vazirmatn", -apple-system, BlinkMacSystemFont, sans-serif`;
        const maxTextWidth = cardLogicalWidth - (innerPaddingX * 2);
        const lines = wrapTextLines(ctx, text, maxTextWidth);

        // محاسبه ارتفاع کل کارت
        const textContentHeight = Math.max(lines.length * lineHeight, lineHeight * 2);
        const cardLogicalHeight = headerHeight + textContentHeight + footerHeight + 20;
        const totalLogicalHeight = cardLogicalHeight + (outerPadding * 2);
        const totalLogicalWidth = cardLogicalWidth + (outerPadding * 2);

        canvas.width = totalLogicalWidth * scale;
        canvas.height = totalLogicalHeight * scale;
        canvas.style.width = totalLogicalWidth + 'px';
        canvas.style.height = totalLogicalHeight + 'px';

        ctx.save();
        ctx.scale(scale, scale);

        // ۱. گرادیانت جذاب پس‌زمینه بیرونی
        const grad = ctx.createLinearGradient(0, 0, totalLogicalWidth, totalLogicalHeight);
        grad.addColorStop(0, palette.bgOuter1);
        grad.addColorStop(1, palette.bgOuter2);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, totalLogicalWidth, totalLogicalHeight);

        // ۲. کادر داخلی کارت با سایه نرم
        const cardX = outerPadding;
        const cardY = outerPadding;
        const cardW = cardLogicalWidth;
        const cardH = cardLogicalHeight;
        const cardRadius = 14;

        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 12;

        ctx.fillStyle = palette.cardBg;
        roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
        ctx.fill();

        // بازنشانی سایه و رسم حاشیه
        ctx.shadowColor = 'transparent';
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = palette.border;
        roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
        ctx.stroke();

        // ۳. هدر کارت (کنترل‌های پنجره macOS و نشان)
        const dotRadius = 5.5;
        const dotY = cardY + 22;
        const dotStartX = cardX + 24;

        // دکمه قرمز
        ctx.fillStyle = '#ff5f56';
        ctx.beginPath();
        ctx.arc(dotStartX, dotY, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        // دکمه زرد
        ctx.fillStyle = '#ffbd2e';
        ctx.beginPath();
        ctx.arc(dotStartX + 16, dotY, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        // دکمه سبز
        ctx.fillStyle = '#27c93f';
        ctx.beginPath();
        ctx.arc(dotStartX + 32, dotY, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        // بج لوگوی RTL View در گوشه راست هدر
        const badgeW = 95;
        const badgeH = 24;
        const badgeX = cardX + cardW - 24 - badgeW;
        const badgeY = cardY + 10;

        ctx.fillStyle = palette.accentBg;
        roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 6);
        ctx.fill();

        ctx.font = '600 11.5px "Vazirmatn", sans-serif';
        ctx.fillStyle = palette.accent;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('RTL View ✦', badgeX + (badgeW / 2), badgeY + (badgeH / 2));

        // خط جداکننده زیر هدر
        ctx.strokeStyle = palette.border;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cardX, cardY + headerHeight);
        ctx.lineTo(cardX + cardW, cardY + headerHeight);
        ctx.stroke();

        // ۴. رسم خطوط متن
        ctx.font = `450 ${fontSize}px "Vazirmatn", -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = palette.text;
        ctx.textBaseline = 'top';

        let currentY = cardY + headerHeight + 16;

        for (const line of lines) {
            if (!line) {
                currentY += lineHeight * 0.6;
                continue;
            }

            const rtl = isRtlText(line);
            if (rtl) {
                ctx.direction = 'rtl';
                ctx.textAlign = 'right';
                const textX = cardX + cardW - innerPaddingX;
                ctx.fillText(line, textX, currentY);
            } else {
                ctx.direction = 'ltr';
                ctx.textAlign = 'left';
                const textX = cardX + innerPaddingX;
                ctx.fillText(line, textX, currentY);
            }

            currentY += lineHeight;
        }

        // ۵. فوتر کارت
        const footerY = cardY + cardH - footerHeight;
        ctx.strokeStyle = palette.border;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cardX + 20, footerY);
        ctx.lineTo(cardX + cardW - 20, footerY);
        ctx.stroke();

        ctx.font = '400 11.5px "Vazirmatn", sans-serif';
        ctx.fillStyle = palette.muted;
        ctx.textBaseline = 'middle';

        // سمت راست فوتر (فارسی)
        ctx.direction = 'rtl';
        ctx.textAlign = 'right';
        ctx.fillText('نمایشگر راست‌چین هوشمند', cardX + cardW - 24, footerY + (footerHeight / 2));

        // سمت چپ فوتر (انگلیسی)
        ctx.direction = 'ltr';
        ctx.textAlign = 'left';
        ctx.fillText('vazirmatn variable font', cardX + 24, footerY + (footerHeight / 2));

        ctx.restore();
    }

    /**
     * کپی مستقیم تصویر کارت به کلیپ‌بورد سیستم
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
