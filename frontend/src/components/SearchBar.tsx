"use client";

import { useState } from "react";
import { Search, MapPin, X } from "lucide-react";

interface SearchBarProps {
  initialKeyword?: string;
  initialLocation?: string;
  onSearch: (keyword: string, location: string) => void;
}

export function SearchBar({ initialKeyword = "", initialLocation = "", onSearch }: SearchBarProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [location, setLocation] = useState(initialLocation);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(keyword, location);
  };

  const handleClear = () => {
    setKeyword("");
    setLocation("");
    onSearch("", "");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-4xl mx-auto glass-panel p-2.5 rounded-2xl shadow-xl shadow-black/30 flex flex-col sm:flex-row items-center gap-2 border border-slate-700/60"
    >
      {/* Keyword input */}
      <div className="relative flex-1 w-full flex items-center">
        <Search className="absolute left-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Job title, keywords, or company (e.g. Engineer, Figma, Python)..."
          className="w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
        />
        {keyword && (
          <button
            type="button"
            onClick={() => setKeyword("")}
            className="absolute right-3 p-1 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Location input */}
      <div className="relative w-full sm:w-64 flex items-center">
        <MapPin className="absolute left-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="City, India, or Remote..."
          className="w-full pl-11 pr-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
        />
        {location && (
          <button
            type="button"
            onClick={() => setLocation("")}
            className="absolute right-3 p-1 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Submit button */}
      <button
        type="submit"
        className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
      >
        Search Jobs
      </button>

      {(keyword || location) && (
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-slate-400 hover:text-white px-2 py-1 underline transition-colors"
        >
          Reset
        </button>
      )}
    </form>
  );
}
