// Storage for HomeLedger: one job, reading and writing the whole app state
// under a single versioned localStorage key, with an in-memory fallback when
// storage is unavailable (private mode, file access, quota errors).

export const STORAGE_KEY = "homeledger:v1";

let memoryFallbackState = null;

export function createEmptyState() {
  return {
    version: 1,
    transactions: [],
    budgets: {},
    currency: "USD",
    theme: "auto",
    demoSeeded: false,
    demoBannerDismissed: false,
  };
}

export function loadState() {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) return null;
    const parsed = JSON.parse(rawValue);
    if (!parsed || !Array.isArray(parsed.transactions)) return null;
    return { ...createEmptyState(), ...parsed };
  } catch {
    return memoryFallbackState;
  }
}

export function saveState(state) {
  memoryFallbackState = state;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the in-memory copy keeps the session working.
  }
}

export function clearStoredState() {
  memoryFallbackState = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing else to do; the next load starts empty either way.
  }
}
