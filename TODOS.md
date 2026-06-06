# TODOs for BAEX Framework Maturity

## Architecture
- [ ] Transition `NodeMap` from DOM markers (`data-baex`) to internal object references to ensure resilience against DOM tampering.
- [ ] Implement structural Blueprint diffing in the Rust layer to handle dynamic node additions/removals more efficiently.
- [ ] Develop an atomic "Batched Action" interface for synchronized JS-to-Rust state updates.
- [ ] Explore build-time Blueprint generation to offload template parsing from the runtime.

## Performance
- [ ] Optimize `PatchSet` application to avoid `BindingSet` iteration; move to direct reference mapping.
- [ ] Benchmark cross-boundary serialization/deserialization to identify potential bottlenecks.

## Developer Experience
- [ ] Replace `defineComponent` with a `@customElement` decorator.
- [ ] Unify property/state management using `@property` and `@state` decorators exclusively.
