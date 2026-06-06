type SignalSubscriber = (value: unknown) => void;

export class Signal<T = unknown> {
  private _key: string;
  private _value: T;

  constructor(key: string, initial: T) {
    this._key = key;
    this._value = initial;
    if (typeof window.createSignal === 'function') {
      window.createSignal(key, initial);
    }
  }

  get value(): T {
    return this._value;
  }

  set value(v: T) {
    this._value = v;
    if (typeof window.setSignal === 'function') {
      window.setSignal(this._key, v);
    }
  }

  peek(): T {
    return this._value;
  }

  subscribe(cb: SignalSubscriber): () => void {
    let subscribed = true;
    if (typeof window.onSignalChange === 'function') {
      const wasmCb = (val: unknown) => {
        if (subscribed) cb(val);
      };
      window.onSignalChange(this._key, wasmCb);
    }
    return () => {
      subscribed = false;
    };
  }

  get key(): string {
    return this._key;
  }
}

let signalCounter = 0;
const signalCache = new Map<string, Signal>();

export function createSignal<T>(key: string | null, initial: T): Signal<T> {
  const actualKey = key ?? `__signal_${++signalCounter}`;
  if (signalCache.has(actualKey)) {
    return signalCache.get(actualKey) as Signal<T>;
  }
  const signal = new Signal<T>(actualKey, initial);
  signalCache.set(actualKey, signal);
  return signal;
}

export function getSignal<T>(key: string): Signal<T> | undefined {
  return signalCache.get(key) as Signal<T> | undefined;
}

export type { SignalSubscriber };
