// The app's own commands are listed here so Tauri enforces an ACL for them:
// only windows whose capability grants `allow-<command>` can call them
// (capabilities/default.json grants them to the app's four windows). Without
// this list, any webview with a local origin, including one served from an
// app-registered protocol, could call every command. The pack host must
// have none (#122). Keep in sync with `generate_handler!` in src/lib.rs;
// `app_commands_are_all_granted` in src/lib.rs checks that.
const APP_COMMANDS: &[&str] = &[
    "check_for_update",
    "download_update",
    "install_update",
    "show_about_window",
    "set_app_protected",
    "set_dock_hidden",
    "attach_window_to_all_spaces",
    "packs_apps_status",
    "packs_apps_set_enabled",
    "packs_apps_revoke",
    "packs_apps_resolve_pairing",
    "packs_inspect",
    "packs_inspect_bytes",
    "packs_install",
    "packs_uninstall",
    "packs_list",
    "packs_set_enabled",
    "packs_logs",
    "packs_net_log",
    "packs_net_clear_log",
    "packs_rpc_result",
    "packs_prompter_state",
    "packs_grants",
    "packs_set_grant",
    "packs_settings_get",
    "packs_settings_set",
];

fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(APP_COMMANDS)),
    )
    .expect("failed to run tauri-build");
}
