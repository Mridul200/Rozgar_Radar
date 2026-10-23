"use client";

import { useState } from "react";
import { Search, MapPin, X, ArrowRight } from "lucide-react";

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
      className="w-full max-w-4xl mx-auto glass-panel p-2 sm:p-2.5 rounded-2xl sm:rounded-full shadow-md bg-card flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border border-border"
    >
      {/* Keyword input */}
      <div className="relative flex-1 w-full flex items-center px-2">
        <Search className="w-4 h-4 text-muted-foreground shrink-0 mr-2" />
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Job title, skills, or company (e.g. Engineer, Python, Figma)..."
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none border-none font-medium pr-6"
        />
        {keyword && (
          <button
            type="button"
            onClick={() => setKeyword("")}
            className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="hidden sm:block w-px h-8 bg-border" />

      {/* Location input */}
      <div className="relative w-full sm:w-64 flex items-center px-2">
        <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mr-2" />
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location (e.g. Bengaluru, Remote)..."
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none border-none font-medium pr-6"
        />
        {location && (
          <button
            type="button"
            onClick={() => setLocation("")}
            className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Submit button */}
      <button
        type="submit"
        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-3 bg-primary hover:bg-[--primary-hover] text-white font-semibold text-sm rounded-xl sm:rounded-full shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap shrink-0"
      >
        <span>Search Jobs</span>
        <ArrowRight className="w-4 h-4" />
      </button>

      {(keyword || location) && (
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 underline transition-colors cursor-pointer"
        >
          Reset
        </button>
      )}
    </form>
  );
}

export default SearchBar;
