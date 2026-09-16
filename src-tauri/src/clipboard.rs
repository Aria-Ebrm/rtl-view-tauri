use std::thread::sleep;
use std::time::Duration;

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
            let release_modifiers = [
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

            sleep(Duration::from_millis(30));
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

/// خواندن محتوای کلیپ‌بورد همراه با پشتیبانی از فرمت HTML و متن ساده
pub fn capture_selected_content() -> (String, bool) {
    // 1. شبیه‌سازی فشردن Ctrl+C
    simulate_copy();

    // 2. کمی تاخیر برای قرار گرفتن داده در کلیپ‌بورد سیستم
    sleep(Duration::from_millis(120));

    // 3. خواندن از طریق arboard
    if let Ok(mut clipboard) = arboard::Clipboard::new() {
        if let Ok(text) = clipboard.get_text() {
            return (text, false);
        }
    }

    ("".to_string(), false)
}
