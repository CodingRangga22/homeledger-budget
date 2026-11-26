// Category definitions for HomeLedger: one clear job, the catalogue of income
// and expense categories, each with a stable colour and a small hand-drawn SVG
// icon path (24x24 viewBox, stroked). No emoji anywhere: icons always render.

export const EXPENSE_CATEGORIES = [
  { id: "housing", label: "Housing", color: "#0f766e", icon: "M4 11l8-7 8 7v9h-6v-6H10v6H4z" },
  { id: "groceries", label: "Groceries", color: "#65a30d", icon: "M4 7h16l-1.5 11h-13z M8 7a4 4 0 0 1 8 0" },
  { id: "utilities", label: "Utilities", color: "#d97706", icon: "M13 2L5 13h5l-1 9 8-11h-5z" },
  { id: "transport", label: "Transport", color: "#2563eb", icon: "M4 16l1.5-6A2 2 0 0 1 7.5 8h9a2 2 0 0 1 2 2L20 16v4h-2.5 M4 16v4h2.5 M4 16h16 M7 20a1.8 1.8 0 1 0 0-.01 M17 20a1.8 1.8 0 1 0 0-.01" },
  { id: "health", label: "Health", color: "#dc2626", icon: "M12 21C7 16.5 3 13 3 8.8A4.8 4.8 0 0 1 12 6a4.8 4.8 0 0 1 9 2.8c0 4.2-4 7.7-9 12.2z" },
  { id: "education", label: "Education", color: "#7c3aed", icon: "M2 9l10-4 10 4-10 4z M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5 M22 9v6" },
  { id: "dining", label: "Dining", color: "#ea580c", icon: "M6 2v7a2 2 0 0 0 2 2v11 M6 2v5 M10 2v5a2 2 0 0 1-2 2 M18 2c-1.7 0-3 2.7-3 6 0 2.2 1.3 4 3 4v10" },
  { id: "entertainment", label: "Entertainment", color: "#db2777", icon: "M4 5h16v11H4z M4 9h16 M8 20l2-4 M16 20l-2-4" },
  { id: "savings", label: "Savings", color: "#0891b2", icon: "M5 20a8 8 0 1 1 14.9-3M12 7v6 M9.5 9.5c.6-1 4.4-1 5 0 .5.9-.3 1.7-2.5 2-2.2.3-3 1.1-2.5 2 .6 1 4.4 1 5 0" },
  { id: "other-expense", label: "Other", color: "#64748b", icon: "M5 12h.01M12 12h.01M19 12h.01" },
];

export const INCOME_CATEGORIES = [
  { id: "salary", label: "Salary", color: "#16a34a", icon: "M3 7h18v13H3z M3 7l3-4h12l3 4 M9 20v-5h6v5" },
  { id: "freelance", label: "Freelance", color: "#059669", icon: "M4 6h16v12H4z M2 20h20 M9 10l-2 2 2 2 M15 10l2 2-2 2" },
  { id: "gift", label: "Gift", color: "#c026d3", icon: "M4 11h16v9H4z M12 11v9 M4 7h16v4H4z M12 7s-4 .3-4-2a2 2 0 0 1 4-1c.8.6 0 3 0 3zM12 7s4 .3 4-2a2 2 0 0 0-4-1c-.8.6 0 3 0 3z" },
  { id: "other-income", label: "Other", color: "#475569", icon: "M5 12h.01M12 12h.01M19 12h.01" },
];

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export function findCategory(categoryId) {
  return ALL_CATEGORIES.find((category) => category.id === categoryId) || ALL_CATEGORIES[ALL_CATEGORIES.length - 1];
}

export function categoriesForType(type) {
  return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

// Build a small inline SVG icon element string for a category.
export function categoryIconSvg(category, size = 18) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${category.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${category.icon}"/></svg>`;
}
