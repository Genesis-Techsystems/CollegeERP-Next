"use client";

import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EmpTodoListItem } from "@/types/todo";

function todoDayKey(row: EmpTodoListItem): string {
  if (!row.todoDate) return "";
  const d = new Date(row.todoDate);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "yyyy-MM-dd");
}

function groupTodosByDay(
  todos: EmpTodoListItem[],
): Map<string, EmpTodoListItem[]> {
  const map = new Map<string, EmpTodoListItem[]>();
  for (const todo of todos) {
    const key = todoDayKey(todo);
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(todo);
    map.set(key, list);
  }
  return map;
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

interface TodoMonthCalendarProps {
  viewMonth: Date;
  todos: EmpTodoListItem[];
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
  onTodoClick?: (todo: EmpTodoListItem) => void;
}

export function TodoMonthCalendar({
  viewMonth,
  todos,
  selectedDate,
  onSelectDate,
  onTodoClick,
}: Readonly<TodoMonthCalendarProps>) {
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const byDay = groupTodosByDay(todos);

  return (
    <div className="overflow-hidden rounded-[3px] border border-[#c3d9ff] bg-white">
      <div className="grid grid-cols-7 border-b border-[#c3d9ff] bg-[#c3d9ff] text-center text-[12px] font-medium text-slate-800">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="border-r border-white/40 py-2 last:border-r-0"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayTodos = byDay.get(key) ?? [];
          const inMonth = isSameMonth(day, viewMonth);
          const isSelected = selectedDate
            ? isSameDay(day, selectedDate)
            : false;
          const isDaySelectable = Boolean(onSelectDate);

          return (
            <div
              key={key}
              role={isDaySelectable ? "button" : undefined}
              tabIndex={isDaySelectable ? 0 : undefined}
              onClick={isDaySelectable ? () => onSelectDate?.(day) : undefined}
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
                "relative min-h-[88px] border-b border-r border-[#e6eef8] p-1.5 text-left align-top transition-colors",
                !inMonth && "bg-[#f7f9fc] text-slate-400",
                inMonth && "bg-white",
                isSelected && "bg-[#e3f2fd]",
                isDaySelectable &&
                  inMonth &&
                  "hover:bg-[#f0f7ff] cursor-pointer",
                !isDaySelectable && "cursor-default",
              )}
            >
              <span className="absolute right-1.5 top-1 text-[12px] font-medium text-slate-700">
                {format(day, "d")}
              </span>
              <div className="mt-5 space-y-0.5">
                {dayTodos.slice(0, 2).map((todo) => (
                  <button
                    key={String(todo.empTodoListId ?? todo.title)}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTodoClick?.(todo);
                    }}
                    className={cn(
                      "flex w-full items-center gap-0.5 truncate rounded px-1 py-0.5 text-left text-[10px] leading-tight",
                      todo.isCompleted
                        ? "bg-emerald-100 text-emerald-900"
                        : "bg-[#c3d9ff]/70 text-[#001f3f]",
                      "cursor-pointer hover:opacity-80",
                    )}
                  >
                    {todo.isFlaged ? (
                      <Flag className="h-2.5 w-2.5 shrink-0" />
                    ) : null}
                    <span className="truncate">{todo.title ?? "TODO"}</span>
                  </button>
                ))}
                {dayTodos.length > 2 ? (
                  <span className="text-[10px] text-slate-500">
                    +{dayTodos.length - 2} more
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
