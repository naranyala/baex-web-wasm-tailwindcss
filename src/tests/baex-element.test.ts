import { beforeAll, describe, expect, it, vi } from 'vitest';
import { BaexElement, defineComponent } from '../framework/index.js';
import { html } from '../framework/template.js';
import { setupWasm } from './setup.js';

beforeAll(async () => {
  await setupWasm();
  defineComponent('test-greeter', TestGreeter);
});

class TestGreeter extends BaexElement {
  static properties = {
    name: { type: String },
    count: { type: Number, reflect: true },
    active: { type: Boolean },
  };

  name = 'World';
  count = 0;
  active = false;

  onConnected = vi.fn();
  onDisconnected = vi.fn();
  onUpdate = vi.fn();

  render() {
    return html`<p>Hello ${this.name}</p>`;
  }
}

class ExcludesAttr extends BaexElement {
  static properties = {
    pub: { type: String },
    priv: { attribute: false },
  };
  pub = '';
  priv = 'secret';
  render() {
    return '';
  }
}

class CustomAttr extends BaexElement {
  static properties = {
    data: { attribute: 'data-value' },
  };
  data = '';
  render() {
    return '';
  }
}

describe('BaexElement: observed attributes', () => {
  it('derives observedAttributes from properties', () => {
    const attrs = (TestGreeter as unknown as typeof BaexElement)
      .observedAttributes;
    expect(attrs).toContain('name');
    expect(attrs).toContain('count');
    expect(attrs).toContain('active');
  });

  it('excludes properties with attribute: false', () => {
    const attrs = (ExcludesAttr as unknown as typeof BaexElement)
      .observedAttributes;
    expect(attrs).toContain('pub');
    expect(attrs).not.toContain('priv');
  });

  it('uses custom attribute name from property declaration', () => {
    const attrs = (CustomAttr as unknown as typeof BaexElement)
      .observedAttributes;
    expect(attrs).toContain('data-value');
  });
});

describe('BaexElement: lifecycle', () => {
  it('calls onConnected when connected to DOM', () => {
    const el = new TestGreeter();
    const spy = vi.spyOn(el, 'onConnected' as never);
    document.body.appendChild(el);
    expect(spy).toHaveBeenCalledOnce();
    document.body.removeChild(el);
  });

  it('calls onDisconnected when removed from DOM', () => {
    const el = new TestGreeter();
    document.body.appendChild(el);
    const spy = vi.spyOn(el, 'onDisconnected' as never);
    document.body.removeChild(el);
    expect(spy).toHaveBeenCalledOnce();
  });

  it('renders on connect', async () => {
    const el = new TestGreeter();
    document.body.appendChild(el);
    await new Promise((r) => queueMicrotask(r));
    expect(el.innerHTML).toContain('Hello World');
    document.body.removeChild(el);
  });
});

describe('BaexElement: reactivity', () => {
  it('reactive property setter triggers re-render', async () => {
    const el = new TestGreeter();
    document.body.appendChild(el);
    await new Promise((r) => queueMicrotask(r));
    expect(el.innerHTML).toContain('Hello World');

    el.name = 'Vitest';
    await new Promise((r) => queueMicrotask(r));
    expect(el.innerHTML).toContain('Hello Vitest');
    document.body.removeChild(el);
  });

  it('reflects property to attribute when reflect: true', () => {
    const el = new TestGreeter();
    el.count = 42;
    expect(el.getAttribute('count')).toBe('42');
  });

  it('does not reflect property to attribute by default', () => {
    const el = new TestGreeter();
    el.name = 'Reflected';
    expect(el.hasAttribute('name')).toBe(false);
  });

  it('reads initial value from attribute', () => {
    const el = document.createElement('test-greeter');
    el.setAttribute('name', 'AttrName');
    document.body.appendChild(el);
    expect(el.name).toBe('AttrName');
    document.body.removeChild(el);
  });

  it('calls onUpdate with changed properties after update', async () => {
    const updates: Array<Record<string, unknown>> = [];
    class GreeterWithUpdate extends BaexElement {
      static properties = { name: { type: String } };
      name = 'init';
      onUpdate(changed: Record<string, unknown>) {
        updates.push(changed);
      }
      render() {
        return html`<p>${this.name}</p>`;
      }
    }
    defineComponent('test-greeter-update', GreeterWithUpdate);

    const el = new GreeterWithUpdate();
    document.body.appendChild(el);
    await new Promise((r) => queueMicrotask(r));

    el.name = 'Changed';
    await new Promise((r) => queueMicrotask(r));

    const last = updates[updates.length - 1];
    expect(last).toHaveProperty('name', 'Changed');
    document.body.removeChild(el);
  });

  it('coerces attribute string to number type', () => {
    const el = document.createElement('test-greeter');
    el.setAttribute('count', '99');
    document.body.appendChild(el);
    expect(el.count).toBe(99);
    expect(typeof el.count).toBe('number');
    document.body.removeChild(el);
  });

  it('coerces attribute string to boolean type', () => {
    const el = document.createElement('test-greeter');
    el.setAttribute('active', '');
    document.body.appendChild(el);
    expect(el.active).toBe(true);
    document.body.removeChild(el);
  });
});

describe('BaexElement: bindings', () => {
  it('applies event bindings from render', async () => {
    class WithEvent extends BaexElement {
      clicked = false;
      handleClick = () => {
        this.clicked = true;
      };
      render() {
        return html`<button @click=${this.handleClick}>Go</button>`;
      }
    }
    defineComponent('test-withevent', WithEvent);

    const el = document.createElement('test-withevent') as unknown as WithEvent;
    document.body.appendChild(el);
    await new Promise((r) => queueMicrotask(r));

    const btn = el.querySelector('button') as HTMLButtonElement;
    btn.click();
    expect(el.clicked).toBe(true);
    document.body.removeChild(el);
  });

  it('applies property bindings from render and updates on change', async () => {
    class WithProp extends BaexElement {
      static properties = {
        val: { type: String },
      };
      val = 'initial';
      render() {
        return html`<input .value=${this.val}>`;
      }
    }
    defineComponent('test-withprop', WithProp);

    const el = document.createElement('test-withprop') as unknown as WithProp;
    document.body.appendChild(el);
    await new Promise((r) => queueMicrotask(r));

    const input = el.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('initial');

    el.val = 'updated';
    await new Promise((r) => queueMicrotask(r));
    const updatedInput = el.querySelector('input') as HTMLInputElement;
    expect(updatedInput.value).toBe('updated');
    document.body.removeChild(el);
  });

  it('applies bool bindings on initial render', async () => {
    class WithBool extends BaexElement {
      static properties = {
        disabled: { type: Boolean },
      };
      disabled = true;
      render() {
        return html`<button ?disabled=${this.disabled}>Go</button>`;
      }
    }
    defineComponent('test-withbool', WithBool);

    const el = document.createElement('test-withbool') as unknown as WithBool;
    document.body.appendChild(el);
    await new Promise((r) => queueMicrotask(r));

    const btn = el.querySelector('button') as HTMLButtonElement;
    expect(btn.hasAttribute('disabled')).toBe(true);
    document.body.removeChild(el);
  });

  it('bool binding reflects property value on force re-render', async () => {
    class WithBool extends BaexElement {
      static properties = {
        disabled: { type: Boolean },
      };
      disabled = true;
      render() {
        return html`<button ?disabled=${this.disabled}>Go</button>`;
      }
    }
    defineComponent('test-withbool-2', WithBool);

    const el = document.createElement('test-withbool-2') as unknown as WithBool;
    document.body.appendChild(el);
    await new Promise((r) => queueMicrotask(r));

    el.disabled = false;
    el.requestUpdate(true);
    await new Promise((r) => queueMicrotask(r));

    const updatedBtn = el.querySelector('button') as HTMLButtonElement;
    expect(updatedBtn.hasAttribute('disabled')).toBe(false);
    document.body.removeChild(el);
  });
});

describe('BaexElement: whenUpdate', () => {
  it('runs callback immediately if no pending update', async () => {
    const el = new TestGreeter();
    document.body.appendChild(el);
    await new Promise((r) => queueMicrotask(r));

    const cb = vi.fn();
    el.whenUpdate(cb);
    expect(cb).toHaveBeenCalledOnce();
    document.body.removeChild(el);
  });

  it('queues callback if update is pending', async () => {
    const el = new TestGreeter();
    document.body.appendChild(el);
    await new Promise((r) => queueMicrotask(r));

    el.name = 'new';
    const cb = vi.fn();
    el.whenUpdate(cb);
    expect(cb).not.toHaveBeenCalled();
    await new Promise((r) => queueMicrotask(r));
    expect(cb).toHaveBeenCalledOnce();
    document.body.removeChild(el);
  });
});
