use std::cell::RefCell;
use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use crate::component::ComponentState;

thread_local! {
    pub static SIGNAL_VALUES: RefCell<HashMap<String, JsValue>> = RefCell::new(HashMap::new());
    pub static SIGNAL_SUBSCRIBERS: RefCell<HashMap<String, Vec<js_sys::Function>>> = RefCell::new(HashMap::new());
    pub static SCOPED_SIGNAL_VALUES: RefCell<HashMap<u32, HashMap<String, JsValue>>> = RefCell::new(HashMap::new());
    pub static SCOPED_SIGNAL_SUBSCRIBERS: RefCell<HashMap<u32, HashMap<String, Vec<js_sys::Function>>>> = RefCell::new(HashMap::new());
    pub static BINDING_ID: RefCell<u32> = RefCell::new(0);
    pub static COMPONENT_ID_COUNTER: RefCell<u32> = RefCell::new(0);
    pub static COMPONENT_STATE: RefCell<HashMap<u32, ComponentState>> = RefCell::new(HashMap::new());
}
