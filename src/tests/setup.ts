import fs from 'node:fs';
import path from 'node:path';
import init, {
  clear_component_changed_properties,
  create_signal,
  deserialize_property,
  get_component_changed_properties,
  get_component_property,
  get_signal,
  on_signal_change,
  process_template,
  register_component,
  register_globals,
  remove_component,
  resolve_observed_attributes,
  serialize_property,
  set_signal,
  update_component_property,
} from '@pkgs/web-core';

interface WasmWindow extends Window {
  processTemplate: (template: string, bindings: unknown[]) => string;
  createSignal: (key: string, initial: unknown) => void;
  getSignal: (key: string) => unknown;
  setSignal: (key: string, value: unknown) => void;
  onSignalChange: (key: string, cb: (val: unknown) => void) => void;
  resolveObservedAttributes: (props: Record<string, unknown>) => string[];
  serializeProperty: (value: unknown, type: string | undefined) => unknown;
  deserializeProperty: (
    value: string | null,
    type: string | undefined,
  ) => unknown;
  register_component: () => number;
  update_component_property: (
    cid: number,
    name: string,
    value: unknown,
  ) => boolean;
  get_component_property: (cid: number, name: string) => unknown;
  get_component_changed_properties: (cid: number) => Record<string, unknown>;
  clear_component_changed_properties: (cid: number) => void;
  remove_component: (cid: number) => void;
}

let initialized = false;
let initPromise: Promise<void> | null = null;

export async function setupWasm() {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const wasmPath = path.resolve(
        __dirname,
        '../../pkgs/web-core/web_core_bg.wasm',
      );
      const wasmBuffer = fs.readFileSync(wasmPath);
      await init(wasmBuffer);
      register_globals();

      const win = window as unknown as WasmWindow;
      win.processTemplate = process_template;
      win.createSignal = create_signal;
      win.getSignal = get_signal;
      win.setSignal = set_signal;
      win.onSignalChange = on_signal_change;
      win.resolveObservedAttributes = resolve_observed_attributes;
      win.serializeProperty = serialize_property;
      win.deserializeProperty = deserialize_property;
      win.register_component = register_component;
      win.update_component_property = update_component_property;
      win.get_component_property = get_component_property;
      win.get_component_changed_properties = get_component_changed_properties;
      win.clear_component_changed_properties =
        clear_component_changed_properties;
      win.remove_component = remove_component;

      initialized = true;
    } catch (e) {
      console.error('Failed to initialize WASM:', e);
      throw e;
    }
  })();

  return initPromise;
}

export { initialized };
