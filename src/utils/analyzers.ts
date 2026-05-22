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
  if (transactions.length < 2) return [];

  // Group by cleaned description
  const groups: Record<string, Transaction[]> = {};
  for (const t of transactions) {
    const key = cleanDescription(t.description);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(t);
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

    // Standard intervals in days evaluation
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
      // If intervals are a bit noisy but amounts are very close, consider it recurring
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
        type: lastTx.type,
      });
    }
  }

  return recurring;
}

// Group transactions by month
export function getMonthlySpending(transactions: Transaction[]): TrendData[] {
  const map: Record<string, TrendData> = {};

  for (const tx of transactions) {
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

  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
}

// Auxiliary checker to find whether a subscription hits a future date based on calendar metrics
export function checkRecurringHit(rec: RecurringExpense, D: Date): boolean {
  if (!rec.lastDate) return false;
  const last = new Date(rec.lastDate);
  if (isNaN(last.getTime())) return false;

  // Align days exactly on UTC level for pure date offsets
  const lastUTC = Date.UTC(last.getFullYear(), last.getMonth(), last.getDate());
  const curUTC = Date.UTC(D.getFullYear(), D.getMonth(), D.getDate());
  const diffDays = Math.round((curUTC - lastUTC) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return false;

  if (rec.frequency === "weekly") {
    return diffDays % 7 === 0;
  }

  if (rec.frequency === "bi-weekly") {
    return diffDays % 14 === 0;
  }

  if (rec.frequency === "monthly") {
    const targetDay = last.getDate();
    const curDay = D.getDate();
    const maxDaysInM = new Date(D.getFullYear(), D.getMonth() + 1, 0).getDate();

    if (curDay === targetDay) return true;
    if (targetDay > maxDaysInM && curDay === maxDaysInM) return true;
    return false;
  }

  if (rec.frequency === "yearly") {
    const targetM = last.getMonth();
    const targetDay = last.getDate();

    if (D.getMonth() === targetM) {
      const curDay = D.getDate();
      const maxDaysInM = new Date(D.getFullYear(), D.getMonth() + 1, 0).getDate();
      if (curDay === targetDay) return true;
      if (targetDay > maxDaysInM && curDay === maxDaysInM) return true;
    }
    return false;
  }

  return false;
}

// Generate future financial trends forecasting with daily granularity and event markers
export function generateFinancialForecast(
  transactions: Transaction[],
  recurringExpenses: RecurringExpense[],
  monthsCount: number = 6
): ForecastPoint[] {
  const sortedTxs = [...transactions]
    .filter((t) => t.date && !isNaN(new Date(t.date).getTime()))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sortedTxs.length === 0) {
    return [];
  }

  const earliestDateObj = new Date(sortedTxs[0].date);
  const latestDateObj = new Date(sortedTxs[sortedTxs.length - 1].date);

  // Compile standard aggregated monthly parameters for trend slopes & average friction
  const monthlyData = getMonthlySpending(transactions);
  const activeRecurring = recurringExpenses.filter((r) => r.status === "active");

  // Sum standard active recurring expenses to pull out high-tier bills
  const recurringTotalAmount = activeRecurring
    .filter((r) => r.type !== "income")
    .reduce((sum, r) => {
      let multiplier = 1;
      if (r.frequency === "weekly") multiplier = 4.33;
      else if (r.frequency === "bi-weekly") multiplier = 2.16;
      else if (r.frequency === "yearly") multiplier = 1 / 12;
      return sum + r.averageAmount * multiplier;
    }, 0);

  // Non-recurring historical spend profiles
  const nonRecurringMonthlyExpenses = monthlyData.map((data) => {
    return Math.max(0, data.totalExpense - recurringTotalAmount);
  });
  const avgNonRecurringExpense =
    nonRecurringMonthlyExpenses.reduce((sum, val) => sum + val, 0) /
    (nonRecurringMonthlyExpenses.length || 1);

  // Daily baseline flat spending spent on things like small coffees, etc.
  const dailyNonRecurringExpense = avgNonRecurringExpense / 30.4;

  // Standard Linear regression slope computation
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
    const maxSlope = avgNonRecurringExpense * 0.1;
    slope = Math.max(-maxSlope, Math.min(maxSlope, slope));
  }

  const dailySlopeAdjust = slope / (30.4 * 30.4);

  // Step 1: Accumulate actual historical balances at daily granularity
  const historyPoints: ForecastPoint[] = [];
  let runningBalance = 2500; // Realistic start balance baseline

  // Swift map of dates to items lists
  const txMap: Record<string, Transaction[]> = {};
  for (const t of sortedTxs) {
    if (!txMap[t.date]) txMap[t.date] = [];
    txMap[t.date].push(t);
  }

  const daysHistoryDiff = Math.ceil((latestDateObj.getTime() - earliestDateObj.getTime()) / (1000 * 60 * 60 * 24));

  for (let i = 0; i <= daysHistoryDiff; i++) {
    const curDate = new Date(earliestDateObj);
    curDate.setDate(curDate.getDate() + i);
    const dateStr = curDate.toISOString().split("T")[0];

    let dayExpense = 0;
    let dayIncome = 0;

    const dayTxs = txMap[dateStr] || [];
    for (const tx of dayTxs) {
      if (tx.type === "expense") {
        dayExpense += tx.amount;
      } else {
        dayIncome += tx.amount;
      }
    }

    runningBalance += (dayIncome - dayExpense);

    historyPoints.push({
      date: dateStr,
      projectedExpense: Math.round(dayExpense * 100) / 100,
      projectedIncome: Math.round(dayIncome * 100) / 100,
      projectedBalance: Math.round(runningBalance * 100) / 100,
      isForecast: false,
    });
  }

  // Step 2: Project future days with exact recurring occurrences
  const futurePoints: ForecastPoint[] = [];
  const totalProjDays = monthsCount * 30;

  for (let d = 1; d <= totalProjDays; d++) {
    const curProjDate = new Date(latestDateObj);
    curProjDate.setDate(curProjDate.getDate() + d);
    const dateStr = curProjDate.toISOString().split("T")[0];

    // Everyday small expenses (gradually adapted by macro regression slope)
    const everydaySpent = Math.max(0, dailyNonRecurringExpense + dailySlopeAdjust * d);

    let dayExpense = everydaySpent;
    let dayIncome = 0;

    // Evaluate recurring occurrences
    let hitName: string | undefined = undefined;
    let hitAmt: number | undefined = undefined;
    let hitType: "income" | "expense" | undefined = undefined;
    let hitColor: string | undefined = undefined;

    for (const rec of activeRecurring) {
      if (checkRecurringHit(rec, curProjDate)) {
        if (rec.type === "income") {
          dayIncome += rec.averageAmount;
          hitName = rec.descriptionPattern;
          hitAmt = rec.averageAmount;
          hitType = "income";
          hitColor = "#10b981";
        } else {
          dayExpense += rec.averageAmount;
          hitName = rec.descriptionPattern;
          hitAmt = rec.averageAmount;
          hitType = "expense";
          hitColor = "#ef4444";
        }
      }
    }

    runningBalance += (dayIncome - dayExpense);

    futurePoints.push({
      date: dateStr,
      projectedExpense: Math.round(dayExpense * 100) / 100,
      projectedIncome: Math.round(dayIncome * 100) / 100,
      projectedBalance: Math.round(runningBalance * 100) / 100,
      isForecast: true,
      recurringExpenseName: hitName,
      recurringExpenseAmount: hitAmt,
      recurringExpenseType: hitType,
      recurringExpenseColor: hitColor,
    });
  }

  return [...historyPoints, ...futurePoints];
}
