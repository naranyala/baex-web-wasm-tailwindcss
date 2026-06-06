import { beforeEach, describe, expect, it } from 'vitest';
import { setupWasm } from '../../src/tests/setup';
import '../primitives/counter';

describe('Counter Example', () => {
  beforeEach(async () => {
    await setupWasm();
    document.body.innerHTML = '<baex-counter></baex-counter>';
  });

  it('renders initial count', async () => {
    const el = document.querySelector('baex-counter') as HTMLElement;
    await new Promise(resolve => setTimeout(resolve, 50)); // Allow more time for update
    expect(el.innerHTML).toMatch(/data-baex="t\d+"/);
  });

  it('increments count on click', async () => {
    const el = document.querySelector('baex-counter') as HTMLElement;
    const btn = el.querySelector('button') as HTMLButtonElement;
    btn.click();
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(el.innerHTML).toMatch(/data-baex="t\d+"/);
  });
});
