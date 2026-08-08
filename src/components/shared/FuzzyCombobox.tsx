'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface LookupOption {
  id: number;
  name: string;
}

interface Props {
  options: LookupOption[];
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
}

export function FuzzyCombobox({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder,
  disabled = false,
  allowClear = true,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const fuse = useMemo(
    () => new Fuse(options, { keys: ['name'], threshold: 0.4, distance: 100, minMatchCharLength: 1 }),
    [options]
  );

  const filtered = useMemo(
    () => (query ? fuse.search(query).map((r) => r.item) : options),
    [query, fuse, options]
  );

  const selected = options.find((o) => o.id === value) ?? null;

  function handleSelect(id: number) {
    onChange(id === value ? null : id);
    setOpen(false);
    setQuery('');
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(''); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          className={cn('w-full justify-between font-normal', !selected && 'text-muted-foreground', className)}
        >
          <span className="truncate">{selected ? selected.name : placeholder}</span>
          <span className="ml-2 flex shrink-0 items-center gap-1">
            {allowClear && selected && (
              <X
                size={14}
                className="text-muted-foreground hover:text-foreground"
                onClick={handleClear}
                aria-label="Clear selection"
              />
            )}
            <ChevronsUpDown size={14} className="text-muted-foreground" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder ?? `Search ${placeholder.toLowerCase()}…`}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((opt) => (
                <CommandItem key={opt.id} value={String(opt.id)} onSelect={() => handleSelect(opt.id)}>
                  <Check size={14} className={cn('mr-2 shrink-0', value === opt.id ? 'opacity-100' : 'opacity-0')} />
                  {opt.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
