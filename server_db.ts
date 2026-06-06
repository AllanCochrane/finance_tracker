import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Initialize SQLite database in the root folder context
const dbPath = process.env.DB_PATH || path.join(process.cwd(), "expenses.db");
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const db = new Database(dbPath);

export interface DbTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  source: string;
  confidence?: number;
}

export interface DbCategory {
  id: string;
  name: string;
  color: string;
  isDefault: number; // 0 or 1
}

// Default Categories for bootstrapping
const DEFAULT_CATEGORIES = [
  { id: "1", name: "Housing", color: "#f87171", isDefault: 1 },
  { id: "2", name: "Utilities", color: "#fb923c", isDefault: 1 },
  { id: "3", name: "Groceries", color: "#fbbf24", isDefault: 1 },
  { id: "4", name: "Food & Dining", color: "#34d399", isDefault: 1 },
  { id: "5", name: "Transportation", color: "#60a5fa", isDefault: 1 },
  { id: "6", name: "Shopping", color: "#818cf8", isDefault: 1 },
  { id: "7", name: "Entertainment", color: "#c084fc", isDefault: 1 },
  { id: "8", name: "Subscriptions", color: "#f472b6", isDefault: 1 },
  { id: "9", name: "Income", color: "#2dd4bf", isDefault: 1 },
  { id: "10", name: "Other", color: "#9ca3af", isDefault: 1 },
];

// Demo transactions dataset matching existing demo
const SEED_TRANSACTIONS = [
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

export function dbInit() {
  // Create tables inside sqlite db securely
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE,
      color TEXT,
      isDefault INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      date TEXT,
      description TEXT,
      amount REAL,
      type TEXT,
      category TEXT,
      source TEXT,
      confidence REAL
    );
  `);

  // Initial seed check for Categories
  const categoryCount = db.prepare("SELECT COUNT(*) as count FROM categories").get() as { count: number };
  if (categoryCount.count === 0) {
    console.log("Seeding default categories in SQLite database...");
    const insertCat = db.prepare("INSERT INTO categories (id, name, color, isDefault) VALUES (?, ?, ?, ?)");
    const runTransaction = db.transaction(() => {
      for (const cat of DEFAULT_CATEGORIES) {
        insertCat.run(cat.id, cat.name, cat.color, cat.isDefault);
      }
    });
    runTransaction();
  }

  // Initial seed check for Transactions
  const txCount = db.prepare("SELECT COUNT(*) as count FROM transactions").get() as { count: number };
  if (txCount.count === 0 && process.env.SKIP_SEED_DATA !== "true") {
    console.log("Seeding demo transactions in SQLite database...");
    const insertTx = db.prepare(`
      INSERT INTO transactions (id, date, description, amount, type, category, source, confidence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const runTransaction = db.transaction(() => {
      for (const tx of SEED_TRANSACTIONS) {
        insertTx.run(tx.id, tx.date, tx.description, tx.amount, tx.type, tx.category, tx.source, 1.0);
      }
    });
    runTransaction();
  }
}

// Categories Actions
export function getCategories(): DbCategory[] {
  return db.prepare("SELECT * FROM categories").all() as DbCategory[];
}

export function addCategory(id: string, name: string, color: string): DbCategory {
  db.prepare("INSERT INTO categories (id, name, color, isDefault) VALUES (?, ?, ?, 0)")
    .run(id, name, color);
  return { id, name, color, isDefault: 0 };
}

export function deleteCategory(id: string) {
  // Find name first to update transactions of this deleted category to 'Other'
  const cat = db.prepare("SELECT name FROM categories WHERE id = ?").get(id) as { name: string } | undefined;
  if (cat) {
    db.prepare("DELETE FROM categories WHERE id = ?").run(id);
    db.prepare("UPDATE transactions SET category = 'Other' WHERE category = ?").run(cat.name);
  }
}

// Transactions Actions
export function getTransactions(): DbTransaction[] {
  // Return sorted descending by date
  return db.prepare("SELECT * FROM transactions ORDER BY date DESC, id DESC").all() as DbTransaction[];
}

export function addTransaction(tx: DbTransaction) {
  db.prepare(`
    INSERT INTO transactions (id, date, description, amount, type, category, source, confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(tx.id, tx.date, tx.description, tx.amount, tx.type, tx.category, tx.source, tx.confidence || null);
}

export function addMultipleTransactions(txs: DbTransaction[]) {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO transactions (id, date, description, amount, type, category, source, confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const runTransaction = db.transaction(() => {
    for (const tx of txs) {
      insert.run(tx.id, tx.date, tx.description, tx.amount, tx.type, tx.category, tx.source, tx.confidence || null);
    }
  });
  runTransaction();
}

export function deleteTransaction(id: string) {
  db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
}

export function updateTransactionCategory(id: string, category: string) {
  db.prepare("UPDATE transactions SET category = ? WHERE id = ?").run(category, id);
}

export function resetToDemo() {
  db.exec("DELETE FROM transactions");
  db.exec("DELETE FROM categories");
  
  // Re-seed
  const insertCat = db.prepare("INSERT INTO categories (id, name, color, isDefault) VALUES (?, ?, ?, ?)");
  const catTransaction = db.transaction(() => {
    for (const cat of DEFAULT_CATEGORIES) {
      insertCat.run(cat.id, cat.name, cat.color, cat.isDefault);
    }
  });
  catTransaction();

  const insertTx = db.prepare(`
    INSERT INTO transactions (id, date, description, amount, type, category, source, confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const txTransaction = db.transaction(() => {
    for (const tx of SEED_TRANSACTIONS) {
      insertTx.run(tx.id, tx.date, tx.description, tx.amount, tx.type, tx.category, tx.source, 1.0);
    }
  });
  txTransaction();
}
