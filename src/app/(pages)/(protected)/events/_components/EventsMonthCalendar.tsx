'use client'

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { CollegeEventRow } from '@/types/events'

function eventDayKey(row: CollegeEventRow): string {
  const raw = row.startDate ?? row.eventDate
  if (!raw) return ''
  const d = new Date(String(raw))
  if (Number.isNaN(d.getTime())) return ''
  return format(d, 'yyyy-MM-dd')
}

function groupEventsByDay(events: CollegeEventRow[]): Map<string, CollegeEventRow[]> {
  const map = new Map<string, CollegeEventRow[]>()
  for (const ev of events) {
    const key = eventDayKey(ev)
    if (!key) continue
    const list = map.get(key) ?? []
    list.push(ev)
    map.set(key, list)
  }
  return map
}

type EventsMonthCalendarProps = {
  viewMonth: Date
  onViewMonthChange: (month: Date) => void
  events: CollegeEventRow[]
  selectedDate?: Date
  onSelectDate?: (date: Date) => void
  onEventClick?: (event: CollegeEventRow) => void
  readOnly?: boolean
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function EventsMonthCalendar({
  viewMonth,
  onViewMonthChange,
  events,
  selectedDate,
  onSelectDate,
  onEventClick,
  readOnly = false,
}: Readonly<EventsMonthCalendarProps>) {
  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const byDay = groupEventsByDay(events)

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => onViewMonthChange(addMonths(viewMonth, -1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold text-[hsl(var(--card-title))]">
          {format(viewMonth, 'MMMM yyyy')}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => onViewMonthChange(addMonths(viewMonth, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-[11px] font-medium text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1.5">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayEvents = byDay.get(key) ?? []
          const inMonth = isSameMonth(day, viewMonth)
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false

          return (
            <button
              key={key}
              type="button"
              disabled={readOnly && !onSelectDate}
              onClick={() => onSelectDate?.(day)}
              className={cn(
                'min-h-[72px] border-b border-r border-border/60 p-1 text-left align-top transition-colors',
                !inMonth && 'bg-muted/20 text-muted-foreground',
                inMonth && 'bg-background',
                isSelected && 'ring-2 ring-inset ring-[hsl(var(--primary))]',
                onSelectDate && inMonth && 'hover:bg-muted/40 cursor-pointer',
                readOnly && !onSelectDate && 'cursor-default',
              )}
            >
              <span className="text-[11px] font-medium">{format(day, 'd')}</span>
              <div className="mt-0.5 space-y-0.5">
                {dayEvents.slice(0, 2).map((ev) =>
                  onEventClick ? (
                    <button
                      key={String(ev.eventId ?? ev.eventName)}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventClick(ev)
                      }}
                      className={cn(
                        'w-full truncate rounded px-1 py-0.5 text-left text-[10px] leading-tight',
                        ev.isHoliday
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100'
                          : 'bg-primary/15 text-[hsl(var(--primary))]',
                        'cursor-pointer hover:opacity-80',
                      )}
                    >
                      {ev.eventName ?? 'Event'}
                    </button>
                  ) : (
                    <span
                      key={String(ev.eventId ?? ev.eventName)}
                      className={cn(
                        'block truncate rounded px-1 py-0.5 text-[10px] leading-tight',
                        ev.isHoliday
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100'
                          : 'bg-primary/15 text-[hsl(var(--primary))]',
                      )}
                    >
                      {ev.eventName ?? 'Event'}
                    </span>
                  ),
                )}
                {dayEvents.length > 2 ? (
                  <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 2} more</span>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
