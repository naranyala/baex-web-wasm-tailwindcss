# AGENTS.md

You are an expert in JavaScript, Rsbuild, and web application development. You write maintainable, performant, and accessible code.

## Commands

- `bun run dev` - Start the dev server
- `bun run build` - Build the app for production
- `bun run preview` - Preview the production build locally
- `bun run test` - Run the test suite (vitest)
- `bun run test:wasm` - Run Rust/WASM unit tests

## Test Suite

Tests live in `src/tests/` and run with Vitest in a happy-dom environment against the real Rust/WASM core.

| File | Coverage |
|---|---|
| `template.test.ts` | `html` / `css` tagged templates, escaping, event/property/bool bindings |
| `signals.test.ts` | `Signal` class, `createSignal`, `getSignal`, subscribe/unsubscribe |
| `baex-element.test.ts` | `BaexElement` lifecycle, reactivity, bindings, `whenUpdate` |
| `baex-nav.test.ts` | Dynamic tab manager: render, open, close, switch view |
| `nav.test.ts` | `Raw()` template handling, nested templates |
| `accordion.test.ts` | Accordion toggle behavior, `BaexCodeBlock`-shaped DOM updates |
| `index.test.ts` | `defineComponent` registration and idempotency |
| `integration.test.ts` | End-to-end JS ↔ WASM bridge (template engine, signals, serialization) |
| `stress.test.ts` | Batched updates, mass mount/unmount, deep nesting, complex types |

## Docs

- Rsbuild: https://rsbuild.rs/llms.txt
- Rspack: https://rspack.rs/llms.txt

## Tools

### Biome

- Run `bun run lint` to lint your code
- Run `bun run format` to format your code
