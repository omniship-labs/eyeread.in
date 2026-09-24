//! Broker tests: grants, action routing, `files:import`, attribution. A fake
//! bus stands in for the app's windows and answers RPCs as they would.

use super::broker::*;
use serde_json::{json, Map, Value};
use std::collections::BTreeMap;
use std::sync::{Arc, Mutex, OnceLock, Weak};
use std::time::Duration;

type Responder = Box<dyn Fn(&str, &Value) -> Result<Value, String> + Send + Sync>;

/// Records every emit and save; answers `packs:rpc:*` like the windows do.
#[derive(Default)]
struct FakeBus {
    emits: Mutex<Vec<(Option<String>, String, Value)>>,
    saves: Mutex<Vec<(String, Value)>>,
    broker: OnceLock<Weak<Broker>>,
    responder: OnceLock<Responder>,
}

impl Bus for FakeBus {
    fn emit(&self, window: Option<&str>, event: &str, payload: Value) -> bool {
        self.emits
            .lock()
            .unwrap()
            .push((window.map(String::from), event.into(), payload.clone()));
        if event.starts_with("packs:rpc:") {
            let (Some(broker), Some(respond)) = (
                self.broker.get().and_then(Weak::upgrade),
                self.responder.get(),
            ) else {
                return true;
            };
            let id = payload["id"].as_str().unwrap().to_string();
            let answer = respond(payload["method"].as_str().unwrap(), &payload);
            // Answer from another thread, as a window would via a command.
            std::thread::spawn(move || match answer {
                Ok(v) => broker.rpc_result(&id, Some(v), None),
                Err(code) => broker.rpc_result(&id, None, Some(code)),
            });
        }
        true
    }

    fn save(&self, key: &str, value: Value) {
        self.saves.lock().unwrap().push((key.into(), value));
    }
}

fn setup(respond: Responder) -> (Arc<Broker>, Arc<FakeBus>) {
    let bus = Arc::new(FakeBus::default());
    let _ = bus.responder.set(respond);
    let broker = Arc::new(
        Broker::new(bus.clone(), BTreeMap::new(), BTreeMap::new())
            .with_rpc_timeout(Duration::from_secs(2)),
    );
    let _ = bus.broker.set(Arc::downgrade(&broker));
    (broker, bus)
}

/// Windows that accept everything and echo the call back.
fn echo() -> Responder {
    Box::new(|method, payload| {
        Ok(match method {
            "scripts.create" | "prompter.load" => json!({ "scriptId": "s1", "echo": payload }),
            _ => json!({ "echo": payload }),
        })
    })
}

fn pack() -> Caller {
    Caller::Pack {
        id: "com.example.pedal".into(),
        name: "Foot Pedal".into(),
    }
}

fn rpcs(bus: &FakeBus) -> Vec<(Option<String>, String, Value)> {
    bus.emits
        .lock()
        .unwrap()
        .iter()
        .filter(|(_, e, _)| e.starts_with("packs:rpc:"))
        .cloned()
        .collect()
}

const ON: Grant = Grant {
    allowed: true,
    internet: false,
};

#[test]
fn everything_starts_off_and_a_denied_permission_never_reaches_a_window() {
    let (broker, bus) = setup(echo());
    assert_eq!(
        broker.grant("com.example.pedal", "prompter:control"),
        Grant::default()
    );
    let err = broker
        .call(
            &pack(),
            "prompter:control",
            "prompter.control",
            &json!({ "action": "pause" }),
        )
        .unwrap_err();
    assert_eq!(err, CallError::Denied("prompter:control".into()));
    assert_eq!(err.runtime_code(), "E_PERMISSION");
    assert!(rpcs(&bus).is_empty());
}

#[test]
fn an_allowed_permission_runs_in_the_owning_window_with_attribution() {
    let (broker, bus) = setup(echo());
    broker.set_grant("com.example.pedal", "prompter:control", ON);
    broker
        .call(
            &pack(),
            "prompter:control",
            "prompter.control",
            &json!({ "action": "pause" }),
        )
        .unwrap();
    let sent = rpcs(&bus);
    assert_eq!(sent.len(), 1);
    let (window, event, payload) = &sent[0];
    assert_eq!(
        (window.as_deref(), event.as_str()),
        (Some("overlay"), "packs:rpc:overlay")
    );
    assert_eq!(payload["params"], json!({ "action": "pause" }));
    // The overlay shows "Paused by Foot Pedal" from this.
    assert_eq!(
        payload["caller"],
        json!({ "kind": "pack", "id": "com.example.pedal", "name": "Foot Pedal" })
    );
}

#[test]
fn scripts_carry_their_source_and_default_titles() {
    let (broker, bus) = setup(echo());
    broker.set_grant("com.example.pedal", "scripts:write", ON);
    let out = broker
        .call(
            &pack(),
            "scripts:write",
            "scripts.add",
            &json!({ "text": " Hello " }),
        )
        .unwrap();
    assert_eq!(out["scriptId"], "s1");
    let (window, _, payload) = &rpcs(&bus)[0];
    assert_eq!(window.as_deref(), Some("main"));
    assert_eq!(payload["method"], "scripts.create");
    assert_eq!(
        payload["params"]["title"], "Foot Pedal",
        "a pack's name by default"
    );
    assert_eq!(payload["params"]["text"], "Hello");
    assert_eq!(payload["caller"]["kind"], "pack");

    let app = Caller::App {
        id: "a1".into(),
        name: "Notes".into(),
    };
    broker.set_app_scopes("a1", vec!["scripts:write".into()]);
    broker
        .call(
            &app,
            "scripts:write",
            "scripts.add",
            &json!({ "text": "x" }),
        )
        .unwrap();
    assert_eq!(rpcs(&bus)[1].2["params"]["title"], "From Notes");
}

#[test]
fn revoking_takes_effect_on_the_next_call() {
    let (broker, bus) = setup(echo());
    let args = json!({ "action": "toggle" });
    broker.set_grant("com.example.pedal", "prompter:control", ON);
    assert!(broker
        .call(&pack(), "prompter:control", "prompter.control", &args)
        .is_ok());
    broker.set_grant("com.example.pedal", "prompter:control", Grant::default());
    assert!(matches!(
        broker.call(&pack(), "prompter:control", "prompter.control", &args),
        Err(CallError::Denied(_))
    ));
    assert_eq!(rpcs(&bus).len(), 1);
    // The change is saved, and windows (the pack host) are told.
    let saves = bus.saves.lock().unwrap();
    let (key, value) = saves.last().unwrap();
    assert_eq!(key, Broker::STORE_KEY_GRANTS);
    assert_eq!(
        value["com.example.pedal"]["prompter:control"]["allowed"],
        false
    );
    assert!(bus.emits.lock().unwrap().iter().any(|(w, e, p)| w.is_none()
        && e == "packs:grants-changed"
        && p["id"] == "com.example.pedal"));

    // Connected apps go through the same check.
    let app = Caller::App {
        id: "a1".into(),
        name: "Deck".into(),
    };
    broker.set_app_scopes("a1", vec!["prompter:control".into()]);
    assert!(broker
        .call(&app, "prompter:control", "prompter.control", &args)
        .is_ok());
    broker.remove_app("a1");
    assert!(broker
        .call(&app, "prompter:control", "prompter.control", &args)
        .is_err());
}

#[test]
fn a_method_must_belong_to_the_permission_it_claims() {
    let (broker, _) = setup(echo());
    broker.set_grant("com.example.pedal", "prompter:control", ON);
    // Holding prompter:control doesn't let it load scripts.
    assert!(matches!(
        broker.call(
            &pack(),
            "prompter:control",
            "prompter.load",
            &json!({ "text": "x" })
        ),
        Err(CallError::Denied(_))
    ));
    assert!(matches!(
        broker.call(&pack(), "prompter:control", "app.eval", &json!({})),
        Err(CallError::Denied(_))
    ));
}

#[test]
fn internet_needs_the_permission_on_too() {
    let (broker, _) = setup(echo());
    let g = broker.set_grant(
        "com.example.notion",
        "scripts:write",
        Grant {
            allowed: false,
            internet: true,
        },
    );
    assert!(!g.internet);
    assert!(!broker.internet_allowed("com.example.notion", "scripts:write"));
    broker.set_grant(
        "com.example.notion",
        "scripts:write",
        Grant {
            allowed: true,
            internet: true,
        },
    );
    assert!(broker.internet_allowed("com.example.notion", "scripts:write"));
    broker.forget_pack("com.example.notion");
    assert!(!broker.internet_allowed("com.example.notion", "scripts:write"));
}

fn importer(answer: Value) -> Responder {
    Box::new(move |method, _| {
        assert_eq!(method, "files.import");
        Ok(answer.clone())
    })
}

#[test]
fn files_import_returns_only_the_chosen_file() {
    // Even if a window sent more (a path, the folder), the pack gets name,
    // type, size and contents only, and never a directory in the name.
    let (broker, bus) = setup(importer(json!({
        "name": "/Users/ada/Documents/notes.md",
        "type": "text/markdown",
        "data": "aGVsbG8=",
        "path": "/Users/ada/Documents/notes.md",
        "folder": ["/Users/ada/Documents/other.md"],
    })));
    broker.set_grant("com.example.pedal", "files:import", ON);
    let file = broker
        .call(
            &pack(),
            "files:import",
            "files.import",
            &json!({ "accept": [".md", ".TXT"] }),
        )
        .unwrap();
    assert_eq!(
        file,
        json!({ "name": "notes.md", "type": "text/markdown", "size": 5, "data": "aGVsbG8=" })
    );
    let (_, _, payload) = &rpcs(&bus)[0];
    assert_eq!(
        payload["params"],
        json!({ "accept": [".md", ".txt"], "maxBytes": 10 * 1024 * 1024 })
    );
}

#[test]
fn files_import_cancel_limits_and_who_may_ask() {
    let (broker, _) = setup(importer(Value::Null));
    broker.set_grant("com.example.pedal", "files:import", ON);
    assert_eq!(
        broker
            .call(&pack(), "files:import", "files.import", &json!({}))
            .unwrap(),
        Value::Null,
        "cancelled"
    );

    let (broker, _) = setup(importer(json!({ "name": "a.txt", "data": "aGVsbG8=" })));
    broker.set_grant("com.example.pedal", "files:import", ON);
    assert_eq!(
        broker
            .call(
                &pack(),
                "files:import",
                "files.import",
                &json!({ "maxBytes": 4 })
            )
            .unwrap_err(),
        CallError::Window("file_too_large".into())
    );
    for bad in [
        json!({ "accept": ["md"] }),
        json!({ "accept": [".m/d"] }),
        json!({ "maxBytes": 0 }),
    ] {
        assert!(matches!(
            broker.call(&pack(), "files:import", "files.import", &bad),
            Err(CallError::Invalid(_))
        ));
    }
    // A connected app is a regular program; it can't use the app's picker.
    let app = Caller::App {
        id: "a1".into(),
        name: "X".into(),
    };
    broker.set_app_scopes("a1", vec!["files:import".into()]);
    assert!(matches!(
        broker.call(&app, "files:import", "files.import", &json!({})),
        Err(CallError::Denied(_))
    ));
}

#[test]
fn one_file_picker_per_pack_at_a_time() {
    let (broker, _) = setup(Box::new(|_, _| {
        std::thread::sleep(Duration::from_millis(300));
        Ok(Value::Null)
    }));
    broker.set_grant("com.example.pedal", "files:import", ON);
    let b = broker.clone();
    let first =
        std::thread::spawn(move || b.call(&pack(), "files:import", "files.import", &json!({})));
    std::thread::sleep(Duration::from_millis(50));
    let second = broker.call(&pack(), "files:import", "files.import", &json!({}));
    assert_eq!(second.unwrap_err(), CallError::Busy);
    assert_eq!(second_code(), "E_BUSY");
    assert!(first.join().unwrap().is_ok());
    // Free again afterwards.
    assert!(broker
        .call(&pack(), "files:import", "files.import", &json!({}))
        .is_ok());
}

fn second_code() -> &'static str {
    CallError::Busy.runtime_code()
}

#[test]
fn window_errors_and_state() {
    let (broker, _) = setup(Box::new(|_, _| Err("no_active_session".into())));
    broker.set_grant("com.example.pedal", "prompter:control", ON);
    let err = broker
        .call(
            &pack(),
            "prompter:control",
            "prompter.control",
            &json!({ "action": "play" }),
        )
        .unwrap_err();
    assert_eq!(err.runtime_code(), "E_NO_SESSION");

    broker.set_grant("com.example.pedal", "prompter:events", ON);
    assert_eq!(
        broker
            .call(&pack(), "prompter:events", "prompter.getState", &json!({}))
            .unwrap(),
        idle_prompter_state()
    );
    let seen = Arc::new(Mutex::new(Vec::new()));
    let s = seen.clone();
    broker.on_prompter_state(Box::new(move |v| s.lock().unwrap().push(v.clone())));
    broker.set_prompter_state(json!({ "sessionActive": true, "wordIndex": 3 }));
    assert_eq!(seen.lock().unwrap().len(), 1);
    assert_eq!(
        broker
            .call(&pack(), "prompter:events", "prompter.getState", &json!({}))
            .unwrap()["wordIndex"],
        3
    );
}

#[test]
fn settings_are_stored_and_announced() {
    let (broker, bus) = setup(echo());
    let mut values = Map::new();
    values.insert("autoOpen".into(), json!(false));
    broker.set_settings(
        "com.example.notion",
        values.clone(),
        json!({ "autoOpen": false }),
    );
    assert_eq!(broker.settings("com.example.notion"), values);
    assert!(bus
        .emits
        .lock()
        .unwrap()
        .iter()
        .any(|(_, e, p)| e == "packs:settings-changed"
            && p == &json!({ "id": "com.example.notion", "values": { "autoOpen": false } })));
}

#[test]
fn argument_validation() {
    let app = Caller::App {
        id: "a".into(),
        name: "N".into(),
    };
    assert_eq!(
        validate_script(&json!({ "text": "   " }), &app).unwrap_err(),
        "text_required"
    );
    assert_eq!(
        validate_script(&json!({ "text": "a", "title": 3 }), &app).unwrap_err(),
        "invalid_title"
    );
    assert_eq!(
        validate_script(&json!({ "text": "a", "language": "en US" }), &app).unwrap_err(),
        "invalid_language"
    );
    let p = validate_script(
        &json!({ "text": "Hi", "title": "Talk", "language": "pt-BR" }),
        &app,
    )
    .unwrap();
    assert_eq!(
        (p["title"].as_str(), p["language"].as_str()),
        (Some("Talk"), Some("pt-BR"))
    );
    assert_eq!(
        validate_control(&json!({ "action": "seek", "wordIndex": 12 })).unwrap(),
        json!({ "action": "seek", "wordIndex": 12 })
    );
    assert_eq!(
        validate_control(&json!({ "action": "seek" })).unwrap_err(),
        "invalid_word_index"
    );
    assert_eq!(
        validate_control(&json!({ "action": "explode" })).unwrap_err(),
        "invalid_action"
    );
}
