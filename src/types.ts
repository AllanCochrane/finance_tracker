export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // positive number
  type: "expense" | "income";
  category: string;
  source: "manual" | "csv" | "pdf";
  confidence?: number; // for AI parsed transactions
}

export interface Category {
  id: string;
  name: string;
  color: string; // Tailwind bg- class or hex
  isDefault?: boolean;
}

export interface RecurringExpense {
  id: string;
  descriptionPattern: string; // merchant name pattern
  category: string;
  averageAmount: number;
  frequency: "monthly" | "weekly" | "yearly" | "bi-weekly";
  occurrences: number;
  lastDate: string;
  nextEstimatedDate: string;
  confidence: number; // percentage similarity
  status: "active" | "inactive";
  type?: "expense" | "income";
}

export interface TrendData {
  month: string; // YYYY-MM or display "Jan 26"
  totalExpense: number;
  totalIncome: number;
  byCategory: Record<string, number>;
}

export interface ForecastPoint {
  date: string; // YYYY-MM or YYYY-MM-DD
  projectedExpense: number;
  projectedIncome: number;
  projectedBalance: number;
  isForecast: boolean;
  notes?: string;
  recurringExpenseName?: string;
  recurringExpenseAmount?: number;
  recurringExpenseType?: "income" | "expense";
  recurringExpenseColor?: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "1", name: "Housing", color: "#f87171" }, // Red
  { id: "2", name: "Utilities", color: "#fb923c" }, // Orange
  { id: "3", name: "Groceries", color: "#fbbf24" }, // Yellow
  { id: "4", name: "Food & Dining", color: "#34d399" }, // Emerald
  { id: "5", name: "Transportation", color: "#60a5fa" }, // Blue
  { id: "6", name: "Shopping", color: "#818cf8" }, // Indigo
  { id: "7", name: "Entertainment", color: "#c084fc" }, // Purple
  { id: "8", name: "Subscriptions", color: "#f472b6" }, // Pink
  { id: "9", name: "Income", color: "#2dd4bf" }, // Teal (Greenish-teal)
  { id: "10", name: "Other", color: "#9ca3af" }, // Gray
];
