'use client'

import * as React from 'react'
import { useId, useRef, useEffect, useState, useCallback } from 'react'
import { ChevronDown, X, Search, Loader2 } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { SelectOption } from './Select'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MultiSelectProps {
  value: string[]
  onChange: (values: string[]) => void
  options: SelectOption[]
  placeholder?: string
  label?: string
  required?: boolean
  error?: string
  disabled?: boolean
  /** Show a search input inside the dropdown. */
  searchable?: boolean
  /** Called on every search input change (debounced 300 ms). Use for server-side filtering. */
  onSearch?: (term: string) => void
  /** Shows a centred spinner in the list area instead of options. */
  isLoading?: boolean
  /** Render a "Select all / Deselect all" row at the top of the list. Default: true. */
  showSelectAll?: boolean
  /** Max number of selected labels shown in trigger before "+N more". Default: 2. */
  maxDisplay?: number
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function useDebounce(fn: (v: string) => void, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  return useCallback(
    (v: string) => {
      if (timer.current !== null) clearTimeout(timer.current)
      timer.current = setTimeout(() => fn(v), delay)
    },
    [fn, delay],
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MultiSelect({
  value,
  onChange,
  options,
  placeholder = 'Select options',
  label,
  required = false,
  error,
  disabled = false,
  searchable = false,
  onSearch,
  isLoading = false,
  showSelectAll = true,
  maxDisplay = 2,
  className,
}: MultiSelectProps) {
  const id = useId()
  const triggerId = `multiselect-trigger-${id}`
  const searchId = `multiselect-search-${id}`

  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Debounced server-side search callback
  const debouncedOnSearch = useDebounce(onSearch ?? (() => undefined), 300)

  // Focus search when popover opens
  useEffect(() => {
    if (open && searchable) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open, searchable])

  // Reset local search when closing
  useEffect(() => {
    if (!open) setSearchTerm('')
  }, [open])

  const filteredOptions = searchTerm
    ? options.filter((o) => o.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : options

  // Derive select-all state from the full options list (not filtered) so it
  // correctly reflects reality regardless of current search term.
  const enabledOptions = options.filter((o) => !o.disabled)
  const enabledValues = enabledOptions.map((o) => o.value)
  const allSelected =
    enabledValues.length > 0 && enabledValues.every((v) => value.includes(v))
  const someSelected = !allSelected && enabledValues.some((v) => value.includes(v))

  // ----- Event handlers -------------------------------------------------------

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const term = e.target.value
    setSearchTerm(term)
    if (onSearch) debouncedOnSearch(term)
  }

  function toggle(optValue: string) {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue))
    } else {
      onChange([...value, optValue])
    }
  }

  function handleSelectAll() {
    if (allSelected) {
      // Deselect all enabled options; keep any disabled ones that might have
      // been pre-selected externally (unlikely, but safe).
      onChange(value.filter((v) => !enabledValues.includes(v)))
    } else {
      // Add all enabled values that aren't already selected
      const next = [...value]
      for (const v of enabledValues) {
        if (!next.includes(v)) next.push(v)
      }
      onChange(next)
    }
  }

  function handleClearAll(e: React.MouseEvent) {
    e.stopPropagation()
    onChange([])
  }

  // ----- Trigger label -------------------------------------------------------

  function renderTriggerContent() {
    if (value.length === 0) {
      return <span className="text-slate-400 truncate">{placeholder}</span>
    }

    // Map selected values to labels (preserve insertion order from `value`)
    const selectedLabels = value
      .map((v) => options.find((o) => o.value === v)?.label ?? v)

    const visible = selectedLabels.slice(0, maxDisplay)
    const overflow = selectedLabels.length - maxDisplay

    return (
      <span className="flex min-w-0 flex-wrap items-center gap-1">
        {visible.map((lbl, i) => (
          <span
            key={i}
            className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary"
          >
            {lbl}
          </span>
        ))}
        {overflow > 0 && (
          <span className="text-xs text-muted-foreground">+{overflow} more</span>
        )}
      </span>
    )
  }

  // ---------------------------------------------------------------------------

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {/* Label */}
      {label && (
        <label
          htmlFor={triggerId}
          className="text-sm font-medium text-foreground"
        >
          {label}
          {required && (
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              {' '}*
            </span>
          )}
        </label>
      )}

      {/* Popover wrapper */}
      <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
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
            aria-multiselectable="true"
            disabled={disabled}
            className={cn(
              'flex min-h-10 w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm shadow-sm transition-colors',
              'focus-visible:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20',
              'disabled:cursor-not-allowed disabled:opacity-50',
              open && 'border-indigo-500 ring-2 ring-indigo-500/20',
              error
                ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
                : 'border-slate-300',
            )}
          >
            {/* Pills / placeholder */}
            <span className="flex min-w-0 flex-1 items-center">
              {renderTriggerContent()}
            </span>

            {/* Right-side icons */}
            <span className="ml-2 flex shrink-0 items-center gap-1">
              {value.length > 0 && (
                <span
                  role="button"
                  aria-label="Clear all selections"
                  tabIndex={0}
                  onClick={handleClearAll}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ')
                      handleClearAll(e as unknown as React.MouseEvent)
                  }}
                  className="rounded p-0.5 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              )}
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-slate-400 transition-transform duration-200',
                  open && 'rotate-180',
                )}
              />
            </span>
          </button>
        </PopoverTrigger>

        {/* Dropdown */}
        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-[var(--radix-popover-trigger-width)] min-w-[180px] p-0"
          onInteractOutside={(e) => {
            if (searchInputRef.current?.contains(e.target as Node)) {
              e.preventDefault()
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

          {/* Select all row */}
          {showSelectAll && !isLoading && filteredOptions.length > 0 && !searchTerm && (
            <div className="border-b">
              <div
                role="option"
                aria-selected={allSelected}
                onClick={handleSelectAll}
                className={cn(
                  'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground select-none',
                )}
              >
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                  // Prevent the div's onClick from firing twice
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="font-medium">
                  {allSelected ? 'Deselect all' : 'Select all'}
                </span>
              </div>
            </div>
          )}

          {/* Options list */}
          <div role="listbox" aria-multiselectable="true" className="max-h-60 overflow-y-auto py-1">
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
              filteredOptions.map((opt) => {
                const isSelected = value.includes(opt.value)
                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={opt.disabled}
                    onClick={() => !opt.disabled && toggle(opt.value)}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors select-none',
                      'hover:bg-accent hover:text-accent-foreground',
                      isSelected && 'bg-accent/50',
                      opt.disabled && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={opt.disabled}
                      onCheckedChange={() => !opt.disabled && toggle(opt.value)}
                      // Prevent the div's onClick from firing twice
                      onClick={(e) => e.stopPropagation()}
                      aria-label={opt.label}
                    />
                    <span className="truncate">{opt.label}</span>
                  </div>
                )
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
  )
}
