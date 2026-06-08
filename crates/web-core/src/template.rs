use js_sys::{Array, Object, Reflect};
use wasm_bindgen::prelude::*;
use crate::util::{log_debug, detect_binding, parse_event_modifiers, resolve_text_value};
use crate::blueprint::{build_blueprint_tree, bind_markers_to_node_paths};
use crate::state::BINDING_ID;

#[wasm_bindgen]
pub fn process_template(strings: JsValue, values: JsValue) -> JsValue {
    log_debug("Phase 1: Starting process_template");

    let strings = Array::from(&strings);
    let values = Array::from(&values);

    let mut output = String::new();
    let result_bindings = Array::new();

    let strings_len = strings.length();
    let values_len = values.length();

    for i in 0..strings_len {
        let s = strings.get(i).as_string().unwrap_or_default();

        if i < values_len {
            log_debug(&format!("Phase 2: Processing segment {}/{}", i, strings_len));
            if let Some((bind_type, bind_name)) = detect_binding(&s) {
                log_debug(&format!("Phase 3: Detected binding {} on {}", bind_type, bind_name));
                let suffix = match bind_type {
                    "event" => format!("@{}=", bind_name),
                    "property" => format!(".{}=", bind_name),
                    "bool" => format!("?{}=", bind_name),
                    _ => unreachable!(),
                };

                output.push_str(&s[..s.len() - suffix.len()]);

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
                        let (event_name, modifiers) = parse_event_modifiers(bind_name);
                        Reflect::set(&binding, &"eventName".into(), &event_name.into()).unwrap();
                        if !modifiers.is_empty() {
                            let mod_arr = Array::new();
                            for m in &modifiers {
                                mod_arr.push(&(*m).into());
                            }
                            Reflect::set(&binding, &"modifiers".into(), &mod_arr.into()).unwrap();
                        }
                    }
                    "property" => {
                        Reflect::set(&binding, &"propName".into(), &bind_name.into()).unwrap();
                    }
                    "bool" => {
                        Reflect::set(&binding, &"attrName".into(), &bind_name.into()).unwrap();
                    }
                    _ => {}
                }

                result_bindings.push(&binding);
            } else {
                output.push_str(&s);
                let value = values.get(i);
                resolve_text_value(&value, &mut output, &result_bindings, 0);
            }
        } else {
            output.push_str(&s);
        }
    }

    log_debug("Phase 4: Finalizing TemplateResult and Blueprint");
    
    let result = Object::new();
    Reflect::set(&result, &"html".into(), &output.clone().into()).unwrap();
    Reflect::set(&result, &"bindings".into(), &result_bindings).unwrap();
    
    // IR Layer 1: Blueprint (html5ever tree parsing)
    let (blueprint, node_indices) = build_blueprint_tree(&output, &result_bindings);
    
    if let Ok(bp_js) = serde_wasm_bindgen::to_value(&blueprint) {
        Reflect::set(&result, &"blueprint".into(), &bp_js).unwrap();
    }
    
    // Map binding markers to their tree node indices
    bind_markers_to_node_paths(&result_bindings, &node_indices);
    
    result.into()
}

#[wasm_bindgen]
pub fn reset_binding_counter() {
    BINDING_ID.with(|id| *id.borrow_mut() = 0);
}
