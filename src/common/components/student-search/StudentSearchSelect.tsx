'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type AnyRow = Record<string, any>

const DEFAULT_STUDENT_PHOTO = '/assets/images/avatars/default_Student.png'
const SEARCH_DEBOUNCE_MS = 300
const DEFAULT_MIN_SEARCH_LEN = 5

export interface StudentSearchSelectProps {
  label?: string
  placeholder?: string
  value: number | null
  students: AnyRow[]
  selectedStudent?: AnyRow | null
  isLoading?: boolean
  /** Minimum characters before search fires. Defaults to 5 (Students List parity). */
  minChars?: number
  onSearch: (term: string) => void
  onChange: (studentId: number | null, student: AnyRow | null) => void
  className?: string
}

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0
  for (const k of keys) {
    const n = Number(row[k])
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return ''
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

function photoSrc(path: string | null | undefined): string {
  const raw = String(path ?? '').trim()
  if (!raw) return DEFAULT_STUDENT_PHOTO
  return raw.includes('?') ? raw : `${raw}?${Date.now()}`
}

function isStudentActive(row: AnyRow): boolean {
  if (row.isActive === false || row.isActive === 'false') return false
  if (row.isActive === true || row.isActive === 'true') return true
  return row.isActive !== '' && row.isActive != null
}

function statusLabel(row: AnyRow): string {
  return pickText(row, ['studentStatusDisplayName', 'studentStatusCode'])
}

function statusTone(code: string): string {
  switch (code.toUpperCase()) {
    case 'INCOLLEGE':
      return 'text-[#4CAF50] font-bold'
    case 'DTND':
      return 'text-red-600 font-semibold'
    case 'PASSEDOUT':
      return 'text-blue-600 font-semibold'
    case 'DETAINRECOMMENDED':
      return 'text-amber-600 font-semibold'
    case 'DISCONTINUED':
      return 'text-slate-500 font-semibold'
    default:
      return 'text-muted-foreground font-medium'
  }
}

function triggerLabel(row: AnyRow): string {
  const name = pickText(row, ['firstName', 'studentName'])
  const ht = pickText(row, ['hallticketNumber', 'rollNumber', 'admissionNumber'])
  if (name && ht) return `${name} (${ht})`
  return name || ht || ''
}

function useDebouncedCallback(fn: (v: string) => void, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancel = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])
  const run = useCallback(
    (v: string) => {
      cancel()
      timer.current = setTimeout(() => {
        timer.current = null
        fn(v)
      }, delay)
    },
    [fn, delay, cancel],
  )
  return { run, cancel }
}

function StudentSearchOption({
  row,
  selected,
  onSelect,
}: {
  row: AnyRow
  selected: boolean
  onSelect: () => void
}) {
  const active = isStudentActive(row)
  const name = pickText(row, ['firstName', 'studentName'])
  const hallticket = pickText(row, ['hallticketNumber', 'rollNumber', 'admissionNumber'])
  const status = statusLabel(row)
  const statusCode = pickText(row, ['studentStatusCode'])

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 border-b border-black/10 px-3 py-2.5 text-left transition-colors last:border-b-0',
        'hover:bg-slate-100 focus:bg-slate-100 focus:outline-none',
        selected && 'bg-slate-100',
      )}
    >
      <img
        src={photoSrc(row.studentPhotoPath ?? row.student_photo_path)}
        alt=""
        className={cn(
          'h-[50px] w-[50px] shrink-0 rounded-full object-cover',
          active ? 'border-2 border-[#34e834]' : 'border-2 border-[#f44336]',
        )}
        onError={(e) => {
          const img = e.currentTarget
          if (!img.src.endsWith('default_Student.png')) img.src = DEFAULT_STUDENT_PHOTO
        }}
      />
      <div className="min-w-0 flex-1 pt-0.5">
        <p
          className={cn(
            'text-sm font-medium leading-snug',
            selected ? 'text-blue-600' : 'text-foreground',
          )}
        >
          {name || '—'}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed">
          {hallticket ? (
            <span className="text-[#828282] font-medium">{hallticket}</span>
          ) : null}
          {hallticket && status ? <span className="text-[#828282]"> </span> : null}
          {status ? <span className={statusTone(statusCode || status)}>{status}</span> : null}
        </p>
      </div>
    </button>
  )
}

export function StudentSearchSelect({
  label = 'Student',
  placeholder = 'Search by student name or rollno.',
  value,
  students,
  selectedStudent,
  isLoading = false,
  minChars = DEFAULT_MIN_SEARCH_LEN,
  onSearch,
  onChange,
  className,
}: StudentSearchSelectProps) {
  const inputId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [displayValue, setDisplayValue] = useState('')

  const searchNotify = useCallback(
    (term: string) => {
      onSearch(term)
    },
    [onSearch],
  )
  const { run: scheduleSearch, cancel: cancelSearch } = useDebouncedCallback(
    searchNotify,
    SEARCH_DEBOUNCE_MS,
  )

  const resolvedSelected =
    selectedStudent ??
    students.find((row) => pickNum(row, ['studentId', 'fk_student_id']) === value) ??
    null

  useEffect(() => {
    if (!value || !resolvedSelected) {
      if (!open) setDisplayValue('')
      return
    }
    if (!open) setDisplayValue(triggerLabel(resolvedSelected))
  }, [value, resolvedSelected, open])

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  function handleInputChange(term: string) {
    setSearchTerm(term)
    setDisplayValue(term)
    setOpen(true)
    if (term.trim().length >= minChars) {
      scheduleSearch(term)
    } else {
      cancelSearch()
      onSearch('')
    }
  }

  function handleFocus() {
    setOpen(true)
    if (resolvedSelected && !searchTerm) {
      setDisplayValue('')
      setSearchTerm('')
    }
  }

  function handleClear() {
    cancelSearch()
    setSearchTerm('')
    setDisplayValue('')
    setOpen(false)
    onChange(null, null)
    onSearch('')
    inputRef.current?.focus()
  }

  function handleSelect(row: AnyRow) {
    const sid = pickNum(row, ['studentId', 'fk_student_id'])
    cancelSearch()
    setSearchTerm('')
    setDisplayValue(triggerLabel(row))
    setOpen(false)
    onChange(sid || null, row)
  }

  const showList =
    open && (isLoading || students.length > 0 || searchTerm.trim().length >= minChars)

  return (
    <div ref={rootRef} className={cn('flex flex-col gap-1', className)}>
      {label ? (
        <label htmlFor={inputId} className="text-xs font-medium text-foreground">
          {label}
        </label>
      ) : null}

      <div className="w-full max-w-md rounded-md border border-slate-300 bg-white shadow-sm">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            autoComplete="off"
            value={displayValue}
            placeholder={placeholder}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={handleFocus}
            className="h-10 w-full bg-transparent px-3 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {displayValue || value ? (
            <button
              type="button"
              aria-label="Clear student"
              onClick={handleClear}
              className="absolute right-2 rounded p-0.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {showList ? (
          <div role="listbox" className="max-h-72 overflow-y-auto border-t border-slate-200">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Searching…</span>
              </div>
            ) : students.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {searchTerm.trim().length < minChars
                  ? `Type at least ${minChars} characters to search`
                  : 'No matching students found'}
              </div>
            ) : (
              students.map((row) => {
                const sid = pickNum(row, ['studentId', 'fk_student_id'])
                return (
                  <StudentSearchOption
                    key={sid || pickText(row, ['hallticketNumber', 'rollNumber'])}
                    row={row}
                    selected={value === sid}
                    onSelect={() => handleSelect(row)}
                  />
                )
              })
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
