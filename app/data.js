// HomeLedger demo data: categories, icons, bills, goals and the seeded
// first-run household ledger. Demo dates are generated relative to today at
// first run (never in the future) and demo amounts scale with how much of
// the current month has elapsed, so the savings rate, the category shares
// and the two flagged budgets land on target on any day the site is opened.

export const EXPENSE_CATEGORIES = [
  'Housing', 'Groceries', 'Utilities', 'Transport', 'Health',
  'Education', 'Dining', 'Entertainment', 'Savings', 'Other',
];
export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Gift', 'Other'];

export const CATEGORY_COLORS = {
  Housing: '#0f766e', Groceries: '#65a30d', Utilities: '#d97706', Transport: '#2563eb',
  Health: '#dc2626', Education: '#7c3aed', Dining: '#ea580c', Entertainment: '#db2777',
  Savings: '#0891b2', Other: '#64748b', Salary: '#16a34a', Freelance: '#059669', Gift: '#ca8a04',
};

// Simple hand-drawn inline SVG paths (24x24, stroke style), one per category.
export const CATEGORY_ICONS = {
  Housing: 'M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6',
  Groceries: 'M4 5h2l2 11h10l2-7H8M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z',
  Utilities: 'M13 2L4 14h6l-1 8 9-12h-6l1-8z',
  Transport: 'M4 16l1.5-6A2 2 0 017.4 8.5h9.2a2 2 0 011.9 1.5L20 16M4 16h16M4 16v4m16-4v4M7 13h.01M17 13h.01',
  Health: 'M12 20s-7-4.5-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.5-9 9-9 9z',
  Education: 'M12 4L2 9l10 5 10-5-10-5zM6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6',
  Dining: 'M6 2v8M3 2v4a3 3 0 006 0V2M6 13v9M18 2c-2 0-3 3-3 7 0 3 1 4 3 4v9',
  Entertainment: 'M4 8a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8zM10 9l5 3-5 3V9z',
  Savings: 'M5 8a7 4 0 0114 0v8a7 4 0 01-14 0V8zM5 8c0 2.2 3.1 4 7 4s7-1.8 7-4M5 12c0 2.2 3.1 4 7 4s7-1.8 7-4',
  Other: 'M5 12h.01M12 12h.01M19 12h.01M4 5h16M4 19h16',
  Salary: 'M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM3 10h18M7 15h4',
  Freelance: 'M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM9 9l-2 3 2 3M15 9l2 3-2 3',
  Gift: 'M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7s-4 0-4-2.5S12 2 12 7zm0 0s4 0 4-2.5S12 2 12 7z',
};

export function categoryIcon(name) {
  const path = CATEGORY_ICONS[name] || CATEGORY_ICONS.Other;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
}

// Deterministic PRNG so every first run seeds the same household.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad2 = (n) => String(n).padStart(2, '0');
export function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Full-month expense plan for the demo household (USD). Shares are tuned so
// no category passes 30% of spending and the savings rate lands near 20%.
const MONTHLY_EXPENSE_PLAN = [
  ['Housing', 768, ['Monthly rent', 'Home insurance'], [1, null]],
  ['Groceries', 430, ['Weekly market shop', 'Supermarket run', 'Bakery and fruit', 'Corner store top-up', 'Rice and pantry staples', 'Farmers market vegetables', 'Butcher and eggs', 'Cleaning and kitchen basics'], null],
  ['Utilities', 190, ['Electricity bill', 'Water bill', 'Home internet', 'Mobile phone'], null],
  ['Transport', 160, ['Fuel for the car', 'Bus and train passes', 'Parking and tolls', 'Ride across town', 'Car wash and care'], null],
  ['Health', 100, ['Pharmacy supplies', 'Clinic check-up', 'Vitamins for the family'], null],
  ['Education', 80, ['School supplies', 'Online course month', 'Books for the kids'], null],
  ['Dining', 150, ['Family dinner out', 'Coffee with friends', 'Weekend takeaway', 'Lunch near work', 'Street food evening'], null],
  ['Entertainment', 90, ['Cinema tickets', 'Streaming month', 'Family game night', 'Weekend picnic supplies'], null],
  ['Savings', 480, ['Transfer to savings'], [2]],
  ['Other', 112, ['Household supplies', 'Small home repair', 'Pet food', 'Laundry service'], null],
];
const EXPENSE_PLAN_TOTAL = MONTHLY_EXPENSE_PLAN.reduce((s, p) => s + p[1], 0);
const MONTHLY_INCOME_PLAN = [
  ['Salary', 2850, 'Monthly salary', 1],
  ['Freelance', 250, 'Freelance design work', 9],
  ['Gift', 100, 'Gift from family', 14],
];

function splitAmount(total, parts, rand) {
  const weights = Array.from({ length: parts }, () => 0.55 + rand() * 0.9);
  const sum = weights.reduce((a, b) => a + b, 0);
  const amounts = weights.map((w) => Math.max(2, Math.round((total * w) / sum)));
  const drift = Math.round(total) - amounts.reduce((a, b) => a + b, 0);
  amounts[0] += drift;
  return amounts;
}

function buildMonthTransactions(year, monthIndex, elapsedDay, daysInMonth, rand, idStart, isCurrentMonth) {
  const rows = [];
  let id = idStart;
  const jitter = (base) => base * (0.94 + rand() * 0.12);
  let incomeTotal = 0;
  for (const [category, total, note, day] of MONTHLY_INCOME_PLAN) {
    if (day > elapsedDay) continue;
    const amount = Math.round(jitter(total));
    incomeTotal += amount;
    rows.push({ id: `demo-${id++}`, type: 'income', amount, category, date: toISODate(new Date(year, monthIndex, day)), note, recurring: category === 'Salary' });
  }
  // Spending is planned from the income that has actually arrived, so the
  // savings rate holds on any day of the month: exactly 20% kept in the
  // current month, a little variation in the months before it.
  const expenseShare = isCurrentMonth ? 0.8 : 0.78 + rand() * 0.06;
  const expenseTotal = incomeTotal * expenseShare;
  for (const [category, planTotal, notes, fixedDays] of MONTHLY_EXPENSE_PLAN) {
    const categoryTotal = expenseTotal * (planTotal / EXPENSE_PLAN_TOTAL);
    const amounts = splitAmount(categoryTotal, notes.length, rand);
    amounts.forEach((amount, i) => {
      const fixedDay = fixedDays && fixedDays[i] ? fixedDays[i] : null;
      const day = fixedDay || 1 + Math.floor(rand() * elapsedDay);
      if (day > elapsedDay || amount <= 0) return;
      rows.push({ id: `demo-${id++}`, type: 'expense', amount, category, date: toISODate(new Date(year, monthIndex, Math.min(day, elapsedDay))), note: notes[i % notes.length], recurring: category === 'Housing' || category === 'Savings' });
    });
  }
  rows.sort((a, b) => (a.date < b.date ? -1 : 1));
  return { rows, nextId: id };
}

export function buildDemoData(now = new Date()) {
  const rand = mulberry32(20261126);
  const transactions = [];
  let idCursor = 1;
  for (let back = 5; back >= 0; back--) {
    const first = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const elapsed = back === 0 ? now.getDate() : daysInMonth;
    const built = buildMonthTransactions(first.getFullYear(), first.getMonth(), elapsed, daysInMonth, rand, idCursor, back === 0);
    transactions.push(...built.rows);
    idCursor = built.nextId;
  }
  // Budgets for the current month: Groceries sits near 85% used (amber) and
  // Dining slightly over its limit (red); the rest leave comfortable room.
  const currentKey = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
  const spentNow = {};
  for (const t of transactions) {
    if (t.type === 'expense' && t.date.startsWith(currentKey)) spentNow[t.category] = (spentNow[t.category] || 0) + t.amount;
  }
  const budgets = {
    Housing: 820, Utilities: 220, Transport: 185, Health: 130, Education: 100,
    Entertainment: 110, Savings: 520, Other: 130,
    Groceries: Math.max(40, Math.round((spentNow.Groceries || 300) / 0.85)),
    Dining: Math.max(30, Math.round((spentNow.Dining || 100) / 1.07)),
  };
  const bills = [
    { id: 'bill-rent', name: 'Rent — December', detail: 'Due 1 Dec · Housing', amount: 768, dueDay: 1, dueMonthOffset: 1, paid: false, category: 'Housing' },
    { id: 'bill-electric', name: 'Electricity', detail: 'Due 28 Nov · Utilities', amount: 86, dueDay: 28, dueMonthOffset: 0, paid: false, category: 'Utilities' },
    { id: 'bill-internet', name: 'Home internet', detail: 'Due 15 Nov · Utilities', amount: 49, dueDay: 15, dueMonthOffset: 0, paid: true, category: 'Utilities' },
    { id: 'bill-streaming', name: 'Streaming subscription', detail: 'Due 29 Nov · Entertainment', amount: 15, dueDay: 29, dueMonthOffset: 0, paid: false, category: 'Entertainment' },
  ];
  const goals = [
    { id: 'goal-emergency', name: 'Emergency fund', target: 6000, saved: 2400, monthly: 300 },
    { id: 'goal-holiday', name: 'Family holiday', target: 1200, saved: 650, monthly: 120 },
  ];
  return { transactions, budgets, bills, goals, isDemo: true };
}
