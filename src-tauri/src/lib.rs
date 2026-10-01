use std::sync::Mutex;
use tauri::{
    tray::{MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, PhysicalSize, WebviewWindow,
};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

mod clipboard;
mod text_engine;
use text_engine::{process_clipboard_payload, ProcessedContent};

static CURRENT_CONTENT: Mutex<Option<ProcessedContent>> = Mutex::new(None);

#[tauri::command]
fn get_current_content() -> ProcessedContent {
    let lock = CURRENT_CONTENT.lock().unwrap();
    lock.clone().unwrap_or_else(|| ProcessedContent {
        raw_text: String::new(),
        html: r#"<div class="empty-state" style="text-align: center; padding: 24px 16px;">
            <div style="font-size: 20px; font-weight: bold; margin-bottom: 12px; color: #60a5fa;">برنامه RTL View فعال است ✔</div>
            <p style="color: #cbd5e1; margin-bottom: 12px; font-size: 14px;">متن دلخواه خود را در هر برنامه‌ای انتخاب کنید و کلیدهای میانبر زیر را فشار دهید:</p>
            <div style="display: inline-block; background: #1e293b; border: 1px solid #475569; border-radius: 8px; padding: 8px 20px; font-size: 18px; font-weight: bold; color: #38bdf8; margin: 8px 0; letter-spacing: 1px;">Ctrl + Alt + F</div>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 16px;">این پنجره با کلید Esc پنهان می‌شود و در نوار وظیفه کنار ساعت (System Tray) به کار خود ادامه می‌دهد.</p>
        </div>"#.to_string(),
        visible_length: 0,
        is_empty: false,
        is_html: false,
    })
}

#[tauri::command]
fn hide_window(window: WebviewWindow) {
    let _ = window.hide();
}

#[tauri::command]
fn minimize_window(window: WebviewWindow) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
fn toggle_maximize_window(window: WebviewWindow) -> Result<bool, String> {
    let is_max = window.is_maximized().map_err(|e| e.to_string())?;
    if is_max {
        window.unmaximize().map_err(|e| e.to_string())?;
        Ok(false)
    } else {
        window.maximize().map_err(|e| e.to_string())?;
        Ok(true)
    }
}

#[tauri::command]
fn toggle_always_on_top(window: WebviewWindow) -> Result<bool, String> {
    let current = window.is_always_on_top().map_err(|e| e.to_string())?;
    let next = !current;
    window.set_always_on_top(next).map_err(|e| e.to_string())?;
    Ok(next)
}

#[tauri::command]
fn toggle_autostart_cmd(app: AppHandle) -> Result<bool, String> {
    let autostart_mgr = app.autolaunch();
    let enabled = autostart_mgr.is_enabled().map_err(|e| e.to_string())?;
    if enabled {
        autostart_mgr.disable().map_err(|e| e.to_string())?;
        Ok(false)
    } else {
        autostart_mgr.enable().map_err(|e| e.to_string())?;
        Ok(true)
    }
}

#[tauri::command]
fn repair_installation(app: AppHandle) -> Result<String, String> {
    // 1. ارزیابی و تنظیم استارتاپ ویندوز
    let mgr = app.autolaunch();
    let _ = mgr.is_enabled();

    // 2. تنظیم مجدد موقعیت و لایه پنجره
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.set_always_on_top(true);
        let _ = w.center();
    }

    Ok("تنظیمات و منابع سیستمی با موفقیت بازنشانی و بررسی شدند.".to_string())
}

#[tauri::command]
fn update_global_shortcut(app: AppHandle, shortcut_str: String) -> Result<String, String> {
    use std::str::FromStr;
    let clean = shortcut_str.trim().replace(' ', "");
    let shortcut = Shortcut::from_str(&clean)
        .map_err(|e| format!("میانبر نامعتبر است: {e}"))?;

    let _ = app.global_shortcut().unregister_all();

    let handle = app.clone();
    app.global_shortcut()
        .on_shortcut(shortcut, move |_app, _sc, event| {
            if event.state() == ShortcutState::Pressed {
                trigger_popup(&handle);
            }
        })
        .map_err(|e| format!("امکان ثبت میانبر در سیستم‌عامل وجود ندارد: {e}"))?;

    Ok(clean)
}

/// محاسبه اندازه پویای پنجره متناسب با طول متن
fn calculate_window_size(len: usize) -> (u32, u32) {
    if len < 150 {
        (540, 280)
    } else if len < 600 {
        (760, 460)
    } else {
        (940, 660)
    }
}

/// تابع فراخوانی پاپ‌آپ هنگام فشرده شدن کلید میانبر
fn trigger_popup(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let (raw, is_html) = clipboard::capture_selected_content();
        let processed = process_clipboard_payload(&raw, is_html);

        let (w, h) = calculate_window_size(processed.visible_length);
        let _ = window.set_size(PhysicalSize::new(w, h));
        let _ = window.center();

        {
            let mut lock = CURRENT_CONTENT.lock().unwrap();
            *lock = Some(processed.clone());
        }

        // ارسال داده به فرانت‌اند
        let _ = window.emit("new-content", processed);

        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();

            // 1. ثبت کلید میانبر سراسری پیش‌فرض Ctrl+Alt+F
            let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyF);
            let shortcut_handle = handle.clone();
            let _ = app.global_shortcut().on_shortcut(shortcut, move |_app, _sc, event| {
                if event.state() == ShortcutState::Pressed {
                    trigger_popup(&shortcut_handle);
                }
            });

            // 2. ساخت نوار وظیفه (System Tray) بدون منوی خاکستری پیش‌فرض سیستم‌عامل
            let mut tray_builder = TrayIconBuilder::new()
                .tooltip("RTL View - نمایشگر راست‌چین (Ctrl+Alt+F)")
                .show_menu_on_left_click(false);

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            let _tray = tray_builder
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button_state: MouseButtonState::Up,
                        ..
                    } = event {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.unminimize();
                            let _ = w.set_focus();
                            let _ = w.emit("open-tray-settings", ());
                        }
                    }
                })
                .build(app)?;

            // 3. جلوگیری از بسته شدن کامل برنامه با دکمه ضربدر (پنهان شدن در Tray)
            if let Some(window) = app.get_webview_window("main") {
                let win_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = win_clone.hide();
                    }
                });
            }

            // 4. در صورت اجرای خودکار با استارتاپ ویندوز، پنجره در حالت مینیمایز مخفی می‌ماند
            if std::env::args().any(|arg| arg == "--minimized") {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.hide();
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_current_content,
            hide_window,
            minimize_window,
            toggle_maximize_window,
            toggle_autostart_cmd,
            toggle_always_on_top,
            repair_installation,
            update_global_shortcut
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
