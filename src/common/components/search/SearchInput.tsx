'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/** Inline SVG avoids lucide SSR/client attribute drift during hydration */
function SvgSearch({ className, 'aria-hidden': ariaHidden = true }: { className?: string; 'aria-hidden'?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={ariaHidden}
      className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.34-4.34" />
    </svg>
  )
}

function SvgX({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        d="M18 6 6 18M6 6l12 12"
      />
    </svg>
  )
}

export interface SearchInputProps {
  /** Optional controlled value. When omitted the component manages its own state. */
  value?: string
  /** Called with the (debounced) search term on every change. */
  onChange: (value: string) => void
  /** Placeholder text shown inside the input. Default: "Search…" */
  placeholder?: string
  /**
   * Set to true when onChange triggers a server/API call. Applies a 300ms
   * debounce so the API isn't hit on every keystroke. For client-side
   * filtering (the default case) leave this unset — changes fire instantly.
   */
  serverSearch?: boolean
  /** Override the debounce delay in milliseconds. Ignored when serverSearch is set. */
  debounceMs?: number
  /** Additional CSS classes for the wrapper element. */
  className?: string
  /** Whether the input should receive focus on mount. */
  autoFocus?: boolean
  /**
   * When true, renders as a search icon button. Clicking it expands to the
   * full input and focuses it. Pressing Escape or blurring with an empty
   * value collapses back to the icon.
   */
  collapsible?: boolean
  disabled?: boolean
}

/**
 * Canonical debounced search input for the College ERP.
 *
 * Consolidates the two previous search inputs:
 *   - src/common/components/search/SearchInput.tsx  (onSearch prop variant)
 *   - src/components/forms/SearchInput.tsx          (onChange prop variant)
 *
 * Supports both controlled (value prop provided) and uncontrolled usage.
 * The clear button immediately fires onChange('') without waiting for the
 * debounce timer, then refocuses the input.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  serverSearch = false,
  debounceMs,
  className,
  autoFocus = false,
  collapsible = false,
  disabled = false,
}: SearchInputProps) {
  const resolvedDebounceMs = serverSearch ? 300 : (debounceMs ?? 0)
  const isControlled = value !== undefined

  const [localValue, setLocalValue] = useState<string>(value ?? '')
  const [expanded, setExpanded] = useState(!collapsible)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync local state when the controlled value changes externally.
  useEffect(() => {
    if (isControlled) {
      setLocalValue(value)
    }
  }, [isControlled, value])

  // Debounce: schedule onChange after the user stops typing.
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onChange(localValue)
    }, resolvedDebounceMs)

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [localValue, resolvedDebounceMs, onChange])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
    }
    setLocalValue(e.target.value)
  }

  // Bypass debounce on clear: reset immediately and refocus.
  const handleClear = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
    }
    setLocalValue('')
    onChange('')
    inputRef.current?.focus()
  }, [onChange])

  function handleExpand() {
    setExpanded(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleBlur() {
    if (collapsible && localValue === '') {
      setExpanded(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape' && collapsible) {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
      setLocalValue('')
      onChange('')
      setExpanded(false)
    }
  }

  if (collapsible && !expanded) {
    return (
      <button
        type="button"
        onClick={handleExpand}
        aria-label="Open search"
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-md',
          'text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
          className,
        )}
      >
        <SvgSearch className="h-4 w-4 text-muted-foreground" />
      </button>
    )
  }

  return (
    <div className={cn('relative flex items-center', className)}>
      <SvgSearch className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />

      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        inputMode="search"
        aria-label={placeholder || 'Search'}
        className={cn(
          'h-8 w-full rounded-md border border-input bg-background',
          'pl-9 pr-9 text-[13px] text-foreground placeholder:text-muted-foreground',
          'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 focus:ring-offset-0',
          'transition-colors duration-150',
        )}
        {...(autoFocus ? { autoFocus: true } : {})}
      />

      {localValue ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className={cn(
            'absolute right-3 flex items-center justify-center',
            'text-muted-foreground hover:text-foreground transition-colors',
          )}
        >
          <SvgX className="h-4 w-4 shrink-0" />
        </button>
      ) : null}
    </div>
  )
}
