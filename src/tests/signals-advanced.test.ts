import { describe, it, expect, vi } from 'vitest';
import { setupWasm } from './setup';
import { createSignal, effect, computed, watch } from '../framework/index';

describe('Advanced Signals', () => {
  beforeAll(async () => {
    await setupWasm();
  });

  it('effect tracks dependencies and re-runs', async () => {
    const count = createSignal('test-count', 0);
    let executed = 0;
    
    effect(() => {
      executed++;
      console.log('Count is:', count.value);
    });

    expect(executed).toBe(1);
    count.value = 1;
    await new Promise(r => queueMicrotask(r));
    expect(executed).toBe(2);
    count.value = 2;
    await new Promise(r => queueMicrotask(r));
    expect(executed).toBe(3);
  });

  it('computed derived signals are reactive', async () => {
    const count = createSignal('comp-count', 1);
    const double = computed(() => count.value * 2);

    expect(double.value).toBe(2);
    count.value = 5;
    expect(double.value).toBe(10);
  });

  it('computed values are cached', () => {
    let evalCount = 0;
    const count = createSignal('cache-count', 1);
    const double = computed(() => {
      evalCount++;
      return count.value * 2;
    });

    expect(double.value).toBe(2);
    expect(double.value).toBe(2);
    expect(evalCount).toBe(1);
    
    count.value = 2;
    expect(double.value).toBe(4);
    expect(evalCount).toBe(2);
  });

  it('watch observes changes', async () => {
    const count = createSignal('watch-count', 0);
    let callbackExecuted = false;
    let lastVal = 0;
    let prevVal = 0;

    watch(() => count.value, (newVal, oldVal) => {
      callbackExecuted = true;
      lastVal = newVal;
      prevVal = oldVal;
    });

    count.value = 10;
    await new Promise(r => queueMicrotask(r));
    expect(callbackExecuted).toBe(true);
    expect(lastVal).toBe(10);
    expect(prevVal).toBe(0);
  });

  it('scoped signals are isolated', async () => {
    const cid1 = 101;
    const cid2 = 102;
    
    const sig1 = createSignal('scoped-key', 'val1', cid1);
    const sig2 = createSignal('scoped-key', 'val2', cid2);
    
    expect(sig1.value).toBe('val1');
    expect(sig2.value).toBe('val2');
    
    sig1.value = 'updated1';
    expect(sig1.value).toBe('updated1');
    expect(sig2.value).toBe('val2');
  });
});
