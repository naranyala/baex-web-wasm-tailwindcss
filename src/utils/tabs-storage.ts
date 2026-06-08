const STORAGE_KEY = 'baex-tabs-state';

export interface TabsState {
  tabs: { id: string; name: string }[];
  activeView: string;
}

export function saveTabsState(state: TabsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be unavailable (private browsing, etc.)
  }
}

export function loadTabsState(): TabsState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearTabsState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
