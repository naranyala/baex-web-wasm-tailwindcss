import { Binding, TemplateResult, BindingSet, NodeMap } from './template';
import { BindingSchema } from './ir';

export interface PropertyDeclaration {
  type?:
    | StringConstructor
    | NumberConstructor
    | BooleanConstructor
    | ObjectConstructor
    | ArrayConstructor;
  attribute?: string | boolean;
  reflect?: boolean;
  hasChanged?(value: unknown, oldValue: unknown): boolean;
}

export type PropertyValues = Record<string, unknown>;

function hasWasm(name: string): boolean {
  return typeof (window as Record<string, unknown>)[name] === 'function';
}

function getTypeName(type?: unknown): string | undefined {
  if (type === String) return 'string';
  if (type === Number) return 'number';
  if (type === Boolean) return 'boolean';
  if (type === Object) return 'object';
  if (type === Array) return 'array';
  return undefined;
}

function resolveAttributeName(
  propName: string,
  decl: PropertyDeclaration,
): string | null {
  if (decl.attribute === false) return null;
  if (decl.attribute === true || decl.attribute === undefined)
    return propName.toLowerCase();
  return decl.attribute;
}

export interface PropertyPatch {
  propName: string;
  value: unknown;
}

const DEBUG = true;

function logDebug(msg: string) {
  if (DEBUG) {
    console.log(`[BAEX-DEBUG-ELEMENT] ${msg}`);
  }
}

export class BaexElement extends HTMLElement {
  static properties: Record<string, PropertyDeclaration> = {};
  static state: Record<string, PropertyDeclaration> = {};

  private _cid: number = 0;
  private _pendingUpdate = false;
  private _forceUpdate = false;
  private _updateCallbacks: Array<() => void> = [];
  private _subscriptions: Array<() => void> = [];
  private _initialized = false;
  private _nodeMap: NodeMap = new Map();
  private _bindingSet: BindingSet = new Map();
  private _isFirstRender = true;

  constructor() {
    super();
    this._cid = (window as any).register_component();
    this._syncInitialProperties();
    this._defineClassProperties();
  }

  private _syncInitialProperties(): void {
    const props = (this.constructor as typeof BaexElement).properties;
    const state = (this.constructor as typeof BaexElement).state;

    const allProps = { ...props, ...state };
    for (const name of Object.keys(allProps)) {
      const value = (this as any)[name];
      if (value !== undefined) {
        (window as any).update_component_property(this._cid, name, value);
      }
    }
  }

  connectedCallback(): void {
    this.requestUpdate();
    this.onConnected?.();
  }

  disconnectedCallback(): void {
    (window as any).remove_component(this._cid);
    this._subscriptions.forEach((unsub) => unsub());
    this._subscriptions = [];
    this.onDisconnected?.();
  }

  attributeChangedCallback(
    name: string,
    old: string | null,
    value: string | null,
  ): void {
    if (old === value) return;
    const props = (this.constructor as typeof BaexElement).properties;
    for (const [propName, decl] of Object.entries(props)) {
      const attrName = resolveAttributeName(propName, decl);
      if (attrName === name) {
        this._setPropertyFromAttribute(propName, decl, value);
        return;
      }
    }
  }

  static get observedAttributes(): string[] {
    if (hasWasm('resolveObservedAttributes')) {
      const props = (this as typeof BaexElement).properties;
      console.log('[BAEX-DEBUG-TS] observedAttributes props:', props);
      return (
        window as Record<string, (p: unknown) => string[]>
      ).resolveObservedAttributes(props);
    }

    const props = (BaexElement as typeof BaexElement).properties;
    return Object.entries(props)
      .map(([name, decl]) => resolveAttributeName(name, decl))
      .filter((attr): attr is string => attr !== null);
  }

  requestUpdate(force = false): void {
    if (force) {
      this._forceUpdate = true;
    }
    if (!this._pendingUpdate) {
      this._pendingUpdate = true;
      queueMicrotask(() => this._performUpdate());
    }
  }

  track<T>(
    signal: { subscribe: (cb: (val: T) => void) => () => void },
    callback: (val: T) => void,
  ): void {
    const unsub = signal.subscribe(callback);
    this._subscriptions.push(unsub);
  }

  protected render(): string | TemplateResult {
    throw new Error('render() must be implemented by subclass');
  }

  protected onConnected?(): void;
  protected onDisconnected?(): void;
  protected onUpdate?(changed: PropertyValues): void;

// ── IR Layer 3: Patch Set ────────────────────────────────────────────────
// [RULE: PatchSet must only contain properties that actually changed]
// [RULE: Patching must be batched via microtasks to prevent layout thrashing]
// [ANOMALY: Patches are currently applied directly to DOM; should transition to Blueprint-based patching]

  private _performUpdate(): void {
    logDebug('Phase 1: Performing update');
    this._pendingUpdate = false;
    const currentForce = this._forceUpdate;
    this._forceUpdate = false;

    const changedMap = (window as any).get_component_changed_properties(
      this._cid,
    ) as Record<string, unknown> | null;
    (window as any).clear_component_changed_properties(this._cid);

    const patches: PropertyPatch[] = changedMap
      ? Object.keys(changedMap).map((propName) => ({
          propName,
          value: (window as any).get_component_property(this._cid, propName),
        }))
      : [];

    if (this._isFirstRender) {
      this._renderInitial();
      this._isFirstRender = false;
    } else if (patches.length > 0 || currentForce) {
      const result = this.render();
      if (!result || typeof result === 'string') {
        this._renderInitial();
      } else {
        const allPatchesBound = patches.every((patch) =>
          result.bindings.some(
            (b) =>
              (b.type === 'property' && b.propName === patch.propName) ||
              (b.type === 'bool' && b.attrName === patch.propName),
          ),
        );

        if (allPatchesBound && !currentForce) {
          this._applyPatches(patches);
        } else {
          this._renderInitial();
        }
      }
    }

    this.onUpdate?.(
      Object.fromEntries(patches.map((p) => [p.propName, p.value])),
    );
    for (const cb of this._updateCallbacks) {
      cb();
    }
    this._updateCallbacks = [];
  }

  private _renderInitial(): void {
    logDebug('Phase 2: Initial rendering');
    const result = this.render();
    if (!result) return;

    if (typeof result === 'string') {
      this.innerHTML = result;
    } else {
      this.innerHTML = result.html;
      
      // Populate BindingSet for O(1) lookup during patching
      this._bindingSet.clear();
      for (const b of result.bindings) {
        this._bindingSet.set(b.marker, b);
      }

      this._initializeNodeMap(result.bindings);
      this._applyBindings(result.bindings);
    }
  }

// ── IR Layer 4: Node Map ─────────────────────────────────────────────────
// [RULE: NodeMap must be reconstructed on every full re-render]
// [RULE: NodeMap must provide O(1) access to dynamic DOM nodes]
// [ANOMALY: NodeMap currently relies on data-baex attributes; should transition to internal references]

  private _initializeNodeMap(bindings: Binding[]): void {
    this._nodeMap.clear();
    for (const b of bindings) {
      const el = this.querySelector(`[data-baex="${b.marker}"]`);
      if (el) {
        this._nodeMap.set(b.marker, el);
      }
    }
  }

  private _applyPatches(patches: PropertyPatch[]): void {
    logDebug(`Phase 3: Applying ${patches.length} patches`);
    if (patches.length === 0) return;

    for (const patch of patches) {
      // Find binding that matches this property name
      const binding = Array.from(this._bindingSet.values()).find(
        (b) =>
          (b.type === 'property' && b.propName === patch.propName) ||
          (b.type === 'bool' && b.attrName === patch.propName),
      );

      if (!binding) continue;

      const node = this._nodeMap.get(binding.marker);
      if (!node) continue;

      if (binding.type === 'property') {
        (node as any)[binding.propName] = patch.value;
      } else if (binding.type === 'bool') {
        if (patch.value) {
          node.setAttribute(binding.attrName, '');
        } else {
          node.removeAttribute(binding.attrName);
        }
      } else if (binding.type === 'text') {
        node.textContent = patch.value;
      }
    }
  }

  private _applyBindings(bindings: Binding[]): void {
    for (const b of bindings) {
      const el = this._nodeMap.get(b.marker);
      if (!el) continue;

      if (b.type === 'event') {
        el.addEventListener(b.eventName, b.value);
      } else if (b.type === 'property') {
        (el as Record<string, unknown>)[b.propName] = b.value;
      } else if (b.type === 'bool') {
        if (b.value) {
          el.setAttribute(b.attrName, '');
        } else {
          el.removeAttribute(b.attrName);
        }
      }
    }
  }

  private _defineClassProperties(): void {
    const ctor = this.constructor as typeof BaexElement;
    const props = ctor.properties;
    const state = ctor.state;

    const allProps = { ...props, ...state };

    for (const [name, decl] of Object.entries(allProps)) {
      Object.defineProperty(this, name, {
        get() {
          return (window as any).get_component_property(
            (this as any)._cid,
            name,
          );
        },
        set(value: unknown) {
          const changed = (window as any).update_component_property(
            (this as any)._cid,
            name,
            value,
          );
          if (changed) {
            const propDecl = props[name] || state[name];
            const attrName = propDecl
              ? resolveAttributeName(name, propDecl)
              : null;
            if (attrName && propDecl.reflect) {
              const str = this._serialize(value, propDecl.type);
              if (str === null) {
                this.removeAttribute(attrName);
              } else {
                this.setAttribute(attrName, str);
              }
            }
            this.requestUpdate();
          }
        },
        configurable: true,
        enumerable: true,
      });
    }
  }

  // Remove this method as it's now handled by setters
  // private _initializeInstanceProperties(): void {
  //   ...
  // }

  private _setPropertyFromAttribute(
    propName: string,
    decl: PropertyDeclaration,
    value: string | null,
  ): void {
    const converted = this._deserialize(value, decl.type);
    (window as any).update_component_property(this._cid, propName, converted);
    this.requestUpdate();
  }

  private _deserialize(value: string | null, type?: unknown): unknown {
    if (hasWasm('deserializeProperty')) {
      return (
        window as Record<
          string,
          (v: string | null, t: string | undefined) => unknown
        >
      ).deserializeProperty(value, getTypeName(type));
    }
    if (value === null) return undefined;
    if (type === Number) {
      const n = Number(value);
      return Number.isNaN(n) ? value : n;
    }
    if (type === Boolean) return value !== null && value !== 'false';
    if (type === Object || type === Array) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }

  private _serialize(value: unknown, type?: unknown): string | null {
    if (hasWasm('serializeProperty')) {
      const result = (
        window as Record<string, (v: unknown, t: string | undefined) => unknown>
      ).serializeProperty(value, getTypeName(type));
      if (result === null || result === undefined) return null;
      return String(result);
    }
    if (value === null || value === undefined) return null;
    if (type === Boolean) return value ? '' : null;
    if (type === Object || type === Array) return JSON.stringify(value);
    return String(value);
  }

  // Removed as state is now managed by Rust

  whenUpdate(cb: () => void): void {
    if (!this._pendingUpdate) {
      cb();
    } else {
      this._updateCallbacks.push(cb);
    }
  }
}

export function property(decl?: PropertyDeclaration): PropertyDecorator {
  return (target: object, key: string | symbol) => {
    if (!target) return;
    const ctor = (target as Record<string, unknown>).constructor || target;
    if (!ctor || typeof ctor !== 'function') return;

    if (!ctor.properties) {
      ctor.properties = {};
    }
    ctor.properties[key as string] = decl ?? {};
  };
}

export function state(decl?: PropertyDeclaration): PropertyDecorator {
  return (target: object, key: string | symbol) => {
    if (!target) return;
    const ctor = (target as Record<string, unknown>).constructor || target;
    if (!ctor || typeof ctor !== 'function') return;

    if (!ctor.state) {
      ctor.state = {};
    }
    ctor.state[key as string] = decl ?? { attribute: false };
  };
}
