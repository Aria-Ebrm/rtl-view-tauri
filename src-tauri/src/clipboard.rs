use std::sync::atomic::{AtomicBool, Ordering};
use std::thread::sleep;
use std::time::Duration;

/// گارد اتمیک برای جلوگیری از اجرای هم‌زمان میانبر و تداخل شبیه‌سازی کلیدها
static CAPTURING: AtomicBool = AtomicBool::new(false);

pub struct CaptureGuard;

impl Drop for CaptureGuard {
    fn drop(&mut self) {
        CAPTURING.store(false, Ordering::SeqCst);
    }
}

/// تلاش برای تصاحب حق انحصاری عکس‌برداری/کپچر کلیپ‌بورد.
/// در صورت مشغول بودن، مقدار None بازمی‌گردد تا تکرار سریع Ctrl+Alt+F کلیدهای مصنوعی را تداخل ندهد.
pub fn try_acquire_capture() -> Option<CaptureGuard> {
    if CAPTURING
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_ok()
    {
        Some(CaptureGuard)
    } else {
        None
    }
}

/// شبیه‌سازی فشار دادن میانبر Ctrl+C در سیستم‌عامل
pub fn simulate_copy() {
    #[cfg(target_os = "windows")]
    {
        use std::mem::size_of;
        use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
            SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT, KEYEVENTF_KEYUP, VK_CONTROL, VK_MENU,
        };

        const VK_C: u16 = 0x43;

        unsafe {
            // ابتدا کلیدهای فشرده‌شده Alt و Ctrl آزاد می‌شوند تا ارسال Ctrl+C تداخل نداشته باشد
            let mut release_modifiers = [
                INPUT {
                    r#type: INPUT_KEYBOARD,
                    Anonymous: INPUT_0 {
                        ki: KEYBDINPUT {
                            wVk: VK_MENU,
                            wScan: 0,
                            dwFlags: KEYEVENTF_KEYUP,
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                },
                INPUT {
                    r#type: INPUT_KEYBOARD,
                    Anonymous: INPUT_0 {
                        ki: KEYBDINPUT {
                            wVk: VK_CONTROL,
                            wScan: 0,
                            dwFlags: KEYEVENTF_KEYUP,
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                },
            ];
            SendInput(release_modifiers.len() as u32, release_modifiers.as_mut_ptr(), size_of::<INPUT>() as i32);

            // وقفه اندک برای پردازش رها شدن کلیدهای میانبر در صف پیام‌های سیستم‌عامل
            sleep(Duration::from_millis(10));
            let mut inputs = [
                // Ctrl Down
                INPUT {
                    r#type: INPUT_KEYBOARD,
                    Anonymous: INPUT_0 {
                        ki: KEYBDINPUT {
                            wVk: VK_CONTROL,
                            wScan: 0,
                            dwFlags: 0,
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                },
                // C Down
                INPUT {
                    r#type: INPUT_KEYBOARD,
                    Anonymous: INPUT_0 {
                        ki: KEYBDINPUT {
                            wVk: VK_C,
                            wScan: 0,
                            dwFlags: 0,
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                },
                // C Up
                INPUT {
                    r#type: INPUT_KEYBOARD,
                    Anonymous: INPUT_0 {
                        ki: KEYBDINPUT {
                            wVk: VK_C,
                            wScan: 0,
                            dwFlags: KEYEVENTF_KEYUP,
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                },
                // Ctrl Up
                INPUT {
                    r#type: INPUT_KEYBOARD,
                    Anonymous: INPUT_0 {
                        ki: KEYBDINPUT {
                            wVk: VK_CONTROL,
                            wScan: 0,
                            dwFlags: KEYEVENTF_KEYUP,
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                },
            ];

            SendInput(inputs.len() as u32, inputs.as_mut_ptr(), size_of::<INPUT>() as i32);
        }
    }
}

/// خواندن محتوای کلیپ‌بورد همراه با مکانیزم Retry و Backoff برای حل مشکل قفل موقت کلیپ‌بورد ویندوز
pub fn capture_selected_content() -> (String, bool) {
    // 1. شبیه‌سازی فشردن Ctrl+C
    simulate_copy();

    // 2. تلاش مجدد چندباره با Exponential Backoff جهت مقابله با Lock Contention کلیپ‌بورد
    const MAX_RETRIES: usize = 5;
    let mut delay = Duration::from_millis(15);

    for attempt in 0..MAX_RETRIES {
        sleep(delay);

        if let Ok(mut clipboard) = arboard::Clipboard::new() {
            if let Ok(html) = clipboard.get_html() {
                if !html.is_empty() {
                    return (html, true);
                }
            }
            if let Ok(text) = clipboard.get_text() {
                if !text.is_empty() || attempt >= 2 {
                    return (text, false);
                }
            }
        }

        delay = (delay * 2).min(Duration::from_millis(50));
    }

    ("".to_string(), false)
}
