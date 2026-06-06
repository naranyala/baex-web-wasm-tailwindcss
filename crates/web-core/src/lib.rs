use std::cell::RefCell;
use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use web_sys::window;

thread_local! {
    static SIGNAL_VALUES: RefCell<HashMap<String, JsValue>> = RefCell::new(HashMap::new());
    static SIGNAL_SUBSCRIBERS: RefCell<HashMap<String, Vec<js_sys::Function>>> = RefCell::new(HashMap::new());
    static BINDING_ID: RefCell<u32> = RefCell::new(0);

    static COMPONENT_ID_COUNTER: RefCell<u32> = RefCell::new(0);
    static COMPONENT_STATE: RefCell<HashMap<u32, ComponentState>> = RefCell::new(HashMap::new());
}

struct ComponentState {
    values: HashMap<String, JsValue>,
    changed: HashMap<String, JsValue>,
}

impl ComponentState {
    fn new() -> Self {
        Self {
            values: HashMap::new(),
            changed: HashMap::new(),
        }
    }
}

// ── Utility ──────────────────────────────────────────────────────────

fn escape_html(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#039;")
}

fn detect_binding(s: &str) -> Option<(&'static str, &str)> {
    let bytes = s.as_bytes();
    let len = bytes.len();
    if len < 3 || bytes[len - 1] != b'=' {
        return None;
    }
    let before_eq = &s[..len - 1];
    let prefix_pos = before_eq.rfind(|c: char| !c.is_alphanumeric() && c != '_')?;
    let prefix = &s[prefix_pos..prefix_pos + 1];
    let name = &s[prefix_pos + 1..len - 1];
    if name.is_empty() || !name.chars().all(|c| c.is_alphanumeric() || c == '_') {
        return None;
    }
    match prefix {
        "@" => Some(("event", name)),
        "." => Some(("property", name)),
        "?" => Some(("bool", name)),
        _ => None,
    }
}

fn js_to_string(val: &JsValue) -> String {
    if val.is_null() || val.is_undefined() {
        return String::new();
    }
    if let Some(s) = val.as_string() {
        return s;
    }
    if let Some(n) = val.as_f64() {
        return n.to_string();
    }
    if let Some(b) = val.as_bool() {
        return b.to_string();
    }
    String::new()
}

fn is_template_result(val: &JsValue) -> bool {
    if !val.is_object() {
        return false;
    }
    let has_html =
        js_sys::Reflect::has(val, &JsValue::from_str("html")).unwrap_or(false);
    let has_bindings =
        js_sys::Reflect::has(val, &JsValue::from_str("bindings")).unwrap_or(false);
    has_html && has_bindings
}

fn is_signal_like(val: &JsValue) -> bool {
    if !val.is_object() {
        return false;
    }
    if is_template_result(val) {
        return false;
    }
    js_sys::Reflect::has(val, &JsValue::from_str("value")).unwrap_or(false)
}

fn resolve_text_value(
    value: &JsValue,
    output: &mut String,
    bindings: &js_sys::Array,
    depth: u32,
) {
    use js_sys::{Array, Reflect};

    if depth > 10 {
        return;
    }

    if value.is_null() || value.is_undefined() {
        return;
    }

    // ── TemplateResult: extract html + merge bindings ─────
    if is_template_result(value) {
        if let Ok(html_val) = Reflect::get(value, &"html".into()) {
            if let Some(html_str) = html_val.as_string() {
                output.push_str(&html_str);
            }
        }
        if let Ok(bindings_val) = Reflect::get(value, &"bindings".into()) {
            let nested = Array::from(&bindings_val);
            for j in 0..nested.length() {
                bindings.push(&nested.get(j));
            }
        }
        return;
    }

    // ── Raw HTML: skip escaping if __raw is true ──────────────────
    if let Ok(is_raw) = js_sys::Reflect::get(value, &"__raw".into()) {
        if is_raw.is_truthy() {
            if let Ok(val) = js_sys::Reflect::get(value, &"value".into()) {
                if let Some(s) = val.as_string() {
                    output.push_str(&s);
                    return;
                }
            }
        }
    }


    // ── Array: iterate and resolve each item ──────────────

    if Array::is_array(value) {
        let arr = Array::from(value);
        for j in 0..arr.length() {
            resolve_text_value(&arr.get(j), output, bindings, depth + 1);
        }
        return;
    }

    // ── Signal / reactive value: unwrap .value then recurse ──
    if is_signal_like(value) {
        if let Ok(val) = Reflect::get(value, &"value".into()) {
            resolve_text_value(&val, output, bindings, depth + 1);
        }
        return;
    }

    // ── Primitive: escape and append ──────────────────────
    output.push_str(&escape_html(&js_to_string(value)));
}

#[wasm_bindgen]
pub fn register_component() -> u32 {
    COMPONENT_ID_COUNTER.with(|id| {
        let mut id = id.borrow_mut();
        let cur = *id;
        *id += 1;
        cur
    })
}

#[wasm_bindgen]
pub fn update_component_property(cid: u32, name: String, value: JsValue) -> bool {
    COMPONENT_STATE.with(|state| {
        let mut state = state.borrow_mut();
        let comp = state.entry(cid).or_insert_with(ComponentState::new);

        let old_value = comp.values.get(&name).cloned().unwrap_or(JsValue::UNDEFINED);

        if old_value != value {
            comp.changed.insert(name.clone(), old_value);
            comp.values.insert(name, value);
            true
        } else {
            false
        }
    })
}

#[wasm_bindgen]
pub fn get_component_property(cid: u32, name: String) -> JsValue {
    COMPONENT_STATE.with(|state| {
        state
            .borrow()
            .get(&cid)
            .and_then(|comp| comp.values.get(&name).cloned())
            .unwrap_or(JsValue::UNDEFINED)
    })
}

#[wasm_bindgen]
pub fn get_component_changed_properties(cid: u32) -> JsValue {
    use js_sys::Object;
    use js_sys::Reflect;

    COMPONENT_STATE.with(|state| {
        let state = state.borrow();
        let result = Object::new();
        if let Some(comp) = state.get(&cid) {
            for (name, value) in &comp.changed {
                Reflect::set(&result, &name.into(), value).unwrap();
            }
        }
        result.into()
    })
}

#[wasm_bindgen]
pub fn clear_component_changed_properties(cid: u32) {
    COMPONENT_STATE.with(|state| {
        let mut state = state.borrow_mut();
        if let Some(comp) = state.get_mut(&cid) {
            comp.changed.clear();
        }
    });
}

#[wasm_bindgen]
pub fn remove_component(cid: u32) {
    COMPONENT_STATE.with(|state| {
        state.borrow_mut().remove(&cid);
    });
}

// ── Reactive Signal System ──────────────────────────────────────────

#[wasm_bindgen]
pub fn create_signal(key: String, initial: JsValue) -> JsValue {
    SIGNAL_VALUES.with(|store| {
        store
            .borrow_mut()
            .entry(key.clone())
            .or_insert_with(|| initial.clone());
    });
    SIGNAL_SUBSCRIBERS.with(|store| {
        store.borrow_mut().entry(key).or_default();
    });
    initial
}

#[wasm_bindgen]
pub fn get_signal(key: String) -> JsValue {
    SIGNAL_VALUES.with(|store| {
        store
            .borrow()
            .get(&key)
            .cloned()
            .unwrap_or(JsValue::UNDEFINED)
    })
}

#[wasm_bindgen]
pub fn set_signal(key: String, value: JsValue) {
    SIGNAL_VALUES.with(|store| {
        store.borrow_mut().insert(key.clone(), value.clone());
    });
    SIGNAL_SUBSCRIBERS.with(|store| {
        let subscribers = store.borrow();
        if let Some(callbacks) = subscribers.get(&key) {
            for callback in callbacks {
                let _ = callback.call1(&JsValue::UNDEFINED, &value);
            }
        }
    });
}

#[wasm_bindgen]
pub fn on_signal_change(key: String, callback: js_sys::Function) {
    SIGNAL_SUBSCRIBERS.with(|store| {
        store
            .borrow_mut()
            .entry(key)
            .or_default()
            .push(callback);
    });
}

// ── Template Processing (core framework logic) ──────────────────────

#[wasm_bindgen]
pub fn process_template(strings: JsValue, values: JsValue) -> JsValue {
    use js_sys::{Array, Object, Reflect};

    let strings = Array::from(&strings);
    let values = Array::from(&values);

    let mut output = String::new();
    let result_bindings = Array::new();

    let strings_len = strings.length();
    let values_len = values.length();

    for i in 0..strings_len {
        let s = strings.get(i).as_string().unwrap_or_default();

        if i < values_len {
            // ── Check if this position is a binding (preceded by @ . ?) ──
            if let Some((bind_type, bind_name)) = detect_binding(&s) {
                let suffix = match bind_type {
                    "event" => format!("@{}=", bind_name),
                    "property" => format!(".{}=", bind_name),
                    "bool" => format!("?{}=", bind_name),
                    _ => unreachable!(),
                };

                // Append string part without the binding suffix
                output.push_str(&s[..s.len() - suffix.len()]);

                // Generate unique marker
                let marker = format!(
                    "b{}",
                    BINDING_ID.with(|id| {
                        let mut id = id.borrow_mut();
                        let cur = *id;
                        *id += 1;
                        cur
                    })
                );

                output.push_str(&format!("data-baex=\"{}\"", marker));

                let binding = Object::new();
                Reflect::set(&binding, &"marker".into(), &marker.into()).unwrap();
                Reflect::set(&binding, &"type".into(), &bind_type.into()).unwrap();
                Reflect::set(
                    &binding,
                    &"valueIdx".into(),
                    &JsValue::from_f64(i as f64),
                )
                .unwrap();

                match bind_type {
                    "event" => {
                        Reflect::set(
                            &binding,
                            &"eventName".into(),
                            &bind_name.into(),
                        )
                        .unwrap();
                    }
                    "property" => {
                        Reflect::set(
                            &binding,
                            &"propName".into(),
                            &bind_name.into(),
                        )
                        .unwrap();
                    }
                    "bool" => {
                        Reflect::set(
                            &binding,
                            &"attrName".into(),
                            &bind_name.into(),
                        )
                        .unwrap();
                    }
                    _ => {}
                }

                result_bindings.push(&binding);
            } else {
                // ── Text content: emit string, resolve value ──
                output.push_str(&s);
                let value = values.get(i);
                resolve_text_value(&value, &mut output, &result_bindings, 0);
            }
        } else {
            // ── Last string part (no corresponding value) ──
            output.push_str(&s);
        }
    }

    let result = Object::new();
    Reflect::set(&result, &"html".into(), &output.into()).unwrap();
    Reflect::set(&result, &"bindings".into(), &result_bindings).unwrap();
    result.into()
}

/// Reset binding counter (useful for tests / HMR)
#[wasm_bindgen]
pub fn reset_binding_counter() {
    BINDING_ID.with(|id| *id.borrow_mut() = 0);
}

// ── Component Property Helpers ──────────────────────────────────────

#[wasm_bindgen]
pub fn resolve_observed_attributes(props: JsValue) -> js_sys::Array {
    use js_sys::{Array, Object, Reflect};
    let attrs = Array::new();
    let entries = Object::entries(&Object::from(props));
    for i in 0..entries.length() {
        let entry = entries.get(i);
        let key = Reflect::get(&entry, &0u32.into())
            .ok()
            .and_then(|v| v.as_string())
            .unwrap_or_default();
        let decl = Reflect::get(&entry, &1u32.into()).ok();
        let attr_val = decl.as_ref().and_then(|d| {
            Reflect::get(d, &"attribute".into()).ok()
        });
        let attr_name = match attr_val {
            Some(v) if v.is_undefined() || v.is_null() => None,
            Some(v) if v.as_bool() == Some(true) => Some(key.to_lowercase()),
            Some(v) if v.as_bool() == Some(false) => continue,
            Some(v) => v.as_string(),
            None => Some(key.to_lowercase()),
        };
        if let Some(name) = attr_name.or_else(|| Some(key.to_lowercase())) {
            attrs.push(&name.into());
        }
    }
    attrs
}

/// Serialize a property value to an attribute string (or null to remove)
#[wasm_bindgen]
pub fn serialize_property(value: JsValue, type_name: Option<String>) -> JsValue {
    if value.is_null() || value.is_undefined() {
        return JsValue::NULL;
    }
    match type_name.as_deref() {
        Some("boolean") => {
            if value.is_truthy() {
                JsValue::from_str("")
            } else {
                JsValue::NULL
            }
        }
        Some("object") | Some("array") => {
            if let Ok(s) = js_sys::JSON::stringify(&value) {
                s.into()
            } else {
                JsValue::NULL
            }
        }
        _ => JsValue::from_str(&js_to_string(&value)),
    }
}

/// Deserialize an attribute string to a property value
#[wasm_bindgen]
pub fn deserialize_property(
    value: Option<String>,
    type_name: Option<String>,
) -> JsValue {
    let value = match value {
        Some(v) => v,
        None => return JsValue::UNDEFINED,
    };
    match type_name.as_deref() {
        Some("number") => {
            let n: f64 = value.parse().unwrap_or(f64::NAN);
            if n.is_nan() {
                value.into()
            } else {
                n.into()
            }
        }
        Some("boolean") => {
            (value != "false").into()
        }
        Some("object") | Some("array") => {
            js_sys::JSON::parse(&value).unwrap_or(JsValue::from_str(&value))
        }
        _ => value.into(),
    }
}

// ── Global API Registration ────────────────────────────────────────

#[wasm_bindgen]
pub fn register_globals() {
    use js_sys::Reflect;
    let window = match window() {
        Some(w) => w,
        None => return,
    };

    let bind = |name: &str, val: &JsValue| {
        let _ = Reflect::set(&window, &name.into(), val);
    };

    bind("wasm_registered", &JsValue::from_bool(true));
}

// ── Tests ───────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use wasm_bindgen_test::*;

    // ── Pure function tests (no WASM needed during build) ──────────

    #[test]
    fn test_escape_html_noop() {
        assert_eq!(escape_html("hello world"), "hello world");
        assert_eq!(escape_html("abc123"), "abc123");
        assert_eq!(escape_html(""), "");
    }

    #[test]
    fn test_escape_html_ampersand() {
        assert_eq!(escape_html("a&b"), "a&amp;b");
        assert_eq!(escape_html("&&"), "&amp;&amp;");
    }

    #[test]
    fn test_escape_html_angle_brackets() {
        assert_eq!(escape_html("<div>"), "&lt;div&gt;");
        assert_eq!(escape_html("<script>alert(1)</script>"), "&lt;script&gt;alert(1)&lt;/script&gt;");
    }

    #[test]
    fn test_escape_html_quotes() {
        assert_eq!(escape_html("\"quoted\""), "&quot;quoted&quot;");
        assert_eq!(escape_html("'single'"), "&#039;single&#039;");
    }

    #[test]
    fn test_escape_html_all() {
        assert_eq!(escape_html("<a href=\"test&co\">"), "&lt;a href=&quot;test&amp;co&quot;&gt;");
    }

    #[test]
    fn test_detect_binding_event() {
        assert_eq!(detect_binding("@click="), Some(("event", "click")));
        assert_eq!(detect_binding("@mouseenter="), Some(("event", "mouseenter")));
        assert_eq!(detect_binding("@keydown="), Some(("event", "keydown")));
    }

    #[test]
    fn test_detect_binding_property() {
        assert_eq!(detect_binding(".value="), Some(("property", "value")));
        assert_eq!(detect_binding(".className="), Some(("property", "className")));
    }

    #[test]
    fn test_detect_binding_bool() {
        assert_eq!(detect_binding("?hidden="), Some(("bool", "hidden")));
        assert_eq!(detect_binding("?disabled="), Some(("bool", "disabled")));
    }

    #[test]
    fn test_detect_binding_edge_cases() {
        assert_eq!(detect_binding(""), None);
        assert_eq!(detect_binding("a"), None);
        assert_eq!(detect_binding("=value"), None);
        assert_eq!(detect_binding("click="), None);
        assert_eq!(detect_binding("@="), None);
        assert_eq!(detect_binding("@123="), Some(("event", "123")));
        assert_eq!(detect_binding("@data_value="), Some(("event", "data_value")));
    }

    #[test]
    fn test_detect_binding_multiple_suffixes() {
        // Only the last @ . ? before = counts
        assert_eq!(detect_binding("class @click="), Some(("event", "click")));
        assert_eq!(detect_binding("nested.value .prop="), Some(("property", "prop")));
    }

    // ── WASM runtime tests ─────────────────────────────────────────

    #[wasm_bindgen_test]
    fn test_js_to_string_various() {
        assert_eq!(js_to_string(&JsValue::NULL), "");
        assert_eq!(js_to_string(&JsValue::UNDEFINED), "");
        assert_eq!(js_to_string(&"hello".into()), "hello");
        assert_eq!(js_to_string(&42.0.into()), "42");
        assert_eq!(js_to_string(&true.into()), "true");
        assert_eq!(js_to_string(&false.into()), "false");
    }

    #[wasm_bindgen_test]
    fn test_is_template_result() {
        let obj = js_sys::Object::new().into();
        assert!(!is_template_result(&obj));

        // Create a proper TemplateResult-like object
        let tr = js_sys::Object::new();
        js_sys::Reflect::set(&tr, &"html".into(), &"<p>Hi</p>".into()).unwrap();
        js_sys::Reflect::set(&tr, &"bindings".into(), &js_sys::Array::new()).unwrap();
        assert!(is_template_result(&tr.into()));

        // Missing one property
        let partial = js_sys::Object::new();
        js_sys::Reflect::set(&partial, &"html".into(), &"<p>Hi</p>".into()).unwrap();
        assert!(!is_template_result(&partial.into()));
    }

    #[wasm_bindgen_test]
    fn test_is_signal_like() {
        let obj = js_sys::Object::new().into();
        assert!(!is_signal_like(&obj));

        // Signal has .value but NOT .html + .bindings
        let sig = js_sys::Object::new();
        js_sys::Reflect::set(&sig, &"value".into(), &42.into()).unwrap();
        assert!(is_signal_like(&sig.into()));

        // TemplateResult should NOT be signal-like
        let tr = js_sys::Object::new();
        js_sys::Reflect::set(&tr, &"html".into(), &"<p>Hi</p>".into()).unwrap();
        js_sys::Reflect::set(&tr, &"bindings".into(), &js_sys::Array::new()).unwrap();
        assert!(!is_signal_like(&tr.into()));
    }

    #[wasm_bindgen_test]
    fn test_signal_create_get_set() {
        reset_binding_counter();
        create_signal("test_sig".into(), "initial".into());
        let val = get_signal("test_sig".into());
        assert_eq!(val.as_string(), Some("initial".into()));

        set_signal("test_sig".into(), "updated".into());
        let val = get_signal("test_sig".into());
        assert_eq!(val.as_string(), Some("updated".into()));
    }

    #[wasm_bindgen_test]
    fn test_signal_on_change() {
        let key = "change_sig";
        create_signal(key.into(), 0.into());
        let results = js_sys::Array::new();
        let results_clone = results.clone();

        let cb_fn = {
            let cb = Closure::<dyn Fn(JsValue)>::new(move |v| {
                results_clone.push(&v);
            });
            let f = cb.as_ref().unchecked_ref::<js_sys::Function>().clone();
            cb.forget();
            f
        };
        on_signal_change(key.into(), cb_fn);

        set_signal(key.into(), 1.into());
        set_signal(key.into(), 2.into());

        assert_eq!(results.length(), 2);
        assert_eq!(results.get(0).as_f64(), Some(1.0));
        assert_eq!(results.get(1).as_f64(), Some(2.0));
    }

    #[wasm_bindgen_test]
    fn test_process_template_simple_text() {
        reset_binding_counter();
        let strings = js_sys::Array::new();
        strings.push(&"<div>".into());
        strings.push(&"</div>".into());
        let values = js_sys::Array::new();
        values.push(&"hello".into());

        let result = process_template(strings.into(), values.into());
        let html = js_sys::Reflect::get(&result, &"html".into())
            .unwrap()
            .as_string()
            .unwrap();
        assert_eq!(html, "<div>hello</div>");
    }

    #[wasm_bindgen_test]
    fn test_process_template_event_binding() {
        reset_binding_counter();
        let strings = js_sys::Array::new();
        strings.push(&JsValue::from("<button @click="));
        strings.push(&JsValue::from(">Click</button>"));
        let values = js_sys::Array::new();
        let handler = js_sys::Function::new_no_args("return 42");
        values.push(&handler.into());

        let result = process_template(strings.into(), values.into());
        let html = js_sys::Reflect::get(&result, &"html".into())
            .unwrap()
            .as_string()
            .unwrap();
        assert!(html.contains("data-baex=\"b0\""));
        assert!(!html.contains("@click="));

        let bindings = js_sys::Reflect::get(&result, &"bindings".into()).unwrap();
        let bindings = js_sys::Array::from(&bindings);
        assert_eq!(bindings.length(), 1);
        let b = bindings.get(0);
        assert_eq!(
            js_sys::Reflect::get(&b, &"type".into()).unwrap().as_string(),
            Some("event".into())
        );
        assert_eq!(
            js_sys::Reflect::get(&b, &"eventName".into())
                .unwrap()
                .as_string(),
            Some("click".into())
        );
    }

    #[wasm_bindgen_test]
    fn test_process_template_property_binding() {
        reset_binding_counter();
        let strings = js_sys::Array::new();
        strings.push(&JsValue::from("<input .value="));
        strings.push(&JsValue::from(">"));
        let values = js_sys::Array::new();
        values.push(&JsValue::from("hello"));

        let result = process_template(strings.into(), values.into());
        let bindings = js_sys::Array::from(
            &js_sys::Reflect::get(&result, &"bindings".into()).unwrap(),
        );
        assert_eq!(bindings.length(), 1);
        let b = bindings.get(0);
        assert_eq!(
            js_sys::Reflect::get(&b, &"type".into()).unwrap().as_string(),
            Some("property".into())
        );
        assert_eq!(
            js_sys::Reflect::get(&b, &"propName".into())
                .unwrap()
                .as_string(),
            Some("value".into())
        );
        assert_eq!(
            js_sys::Reflect::get(&b, &"valueIdx".into())
                .unwrap()
                .as_f64(),
            Some(0.0)
        );
    }

    #[wasm_bindgen_test]
    fn test_process_template_bool_binding() {
        reset_binding_counter();
        let strings = js_sys::Array::new();
        strings.push(&"<div ?hidden=".into());
        strings.push(&">text</div>".into());
        let values = js_sys::Array::new();
        values.push(&true.into());

        let result = process_template(strings.into(), values.into());
        let bindings = js_sys::Array::from(
            &js_sys::Reflect::get(&result, &"bindings".into()).unwrap(),
        );
        assert_eq!(bindings.length(), 1);
        let b = bindings.get(0);
        assert_eq!(
            js_sys::Reflect::get(&b, &"type".into()).unwrap().as_string(),
            Some("bool".into())
        );
        assert_eq!(
            js_sys::Reflect::get(&b, &"attrName".into())
                .unwrap()
                .as_string(),
            Some("hidden".into())
        );
    }

    #[wasm_bindgen_test]
    fn test_process_template_html_escaping() {
        reset_binding_counter();
        let strings = js_sys::Array::new();
        strings.push(&"<p>".into());
        strings.push(&"</p>".into());
        let values = js_sys::Array::new();
        values.push(&"<script>alert(1)</script>".into());

        let result = process_template(strings.into(), values.into());
        let html = js_sys::Reflect::get(&result, &"html".into())
            .unwrap()
            .as_string()
            .unwrap();
        assert_eq!(
            html,
            "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>"
        );
    }

    #[wasm_bindgen_test]
    fn test_process_template_nested_template_result() {
        reset_binding_counter();

        // Create a nested TemplateResult: { html: "<span>inner</span>", bindings: [] }
        let inner = js_sys::Object::new();
        js_sys::Reflect::set(&inner, &"html".into(), &"<span>inner</span>".into())
            .unwrap();
        js_sys::Reflect::set(
            &inner,
            &"bindings".into(),
            &js_sys::Array::new(),
        )
        .unwrap();

        let strings = js_sys::Array::new();
        strings.push(&"<div>".into());
        strings.push(&"</div>".into());
        let values = js_sys::Array::new();
        values.push(&inner.into());

        let result = process_template(strings.into(), values.into());
        let html = js_sys::Reflect::get(&result, &"html".into())
            .unwrap()
            .as_string()
            .unwrap();
        assert_eq!(html, "<div><span>inner</span></div>");
    }

    #[wasm_bindgen_test]
    fn test_process_template_signal_wrapping() {
        reset_binding_counter();

        // Create signal-like object
        let sig = js_sys::Object::new();
        js_sys::Reflect::set(&sig, &"value".into(), &"resolved".into()).unwrap();

        let strings = js_sys::Array::new();
        strings.push(&"<p>".into());
        strings.push(&"</p>".into());
        let values = js_sys::Array::new();
        values.push(&sig.into());

        let result = process_template(strings.into(), values.into());
        let html = js_sys::Reflect::get(&result, &"html".into())
            .unwrap()
            .as_string()
            .unwrap();
        assert_eq!(html, "<p>resolved</p>");
    }

    #[wasm_bindgen_test]
    fn test_process_template_array_of_strings() {
        reset_binding_counter();

        let items = js_sys::Array::new();
        items.push(&"a".into());
        items.push(&"b".into());
        items.push(&"c".into());

        let strings = js_sys::Array::new();
        strings.push(&"<ul><li>".into());
        strings.push(&"</li></ul>".into());
        let values = js_sys::Array::new();
        values.push(&items.into());

        let result = process_template(strings.into(), values.into());
        let html = js_sys::Reflect::get(&result, &"html".into())
            .unwrap()
            .as_string()
            .unwrap();
        assert_eq!(html, "<ul><li>abc</li></ul>");
    }

    #[wasm_bindgen_test]
    fn test_process_template_mixed_content() {
        reset_binding_counter();

        let strings = js_sys::Array::new();
        strings.push(&"<button @click=".into());
        strings.push(&" .disabled=".into());
        strings.push(&">".into());
        strings.push(&"</button>".into());

        let values = js_sys::Array::new();
        values.push(&js_sys::Function::new_no_args("").into()); // event handler
        values.push(&true.into()); // property value
        values.push(&"Click me".into()); // text

        let result = process_template(strings.into(), values.into());
        let html = js_sys::Reflect::get(&result, &"html".into())
            .unwrap()
            .as_string()
            .unwrap();
        assert!(html.contains("data-baex=\"b0\""));
        assert!(html.contains("data-baex=\"b1\""));
        assert!(html.contains(">Click me</button>"));

        let bindings = js_sys::Array::from(
            &js_sys::Reflect::get(&result, &"bindings".into()).unwrap(),
        );
        assert_eq!(bindings.length(), 2);
    }

    #[wasm_bindgen_test]
    fn test_serialize_deserialize_string() {
        // String round-trip
        let serialized = serialize_property("hello".into(), None);
        assert_eq!(serialized.as_string(), Some("hello".into()));

        let deserialized = deserialize_property(Some("hello".into()), None);
        assert_eq!(deserialized.as_string(), Some("hello".into()));
    }

    #[wasm_bindgen_test]
    fn test_serialize_deserialize_number() {
        let serialized = serialize_property(42.into(), Some("number".into()));
        assert_eq!(serialized.as_string(), Some("42".into()));

        let deserialized = deserialize_property(Some("42".into()), Some("number".into()));
        assert_eq!(deserialized.as_f64(), Some(42.0));

        // NaN passthrough
        let nan = deserialize_property(Some("notanumber".into()), Some("number".into()));
        assert_eq!(nan.as_string(), Some("notanumber".into()));
    }

    #[wasm_bindgen_test]
    fn test_serialize_deserialize_boolean() {
        // true → ""
        let serialized_true = serialize_property(true.into(), Some("boolean".into()));
        assert_eq!(serialized_true.as_string(), Some("".into()));

        // false → null
        let serialized_false = serialize_property(false.into(), Some("boolean".into()));
        assert!(serialized_false.is_null());

        // "" → true
        let deserialized_true = deserialize_property(Some("".into()), Some("boolean".into()));
        assert_eq!(deserialized_true.as_bool(), Some(true));

        // "false" → false
        let deserialized_false = deserialize_property(Some("false".into()), Some("boolean".into()));
        assert_eq!(deserialized_false.as_bool(), Some(false));

        // any other string → true
        let deserialized_any = deserialize_property(Some("yes".into()), Some("boolean".into()));
        assert_eq!(deserialized_any.as_bool(), Some(true));
    }

    #[wasm_bindgen_test]
    fn test_serialize_deserialize_object() {
        let obj = js_sys::Object::new();
        js_sys::Reflect::set(&obj, &"foo".into(), &"bar".into()).unwrap();

        let serialized = serialize_property(obj.into(), Some("object".into()));
        assert_eq!(serialized.as_string(), Some("{\"foo\":\"bar\"}".into()));

        let deserialized = deserialize_property(Some("{\"foo\":\"bar\"}".into()), Some("object".into()));
        let foo = js_sys::Reflect::get(&deserialized, &"foo".into())
            .unwrap()
            .as_string();
        assert_eq!(foo, Some("bar".into()));
    }

    #[wasm_bindgen_test]
    fn test_resolve_observed_attributes() {
        let props = js_sys::Object::new();

        // name: { } → attr "name"
        let decl_name = js_sys::Object::new();
        js_sys::Reflect::set(&props, &"name".into(), &decl_name).unwrap();

        // count: { type: Number } → attr "count"
        let decl_count = js_sys::Object::new();
        js_sys::Reflect::set(&decl_count, &"type".into(), &"number".into()).unwrap();
        js_sys::Reflect::set(&props, &"count".into(), &decl_count).unwrap();

        // internal: { attribute: false } → skipped
        let decl_internal = js_sys::Object::new();
        js_sys::Reflect::set(&decl_internal, &"attribute".into(), &false.into()).unwrap();
        js_sys::Reflect::set(&props, &"internal".into(), &decl_internal).unwrap();

        // custom: { attribute: "data-custom" } → attr "data-custom"
        let decl_custom = js_sys::Object::new();
        js_sys::Reflect::set(&decl_custom, &"attribute".into(), &"data-custom".into()).unwrap();
        js_sys::Reflect::set(&props, &"custom".into(), &decl_custom).unwrap();

        let attrs = resolve_observed_attributes(props.into());
        let attr0 = attrs.get(0).as_string().unwrap();
        let attr1 = attrs.get(1).as_string().unwrap();
        let attr2 = attrs.get(2).as_string().unwrap();

        let mut attr_set: Vec<String> = vec![attr0, attr1, attr2];
        attr_set.sort();
        assert_eq!(attr_set, vec!["count", "data-custom", "name"]);
    }

    #[wasm_bindgen_test]
    fn test_serialize_deserialize_number_edge_cases() {
        // Infinity
        let inf = f64::INFINITY;
        let serialized = serialize_property(inf.into(), Some("number".into()));
        assert_eq!(serialized.as_string(), Some("Infinity".into()));

        let deserialized = deserialize_property(Some("Infinity".into()), Some("number".into()));
        assert_eq!(deserialized.as_f64(), Some(f64::INFINITY));

        // Negative Infinity
        let neg_inf = f64::NEG_INFINITY;
        let serialized_neg = serialize_property(neg_inf.into(), Some("number".into()));
        assert_eq!(serialized_neg.as_string(), Some("-Infinity".into()));

        let deserialized_neg = deserialize_property(Some("-Infinity".into()), Some("number".into()));
        assert_eq!(deserialized_neg.as_f64(), Some(f64::NEG_INFINITY));
    }

    #[wasm_bindgen_test]
    fn test_component_state_isolation() {
        let cid1 = register_component();
        let cid2 = register_component();

        update_component_property(cid1, "foo".into(), "bar1".into());
        update_component_property(cid2, "foo".into(), "bar2".into());

        assert_eq!(get_component_property(cid1, "foo".into()).as_string(), Some("bar1".into()));
        assert_eq!(get_component_property(cid2, "foo".into()).as_string(), Some("bar2".into()));
    }

    #[wasm_bindgen_test]
    fn test_deeply_nested_template_results() {
        // Create a chain of 15 nested TemplateResults (should hit the depth limit of 10)
        let mut current = js_sys::Object::new();
        js_sys::Reflect::set(&current, &"html".into(), &"base".into()).unwrap();
        js_sys::Reflect::set(&current, &"bindings".into(), &js_sys::Array::new()).unwrap();
        let mut current_js = current.into();

        for _ in 0..15 {
            let wrapper = js_sys::Object::new();
            js_sys::Reflect::set(&wrapper, &"html".into(), &"wrap ".into()).unwrap();
            let bindings = js_sys::Array::new();
            bindings.push(&current_js);
            js_sys::Reflect::set(&wrapper, &"bindings".into(), &bindings).unwrap();
            current_js = wrapper.into();
        }

        let strings = js_sys::Array::new();
        strings.push(&"<div>".into());
        strings.push(&"</div>".into());
        let values = js_sys::Array::new();
        values.push(&current_js);

        let result = process_template(strings.into(), values.into());
        let html = js_sys::Reflect::get(&result, &"html".into())
            .unwrap()
            .as_string()
            .unwrap();
        
        // It should stop at depth 10 and not crash
        assert!(html.contains("wrap"));
    }

    #[wasm_bindgen_test]
    fn test_process_template_null_undefined_values() {
        reset_binding_counter();

        let strings = js_sys::Array::new();
        strings.push(&"<p>".into());
        strings.push(&"</p>".into());

        let values_null = js_sys::Array::new();
        values_null.push(&JsValue::NULL);
        let result = process_template(strings.clone().into(), values_null.into());
        let html = js_sys::Reflect::get(&result, &"html".into())
            .unwrap()
            .as_string()
            .unwrap();
        assert_eq!(html, "<p></p>");

        let values_undef = js_sys::Array::new();
        values_undef.push(&JsValue::UNDEFINED);
        let result = process_template(strings.into(), values_undef.into());
        let html = js_sys::Reflect::get(&result, &"html".into())
            .unwrap()
            .as_string()
            .unwrap();
        assert_eq!(html, "<p></p>");
    }
}
