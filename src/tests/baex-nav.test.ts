import { beforeAll, describe, expect, it } from 'vitest';
import { BaexNav, tabsSignal, viewSignal } from '../app/nav.js';
import { BaexElement, defineComponent, html } from '../framework/index.js';
import { setupWasm } from './setup.js';

beforeAll(async () => {
  await setupWasm();
  defineComponent('test-nav-render', class extends BaexNav {});
});

describe('BaexNav', () => {
  it('renders RAG button by default', async () => {
    const nav = document.createElement('test-nav-render') as HTMLElement;
    document.body.appendChild(nav);
    await new Promise((r) => queueMicrotask(r));

    const ragBtn = nav.querySelector('[data-view="rag"]');
    expect(ragBtn).toBeTruthy();
    expect(ragBtn?.textContent?.trim()).toBe('RAG');

    document.body.removeChild(nav);
  });

  it('renders dynamic tabs from tabsSignal', async () => {
    const nav = document.createElement('test-nav-render') as HTMLElement;
    document.body.appendChild(nav);
    await new Promise((r) => queueMicrotask(r));

    tabsSignal.value = [
      { id: 'tab-a', name: 'Tab Alpha' },
      { id: 'tab-b', name: 'Tab Beta' },
    ];
    await new Promise((r) => queueMicrotask(r));

    const tabA = nav.querySelector('[data-view="tab-a"]');
    const tabB = nav.querySelector('[data-view="tab-b"]');
    expect(tabA?.textContent).toContain('Tab Alpha');
    expect(tabB?.textContent).toContain('Tab Beta');

    tabsSignal.value = [];
    document.body.removeChild(nav);
  });

  it('removes a tab when close button is clicked', async () => {
    const nav = document.createElement('test-nav-render') as HTMLElement;
    document.body.appendChild(nav);
    await new Promise((r) => queueMicrotask(r));

    tabsSignal.value = [{ id: 'closable', name: 'Closable' }];
    await new Promise((r) => queueMicrotask(r));

    const closeBtn = nav.querySelector(
      '[data-close-tab="closable"]',
    ) as HTMLElement;
    expect(closeBtn).toBeTruthy();

    closeBtn.click();
    await new Promise((r) => queueMicrotask(r));

    expect(nav.querySelector('[data-view="closable"]')).toBeFalsy();
    expect(tabsSignal.value).toEqual([]);

    document.body.removeChild(nav);
  });

  it('switches to home when active tab is closed', async () => {
    const nav = document.createElement('test-nav-render') as HTMLElement;
    document.body.appendChild(nav);
    await new Promise((r) => queueMicrotask(r));

    tabsSignal.value = [{ id: 'active-x', name: 'Active X' }];
    viewSignal.value = 'active-x';
    await new Promise((r) => queueMicrotask(r));

    const closeBtn = nav.querySelector(
      '[data-close-tab="active-x"]',
    ) as HTMLElement;
    closeBtn.click();
    await new Promise((r) => queueMicrotask(r));

    expect(viewSignal.value).toBe('rag');

    tabsSignal.value = [];
    viewSignal.value = 'rag';
    document.body.removeChild(nav);
  });

  it('clicking a tab updates viewSignal', async () => {
    const nav = document.createElement('test-nav-render') as HTMLElement;
    document.body.appendChild(nav);
    await new Promise((r) => queueMicrotask(r));

    tabsSignal.value = [{ id: 'click-me', name: 'Click Me' }];
    await new Promise((r) => queueMicrotask(r));

    const tab = nav.querySelector(
      '[data-view="click-me"]',
    ) as HTMLElement;
    tab.click();
    await new Promise((r) => queueMicrotask(r));

    expect(viewSignal.value).toBe('click-me');

    tabsSignal.value = [];
    viewSignal.value = 'rag';
    document.body.removeChild(nav);
  });
});
