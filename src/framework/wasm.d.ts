interface Window {
  createSignal(key: string, initial: unknown): unknown;
  getSignal(key: string): unknown;
  setSignal(key: string, value: unknown): void;
  onSignalChange(key: string, callback: (...args: unknown[]) => void): void;
  create_component(tag: string, template: string): void;
  blablabla(name: string): string;
  add_numbers(a: number, b: number): number;
}
