// src/app/components/chat/hooks/useAutocomplete.ts
// Autocomplete hook for chat/map search

import { useState, useEffect, RefObject } from "react";

export interface AutocompleteSuggestion {
  type: string;
  label: string;
  photo?: string;
  city?: string;
  totalListings?: number;
  listPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  [key: string]: any;
}

interface UseAutocompleteOptions {
  message: string;
  isMapVisible: boolean;
  suggestionsRef: RefObject<HTMLDivElement>;
  onSelect?: (suggestion: AutocompleteSuggestion) => void;
}

export function useAutocomplete({
  message,
  isMapVisible,
  suggestionsRef,
  onSelect,
}: UseAutocompleteOptions) {
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions, suggestionsRef]);

  // Debounced search for autocomplete - Only in Map mode
  useEffect(() => {
    // Don't run autocomplete in chat mode
    if (!isMapVisible) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (message.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(message)}`);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
          setSuggestions(data.results);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (error) {
        console.error('Autocomplete error:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [message, isMapVisible]);

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: AutocompleteSuggestion) => {
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);

    if (onSelect) {
      onSelect(suggestion);
    }
  };

  // Navigate suggestions with keyboard
  const navigateUp = () => {
    setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : 0));
  };

  const navigateDown = () => {
    setSelectedSuggestionIndex((prev) =>
      prev < suggestions.length - 1 ? prev + 1 : prev
    );
  };

  const selectCurrent = () => {
    if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
      handleSelectSuggestion(suggestions[selectedSuggestionIndex]);
      return true;
    }
    return false;
  };

  const clear = () => {
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  return {
    suggestions,
    showSuggestions,
    selectedSuggestionIndex,
    setSelectedSuggestionIndex,
    handleSelectSuggestion,
    navigateUp,
    navigateDown,
    selectCurrent,
    clear,
  };
}
