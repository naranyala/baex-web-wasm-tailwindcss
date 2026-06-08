type SignalSubscriber = (value: unknown) => void;
type CleanupFn = () => void;
type EffectFn = () => void | CleanupFn;

import { currentRenderingComponentId } from './baex-element';

// ── Effect tracking stack ───────────────────────────────────────────
let activeEffect: EffectFn | null = null;
const signalDependencies = new Map<EffectFn, Set<Signal>>();
const effectCleanups = new Map<EffectFn, CleanupFn>();


function trackSignal(signal: Signal) {
  if (activeEffect) {
    let deps = signalDependencies.get(activeEffect);
    if (!deps) {
      deps = new Set();
      signalDependencies.set(activeEffect, deps);
    }
    deps.add(signal);
  }
}

function runEffect(fn: EffectFn) {
  const prev = activeEffect;
  activeEffect = fn;

  // Run cleanup from previous run
  const prevCleanup = effectCleanups.get(fn);
  if (prevCleanup) prevCleanup();

  const cleanup = fn();
  if (cleanup) effectCleanups.set(fn, cleanup);
  activeEffect = prev;
}

let scheduler: (fn: () => void) => void = (fn) => queueMicrotask(fn);

/**
 * Configures the scheduler used to trigger reactive effects.
 * By default, effects are scheduled as microtasks using `queueMicrotask`.
 * 
 * @param s The scheduler function that accepts a task to be executed.
 */
export function setScheduler(s: (fn: () => void) => void) {
  scheduler = s;
}

/**
 * Creates an auto-tracking reactive effect.
 * 
 * The effect function will be executed immediately and will re-run whenever any 
 * signal it accesses is updated.
 * 
 * @param fn The effect function. Can return a cleanup function.
 * @returns A function to dispose of the effect and stop tracking.
 */
export function effect(fn: EffectFn): () => void {
  const wrapped: EffectFn = () => {
    signalDependencies.set(wrapped, new Set());
    const prev = activeEffect;
    activeEffect = wrapped;
    const prevCleanup = effectCleanups.get(wrapped);
    if (prevCleanup) prevCleanup();
    const cleanup = fn();
    if (cleanup) effectCleanups.set(wrapped, cleanup);
    activeEffect = prev;
  };

  runEffect(wrapped);

  return () => {
    signalDependencies.delete(wrapped);
    const c = effectCleanups.get(wrapped);
    if (c) c();
    effectCleanups.delete(wrapped);
  };
}

// ── Computed (derived signal) ───────────────────────────────────────
/**
 * A derived signal that automatically updates when its dependencies change.
 * 
 * Computed values are cached and only re-calculated when a signal they 
 * depend on is updated.
 */
export class Computed<T = unknown> {
  private _fn: () => T;
  private _cached: T | undefined;
  private _dirty = true;
  private _subscribers = new Set<(v: T) => void>();
  private _dispose: () => void;
  private _error: unknown = null;

  constructor(fn: () => T) {
    this._fn = fn;
    this._dispose = effect(() => {
      this._dirty = true;
      this._error = null;
      try {
        this._cached = this._fn();
      } catch (e) {
        this._error = e;
      }
      if (!this._dirty) return;
      this._dirty = false;
      this._subscribers.forEach((cb) => cb(this._cached as T));
    });
  }

  /**
   * The current value of the computed signal. Accessing this property 
   * registers this computed signal as a dependency of the current active effect.
   */
  get value(): T {
    trackSignal(this as unknown as Signal);
    if (this._dirty) {
      this._error = null;
      try {
        this._cached = this._fn();
        this._dirty = false;
      } catch (e) {
        this._error = e;
        throw e;
      }
    }
    if (this._error) throw this._error;
    return this._cached as T;
  }

  /**
   * Retrieves the current value without registering a dependency.
   */
  peek(): T {
    if (this._dirty) {
      this._error = null;
      try {
        this._cached = this._fn();
        this._dirty = false;
      } catch (e) {
        this._error = e;
        throw e;
      }
    }
    if (this._error) throw this._error;
    return this._cached as T;
  }

  /**
   * Registers a callback to be executed when the computed value changes.
   * 
   * @param cb The callback function receiving the new value.
   * @returns A function to unsubscribe from changes.
   */
  subscribe(cb: (v: T) => void): () => void {
    this._subscribers.add(cb);
    return () => this._subscribers.delete(cb);
  }

  /**
   * Disposes of the computed signal and its internal effect.
   */
  destroy() {
    this._dispose();
    this._subscribers.clear();
  }
}

// ── Watch ───────────────────────────────────────────────────────────
/**
 * Watches a source function and executes a callback whenever the result changes.
 * 
 * @param source A function that returns the value to watch.
 * @param callback The callback to execute on change.
 * @param options Configuration options (e.g., `immediate` to run immediately).
 * @returns A function to stop watching.
 */
export function watch<T>(
  source: () => T,
  callback: (value: T, oldValue: T | undefined) => void,
  options?: { immediate?: boolean },
): () => void {
  let oldValue: T | undefined;
  if (options?.immediate) {
    oldValue = undefined;
  }
  return effect(() => {
    const newValue = source();
    if (oldValue !== undefined) {
      callback(newValue, oldValue);
    }
    oldValue = newValue;
  });
}

// ── Signal (unchanged but with effect tracking) ─────────────────────
/**
 * The fundamental unit of reactivity in the framework.
 * 
 * A Signal holds a value and notifies all dependent effects or subscribers 
 * when that value is updated.
 */
export class Signal<T = unknown> {
  private _key: string;
  private _value: T;
  private _cid: number | null;
  private _tsSubscribers = new Set<EffectFn>();

  constructor(key: string, initial: T, cid: number | null = null) {
    this._key = key;
    this._value = initial;
    this._cid = cid;
    if (typeof window.createSignal === 'function') {
      window.createSignal(key, initial, cid);
    }
  }

  /**
   * The current value of the signal. Accessing this property 
   * registers this signal as a dependency of the current active effect.
   */
  get value(): T {
    trackSignal(this);
    return this._value;
  }

  /**
   * Updates the signal value and triggers all dependent effects and subscribers.
   */
  set value(v: T) {
    if (this._value === v) return;
    this._value = v;
    if (typeof window.setSignal === 'function') {
      window.setSignal(this._key, v, this._cid);
    }
    // Notify TS-level effect subscribers
    this._tsSubscribers.forEach((fn) => {
      scheduler(() => runEffect(fn));
    });
  }

  /**
   * Retrieves the current value without registering a dependency.
   */
  peek(): T {
    return this._value;
  }

  /**
   * Registers a callback to be executed whenever the signal value changes.
   * 
   * @param cb The callback function receiving the new value.
   * @returns A function to unsubscribe from changes.
   */
  subscribe(cb: SignalSubscriber): () => void {
    let subscribed = true;
    const effectFn: EffectFn = () => {
      if (subscribed) cb(this._value);
    };
    this._tsSubscribers.add(effectFn);
    if (typeof window.onSignalChange === 'function') {
      const wasmCb = (val: unknown) => {
        if (subscribed) cb(val);
      };
      window.onSignalChange(this._key, wasmCb, this._cid);
    }
    return () => {
      subscribed = false;
      this._tsSubscribers.delete(effectFn);
    };
  }

  /**
   * The unique key used to identify the signal in the global or component store.
   */
  get key(): string {
    return this._key;
  }
}

let signalCounter = 0;
const signalCache = new Map<string, Signal>();

/**
 * Factory function to create a new signal.
 * 
 * If a key is not provided, a unique auto-generated key is used.
 * If `cid` is `null`, the signal is stored globally.
 * 
 * @param key Unique identifier for the signal.
 * @param initial Initial value.
 * @param cid Optional component ID for scoping.
 * @returns A new Signal instance.
 */
export function createSignal<T>(key: string | null, initial: T, cid: number | null = null): Signal<T> {
  const actualKey = key ?? `__signal_${++signalCounter}`;
  if (cid === null && signalCache.has(actualKey)) {
    return signalCache.get(actualKey) as Signal<T>;
  }
  const signal = new Signal<T>(actualKey, initial, cid);
  if (cid === null) {
    signalCache.set(actualKey, signal);
  }
  return signal;
}

/**
 * Retrieves an existing global signal by its key.
 * 
 * @param key Unique identifier of the signal.
 * @param cid Optional component ID. If provided, this function currently returns undefined.
 * @returns The Signal instance if found, otherwise undefined.
 */
export function getSignal<T>(key: string, cid: number | null = null): Signal<T> | undefined {
  if (cid === null) {
    return signalCache.get(key) as Signal<T> | undefined;
  }
  return undefined;
}

export type { SignalSubscriber };

// ── Hooks API ────────────────────────────────────────────────────

/**
 * Hook to create a signal scoped to the current rendering component.
 * 
 * @param key Unique identifier for the signal.
 * @param initial Initial value.
 * @returns A scoped Signal instance.
 */
export function useSignal<T>(key: string, initial: T): Signal<T> {
  return createSignal(key, initial, currentRenderingComponentId);
}

/**
 * Hook to create a computed signal within the current component.
 * 
 * @param fn Computation function that returns a derived value.
 * @returns A Computed signal instance.
 */
export function useComputed<T>(fn: () => T): Computed<T> {
  return new Computed(fn);
}

/**
 * Hook to create a reactive effect within the current component.
 * 
 * @param fn The effect function.
 * @param deps Optional dependency array (not currently implemented in this version).
 * @returns A function to dispose of the effect.
 */
export function useEffect(fn: EffectFn, deps: unknown[] = []): () => void {
  return effect(fn);
}
