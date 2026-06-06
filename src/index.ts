import './index.css';
// @ts-expect-error
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
} from '../pkgs/web-core/web_core.js';
import './components/app.js';

const rootEl = document.querySelector('#root');
if (!rootEl) throw new Error('#root not found');

init().then(() => {
  register_globals();

  // Bind framework core functions to window for BaexElement access
  (window as any).register_component = register_component;
  (window as any).update_component_property = update_component_property;
  (window as any).get_component_property = get_component_property;
  (window as any).get_component_changed_properties =
    get_component_changed_properties;
  (window as any).clear_component_changed_properties =
    clear_component_changed_properties;
  (window as any).remove_component = remove_component;
  (window as any).processTemplate = process_template;
  (window as any).createSignal = create_signal;
  (window as any).getSignal = get_signal;
  (window as any).setSignal = set_signal;
  (window as any).onSignalChange = on_signal_change;
  (window as any).resolveObservedAttributes = resolve_observed_attributes;
  (window as any).serializeProperty = serialize_property;
  (window as any).deserializeProperty = deserialize_property;

  rootEl.innerHTML = '<baex-app></baex-app>';
});
