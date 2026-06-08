import { Blueprint, Binding, BlueprintSchema } from "./ir";

const DEBUG = true;

function logDebug(msg: string) {
  if (DEBUG) {
    console.log(`[BAEX-DEBUG-TS] ${msg}`);
  }
}

/**
 * The result of processing an `html` tagged template.
 */
export interface TemplateResult {
  /** The final HTML string with markers. */
  html: string;
  /** A list of bindings used in the template. */
  bindings: Binding[];
  /** The pre-parsed blueprint tree used for optimized patching. */
  blueprint: Blueprint;
}

/**
 * Marks a string as raw HTML to prevent it from being escaped during processing.
 * 
 * @param value The HTML string to treat as raw.
 * @returns A raw HTML wrapper.
 */
export const Raw = (value: string) => ({ __raw: true, value });

/**
 * Conditional rendering helper.
 * 
 * @param condition A value or function that returns a boolean.
 * @param thenResult The template to render if condition is truthy.
 * @param elseResult The template to render if condition is falsy.
 * @returns The selected template result.
 */
export function when<T>(
  condition: T | (() => T),
  thenResult: TemplateResult | string,
  elseResult: TemplateResult | string = '',
): TemplateResult | string {
  const resolvedCond =
    typeof condition === 'function' ? (condition as Function)() : condition;
  return resolvedCond ? thenResult : elseResult;
}

interface ProcessedBinding {
  marker: string;
  type: 'event' | 'property' | 'bool';
  eventName?: string;
  propName?: string;
  attrName?: string;
  valueIdx?: number;
  value?: unknown;
}

interface WasmTemplateResult {
  html: string;
  bindings: ProcessedBinding[];
  blueprint: unknown;
}

function isSignalLike(v: unknown): v is { value: unknown } {
  return typeof v === 'object' && v !== null && 'value' in v;
}

/**
 * Tagged template function for creating reactive HTML.
 * 
 * It processes bindings like `@click`, `.value`, and `?hidden` using the WASM core 
 * to produce a `TemplateResult` containing the final HTML and the blueprint.
 * 
 * @param strings The static parts of the template.
 * @param values The dynamic values inserted into the template.
 * @returns A `TemplateResult` used for rendering and patching.
 */
export function html(
  strings: TemplateStringsArray,
  ...values: unknown[]
): TemplateResult {
  logDebug('Phase 1: Starting html tagged template');
  const nestedBindings: Binding[] = [];

  const processValue = (v: unknown): unknown => {
    if (Array.isArray(v)) {
      let htmlContent = '';
      for (const item of v) {
        const processed = processValue(item);
        if (
          processed &&
          typeof processed === 'object' &&
          '__raw' in processed
        ) {
          htmlContent += (processed as { value: string }).value;
        } else {
          htmlContent += String(processed ?? '');
        }
      }
      return Raw(htmlContent);
    }
    if (v && typeof v === 'object' && 'html' in v && 'bindings' in v) {
      const tr = v as TemplateResult;
      nestedBindings.push(...tr.bindings);
      return Raw(tr.html);
    }
    return v;
  };

  const processedValues = values.map(processValue);
  logDebug('Phase 2: Values processed');

  const raw = (
    window as unknown as Record<
      string,
      (s: unknown, v: unknown) => WasmTemplateResult
    >
  ).processTemplate(strings, processedValues);

  const bindings: Binding[] = raw.bindings.map((b) => {
    if (b.valueIdx !== undefined) {
      const rawValue = processedValues[b.valueIdx];
      if (b.type === 'property' && isSignalLike(rawValue)) {
        (b as Record<string, unknown>).value = (
          rawValue as { value: unknown }
        ).value;
      } else {
        (b as Record<string, unknown>).value = rawValue;
      }
    }
    return b as Binding;
  });
  logDebug('Phase 3: Bindings resolved from WASM result');

  // Validate Blueprint structure from WASM
  const validatedBlueprint = BlueprintSchema.parse(raw.blueprint);

  return { 
    html: raw.html, 
    bindings: [...bindings, ...nestedBindings],
    blueprint: validatedBlueprint
  };
}

/**
 * Tagged template function for generating CSS strings.
 * 
 * @param strings The static parts of the CSS.
 * @param values The dynamic values inserted into the CSS.
 * @returns A combined CSS string.
 */
export function css(
  strings: TemplateStringsArray,
  ...values: unknown[]
): string {
  let result = '';
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) {
      result += String(values[i] ?? '');
    }
  }
  return result;
}
