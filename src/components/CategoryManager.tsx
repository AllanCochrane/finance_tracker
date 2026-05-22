import React, { useState } from "react";
import { Plus, Trash2, FolderEdit } from "lucide-react";
import { Category } from "../types";

interface CategoryManagerProps {
  categories: Category[];
  onAddCategory: (name: string, color: string) => void;
  onDeleteCategory: (id: string) => void;
}

const PRESET_COLORS = [
  "#f87171", "#fb923c", "#fbbf24", "#34d399", "#2dd4bf", 
  "#38bdf8", "#60a5fa", "#818cf8", "#a78bfa", "#c084fc", 
  "#f472b6", "#fda4af", "#9ca3af", "#4b5563"
];

export default function CategoryManager({ categories, onAddCategory, onDeleteCategory }: CategoryManagerProps) {
  const [newCatName, setNewCatName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nameClean = newCatName.trim();
    if (!nameClean) return;

    if (categories.some((c) => c.name.toLowerCase() === nameClean.toLowerCase())) {
      setError("A category with this name already exists.");
      return;
    }

    onAddCategory(nameClean, selectedColor);
    setNewCatName("");
    setSelectedColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
  };

  return (
    <div id="category-manager-container" className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-2">
        <FolderEdit className="w-5 h-5 text-emerald-600" />
        <h3 className="text-sm font-semibold text-gray-900">Categorization Rules</h3>
      </div>

      {/* New Cat Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        
        <div className="space-y-1.5 animate-fade-in">
          <label className="text-xs font-semibold text-gray-600 block">Category Label</label>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 text-xs rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              placeholder="e.g. Travel, Health, Gifts"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              required
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold px-4 transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </div>

        {/* Color Palette Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-600 block">Select Label Color</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => setSelectedColor(hex)}
                className={`w-6 h-6 rounded-full border transition-all ${
                  selectedColor === hex 
                    ? "ring-2 ring-emerald-500 ring-offset-2 scale-110" 
                    : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: hex }}
                title={hex}
              />
            ))}
          </div>
        </div>
      </form>

      {/* Categories List grid */}
      <div className="pt-4 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 mb-3">Active Custom & Default Categories</p>
        <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-2.5 rounded-xl border border-gray-50 bg-gray-50/50 hover:bg-gray-50/80 transition"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-xs font-medium text-gray-700 truncate">{cat.name}</span>
              </div>
              
              {!cat.isDefault && (
                <button
                  type="button"
                  onClick={() => onDeleteCategory(cat.id)}
                  className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-gray-100 transition"
                  title="Remove category"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
