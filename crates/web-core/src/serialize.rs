use js_sys::{Array, Object, Reflect};
use wasm_bindgen::prelude::*;
use crate::util::js_to_string;

#[wasm_bindgen]
pub fn resolve_observed_attributes(props: JsValue) -> js_sys::Array {
    let attrs = Array::new();
    
    let keys = Reflect::own_keys(&props).unwrap();
    
    for i in 0..keys.length() {
        let key_val = keys.get(i);
        let key = key_val.as_string().unwrap_or_default();
        
        let decl = Reflect::get(&props, &key_val).ok();
        let attr_val = decl.as_ref().and_then(|d| {
            Reflect::get(d, &"attribute".into()).ok()
        });
        let attr_name = match attr_val {
            Some(v) if v.is_undefined() || v.is_null() => Some(key.to_lowercase()),
            Some(v) if v.as_bool() == Some(true) => Some(key.to_lowercase()),
            Some(v) if v.as_bool() == Some(false) => continue,
            Some(v) => v.as_string(),
            None => Some(key.to_lowercase()),
        };
        if let Some(name) = attr_name {
            attrs.push(&name.into());
        }
    }
    attrs
}

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
