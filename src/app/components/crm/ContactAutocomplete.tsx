'use client';

import { useState, useEffect, useRef } from 'react';
import { User, X } from 'lucide-react';
import Image from 'next/image';

interface Contact {
  id: string;
  name: string;
  email: string;
  photo?: string;
}

interface ContactAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isLight: boolean;
  required?: boolean;
  multiple?: boolean;  // Support multiple emails (comma-separated)
}

export default function ContactAutocomplete({
  value,
  onChange,
  placeholder = 'Recipients',
  isLight,
  required = false,
  multiple = true,
}: ContactAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<Contact[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const currentInput = multiple ? inputValue.split(',').pop()?.trim() || '' : inputValue.trim();

    if (currentInput.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/contacts/search?q=${encodeURIComponent(currentInput)}&limit=5`);
        const data = await response.json();
        if (response.ok) {
          setSuggestions(data.contacts || []);
          setShowSuggestions(data.contacts?.length > 0);
        }
      } catch (error) {
        console.error('Contact search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, multiple]);

  // Sync with parent value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleSelect = (contact: Contact) => {
    let newValue: string;

    if (multiple) {
      const parts = inputValue.split(',').map(p => p.trim());
      parts[parts.length - 1] = `${contact.name} <${contact.email}>`;
      newValue = parts.join(', ') + ', ';
    } else {
      newValue = `${contact.name} <${contact.email}>`;
    }

    setInputValue(newValue);
    onChange(newValue);
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(0);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Enter':
        if (showSuggestions) {
          e.preventDefault();
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        className={`w-full bg-transparent outline-none text-sm ${
          isLight ? 'text-slate-900' : 'text-gray-100'
        }`}
        placeholder={placeholder}
        required={required}
      />

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className={`absolute top-full left-0 right-0 mt-1 rounded-lg shadow-xl border z-50 max-h-60 overflow-y-auto ${
            isLight ? 'bg-white border-slate-200' : 'bg-gray-800 border-gray-700'
          }`}
        >
          {suggestions.map((contact, index) => (
            <button
              key={`${contact.id}-${contact.email}`}
              type="button"
              onClick={() => handleSelect(contact)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                index === selectedIndex
                  ? isLight
                    ? 'bg-blue-50'
                    : 'bg-emerald-900/30'
                  : ''
              } ${
                isLight
                  ? 'hover:bg-blue-50 text-slate-900'
                  : 'hover:bg-emerald-900/30 text-gray-100'
              }`}
            >
              {/* Profile Photo */}
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden ${
                isLight ? 'bg-slate-200' : 'bg-gray-700'
              }`}>
                {contact.photo ? (
                  <Image
                    src={contact.photo}
                    alt={contact.name}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className={`w-4 h-4 ${isLight ? 'text-slate-400' : 'text-gray-500'}`} />
                )}
              </div>

              {/* Contact Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{contact.name}</p>
                <p className={`text-xs truncate ${
                  isLight ? 'text-slate-500' : 'text-gray-400'
                }`}>
                  {contact.email}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs ${
          isLight ? 'text-slate-400' : 'text-gray-500'
        }`}>
          Searching...
        </div>
      )}
    </div>
  );
}
