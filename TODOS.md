# BAEX Framework Rewrite TODOs

## Phase 0: DX & Stability (Quick Wins)
- [ ] **Automatic Subscription Cleanup**
    - [ ] Implement `this.track(signal, callback)` in `BaexElement` to auto-unsubscribe in `disconnectedCallback`.
- [ ] **Local Reactive State**
    - [ ] Add `state` property slot to `BaexElement` to allow reactive fields that don't reflect to attributes.
- [ ] **Template Fragments**
    - [ ] Implement a `<when cond={...}>` primitive to replace nested ternaries in `render()`.
- [ ] **Enhanced Templates**
    - [ ] Add `html.attr(name, value)` to avoid string-concatenating `Raw` content in attribute bindings.

## Phase 1: Structural Overhaul (Core Architecture)
- [ ] **Implement Blueprint System**
    - [ ] Replace `innerHTML` strings with a `Blueprint` (frozen tree of nodes + bindings).
    - [ ] Implement recursive template resolution for nested `TemplateResult` and arrays.
    - [ ] Integrate `Raw` content handling into the Blueprint phase to avoid XSS escaping.
- [ ] **Implement Node Mapping**
    - [ ] Create a `NodeMap` in `BaexElement` to store direct references to dynamic DOM nodes.
    - [ ] Replace `querySelector` bindings with $O(1)$ NodeMap lookups.
- [ ] **Refactor Rendering Lifecycle**
    - [ ] Split `render()` into `createBlueprint()` (once) and `patch()` (on update).
    - [ ] Implement targeted update logic using the `PatchSet` from Rust.
- [ ] **Typed Bridge Protocol**
    - [ ] Replace the flat `window.*` global API with a single typed `BaexBridge` object.
    - [ ] Define strict TS interfaces for all JS ↔ WASM communication.

## Phase 2: Rust State Provider (WASM Engine)
- [ ] **Re-engineer State Store**
    - [ ] Implement a centralized `ComponentRegistry` using `HashMap<ComponentId, ComponentState>`.
    - [ ] Use `BTreeMap` for `ComponentState` to maintain property order and efficient access.
- [ ] **Implement Diffing Engine**
    - [ ] Add "dirty" flags to properties to track changes.
    - [ ] Implement `getChangedProperties` to return a `PatchSet` (old value $\rightarrow$ new value).

## Phase 3: High-Level Primitives & Ecosystem
- [ ] **Reactive Stores**
    - [ ] Implement component-local stores with typed shapes (replacing module-level constants).
- [ ] **Unified Reactivity**
    - [ ] Merge Signals and Properties into a single reactive primitive.
    - [ ] Allow properties to be backed by signals via `{ source: signal }` declaration.
- [ ] **Declarative Routing**
    - [ ] Create a `<baex-route>` primitive for declarative view management.
    - [ ] Implement automatic tab management (open/close/switch) as a built-in framework feature.
- [ ] **Migration & Validation**
    - [ ] Migrate `AppElement` and `BaexCodeBlock` to the new Blueprint model.
    - [ ] Verify state retention (e.g., input focus) during view switches.
