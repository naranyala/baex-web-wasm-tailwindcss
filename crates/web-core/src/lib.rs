use wasm_bindgen::prelude::*;
use web_sys::window;

pub mod blueprint;
pub mod component;
pub mod serialize;
pub mod signal;
pub mod state;
pub mod template;
pub mod util;

// Re-exports for wasm_bindgen
pub use component::*;
pub use serialize::*;
pub use signal::*;
pub use template::*;

#[wasm_bindgen]
pub fn register_globals() {
    let window = match window() {
        Some(w) => w,
        None => return,
    };

    let bind = |name: &str, val: &JsValue| {
        let _ = js_sys::Reflect::set(&window, &name.into(), val);
    };

    bind("wasm_registered", &JsValue::from_bool(true));
}

#[cfg(test)]
mod tests {
    use super::*;
    use wasm_bindgen_test::*;
    use crate::util::*;
    use crate::signal::*;
    use crate::template::*;
    use crate::serialize::*;
    use crate::component::*;

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
        assert_eq!(util::detect_binding("@click="), Some(("event", "click")));
        assert_eq!(util::detect_binding("@mouseenter="), Some(("event", "mouseenter")));
        assert_eq!(util::detect_binding("@keydown="), Some(("event", "keydown")));
    }

    #[test]
    fn test_detect_binding_event_modifiers() {
        assert_eq!(util::detect_binding("@click.prevent="), Some(("event", "click.prevent")));
        assert_eq!(util::detect_binding("@submit.prevent.stop="), Some(("event", "submit.prevent.stop")));
        assert_eq!(util::detect_binding("@keydown.enter="), Some(("event", "keydown.enter")));
    }

    #[test]
    fn test_detect_binding_property() {
        assert_eq!(util::detect_binding(".value="), Some(("property", "value")));
        assert_eq!(util::detect_binding(".className="), Some(("property", "className")));
    }

    #[test]
    fn test_detect_binding_bool() {
        assert_eq!(util::detect_binding("?hidden="), Some(("bool", "hidden")));
        assert_eq!(util::detect_binding("?disabled="), Some(("bool", "disabled")));
    }

    #[test]
    fn test_detect_binding_edge_cases() {
        assert_eq!(util::detect_binding(""), None);
        assert_eq!(util::detect_binding("a"), None);
        assert_eq!(util::detect_binding("=value"), None);
        assert_eq!(util::detect_binding("click="), None);
        assert_eq!(util::detect_binding("@="), None);
        assert_eq!(util::detect_binding("@123="), Some(("event", "123")));
        assert_eq!(util::detect_binding("@data_value="), Some(("event", "data_value")));
    }

    #[test]
    fn test_detect_binding_multiple_suffixes() {
        assert_eq!(util::detect_binding("class @click="), Some(("event", "click")));
        assert_eq!(util::detect_binding("nested.value .prop="), Some(("property", "prop")));
    }

    #[wasm_bindgen_test]
    fn test_parse_event_modifiers() {
        let (name, mods) = util::parse_event_modifiers("click");
        assert_eq!(name, "click");
        assert_eq!(mods.len(), 0);

        let (name, mods) = util::parse_event_modifiers("click.prevent");
        assert_eq!(name, "click");
        assert_eq!(mods, vec!["prevent"]);

        let (name, mods) = util::parse_event_modifiers("submit.prevent.stop");
        assert_eq!(name, "submit");
        assert_eq!(mods, vec!["prevent", "stop"]);
    }

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

        let tr = js_sys::Object::new();
        js_sys::Reflect::set(&tr, &"html".into(), &"<p>Hi</p>".into()).unwrap();
        js_sys::Reflect::set(&tr, &"bindings".into(), &js_sys::Array::new()).unwrap();
        assert!(is_template_result(&tr.into()));

        let partial = js_sys::Object::new();
        js_sys::Reflect::set(&partial, &"html".into(), &"<p>Hi</p>".into()).unwrap();
        assert!(!is_template_result(&partial.into()));
    }

    #[wasm_bindgen_test]
    fn test_is_signal_like() {
        let obj = js_sys::Object::new().into();
        assert!(!is_signal_like(&obj));

        let sig = js_sys::Object::new();
        js_sys::Reflect::set(&sig, &"value".into(), &42.into()).unwrap();
        assert!(is_signal_like(&sig.into()));

        let tr = js_sys::Object::new();
        js_sys::Reflect::set(&tr, &"html".into(), &"<p>Hi</p>".into()).unwrap();
        js_sys::Reflect::set(&tr, &"bindings".into(), &js_sys::Array::new()).unwrap();
        assert!(!is_signal_like(&tr.into()));
    }

    #[wasm_bindgen_test]
    fn test_signal_create_get_set() {
        reset_binding_counter();
        create_signal("test_sig".into(), "initial".into(), None);
        let val = get_signal("test_sig".into(), None);
        assert_eq!(val.as_string(), Some("initial".into()));

        set_signal("test_sig".into(), "updated".into(), None);
        let val = get_signal("test_sig".into(), None);
        assert_eq!(val.as_string(), Some("updated".into()));
    }

    #[wasm_bindgen_test]
    fn test_signal_on_change() {
        let key = "change_sig";
        create_signal(key.into(), 0.into(), None);
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
        on_signal_change(key.into(), cb_fn, None);

        set_signal(key.into(), 1.into(), None);
        set_signal(key.into(), 2.into(), None);

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

        let nan = deserialize_property(Some("notanumber".into()), Some("number".into()));
        assert_eq!(nan.as_string(), Some("notanumber".into()));
    }

    #[wasm_bindgen_test]
    fn test_serialize_deserialize_boolean() {
        let serialized_true = serialize_property(true.into(), Some("boolean".into()));
        assert_eq!(serialized_true.as_string(), Some("".into()));

        let serialized_false = serialize_property(false.into(), Some("boolean".into()));
        assert!(serialized_false.is_null());

        let deserialized_true = deserialize_property(Some("".into()), Some("boolean".into()));
        assert_eq!(deserialized_true.as_bool(), Some(true));

        let deserialized_false = deserialize_property(Some("false".into()), Some("boolean".into()));
        assert_eq!(deserialized_false.as_bool(), Some(false));

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

        let decl_name = js_sys::Object::new();
        js_sys::Reflect::set(&props, &"name".into(), &decl_name).unwrap();

        let decl_count = js_sys::Object::new();
        js_sys::Reflect::set(&decl_count, &"type".into(), &"number".into()).unwrap();
        js_sys::Reflect::set(&props, &"count".into(), &decl_count).unwrap();

        let decl_internal = js_sys::Object::new();
        js_sys::Reflect::set(&decl_internal, &"attribute".into(), &false.into()).unwrap();
        js_sys::Reflect::set(&props, &"internal".into(), &decl_internal).unwrap();

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
        let inf = f64::INFINITY;
        let serialized = serialize_property(inf.into(), Some("number".into()));
        assert_eq!(serialized.as_string(), Some("Infinity".into()));

        let deserialized = deserialize_property(Some("Infinity".into()), Some("number".into()));
        assert_eq!(deserialized.as_f64(), Some(f64::INFINITY));

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
