// ==============================================================================
// RTL View - Tray Flyout Controller (Geist Design System - TypeScript)
// ==============================================================================

// ==============================================================================
// RTL View - Tray Flyout Controller (Geist Design System)
// ==============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // اعمال تم ذخیره‌شده
    try {
        const savedTheme = localStorage.getItem('rtl_theme') || 'geist-dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
    } catch (e) {
        document.documentElement.setAttribute('data-theme', 'geist-dark');
    }

    const btnOpen = document.getElementById('btn-tray-open');
    const btnSettings = document.getElementById('btn-tray-settings');
    const btnRepair = document.getElementById('btn-tray-repair');
    const btnQuit = document.getElementById('btn-tray-quit');
    const switchActive = document.getElementById('tray-switch-active') as HTMLInputElement | null;

    function invokeTauri(cmd, args = {}) {
        if (window.__TAURI__ && window.__TAURI__.core) {
            return window.__TAURI__.core.invoke(cmd, args);
        }
        console.warn(`[Tauri Mock] Invoke command: ${cmd}`, args);
        return Promise.resolve();
    }

    if (btnOpen) {
        btnOpen.addEventListener('click', async () => {
            await invokeTauri('open_main_window');
        });
    }

    if (btnSettings) {
        btnSettings.addEventListener('click', async () => {
            await invokeTauri('open_main_settings');
        });
    }

    if (btnRepair) {
        btnRepair.addEventListener('click', async () => {
            try {
                const label = btnRepair.querySelector('span');
                if (label) label.textContent = 'در حال بررسی...';
                await invokeTauri('repair_installation');
                if (label) label.textContent = 'بررسی شد ✔';
                setTimeout(() => {
                    if (label) label.textContent = 'تعمیر و بازیابی (Repair)';
                }, 1500);
            } catch (err) {
                console.error('Repair failed:', err);
            }
        });
    }

    if (btnQuit) {
        btnQuit.addEventListener('click', async () => {
            await invokeTauri('quit_app');
        });
    }

    if (switchActive) {
        switchActive.addEventListener('change', () => {
            const active = switchActive.checked;
            try {
                localStorage.setItem('rtl_tray_active', active ? 'true' : 'false');
            } catch (_) {}
        });
    }
});

export {};
