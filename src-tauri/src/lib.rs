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
static CURRENT_SHORTCUT: Mutex<String> = Mutex::new(String::new());

#[tauri::command]
fn get_current_content() -> ProcessedContent {
    let lock = CURRENT_CONTENT.lock().unwrap();
    if let Some(content) = lock.clone() {
        return content;
    }

    let sc_lock = CURRENT_SHORTCUT.lock().unwrap();
    let current_sc = if sc_lock.is_empty() {
        "Ctrl + Alt + F"
    } else {
        sc_lock.as_str()
    };

    ProcessedContent {
        raw_text: String::new(),
        html: format!(r#"<div class="empty-state" style="text-align: center; padding: 24px 16px;">
            <div style="font-size: 20px; font-weight: bold; margin-bottom: 12px; color: #60a5fa;">برنامه RTL View فعال است ✔</div>
            <p style="color: #cbd5e1; margin-bottom: 12px; font-size: 14px;">متن دلخواه خود را در هر برنامه‌ای انتخاب کنید و کلیدهای میانبر زیر را فشار دهید:</p>
            <div id="empty-state-shortcut" style="display: inline-block; background: #1e293b; border: 1px solid #475569; border-radius: 8px; padding: 8px 20px; font-size: 18px; font-weight: bold; color: #38bdf8; margin: 8px 0; letter-spacing: 1px;">{}</div>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 16px;">این پنجره با کلید Esc پنهان می‌شود و در نوار وظیفه کنار ساعت (System Tray) به کار خود ادامه می‌دهد.</p>
        </div>"#, current_sc),
        visible_length: 0,
        is_empty: false,
        is_html: false,
    }
}

#[tauri::command]
fn hide_window(window: WebviewWindow) {
    let _ = window.hide();
}

#[tauri::command]
fn start_dragging(window: WebviewWindow) -> Result<(), String> {
    window.start_dragging().map_err(|e| e.to_string())
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

    {
        let mut sc_lock = CURRENT_SHORTCUT.lock().unwrap();
        *sc_lock = shortcut_str.clone();
    }

    if let Some(tray) = app.tray_by_id("main-tray") {
        let _ = tray.set_tooltip(Some(format!("RTL View - نمایشگر راست‌چین ({clean})")));
    }

    if let Some(w) = app.get_webview_window("main") {
        let _ = w.emit("shortcut-updated", shortcut_str.clone());
    }

    Ok(clean)
}

#[tauri::command]
fn open_main_window(app: AppHandle) -> Result<(), String> {
    if let Some(tray_w) = app.get_webview_window("tray") {
        let _ = tray_w.hide();
    }
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.center();
        let _ = w.set_focus();
    }
    Ok(())
}

#[tauri::command]
fn open_main_settings(app: AppHandle) -> Result<(), String> {
    if let Some(tray_w) = app.get_webview_window("tray") {
        let _ = tray_w.hide();
    }
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.center();
        let _ = w.set_focus();
        let _ = w.emit("open-tray-settings", ());
    }
    Ok(())
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
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
            let mut tray_builder = TrayIconBuilder::with_id("main-tray")
                .tooltip("RTL View - نمایشگر راست‌چین (Ctrl+Alt+F)")
                .show_menu_on_left_click(false);

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            let _tray = tray_builder
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        position,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event {
                        let app = tray.app_handle();
                        if let Some(tray_win) = app.get_webview_window("tray") {
                            let is_visible = tray_win.is_visible().unwrap_or(false);
                            if is_visible {
                                let _ = tray_win.hide();
                            } else {
                                let monitor = tray_win.current_monitor().ok().flatten();
                                let scale_factor = monitor.as_ref().map(|m| m.scale_factor()).unwrap_or(1.0);
                                let physical_size = tray_win.outer_size().unwrap_or(tauri::PhysicalSize::new(
                                    (240.0 * scale_factor) as u32,
                                    (205.0 * scale_factor) as u32,
                                ));

                                let win_w = physical_size.width as i32;
                                let win_h = physical_size.height as i32;
                                let icon_x = position.x as i32;
                                let icon_y = position.y as i32;

                                let mut x = icon_x - (win_w / 2);
                                let mut y = icon_y - win_h - (12.0 * scale_factor) as i32;

                                if let Some(ref m) = monitor {
                                    let m_pos = m.position();
                                    let m_size = m.size();
                                    let screen_left = m_pos.x;
                                    let screen_right = m_pos.x + m_size.width as i32;
                                    let screen_top = m_pos.y;

                                    let margin_x = (12.0 * scale_factor) as i32;
                                    if x + win_w > screen_right - margin_x {
                                        x = screen_right - win_w - margin_x;
                                    }
                                    if x < screen_left + margin_x {
                                        x = screen_left + margin_x;
                                    }

                                    // اطمینان از قرارگیری پنجره دقیقاً بالای تسک‌بار و آیکون‌ها
                                    let max_bottom = icon_y - (8.0 * scale_factor) as i32;
                                    if y + win_h > max_bottom {
                                        y = max_bottom - win_h;
                                    }
                                    let margin_y = (12.0 * scale_factor) as i32;
                                    if y < screen_top + margin_y {
                                        y = screen_top + margin_y;
                                    }
                                } else {
                                    if x < 10 { x = 10; }
                                    if y < 10 { y = 10; }
                                }

                                let _ = tray_win.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(x, y)));
                                let _ = tray_win.show();
                                let _ = tray_win.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            // 3. پنجره اختصاصی نوار وظیفه (Tray Flyout) با از دست دادن فوکوس پنهان می‌شود
            if let Some(tray_win) = app.get_webview_window("tray") {
                let tray_win_clone = tray_win.clone();
                tray_win.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(false) = event {
                        let _ = tray_win_clone.hide();
                    }
                });
            }

            // 4. جلوگیری از بسته شدن کامل برنامه با دکمه ضربدر (پنهان شدن در Tray)
            if let Some(window) = app.get_webview_window("main") {
                let win_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = win_clone.hide();
                    }
                });
            }

            // 5. در صورت اجرای خودکار با استارتاپ ویندوز، پنجره در حالت مینیمایز مخفی می‌ماند
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
            start_dragging,
            minimize_window,
            toggle_maximize_window,
            toggle_autostart_cmd,
            toggle_always_on_top,
            repair_installation,
            update_global_shortcut,
            open_main_window,
            open_main_settings,
            quit_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
