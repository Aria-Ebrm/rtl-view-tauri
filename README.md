<div align="center">

# 📐 RTL View (نسخه Rust + Tauri v2)

### نمایشگر فوق‌سریع و هوشمند متون راست‌چین و ویراستار زبان فارسی

<p align="center">
  <a href="https://github.com/Aria-Ebrm/rtl-view-tauri/actions/workflows/release.yml">
    <img src="https://github.com/Aria-Ebrm/rtl-view-tauri/actions/workflows/release.yml/badge.svg" alt="CI/CD Build">
  </a>
  <a href="https://github.com/Aria-Ebrm/rtl-view-tauri/releases/latest">
    <img src="https://img.shields.io/github/v/release/Aria-Ebrm/rtl-view-tauri?style=flat-square&color=fbbf24&label=Latest%20Release&logo=github" alt="Latest Release">
  </a>
  <a href="https://github.com/Aria-Ebrm/rtl-view-tauri/releases">
    <img src="https://img.shields.io/github/downloads/Aria-Ebrm/rtl-view-tauri/total?style=flat-square&color=38bdf8&label=Downloads&logo=github" alt="Downloads">
  </a>
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-10b981?style=flat-square&logo=windows&logoColor=white" alt="Platforms">
  <img src="https://img.shields.io/badge/Built%20With-Rust%20%26%20Tauri%20v2-orange?style=flat-square&logo=rust&logoColor=white" alt="Rust & Tauri">
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License">
</p>

<p align="center">
  یک ابزار کم‌حجم، سریع، امن و چندسکویی برای نمایش فوری و استاندارد متون راست‌چین (RTL) با فشار دادن یک کلید میانبر سراسری در هر کجای سیستم‌عامل.
</p>

</div>

---

> [!TIP]
> **کلید میانبر سراسری (Global Shortcut):**  
> کافیست در هر برنامه‌ای (مرورگر، تلگرام، ادیتور کد، اسناد ورد و...) متن دلخواه را انتخاب کنید و کلیدهای **`Ctrl + Alt + F`** را فشار دهید. پنجره برنامه در کسری از میلی‌ثانیه باز شده و متن را با فرمت درست، فونت متغیر وزیرمتن و ویراستاری دقیق نمایش می‌دهد.

> [!NOTE]
> **بدون نیاز به نصب پیش‌نیاز:**  
> این برنامه به طور کامل با **Rust** و **Tauri v2** بازنویسی شده است. پایتون، اتوهات‌کی یا فریم‌ورک‌های سنگین به کلی حذف شده‌اند و مصرف رم برنامه تنها در حدود **۲۸ الی ۳۰ مگابایت** است.

---

## ✨ امکانات و قابلیت‌های برجسته | Features

### 🖋️ ۱. ویراستار و نگارش هوشمند فارسی
- **اصلاح خودکار نیم‌فاصله‌ها (ZWNJ):**
  - پیشوندهای «می» و «نمی» (`می‌روم`، `نمی‌دانم`)
  - پیشوند نفی «بی» (`بی‌شک`، `بی‌نهایت`)
  - پسوندهای جمع «ها»، «های»، «هایی»، «هایم» (`کتاب‌ها`، `پنجره‌های`)
  - پسوندهای تفضیلی «تر» و «ترین» (`سریع‌تر`، `زیباترین`)
  - پسوندهای ضمیری متصل بعد از «ه» (`خانه‌ام`، `جامه‌ات`)
- **اصلاح علائم نگارشی:** تبدیل علامت سوال انگلیسی `?` به `؟`، ویرگول `,` به `،`، و گیومه‌های انگلیسی `""` به گیومه فارسی `« »`.
- **سوییچ ارقام فارسی/انگلیسی:** دکمه سوییچ لحظه‌ای ارقام (`۱۲۳ ↔ 123`).
- **دکمه «کپی تمیز» (Clean Copy 📋):** کپی متن اصلاح‌شده و مرتب به کلیپ‌بورد برای استفاده آسان در آفیس یا تلگرام.

### 🖼️ ۲. مولد کارت تصویری شبکه‌های اجتماعی (Social Card Exporter)
- تبدیل آنی متن نمایش‌داده‌شده به یک کارت تصویری جذاب با وضوح بسیار بالای **Retina (2x)**.
- رندر کامل بج‌های کد (`Consolas`)، جداول، فونت متغیر وزیرمتن و پس‌زمینه گرادیانت هماهنگ با تم فعال.
- **پشتیبانی از استایل ویندوز ۱۱ و مک‌او‌اس:**
  - دکمه‌های کنترل پنجره مدرن ویندوز ۱۱ (`― ▢ ✕`) در سمت راست، یا کنترل‌های سه‌نقطه مک در سمت چپ.
- **کپی مستقیم در کلیپ‌بورد:** ارسال مستقیم عکس به کلیپ‌بورد با ۱ کلیک جهت پیست فوری (`Ctrl + V`) در تلگرام یا توییتر بدون نیاز به ذخیره فایل روی هارد دیسک.

### 🎨 ۳. شخصی‌سازی تم‌ها و فونت
- پشتیبانی از ۵ تم محبوب توسعه‌دهندگان:
  - **Zinc Dark** (تاریک عمیق با زرد کهربایی)
  - **One Dark** (تم محبوب Atom و VS Code)
  - **Dracula** (تم مشهور نئونی بنفش و سبز فسفری)
  - **Gruvbox** (تم خاکی و رترو)
  - **Clean Light** (تم روشن مینیمال برای محیط‌های پرنور)
- کنترل اندازه قلم با دکمه‌های `A+` / `A-` یا کلیدهای `Ctrl + +` و `Ctrl + -`.
- ذخیره‌سازی خودکار تنظیمات کاربر در حافظه سیستم (`localStorage`).

### 📌 ۴. سنجاق پنجره و نوار وظیفه (System Tray)
- **دکمه سنجاق 📌 (Always on Top):** قفل کردن پنجره در بالاترین لایه سیستم‌عامل.
- **منوی آیکون کنار ساعت:** فعال‌سازی اجرای خودکار هنگام روشن شدن کامپیوتر (Auto Start)، نمایش راهنما و خروج کامل.
- پنهان‌سازی پنجره با کلید **`Esc`** بدون اشغال فضای تسک‌بار.

---

## 📥 دریافت آخرین نسخه | Download

برای دانلود پکیج متناسب با سیستم‌عامل خود می‌توانید از جدول زیر یا صفحه [GitHub Releases](https://github.com/Aria-Ebrm/rtl-view-tauri/releases/latest) استفاده کنید:

| سیستم‌عامل | نوع فایل | لینک دانلود مستقیم | توضیحات |
| :--- | :--- | :--- | :--- |
| **🪟 Windows** | `.exe` (NSIS) | [دانلود نسخه نصابی Setup](https://github.com/Aria-Ebrm/rtl-view-tauri/releases/latest) | نصاب خودکار با آیکون دسکتاپ و منوی استارت |
| **🪟 Windows** | `.msi` | [دانلود پکیج سازمانی MSI](https://github.com/Aria-Ebrm/rtl-view-tauri/releases/latest) | مناسب سازمان‌ها و استقرار شبکه‌ای |
| **🍎 macOS** | `.dmg` | [دانلود نسخه Universal DMG](https://github.com/Aria-Ebrm/rtl-view-tauri/releases/latest) | پشتیبانی همزمان از پردازنده‌های اینتل و اپل سیلیکون (M1/M2/M3/M4) |
| **🐧 Linux** | `.deb` | [دانلود پکیج دبیان / اوبونتو](https://github.com/Aria-Ebrm/rtl-view-tauri/releases/latest) | مناسب Ubuntu, Debian, Mint و توزیع‌های مبتنی بر dpkg |
| **🐧 Linux** | `.AppImage` | [دانلود نسخه پرتابل AppImage](https://github.com/Aria-Ebrm/rtl-view-tauri/releases/latest) | اجرای پرتابل در تمامی توزیع‌های لینوکس بدون نیاز به نصب |

---

<details>
<summary><b>⌨️ جدول کلیدهای میانبر (Shortcuts Cheatsheet)</b></summary>

| کلید میانبر | عملکرد |
| :--- | :--- |
| `Ctrl + Alt + F` | فراخوانی سراسری و نمایش پاپ‌آپ راست‌چین در هر برنامه‌ای |
| `Esc` | پنهان‌سازی پنجره یا بستن مدال کارت تصویری |
| `Ctrl + +` یا `Ctrl + =` | افزایش اندازه قلم |
| `Ctrl + -` | کاهش اندازه قلم |
| `Ctrl + 0` | بازنشانی اندازه قلم به مقدار پیش‌فرض |

</details>

<details>
<summary><b>💻 راهنمای توسعه‌دهندگان و بیلد محلی (Developer Guide)</b></summary>

اگر مایل به توسعه یا کامپایل پروژه روی سیستم خود هستید:

```bash
# ۱. کلون کردن مخزن
git clone https://github.com/Aria-Ebrm/rtl-view-tauri.git
cd rtl-view-tauri

# ۲. نصب وابستگی‌ها
npm install

# ۳. اجرای حالت توسعه (Dev Mode)
npm run dev

# ۴. بیلد محلی نسخه پروداکشن
npm run build
```

> تمامی خروجی‌های رسمی توسط **GitHub Actions** به صورت ابری و موازی برای هر ۳ پلتفرم کامپایل می‌شوند.

</details>

---

## 🛡️ امنیت و حریم خصوصی | Security

> [!IMPORTANT]
> - برنامه به هیچ وجه اطلاعات کپی‌شده یا متون کاربر را به سرور خارجی ارسال نمی‌کند؛ پردازش به صورت **۱۰۰٪ آفلاین و محلی** روی سیستم شما انجام می‌شود.
> - متون و محتوای HTML کپی‌شده پیش از رندر توسط موتور ضد نفوذ **Ammonia** در هسته Rust پاک‌سازی می‌شوند تا هرگونه اسکریپت یا تگ ناامن حذف گردد.
> - سیاست‌های امنیتی مرورگر (Content Security Policy - CSP) به همراه کنترل تفکیک‌شده مجوزهای Tauri v2 روی پنجره فعال هستند.

---

## 🤝 مشارکت و بازخورد | Contributing

اگر پیشنهادی برای زیباتر شدن برنامه، افزودن فونت‌های دیگر، یا گزارش باگ دارید:
- یک [Issue جدید در گیت‌هاب](https://github.com/Aria-Ebrm/rtl-view-tauri/issues) باز کنید.
- یا با ارسال یک Pull Request در توسعه برنامه سهیم شوید.

اگر این برنامه برای شما مفید بوده است، با دادن یک **ستاره (Star ⭐)** در بالای صفحه از این پروژه متن‌باز حمایت کنید!

---

## 📄 مجوز | License
این پروژه به صورت متن‌باز تحت مجوز **[MIT License](LICENSE)** منتشر شده است.
