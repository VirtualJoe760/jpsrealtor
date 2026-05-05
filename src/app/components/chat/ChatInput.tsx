"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, SquarePen, Bed, Bath, Square, MapPin, Building2, Home, ChevronDown } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";

interface ChatInputProps {
  message: string;
  setMessage: (message: string) => void;
  onSend: () => void;
  onNewChat?: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isLoading: boolean;
  placeholder?: string;
  showNewChatButton?: boolean;
  variant?: "landing" | "conversation" | "map";
  className?: string;
}

interface SearchResult {
  type: "listing" | "city" | "subdivision" | "county" | "region";
  label: string;
  slug?: string;
  photo?: string;
  listPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  city?: string;
  totalListings?: number;
}

export default function ChatInput({
  message,
  setMessage,
  onSend,
  onNewChat,
  onKeyPress,
  onKeyDown,
  isLoading,
  placeholder = "Ask me anything about real estate...",
  showNewChatButton = false,
  variant = "conversation",
  className = "",
}: ChatInputProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close the suggestions dropdown when the user clicks/taps anywhere
  // outside the input + dropdown chrome. Without this, the dropdown was
  // staying up after the user clicked off it (e.g., onto a listing card)
  // because mobile/desktop blur timing was inconsistent — only fired when
  // input lost focus, not on outside taps that didn't happen to focus
  // anything else.
  useEffect(() => {
    if (!showSuggestions) return;
    const handlePointer = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      const target = e.target as Node;
      if (!containerRef.current.contains(target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
    };
  }, [showSuggestions]);

  // When the parent clears the message (after a send), drop suggestions
  // so the dropdown doesn't linger over the new response.
  useEffect(() => {
    if (message.length === 0 && showSuggestions) {
      setShowSuggestions(false);
      setSuggestions([]);
      setSelectedIndex(-1);
    }
  }, [message, showSuggestions]);

  // iOS Safari fix: Force viewport recalculation when keyboard closes
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Delay hiding so click on suggestion registers first
    setTimeout(() => setShowSuggestions(false), 200);

    if (typeof window !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
      window.scrollTo(0, 0);
      setTimeout(() => {
        const _ = document.body.offsetHeight;
        document.body.style.transform = 'translateZ(0)';
        requestAnimationFrame(() => {
          document.body.style.transform = '';
        });
      }, 100);
    }
  };

  // Debounced search
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const res = await fetch(`/api/listings/quick-search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        const results: SearchResult[] = (data.results || []).slice(0, 6);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setSelectedIndex(-1);
      }
    } catch {
      // Silent fail — autocomplete is optional
    }
  }, []);

  const handleInputChange = (value: string) => {
    setMessage(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 250);
  };

  const handleSelectSuggestion = (result: SearchResult) => {
    let query = '';
    if (result.type === 'listing') {
      query = `Tell me about ${result.label}`;
    } else if (result.type === 'city') {
      query = `Show me homes in ${result.label}`;
    } else if (result.type === 'subdivision') {
      query = `Show me homes in ${result.label}`;
    } else {
      query = `Tell me about ${result.label}`;
    }

    setMessage(query);
    setShowSuggestions(false);
    setSuggestions([]);

    // Auto-send after a tick
    setTimeout(() => {
      onSend();
    }, 50);
  };

  const handleKeyDownWithSuggestions = (e: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        return;
      }
      if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }
    onKeyDown(e);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const formatPrice = (p: number) => {
    if (p >= 1_000_000) return `$${(p / 1_000_000).toFixed(p % 1_000_000 === 0 ? 0 : 2)}M`;
    return `$${p.toLocaleString()}`;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'listing': return <Home className="w-4 h-4" />;
      case 'city': return <Building2 className="w-4 h-4" />;
      case 'subdivision': return <MapPin className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  // Suggestion dropdown component
  const SuggestionsDropdown = () => {
    if (!showSuggestions || suggestions.length === 0) return null;

    return (
      <div className={`absolute bottom-full left-0 right-0 mb-2 rounded-xl overflow-hidden shadow-2xl z-50 ${
        isLight
          ? "bg-white border border-gray-200"
          : "bg-neutral-800 border border-neutral-700"
      }`}>
        {/* Mobile grip handle — tap to dismiss the dropdown with one thumb.
            Hidden at md+ since desktop has click-outside + Esc + blur,
            but on mobile a thumb-reachable affordance is more obvious. */}
        <button
          type="button"
          onClick={() => {
            setShowSuggestions(false);
            setSuggestions([]);
            setSelectedIndex(-1);
          }}
          aria-label="Close suggestions"
          className={`md:hidden w-full flex flex-col items-center justify-center pt-2 pb-1.5 -mb-1 active:bg-gray-100 ${
            isLight ? "active:bg-gray-100" : "active:bg-neutral-700/50"
          }`}
        >
          <div
            className={`w-12 h-1 rounded-full ${
              isLight ? "bg-gray-300" : "bg-neutral-600"
            }`}
          />
          <ChevronDown
            className={`w-3.5 h-3.5 mt-0.5 ${
              isLight ? "text-gray-400" : "text-neutral-500"
            }`}
          />
        </button>
        {suggestions.map((result, i) => (
          <button
            key={`${result.type}-${result.label}-${i}`}
            onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(result); }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
              i === selectedIndex
                ? isLight ? "bg-blue-50" : "bg-neutral-700"
                : isLight ? "hover:bg-gray-50" : "hover:bg-neutral-700/50"
            } ${i > 0 ? isLight ? "border-t border-gray-100" : "border-t border-neutral-700/50" : ""}`}
          >
            {/* Thumbnail or icon */}
            {result.type === 'listing' && result.photo ? (
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                <img src={result.photo} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            ) : (
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                result.type === 'listing'
                  ? isLight ? "bg-blue-100 text-blue-600" : "bg-blue-900/30 text-blue-400"
                  : result.type === 'city'
                  ? isLight ? "bg-purple-100 text-purple-600" : "bg-purple-900/30 text-purple-400"
                  : isLight ? "bg-emerald-100 text-emerald-600" : "bg-emerald-900/30 text-emerald-400"
              }`}>
                {getIcon(result.type)}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isLight ? "text-gray-900" : "text-white"}`}>
                {result.label}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs capitalize ${isLight ? "text-gray-400" : "text-neutral-500"}`}>
                  {result.type}
                </span>
                {result.type === 'listing' && (
                  <>
                    {result.bedrooms != null && (
                      <span className={`text-xs ${isLight ? "text-gray-500" : "text-neutral-400"}`}>
                        {result.bedrooms}bd
                      </span>
                    )}
                    {result.sqft != null && result.sqft > 0 && (
                      <span className={`text-xs ${isLight ? "text-gray-500" : "text-neutral-400"}`}>
                        {result.sqft.toLocaleString()}sf
                      </span>
                    )}
                  </>
                )}
                {result.type === 'subdivision' && result.city && (
                  <span className={`text-xs ${isLight ? "text-gray-500" : "text-neutral-400"}`}>
                    {result.city}
                  </span>
                )}
                {result.type === 'city' && result.totalListings != null && result.totalListings > 0 && (
                  <span className={`text-xs ${isLight ? "text-gray-500" : "text-neutral-400"}`}>
                    {result.totalListings} listings
                  </span>
                )}
              </div>
            </div>

            {/* Price for listings */}
            {result.type === 'listing' && result.listPrice && (
              <span className={`text-sm font-bold whitespace-nowrap ${isLight ? "text-blue-600" : "text-emerald-400"}`}>
                {formatPrice(result.listPrice)}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  };

  // Landing variant
  if (variant === "landing") {
    return (
      <div className={`w-full max-w-[700px] relative ${className}`} ref={containerRef}>
        <div
          className={`relative rounded-2xl backdrop-blur-md ${
            isLight
              ? "bg-white/80 border border-gray-300 shadow-[0_8px_32px_rgba(59,130,246,0.15),0_4px_16px_rgba(0,0,0,0.1)]"
              : "bg-neutral-800/50 border border-neutral-700/50 shadow-[0_8px_32px_rgba(16,185,129,0.2),0_4px_16px_rgba(0,0,0,0.3)]"
          }`}
          style={{
            backdropFilter: "blur(10px) saturate(150%)",
            WebkitBackdropFilter: "blur(10px) saturate(150%)",
          }}
        >
          <SuggestionsDropdown />
          <input
            type="text"
            data-chat-input
            value={message}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={onKeyPress}
            onKeyDown={handleKeyDownWithSuggestions}
            onBlur={handleBlur}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            placeholder={placeholder}
            disabled={isLoading}
            autoComplete="off"
            className={`w-full px-6 py-4 pr-28 bg-transparent outline-none rounded-2xl text-base font-medium tracking-[-0.01em] ${
              isLight ? "text-gray-900 placeholder-gray-400" : "text-white placeholder-neutral-400"
            }`}
            style={{ fontSize: '16px' }}
          />
          {showNewChatButton && onNewChat && (
            <button
              onClick={onNewChat}
              title="Start new conversation"
              className={`absolute right-16 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all ${
                isLight
                  ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  : "bg-neutral-700 hover:bg-neutral-600 text-neutral-300"
              }`}
              data-tour="new-chat-button"
            >
              <SquarePen className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={onSend}
            disabled={!message.trim() || isLoading}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all ${
              message.trim() && !isLoading
                ? isLight
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-purple-600 hover:bg-purple-700 text-white"
                : isLight
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-neutral-700 text-neutral-500 cursor-not-allowed"
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Map variant
  if (variant === "map") {
    return (
      <div className={`fixed bottom-[92px] sm:bottom-4 left-4 right-4 z-30 md:left-1/2 md:-translate-x-1/2 md:max-w-3xl ${className}`} style={{ pointerEvents: 'auto' }}>
        <div
          className={`relative rounded-2xl backdrop-blur-md shadow-2xl ${
            isLight ? "bg-white/90 border border-gray-300" : "bg-neutral-800/90 border border-neutral-700/50"
          }`}
          style={{
            backdropFilter: "blur(20px) saturate(150%)",
            WebkitBackdropFilter: "blur(20px) saturate(150%)",
          }}
        >
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={onKeyPress}
            onKeyDown={onKeyDown}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={isLoading}
            autoComplete="off"
            className={`w-full px-6 py-4 pr-24 bg-transparent outline-none rounded-2xl text-base font-medium tracking-[-0.01em] ${
              isLight ? "text-gray-900 placeholder-gray-400" : "text-white placeholder-neutral-400"
            }`}
            style={{ fontSize: '16px' }}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent('toggleMapControls'));
            }}
            className={`absolute right-14 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all hover:scale-110 active:scale-95 ${
              isLight
                ? "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                : "text-neutral-500 hover:text-emerald-400 hover:bg-emerald-500/10"
            }`}
            aria-label="Map Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <div className={`absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl ${
            isLight ? "text-gray-400" : "text-neutral-500"
          }`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  // Conversation variant
  // The mobile path keeps a backdrop blur behind the input so messages
  // peek through as the user scrolls; the desktop path drops it.
  // Previously this wrapper also painted a top-fade gradient + maskImage,
  // which on desktop read as a faint floating card sitting above the
  // input bar. Removed — the gradient/mask were doing nothing useful at
  // md+ widths and were creating visual noise that looked like a hidden
  // dropdown.
  return (
    <div
      className={`fixed bottom-0 left-0 pr-[10px] pl-3 sm:px-4 pb-[100px] sm:pb-4 pt-6 z-30 backdrop-blur-xl md:relative md:bottom-auto md:left-auto md:right-auto md:pr-4 md:pb-4 md:pt-0 md:backdrop-blur-none ${className}`}
      style={{ right: '10px' }}
    >
      <div className="max-w-4xl mx-auto relative" ref={containerRef}>
        <div
          className={`relative rounded-2xl backdrop-blur-md ${
            isLight
              ? "bg-white/95 border-2 border-gray-300 shadow-[0_12px_48px_rgba(59,130,246,0.2),0_8px_24px_rgba(0,0,0,0.12)]"
              : "bg-neutral-800/80 border-2 border-neutral-700/70 shadow-[0_12px_48px_rgba(16,185,129,0.25),0_8px_24px_rgba(0,0,0,0.4)]"
          }`}
          style={{
            backdropFilter: "blur(10px) saturate(150%)",
            WebkitBackdropFilter: "blur(10px) saturate(150%)",
          }}
        >
          <SuggestionsDropdown />
          <input
            type="text"
            data-chat-input
            value={message}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={onKeyPress}
            onKeyDown={handleKeyDownWithSuggestions}
            onBlur={handleBlur}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            placeholder={placeholder}
            disabled={isLoading}
            autoComplete="off"
            className={`w-full px-4 sm:px-6 py-4 sm:py-4 pr-24 sm:pr-28 bg-transparent outline-none rounded-2xl text-base sm:text-[15px] font-medium tracking-[-0.01em] ${
              isLight ? "text-gray-900 placeholder-gray-500" : "text-white placeholder-neutral-400"
            }`}
            style={{ fontSize: '16px' }}
          />
          {showNewChatButton && onNewChat && (
            <button
              onClick={onNewChat}
              title="Start new conversation"
              className={`absolute right-14 sm:right-16 top-1/2 -translate-y-1/2 p-2.5 sm:p-2.5 rounded-xl transition-all active:scale-95 ${
                isLight
                  ? "bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700"
                  : "bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-500 text-neutral-300"
              }`}
              data-tour="new-chat-button"
            >
              <SquarePen className="w-5 h-5 sm:w-5 sm:h-5" />
            </button>
          )}
          <button
            onClick={onSend}
            disabled={!message.trim() || isLoading}
            className={`absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-2.5 sm:p-2.5 rounded-xl transition-all active:scale-95 ${
              message.trim() && !isLoading
                ? isLight
                  ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg"
                  : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-lg"
                : isLight
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-neutral-700 text-neutral-500 cursor-not-allowed"
            }`}
          >
            <Send className="w-5 h-5 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
