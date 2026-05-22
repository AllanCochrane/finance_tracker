import React, { useState, useEffect, useMemo } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  Layers, 
  FileSpreadsheet, 
  FileText, 
  Plus, 
  Undo, 
  Search, 
  SlidersHorizontal, 
  HelpCircle, 
  Activity, 
  CornerDownRight, 
  Briefcase, 
  ShieldAlert, 
  CheckCircle2, 
  RefreshCw,
  Trash2,
  CalendarCheck2
} from "lucide-react";
import { Transaction, Category, RecurringExpense, ForecastPoint, DEFAULT_CATEGORIES } from "./types";
import { analyzeRecurringExpenses, getMonthlySpending, generateFinancialForecast, cleanDescription } from "./utils/analyzers";
import CsvImport from "./components/CsvImport";
import PdfImport from "./components/PdfImport";
import CategoryManager from "./components/CategoryManager";

// Seed data up to now (May 2026) to provide a rich visual showcase instantly
const DEMO_TRANSACTIONS: Transaction[] = [
  // MARCH 2026
  { id: "tx-m1", date: "2026-03-01", description: "Direct Deposit Salary Paycheck", amount: 4800, type: "income", category: "Income", source: "csv" },
  { id: "tx-m2", date: "2026-03-03", description: "Comcast Internet Utility", amount: 89.95, type: "expense", category: "Utilities", source: "csv" },
  { id: "tx-m3", date: "2026-03-05", description: "Netflix Subscription Standard", amount: 15.49, type: "expense", category: "Subscriptions", source: "pdf" },
  { id: "tx-m4", date: "2026-03-08", description: "Whole Foods Groceries Store", amount: 142.30, type: "expense", category: "Groceries", source: "csv" },
  { id: "tx-m5", date: "2026-03-10", description: "Starbucks Coffee Retail", amount: 9.20, type: "expense", category: "Food & Dining", source: "manual" },
  { id: "tx-m6", date: "2026-03-12", description: "Shell Oil Gas Refueling", amount: 45.00, type: "expense", category: "Transportation", source: "csv" },
  { id: "tx-m7", date: "2026-03-15", description: "Metropolitan landlord rent lease", amount: 1650.00, type: "expense", category: "Housing", source: "pdf" },
  { id: "tx-m8", date: "2026-03-18", description: "Uber Ride Trip Airport", amount: 32.50, type: "expense", category: "Transportation", source: "manual" },
  { id: "tx-m9", date: "2026-03-20", description: "Target Electronics Store", amount: 110.00, type: "expense", category: "Shopping", source: "csv" },
  { id: "tx-m10", date: "2026-03-24", description: "Spotify Music Premium", amount: 10.99, type: "expense", category: "Subscriptions", source: "pdf" },
  { id: "tx-m11", date: "2026-03-28", description: "AMC Cinema Movie Tickets", amount: 28.00, type: "expense", category: "Entertainment", source: "manual" },

  // APRIL 2026
  { id: "tx-a1", date: "2026-04-01", description: "Direct Deposit Salary Paycheck", amount: 4800, type: "income", category: "Income", source: "csv" },
  { id: "tx-a2", date: "2026-04-03", description: "Comcast Internet Utility", amount: 89.95, type: "expense", category: "Utilities", source: "csv" },
  { id: "tx-a3", date: "2026-04-05", description: "Netflix Subscription Standard", amount: 15.49, type: "expense", category: "Subscriptions", source: "pdf" },
  { id: "tx-a4", date: "2026-04-09", description: "Whole Foods Groceries Store", amount: 165.40, type: "expense", category: "Groceries", source: "csv" },
  { id: "tx-a5", date: "2026-04-11", description: "Starbucks Coffee Retail", amount: 11.50, type: "expense", category: "Food & Dining", source: "manual" },
  { id: "tx-a6", date: "2026-04-13", description: "Shell Oil Gas Refueling", amount: 50.00, type: "expense", category: "Transportation", source: "csv" },
  { id: "tx-a7", date: "2026-04-15", description: "Metropolitan landlord rent lease", amount: 1650.00, type: "expense", category: "Housing", source: "pdf" },
  { id: "tx-a8", date: "2026-04-19", description: "Uber Ride Trip Downtown", amount: 18.00, type: "expense", category: "Transportation", source: "manual" },
  { id: "tx-a9", date: "2026-04-22", description: "Nordstrom Apparel Store", amount: 95.00, type: "expense", category: "Shopping", source: "csv" },
  { id: "tx-a10", date: "2026-04-24", description: "Spotify Music Premium", amount: 10.99, type: "expense", category: "Subscriptions", source: "pdf" },

  // MAY 2026
  { id: "tx-my1", date: "2026-05-01", description: "Direct Deposit Salary Paycheck", amount: 4850, type: "income", category: "Income", source: "csv" },
  { id: "tx-my2", date: "2026-05-03", description: "Comcast Internet Utility", amount: 89.95, type: "expense", category: "Utilities", source: "csv" },
  { id: "tx-my3", date: "2026-05-05", description: "Netflix Subscription Standard", amount: 15.49, type: "expense", category: "Subscriptions", source: "pdf" },
  { id: "tx-my4", date: "2026-05-08", description: "Whole Foods Groceries Store", amount: 150.20, type: "expense", category: "Groceries", source: "csv" },
  { id: "tx-my5", date: "2026-05-11", description: "Starbucks Coffee Retail", amount: 7.80, type: "expense", category: "Food & Dining", source: "manual" },
  { id: "tx-my6", date: "2026-05-14", description: "Shell Oil Gas Refueling", amount: 48.00, type: "expense", category: "Transportation", source: "csv" },
  { id: "tx-my7", date: "2026-05-15", description: "Metropolitan landlord rent lease", amount: 1650.00, type: "expense", category: "Housing", source: "pdf" },
  { id: "tx-my8", date: "2026-05-18", description: "Uber Ride Airport Return", amount: 35.00, type: "expense", category: "Transportation", source: "manual" },
  { id: "tx-my9", date: "2026-05-20", description: "Target Household Shopping", amount: 180.00, type: "expense", category: "Shopping", source: "csv" },
  { id: "tx-my10", date: "2026-05-22", description: "Spotify Music Premium", amount: 10.99, type: "expense", category: "Subscriptions", source: "pdf" },
];

export default function App() {
  // Application local states
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem("forecast_transactions");
    return saved ? JSON.parse(saved) : DEMO_TRANSACTIONS;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem("forecast_categories");
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });

  const [forecastMonths, setForecastMonths] = useState<number>(6);
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-05");
  const [activeImportTab, setActiveImportTab] = useState<"none" | "csv" | "pdf">("none");
  
  // Ledger/Filter Local States
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [ledgerPage, setLedgerPage] = useState(1);
  const itemsPerPage = 8;

  // New manual transaction form inputs
  const [newTx, setNewTx] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    type: "expense" as "expense" | "income",
    category: "Groceries",
  });
  const [showAddForm, setShowAddForm] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("forecast_transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("forecast_categories", JSON.stringify(categories));
  }, [categories]);

  // Derived calculations: Auto identify monthly trends
  const recurringExpenses = useMemo(() => {
    return analyzeRecurringExpenses(transactions);
  }, [transactions]);

  const monthlySpending = useMemo(() => {
    return getMonthlySpending(transactions);
  }, [transactions]);

  const forecastData = useMemo(() => {
    return generateFinancialForecast(transactions, recurringExpenses, forecastMonths);
  }, [transactions, recurringExpenses, forecastMonths]);

  // Months available in transactions list for selector dropdown
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    transactions.forEach((t) => {
      if (t.date.length >= 7) {
        monthsSet.add(t.date.substring(0, 7));
      }
    });
    const sorted = Array.from(monthsSet).sort().reverse();
    return sorted;
  }, [transactions]);

  // Selected Month details
  const selectedMonthData = useMemo(() => {
    const match = monthlySpending.find((m) => m.month === selectedMonth);
    return match || { month: selectedMonth, totalExpense: 0, totalIncome: 0, byCategory: {} };
  }, [monthlySpending, selectedMonth]);

  // Maximum amount for normalizing linear scales in visuals
  const maxMonthlyExpenseAmount = useMemo(() => {
    const maxVal = Math.max(...monthlySpending.map((m) => m.totalExpense), 1);
    return maxVal;
  }, [monthlySpending]);

  // Category summary array for the selected month to show donut-bar graphics
  const selectedCategorySummary = useMemo(() => {
    const entries = Object.entries(selectedMonthData.byCategory);
    return entries.map(([catName, amt]) => {
      const matchCat = categories.find((c) => c.name === catName) || { color: "#6b7280" };
      return {
        name: catName,
        value: Number(amt) || 0,
        color: matchCat.color,
      };
    }).sort((a, b) => b.value - a.value);
  }, [selectedMonthData, categories]);

  // Add transactional elements
  const handleAddManualTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amtParsed = parseFloat(newTx.amount);
    if (isNaN(amtParsed) || amtParsed <= 0) return;

    const added: Transaction = {
      id: `man-${Math.random().toString(36).substr(2, 9)}`,
      date: newTx.date,
      description: newTx.description.trim() || "Manual Transaction",
      amount: amtParsed,
      type: newTx.type,
      category: newTx.type === "income" ? "Income" : newTx.category,
      source: "manual",
    };

    setTransactions((prev) => [added, ...prev]);
    setNewTx({
      date: new Date().toISOString().split("T")[0],
      description: "",
      amount: "",
      type: "expense",
      category: "Groceries",
    });
    setShowAddForm(false);
  };

  const handleRemoveTransaction = (id: string) => {
    if (confirm("Are you sure you want to delete this transaction record?")) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const handleUpdateTransactionCategory = (id: string, newCatName: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, category: newCatName } : t))
    );
  };

  const handleAddCategory = (name: string, color: string) => {
    const newCat: Category = {
      id: `cat-${Math.random().toString(36).substr(2, 9)}`,
      name,
      color,
    };
    setCategories((prev) => [...prev, newCat]);
  };

  const handleDeleteCategory = (id: string) => {
    const target = categories.find((c) => c.id === id);
    if (!target) return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
    // update transactions under deleted category to "Other"
    setTransactions((prev) =>
      prev.map((t) => (t.category === target.name ? { ...t, category: "Other" } : t))
    );
  };

  const handleResetToDemo = () => {
    if (confirm("Are you sure you want to revert all records back to the demo showcase dataset?")) {
      setTransactions(DEMO_TRANSACTIONS);
      setCategories(DEFAULT_CATEGORIES);
      setSelectedMonth("2026-05");
      localStorage.removeItem("forecast_transactions");
      localStorage.removeItem("forecast_categories");
    }
  };

  const handleBulkImport = (newItems: Transaction[]) => {
    setTransactions((prev) => [...newItems, ...prev]);
  };

  // Filtered transactions for the ledger table list
  const filteredTransactionsList = useMemo(() => {
    return transactions.filter((t) => {
      const matchSearch = t.description.toLowerCase().includes(searchFilter.toLowerCase()) || 
                          t.category.toLowerCase().includes(searchFilter.toLowerCase());
      const matchCategory = categoryFilter === "all" || t.category === categoryFilter;
      const matchSource = sourceFilter === "all" || t.source === sourceFilter;
      return matchSearch && matchCategory && matchSource;
    });
  }, [transactions, searchFilter, categoryFilter, sourceFilter]);

  // Page index lists
  const paginatedList = useMemo(() => {
    const startIndex = (ledgerPage - 1) * itemsPerPage;
    return filteredTransactionsList.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactionsList, ledgerPage]);

  const totalPages = Math.ceil(filteredTransactionsList.length / itemsPerPage) || 1;

  // Aggregate stats dashboard indices
  const currentMonthTotalIncome = selectedMonthData.totalIncome;
  const currentMonthTotalExpense = selectedMonthData.totalExpense;
  const netSavingsRate = currentMonthTotalIncome > 0 
    ? Math.round(((currentMonthTotalIncome - currentMonthTotalExpense) / currentMonthTotalIncome) * 100)
    : 0;

  // Format month codes to pleasant display headings (e.g. "2026-05" -> "May 2026")
  const formatMonthLabel = (mStr: string) => {
    const [yr, mn] = mStr.split("-");
    const d = new Date(Number(yr), Number(mn) - 1, 1);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-[#fbfcfc] text-gray-800 antialiased font-serif">
      {/* Decorative overhead subtle layout line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600"></div>

      {/* Primary Container */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        
        {/* Navigation & Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-gray-100 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2 rounded-md bg-emerald-50 text-emerald-700 text-xs font-mono font-semibold tracking-wider uppercase">
                Offline Local Data
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs text-gray-400 font-mono">UTC: 2026-05-22</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 font-sans">
              Financial Expense Tracker & Forecaster
            </h1>
            <p className="text-sm text-gray-500 font-sans leading-relaxed">
              Import electronic CSV files or bank statement PDFs. Extrapolate future spending trends and identify recurring subscriptions automatically.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="revert-demo-btn"
              onClick={handleResetToDemo}
              className="px-3.5 py-2 border border-gray-200 text-xs font-semibold rounded-xl text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-50 hover:border-gray-300 transition flex items-center gap-1.5 cursor-pointer font-sans"
              title="Restore demo transactions"
            >
              <Undo className="w-3.5 h-3.5" /> Revert Demo Data
            </button>

            <button
              id="open-csv-upload"
              onClick={() => setActiveImportTab("csv")}
              className="px-4 py-2 bg-white border border-gray-200 text-xs font-semibold rounded-xl text-emerald-700 hover:text-emerald-800 hover:border-emerald-300 shadow-sm hover:bg-emerald-50/20 transition flex items-center gap-2 cursor-pointer font-sans"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Import CSV
            </button>

            <button
              id="open-pdf-upload"
              onClick={() => setActiveImportTab("pdf")}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer font-sans"
            >
              <FileText className="w-4 h-4" />
              <span>AI PDF Statement</span>
            </button>
          </div>
        </header>

        {/* Global Financial Metrics Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-sans">
                Selected Reporting Month
              </span>
              <div className="p-1 px-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent border-0 text-xs font-semibold focus:ring-0 cursor-pointer text-gray-700 py-0.5 font-sans"
                >
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>{formatMonthLabel(m)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-bold text-gray-900 font-sans">
                {formatMonthLabel(selectedMonth)}
              </p>
            </div>
            <p className="text-xs text-gray-400 font-sans">
              All calculations on charts adapt to this selection
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-sans">
                Month Income Cashflow
              </span>
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-semibold text-gray-400 font-sans">$</span>
              <span className="text-3xl font-bold text-gray-900 tracking-tight font-sans">
                {currentMonthTotalIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 font-sans">
              Direct deposit & source credits
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-sans">
                Month Outgoings / Expenses
              </span>
              <div className="p-1.5 bg-red-50 text-red-500 rounded-lg">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-semibold text-gray-400 font-sans">$</span>
              <span className="text-3xl font-bold text-gray-900 tracking-tight font-sans">
                {currentMonthTotalExpense.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs text-red-500 font-medium font-sans">
              Active ledger items total
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm space-y-2 bg-emerald-50/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider font-sans">
                Monthly Net Savings Velocity
              </span>
              <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-emerald-600 tracking-tight font-sans">
                {netSavingsRate >= 0 ? "+" : ""}{netSavingsRate}%
              </span>
              <span className="text-xs font-medium text-gray-400 font-sans">
                (${Math.max(0, currentMonthTotalIncome - currentMonthTotalExpense).toLocaleString("en-US")})
              </span>
            </div>
            <p className="text-xs text-gray-500 font-sans">
              Proportion of salary set aside securely
            </p>
          </div>

        </section>

        {/* Core Analysis Dashboard Bento Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Column Left: Graphs & Trends breakdown (7/12 width) */}
          <section className="lg:col-span-7 space-y-6">
            
            {/* 1. Category wise spending interactive breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 font-sans font-medium">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    Month Outflow by Categories
                  </h3>
                  <p className="text-xs text-gray-400 font-sans mt-0.5">
                    Visual percentage division for {formatMonthLabel(selectedMonth)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-mono font-semibold bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">
                    {selectedCategorySummary.length} Active Categories
                  </span>
                </div>
              </div>

              {selectedCategorySummary.length === 0 ? (
                <div className="py-12 text-center text-gray-400 space-y-2">
                  <p className="text-sm">No expenses logged for this month yet.</p>
                  <p className="text-xs text-gray-300">Either select an active month or upload new CSV dataset.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Decorative Multi-Color Ribbon Bar representing proportional categories */}
                  <div className="w-full h-3.5 rounded-full flex overflow-hidden bg-gray-100 shadow-inner">
                    {selectedCategorySummary.map((cat, idx) => {
                      const percentage = (cat.value / (currentMonthTotalExpense || 1)) * 100;
                      return (
                        <div
                          key={idx}
                          style={{ 
                            width: `${percentage}%`, 
                            backgroundColor: cat.color 
                          }}
                          className="h-full transition-all duration-500 hover:opacity-80"
                          title={`${cat.name}: $${cat.value.toFixed(2)} (${Math.round(percentage)}%)`}
                        />
                      );
                    })}
                  </div>

                  {/* Render listed categories with numerical progress bars client */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {selectedCategorySummary.map((cat, idx) => {
                      const sharePct = (cat.value / (currentMonthTotalExpense || 1)) * 100;
                      return (
                        <div key={idx} className="space-y-1.5 p-2 rounded-xl hover:bg-gray-50 transition border border-transparent hover:border-gray-100">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 max-w-[140px]">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                              <span className="font-semibold text-gray-700 truncate font-sans">{cat.name}</span>
                            </div>
                            <span className="font-mono text-gray-900 font-semibold">
                              ${cat.value.toFixed(2)} <span className="text-gray-400 text-[10px]">({Math.round(sharePct)}%)</span>
                            </span>
                          </div>
                          
                          {/* Inner Bar Gauge */}
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500" 
                              style={{ 
                                width: `${sharePct}%`,
                                backgroundColor: cat.color
                              }} 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Interactive Linear Trend Projection Graphic */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 font-sans font-medium">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Adaptive Financial Projections Trend
                  </h3>
                  <p className="text-xs text-gray-400 font-sans mt-0.5">
                    Combines regular monthly subscriptions with historical linear trends
                  </p>
                </div>

                {/* Horizon timeline control selector */}
                <div className="flex items-center gap-2 text-xs font-sans">
                  <span className="text-gray-500 font-medium">Horizon:</span>
                  <div className="inline-flex rounded-lg border border-gray-250 bg-gray-50 p-1">
                    {[3, 6, 12].map((num) => (
                      <button
                        key={num}
                        onClick={() => setForecastMonths(num)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
                          forecastMonths === num 
                            ? "bg-white text-gray-900 shadow-sm" 
                            : "text-gray-500 hover:text-gray-800"
                        }`}
                      >
                        {num}M
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {forecastData.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  <p className="text-sm">Please insert more transaction history rows first to generate forecasts.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Beautiful SVG Sparkline showing historic & forecast timeline */}
                  <div className="relative h-56 w-full border border-gray-50 rounded-xl bg-gray-50/30 p-2 overflow-hidden">
                    
                    {/* SVG Container plotting historic dots vs projected dashes */}
                    <svg className="w-full h-full" overflow="visible">
                      <g transform="translate(0, 10)">
                        {/* Build visual paths and coordinates dynamically */}
                        {(() => {
                          const width = 580; // normalized svg scale base
                          const height = 180;
                          
                          // Track min/max thresholds across projected balances to scale plot perfectly
                          const allBalances = forecastData.map(p => p.projectedBalance);
                          const allExpenses = forecastData.map(p => p.projectedExpense);
                          const minVal = Math.min(...allBalances, ...allExpenses, 0);
                          const maxVal = Math.max(...allBalances, 1000) * 1.05;
                          const valRange = maxVal - minVal;

                          const getX = (index: number) => {
                            if (forecastData.length <= 1) return 0;
                            return (index / (forecastData.length - 1)) * 95 + "%";
                          };

                          const getY = (amount: number) => {
                            const ratio = (amount - minVal) / (valRange || 1);
                            return height - ratio * height;
                          };

                          // Construct Balance Trend Path
                          let balancePath = "";
                          forecastData.forEach((p, idx) => {
                            const xPercentage = (idx / (forecastData.length - 1)) * 100;
                            const y = getY(p.projectedBalance);
                            if (idx === 0) {
                              balancePath += `M ${xPercentage}% ${y}`;
                            } else {
                              balancePath += ` L ${xPercentage}% ${y}`;
                            }
                          });

                          // Construct Expense Path
                          let expensePath = "";
                          forecastData.forEach((p, idx) => {
                            const xPercentage = (idx / (forecastData.length - 1)) * 100;
                            const y = getY(p.projectedExpense);
                            if (idx === 0) {
                              expensePath += `M ${xPercentage}% ${y}`;
                            } else {
                              expensePath += ` L ${xPercentage}% ${y}`;
                            }
                          });

                          return (
                            <>
                              {/* Horizontal helper gridlines */}
                              {[0.25, 0.5, 0.75].map((ratio, gridIdx) => (
                                <line
                                  key={gridIdx}
                                  x1="0%"
                                  y1={height * ratio}
                                  x2="100%"
                                  y2={height * ratio}
                                  stroke="#e5e7eb"
                                  strokeDasharray="4 4"
                                />
                              ))}

                              {/* Split Vertical Line between History and Forecast */}
                              {(() => {
                                const splitIndex = forecastData.findIndex(p => p.isForecast);
                                if (splitIndex === -1) return null;
                                const xPct = (splitIndex / (forecastData.length - 1)) * 100;
                                return (
                                  <>
                                    <line
                                      x1={`${xPct}%`}
                                      y1="0"
                                      x2={`${xPct}%`}
                                      y2={height}
                                      stroke="#bbf7d0"
                                      strokeWidth="2"
                                      strokeDasharray="3 2"
                                    />
                                    <text
                                      x={`${xPct + 1}%`}
                                      y="12"
                                      fill="#059669"
                                      fontSize="9"
                                      fontFamily="sans-serif"
                                      fontWeight="bold"
                                    >
                                      🠎 PROJECTIONS
                                    </text>
                                  </>
                                );
                              })()}

                              {/* Draw Expense Trend Curve (Red/Orange-ish) */}
                              <path
                                d={expensePath}
                                fill="none"
                                stroke="#f87171"
                                strokeWidth="2.5"
                                strokeDasharray="3 3"
                                className="opacity-70"
                              />

                              {/* Draw Liquid Assets Running Balance Curve (Emerald Green theme) */}
                              <path
                                d={balancePath}
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="3"
                              />

                              {/* Interactive Nodes or End Indicator Nodes */}
                              {forecastData.map((pt, idx) => {
                                const x = (idx / (forecastData.length - 1)) * 100;
                                if (idx === 0 || idx === forecastData.length - 1 || pt.isForecast) {
                                  return (
                                    <g key={idx}>
                                      <circle
                                        cx={`${x}%`}
                                        cy={getY(pt.projectedBalance)}
                                        r={pt.isForecast ? "4.5" : "3.5"}
                                        fill={pt.isForecast ? "#059669" : "#10b981"}
                                        stroke="#ffffff"
                                        strokeWidth="1.5"
                                      />
                                    </g>
                                  );
                                }
                                return null;
                              })}
                            </>
                          );
                        })()}
                      </g>
                    </svg>

                    {/* Timeline X-Axis display coordinates tags */}
                    <div className="absolute bottom-1 left-2 right-2 flex justify-between text-[10px] font-mono text-gray-400 font-semibold">
                      <span>{forecastData[0]?.date}</span>
                      <span className="text-emerald-600 font-bold bg-emerald-50 px-1 rounded">Estimated Future Balance Line</span>
                      <span>{forecastData[forecastData.length - 1]?.date}</span>
                    </div>
                  </div>

                  {/* Summary analysis report footer details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                    <div className="space-y-1">
                      <span className="text-gray-400 font-semibold font-sans uppercase">Expected Monthly Income baseline</span>
                      <p className="text-sm font-bold text-gray-900 font-sans">
                        ${(forecastData.find(p => p.isForecast)?.projectedIncome || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}/month
                      </p>
                      <p className="text-[10px] text-gray-400 font-sans">Calculated via regular historical paycheck deposits</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-gray-400 font-semibold font-sans uppercase">Projected End balance point</span>
                      <p className="text-sm font-bold text-emerald-700 font-sans flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ${(forecastData[forecastData.length - 1]?.projectedBalance || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                        <span className="text-xs font-normal text-gray-400">({forecastMonths}M)</span>
                      </p>
                      <p className="text-[10px] text-gray-400 font-sans">
                        Assuming current subscription patterns & averages remain fixed
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </section>

          {/* Column Right: AI subscription recognition + Custom Rules (5/12 width) */}
          <section className="lg:col-span-5 space-y-6">
            
            {/* 1. Automated Bill & Recurring Subscription detector */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 font-sans font-medium">
                  <CalendarCheck2 className="w-5 h-5 text-emerald-600" />
                  Identified Recurring Expenses
                </h3>
                <p className="text-xs text-gray-400 font-sans mt-0.5">
                  Extracted automatically from transaction interval histories
                </p>
              </div>

              {recurringExpenses.length === 0 ? (
                <div className="py-12 text-center text-gray-400 space-y-1">
                  <p className="text-sm">No regular occurrences detected yet.</p>
                  <p className="text-xs text-gray-300">Requires at least 2 database entries with matching payer descriptions to verify interval patterns.</p>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                  {recurringExpenses.map((bill) => (
                    <div 
                      key={bill.id} 
                      className="p-3.5 rounded-xl border border-gray-150/80 bg-[#fafbfa] flex items-center justify-between shadow-sm animate-fade-in"
                    >
                      <div className="space-y-1 max-w-[70%]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-xs text-gray-900 font-sans truncate block max-w-[170px]" title={bill.descriptionPattern}>
                            {bill.descriptionPattern}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-[10px] text-emerald-700 font-semibold font-sans">
                            {bill.frequency}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 font-sans">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-300" /> Wait: Estim. {bill.nextEstimatedDate}
                          </span>
                          <span className="text-emerald-500 font-bold bg-emerald-50 px-1 rounded-sm text-[9px]">
                            {bill.confidence}% similarity match
                          </span>
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <p className="text-xs font-semibold text-gray-800 font-mono">
                          Avg: ${bill.averageAmount.toFixed(2)}
                        </p>
                        <p className="text-[10px] text-gray-400 font-sans italic">
                          {bill.occurrences} matches found
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Embedded Category Color & Custom Label Manager */}
            <CategoryManager 
              categories={categories}
              onAddCategory={handleAddCategory}
              onDeleteCategory={handleDeleteCategory}
            />

          </section>

        </div>

        {/* Global Transactions Ledger/Spreadsheet Area */}
        <section id="transactions-ledger-panel" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-gray-150/85 gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 font-sans">Bank Transactions Ledger</h3>
              <p className="text-xs text-gray-400 font-sans">
                Review and update item categories to immediately recalculate analytical projection models
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                id="toggle-add-btn"
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-3.5 py-2 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold rounded-xl shadow-sm transition flex items-center gap-1 cursor-pointer font-sans"
              >
                {showAddForm ? "Hide Form" : <><Plus className="w-3.5 h-3.5" /> Manual Entry</>}
              </button>
            </div>
          </div>

          {/* Inline Add form */}
          {showAddForm && (
            <form onSubmit={handleAddManualTransaction} className="grid grid-cols-1 md:grid-cols-5 gap-3.5 bg-gray-50/70 p-4 rounded-xl border border-gray-100 animate-slide-down">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase font-sans">Calendar Date</label>
                <input
                  type="date"
                  className="w-full text-xs rounded-lg border-gray-200 bg-white p-2.5 shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                  value={newTx.date}
                  onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1 md:col-span-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase font-sans">Payment Vendor / Memo</label>
                <input
                  type="text"
                  placeholder="e.g. Starbucks, Kroger Outlet"
                  className="w-full text-xs rounded-lg border-gray-200 bg-white p-2.5 shadow-sm focus:ring-emerald-500"
                  value={newTx.description}
                  onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase font-sans">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="24.99"
                  className="w-full text-xs rounded-lg border-gray-200 bg-white p-2.5 shadow-sm focus:ring-emerald-500"
                  value={newTx.amount}
                  onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase font-sans">Flow Vector</label>
                <select
                  className="w-full text-xs rounded-lg border-gray-200 bg-white p-2.5 shadow-sm"
                  value={newTx.type}
                  onChange={(e) => setNewTx({ ...newTx, type: e.target.value as "expense" | "income" })}
                >
                  <option value="expense">Expense (-)</option>
                  <option value="income">Income (+)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase font-sans">Category Assignee</label>
                <div className="flex gap-1.5">
                  <select
                    className="flex-1 text-xs rounded-lg border-gray-200 bg-white p-2.5 shadow-sm disabled:opacity-50"
                    value={newTx.category}
                    onChange={(e) => setNewTx({ ...newTx, category: e.target.value })}
                    disabled={newTx.type === "income"}
                  >
                    {categories.filter((c) => c.name !== "Income").map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shrink-0 cursor-pointer"
                    title="Add manual transaction row"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Filter Controls Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            {/* Search filter input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Lookup merchant or matching pattern..."
                className="w-full pl-9 text-xs rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm focus:border-emerald-500"
                value={searchFilter}
                onChange={(e) => {
                  setSearchFilter(e.target.value);
                  setLedgerPage(1); // Reset page indices
                }}
              />
            </div>

            {/* Quick dropdown filters */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-sans">
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm">
                <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-gray-400">Category:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setLedgerPage(1);
                  }}
                  className="bg-transparent border-0 py-0.5 text-gray-700 font-semibold focus:ring-0 cursor-pointer"
                >
                  <option value="all">All Category Types</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm">
                <span className="text-gray-400 font-medium">Source:</span>
                <select
                  value={sourceFilter}
                  onChange={(e) => {
                    setSourceFilter(e.target.value);
                    setLedgerPage(1);
                  }}
                  className="bg-transparent border-0 py-0.5 text-gray-700 font-semibold focus:ring-0 cursor-pointer"
                >
                  <option value="all">All Channels</option>
                  <option value="manual">Manual Entry</option>
                  <option value="csv">CSV Import</option>
                  <option value="pdf">PDF Statement</option>
                </select>
              </div>

              {filteredTransactionsList.length !== transactions.length && (
                <button
                  onClick={() => {
                    setSearchFilter("");
                    setCategoryFilter("all");
                    setSourceFilter("all");
                  }}
                  className="text-emerald-700 hover:text-emerald-800 hover:underline font-semibold"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Primary Spreadsheet Ledger Table */}
          <div className="border border-gray-150/80 rounded-2xl overflow-hidden shadow-sm bg-white">
            <div className="max-w-full overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 font-semibold text-gray-600 font-sans">
                    <th className="p-3.5">Calendar Date</th>
                    <th className="p-3.5">Vendor / Payee Memo</th>
                    <th className="p-3.5">File Channel Source</th>
                    <th className="p-3.5">Assigned Category Label</th>
                    <th className="p-3.5 text-right">Value Amount</th>
                    <th className="p-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-sans">
                  {paginatedList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-gray-400">
                        No transactions registered matching active ledger filter queries.
                      </td>
                    </tr>
                  ) : (
                    paginatedList.map((tx) => {
                      const matchCat = categories.find((c) => c.name === tx.category) || { color: "#9ca3af" };
                      return (
                        <tr key={tx.id} className="hover:bg-gray-50/60 transition group">
                          
                          {/* 1. Date */}
                          <td className="p-3.5 font-mono text-gray-500 font-medium whitespace-nowrap">
                            {tx.date}
                          </td>

                          {/* 2. Description */}
                          <td className="p-3.5 font-medium text-gray-900 truncate max-w-[200px]" title={tx.description}>
                            {tx.description}
                          </td>

                          {/* 3. Source Indicator badges */}
                          <td className="p-3.5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              tx.source === "pdf" 
                                ? "bg-amber-50 text-amber-700 border border-amber-100"
                                : tx.source === "csv"
                                ? "bg-blue-50 text-blue-700 border border-blue-100"
                                : "bg-gray-100 text-gray-600 border border-gray-200"
                            }`}>
                              {tx.source === "pdf" ? "AI PDF" : tx.source === "csv" ? "Spreadsheet" : "Manual"}
                            </span>
                          </td>

                          {/* 4. Adaptive Category selector dropdown */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: matchCat.color }} />
                              <select
                                className="bg-transparent border-0 cursor-pointer p-0.5 text-xs text-gray-700 font-semibold focus:ring-0 focus:border-0 hover:bg-gray-50 rounded"
                                value={tx.category}
                                disabled={tx.type === "income"}
                                onChange={(e) => handleUpdateTransactionCategory(tx.id, e.target.value)}
                              >
                                {tx.type === "income" ? (
                                  <option value="Income">Salary Paycheck</option>
                                ) : (
                                  categories.filter(c => c.name !== "Income").map((cat) => (
                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                  ))
                                )}
                              </select>
                            </div>
                          </td>

                          {/* 5. Numeric Amount flow values */}
                          <td className={`p-3.5 text-right font-semibold font-mono whitespace-nowrap ${
                            tx.type === "income" ? "text-emerald-600" : "text-gray-900"
                          }`}>
                            {tx.type === "income" ? "+ " : "- "}${tx.amount.toFixed(2)}
                          </td>

                          {/* 6. Action button deletion */}
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => handleRemoveTransaction(tx.id)}
                              className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition opacity-60 group-hover:opacity-100 shrink-0 cursor-pointer"
                              title="Delete transaction line"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer bar */}
            <div className="p-4 border-t border-gray-100 bg-gray-5/50 flex items-center justify-between font-sans text-xs">
              <span className="text-gray-500">
                Presents <strong>{filteredTransactionsList.length === 0 ? 0 : (ledgerPage - 1) * itemsPerPage + 1}</strong> to{" "}
                <strong>{Math.min(ledgerPage * itemsPerPage, filteredTransactionsList.length)}</strong> of{" "}
                <strong>{filteredTransactionsList.length}</strong> items
              </span>

              <div className="inline-flex gap-2.5">
                <button
                  onClick={() => setLedgerPage(Math.max(1, ledgerPage - 1))}
                  disabled={ledgerPage === 1}
                  className="px-3.5 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>
                <button
                  onClick={() => setLedgerPage(Math.min(totalPages, ledgerPage + 1))}
                  disabled={ledgerPage === totalPages}
                  className="px-3.5 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Next Page
                </button>
              </div>
            </div>
          </div>

        </section>

      </div>

      {/* CSV Spreadsheet Importer Backdrop Panel modal */}
      {activeImportTab === "csv" && (
        <CsvImport
          categories={categories.map((c) => c.name)}
          onImport={handleBulkImport}
          onClose={() => setActiveImportTab("none")}
        />
      )}

      {/* PDF Bank Statement Importer Backdrop Panel modal */}
      {activeImportTab === "pdf" && (
        <PdfImport
          onImport={handleBulkImport}
          onClose={() => setActiveImportTab("none")}
        />
      )}

    </div>
  );
}
