// تعامل امن با Tauri v2 API
const contentBody = document.getElementById('content-body');
const charCount = document.getElementById('char-count');
const btnClose = document.getElementById('btn-close');
const btnCopy = document.getElementById('btn-copy');

function toPersianDigits(num) {
    const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().replace(/\d/g, x => farsiDigits[x]);
}

function updateView(data) {
    if (!data) return;
    contentBody.innerHTML = data.html || '';
    const len = data.visible_length || 0;
    charCount.textContent = `${toPersianDigits(len)} کاراکتر`;
}

// بستن پنجره با ارسال پیام به بک‌اند Rust
async function closePopup() {
    try {
        if (window.__TAURI__ && window.__TAURI__.core) {
            await window.__TAURI__.core.invoke('hide_window');
        } else {
            window.close();
        }
    } catch (err) {
        console.error('Failed to hide window:', err);
    }
}

// بستن با کلید Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closePopup();
    }
});

btnClose.addEventListener('click', closePopup);

// کپی محتوای نمایش داده شده
btnCopy.addEventListener('click', async () => {
    try {
        const text = contentBody.innerText;
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(text);
            const orig = btnCopy.textContent;
            btnCopy.textContent = 'کپی شد ✔';
            setTimeout(() => btnCopy.textContent = orig, 1500);
        }
    } catch (e) {
        console.error('Copy failed:', e);
    }
});

// شنود رویداد دریافت متن جدید از بک‌اند Rust
if (window.__TAURI__ && window.__TAURI__.event) {
    window.__TAURI__.event.listen('new-content', (event) => {
        updateView(event.payload);
    });
}

// خواندن محتوا در بارگذاری اولیه پنجره
window.addEventListener('DOMContentLoaded', async () => {
    try {
        if (window.__TAURI__ && window.__TAURI__.core) {
            const initial = await window.__TAURI__.core.invoke('get_current_content');
            updateView(initial);
        }
    } catch (e) {
        console.warn('Initial content fetch error:', e);
    }
});
