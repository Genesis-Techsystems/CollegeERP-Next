"use client";

import { useEffect, useState } from "react";
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
    const start = eventStartDate(ev);
    if (!start) continue;
    const endRaw = ev.endDate ?? ev.startDate ?? ev.eventDate;
    const end = endRaw ? new Date(String(endRaw)) : start;
    const rangeEnd =
      end && !Number.isNaN(end.getTime()) && end >= start ? end : start;
    for (const d of eachDayOfInterval({ start, end: rangeEnd })) {
      const key = format(d, "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
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
  /** Angular staff-events: "No Events in this month." */
  sidebarEmptyMessage?: string;
  /** Render inside parent card — no extra card chrome. */
  embedded?: boolean;
  /** Angular staff-events month calendar styling. */
  variant?: "default" | "staff";
  /** Angular staff-events: month navigator and calendar sit in separate cards. */
  splitCards?: boolean;
};

function EventListCard({
  event,
  onClick,
}: Readonly<{ event: CollegeEventRow; onClick?: () => void }>) {
  const start = eventStartDate(event);
  const monthLabel = start ? format(start, "MMM") : "";
  const dayLabel = start ? format(start, "d") : "";
  const dateRange = formatEventDateRange(event);
  const eventTypeName = event.eventTypeName;
  const hasEventType =
    event.eventTypeId != null && String(eventTypeName ?? "").trim() !== "";

  const inner = (
    <>
      <div className="flex w-[52px] shrink-0 flex-col overflow-hidden border-r border-border">
        <div className="bg-[hsl(var(--primary))] px-1 py-1 text-center text-[11px] font-semibold text-primary-foreground">
          {monthLabel}
        </div>
        <div className="flex flex-1 items-center justify-center bg-background py-2 text-xl font-semibold text-foreground">
          {dayLabel}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between px-3 py-2">
        <p className="text-[13px] font-medium text-foreground">
          {event.eventName ?? "Event"}
          {hasEventType ? (
            <span className="ml-1 text-[15px] font-normal text-[#FF9800]">
              ({eventTypeName})
            </span>
          ) : null}
        </p>
        {event.description ? (
          <span className="mt-1 line-clamp-2 text-[12px] text-muted-foreground">
            {event.description}
          </span>
        ) : null}
        {dateRange ? (
          <span className="mt-1 text-[11px] text-muted-foreground">
            {dateRange}
          </span>
        ) : null}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-stretch overflow-hidden rounded-md border border-border bg-card text-left transition-colors hover:bg-muted/30"
      >
        {inner}
      </button>
    );
  }

  return (
    <div className="flex w-full items-stretch overflow-hidden rounded-md border border-border bg-card text-left">
      {inner}
    </div>
  );
}

/** Angular `mwl-calendar-open-day-events` — shown when a calendar day is clicked. */
function OpenDayEvents({
  events,
  onEventClick,
}: Readonly<{
  events: CollegeEventRow[];
  onEventClick?: (event: CollegeEventRow) => void;
}>) {
  return (
    <div className="space-y-2 bg-[#555] px-4 py-4 shadow-[inset_0_0_12px_0_rgba(0,0,0,0.54)]">
      {events.map((ev, idx) => {
        const title = ev.eventName ?? "Event";
        const inner = (
          <>
            <span
              className="ml-4 h-2.5 w-2.5 shrink-0 rounded-full bg-[#1e90ff]"
              aria-hidden
            />
            <span className="block min-w-0 flex-1 px-4 py-[15px] text-[15px] leading-none text-black">
              {title}
            </span>
          </>
        );
        const className =
          "flex w-full items-center bg-white text-left shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),0_2px_2px_0_rgba(0,0,0,0.14),0_1px_5px_0_rgba(0,0,0,0.12)]";
        return onEventClick ? (
          <button
            key={String(ev.eventId ?? `${title}-${idx}`)}
            type="button"
            className={cn(className, "hover:shadow-md")}
            onClick={() => onEventClick(ev)}
          >
            {inner}
          </button>
        ) : (
          <div
            key={String(ev.eventId ?? `${title}-${idx}`)}
            className={className}
          >
            {inner}
          </div>
        );
      })}
    </div>
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
  sidebarEmptyMessage,
  embedded = false,
  variant = "default",
  splitCards = false,
}: Readonly<EventsCalendarPanelProps>) {
  const [openDay, setOpenDay] = useState<Date | null>(null);
  const isStaffVariant = variant === "staff";
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  const byDay = groupEventsByDay(events);

  useEffect(() => {
    setOpenDay(null);
  }, [viewMonth]);

  const monthEvents = sortEventsByDate(
    events.filter((ev) => {
      const d = eventStartDate(ev);
      return d ? isSameMonth(d, viewMonth) : false;
    }),
  );

  // Angular staff-events sidebar lists full API `events`, not month-filtered.
  const sidebarEvents =
    sidebarEmptyMessage != null ? sortEventsByDate(events) : monthEvents;

  function handleDayClick(day: Date, dayEvents: CollegeEventRow[]) {
    onSelectDate?.(day);
    if (!isSameMonth(day, viewMonth)) return;
    // Angular `dayClicked`: toggle closed when clicking the open day or an empty day.
    if ((openDay && isSameDay(openDay, day)) || dayEvents.length === 0) {
      setOpenDay(null);
      return;
    }
    setOpenDay(day);
  }

  return (
    <div
      className={cn(
        splitCards ? "space-y-3" : "overflow-hidden",
        !embedded && !splitCards && "bg-card",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 px-3 py-2",
          splitCards && "app-card",
          !splitCards &&
            (isStaffVariant
              ? "mx-4 mt-3 rounded-md border border-border/60 bg-background shadow-sm"
              : "border-b border-border bg-[#c3d9ff]"),
        )}
      >
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn(
              "h-8 w-8 p-0",
              isStaffVariant &&
                "rounded-full border-0 bg-[#dedede] text-blue-600 shadow-sm hover:bg-[#d0d0d0]",
            )}
            onClick={() => onViewMonthChange(addMonths(viewMonth, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span
            className={cn(
              "text-sm font-semibold",
              isStaffVariant
                ? "rounded-md bg-[#c3d9ff] px-5 py-1.5 text-foreground"
                : "rounded-md bg-[hsl(var(--primary))]/10 px-4 py-1.5 text-[hsl(var(--primary))]",
            )}
          >
            {format(viewMonth, "MMMM yyyy")}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn(
              "h-8 w-8 p-0",
              isStaffVariant &&
                "rounded-full border-0 bg-[#dedede] text-blue-600 shadow-sm hover:bg-[#d0d0d0]",
            )}
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

      <div
        className={cn(
          "grid grid-cols-1",
          splitCards && "app-card gap-3 overflow-hidden p-3",
          isStaffVariant
            ? "lg:grid-cols-[minmax(0,1.85fr)_minmax(240px,1fr)]"
            : "lg:grid-cols-[minmax(0,1fr)_280px]",
        )}
      >
        <div
          className={cn(
            "min-w-0",
            splitCards
              ? "overflow-hidden rounded-md border border-[hsl(var(--primary))]/25"
              : "border-b border-border lg:border-b-0 lg:border-r",
          )}
        >
          <div
            className={cn(
              "grid grid-cols-7 border-b text-center text-[11px] font-semibold",
              isStaffVariant
                ? "border-[hsl(var(--primary))]/30 bg-[#c3d9ff] text-[hsl(var(--primary))]"
                : "border-[hsl(var(--primary))]/20 bg-[#c3d9ff] text-[hsl(var(--primary))]",
            )}
          >
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="border-r border-[hsl(var(--primary))]/15 px-1 py-2 last:border-r-0"
              >
                {d}
              </div>
            ))}
          </div>

          <div>
            {weeks.map((week) => {
              const weekHasOpen =
                openDay != null && week.some((d) => isSameDay(d, openDay));
              const openEvents =
                openDay != null
                  ? (byDay.get(format(openDay, "yyyy-MM-dd")) ?? [])
                  : [];

              return (
                <div key={format(week[0]!, "yyyy-MM-dd")}>
                  <div className="grid grid-cols-7">
                    {week.map((day) => {
                      const key = format(day, "yyyy-MM-dd");
                      const dayEvents = byDay.get(key) ?? [];
                      const inMonth = isSameMonth(day, viewMonth);
                      const isOpen =
                        openDay != null ? isSameDay(day, openDay) : false;
                      const isSelected = selectedDate
                        ? isSameDay(day, selectedDate)
                        : isOpen;

                      return (
                        <div
                          key={key}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleDayClick(day, dayEvents)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleDayClick(day, dayEvents);
                            }
                          }}
                          className={cn(
                            "relative border-b border-r border-border/70 p-1.5 text-left transition-colors last:border-r-0",
                            isStaffVariant ? "min-h-[96px]" : "min-h-[88px]",
                            !inMonth && "bg-muted/20 text-muted-foreground",
                            inMonth && "bg-background",
                            (isOpen || isSelected) &&
                              (isStaffVariant
                                ? "bg-[#c3d9ff] ring-1 ring-inset ring-[hsl(var(--primary))]/40"
                                : "bg-muted shadow-md"),
                            inMonth && "cursor-pointer hover:bg-muted/30",
                          )}
                        >
                          {isStaffVariant ? (
                            <>
                              <span className="float-right text-[12px] font-medium">
                                {format(day, "d")}
                              </span>
                              <div className="clear-both mt-0.5 space-y-0.5">
                                {dayEvents.slice(0, 3).map((ev) => (
                                  <span
                                    key={String(ev.eventId ?? ev.eventName)}
                                    className="block truncate rounded bg-[hsl(var(--primary))]/15 px-1 py-0.5 text-[10px] leading-tight text-[hsl(var(--primary))]"
                                  >
                                    {ev.eventName ?? "Event"}
                                  </span>
                                ))}
                                {dayEvents.length > 3 ? (
                                  <span className="text-[10px] text-muted-foreground">
                                    +{dayEvents.length - 3} more
                                  </span>
                                ) : null}
                              </div>
                            </>
                          ) : (
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
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {weekHasOpen && openEvents.length > 0 ? (
                    <OpenDayEvents
                      events={openEvents}
                      onEventClick={onEventClick}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto p-3 lg:max-h-none">
          {sidebarEvents.length === 0 ? (
            <p
              className={cn(
                "py-2 text-[15px] font-medium",
                sidebarEmptyMessage
                  ? "text-blue-600"
                  : "py-6 text-center text-[13px] text-muted-foreground",
              )}
            >
              {sidebarEmptyMessage ?? "No events this month"}
            </p>
          ) : (
            sidebarEvents.map((ev) => (
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
