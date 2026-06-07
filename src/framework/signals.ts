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

export function setScheduler(s: (fn: () => void) => void) {
  scheduler = s;
}

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

  subscribe(cb: (v: T) => void): () => void {
    this._subscribers.add(cb);
    return () => this._subscribers.delete(cb);
  }

  destroy() {
    this._dispose();
    this._subscribers.clear();
  }
}

// ── Watch ───────────────────────────────────────────────────────────
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

  get value(): T {
    trackSignal(this);
    return this._value;
  }

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

  peek(): T {
    return this._value;
  }

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

  get key(): string {
    return this._key;
  }
}

let signalCounter = 0;
const signalCache = new Map<string, Signal>();

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

export function getSignal<T>(key: string, cid: number | null = null): Signal<T> | undefined {
  if (cid === null) {
    return signalCache.get(key) as Signal<T> | undefined;
  }
  return undefined;
}

export type { SignalSubscriber };

// ── Hooks API ────────────────────────────────────────────────────

export function useSignal<T>(key: string, initial: T): Signal<T> {
  return createSignal(key, initial, currentRenderingComponentId);
}

export function useComputed<T>(fn: () => T): Computed<T> {
  return new Computed(fn);
}

export function useEffect(fn: EffectFn, deps: unknown[] = []): () => void {
  return effect(fn);
}

