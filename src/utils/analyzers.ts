import { Transaction, RecurringExpense, TrendData, ForecastPoint } from "../types";

// Helper to clean descriptions (remove transaction numbers, numbers, trailing codes)
export function cleanDescription(desc: string): string {
  let cleaned = desc.toUpperCase();
  // Remove common payment processor fluff
  cleaned = cleaned.replace(/^(POS|DEBIT|CREDIT|ACH|PAYMENT|WD|TRSF|TRANSFER|MOBILE)\s+/i, "");
  // Remove transaction IDs and card info (e.g., *1234 or XXXXXX)
  cleaned = cleaned.replace(/\s*[\d*X-]{4,}\s*/g, " ");
  // Remove dates in description (e.g., 10/24 or 2026-02)
  cleaned = cleaned.replace(/\d{1,2}\/\d{1,2}/g, "");
  // Remove extra whitespaces
  cleaned = cleaned.trim().replace(/\s+/g, " ");
  // If nothing is left, return original uppercase
  return cleaned || desc.toUpperCase();
}

// Group transactions and identify recurring patterns
export function analyzeRecurringExpenses(transactions: Transaction[]): RecurringExpense[] {
  // We only look at expenses for recurring outgoing payments
  const expenses = transactions.filter((t) => t.type === "expense");
  if (expenses.length < 2) return [];

  // Group by cleaned description
  const groups: Record<string, Transaction[]> = {};
  for (const exp of expenses) {
    const key = cleanDescription(exp.description);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(exp);
  }

  const recurring: RecurringExpense[] = [];

  for (const [merchant, list] of Object.entries(groups)) {
    if (list.length < 2) continue; // need at least 2 occurrences

    // Sort by date ascending to find intervals
    const sorted = [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate dates intervals in days
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const d1 = new Date(sorted[i - 1].date);
      const d2 = new Date(sorted[i].date);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      intervals.push(diffDays);
    }

    const averageInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;

    // Standard deviation / similarity evaluation for intervals to identify frequency
    let frequency: "monthly" | "weekly" | "yearly" | "bi-weekly" = "monthly";
    let isRecurring = false;
    let confidence = 0;

    if (averageInterval >= 25 && averageInterval <= 35) {
      frequency = "monthly";
      isRecurring = true;
      confidence = 90;
    } else if (averageInterval >= 5 && averageInterval <= 9) {
      frequency = "weekly";
      isRecurring = true;
      confidence = 85;
    } else if (averageInterval >= 11 && averageInterval <= 16) {
      frequency = "bi-weekly";
      isRecurring = true;
      confidence = 85;
    } else if (averageInterval >= 340 && averageInterval <= 380) {
      frequency = "yearly";
      isRecurring = true;
      confidence = 95;
    } else {
      // If intervals are a bit noisy but amounts are very close, it might are monthly bills on slightly varying dates
      const amounts = list.map((t) => t.amount);
      const minAmount = Math.min(...amounts);
      const maxAmount = Math.max(...amounts);
      const ratio = minAmount / (maxAmount || 1);

      if (ratio > 0.9 && averageInterval >= 20 && averageInterval <= 45) {
        frequency = "monthly";
        isRecurring = true;
        confidence = 75;
      }
    }

    if (isRecurring) {
      const avgAmt = list.reduce((sum, t) => sum + t.amount, 0) / list.length;
      const lastTx = sorted[sorted.length - 1];

      // Estimate next date
      const lastDate = new Date(lastTx.date);
      const nextDate = new Date(lastDate);
      if (frequency === "monthly") {
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else if (frequency === "weekly") {
        nextDate.setDate(nextDate.getDate() + 7);
      } else if (frequency === "bi-weekly") {
        nextDate.setDate(nextDate.getDate() + 14);
      } else if (frequency === "yearly") {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }

      recurring.push({
        id: `rec-${Math.random().toString(36).substr(2, 9)}`,
        descriptionPattern: merchant,
        category: lastTx.category,
        averageAmount: Math.round(avgAmt * 100) / 100,
        frequency,
        occurrences: list.length,
        lastDate: lastTx.date,
        nextEstimatedDate: nextDate.toISOString().split("T")[0],
        confidence,
        status: "active",
      });
    }
  }

  return recurring;
}

// Group transactions by month
export function getMonthlySpending(transactions: Transaction[]): TrendData[] {
  const map: Record<string, TrendData> = {};

  for (const tx of transactions) {
    // Get year-month: YYYY-MM
    const dateObj = new Date(tx.date);
    if (isNaN(dateObj.getTime())) continue;
    const monthKey = tx.date.substring(0, 7); // "YYYY-MM"

    if (!map[monthKey]) {
      map[monthKey] = {
        month: monthKey,
        totalExpense: 0,
        totalIncome: 0,
        byCategory: {},
      };
    }

    if (tx.type === "expense") {
      map[monthKey].totalExpense += tx.amount;
      map[monthKey].byCategory[tx.category] = (map[monthKey].byCategory[tx.category] || 0) + tx.amount;
    } else {
      map[monthKey].totalIncome += tx.amount;
    }
  }

  // Convert to sorted array
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
}

// Generate future financial trends forecasting
export function generateFinancialForecast(
  transactions: Transaction[],
  recurringExpenses: RecurringExpense[],
  monthsCount: number = 6
): ForecastPoint[] {
  const monthlyData = getMonthlySpending(transactions);
  if (monthlyData.length === 0) {
    return [];
  }

  // Let's compute average monthly non-recurring expense & normal income
  // Let's say all income is consistent, find the average monthly income
  const totalIncome = monthlyData.reduce((sum, d) => sum + d.totalIncome, 0);
  const avgMonthlyIncome = totalIncome / monthlyData.length;

  // Find non-recurring expenses:
  const recurringTotalAmount = recurringExpenses
    .filter((r) => r.status === "active")
    .reduce((sum, r) => {
      let multiplier = 1;
      if (r.frequency === "weekly") multiplier = 4.33;
      else if (r.frequency === "bi-weekly") multiplier = 2.16;
      else if (r.frequency === "yearly") multiplier = 1 / 12;
      return sum + r.averageAmount * multiplier;
    }, 0);

  // Compute average monthly standard expenses (non-recurring)
  const nonRecurringMonthlyExpenses = monthlyData.map((data) => {
    return Math.max(0, data.totalExpense - recurringTotalAmount);
  });
  const avgNonRecurringExpense =
    nonRecurringMonthlyExpenses.reduce((sum, val) => sum + val, 0) /
    (nonRecurringMonthlyExpenses.length || 1);

  // Calculate trends pattern using standard linear regression (y = mx + b)
  // for overall non-recurring expenses over time
  const n = monthlyData.length;
  let slope = 0;
  if (n > 1) {
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += nonRecurringMonthlyExpenses[i];
      sumXY += i * nonRecurringMonthlyExpenses[i];
      sumXX += i * i;
    }
    const denom = n * sumXX - sumX * sumX;
    if (denom !== 0) {
      slope = (n * sumXY - sumX * sumY) / denom;
    }
    // Cap slope to prevent extreme run-away line projections (e.g. ±20% of average)
    const maxSlope = avgNonRecurringExpense * 0.1;
    slope = Math.max(-maxSlope, Math.min(maxSlope, slope));
  }

  // Generate historical data points
  const points: ForecastPoint[] = [];

  // Start building historical balance (running baseline)
  let runningBalance = 2500; // Arbitrary healthy initial balance baseline

  for (let i = 0; i < monthlyData.length; i++) {
    const data = monthlyData[i];
    runningBalance += data.totalIncome - data.totalExpense;
    points.push({
      date: data.month,
      projectedExpense: Math.round(data.totalExpense * 100) / 100,
      projectedIncome: Math.round(data.totalIncome * 100) / 100,
      projectedBalance: Math.round(runningBalance * 100) / 100,
      isForecast: false,
    });
  }

  // Project future months
  const lastMonthStr = monthlyData[monthlyData.length - 1].month;
  let [lastYear, lastMonth] = lastMonthStr.split("-").map(Number);

  for (let step = 1; step <= monthsCount; step++) {
    // Increment month
    lastMonth++;
    if (lastMonth > 12) {
      lastMonth = 1;
      lastYear++;
    }
    const nextMonthStr = `${lastYear}-${String(lastMonth).padStart(2, "0")}`;

    // Compute expected scale of non-recurring expense using regression trend
    const predictedNonRecurring = Math.max(0, avgNonRecurringExpense + slope * (n - 1 + step));

    // Future monthly expense is: predicted non-recurring + standard recurring subscription total
    const projectedExp = predictedNonRecurring + recurringTotalAmount;
    const projectedInc = avgMonthlyIncome;

    runningBalance += projectedInc - projectedExp;

    points.push({
      date: nextMonthStr,
      projectedExpense: Math.round(projectedExp * 100) / 100,
      projectedIncome: Math.round(projectedInc * 100) / 100,
      projectedBalance: Math.round(runningBalance * 100) / 100,
      isForecast: true,
      notes: step === 1 
        ? `Based on trend direction (${slope >= 0 ? "+" : ""}${Math.round(slope)}/mo) & recurring subscriptions`
        : undefined,
    });
  }

  return points;
}
