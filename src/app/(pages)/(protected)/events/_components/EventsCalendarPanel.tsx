"use client";

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
} from "date-fns";
import { ChevronLeft, ChevronRight, PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { CollegeEventRow } from "@/types/events";

function eventDayKey(row: CollegeEventRow): string {
  const raw = row.startDate ?? row.eventDate;
  if (!raw) return "";
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd");
}

function eventStartDate(row: CollegeEventRow): Date | null {
  const raw = row.startDate ?? row.eventDate;
  if (!raw) return null;
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? null : d;
}

function groupEventsByDay(
  events: CollegeEventRow[],
): Map<string, CollegeEventRow[]> {
  const map = new Map<string, CollegeEventRow[]>();
  for (const ev of events) {
    const key = eventDayKey(ev);
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(ev);
    map.set(key, list);
  }
  return map;
}

function formatEventDateRange(row: CollegeEventRow): string {
  const start = eventStartDate(row);
  const endRaw = row.endDate ?? row.startDate ?? row.eventDate;
  const end = endRaw ? new Date(String(endRaw)) : start;
  if (!start || !end || Number.isNaN(end.getTime())) return "";
  const startLabel = format(start, "MMM d, yyyy");
  const endLabel = format(end, "MMM d, yyyy");
  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
}

function sortEventsByDate(events: CollegeEventRow[]): CollegeEventRow[] {
  return [...events].sort((a, b) => {
    const da = eventStartDate(a)?.getTime() ?? 0;
    const db = eventStartDate(b)?.getTime() ?? 0;
    return da - db;
  });
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type EventsCalendarPanelProps = {
  viewMonth: Date;
  onViewMonthChange: (month: Date) => void;
  events: CollegeEventRow[];
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
  onAddEvent?: () => void;
  onEventClick?: (event: CollegeEventRow) => void;
  readOnly?: boolean;
};

function EventListCard({
  event,
  onClick,
}: Readonly<{ event: CollegeEventRow; onClick?: () => void }>) {
  const start = eventStartDate(event);
  const monthLabel = start ? format(start, "MMM") : "";
  const dayLabel = start ? format(start, "d") : "";
  const dateRange = formatEventDateRange(event);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-stretch overflow-hidden rounded-md border border-border bg-card text-left transition-colors hover:bg-muted/30"
    >
      <div className="flex w-[52px] shrink-0 flex-col overflow-hidden border-r border-border">
        <div className="bg-[hsl(var(--primary))] px-1 py-1 text-center text-[11px] font-semibold text-primary-foreground">
          {monthLabel}
        </div>
        <div className="flex flex-1 items-center justify-center bg-background py-2 text-xl font-semibold text-foreground">
          {dayLabel}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between px-3 py-2">
        <p className="truncate text-[13px] font-medium text-foreground">
          {event.eventName ?? "Event"}
          {event.isHoliday ? (
            <span className="ml-1 font-normal text-amber-600 dark:text-amber-400">
              (Week Off)
            </span>
          ) : null}
        </p>
        {dateRange ? (
          <p className="mt-1 text-right text-[11px] text-muted-foreground">
            {dateRange}
          </p>
        ) : null}
      </div>
    </button>
  );
}

export function EventsCalendarPanel({
  viewMonth,
  onViewMonthChange,
  events,
  selectedDate,
  onSelectDate,
  onAddEvent,
  onEventClick,
  readOnly = false,
}: Readonly<EventsCalendarPanelProps>) {
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const byDay = groupEventsByDay(events);

  const monthEvents = sortEventsByDate(
    events.filter((ev) => {
      const d = eventStartDate(ev);
      return d ? isSameMonth(d, viewMonth) : false;
    }),
  );

  const isDaySelectable = Boolean(onSelectDate);

  return (
    <div className="overflow-hidden bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-background px-3 py-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 w-8 rounded-full p-0"
            onClick={() => onViewMonthChange(addMonths(viewMonth, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="rounded-md bg-[hsl(var(--primary))]/10 px-4 py-1.5 text-sm font-semibold text-[hsl(var(--primary))]">
            {format(viewMonth, "MMMM yyyy")}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 w-8 rounded-full p-0"
            onClick={() => onViewMonthChange(addMonths(viewMonth, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {!readOnly && onAddEvent ? (
          <Button
            type="button"
            size="sm"
            className="h-9 w-9 rounded-md p-0"
            onClick={onAddEvent}
            aria-label="Add event"
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 border-b border-border lg:border-b-0 lg:border-r">
          <div className="grid grid-cols-7 border-b border-[hsl(var(--primary))]/20 bg-[hsl(var(--primary))]/10 text-center text-[11px] font-semibold text-[hsl(var(--primary))]">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="border-r border-[hsl(var(--primary))]/15 px-1 py-2 last:border-r-0"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayEvents = byDay.get(key) ?? [];
              const inMonth = isSameMonth(day, viewMonth);
              const isSelected = selectedDate
                ? isSameDay(day, selectedDate)
                : false;

              return (
                <div
                  key={key}
                  role={isDaySelectable ? "button" : undefined}
                  tabIndex={isDaySelectable ? 0 : undefined}
                  onClick={
                    isDaySelectable ? () => onSelectDate?.(day) : undefined
                  }
                  onKeyDown={
                    isDaySelectable
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelectDate?.(day);
                          }
                        }
                      : undefined
                  }
                  className={cn(
                    "relative min-h-[88px] border-b border-r border-border/70 p-1.5 text-left transition-colors last:border-r-0",
                    !inMonth && "bg-muted/20 text-muted-foreground",
                    inMonth && "bg-background",
                    isSelected && "bg-[hsl(var(--primary))]/10",
                    isDaySelectable &&
                      inMonth &&
                      "cursor-pointer hover:bg-muted/30",
                    !isDaySelectable && "cursor-default",
                  )}
                >
                  <div className="flex items-start justify-between gap-1">
                    {dayEvents.length > 0 ? (
                      <div className="flex flex-col items-center gap-0.5 pt-0.5">
                        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white">
                          {dayEvents.length}
                        </span>
                        <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />
                      </div>
                    ) : (
                      <span className="w-4 shrink-0" aria-hidden />
                    )}
                    <span className="text-[12px] font-medium">
                      {format(day, "d")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex max-h-[520px] flex-col gap-2 overflow-y-auto p-3 lg:max-h-none">
          {monthEvents.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted-foreground">
              No events this month
            </p>
          ) : (
            monthEvents.map((ev) => (
              <EventListCard
                key={String(ev.eventId ?? `${ev.eventName}-${eventDayKey(ev)}`)}
                event={ev}
                onClick={onEventClick ? () => onEventClick(ev) : undefined}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
