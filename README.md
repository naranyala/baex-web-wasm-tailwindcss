# Wasm Browser API Extended (BAEX)

![bee-holding-axe](./bee-holding-axe.jpg)

A high-performance web framework bridging Rust/WASM state management with a reactive TypeScript frontend.

## Vision & Architecture

BAEX is designed as a **WASM-Brain Framework**. It splits the responsibilities of a modern UI library into two specialized layers:

- **The Brain (Rust/WASM)**: Acts as the single source of truth. It manages state stores, computes property diffs, and processes template logic. It is purely computational and has no knowledge of the DOM.
- **The Heart (TypeScript)**: A thin orchestration layer that maps WASM state changes to DOM mutations. It handles the component lifecycle and applies "patches" to the UI.
- **The Body (Custom Elements)**: Self-contained UI units. By extending `BaexElement`, components gain automatic synchronization with the WASM Brain.

This separation ensures that the most expensive operations (diffing and state management) run at near-native speed in Rust, while the UI remains flexible and standards-compliant using Web Components.

## Feature Set

### ✅ Current Capabilities (Stable)

#### ⚡ Core Reactivity
- **WASM-Backed State**: Component properties are synchronized in real-time with a Rust registry.
- **Dual-Slot State**:
  - `properties`: Reactive fields that can reflect to HTML attributes.
  - `state`: Reactive fields used for internal UI logic (no attribute reflection).
- **Batched Updates**: Multiple state changes are coalesced into a single microtask re-render.
- **Global Signals**: A `Signal<T>` system for cross-component state sharing, bridged via WASM.
- **Auto-Cleanup**: `this.track()` primitive for automatic signal unsubscription during component destruction.

#### 🎨 Template Engine (`html` tag)
- **Reactive Bindings**:
  - `@event`: Direct event listener attachment.
  - `.property`: Direct JS property updates (bypassing attributes).
  - `?bool`: Boolean attribute toggling.
- **Advanced Content**:
  - `Raw()`: Safe injection of unescaped HTML (e.g., for Shiki highlighting).
  - **Recursion**: Support for nested `TemplateResult` and dynamic array mappings.
  - **Declarative Logic**: `when()` helper for conditional rendering without nested ternaries.

#### 🛠 Component Lifecycle
- **Lifecycle Hooks**: `onConnected`, `onDisconnected`, and `onUpdate` for side-effect management.
- **Deferred Execution**: `whenUpdate()` callback for logic that must run after the DOM has been patched.
- **Safe Registration**: `defineComponent` utility with duplicate registration guards.

### 🚧 In Development (Upcoming)

#### Tier 1: Structural Refinement
- **The Blueprint System**: Replacing `innerHTML` with a structural "Blueprint" tree to enable true virtual-dom-like targeted updates.
- **O(1) NodeMap**: Replacing `querySelector` with direct DOM references for near-instant property patching.
- **Typed BaexBridge**: Moving from `window` globals to a strictly typed `BaexBridge` API for JS ↔ WASM communication.

#### Tier 2: Conceptual Evolution
- **Unified Reactivity**: Merging properties and signals into a single reactive primitive.
- **Local Component Stores**: Typed, scoped state stores for complex component data.
- **Declarative Routing**: A `<baex-route>` primitive for built-in view and tab management.

## Setup

Install the dependencies:

```bash
bun install
```

## Get started

Start the dev server, and the app will be available at [http://localhost:3000](http://localhost:3000).

```bash
bun run dev
```

Build the app for production:

```bash
bun run build
```

Preview the production build locally:

```bash
bun run preview
```

## Framework Architecture V2 (The Rewrite)

The BAEX framework has been re-engineered from a basic wrapper to a professional reactive primitive to solve performance and stability issues.

### The Problem (V1)
V1 relied on `innerHTML` for rendering and `querySelector` for bindings. This caused:
- **Destructive Updates**: Every state change destroyed and recreated the entire DOM subtree.
- **Fragile Bindings**: $O(n)$ search for markers (`data-baex`) on every render.
- **State Shadowing**: JS class fields shadowed prototype getters/setters, breaking reactivity.

### The Solution (V2)
V2 introduces a **Blueprint $\rightarrow$ NodeMap $\rightarrow$ Patch** cycle.

1. **Blueprint (TS)**: The `html` tag now creates a structured blueprint (cloned template) rather than a string.
2. **NodeMap (TS)**: Direct references to dynamic DOM nodes are stored during the first render, enabling $O(1)$ updates.
3. **State Store (Rust)**: The "Source of Truth" is moved to a type-safe Rust registry. Rust computes a `PatchSet` (the diff) of changed properties.
4. **Targeted Patching**: The framework applies the `PatchSet` directly to the `NodeMap`, updating only the affected DOM elements without touching the rest of the tree.

This architecture ensures zero-loss of input focus, high-performance rendering, and rock-solid reactivity.

## Learn more

To learn more about Rsbuild, check out the following resources:

- [Rsbuild documentation](https://rsbuild.rs) - explore Rsbuild features and APIs.
- [Rsbuild GitHub repository](https://github.com/web-infra-dev/rsbuild) - your feedback and contributions are welcome!
