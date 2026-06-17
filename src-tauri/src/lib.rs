use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};
use tauri_plugin_sql::{Migration, MigrationKind};
use tauri_plugin_updater::UpdaterExt;

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
    let migrations = vec![Migration {
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
                updated_at INTEGER NOT NULL
              );
              CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
              );",
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        // Restore main window position/size on launch; exclude overlay window
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .skip_initial_state("overlay")
                .build(),
        )
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:eyeread.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![check_for_update, install_update])
        .setup(|app| {
            build_tray(&app.handle().clone())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running eyeread.in");
}
