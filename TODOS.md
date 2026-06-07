# TODOs for BAEX Framework Maturity

## 🚀 Performance Roadmap (Priority)
- [x] **O(1) Node Resolution**: Replace `BindingSet` iteration with a flat `DOMNode[]` array indexed by the WASM `nodeIdx`.
- [ ] **Surgical DOM Patching**: Eliminate `innerHTML` fallbacks entirely; implement full tree-based patching using the `blueprint` and `nodeIdx` for structural changes (add/remove nodes).
- [ ] **AOT Template Compilation**: Build a compiler plugin to pre-parse templates into JS factory functions, removing the runtime `process_template` overhead.
- [ ] **Keyed Reconciliation**: Implement a diffing algorithm for lists using the `key` attribute to minimize DOM mutations.
- [ ] **Optimized Boundary Crossing**: Implement a shared memory buffer (SharedArrayBuffer) for state updates to reduce JS-WASM call overhead.

## Architecture
- [ ] Transition `NodeMap` from DOM markers (`data-baex`) to internal object references to ensure resilience against DOM tampering.
- [ ] Implement structural Blueprint diffing in the Rust layer to handle dynamic node additions/removals more efficiently.
- [ ] Develop an atomic "Batched Action" interface for synchronized JS-to-Rust state updates.

## Developer Experience
- [ ] Replace `defineComponent` with a `@customElement` decorator.
- [ ] Unify property/state management using `@property` and `@state` decorators exclusively.

