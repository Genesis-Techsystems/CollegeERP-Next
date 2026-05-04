'use client'

import { useId, useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
  className?: string
}

const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'))

function parseTime(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (!match) return { hour: '09', minute: '00', period: 'AM' as const }

  const hour24 = Number(match[1])
  const minute = match[2]
  const period = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return { hour: String(hour12).padStart(2, '0'), minute, period }
}

function hasTimeValue(value: string) {
  return /^(\d{1,2}):(\d{2})(?::\d{2})?$/.test(value.trim())
}

function toTime24(hour12: string, minute: string, period: 'AM' | 'PM') {
  const h = Number(hour12)
  const hour24 = period === 'PM' ? (h % 12) + 12 : h % 12
  return `${String(hour24).padStart(2, '0')}:${minute}:00`
}

const panelSelectClass =
  'h-9 min-w-[3.25rem] flex-1 cursor-pointer rounded-md border border-slate-200 bg-white px-1.5 text-center text-[13px] font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-[#1F6D9A]/35'

export function TimePicker({ value, onChange, label = 'Time Picker', className }: Readonly<TimePickerProps>) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const parsed = parseTime(value)
  const filled = hasTimeValue(value)
  const displayValue = `${parsed.hour}:${parsed.minute} ${parsed.period}`

  return (
    <div className={cn('min-w-0 space-y-1', className)}>
      <label htmlFor={id} className="block text-[12px] font-medium text-slate-700">
        {label}
      </label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            className={cn(
              // Match `Input` + modal overrides (`h-9 text-[12px]`) on exam session and similar forms.
              'app-control flex h-9 w-full min-w-0 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-left text-[length:var(--app-control-font-size)] font-normal text-slate-900 shadow-sm outline-none transition-colors',
              'hover:bg-slate-50 focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:border-[hsl(var(--ring))]',
              filled ? 'text-slate-900' : 'text-slate-400',
            )}
          >
            <Clock className="h-3.5 w-3.5 shrink-0 text-slate-500" strokeWidth={1.75} />
            <span className="truncate">{filled ? displayValue : 'Select time'}</span>
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-3" align="start">
          <div className="flex min-w-[min(100vw-2rem,18rem)] items-center gap-1.5">
            <select
              value={parsed.hour}
              onChange={(e) => onChange(toTime24(e.target.value, parsed.minute, parsed.period))}
              className={panelSelectClass}
              aria-label={`${label} hour`}
            >
              {HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {hour}
                </option>
              ))}
            </select>

            <span className="shrink-0 text-sm font-semibold text-slate-500">:</span>

            <select
              value={parsed.minute}
              onChange={(e) => onChange(toTime24(parsed.hour, e.target.value, parsed.period))}
              className={panelSelectClass}
              aria-label={`${label} minute`}
            >
              {MINUTES.map((minute) => (
                <option key={minute} value={minute}>
                  {minute}
                </option>
              ))}
            </select>

            <select
              value={parsed.period}
              onChange={(e) =>
                onChange(toTime24(parsed.hour, parsed.minute, e.target.value as 'AM' | 'PM'))
              }
              className={cn(panelSelectClass, 'min-w-[3.75rem] flex-none')}
              aria-label={`${label} AM or PM`}
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
