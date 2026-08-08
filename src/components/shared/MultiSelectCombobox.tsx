'use client';

import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LookupOption } from './FuzzyCombobox';

interface Props {
  options: LookupOption[];
  values: number[];
  onChange: (values: number[]) => void;
  placeholder?: string;
  maxDisplay?: number;
  allowSelectAll?: boolean;
  disabled?: boolean;
  className?: string;
}

export function MultiSelectCombobox({
  options,
  values,
  onChange,
  placeholder = 'Select…',
  maxDisplay = 2,
  allowSelectAll = false,
  disabled = false,
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

  function toggle(id: number) {
    onChange(values.includes(id) ? values.filter((v) => v !== id) : [...values, id]);
  }

  const selectedNames = options.filter((o) => values.includes(o.id)).map((o) => o.name);
  const label =
    selectedNames.length === 0
      ? placeholder
      : selectedNames.length <= maxDisplay
        ? selectedNames.join(', ')
        : `${selectedNames.slice(0, maxDisplay).join(', ')} +${selectedNames.length - maxDisplay} more`;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(''); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          className={cn('w-full justify-between font-normal', values.length === 0 && 'text-muted-foreground', className)}
        >
          <span className="truncate">{label}</span>
          <span className="ml-2 flex shrink-0 items-center gap-1">
            {values.length > 0 && (
              <X
                size={14}
                className="text-muted-foreground hover:text-foreground"
                onClick={(e) => { e.stopPropagation(); onChange([]); }}
                aria-label="Clear all"
              />
            )}
            <ChevronsUpDown size={14} className="text-muted-foreground" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Search ${placeholder.toLowerCase()}…`}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {allowSelectAll && !query && (
                <CommandItem
                  onSelect={() => onChange(values.length === options.length ? [] : options.map((o) => o.id))}
                >
                  <Check
                    size={14}
                    className={cn('mr-2 shrink-0', values.length === options.length ? 'opacity-100' : 'opacity-0')}
                  />
                  Select all
                </CommandItem>
              )}
              {filtered.map((opt) => (
                <CommandItem key={opt.id} value={String(opt.id)} onSelect={() => toggle(opt.id)}>
                  <Check size={14} className={cn('mr-2 shrink-0', values.includes(opt.id) ? 'opacity-100' : 'opacity-0')} />
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
