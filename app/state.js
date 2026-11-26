// HomeLedger state and storage: one versioned localStorage key, every access
// wrapped in try/catch with an in-memory fallback, so the site keeps working
// when storage is blocked or full.
import { buildDemoData } from './data.js';

export const STORAGE_KEY = 'homeledger:v1';

let memoryFallback = null;

export function defaultState() {
  const demo = buildDemoData(new Date());
  return {
    transactions: demo.transactions,
    budgets: demo.budgets,
    bills: demo.bills,
    goals: demo.goals,
    currency: 'USD',
    theme: 'system',
    isDemo: true,
    recurringApplied: {},
  };
}

export function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.transactions)) return defaultState();
    return { ...defaultState(), ...parsed, isDemo: Boolean(parsed.isDemo) };
  } catch {
    return memoryFallback || defaultState();
  }
}

export function saveState(state) {
  memoryFallback = state;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable: the in-memory copy above keeps the session alive.
  }
}

export function clearStoredState() {
  memoryFallback = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}

// ---- Month helpers -------------------------------------------------------
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}
export function monthKeyOf(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
export function shiftMonthKey(key, delta) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKeyOf(d);
}
export function transactionsInMonth(transactions, key) {
  return transactions.filter((t) => t.date.startsWith(key));
}
export function sumByType(rows, type) {
  return rows.filter((t) => t.type === type).reduce((sum, t) => sum + t.amount, 0);
}
export function spentByCategory(rows) {
  const totals = {};
  for (const t of rows) {
    if (t.type !== 'expense') continue;
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  }
  return totals;
}
