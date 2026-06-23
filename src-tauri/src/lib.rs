use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WindowEvent,
};
use tauri_plugin_sql::{Migration, MigrationKind};
use tauri_plugin_updater::UpdaterExt;

/// Toggle screen-capture invisibility on every app window at once.
///
/// Maps to the OS-level capture-exclusion primitive per platform:
///   • macOS   → NSWindow.sharingType = .none
///   • Windows → SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)
///   • Linux   → no-op (no portable compositor-level exclusion exists)
/// All of this is handled inside Tauri/tao's `set_content_protected`.
#[tauri::command]
fn set_app_protected(app: AppHandle, protected: bool) {
    for label in ["main", "about", "settings", "overlay"] {
        if let Some(win) = app.get_webview_window(label) {
            let _ = win.set_content_protected(protected);
        }
    }
}

/// Open the About window — called from JS menu listener or Settings screen.
#[tauri::command]
fn show_about_window(app: AppHandle) {
    if let Some(win) = app.get_webview_window("about") {
        let _ = win.show();
        let _ = win.center();
        let _ = win.set_focus();
    }
}

/// Check for an update and return a human-readable status string to the frontend.
#[tauri::command]
async fn check_for_update(app: AppHandle) -> Result<String, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    match updater.check().await {
        Ok(Some(update)) => Ok(format!("update:{}", update.version)),
        Ok(None) => Ok("up_to_date".to_string()),
        Err(e) => Err(e.to_string()),
    }
}

/// Install a pending update and restart.
#[tauri::command]
async fn install_update(app: AppHandle) -> Result<(), String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    if let Some(update) = updater.check().await.map_err(|e| e.to_string())? {
        update
            .download_and_install(|_, _| {}, || {})
            .await
            .map_err(|e| e.to_string())?;
        app.restart();
    }
    Ok(())
}

fn build_app_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let about = MenuItem::with_id(app, "about", "About eyeread.in", true, None::<&str>)?;
    let hide = PredefinedMenuItem::hide(app, None)?;
    let hide_others = PredefinedMenuItem::hide_others(app, None)?;
    let show_all = PredefinedMenuItem::show_all(app, None)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quit = PredefinedMenuItem::quit(app, None)?;

    let app_submenu = Submenu::with_items(
        app,
        "eyeread.in",
        true,
        &[&about, &sep, &hide, &hide_others, &show_all, &sep, &quit],
    )?;

    Menu::with_items(app, &[&app_submenu])
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Open eyeread.in", true, None::<&str>)?;
    let separator = tauri::menu::PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &separator, &quit])?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
        })
        .build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create scripts and settings tables",
            sql: "CREATE TABLE IF NOT EXISTS scripts (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL DEFAULT 'Untitled script',
                    text TEXT NOT NULL DEFAULT '',
                    tag TEXT NOT NULL DEFAULT 'draft',
                    pinned INTEGER NOT NULL DEFAULT 0,
                    overlay_w INTEGER,
                    overlay_h INTEGER,
                    settings TEXT,
                    updated_at INTEGER NOT NULL
                  );
                  CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                  );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add overlay position per script",
            sql: "ALTER TABLE scripts ADD COLUMN overlay_x REAL;
                  ALTER TABLE scripts ADD COLUMN overlay_y REAL;",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .menu(build_app_menu)
        .on_menu_event(|app, event| {
            if event.id.as_ref() == "about" {
                if let Some(win) = app.get_webview_window("about") {
                    let _ = win.show();
                    let _ = win.center();
                    let _ = win.set_focus();
                }
            }
        })
        // Closing the About/Settings windows should hide them, not destroy them,
        // so they can be reopened. (macOS red button destroys by default.)
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let label = window.label();
                if label == "about" || label == "settings" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        // Restore main window position/size on launch. Skip the transient
        // windows (overlay/settings/about) so their saved "visible" state
        // doesn't force them open on startup.
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .skip_initial_state("overlay")
                .skip_initial_state("settings")
                .skip_initial_state("about")
                .build(),
        )
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:eyeread.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            check_for_update,
            install_update,
            show_about_window,
            set_app_protected,
        ])
        .setup(|app| {
            build_tray(&app.handle().clone())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running eyeread.in");
}
