export interface EventBinding {
  marker: string;
  type: 'event';
  eventName: string;
  value: EventListener;
}
export interface PropertyBinding {
  marker: string;
  type: 'property';
  propName: string;
  value: unknown;
}
export interface BoolBinding {
  marker: string;
  type: 'bool';
  attrName: string;
  value: unknown;
}
export type Binding = EventBinding | PropertyBinding | BoolBinding;

export interface TemplateResult {
  html: string;
  bindings: Binding[];
}

export const Raw = (value: string) => ({ __raw: true, value });

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
}

function isSignalLike(v: unknown): v is { value: unknown } {
  return typeof v === 'object' && v !== null && 'value' in v;
}

export function html(
  strings: TemplateStringsArray,
  ...values: unknown[]
): TemplateResult {
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

  return { html: raw.html, bindings: [...bindings, ...nestedBindings] };
}

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
