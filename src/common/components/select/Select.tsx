"use client";

import * as React from "react";
import {
  useId,
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { ChevronDown, X, Search, Check, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  /** Show a search input inside the dropdown. Enabled by default app-wide. */
  searchable?: boolean;
  /** Called with the (debounced) search term; also called with '' when the dropdown closes. */
  onSearch?: (term: string) => void;
  /** Fires when the popover opens or closes (after internal state updates). */
  onOpenChange?: (open: boolean) => void;
  /** Shows a centred spinner in the list area instead of options. */
  isLoading?: boolean;
  /** Render a × button in the trigger to clear the current value. */
  clearable?: boolean;
  /** When true, dropdown options wrap to multiple lines; the trigger always shows ellipsis. */
  wrapOptionLabels?: boolean;
  /** Extra classes for the scrollable options list (e.g. `max-h-40` to shorten the panel). */
  listClassName?: string;
  /** Preferred dropdown direction. Radix may flip it unless avoidCollisions is false. */
  side?: "top" | "right" | "bottom" | "left";
  avoidCollisions?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEARCH_DEBOUNCE_MS = 300;

/** Keep first option per value — duplicate values break React keys and selection. */
export function dedupeSelectOptions(options: SelectOption[]): SelectOption[] {
  const seen = new Set<string>();
  const out: SelectOption[] = [];
  for (const o of options) {
    const v = String(o.value);
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(o);
  }
  return out;
}

/** Radix Dialog scroll-lock can swallow wheel events on portaled popovers — scroll the list manually. */
function scrollListOnWheel(e: React.WheelEvent, list: HTMLDivElement | null) {
  if (!list) return;

  e.stopPropagation();

  const maxScroll = Math.max(0, list.scrollHeight - list.clientHeight);
  const next = Math.min(maxScroll, Math.max(0, list.scrollTop + e.deltaY));

  if (next !== list.scrollTop) {
    list.scrollTop = next;
    e.preventDefault();
  }
}

function useDebouncedCallback(fn: (v: string) => void, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);
  const run = useCallback(
    (v: string) => {
      cancel();
      timer.current = setTimeout(() => {
        timer.current = null;
        fn(v);
      }, delay);
    },
    [fn, delay, cancel],
  );
  return { run, cancel };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Select({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  label,
  required = false,
  error,
  disabled = false,
  searchable = true,
  onSearch,
  onOpenChange,
  isLoading = false,
  clearable = false,
  wrapOptionLabels = false,
  listClassName,
  side,
  avoidCollisions,
  className,
}: SelectProps) {
  const id = useId();
  const triggerId = `select-trigger-${id}`;
  const searchId = `select-search-${id}`;

  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const uniqueOptions = useMemo(() => dedupeSelectOptions(options), [options]);
  const selectedOption = uniqueOptions.find((o) => o.value === value) ?? null;

  const searchNotify = useCallback(
    (term: string) => {
      onSearch?.(term);
    },
    [onSearch],
  );
  const { run: scheduleSearchNotify, cancel: cancelSearchNotify } =
    useDebouncedCallback(searchNotify, SEARCH_DEBOUNCE_MS);

  // Focus search input when popover opens
  useEffect(() => {
    if (open && searchable) {
      // Let the popover finish its open animation before focusing
      const t = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, searchable]);

  const needle = searchTerm.trim().toLowerCase();
  // When `onSearch` loads options from the server, skip client-side filtering so
  // API rows are not hidden when labels use a different shape than the typed term.
  const filteredOptions =
    needle && !onSearch
      ? uniqueOptions.filter((o) => {
          const l = o.label.toLowerCase();
          const v = String(o.value).toLowerCase();
          return l.includes(needle) || v.includes(needle);
        })
      : uniqueOptions;

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const term = e.target.value;
    setSearchTerm(term);
    if (onSearch) scheduleSearchNotify(term);
  }

  function handlePopoverOpenChange(next: boolean) {
    if (!next) {
      cancelSearchNotify();
      setSearchTerm("");
      onSearch?.("");
    }
    setOpen(next);
    onOpenChange?.(next);
  }

  function handleSelect(optValue: string) {
    onChange(optValue);
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
  }

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      {/* Label */}
      {label && (
        <label
          htmlFor={triggerId}
          className="text-sm font-medium text-foreground"
        >
          {label}
          {required && (
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              {" "}
              *
            </span>
          )}
        </label>
      )}

      {/* Popover wrapper */}
      <Popover
        open={open}
        onOpenChange={disabled ? undefined : handlePopoverOpenChange}
      >
        <PopoverTrigger asChild>
          {/* Trigger button */}
          <button
            id={triggerId}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-required={required || undefined}
            aria-invalid={error ? true : undefined}
            aria-haspopup="listbox"
            disabled={disabled}
            className={cn(
              "app-control flex min-w-0 w-full items-center justify-between rounded-md border bg-white px-3 py-1.5 text-[length:var(--app-control-font-size)] text-slate-900 shadow-sm transition-colors",
              "focus-visible:outline-none focus:ring-0 focus-visible:ring-0",
              "disabled:cursor-not-allowed disabled:opacity-50",
              open && "border-[hsl(var(--ring))]",
              error
                ? "border-destructive focus-visible:border-destructive"
                : "border-slate-300",
              !error && "focus-visible:border-[hsl(var(--ring))]",
            )}
          >
            {/* Label / placeholder */}
            <span
              className={cn(
                "min-w-0 truncate",
                !selectedOption && "text-slate-400",
              )}
            >
              {selectedOption ? selectedOption.label : placeholder}
            </span>

            {/* Right-side icons */}
            <span className="ml-2 flex shrink-0 items-center gap-1">
              {clearable && value !== null && (
                <span
                  role="button"
                  aria-label="Clear selection"
                  tabIndex={0}
                  onClick={handleClear}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      handleClear(e as unknown as React.MouseEvent);
                  }}
                  className="rounded p-0.5 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              )}
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-slate-400 transition-transform duration-200",
                  open && "rotate-180",
                )}
              />
            </span>
          </button>
        </PopoverTrigger>

        {/* Dropdown */}
        <PopoverContent
          align="start"
          side={side}
          avoidCollisions={avoidCollisions}
          sideOffset={4}
          className="w-[var(--radix-popover-trigger-width)] min-w-[180px] p-0"
          onWheel={(e) => scrollListOnWheel(e, listRef.current)}
          // Prevent closing when clicking the search input
          onInteractOutside={(e) => {
            if (searchInputRef.current?.contains(e.target as Node)) {
              e.preventDefault();
            }
          }}
        >
          {/* Search input */}
          {searchable && (
            <div className="border-b px-2 py-1.5">
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  id={searchId}
                  type="text"
                  role="searchbox"
                  aria-label="Search options"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search…"
                  className="h-8 w-full rounded-md bg-transparent pl-7 pr-2 text-sm placeholder:text-slate-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Options list */}
          <div
            ref={listRef}
            role="listbox"
            className={cn(
              "overflow-y-auto overscroll-contain py-1 touch-pan-y",
              listClassName ?? "max-h-60",
            )}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading…</span>
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results found
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={`${String(opt.value)}::${idx}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={opt.disabled}
                    onClick={() => !opt.disabled && handleSelect(opt.value)}
                    className={cn(
                      "flex w-full gap-2 px-3 py-2 text-sm transition-colors",
                      wrapOptionLabels ? "items-start" : "items-center",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      isSelected && "bg-accent/50 font-medium",
                    )}
                  >
                    {/* Checkmark slot — keeps label alignment consistent */}
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      )}
                    </span>
                    <span
                      className={cn(
                        "min-w-0 flex-1 text-left",
                        wrapOptionLabels
                          ? "whitespace-normal leading-snug"
                          : "truncate",
                      )}
                    >
                      {opt.label}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Error message */}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
