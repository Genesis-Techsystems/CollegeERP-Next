'use client'

import { useId, useState } from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export interface DatePickerProps {
  value: Date | null
  onChange: (date: Date | null) => void
  placeholder?: string
  label?: string
  required?: boolean
  error?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
  clearable?: boolean
  className?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  label,
  required = false,
  error,
  disabled = false,
  minDate,
  maxDate,
  clearable = true,
  className,
}: Readonly<DatePickerProps>) {
  const id = useId()
  const [open, setOpen] = useState(false)

  function handleSelect(date: Date | undefined) {
    onChange(date ?? null)
    setOpen(false)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(null)
    setOpen(false)
  }

  function isDisabled(date: Date): boolean {
    if (minDate && date < minDate) return true
    if (maxDate && date > maxDate) return true
    return false
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            disabled={disabled}
            aria-required={required || undefined}
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground',
              error && 'border-destructive focus-visible:ring-destructive',
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">
              {value ? format(value, 'PPP') : placeholder}
            </span>
            {clearable && value && (
              <X
                className="ml-auto h-4 w-4 shrink-0 opacity-60 hover:opacity-100"
                onClick={handleClear}
              />
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value ?? undefined}
            onSelect={handleSelect}
            disabled={isDisabled}
            startMonth={minDate}
            endMonth={maxDate}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
    </div>
  )
}
