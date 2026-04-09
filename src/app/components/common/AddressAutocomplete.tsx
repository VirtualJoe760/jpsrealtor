"use client";

// AddressAutocomplete
//
// Debounced typeahead backed by /api/geo/search (OpenStreetMap Nominatim
// proxy). When the user picks a suggestion, calls onSelect() with the parsed
// street/city/state/zip so the parent form can fill its other fields.
//
// Designed to be theme-agnostic — pass `inputClassName` for visual styling,
// pass `dropdownVariant="light"` or `"dark"` for the dropdown theme.

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

interface Suggestion {
  placeId: number;
  label: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (s: Suggestion) => void;
  placeholder?: string;
  required?: boolean;
  inputClassName?: string;
  inputStyle?: React.CSSProperties;
  dropdownVariant?: "light" | "dark";
  autoComplete?: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Street address",
  required,
  inputClassName,
  inputStyle,
  dropdownVariant = "dark",
  autoComplete = "street-address",
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef<string>("");
  // Suppress fetch immediately after a selection so we don't re-open on focus.
  const skipNextQueryRef = useRef<boolean>(false);

  // Click-outside to close dropdown
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (skipNextQueryRef.current) {
      skipNextQueryRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    const q = value.trim();
    if (q.length < 4) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    if (q === lastQueryRef.current) return;

    debounceRef.current = setTimeout(async () => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const res = await fetch(`/api/geo/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error("search failed");
        const data = await res.json();
        lastQueryRef.current = q;
        setSuggestions(data.results || []);
        setHighlight(0);
        setOpen(true);
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  function pick(s: Suggestion) {
    skipNextQueryRef.current = true;
    onSelect(s);
    setOpen(false);
    setSuggestions([]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(suggestions[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const dropdownCls =
    dropdownVariant === "light"
      ? "bg-white border border-gray-200 text-gray-900 shadow-xl"
      : "bg-neutral-900 border border-white/10 text-white shadow-xl";
  const itemHoverCls =
    dropdownVariant === "light" ? "hover:bg-gray-100" : "hover:bg-white/10";
  const itemActiveCls =
    dropdownVariant === "light" ? "bg-gray-100" : "bg-white/10";
  const subCls =
    dropdownVariant === "light" ? "text-gray-500" : "text-gray-400";

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className={inputClassName}
        style={inputStyle}
      />
      {loading && (
        <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      )}
      {open && suggestions.length > 0 && (
        <ul
          className={`absolute z-50 left-0 right-0 mt-1 rounded-lg overflow-hidden ${dropdownCls}`}
        >
          {suggestions.map((s, i) => (
            <li
              key={s.placeId}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`flex items-start gap-2 px-3 py-2 cursor-pointer text-sm ${itemHoverCls} ${
                i === highlight ? itemActiveCls : ""
              }`}
            >
              <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 opacity-60" />
              <span className="truncate">
                <span className="font-medium">
                  {s.street || s.label.split(",")[0]}
                </span>
                <span className={`ml-1.5 text-xs ${subCls}`}>
                  {[s.city, s.state, s.zip].filter(Boolean).join(", ")}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
