import React, { useState, useRef, useEffect } from "react";
import { FileText, Wand2, Check, AlertCircle, Eye, Info, RefreshCw } from "lucide-react";
import { Transaction } from "../types";

interface PdfImportProps {
  onImport: (newTransactions: Transaction[]) => void;
  onClose: () => void;
}

const REASSURING_MESSAGES = [
  "Scrutinizing document structure layout...",
  "Running Gemini generative receipt vision analyzer...",
  "Decoding dense monthly statement transactions tables...",
  "Differentiating expenses from direct deposits...",
  "Auto-detecting merchant identities... almost complete!"
];

export default function PdfImport({ onImport, onClose }: PdfImportProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [parsedTransactions, setParsedTransactions] = useState<Transaction[]>([]);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rotate helpful AI loading state messages
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % REASSURING_MESSAGES.length);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf" || droppedFile.name.endsWith(".pdf")) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError("Please upload a PDF document (.pdf)");
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/pdf" || selectedFile.name.endsWith(".pdf")) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError("Please upload a PDF document (.pdf)");
      }
    }
  };

  const triggerGeminiParse = async () => {
    if (!file) {
      setError("Please select a valid PDF file first.");
      return;
    }

    setLoading(true);
    setLoadingMsgIdx(0);
    setError(null);

    try {
      // Step 1: Read PDF into Base64 format
      const base64Promise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
      });

      const base64DataWithPrefix = await base64Promise;
      
      // Step 2: Post to our Express API proxy which holds the GEMINI_API_KEY
      const response = await fetch("/api/parse-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64: base64DataWithPrefix }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Server failed to analyze the PDF.");
      }

      const result = await response.json();
      
      if (!result.transactions || !Array.isArray(result.transactions)) {
        throw new Error("No transactions list parsed. Is this a scanned statement image/unreadable PDF?");
      }

      if (result.transactions.length === 0) {
        throw new Error("Gemini completed parsing successfully but found 0 transactions in this PDF.");
      }

      // Map unique random ID to each extracted transaction
      const mapped: Transaction[] = result.transactions.map((tx: any) => ({
        id: `pdf-${Math.random().toString(36).substr(2, 9)}`,
        date: tx.date || new Date().toISOString().split("T")[0],
        description: tx.description || "Unknown vendor",
        amount: Number(tx.amount) || 0,
        type: tx.type === "income" ? "income" : "expense",
        category: tx.category || "Other",
        source: "pdf",
        confidence: 90, // AI rating confidence
      }));

      setParsedTransactions(mapped);
      setSelectedTxIds(new Set(mapped.map((t) => t.id)));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to parse file. Ensure it is a valid, readable bank PDF statement.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectTx = (id: string) => {
    setSelectedTxIds((prev) => {
      const updated = new Set(prev);
      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
      }
      return updated;
    });
  };

  const selectAll = () => {
    if (selectedTxIds.size === parsedTransactions.length) {
      setSelectedTxIds(new Set());
    } else {
      setSelectedTxIds(new Set(parsedTransactions.map((t) => t.id)));
    }
  };

  const handleCompleteImport = () => {
    const activeToImport = parsedTransactions.filter((tx) => selectedTxIds.has(tx.id));
    if (activeToImport.length === 0) {
      setError("Please check at least one transaction to commit.");
      return;
    }
    onImport(activeToImport);
    onClose();
  };

  const handleCategoryFieldChange = (id: string, category: string) => {
    setParsedTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, category } : t))
    );
  };

  return (
    <div id="pdf-import-modal" className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div id="pdf-import-card" className="bg-white rounded-2xl shadow-xl w-full max-w-3xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <span className="p-1 px-2 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-mono font-bold uppercase">AI Vision</span>
              Extract transaction PDF data
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Upload standard monthly e-statements. Uses Gemini 3.5 Flash server-side to extract data automatically.
            </p>
          </div>
          <button id="close-pdf-btn" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition">
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">Processing Interrupted</p>
                <p className="text-xs text-red-700 mt-1 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-5">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-emerald-600">
                  <Wand2 className="w-6 h-6 animate-pulse" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-800 animate-pulse">
                  {REASSURING_MESSAGES[loadingMsgIdx]}
                </p>
                <p className="text-xs text-gray-400">
                  Gemini API is reading column layouts and classifying transactions...
                </p>
              </div>
            </div>
          ) : parsedTransactions.length === 0 ? (
            <div className="space-y-6">
              <div
                id="pdf-drag-area"
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition flex flex-col items-center justify-center ${
                  dragActive
                    ? "border-emerald-500 bg-emerald-50/20"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/40"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleChange}
                  className="hidden"
                />
                
                {file ? (
                  <div className="flex flex-col items-center">
                    <div className="p-4 bg-emerald-100 text-emerald-700 rounded-2xl mb-4 shadow-sm animate-bounce">
                      <FileText className="w-10 h-10" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB PDF Document</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="p-4 bg-gray-50 text-gray-400 rounded-2xl mb-4 border border-gray-100">
                      <FileText className="w-10 h-10" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      Drag & drop your monthly e-statement PDF file here
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Or browse your local machine directory to select a bank PDF
                    </p>
                  </div>
                )}
              </div>

              {file && (
                <div className="flex justify-center">
                  <button
                    id="trigger-ai-parse-btn"
                    onClick={triggerGeminiParse}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-semibold shadow-md transition flex items-center gap-2 cursor-pointer"
                  >
                    <Wand2 className="w-4 h-4" /> Begin AI-powered Extraction
                  </button>
                </div>
              )}

              {/* Informative advice */}
              <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-100 flex gap-3 text-xs text-blue-800 leading-relaxed">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900">Security & Key Protection</p>
                  <p className="text-gray-600 mt-0.5">
                    Your document is sent strictly over secure connections to the server to extract columns. No data is stored externally. Ensure your Gemini API Key is configured in the AI Studio environment first.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">
                    Verify Extracted Transactions ({parsedTransactions.length})
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    We extracted the items listed below. Review details and uncheck unwanted items.
                  </p>
                </div>
                <button
                  id="pdf-reset-btn"
                  onClick={() => {
                    setFile(null);
                    setParsedTransactions([]);
                    setSelectedTxIds(new Set());
                  }}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Start Again
                </button>
              </div>

              {/* Transactions reviews */}
              <div className="border border-gray-100 rounded-2xl overflow-hidden max-h-[40vh] overflow-y-auto shadow-inner bg-gray-50/20">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 sticky top-0 border-b border-gray-100 font-semibold text-gray-500 z-10">
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                          checked={selectedTxIds.size === parsedTransactions.length}
                          onChange={selectAll}
                        />
                      </th>
                      <th className="p-3 w-28">Date</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 w-32">Category</th>
                      <th className="p-3 w-24 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsedTransactions.map((tx) => {
                      const isSelected = selectedTxIds.has(tx.id);
                      return (
                        <tr
                          key={tx.id}
                          className={`hover:bg-gray-50 ${!isSelected ? "opacity-50" : ""}`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                              checked={isSelected}
                              onChange={() => toggleSelectTx(tx.id)}
                            />
                          </td>
                          <td className="p-3 font-mono font-medium text-gray-500">
                            {tx.date}
                          </td>
                          <td className="p-3 font-medium text-gray-900 truncate max-w-[200px]" title={tx.description}>
                            {tx.description}
                          </td>
                          <td className="p-3">
                            <select
                              value={tx.category}
                              onChange={(e) => handleCategoryFieldChange(tx.id, e.target.value)}
                              className="bg-white border border-gray-200 rounded-lg p-1 text-[11px] focus:ring-emerald-500 focus:border-emerald-500 text-gray-700 w-full"
                            >
                              {["Housing", "Utilities", "Groceries", "Food & Dining", "Transportation", "Shopping", "Entertainment", "Subscriptions", "Income", "Other"].map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </td>
                          <td className={`p-3 text-right font-semibold font-mono whitespace-nowrap ${
                            tx.type === "income" ? "text-emerald-600" : "text-gray-900"
                          }`}>
                            {tx.type === "income" ? "+ " : "- "}${tx.amount.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center shrink-0">
          <div className="text-xs text-gray-500">
            {parsedTransactions.length > 0 && (
              <span>
                Selected: <strong className="text-emerald-700">{selectedTxIds.size}</strong> of {parsedTransactions.length}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button id="cancel-pdf-btn" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 transition">
              Cancel
            </button>
            {parsedTransactions.length > 0 && (
              <button
                id="confirm-import-pdf"
                onClick={handleCompleteImport}
                disabled={selectedTxIds.size === 0}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" /> Import Transactions
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
