use js_sys::{Array, Object, Reflect};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BlueprintNodeType {
    Text,
    Element,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BlueprintAttribute {
    pub name: String,
    pub value: String,
    pub is_dynamic: bool,
    pub is_key: bool,
    pub marker: Option<String>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BlueprintNode {
    pub node_type: BlueprintNodeType,
    pub tag: Option<String>,
    pub text_content: Option<String>,
    pub attributes: Vec<BlueprintAttribute>,
    pub children: Vec<BlueprintNode>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Blueprint {
    pub root: BlueprintNode,
    pub version: String,
    pub raw_html: String,
}

pub fn build_blueprint_tree(html: &str, _bindings_array: &Array) -> (Blueprint, Vec<(String, usize)>) {
    let blueprint = Blueprint {
        root: BlueprintNode {
            node_type: BlueprintNodeType::Text,
            tag: None,
            text_content: Some(html.to_string()),
            attributes: vec![],
            children: vec![],
        },
        version: "1.0".to_string(),
        raw_html: html.to_string(),
    };
    (blueprint, vec![])
}

pub fn bind_markers_to_node_paths(
    bindings: &Array,
    node_indices: &[(String, usize)],
) {
    for i in 0..bindings.length() {
        let b = bindings.get(i);
        if let Ok(marker) = Reflect::get(&b, &"marker".into()) {
            if let Some(marker_str) = marker.as_string() {
                if let Some((_, node_idx)) = node_indices.iter().find(|(m, _)| *m == marker_str) {
                    let _ = Reflect::set(&b, &"nodeIdx".into(), &JsValue::from_f64(*node_idx as f64));
                }
            }
        }
    }
}
