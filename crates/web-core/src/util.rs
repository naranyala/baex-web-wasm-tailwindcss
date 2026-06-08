use wasm_bindgen::prelude::*;

static DEBUG: bool = true;

pub fn log_debug(msg: &str) {
    if DEBUG {
        web_sys::console::log_1(&JsValue::from_str(&format!("[BAEX-DEBUG] {}", msg)));
    }
}

pub fn escape_html(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#039;")
}

pub fn js_to_string(val: &JsValue) -> String {
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
    if is_signal_like(val) {
        if let Ok(v) = js_sys::Reflect::get(val, &"value".into()) {
            return js_to_string(&v);
        }
    }
    String::new()
}


pub fn is_template_result(val: &JsValue) -> bool {
    if !val.is_object() {
        return false;
    }
    let has_html =
        js_sys::Reflect::has(val, &JsValue::from_str("html")).unwrap_or(false);
    let has_bindings =
        js_sys::Reflect::has(val, &JsValue::from_str("bindings")).unwrap_or(false);
    has_html && has_bindings
}

pub fn is_signal_like(val: &JsValue) -> bool {
    if !val.is_object() {
        return false;
    }
    if is_template_result(val) {
        return false;
    }
    js_sys::Reflect::has(val, &JsValue::from_str("value")).unwrap_or(false)
}

pub fn detect_binding(s: &str) -> Option<(&'static str, &str)> {
    if !s.ends_with('=') {
        return None;
    }
    let before_eq = &s[..s.len() - 1];
    
    for (i, c) in before_eq.char_indices().rev() {
        if c == '@' || c == '.' || c == '?' {
            let name = &before_eq[i + 1..];
            if name.is_empty() {
                return None;
            }
            return match c {
                '@' => Some(("event", name)),
                '.' => Some(("property", name)),
                '?' => Some(("bool", name)),
                _ => unreachable!(),
            };
        } else if !c.is_alphanumeric() && c != '_' && c != '.' {
            return None;
        }
    }
    None
}

pub fn parse_event_modifiers(name: &str) -> (&str, Vec<&str>) {
    let parts: Vec<&str> = name.split('.').collect();
    if parts.len() <= 1 {
        return (name, vec![]);
    }
    (parts[0], parts[1..].to_vec())
}

pub fn resolve_text_value(
    value: &JsValue,
    output: &mut String,
    bindings: &js_sys::Array,
    depth: u32,
) {
    if depth > 10 {
        return;
    }

    if value.is_null() || value.is_undefined() {
        return;
    }

    if is_template_result(value) {
        if let Ok(html_val) = js_sys::Reflect::get(value, &"html".into()) {
            if let Some(html_str) = html_val.as_string() {
                output.push_str(&html_str);
            }
        }
        if let Ok(bindings_val) = js_sys::Reflect::get(value, &"bindings".into()) {
            let nested = js_sys::Array::from(&bindings_val);
            for j in 0..nested.length() {
                bindings.push(&nested.get(j));
            }
        }
        return;
    }

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

    if js_sys::Array::is_array(value) {
        let arr = js_sys::Array::from(value);
        for j in 0..arr.length() {
            resolve_text_value(&arr.get(j), output, bindings, depth + 1);
        }
        return;
    }

    if is_signal_like(value) {
        log_debug(&format!("Detected signal: {:?}", value));
        let marker = format!(
            "t{}",
            crate::state::BINDING_ID.with(|id| {
                let mut id = id.borrow_mut();
                let cur = *id;
                *id += 1;
                cur
            })
        );

        let val_str = js_to_string(value);
        output.push_str(&format!(
            "<span data-baex=\"{}\">{}</span>",
            marker,
            escape_html(&val_str)
        ));

        let binding = js_sys::Object::new();
        js_sys::Reflect::set(&binding, &"marker".into(), &marker.into()).unwrap();
        js_sys::Reflect::set(&binding, &"type".into(), &"text".into()).unwrap();
        js_sys::Reflect::set(&binding, &"valueIdx".into(), &JsValue::from_f64(0.0)).unwrap();

        bindings.push(&binding);
        return;
    }

    output.push_str(&escape_html(&js_to_string(value)));
}

