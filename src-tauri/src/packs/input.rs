//! Input for packs: keyboard and mouse events the app's windows report, and
//! the rules for which of them a pack gets (spec/packs/API.md, "Input").
//!
//! The windows send events here only while eyeread.in is focused, and never
//! from a text field, so a pack can't read what the user types into the app.
//! What arrives is checked again before it's delivered: the event must be
//! well formed, the pack must have subscribed to that permission, and it
//! must pass the `keys` / `buttons` / `position` the pack declared. Key
//! events carry the physical key (`KeyboardEvent.code`), never the character.

use super::manifest::{is_key_code, InputDecl};
use serde::Serialize;
use serde_json::{json, Value};

/// The two places input comes from, as a sandbox subscribes to them.
pub const SOURCE_KEYBOARD: &str = "keyboard";
pub const SOURCE_MOUSE: &str = "mouse";

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct Modifiers {
    pub ctrl: bool,
    pub shift: bool,
    pub alt: bool,
    pub meta: bool,
}

impl Modifiers {
    fn from_json(v: &Value) -> Self {
        let flag = |k: &str| v.get(k).and_then(Value::as_bool).unwrap_or(false);
        Modifiers {
            ctrl: flag("ctrl"),
            shift: flag("shift"),
            alt: flag("alt"),
            meta: flag("meta"),
        }
    }

    fn to_json(self) -> Value {
        json!({ "ctrl": self.ctrl, "shift": self.shift, "alt": self.alt, "meta": self.meta })
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum InputEvent {
    Key {
        down: bool,
        code: String,
        modifiers: Modifiers,
        repeat: bool,
    },
    MouseButton {
        down: bool,
        button: u8,
        modifiers: Modifiers,
    },
    MouseWheel {
        dx: f64,
        dy: f64,
        modifiers: Modifiers,
    },
    MouseMove {
        x: f64,
        y: f64,
    },
}

fn number(data: &Value, key: &str) -> Result<f64, String> {
    data.get(key)
        .and_then(Value::as_f64)
        .filter(|n| n.is_finite())
        .ok_or_else(|| format!("{key} must be a number"))
}

impl InputEvent {
    /// Check an event a window reported. `kind` is `key`, `mouse.button`,
    /// `mouse.wheel` or `mouse.move`.
    pub fn parse(kind: &str, data: &Value) -> Result<Self, String> {
        let down = || match data.get("type").and_then(Value::as_str) {
            Some("down") => Ok(true),
            Some("up") => Ok(false),
            _ => Err("type must be down or up".to_string()),
        };
        let modifiers = Modifiers::from_json(data.get("modifiers").unwrap_or(&Value::Null));
        match kind {
            "key" => {
                let code = data.get("code").and_then(Value::as_str).unwrap_or_default();
                if code.is_empty() || !is_key_code(code) {
                    return Err("code must be a key code".into());
                }
                Ok(InputEvent::Key {
                    down: down()?,
                    code: code.to_string(),
                    modifiers,
                    repeat: data.get("repeat").and_then(Value::as_bool).unwrap_or(false),
                })
            }
            "mouse.button" => {
                let button = data
                    .get("button")
                    .and_then(Value::as_u64)
                    .filter(|b| *b <= 4)
                    .ok_or("button must be 0 to 4")?;
                Ok(InputEvent::MouseButton {
                    down: down()?,
                    button: button as u8,
                    modifiers,
                })
            }
            "mouse.wheel" => Ok(InputEvent::MouseWheel {
                dx: number(data, "deltaX")?,
                dy: number(data, "deltaY")?,
                modifiers,
            }),
            "mouse.move" => Ok(InputEvent::MouseMove {
                x: number(data, "x")?,
                y: number(data, "y")?,
            }),
            _ => Err("unknown input event".into()),
        }
    }

    /// Where the event came from: what a sandbox subscribes to.
    pub fn source(&self) -> &'static str {
        match self {
            InputEvent::Key { .. } => SOURCE_KEYBOARD,
            _ => SOURCE_MOUSE,
        }
    }

    /// The sandbox protocol's event name (spec/packs/PROTOCOL.md).
    pub fn name(&self) -> &'static str {
        match self {
            InputEvent::Key { .. } => "input.key",
            InputEvent::MouseButton { .. } => "input.mouse.button",
            InputEvent::MouseWheel { .. } => "input.mouse.wheel",
            InputEvent::MouseMove { .. } => "input.mouse.move",
        }
    }

    pub fn data(&self) -> Value {
        let kind = |down: &bool| if *down { "down" } else { "up" };
        match self {
            InputEvent::Key {
                down,
                code,
                modifiers,
                repeat,
            } => json!({
                "type": kind(down), "code": code,
                "modifiers": modifiers.to_json(), "repeat": repeat,
            }),
            InputEvent::MouseButton {
                down,
                button,
                modifiers,
            } => json!({ "type": kind(down), "button": button, "modifiers": modifiers.to_json() }),
            InputEvent::MouseWheel { dx, dy, modifiers } => {
                json!({ "deltaX": dx, "deltaY": dy, "modifiers": modifiers.to_json() })
            }
            InputEvent::MouseMove { x, y } => json!({ "x": x, "y": y }),
        }
    }

    /// Does what the pack declared for `input` let it have this event?
    pub fn passes(&self, decl: &InputDecl) -> bool {
        match self {
            InputEvent::Key { code, .. } => decl
                .keyboard
                .as_ref()
                .is_some_and(|k| k.keys.is_empty() || k.keys.contains(code)),
            InputEvent::MouseButton { button, .. } => decl
                .mouse
                .as_ref()
                .is_some_and(|m| m.buttons.is_empty() || m.buttons.contains(button)),
            InputEvent::MouseWheel { .. } => decl.mouse.as_ref().is_some_and(|m| m.wheel),
            InputEvent::MouseMove { .. } => decl.mouse.as_ref().is_some_and(|m| m.position),
        }
    }
}

/// What the windows need to report right now, so they send nothing when no
/// pack is listening.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Wanted {
    pub keyboard: bool,
    pub mouse: bool,
    pub position: bool,
}

impl Wanted {
    /// Add one subscribed sandbox: its source and what the pack declared.
    pub fn add(&mut self, source: &str, decl: Option<&InputDecl>) {
        match source {
            SOURCE_KEYBOARD => self.keyboard = true,
            SOURCE_MOUSE => {
                self.mouse = true;
                self.position |= decl
                    .and_then(|d| d.mouse.as_ref())
                    .is_some_and(|m| m.position);
            }
            _ => {}
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::packs::manifest::{KeyboardDecl, MouseDecl};

    fn key(code: &str) -> InputEvent {
        InputEvent::parse(
            "key",
            &json!({ "type": "down", "code": code, "modifiers": { "shift": true } }),
        )
        .unwrap()
    }

    #[test]
    fn parses_what_the_windows_send() {
        let InputEvent::Key {
            down,
            code,
            modifiers,
            repeat,
        } = key("ArrowRight")
        else {
            panic!("not a key")
        };
        assert!(down && !repeat && modifiers.shift && !modifiers.ctrl);
        assert_eq!(code, "ArrowRight");

        let wheel = InputEvent::parse("mouse.wheel", &json!({ "deltaX": 0, "deltaY": -120.5 }));
        assert_eq!(wheel.unwrap().data()["deltaY"], -120.5);
    }

    #[test]
    fn refuses_malformed_events() {
        for (kind, data) in [
            ("key", json!({ "type": "down", "code": "Not A Key" })),
            ("key", json!({ "type": "down", "code": "" })),
            ("key", json!({ "type": "sideways", "code": "KeyA" })),
            ("key", json!({ "type": "down", "code": "a".repeat(33) })),
            ("mouse.button", json!({ "type": "down", "button": 5 })),
            ("mouse.wheel", json!({ "deltaX": 1 })),
            ("mouse.move", json!({ "x": "1", "y": 2 })),
            ("scroll", json!({})),
        ] {
            assert!(InputEvent::parse(kind, &data).is_err(), "{kind} {data}");
        }
    }

    #[test]
    fn events_carry_the_key_code_and_no_character() {
        let data = key("KeyA").data();
        assert_eq!(data["code"], "KeyA");
        assert!(data.get("key").is_none() && data.get("text").is_none());
        assert_eq!(key("KeyA").name(), "input.key");
        assert_eq!(key("KeyA").source(), "keyboard");
    }

    fn decl(keys: &[&str], buttons: &[u8], position: bool) -> InputDecl {
        decl_with(keys, buttons, true, position)
    }

    fn decl_with(keys: &[&str], buttons: &[u8], wheel: bool, position: bool) -> InputDecl {
        InputDecl {
            keyboard: Some(KeyboardDecl {
                keys: keys.iter().map(|k| k.to_string()).collect(),
            }),
            mouse: Some(MouseDecl {
                buttons: buttons.to_vec(),
                wheel,
                position,
            }),
            scope: None,
        }
    }

    #[test]
    fn declared_keys_and_buttons_filter_delivery() {
        let any = decl(&[], &[], false);
        let only_arrows = decl(&["ArrowRight", "ArrowLeft"], &[], false);
        assert!(key("KeyA").passes(&any));
        assert!(key("ArrowRight").passes(&only_arrows));
        assert!(!key("KeyA").passes(&only_arrows));

        let side_buttons = decl(&[], &[3, 4], false);
        let button = |b: u64| {
            InputEvent::parse("mouse.button", &json!({ "type": "down", "button": b })).unwrap()
        };
        assert!(button(0).passes(&any));
        assert!(button(3).passes(&side_buttons));
        assert!(!button(0).passes(&side_buttons));
    }

    #[test]
    fn a_source_the_pack_didnt_declare_gets_nothing() {
        let keyboard_only = InputDecl {
            keyboard: Some(KeyboardDecl::default()),
            ..Default::default()
        };
        let wheel = InputEvent::parse("mouse.wheel", &json!({ "deltaX": 0, "deltaY": 1 })).unwrap();
        let mouse_only = InputDecl {
            mouse: Some(MouseDecl {
                wheel: true,
                ..Default::default()
            }),
            ..Default::default()
        };
        assert!(key("KeyA").passes(&keyboard_only) && !key("KeyA").passes(&mouse_only));
        assert!(wheel.passes(&mouse_only) && !wheel.passes(&keyboard_only));
    }

    #[test]
    fn the_wheel_needs_the_manifest_option() {
        let wheel = InputEvent::parse("mouse.wheel", &json!({ "deltaX": 0, "deltaY": 1 })).unwrap();
        assert!(wheel.passes(&decl_with(&[], &[], true, false)));
        assert!(!wheel.passes(&decl_with(&[], &[3], false, false)));
    }

    #[test]
    fn pointer_position_needs_the_manifest_option() {
        let moved = InputEvent::parse("mouse.move", &json!({ "x": 1, "y": 2 })).unwrap();
        assert!(!moved.passes(&decl(&[], &[], false)));
        assert!(moved.passes(&decl(&[], &[], true)));
    }

    #[test]
    fn wanted_follows_subscriptions() {
        let mut w = Wanted::default();
        assert_eq!(w, Wanted::default());
        w.add("keyboard", None);
        assert!(w.keyboard && !w.mouse && !w.position);
        w.add("mouse", Some(&decl(&[], &[], false)));
        assert!(w.mouse && !w.position);
        w.add("mouse", Some(&decl(&[], &[], true)));
        assert!(w.position);
    }
}
