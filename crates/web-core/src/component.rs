use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use crate::state::*;

pub struct ComponentState {
    pub values: HashMap<String, JsValue>,
    pub changed: HashMap<String, JsValue>,
}

impl ComponentState {
    pub fn new() -> Self {
        Self {
            values: HashMap::new(),
            changed: HashMap::new(),
        }
    }
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
    COMPONENT_STATE.with(|state| {
        let state = state.borrow();
        let result = js_sys::Object::new();
        if let Some(comp) = state.get(&cid) {
            for (name, value) in &comp.changed {
                js_sys::Reflect::set(&result, &name.into(), value).unwrap();
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
    SCOPED_SIGNAL_VALUES.with(|store| {
        store.borrow_mut().remove(&cid);
    });
    SCOPED_SIGNAL_SUBSCRIBERS.with(|store| {
        store.borrow_mut().remove(&cid);
    });
}
