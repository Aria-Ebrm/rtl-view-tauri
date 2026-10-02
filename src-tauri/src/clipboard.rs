use std::thread::sleep;
use std::time::Duration;

#[cfg(target_os = "windows")]
use windows_sys::Win32::System::DataExchange::GetClipboardSequenceNumber;
#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
    GetAsyncKeyState, MapVirtualKeyW, SendInput, INPUT, INPUT_0, INPUT_KEYBOARD, KEYBDINPUT,
    KEYEVENTF_EXTENDEDKEY, KEYEVENTF_KEYUP, MAPVK_VK_TO_VSC, VK_CONTROL, VK_LCONTROL, VK_LMENU,
    VK_LSHIFT, VK_LWIN, VK_MENU, VK_RCONTROL, VK_RMENU, VK_RSHIFT, VK_RWIN, VK_SHIFT,
};

/// آزادسازی کامل تمامی کلیدهای مادیفایر و کاراکتری که ممکن است فشرده باشند
#[cfg(target_os = "windows")]
fn release_all_modifiers() {
    unsafe {
        let modifier_vks: [(u16, bool); 14] = [
            (VK_MENU, false),
            (VK_LMENU, false),
            (VK_RMENU, true),
            (VK_CONTROL, false),
            (VK_LCONTROL, false),
            (VK_RCONTROL, true),
            (VK_SHIFT, false),
            (VK_LSHIFT, false),
            (VK_RSHIFT, true),
            (VK_LWIN, true),
            (VK_RWIN, true),
            (0x46, false), // 'F'
            (0x52, false), // 'R'
            (0x43, false), // 'C'
        ];

        let mut release_inputs = Vec::new();
        for &(vk, is_extended) in &modifier_vks {
            if (GetAsyncKeyState(vk as i32) as u16 & 0x8000) != 0 {
                let scan = MapVirtualKeyW(vk as u32, MAPVK_VK_TO_VSC) as u16;
                let mut flags = KEYEVENTF_KEYUP;
                if is_extended {
                    flags |= KEYEVENTF_EXTENDEDKEY;
                }
                release_inputs.push(INPUT {
                    r#type: INPUT_KEYBOARD,
                    Anonymous: INPUT_0 {
                        ki: KEYBDINPUT {
                            wVk: vk,
                            wScan: scan,
                            dwFlags: flags,
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

/// انتظار هوشمند تا زمانی که کاربر کلیدهای فیزیکی میانبر را رها کند
#[cfg(target_os = "windows")]
fn wait_for_physical_keys_release() {
    unsafe {
        let start = std::time::Instant::now();
        // حداکثر تا ۲۵۰ میلی‌ثانیه صبر می‌کنیم تا کاربر کلیدها را رها کند
        while start.elapsed() < Duration::from_millis(250) {
            let alt_down = (GetAsyncKeyState(VK_MENU as i32) as u16 & 0x8000) != 0;
            let ctrl_down = (GetAsyncKeyState(VK_CONTROL as i32) as u16 & 0x8000) != 0;
            let shift_down = (GetAsyncKeyState(VK_SHIFT as i32) as u16 & 0x8000) != 0;
            let win_down = (GetAsyncKeyState(VK_LWIN as i32) as u16 & 0x8000) != 0
                || (GetAsyncKeyState(VK_RWIN as i32) as u16 & 0x8000) != 0;

            if !alt_down && !ctrl_down && !shift_down && !win_down {
                break;
            }
            sleep(Duration::from_millis(10));
        }

        // آزادسازی نرم‌افزاری تمام مادیفایرهای احتمالی
        release_all_modifiers();
        sleep(Duration::from_millis(15));
    }
}

/// ارسال یک رویداد فشردن یا رهاسازی کلید با مدیریت فلگ‌های افزونه و اسکن سخت‌افزاری
#[cfg(target_os = "windows")]
fn send_key_event(vk: u16, keyup: bool) {
    unsafe {
        let scan = MapVirtualKeyW(vk as u32, MAPVK_VK_TO_VSC) as u16;
        let flags = if keyup { KEYEVENTF_KEYUP } else { 0 };
        let mut input = [INPUT {
            r#type: INPUT_KEYBOARD,
            Anonymous: INPUT_0 {
                ki: KEYBDINPUT {
                    wVk: vk,
                    wScan: scan,
                    dwFlags: flags,
                    time: 0,
                    dwExtraInfo: 0,
                },
            },
        }];
        SendInput(1, input.as_mut_ptr(), std::mem::size_of::<INPUT>() as i32);
    }
}

/// شبیه‌سازی فشار دادن میانبر Ctrl+C در سیستم‌عامل با توالی زمانی مطمئن
pub fn simulate_copy() {
    #[cfg(target_os = "windows")]
    {
        // 1. ابتدا منتظر رها شدن کلیدهای میانبر توسط کاربر می‌مانیم
        wait_for_physical_keys_release();

        // 2. ارسال Ctrl Down
        send_key_event(VK_CONTROL, false);
        sleep(Duration::from_millis(15));

        // 3. ارسال C Down
        send_key_event(0x43, false);
        sleep(Duration::from_millis(20));

        // 4. ارسال C Up
        send_key_event(0x43, true);
        sleep(Duration::from_millis(15));

        // 5. ارسال Ctrl Up
        send_key_event(VK_CONTROL, true);
        sleep(Duration::from_millis(15));
    }
}

/// خواندن محتوای کلیپ‌بورد همراه با راستی‌آزمایی توالی جهت دریافت قطعی متن تازه
pub fn capture_selected_content() -> (String, bool) {
    #[cfg(target_os = "windows")]
    {
        let initial_seq = unsafe { GetClipboardSequenceNumber() };

        // 1. شبیه‌سازی فشردن Ctrl+C
        simulate_copy();

        // 2. انتظار هوشمند پویا با پایش GetClipboardSequenceNumber
        // به محض اینکه برنامه مقصد متن جدید را در کلیپ‌بورد قرار دهد شماره توالی تغییر می‌کند
        let mut new_content_copied = false;
        for _ in 0..25 {
            sleep(Duration::from_millis(15));
            let current_seq = unsafe { GetClipboardSequenceNumber() };
            if current_seq != initial_seq {
                new_content_copied = true;
                break;
            }
        }

        // تلاش مجدد در صورت تغییر نکردن توالی (مثلاً اگر برنامه مقصد نیاز به زمان بیشتری داشت)
        if !new_content_copied {
            release_all_modifiers();
            sleep(Duration::from_millis(20));
            send_key_event(VK_CONTROL, false);
            sleep(Duration::from_millis(15));
            send_key_event(0x43, false);
            sleep(Duration::from_millis(20));
            send_key_event(0x43, true);
            sleep(Duration::from_millis(15));
            send_key_event(VK_CONTROL, true);
            sleep(Duration::from_millis(15));

            for _ in 0..20 {
                sleep(Duration::from_millis(15));
                let current_seq = unsafe { GetClipboardSequenceNumber() };
                if current_seq != initial_seq {
                    new_content_copied = true;
                    break;
                }
            }
        }

        // 3. اگر متن جدیدی در کلیپ‌بورد قرار گرفت، با مکانیزم بازتلاش جهت باز شدن قفل کلیپ‌بورد آن را می‌خوانیم
        if new_content_copied {
            for _ in 0..6 {
                if let Ok(mut clipboard) = arboard::Clipboard::new() {
                    if let Ok(text) = clipboard.get_text() {
                        if !text.trim().is_empty() {
                            return (text, false);
                        }
                    }
                }
                sleep(Duration::from_millis(15));
            }
        }

        // اگر کپی جدیدی رخ نداد، هرگز محتوای سلکت قبلی را به اشتباه نشان نمی‌دهیم
        ("".to_string(), false)
    }

    #[cfg(not(target_os = "windows"))]
    {
        sleep(Duration::from_millis(120));
        if let Ok(mut clipboard) = arboard::Clipboard::new() {
            if let Ok(text) = clipboard.get_text() {
                if !text.trim().is_empty() {
                    return (text, false);
                }
            }
        }
        ("".to_string(), false)
    }
}
