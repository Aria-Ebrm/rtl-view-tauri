mod clipboard;
mod text_engine;

use std::sync::Mutex;
use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, PhysicalSize, WebviewWindow,
};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use text_engine::{process_clipboard_payload, ProcessedContent};

// نگهداری آخرین محتوای پردازش‌شده برای ارسال به پنجره
static CURRENT_CONTENT: Mutex<Option<ProcessedContent>> = Mutex::new(None);

#[tauri::command]
fn get_current_content() -> ProcessedContent {
    let lock = CURRENT_CONTENT.lock().unwrap();
    lock.clone().unwrap_or_else(|| ProcessedContent {
        html: r#"<div class="empty-state">متنی برای نمایش یافت نشد.</div>"#.to_string(),
        visible_length: 0,
        is_empty: true,
    })
}

#[tauri::command]
fn hide_window(window: WebviewWindow) {
    let _ = window.hide();
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

/// محاسبه اندازه پویای پنجره متناسب با طول متن
fn calculate_window_size(len: usize) -> (u32, u32) {
    if len < 150 {
        (520, 260)
    } else if len < 600 {
        (740, 440)
    } else {
        (920, 640)
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

            // 1. ثبت کلید میانبر سراسری Ctrl+Alt+F
            let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyF);
            let shortcut_handle = handle.clone();
            let _ = app.global_shortcut().on_shortcut(shortcut, move |_app, _sc, event| {
                if event.state() == ShortcutState::Pressed {
                    trigger_popup(&shortcut_handle);
                }
            });

            // 2. ساخت منوی نوار وظیفه (System Tray)
            let is_auto = handle.autolaunch().is_enabled().unwrap_or(false);

            let title_item = MenuItem::with_id(&handle, "title", "نمایشگر راست‌چین RTL View", false, None::<&str>)?;
            let help_item = MenuItem::with_id(&handle, "help", "راهنما و کلید میانبر (Ctrl+Alt+F)", true, None::<&str>)?;
            let startup_item = CheckMenuItem::with_id(&handle, "startup", "اجرا با روشن شدن سیستم (Startup)", true, is_auto, None::<&str>)?;
            let quit_item = MenuItem::with_id(&handle, "quit", "خروج از برنامه", true, None::<&str>)?;

            let tray_menu = Menu::with_items(&handle, &[
                &title_item,
                &help_item,
                &startup_item,
                &quit_item,
            ])?;

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&tray_menu)
                .tooltip("RTL View - نمایشگر راست‌چین (Ctrl+Alt+F)")
                .show_menu_on_left_click(false);

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            let _tray = tray_builder
                .on_menu_event(move |app, event| {
                    match event.id().as_ref() {
                        "help" => {
                            if let Some(w) = app.get_webview_window("main") {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                        "startup" => {
                            let mgr = app.autolaunch();
                            if let Ok(enabled) = mgr.is_enabled() {
                                if enabled {
                                    let _ = mgr.disable();
                                } else {
                                    let _ = mgr.enable();
                                }
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
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

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_current_content,
            hide_window,
            toggle_autostart_cmd
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
