use wasm_bindgen::prelude::*;
use crate::state::*;

/// Creates a new signal with an initial value. 
/// 
/// Signals can be global (when `cid` is `None`) or scoped to a specific component 
/// (when `cid` is `Some`). If the signal already exists, the initial value is ignored.
/// 
/// @param key The unique identifier for the signal.
/// @param initial The initial value to assign to the signal.
/// @param cid Optional component ID for scoping.
/// @returns The initial value of the signal.
#[wasm_bindgen]
pub fn create_signal(key: String, initial: JsValue, cid: Option<u32>) -> JsValue {
    if let Some(cid) = cid {
        SCOPED_SIGNAL_VALUES.with(|store| {
            store.borrow_mut().entry(cid).or_default().entry(key.clone()).or_insert_with(|| initial.clone());
        });
        SCOPED_SIGNAL_SUBSCRIBERS.with(|store| {
            store.borrow_mut().entry(cid).or_default().entry(key).or_default();
        });
    } else {
        SIGNAL_VALUES.with(|store| {
            store.borrow_mut().entry(key.clone()).or_insert_with(|| initial.clone());
        });
        SIGNAL_SUBSCRIBERS.with(|store| {
            store.borrow_mut().entry(key).or_default();
        });
    }
    initial
}

/// Retrieves the current value of a signal by its key.
/// 
/// @param key The unique identifier for the signal.
/// @param cid Optional component ID for scoping.
/// @returns The current value of the signal, or `undefined` if not found.
#[wasm_bindgen]
pub fn get_signal(key: String, cid: Option<u32>) -> JsValue {
    if let Some(cid) = cid {
        SCOPED_SIGNAL_VALUES.with(|store| {
            store.borrow().get(&cid)
                .and_then(|comp_store| comp_store.get(&key).cloned())
                .unwrap_or(JsValue::UNDEFINED)
        })
    } else {
        SIGNAL_VALUES.with(|store| {
            store.borrow().get(&key).cloned().unwrap_or(JsValue::UNDEFINED)
        })
    }
}

/// Updates the value of a signal and notifies all registered subscribers.
/// 
/// @param key The unique identifier for the signal.
/// @param value The new value to set.
/// @param cid Optional component ID for scoping.
#[wasm_bindgen]
pub fn set_signal(key: String, value: JsValue, cid: Option<u32>) {
    if let Some(cid) = cid {
        SCOPED_SIGNAL_VALUES.with(|store| {
            store.borrow_mut().entry(cid).or_default().insert(key.clone(), value.clone());
        });
        SCOPED_SIGNAL_SUBSCRIBERS.with(|store| {
            let store = store.borrow();
            if let Some(comp_subs) = store.get(&cid) {
                if let Some(callbacks) = comp_subs.get(&key) {
                    for callback in callbacks {
                        let _ = callback.call1(&JsValue::UNDEFINED, &value);
                    }
                }
            }
        });
    } else {
        SIGNAL_VALUES.with(|store| {
            store.borrow_mut().insert(key.clone(), value.clone());
        });
        SIGNAL_SUBSCRIBERS.with(|store| {
            let store = store.borrow();
            if let Some(callbacks) = store.get(&key) {
                for callback in callbacks {
                    let _ = callback.call1(&JsValue::UNDEFINED, &value);
                }
            }
        });
    }
}

/// Registers a callback function to be executed whenever the specified signal changes.
/// 
/// @param key The unique identifier for the signal.
/// @param callback The function to invoke on change.
/// @param cid Optional component ID for scoping.
#[wasm_bindgen]
pub fn on_signal_change(key: String, callback: js_sys::Function, cid: Option<u32>) {
    if let Some(cid) = cid {
        SCOPED_SIGNAL_SUBSCRIBERS.with(|store| {
            store.borrow_mut().entry(cid).or_default().entry(key).or_default().push(callback);
        });
    } else {
        SIGNAL_SUBSCRIBERS.with(|store| {
            store.borrow_mut().entry(key).or_default().push(callback);
        });
    }
}
