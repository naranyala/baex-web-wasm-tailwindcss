use wasm_bindgen::prelude::*;
use crate::state::*;

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
