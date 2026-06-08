use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use crate::state::*;

/// Internal state tracker for a single component instance.
pub struct ComponentState {
    /// The current values of all properties for this component.
    pub values: HashMap<String, JsValue>,
    /// A tracking map of properties that have changed since the last sync.
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

/// Generates and returns a unique identifier for a new component instance.
/// 
/// This ID should be stored by the JavaScript wrapper to identify the component's 
/// state during property updates or cleanup.
/// 
/// @returns A unique 32-bit unsigned integer component ID.
#[wasm_bindgen]
pub fn register_component() -> u32 {
    COMPONENT_ID_COUNTER.with(|id| {
        let mut id = id.borrow_mut();
        let cur = *id;
        *id += 1;
        cur
    })
}

/// Updates a specific property for a component and tracks the change.
/// 
/// If the new value is different from the current value, the property is marked 
/// as changed and the function returns `true`.
/// 
/// @param cid The unique component ID.
/// @param name The name of the property to update.
/// @param value The new value to assign.
/// @returns `true` if the value was actually changed, `false` otherwise.
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

/// Retrieves the current value of a property for a specific component instance.
/// 
/// @param cid The unique component ID.
/// @param name The name of the property to retrieve.
/// @returns The property value, or `undefined` if the component or property doesn't exist.
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

/// Returns an object containing all properties that have changed for the component.
/// 
/// This is typically used by the renderer to determine which parts of the DOM 
/// need to be patched.
/// 
/// @param cid The unique component ID.
/// @returns A JavaScript object where keys are property names and values are the previous values.
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

/// Clears the list of changed properties for a component.
/// 
/// This should be called after the renderer has successfully applied the 
/// changes to the DOM to reset the change tracker.
/// 
/// @param cid The unique component ID.
#[wasm_bindgen]
pub fn clear_component_changed_properties(cid: u32) {
    COMPONENT_STATE.with(|state| {
        let mut state = state.borrow_mut();
        if let Some(comp) = state.get_mut(&cid) {
            comp.changed.clear();
        }
    });
}

/// Completely removes a component and all its associated state.
/// 
/// This cleans up component properties, scoped signal values, and scoped subscribers 
/// to prevent memory leaks.
/// 
/// @param cid The unique component ID to remove.
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
