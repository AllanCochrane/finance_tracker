import React, { useState, useRef } from "react";
import { Upload, HelpCircle, Check, AlertCircle, RefreshCw } from "lucide-react";
import { Transaction } from "../types";

interface CsvImportProps {
  categories: string[];
  onImport: (newTransactions: Transaction[]) => void;
  onClose: () => void;
}

// Simple robust CSV parser handling potential quoted commas
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        row[row.length - 1] += '"';
        i++; // skip next double quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push("");
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      if (row.length > 1 || row[0] !== "") {
        lines.push(row);
      }
      row = [""];
    } else {
      row[row.length - 1] += char;
    }
  }
  if (row.length > 1 || row[0] !== "") {
    lines.push(row);
  }
  return lines;
}

export default function CsvImport({ categories, onImport, onClose }: CsvImportProps) {
  const [dragActive, setDragActive] = useState(false);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState({
    date: -1,
    description: -1,
    amount: -1,
    type: -1,
    category: -1,
  });
  const [isMapped, setIsMapped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a valid CSV file (.csv)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCSV(text);
        
        if (parsed.length < 2) {
          setError("Your CSV is empty or has too few rows to import.");
          return;
        }

        const rawHeaders = parsed[0].map((h) => h.trim());
        setHeaders(rawHeaders);
        setCsvRows(parsed.slice(1));
        setError(null);

        // Attempt automatic header mapping
        const newMapping = { date: -1, description: -1, amount: -1, type: -1, category: -1 };
        rawHeaders.forEach((header, idx) => {
          const h = header.toLowerCase();
          if (h.includes("date") || h === "dt") {
            newMapping.date = idx;
          } else if (h.includes("desc") || h.includes("name") || h.includes("payee") || h.includes("merchant") || h.includes("memo")) {
            newMapping.description = idx;
          } else if (h.includes("amount") || h.includes("amt") || h.includes("val") || h.includes("charge") || h.includes("debit")) {
            newMapping.amount = idx;
          } else if (h.includes("type") || h.includes("mode")) {
            newMapping.type = idx;
          } else if (h.includes("cat")) {
            newMapping.category = idx;
          }
        });

        setMapping(newMapping);
        setIsMapped(true);
      } catch (err) {
        setError("Error parsing the file. Please make sure content is standard comma delimited.");
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleImportSubmit = () => {
    if (mapping.date === -1 || mapping.description === -1 || mapping.amount === -1) {
      setError("Please map at least Date, Description, and Amount fields.");
      return;
    }

    const imported: Transaction[] = [];

    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      if (row.length <= Math.max(mapping.date, mapping.description, mapping.amount)) {
        continue; // incomplete row
      }

      const rawDate = row[mapping.date];
      const rawDesc = row[mapping.description];
      const rawAmt = row[mapping.amount];

      if (!rawDate || !rawDesc || !rawAmt) continue;

      // format date cleanly to YYYY-MM-DD
      let cleanDate = rawDate.trim();
      try {
        const timestamp = Date.parse(cleanDate);
        if (!isNaN(timestamp)) {
          cleanDate = new Date(timestamp).toISOString().split("T")[0];
        }
      } catch {}

      // parse amount
      let rawNumber = parseFloat(rawAmt.replace(/[$,()]/g, "").trim());
      if (isNaN(rawNumber)) continue;

      let type: "expense" | "income" = "expense";
      if (mapping.type !== -1 && row[mapping.type]) {
        const rawType = row[mapping.type].toLowerCase();
        if (rawType.includes("income") || rawType.includes("dep") || rawType.includes("credit")) {
          type = "income";
        }
      } else {
        // Simple automatic guess: negative amounts in CSV deposits might represent income, or vice-versa
        // Usually positive in credit column indicates credit. Let's assume standard positive is expense unless categorized
        if (rawNumber < 0) {
          rawNumber = Math.abs(rawNumber);
          type = "income";
        }
      }

      // custom cat
      let category = "Other";
      if (mapping.category !== -1 && row[mapping.category]) {
        const rawCategory = row[mapping.category].trim();
        const matched = categories.find((c) => c.toLowerCase() === rawCategory.toLowerCase());
        if (matched) category = matched;
      }

      // Auto assign standard tags based on vendor patterns
      if (category === "Other" && type === "expense") {
        const d = rawDesc.toLowerCase();
        if (d.includes("netflix") || d.includes("spotify") || d.includes("youtube") || d.includes("hulu") || d.includes("gym")) {
          category = "Subscriptions";
        } else if (d.includes("walmart") || d.includes("kroger") || d.includes("whole") || d.includes("safeway") || d.includes("costco") || d.includes("albi")) {
          category = "Groceries";
        } else if (d.includes("mcdonald") || d.includes("starbucks") || d.includes("uber") || d.includes("grubhub") || d.includes("restaurant") || d.includes("cafe") || d.includes("pizza")) {
          category = "Food & Dining";
        } else if (d.includes("electric") || d.includes("gas") || d.includes("water") || d.includes("comcast") || d.includes("at&t") || d.includes("verizon") || d.includes("internet")) {
          category = "Utilities";
        } else if (d.includes("shell") || d.includes("chevron") || d.includes("transit") || d.includes("subway") || d.includes("exxon") || d.includes("uber trip")) {
          category = "Transportation";
        } else if (d.includes("rent") || d.includes("mortgage") || d.includes("landlord")) {
          category = "Housing";
        } else if (d.includes("amazon") || d.includes("target") || d.includes("macys") || d.includes("nordstrom") || d.includes("clothing")) {
          category = "Shopping";
        } else if (d.includes("steam") || d.includes("movie") || d.includes("cinema") || d.includes("ticket") || d.includes("concert")) {
          category = "Entertainment";
        }
      } else if (type === "income" || rawDesc.toLowerCase().includes("salary") || rawDesc.toLowerCase().includes("paycheck") || rawDesc.toLowerCase().includes("direct dep")) {
        category = "Income";
      }

      imported.push({
        id: `csv-${Math.random().toString(36).substr(2, 9)}`,
        date: cleanDate,
        description: rawDesc.trim(),
        amount: rawNumber,
        type,
        category,
        source: "csv",
      });
    }

    onImport(imported);
    onClose();
  };

  const updateMappingField = (field: keyof typeof mapping, index: number) => {
    setMapping((prev) => ({
      ...prev,
      [field]: index,
    }));
  };

  return (
    <div id="csv-import-modal" className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div id="csv-import-card" className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">CSV transaction import</h3>
            <p className="text-xs text-gray-500 mt-1">
              Upload bank CSV templates. Automatically matches column structures.
            </p>
          </div>
          <button id="close-csv-btn" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition">
            ✕
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isMapped ? (
            <div
              id="csv-drag-area"
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition flex flex-col items-center justify-center ${
                dragActive
                  ? "border-emerald-500 bg-emerald-50/20"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleChange}
                className="hidden"
              />
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl mb-4">
                <Upload className="w-8 h-8" />
              </div>
              <p className="text-sm font-medium text-gray-900">
                Drag & drop your CSV spreadsheet file
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Or click on this catalog area to select files from device
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-gray-400">
                <span className="bg-gray-100 px-2.5 py-1 rounded-full">Supports any table column order</span>
                <span className="bg-gray-100 px-2.5 py-1 rounded-full">Automatic column recognition</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">Map your CSV Columns</h4>
                <button
                  id="csv-reupload-btn"
                  onClick={() => {
                    setIsMapped(false);
                    setCsvRows([]);
                    setHeaders([]);
                  }}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Re-upload File
                </button>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-1.5">
                <p className="text-xs text-gray-600 leading-relaxed">
                  We scanned the file headers. Map the core tracking fields to your spreadsheet column headers below.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 block">
                    Transaction Date <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full text-sm rounded-xl border-gray-200 bg-white p-2.5 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    value={mapping.date}
                    onChange={(e) => updateMappingField("date", Number(e.target.value))}
                  >
                    <option value="-1">-- Select Column --</option>
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 block">
                    Merchant / Description <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full text-sm rounded-xl border-gray-200 bg-white p-2.5 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    value={mapping.description}
                    onChange={(e) => updateMappingField("description", Number(e.target.value))}
                  >
                    <option value="-1">-- Select Column --</option>
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 block">
                    Total Amount <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full text-sm rounded-xl border-gray-200 bg-white p-2.5 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    value={mapping.amount}
                    onChange={(e) => updateMappingField("amount", Number(e.target.value))}
                  >
                    <option value="-1">-- Select Column --</option>
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Optional Type */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 block">
                    Flow Type (Optional)
                  </label>
                  <select
                    className="w-full text-sm rounded-xl border-gray-200 bg-white p-2.5 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-gray-500"
                    value={mapping.type}
                    onChange={(e) => updateMappingField("type", Number(e.target.value))}
                  >
                    <option value="-1">Auto-detect from amount +/- sign</option>
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Optional category */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 block">
                    Existing Category (Optional)
                  </label>
                  <select
                    className="w-full text-sm rounded-xl border-gray-200 bg-white p-2.5 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-gray-500"
                    value={mapping.category}
                    onChange={(e) => updateMappingField("category", Number(e.target.value))}
                  >
                    <option value="-1">Auto-categorize via description keyword</option>
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Data Preview */}
              <div className="mt-4 border border-gray-100 rounded-xl overflow-hidden">
                <div className="bg-gray-50 p-2 text-xs font-semibold text-gray-500 border-b border-gray-100">
                  Spreadsheet Preview (First 3 Data Rows)
                </div>
                <div className="max-w-full overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-600">
                    <thead>
                      <tr className="bg-gray-100/50">
                        {headers.map((h, idx) => (
                          <th key={idx} className="p-2 border-b border-gray-200 whitespace-nowrap min-w-[100px]">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.slice(0, 3).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-gray-50">
                          {headers.map((_, cIdx) => (
                            <td key={cIdx} className="p-2 border-b border-gray-200 truncate max-w-[150px]">
                              {row[cIdx] || <em className="text-gray-300">empty</em>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action controls */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
          <button id="cancel-csv-btn" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 transition">
            Cancel
          </button>
          {isMapped && (
            <button
              id="confirm-import-csv"
              onClick={handleImportSubmit}
              disabled={mapping.date === -1 || mapping.description === -1 || mapping.amount === -1}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              <Check className="w-4 h-4" /> Import {csvRows.length} Rows
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
