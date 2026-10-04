<div align="center">

```
██████  ████████ ██          ██    ██ ██ ███████ ██     ██ 
██   ██    ██    ██          ██    ██ ██ ██      ██     ██ 
██████     ██    ██          ██    ██ ██ █████   ██  █  ██ 
██   ██    ██    ██           ██  ██  ██ ██      ██ ███ ██ 
██   ██    ██    ███████       ████   ██ ███████  ███ ███  
```

### RTL VIEW
**Ultra-fast, native bidirectional text inspector & Persian typography engine**  
*نمایشگر فوق‌سریع و بومی متون راست‌چین و ویراستار زبان فارسی*

<p align="center">
  <a href="https://github.com/Aria-Ebrm/rtl-view-tauri/releases/latest">
    <img src="https://img.shields.io/badge/Download-Windows%20Setup%20(.exe)-0070f3?style=for-the-badge&logo=windows&logoColor=white" alt="Download Windows">
  </a>
  <a href="https://github.com/Aria-Ebrm/rtl-view-tauri/releases/latest">
    <img src="https://img.shields.io/badge/Download-macOS%20(.dmg)-171717?style=for-the-badge&logo=apple&logoColor=white" alt="Download macOS">
  </a>
  <a href="https://github.com/Aria-Ebrm/rtl-view-tauri/releases/latest">
    <img src="https://img.shields.io/badge/Download-Linux%20(.AppImage)-FCC624?style=for-the-badge&logo=linux&logoColor=black" alt="Download Linux">
  </a>
</p>

<p align="center">
  <a href="https://github.com/Aria-Ebrm/rtl-view-tauri/actions/workflows/release.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/Aria-Ebrm/rtl-view-tauri/release.yml?style=flat-square&logo=github&label=Release%20CI" alt="CI Status">
  </a>
  <a href="https://github.com/Aria-Ebrm/rtl-view-tauri/releases/latest">
    <img src="https://img.shields.io/badge/Release-v2.3.8-0070f3?style=flat-square&logo=github" alt="Latest Release">
  </a>
  <a href="https://github.com/Aria-Ebrm/rtl-view-tauri/releases">
    <img src="https://img.shields.io/github/downloads/Aria-Ebrm/rtl-view-tauri/total?style=flat-square&color=171717&label=Downloads" alt="Downloads">
  </a>
  <img src="https://img.shields.io/badge/Tests-182%20Passing-success?style=flat-square&logo=checkmarx" alt="182 Automated Tests Passing">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-8.x-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Tauri-v2-24C8DB?style=flat-square&logo=tauri&logoColor=white" alt="Tauri v2">
  <img src="https://img.shields.io/badge/Rust-1.80+-DEA584?style=flat-square&logo=rust&logoColor=white" alt="Rust">
  <img src="https://img.shields.io/badge/Design-Geist%20UI-000000?style=flat-square&logo=vercel&logoColor=white" alt="Geist UI">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Cold%20Start-%3C5ms-00dfd8?style=flat-square" alt="Cold Start">
  <img src="https://img.shields.io/badge/Memory-~28MB-00dfd8?style=flat-square" alt="Memory">
  <img src="https://img.shields.io/badge/License-MIT-171717?style=flat-square" alt="License">
</p>

<p align="center">
  یک ابزار دسکتاپ مدرن، سبک و با سطح بهینه‌سازی بالا برای بازرسی، نمایش و فرمت‌بندی استاندارد متون دوجهته (BiDi) و فارسی با یک کلید میانبر سراسری در تمام محیط‌های سیستم‌عامل.
</p>

</div>

---

> [!TIP]
> **کلید میانبر سراسری (Global Shortcut): `Ctrl + Alt + F`**  
> در هر برنامه‌ای (مرورگر وب، محیط برنامه‌نویسی، تلگرام، آفیس و...) هر متنی را انتخاب کرده و کلیدهای `Ctrl + Alt + F` را فشار دهید. پنجره پاپ‌آپ در کمتر از ۵ میلی‌ثانیه باز شده و متن را با جهت‌گیری درست، فونت متغیر وزیرمتن و ویراستاری نیم‌فاصله‌ها نمایش می‌دهد.

---

### `01 // DOWNLOAD MATRIX`
#### دریافت مستقیم آخرین نسخه پایدار (v2.3.8)

تمامی باینری‌ها توسط خط لوله خودکار GitHub Actions با فلگ‌های بهینه‌سازی `opt-level = 3` و `lto = true` کامپایل شده‌اند:

| سیستم‌عامل | معماری | فرمت پکیج | حجم تقریبی | لینک دانلود مستقیم |
| :--- | :--- | :--- | :--- | :--- |
| **Windows** | x64 (64-bit) | `.exe` (NSIS Setup خودکار سبک) | ~۱.۸ MB | [**دانلود نصاب خودکار Setup.exe**](https://github.com/Aria-Ebrm/rtl-view-tauri/releases/download/v2.3.8/RTL.View_2.3.8_x64-setup.exe) |
| **Windows** | x64 (64-bit) | `.msi` (Windows Installer سازمانی) | ~۲.۶ MB | [دانلود پکیج سازمانی MSI](https://github.com/Aria-Ebrm/rtl-view-tauri/releases/download/v2.3.8/RTL.View_2.3.8_x64_en-US.msi) |
| **macOS** | Universal (Intel & Apple Silicon M1-M4) | `.dmg` | ~۴.۹ MB | [دانلود دیسک ایمیج DMG](https://github.com/Aria-Ebrm/rtl-view-tauri/releases/download/v2.3.8/RTL.View_2.3.8_universal.dmg) |
| **Linux** | x86_64 | `.deb` (Debian / Ubuntu / Mint) | ~۳.۱ MB | [دانلود پکیج دبیان DEB](https://github.com/Aria-Ebrm/rtl-view-tauri/releases/download/v2.3.8/RTL.View_2.3.8_amd64.deb) |
| **Linux** | x86_64 | `.AppImage` (پرتابل مستقل) | ~۷۸ MB | [دانلود نسخه مستقل AppImage](https://github.com/Aria-Ebrm/rtl-view-tauri/releases/download/v2.3.8/RTL.View_2.3.8_amd64.AppImage) |

> برای مشاهده چک‌سام‌های امنیتی SHA-256 و سایر فرمت‌ها، به [صفحه انتشارهای گیت‌هاب (Releases)](https://github.com/Aria-Ebrm/rtl-view-tauri/releases/latest) مراجعه کنید.

---

### `02 // CORE PILLARS`
#### قابلیت‌های مهندسی‌شده

#### 1. موتور ویراستار و تصحیح نیم‌فاصله (Persian Typographic Pipeline)
- **اصلاح هوشمند نیم‌فاصله (ZWNJ):**
  - پیشوندهای فعل: «می» و «نمی» (`می‌روم`، `نمی‌شود`)
  - پیشوند نفی «بی»: (`بی‌نهایت`، `بی‌شک`)
  - پسوندهای جمع: «ها»، «های»، «هایی»، «هایم» (`فایل‌ها`، `برنامه‌های`)
  - پسوندهای تفضیلی: «تر» و «ترین» (`سریع‌تر`، `بهترین`)
  - پسوندهای ضمیری متصل بعد از های غیرملفوظ: (`جامه‌ام`، `خانه‌ات`)
- **تبدیل استاندارد علائم نگارشی:** اصلاح خودکار علامت سوال (`?` به `؟`)، ویرگول (`،`) و گیومه‌های فارسی (`« »`).
- **تبدیل دوطرفه ارقام:** تغییر آنی اعداد انگلیسی به فارسی و بالعکس با دکمه `۱۲۳ ↔ 123`.
- **دکمه کپی پاکیزه (Clean Copy):** استخراج متن ویراستاری‌شده با حفظ ساختار پاراگراف‌ها جهت پیست تمیز در اسناد.

#### 2. استودیوی تولید کارت تصویری (Social Card Studio)
- **خروجی با وضوح بالا (Retina 2x):** رندر کارت‌های اشتراک‌گذاری برای تلگرام، توییتر و لینکدین با تراکم پیکسلی دو برابر.
- **تزیینات بومی پنجره سیستم‌عامل:** امکان انتخاب کنترل‌های مینیمال ویندوز ۱۱ (`― ▢ ✕`) یا مک‌او‌اس (`● ● ●`).
- **رندر دقیق المان‌های فنی:** فرمت‌بندی خودکار قطعه‌کدهای درون‌خطی با فونت مونو، جداول و نقل‌قول‌ها بدون تداخل BiDi.
- **کپی مستقیم عکس در کلیپ‌بورد:** امکان پیست مستقیم تصویر کارت (`Ctrl + V`) در پیام‌رسان‌ها بدون نیاز به ذخیره فایل روی دیسک.

#### 3. طراحی مینیمال بر پایه سیستم Geist ورسل (Design System)
- **نوار عنوان سفارشی بدون فریم (Frameless Titlebar):** حذف قاب پیش‌فرض سیستم‌عامل، تعبیه دکمه‌های کنترلی مینیمال Lucide SVG (`― ▢ ✕`) و منوی همبرگری مدرن.
- **منوی همبرگری و خلوت‌سازی نوار ابزار:** انتقال منوی تم‌ها به داخل منوی همبرگری و امکان فعال/غیرفعال‌سازی گزینشی تک‌تک دکمه‌های نوار ابزار (کارت عکس، کپی پاکیزه، ویراستار، اعداد و...).
- **تنظیمات ترِی متحرک و بومی (Animated Tray Settings):** جایگزینی منوی کلاسیک با مدال تنظیمات زیبا، مجهز به انیمیشن‌های روان ورسل و تایپوگرافی چشم‌نواز وزیرمتن.
- حاشیه‌های مویرگی ۱ پیکسلی (`#242424` / `#ebebeb`) و انحناهای گوشه استاندارد اپلیکیشن (`6px`).
- ۵ تم رنگی باکنتراست بالا: **Zinc Dark**، **One Dark**، **Dracula**، **Gruvbox** و **Clean Light**.

#### 4. کارایی بومی، نصب مدرن و ابزار تعمیر (Zero-Overhead, Modern Installer & Repair)
- **نصاب خودکار سبک سبک‌بال (Discord-style Installer):** نصب در سطح کاربر بدون درخواست ادمین (UAC) در پوشه محلی با شورت‌کات‌های خودکار.
- **ابزار بازیابی و تعمیر داخلی (One-Click Repair & Reset):** بازنشانی سریع تنظیمات به حالت اولیه و پاکسازی کش بدون نیاز به نصب مجدد.
- **تغییر داینامیک کلید میانبر سراسری:** امکان تغییر کلید میانبر `Ctrl + Alt + F` به کلیدهای دلخواه بدون راه‌اندازی مجدد برنامه.
- پیاده‌سازی شده با **Rust** و **Tauri v2** با مصرف رم کمتر از **۲۸ مگابایت** و خط لوله امنیتی ضد نفوذ **Ammonia**.

---

### `03 // KEYBOARD SHORTCUTS`
#### کلیدهای میانبر سریع

| میانبر | حوزه عملکرد | توضیح |
| :--- | :--- | :--- |
| `Ctrl + Alt + F` | سراسری (Global) | خواندن متن انتخاب‌شده و باز کردن پنجره شناور RTL View |
| `Esc` | درون برنامه | بستن مدال کارت تصویری یا پنهان‌سازی پنجره به System Tray |
| `Ctrl + +` / `Ctrl + =` | درون برنامه | افزایش مقیاس فونت متن |
| `Ctrl + -` | درون برنامه | کاهش مقیاس فونت متن |
| `Ctrl + 0` | درون برنامه | بازنشانی اندازه فونت به حالت پیش‌فرض (۱۶ پیکسل) |

---

### `04 // BENCHMARKS & VERIFICATION`
#### نتایج باتری آزمون‌های فشار و کارایی

کلیه عملکردهای برنامه تحت باتری ۱۷۹ موردی تست‌های خودکار (Unit, Integration & Stress) ارزیابی شده‌اند:

```
✔ Tier 1: Core Engine Specification (Markdown, BiDi, Virastar)
✔ Tier 2: Boundary & Corner Cases (Extreme Unicode, ZWNJ sequences)
✔ Tier 3: Cross-Feature Interactions (Tables + Code + RTL text)
✔ Tier 4: Real-World Workload Scenarios (Tech jargon, 5,000+ lines)
✔ Tier 5: Adversarial Stress Battery (100k+ chars, <50ms processing)

Tests:  179 passed (100%)
Time:   ~2.9s
Memory: Bounded heap (<80MB under 1MB text load)
```

---

### `05 // DEVELOPMENT & BUILD`
#### راهنمای توسعه محلی

برای کامپایل و توسعه روی سیستم خود:

```bash
# ۱. کلون کردن مخزن
git clone https://github.com/Aria-Ebrm/rtl-view-tauri.git
cd rtl-view-tauri

# ۲. نصب وابستگی‌های فرانت‌اند
npm install

# ۳. اجرای تست‌های خودکار
npm test

# ۴. اجرای برنامه در حالت توسعه (Live Reload)
npm run dev

# ۵. کامپایل نهایی نسخه محلی
npm run build
```

---

### `06 // PRIVACY & SECURITY`
#### بیانیه حریم خصوصی و امنیت داده‌ها

> [!IMPORTANT]
> **تعهد به حریم خصوصی ۱۰۰٪ محلی:**
> - برنامه RTL View فاقد هرگونه تله‌متری، ترکر، آنالیتیکس یا ارتباط شبکه‌ای به سرورهای ثالث است.
> - محتوای کلیپ‌بورد صرفاً در حافظه موقت (RAM) سیستم پردازش شده و پس از بسته شدن پنجره آزاد می‌گردد.
> - تمامی خروجی‌های متن و HTML توسط استانداردهای امنیتی Content Security Policy (CSP) و کتابخانه ammonia در هسته Rust محافظت می‌شوند.

---

### `07 // LICENSE`
این پروژه تحت مجوز متن‌باز **[MIT License](LICENSE)** منتشر شده و توسعه آن برای تمام افراد آزاد است.
