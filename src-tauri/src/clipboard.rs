use std::thread::sleep;
use std::time::Duration;

#[cfg(target_os = "windows")]
use windows_sys::Win32::System::DataExchange::GetClipboardSequenceNumber;
#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
    GetAsyncKeyState, MapVirtualKeyW, SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT,
    KEYEVENTF_KEYUP, MAPVK_VK_TO_VSC, VK_CONTROL, VK_LCONTROL, VK_LMENU, VK_LSHIFT,
    VK_LWIN, VK_MENU, VK_RCONTROL, VK_RMENU, VK_RSHIFT, VK_RWIN, VK_SHIFT,
};

/// آزادسازی کامل تمامی کلیدهای مادیفایر و کاراکتری که کاربر ممکن است در لحظه فشرده باشد
#[cfg(target_os = "windows")]
fn release_all_modifiers() {
    unsafe {
        let modifier_vks = [
            VK_MENU, VK_LMENU, VK_RMENU,
            VK_CONTROL, VK_LCONTROL, VK_RCONTROL,
            VK_SHIFT, VK_LSHIFT, VK_RSHIFT,
            VK_LWIN, VK_RWIN,
            0x46, // 'F'
            0x52, // 'R'
            0x43, // 'C'
        ];

        let mut release_inputs = Vec::new();
        for &vk in &modifier_vks {
            if (GetAsyncKeyState(vk as i32) as u16 & 0x8000) != 0 {
                let scan = MapVirtualKeyW(vk as u32, MAPVK_VK_TO_VSC) as u16;
                release_inputs.push(INPUT {
                    r#type: INPUT_KEYBOARD,
                    Anonymous: INPUT_0 {
                        ki: KEYBDINPUT {
                            wVk: vk,
                            wScan: scan,
                            dwFlags: KEYEVENTF_KEYUP,
                            time: 0,
                            dwExtraInfo: 0,
                        },
                    },
                });
            }
        }

        if !release_inputs.is_empty() {
            SendInput(
                release_inputs.len() as u32,
                release_inputs.as_mut_ptr(),
                std::mem::size_of::<INPUT>() as i32,
            );
        }
    }
}

/// شبیه‌سازی فشار دادن میانبر Ctrl+C در سیستم‌عامل با کدهای اسکن سخت‌افزاری
pub fn simulate_copy() {
    #[cfg(target_os = "windows")]
    {
        use std::mem::size_of;

        unsafe {
            // 1. آزادسازی کلیدهای فیزیکی نگه داشته شده توسط کاربر
            release_all_modifiers();

            // وقفه کوتاه برای پردازش رویدادهای کیبورد در ویندوز
            sleep(Duration::from_millis(35));

            let scan_ctrl = MapVirtualKeyW(VK_CONTROL as u32, MAPVK_VK_TO_VSC) as u16;
            let scan_c = MapVirtualKeyW(0x43 as u32, MAPVK_VK_TO_VSC) as u16;

            let mut inputs = [
                // Ctrl Down
                INPUT {
                    r#type: INPUT_KEYBOARD,
                    Anonymous: INPUT_0 {
                        ki: KEYBDINPUT {
                            wVk: VK_CONTROL,
                            wScan: scan_ctrl,
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
                            wVk: 0x43,
                            wScan: scan_c,
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
                            wVk: 0x43,
                            wScan: scan_c,
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
                            wScan: scan_ctrl,
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

/// خواندن محتوای کلیپ‌بورد همراه با راستی‌آزمایی توالی جهت دریافت قطعی متن تازه
pub fn capture_selected_content() -> (String, bool) {
    #[cfg(target_os = "windows")]
    let initial_seq = unsafe { GetClipboardSequenceNumber() };

    // 1. شبیه‌سازی فشردن Ctrl+C
    simulate_copy();

    // 2. انتظار هوشمند پویا با پایش GetClipboardSequenceNumber
    // به محض اینکه برنامه مقصد متن جدید را در کلیپ‌بورد قرار دهد شماره توالی تغییر می‌کند
    #[cfg(target_os = "windows")]
    {
        for _ in 0..25 {
            sleep(Duration::from_millis(15));
            let current_seq = unsafe { GetClipboardSequenceNumber() };
            if current_seq != initial_seq {
                break;
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    sleep(Duration::from_millis(120));

    // 3. خواندن محتوای تازه از طریق arboard
    if let Ok(mut clipboard) = arboard::Clipboard::new() {
        if let Ok(text) = clipboard.get_text() {
            if !text.trim().is_empty() {
                return (text, false);
            }
        }
    }

    ("".to_string(), false)
}
