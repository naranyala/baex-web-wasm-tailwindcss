import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createSignal, getSignal, Signal } from '../framework/signals.js';
import { setupWasm } from './setup.js';

beforeAll(async () => {
  await setupWasm();
});

describe('Signal', () => {
  it('creates with initial value', () => {
    const s = new Signal('test1', 42);
    expect(s.value).toBe(42);
  });

  it('sets and gets value', () => {
    const s = new Signal('test2', 0);
    s.value = 100;
    expect(s.value).toBe(100);
  });

  it('peek returns current value without subscribing', () => {
    const s = new Signal('test_peek', 'initial');
    expect(s.peek()).toBe('initial');
    s.value = 'updated';
    expect(s.peek()).toBe('updated');
  });

  it('subscribe receives new values', () => {
    const s = new Signal('test_sub', 'a');
    const cb = vi.fn();
    s.subscribe(cb);
    s.value = 'b';
    expect(cb).toHaveBeenCalledWith('b');
  });

  it('subscribe returns unsubscribe function', () => {
    const s = new Signal('test_unsub', 0);
    const cb = vi.fn();
    const unsub = s.subscribe(cb);
    s.value = 1;
    expect(cb).toHaveBeenCalled();

    const callCount = cb.mock.calls.length;
    unsub();
    s.value = 2;
    s.value = 3;
    expect(cb).toHaveBeenCalledTimes(callCount);
  });

  it('multiple subscribers all receive updates', () => {
    const s = new Signal('test_multi', 0);
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    s.subscribe(cb1);
    s.subscribe(cb2);
    s.value = 99;
    expect(cb1).toHaveBeenCalledWith(99);
    expect(cb2).toHaveBeenCalledWith(99);
  });

  it('exposes the key', () => {
    const s = new Signal('my_key', null);
    expect(s.key).toBe('my_key');
  });
});

describe('createSignal', () => {
  it('creates a Signal with a given key', () => {
    const s = createSignal('explicit_key', 10);
    expect(s).toBeInstanceOf(Signal);
    expect(s.value).toBe(10);
    expect(s.key).toBe('explicit_key');
  });

  it('creates a Signal with auto-generated key when null', () => {
    const s = createSignal(null, 'auto');
    expect(s).toBeInstanceOf(Signal);
    expect(s.key).toMatch(/^__signal_\d+$/);
  });

  it('returns the same Signal for the same key', () => {
    const a = createSignal('dedup_key', 'first');
    const b = createSignal('dedup_key', 'second');
    expect(a).toBe(b);
    expect(a.value).toBe('first');
  });
});

describe('getSignal', () => {
  it('returns undefined for non-existent signals', () => {
    expect(getSignal('non_existent')).toBeUndefined();
  });

  it('returns a created Signal by key', () => {
    const sig = createSignal('get_test', true);
    expect(getSignal('get_test')).toBe(sig);
  });
});
