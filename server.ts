import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import {
  dbInit,
  getCategories,
  addCategory,
  deleteCategory,
  getTransactions,
  addTransaction,
  addMultipleTransactions,
  deleteTransaction,
  updateTransactionCategory,
  resetToDemo
} from "./server_db";

dotenv.config();

async function startServer() {
  // Initialize the SQLite tables and seed data if needed
  dbInit();

  const app = express();
  const PORT = 3000;

  // Set limits to handle large bank statement PDF base64 payloads
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ limit: "20mb", extended: true }));

  // API Check Status Endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // DB Categories Endpoints
  app.get("/api/categories", (req, res) => {
    try {
      const categories = getCategories();
      res.json({ categories });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch categories." });
    }
  });

  app.post("/api/categories", (req, res) => {
    try {
      const { id, name, color } = req.body;
      if (!id || !name || !color) {
        return res.status(400).json({ error: "Missing required category fields." });
      }
      const newCat = addCategory(id, name, color);
      res.json(newCat);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to add category." });
    }
  });

  app.delete("/api/categories/:id", (req, res) => {
    try {
      const { id } = req.params;
      deleteCategory(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to delete category." });
    }
  });

  // DB Transactions Endpoints
  app.get("/api/transactions", (req, res) => {
    try {
      const transactions = getTransactions();
      res.json({ transactions });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch transactions." });
    }
  });

  app.post("/api/transactions", (req, res) => {
    try {
      const tx = req.body;
      if (!tx.id || !tx.date || !tx.description || tx.amount === undefined || !tx.type || !tx.category || !tx.source) {
        return res.status(400).json({ error: "Missing required transaction fields." });
      }
      addTransaction(tx);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to add transaction." });
    }
  });

  app.post("/api/transactions/bulk", (req, res) => {
    try {
      const { transactions } = req.body;
      if (!transactions || !Array.isArray(transactions)) {
        return res.status(400).json({ error: "Transactions array is required." });
      }
      addMultipleTransactions(transactions);
      res.json({ success: true, count: transactions.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to bulk import transactions." });
    }
  });

  app.put("/api/transactions/:id/category", (req, res) => {
    try {
      const { id } = req.params;
      const { category } = req.body;
      if (!category) {
        return res.status(400).json({ error: "Category field is required." });
      }
      updateTransactionCategory(id, category);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to update category." });
    }
  });

  app.delete("/api/transactions/:id", (req, res) => {
    try {
      const { id } = req.params;
      deleteTransaction(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to delete transaction." });
    }
  });

  app.post("/api/reset", (req, res) => {
    try {
      resetToDemo();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to reset data." });
    }
  });

  // API to Parse PDF Statement with Gemini AI
  app.post("/api/parse-pdf", async (req, res) => {
    try {
      const { pdfBase64 } = req.body;
      if (!pdfBase64) {
        return res.status(400).json({ error: "No PDF data provided." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: "GEMINI_API_KEY environment variable is not configured. Please supply your API key in the Secrets panel in Settings."
        });
      }

      // Strip potential base64 prefixes
      const base64Clean = pdfBase64.replace(/^data:[^;]+;base64,/, "");

      // Initialize Google Gen AI on Server with standard user agent header
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Construct Part objects
      const pdfPart = {
        inlineData: {
          mimeType: "application/pdf",
          data: base64Clean,
        },
      };

      const promptPart = {
        text: "Analyze this monthly bank or credit card transaction statement PDF and extract all transaction records. " +
          "Classify each transaction accurately. For each transaction, extract:\n" +
          "1. Date - as YYYY-MM-DD. Estimate 2026 as the year if the document doesn't display years explicitly.\n" +
          "2. Description - a clean description or payee name.\n" +
          "3. Amount - absolute positive numeric float value.\n" +
          "4. Type - either 'expense' if it decreases funds/withdraws, or 'income' if it credits/deposits funds.\n" +
          "5. Category - Choose the single best category out of: ['Housing', 'Utilities', 'Groceries', 'Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Subscriptions', 'Income', 'Other']."
      };

      // Call Gemini 3.5 Flash model with Schema Constraint for structured results
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [pdfPart, promptPart],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              transactions: {
                type: Type.ARRAY,
                description: "Array of transaction records found.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    date: {
                      type: Type.STRING,
                      description: "The calendar date formatted as YYYY-MM-DD."
                    },
                    description: {
                      type: Type.STRING,
                      description: "Clean description of the vendor/merchant or source."
                    },
                    amount: {
                      type: Type.NUMBER,
                      description: "The itemized financial value of the transaction as positive number."
                    },
                    type: {
                      type: Type.STRING,
                      description: "The transaction cash flow vector.",
                      enum: ["expense", "income"]
                    },
                    category: {
                      type: Type.STRING,
                      description: "An adaptive categorical label.",
                      enum: ["Housing", "Utilities", "Groceries", "Food & Dining", "Transportation", "Shopping", "Entertainment", "Subscriptions", "Income", "Other"]
                    }
                  },
                  required: ["date", "description", "amount", "type", "category"]
                }
              }
            },
            required: ["transactions"]
          }
        }
      });

      const outputText = response.text || "{}";
      const parsedData = JSON.parse(outputText.trim());
      
      // Return list of structured transactions
      return res.json(parsedData);

    } catch (error: any) {
      console.error("Gemini statement PDF processing failure: ", error);
      return res.status(500).json({
        error: error.message || "Failed to extract transaction list from your PDF."
      });
    }
  });

  // Setup development or production static site serving pipeline
  if (process.env.NODE_ENV !== "production") {
    console.log("Mounting Vite middleware in development environment...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Mounting production static site file serving...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Listen exclusively on the required port 3000 and 0.0.0.0
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server starting securely on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Initialization crash:", err);
});
