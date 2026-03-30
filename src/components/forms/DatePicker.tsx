'use client'

import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

/**
 * Date picker input backed by Radix Popover + shadcn Calendar.
 * Returns a `Date | null` via `onChange`.
 */
interface DatePickerProps {
  /** Currently selected date, or null if nothing selected */
  value: Date | null
  /** Callback fired when the user selects or clears a date */
  onChange: (date: Date | null) => void
  /** Placeholder text shown when no date is selected */
  placeholder?: string
  /** Disables the trigger button and calendar interaction */
  disabled?: boolean
  /** Dates before this value are disabled in the calendar */
  minDate?: Date
  /** Dates after this value are disabled in the calendar */
  maxDate?: Date
  /** Additional CSS classes for the trigger button */
  className?: string
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled = false,
  minDate,
  maxDate,
  className,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, 'dd/MM/yyyy') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={(date) => onChange(date ?? null)}
          disabled={(date) => {
            if (minDate && date < minDate) return true
            if (maxDate && date > maxDate) return true
            return false
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
