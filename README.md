# Wasm Browser API Extended (BAEX)

![bee-holding-axe](./bee-holding-axe.jpg)

A high-performance web framework bridging Rust/WASM state management with a reactive TypeScript frontend.

## Vision and Architecture

BAEX is designed as a WASM-Brain Framework. It splits the responsibilities of a modern UI library into two specialized layers:

- **The Brain (Rust/WASM)**: Acts as the single source of truth. It manages state stores, computes property diffs, and processes template logic. It is purely computational and has no knowledge of the DOM.
- **The Heart (TypeScript)**: A thin orchestration layer that maps WASM state changes to DOM mutations. It handles the component lifecycle and applies patches to the UI.
- **The Body (Custom Elements)**: Self-contained UI units. By extending BaexElement, components gain automatic synchronization with the WASM Brain.

This separation ensures that the most expensive operations (diffing and state management) run at near-native speed in Rust, while the UI remains flexible and standards-compliant using Web Components.

## Feature Set

### Current Capabilities (Stable)

#### Core Reactivity
- **WASM-Backed State**: Component properties are synchronized in real-time with a Rust registry.
- **Advanced Reactive Primitives**:
  - **Signals**: Global and Component-Scoped reactive state.
  - **Computed**: Auto-derived signals with lazy evaluation and caching.
  - **Effects**: Automatic side-effect tracking and execution.
  - **Watchers**: Explicit observation of signal changes with old/new value tracking.
- **Dual-Slot State**:
  - properties: Reactive fields that can reflect to HTML attributes.
  - state: Reactive fields used for internal UI logic (no attribute reflection).
- **Batched Updates**: Multiple state changes are coalesced into a single microtask re-render.
- **Auto-Cleanup**: this.track() primitive for automatic signal unsubscription during component destruction.

#### Template Engine (html tag)
- **Reactive Bindings**:
  - @event: Direct event listener attachment.
  - @event.modifier: Support for `.prevent`, `.stop`, `.stopImmediate`, `.self`, and `.once`.
  - .property: Direct JS property updates.
  - .ref=${fn}: Direct DOM element reference capturing.
  - ?bool: Boolean attribute toggling.
- **Advanced Content**:
  - Raw(): Safe injection of unescaped HTML.
  - **Recursion**: Support for nested TemplateResult and dynamic array mappings.
  - **Declarative Logic**: when() helper for conditional rendering.
- **Intermediate Representation (IR)**: Templates generate a Zod-validated Blueprint with a full HTML tree parsed via html5ever in WASM.

#### Component Lifecycle
- **Enhanced Lifecycle Hooks**: onBeforeMount, onConnected, onUpdate, onAfterUpdate, onBeforeUnmount, and onDisconnected.
- **Deferred Execution**: whenUpdate() callback for logic that must run after the DOM has been patched.
- **Error Boundaries**: Specialized wrapper to catch rendering errors and provide fallback UI.
- **Safe Registration**: defineComponent utility with duplicate registration guards.

### In Development (Upcoming)

#### Tier 1: Structural Refinement
- **Full Blueprint System**: Transitioning from partial structural metadata to a full tree parsing via html5ever to enable true virtual-dom-like targeted updates.
- **O(1) NodeMap**: Transitioning from querySelector-based initialization to direct DOM references via tree traversal for near-instant property patching.
- **Typed BaexBridge**: Moving from window globals to a strictly typed BaexBridge API for JS ↔ WASM communication.

#### Tier 2: Conceptual Evolution
- **Unified Reactivity**: Merging properties and signals into a single reactive primitive.
- **Local Component Stores**: Typed, scoped state stores for complex component data.
- **Declarative Routing**: A baex-route primitive for built-in view and tab management.

## Setup

Install the dependencies:

```bash
bun install
```

## Get started

Start the dev server:

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

## Framework Architecture: The Layered Model

BAEX is organized into three primary layers that separate computation, orchestration, and representation.

### 1. The Brain (Rust/WASM Core)
The computational engine where the "truth" resides.
- **State Registry**: A type-safe registry managing global signals and component-scoped properties.
- **IR Generator**: The `process_template` engine that transforms `html` tagged templates into a structural **Blueprint** (Intermediate Representation) and a **BindingSet**.
- **Diffing Engine**: Tracks mutations and generates a `PatchSet`—a minimal list of changed properties—to be sent to the frontend.

### 2. The Heart (TypeScript Orchestration)
The glue that connects the WASM Brain to the Browser DOM.
- **Lifecycle Manager (`BaexElement`)**: Orchestrates the component flow from `onBeforeMount` to `onDisconnected`.
- **The NodeMap**: A high-performance mapping of binding markers to actual DOM references, enabling **O(1) access** to dynamic elements.
- **Surgical Patching**: Instead of re-rendering the whole tree, the Heart applies the `PatchSet` directly to the `NodeMap`, updating only the affected attributes or text nodes.

### 3. The Body (Web Components/DOM)
The standards-compliant representation layer.
- **Custom Elements**: Self-contained UI units that extend `BaexElement`.
- **Reactive Bindings**: Uses markers (`data-baex`) during the first pass to identify "hot" zones in the DOM for future surgical updates.
- **Native Performance**: Leverages the browser's own DOM engine for rendering, ensuring maximum compatibility and accessibility.

## Deep Dive: The Reactive Cycle

To achieve near-native performance, BAEX avoids the traditional "Virtual DOM" diffing on the JS main thread. Instead, it follows this cycle:

1. **Compilation (WASM)**: When a template is defined, the Rust core parses it into a **Blueprint**. It identifies every dynamic part (bindings) and assigns them a unique marker.
2. **Hydration**: On the first render, the `BaexElement` injects the HTML. It then performs a single tree traversal to find all markers and stores the actual `HTMLElement` references in a `NodeMap`.
3. **Mutation Tracking**: When you update a property (e.g., `this.count++`), the setter notifies the Rust Brain. Rust marks this property as "dirty".
4. **Surgical Patching**: In the next microtask, the Heart asks Rust for the `PatchSet`. It looks up the affected elements in the `NodeMap` and updates only the specific attribute or text content. **No re-rendering of the HTML string occurs.**

## Known Limitations & Potential Flaws

As an experimental framework, BAEX has several architectural trade-offs and flaws currently being addressed:

### ⚠️ Structural Fragility
Currently, the "Surgical Patching" only works for attribute/text updates. If a state change requires adding or removing DOM nodes (e.g., a `when()` block toggling), the framework falls back to `innerHTML` re-rendering. This destroys the existing DOM subtree and loses input focus.

### ⚠️ The "First Pass" Overhead
The initial render relies on `innerHTML` followed by a DOM crawl to build the `NodeMap`. For extremely large components, this can cause a noticeable "jank" during the first mount.

### ⚠️ Boundary Crossing Cost
Every property read/write crosses the JS $\leftrightarrow$ WASM boundary. While significantly faster than pure JS diffing for complex state, the sheer volume of calls for simple components can introduce overhead.

### ⚠️ Marker Dependency
The `NodeMap` is built by scanning for `data-baex` attributes. If external JS libraries modify the DOM and remove these attributes, the framework's patching mechanism will break.

## Learn more

To learn more about Rsbuild, check out the following resources:

- [Rsbuild documentation](https://rsbuild.rs) - explore Rsbuild features and APIs.
- [Rsbuild GitHub repository](https://github.com/web-infra-dev/rsbuild) - your feedback and contributions are welcome!
