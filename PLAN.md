# Plan: Integrate Rust/Cargo Wasm Build Pipeline

## Overview
Integrate a Rust/Cargo Wasm build pipeline into the existing Rsbuild project using `rsbuild-plugin-wasmpack`. This will allow building Rust code as a Wasm module and importing it seamlessly in the frontend.

## Proposed Changes

### 1. Structure
Create a new directory `crates/` to host Rust projects.
```text
/
├── crates/
│   └── web-core/        # Example Rust crate
│       ├── Cargo.toml
│       └── src/
│           └── lib.rs
├── package.json
├── rsbuild.config.ts
└── ...
```

### 2. Implementation Steps
1.  **Initialize Rust Crate:**
    - Create `crates/web-core/`.
    - Initialize Cargo project: `cargo init --lib crates/web-core`.
    - Add `wasm-bindgen` to `crates/web-core/Cargo.toml`.
2.  **Update Frontend Dependencies:**
    - Install `rsbuild-plugin-wasmpack` as a development dependency.
3.  **Configure Rsbuild:**
    - Update `rsbuild.config.ts` to include `pluginWasmPack` and point to `crates/web-core/`.
4.  **TypeScript Integration:**
    - Ensure TypeScript can handle the imported Wasm module types (usually via `wasm-bindgen` generated types).

## Verification Plan
- Verify that `npm run build` successfully builds both the frontend and the Rust Wasm module.
- Create a simple test (e.g., calling a Rust function from `src/index.ts`) to confirm Wasm loading works.

## Prerequisites
- Rust and `wasm-pack` installed on the system (I will assume they are available or provide installation instructions).
