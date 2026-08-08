'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { LookupOption } from '@/types';

type Props = {
  label: string;
  value: string;
  options: LookupOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  required?: boolean;
  error?: string;
  className?: string;
  selectedLabel?: string;
};

export function LookupCombobox({
  label,
  value,
  options,
  onChange,
  disabled = false,
  loading = false,
  placeholder = 'Type to search',
  allowEmpty = false,
  emptyLabel = 'All',
  required = false,
  error,
  className = '',
  selectedLabel,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = useMemo(
    () => options.find((option) => String(option.id) === value),
    [options, value],
  );

  useEffect(() => {
    if (open) return;
    setQuery(selected?.name ?? (value && selectedLabel ? selectedLabel : ''));
  }, [open, selected, selectedLabel, value]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.name.toLowerCase().includes(needle));
  }, [options, query]);

  const items = useMemo(() => {
    if (!allowEmpty) return filtered;
    return [{ id: 0, name: emptyLabel }, ...filtered];
  }, [allowEmpty, emptyLabel, filtered]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  function choose(option: LookupOption | { id: number; name: string }) {
    if (allowEmpty && option.id === 0) {
      onChange('');
      setQuery('');
    } else {
      onChange(String(option.id));
      setQuery(option.name);
    }
    setOpen(false);
  }

  function onBlur() {
    window.setTimeout(() => {
      if (!open) {
        setQuery(selected?.name ?? (value && selectedLabel ? selectedLabel : ''));
      }
    }, 0);
  }

  const fieldClass = `mt-2 min-h-12 w-full rounded-lg border bg-white px-3.5 text-base outline-none transition focus:ring-4 ${
    error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-border focus:border-accent focus:ring-amber-100'
  } disabled:bg-gray-100 disabled:text-gray-500`;

  const hint = loading
    ? 'Loading…'
    : disabled
      ? placeholder
      : options.length
        ? `${options.length.toLocaleString()} options`
        : 'No options found';

  return (
    <label className={`block font-semibold ${className}`}>
      {label}
      {required ? <span className="text-red-600"> *</span> : null}
      <div ref={rootRef} className="relative">
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          value={query}
          disabled={disabled || loading}
          placeholder={loading ? 'Loading…' : placeholder}
          onFocus={() => {
            if (!disabled && !loading) setOpen(true);
          }}
          onBlur={onBlur}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (value) onChange('');
          }}
          onKeyDown={(event) => {
            if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
              event.preventDefault();
              setOpen(true);
              return;
            }
            if (!open) return;
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActiveIndex((index) => Math.min(index + 1, items.length - 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === 'Enter') {
              event.preventDefault();
              const option = items[activeIndex];
              if (option) choose(option);
            } else if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
              setQuery(selected?.name ?? (value && selectedLabel ? selectedLabel : ''));
            }
          }}
          className={fieldClass}
        />
        {open && !disabled && !loading && items.length > 0 ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-white py-1 shadow-lg"
          >
            {items.map((option, index) => (
              <li key={option.id || 'empty'} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                  className={`flex w-full px-3.5 py-2.5 text-left text-base ${
                    index === activeIndex ? 'bg-amber-50 text-foreground' : 'text-foreground hover:bg-gray-50'
                  }`}
                >
                  {option.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <span className="mt-1.5 block text-sm font-normal text-muted">{hint}</span>
      {error ? <p className="mt-1.5 text-sm text-red-700">{error}</p> : null}
    </label>
  );
}
