'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

interface MonthYearPickerProps {
  value: Date | null
  onChange: (date: Date | null) => void
  placeholder?: string
  disabled?: boolean
}

export default function MonthYearPicker({
  value,
  onChange,
  placeholder = 'Pick month/year',
  disabled = false,
}: MonthYearPickerProps) {
  const [viewYear, setViewYear] = useState(() =>
    value ? value.getFullYear() : new Date().getFullYear()
  )
  const [open, setOpen] = useState(false)

  const selectedMonth = value ? value.getMonth() : -1
  const selectedYear = value ? value.getFullYear() : -1

  function handleMonthClick(monthIndex: number) {
    onChange(new Date(viewYear, monthIndex, 1))
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, 'MM/yyyy') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setViewYear((y) => y - 1)}
            className="p-1 rounded hover:bg-accent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">{viewYear}</span>
          <button
            type="button"
            onClick={() => setViewYear((y) => y + 1)}
            className="p-1 rounded hover:bg-accent"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((month, idx) => {
            const isSelected = idx === selectedMonth && viewYear === selectedYear
            return (
              <button
                key={month}
                type="button"
                onClick={() => handleMonthClick(idx)}
                className={cn(
                  'rounded-md px-2 py-1.5 text-sm transition-colors',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                )}
              >
                {month}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
