use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
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

/// Hide/show the app's Dock icon + menu-bar presence (macOS).
///
/// Windows are capture-excluded via `set_app_protected`, but the Dock tile,
/// the ⌘-Tab entry and the app-name menus are system UI and always visible in
/// a full-screen share. While a shielded reading session runs, the frontend
/// drops the app to the Accessory activation policy so touching the overlay
/// never reveals "eyeread.in" in the Dock or menu bar; Regular is restored
/// when the session ends (giving the editor back its Dock icon + Edit menu).
#[cfg(target_os = "macos")]
#[tauri::command]
fn set_dock_hidden(app: AppHandle, hidden: bool) {
    use tauri::ActivationPolicy;
    // AppKit requires the main thread (same trap as attach_window_to_all_spaces).
    let handle = app.clone();
    let _ = app.run_on_main_thread(move || {
        let _ = handle.set_activation_policy(if hidden {
            ActivationPolicy::Accessory
        } else {
            ActivationPolicy::Regular
        });
    });
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
fn set_dock_hidden(_app: AppHandle, _hidden: bool) {}

/// Let the overlay join full-screen Spaces, not just regular desktop Spaces.
///
/// `setVisibleOnAllWorkspaces` (from JS) sets `CanJoinAllSpaces`, which makes
/// the window sticky across ordinary desktop Spaces but not across Spaces
/// owned by a full-screen app. The documented escape hatch for those —
/// `NSWindowCollectionBehavior.FullScreenAuxiliary` — is only honored for
/// NSPanel instances on current macOS: setting the flag (or the
/// `.nonactivatingPanel` style bit, which AppKit strips) on a plain NSWindow
/// leaves the window assigned to the desktop Space only, verified via
/// CGSCopySpacesForWindows. Retyping tao's window into an NSPanel would drop
/// its `sendEvent:`/focus overrides, so instead the overlay window is
/// attached as a *child* of an invisible 1×1 non-activating NSPanel that
/// carries the Space flags: children follow their parent onto every Space,
/// full-screen ones included.
///
/// Idempotent — re-invoked on every show of the target window; a no-op once
/// it has a parent. The anchor panel is created once and intentionally leaked
/// (app-lifetime singleton, shared by all attached windows).
#[cfg(target_os = "macos")]
#[tauri::command]
fn attach_window_to_all_spaces(app: AppHandle, label: String) {
    use objc2_app_kit::{
        NSBackingStoreType, NSColor, NSPanel, NSWindowCollectionBehavior, NSWindowOrderingMode,
        NSWindowStyleMask,
    };
    use objc2_foundation::{NSPoint, NSRect, NSSize};
    use std::sync::atomic::{AtomicIsize, Ordering};

    // Window number of the anchor panel, so re-attachment after a hide/show
    // cycle reuses it instead of leaking a panel per show.
    static ANCHOR_WINDOW_NUMBER: AtomicIsize = AtomicIsize::new(0);

    // Only floating companion windows may ride the anchor; the main window
    // must stay a normal Space-bound window.
    if !matches!(label.as_str(), "overlay" | "settings") {
        return;
    }
    let Some(win) = app.get_webview_window(&label) else {
        return;
    };
    // NSWindow mutations must run on the AppKit main thread; command handlers
    // run on a worker thread and AppKit calls silently no-op there (same trap
    // as #41 / set_overlay_glass).
    let w = win.clone();
    let _ = win.run_on_main_thread(move || {
        let Ok(ptr) = w.ns_window() else { return };
        // run_on_main_thread guarantees this, and ns_window() would have
        // panicked otherwise; MainThreadMarker is required by NSPanel APIs.
        let Some(mtm) = objc2::MainThreadMarker::new() else {
            return;
        };
        unsafe {
            let ns_window: &objc2_app_kit::NSWindow = &*(ptr as *mut objc2_app_kit::NSWindow);
            if ns_window.parentWindow().is_some() {
                return; // already attached
            }

            let existing = match ANCHOR_WINDOW_NUMBER.load(Ordering::Relaxed) {
                0 => None,
                n => objc2_app_kit::NSApplication::sharedApplication(mtm).windowWithWindowNumber(n),
            };
            let anchor = existing.unwrap_or_else(|| {
                let panel = NSPanel::initWithContentRect_styleMask_backing_defer(
                    mtm.alloc(),
                    NSRect::new(NSPoint::new(0.0, 0.0), NSSize::new(1.0, 1.0)),
                    NSWindowStyleMask::Borderless | NSWindowStyleMask::NonactivatingPanel,
                    NSBackingStoreType::Buffered,
                    false,
                );
                panel.setCollectionBehavior(
                    NSWindowCollectionBehavior::CanJoinAllSpaces
                        | NSWindowCollectionBehavior::FullScreenAuxiliary,
                );
                // Match the overlay's own level (floating, from alwaysOnTop)
                // so the pair doesn't jump the z-order of unrelated windows.
                panel.setLevel(ns_window.level());
                panel.setBackgroundColor(Some(&NSColor::clearColor()));
                panel.setOpaque(false);
                panel.setIgnoresMouseEvents(true);
                // NSPanel hides itself when the app deactivates by default,
                // which would order out the overlay with it.
                panel.setHidesOnDeactivate(false);
                panel.setReleasedWhenClosed(false);
                ANCHOR_WINDOW_NUMBER.store(panel.windowNumber(), Ordering::Relaxed);
                let anchor = objc2::rc::Retained::into_super(panel);
                std::mem::forget(anchor.clone()); // intentional leak: app-lifetime
                anchor
            });
            anchor.orderFrontRegardless();
            anchor.addChildWindow_ordered(ns_window, NSWindowOrderingMode::Above);
        }
    });
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
fn attach_window_to_all_spaces(_app: AppHandle, _label: String) {}

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

    // Without an Edit menu, macOS has nowhere to route the standard editing
    // key equivalents (⌘C/⌘V/⌘X/⌘A/⌘Z) — replacing the default menu without
    // one silently breaks copy/paste in every text field of the app.
    let undo = PredefinedMenuItem::undo(app, None)?;
    let redo = PredefinedMenuItem::redo(app, None)?;
    let cut = PredefinedMenuItem::cut(app, None)?;
    let copy = PredefinedMenuItem::copy(app, None)?;
    let paste = PredefinedMenuItem::paste(app, None)?;
    let select_all = PredefinedMenuItem::select_all(app, None)?;
    let edit_sep = PredefinedMenuItem::separator(app)?;
    let edit_submenu = Submenu::with_items(
        app,
        "Edit",
        true,
        &[&undo, &redo, &edit_sep, &cut, &copy, &paste, &select_all],
    )?;

    Menu::with_items(app, &[&app_submenu, &edit_submenu])
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
        // v2 reused a version number that pre-squash dev databases had already
        // recorded (an old "add settings column" migration), so those DBs
        // skipped it and lack overlay_x/overlay_y. Rebuild to the canonical
        // schema — safe from every historical state. NEVER renumber or edit an
        // applied migration again; always append a new version.
        Migration {
            version: 3,
            description: "repair: rebuild scripts to canonical schema",
            sql: "CREATE TABLE scripts_v3 (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL DEFAULT 'Untitled script',
                    text TEXT NOT NULL DEFAULT '',
                    tag TEXT NOT NULL DEFAULT 'draft',
                    pinned INTEGER NOT NULL DEFAULT 0,
                    overlay_w INTEGER,
                    overlay_h INTEGER,
                    overlay_x REAL,
                    overlay_y REAL,
                    settings TEXT,
                    updated_at INTEGER NOT NULL
                  );
                  INSERT INTO scripts_v3
                    (id, title, text, tag, pinned, overlay_w, overlay_h, settings, updated_at)
                    SELECT id, title, text, tag, pinned, overlay_w, overlay_h, settings, updated_at
                    FROM scripts;
                  DROP TABLE scripts;
                  ALTER TABLE scripts_v3 RENAME TO scripts;",
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
            set_dock_hidden,
            attach_window_to_all_spaces,
        ])
        .setup(|_app| Ok(()))
        .run(tauri::generate_context!())
        .expect("error while running eyeread.in");
}
