# RTL View 📐✨ (Rust + Tauri v2 Edition)

A modern, ultra-lightweight, high-performance, and secure cross-platform desktop popup utility that instantly renders any selected text in a beautiful, right-to-left (RTL) formatted window.

نسخه کاملاً بازنویسی شده با **Rust** و **Tauri v2**؛ بدون نیاز به پایتون یا اتوهات‌کی، با مصرف حافظه ناچیز (کمتر از ۲۰ مگابایت)، سرعت پاسخ‌دهی در حد میکروثانیه و پشتیبانی بومی از ویندوز، لینوکس و مک‌او‌اس.

---

## 🚀 ویژگی‌های کلیدی | Features

- **بک‌اند قدرتمند و امن با Rust:** سرعت و امنیت سطح سیستم با تضمین عدم نشت حافظه (Memory Safety).
- **فوق‌العاده سبک و کم‌مصرف:** حجم فایل اجرایی نهایی کمتر از ۱۰ مگابایت و مصرف رم در حدود ۱۵ الی ۲۰ مگابایت.
- **حذف کامل AutoHotkey و Python:** شنود شورتکات سراسری و کپی متون مستقیماً از طریق APIهای نیتیو سیستم‌عامل.
- **هایلایت هوشمند و حفاظت از علائم نگارشی:** تفکیک هوشمند کلمات انگلیسی، آدرس‌های وب، مسیرهای فایل و کدها همراه با جلوگیری از بی‌نظمی علائم نگارشی متصل به کلمات.
- **نمایش بی‌نقص جدول‌ها:** حفظ ساختار جدول‌های متنی و مارک‌داون در قالب بلوک‌های LTR Monospace.
- **پاک‌سازی امنیتی HTML (Ammonia):** فیلتر سخت‌گیرانه هرگونه اسکریپت یا تگ مخرب در کدهای کپی‌شده.
- **پشتیبانی کامل از استارتاپ ویندوز و تسک‌بار (System Tray):** کنترل کامل برنامه، فعال‌سازی استارتاپ و خروج از طریق منوی آیکون کنار ساعت.
- **خروجی چندسکویی (Cross-Platform):** آماده برای کامپایل روی Windows (.msi, .exe)، Linux (.deb, .AppImage) و macOS (.dmg).

---

## 🛠️ پیش‌نیازهای توسعه | Prerequisites

1. **Rust:** (نصب از طریق `rustup` که روی سیستم فعال شد)
2. **Node.js:** نسخه ۱۸ به بالا
3. **ابزارهای ساخت C++:** مایکروسافت C++ Build Tools (روی ویندوز)

---

## ⚡ نحوه اجرا و توسعه | How to Run

برای اجرای آزمایشی برنامه در محیط توسعه:

```bash
cd rtl-view-tauri
npm install
npm run dev
```

کلید میانبر پیش‌فرض برای نمایش پاپ‌آپ: **`Ctrl + Alt + F`**

---

## 📦 ساخت خروجی نهایی (Build)

### ۱. خروجی ویندوز (محلی)
برای ساخت فایل نصبی NSIS و فایل مستقل پرتابل روی ویندوز:
```powershell
npm run build
```
فایل‌های خروجی در مسیر زیر قرار می‌گیرند:
`src-tauri/target/release/bundle/`

### ۲. اسکریپت بیلد جامع چندسکویی (Cross-Platform Builder)
برای ساخت خودکار ویندوز و لینوکس با یک کلیک:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-all.ps1
```

### ۳. ساخت خودکار برای تمام سیستم‌عامل‌ها با GitHub Actions
این مخزن مجهز به فایل ورک‌فلو `.github/workflows/release.yml` است. با پوش کردن یک تگ (مثلاً `git tag v2.0.0 && git push origin v2.0.0`)، گیت‌هاب سرورهای ابری اختصاصی ویندوز، لینوکس و مک‌او‌اس را اجرا کرده و فایل‌های خروجی زیر را آماده دانلود در تب Releases تحویل می‌دهد:
- **Windows:** `RTL-View_x64-setup.exe` و `.msi`
- **Linux:** `rtl-view_amd64.deb` و `.AppImage`
- **macOS:** `RTL-View_universal.dmg` (Apple Silicon M1/M2/M3/M4 & Intel)

---

## 📄 لایسنس | License
این پروژه به صورت متن‌باز و تحت مجوز **MIT License** منتشر شده است.
