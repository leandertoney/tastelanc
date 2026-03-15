'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export interface AutocompleteOption {
  label: string;
  sublabel?: string;
  value: unknown;
}

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (option: AutocompleteOption) => void;
  options: AutocompleteOption[];
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export default function AutocompleteInput({
  value,
  onChange,
  onSelect,
  options,
  placeholder,
  autoFocus,
  disabled,
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset highlight when options change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [options]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const handleSelect = useCallback(
    (option: AutocompleteOption) => {
      onSelect(option);
      setIsOpen(false);
      setHighlightedIndex(-1);
    },
    [onSelect],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || options.length === 0) {
        // Open dropdown on arrow down if there are options
        if (e.key === 'ArrowDown' && options.length > 0) {
          setIsOpen(true);
          setHighlightedIndex(0);
          e.preventDefault();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((i) => (i + 1) % options.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((i) => (i <= 0 ? options.length - 1 : i - 1));
          break;
        case 'Enter':
          if (highlightedIndex >= 0 && highlightedIndex < options.length) {
            e.preventDefault();
            handleSelect(options[highlightedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setHighlightedIndex(-1);
          break;
      }
    },
    [isOpen, options, highlightedIndex, handleSelect],
  );

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (options.length > 0 && value.length >= 2) setIsOpen(true);
        }}
        onBlur={() => {
          // Delay close to allow mousedown on list items to fire first
          setTimeout(() => setIsOpen(false), 150);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        className="w-full px-3 py-2.5 bg-tastelanc-input-bg border border-tastelanc-border rounded-lg text-tastelanc-text-primary placeholder-tastelanc-text-faint focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
        role="combobox"
        aria-expanded={isOpen && options.length > 0}
        aria-autocomplete="list"
      />

      {isOpen && options.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg shadow-xl"
        >
          {options.map((option, i) => (
            <li
              key={`${option.label}-${i}`}
              role="option"
              aria-selected={i === highlightedIndex}
              className={`px-3 py-2 cursor-pointer text-sm transition-colors ${
                i === highlightedIndex
                  ? 'bg-tastelanc-accent/20 text-tastelanc-text-primary'
                  : 'text-tastelanc-text-secondary hover:bg-tastelanc-surface-light'
              }`}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent input blur
                handleSelect(option);
              }}
              onMouseEnter={() => setHighlightedIndex(i)}
            >
              <div className="font-medium">{option.label}</div>
              {option.sublabel && (
                <div className="text-xs text-tastelanc-text-faint">{option.sublabel}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
