// Demo data for HomeLedger: one job, building a realistic first-run dataset.
// Every date is generated relative to the day the site is first opened, never
// in the future, and current-month amounts scale with the days already elapsed
// so the headline ratios hold on any day of the month: no category above 40%
// of spending, a savings rate between 15% and 25%, one budget near 85% used
// and one budget slightly over its limit. A seeded PRNG keeps it consistent.

// Small deterministic random generator (mulberry32).
export function createSeededRandom(seed) {
  let value = seed >>> 0;
  return function nextRandom() {
    value = (value + 0x6d2b79f5) >>> 0;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function toIsoDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function roundMoney(amount) {
  return Math.round(amount * 100) / 100;
}

// Spending shares per expense category; the largest is 30% by design.
const CATEGORY_WEIGHTS = [
  ["housing", 0.30],
  ["groceries", 0.18],
  ["utilities", 0.09],
  ["transport", 0.08],
  ["dining", 0.07],
  ["entertainment", 0.05],
  ["health", 0.04],
  ["education", 0.04],
  ["savings", 0.11],
  ["other-expense", 0.04],
];

// How each category total splits into individual purchases, with their notes.
const PURCHASE_TEMPLATES = {
  housing: [[0.78, "Monthly rent"], [0.22, "Home supplies and repairs"]],
  groceries: [[0.4, "Weekly groceries at the market"], [0.35, "Supermarket run"], [0.25, "Bakery and dairy"]],
  utilities: [[0.55, "Electricity bill"], [0.3, "Water bill"], [0.15, "Internet plan"]],
  transport: [[0.6, "Fuel for the car"], [0.4, "Bus and train fares"]],
  dining: [[0.55, "Dinner out with family"], [0.45, "Coffee and lunch"]],
  entertainment: [[0.6, "Streaming subscriptions"], [0.4, "Cinema tickets"]],
  health: [[1, "Pharmacy and check-up"]],
  education: [[1, "Course books and fees"]],
  savings: [[1, "Transfer to savings account"]],
  "other-expense": [[1, "Household odds and ends"]],
};

export function buildDemoData(now = new Date()) {
  const random = createSeededRandom(20261126);
  const transactions = [];
  let sequence = 0;
  const addTransaction = (type, category, amount, date, note) => {
    sequence += 1;
    transactions.push({
      id: `demo-${sequence}`,
      type,
      category,
      amount: roundMoney(amount),
      date: toIsoDate(date),
      note,
      demo: true,
    });
  };

  for (let monthOffset = 5; monthOffset >= 0; monthOffset -= 1) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const isCurrentMonth = monthOffset === 0;
    const elapsedDays = isCurrentMonth ? now.getDate() : daysInMonth;
    const dayAt = (fraction) => {
      const day = Math.max(1, Math.min(elapsedDays, Math.round(fraction * elapsedDays) || 1));
      return new Date(year, month, day);
    };

    // Income: salary on the 1st, freelance mid-month in most months.
    const salaryAmount = 3250 * (0.97 + random() * 0.06);
    addTransaction("income", "salary", salaryAmount, new Date(year, month, 1), "Monthly salary");
    let monthIncome = salaryAmount;
    if (monthOffset % 2 === 0 || isCurrentMonth) {
      const freelanceAmount = 280 + random() * 180;
      if (!isCurrentMonth || elapsedDays >= 10) {
        addTransaction("income", "freelance", freelanceAmount, dayAt(0.45), "Freelance project payment");
        monthIncome += freelanceAmount;
      }
    }
    if (monthOffset === 2) {
      addTransaction("income", "gift", 120, dayAt(0.6), "Birthday gift from family");
      monthIncome += 120;
    }

    // Expenses: the current month targets a 20% savings rate exactly, past
    // months vary between roughly 14% and 24% for a believable trend.
    const expenseRatio = isCurrentMonth ? 0.8 : 0.76 + random() * 0.1;
    const expenseTotal = monthIncome * expenseRatio;
    for (const [categoryId, weight] of CATEGORY_WEIGHTS) {
      const categoryTotal = expenseTotal * weight;
      for (const [share, note] of PURCHASE_TEMPLATES[categoryId]) {
        const fraction = 0.12 + random() * 0.83;
        addTransaction("expense", categoryId, categoryTotal * share, dayAt(fraction), note);
      }
    }
  }

  // Budgets derive from what the demo actually spent this month, so one sits
  // near 85% used (amber) and one just over its limit (red) on any date.
  const currentPrefix = toIsoDate(now).slice(0, 7);
  const spentThisMonth = {};
  for (const transaction of transactions) {
    if (transaction.type === "expense" && transaction.date.startsWith(currentPrefix)) {
      spentThisMonth[transaction.category] = (spentThisMonth[transaction.category] || 0) + transaction.amount;
    }
  }
  const roundLimit = (amount) => Math.max(5, Math.round(amount / 5) * 5);
  const budgets = {
    groceries: roundLimit((spentThisMonth.groceries || 0) / 0.85),
    dining: roundLimit((spentThisMonth.dining || 0) / 1.07),
    housing: roundLimit((spentThisMonth.housing || 0) / 0.68),
    transport: roundLimit((spentThisMonth.transport || 0) / 0.72),
  };

  transactions.sort((a, b) => (a.date < b.date ? 1 : -1));
  return { transactions, budgets };
}
