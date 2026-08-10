"use client";

import { useId, useRef, useState } from "react";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useFormFieldVariant } from "@/common/components/forms/form-field-variant";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export interface MonthYearPickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  /** Minimum selectable month (inclusive, month-level granularity) */
  minDate?: Date;
  /** Maximum selectable month (inclusive, month-level granularity) */
  maxDate?: Date;
  /**
   * `outlined` — bordered box.
   * `standard` — Fuse / Angular Material underline (app default).
   */
  variant?: "outlined" | "standard";
  className?: string;
}

export function MonthYearPicker({
  value,
  onChange,
  placeholder = "Pick month/year",
  label,
  required = false,
  error,
  disabled = false,
  minDate,
  maxDate,
  variant: variantProp,
  className,
}: MonthYearPickerProps) {
  const id = useId();
  const gridRef = useRef<HTMLDivElement>(null);
  const variant = useFormFieldVariant(variantProp);
  const isStandard = variant === "standard";

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState<number>(
    () => value?.getFullYear() ?? new Date().getFullYear(),
  );

  // Derived bounds at month granularity
  const minYear = minDate?.getFullYear() ?? -Infinity;
  const minMonth = minDate?.getMonth() ?? 0;
  const maxYear = maxDate?.getFullYear() ?? Infinity;
  const maxMonth = maxDate?.getMonth() ?? 11;

  const selectedMonth = value?.getMonth() ?? -1;
  const selectedYear = value?.getFullYear() ?? -1;

  const canGoPrev = viewYear > minYear;
  const canGoNext = viewYear < maxYear;

  function isMonthDisabled(monthIndex: number): boolean {
    if (viewYear < minYear || viewYear > maxYear) return true;
    if (viewYear === minYear && monthIndex < minMonth) return true;
    if (viewYear === maxYear && monthIndex > maxMonth) return true;
    return false;
  }

  function handleMonthClick(monthIndex: number) {
    if (isMonthDisabled(monthIndex)) return;
    onChange(new Date(viewYear, monthIndex, 1));
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
    setOpen(false);
  }

  /** Move focus within the 3×4 month grid by offset cells. */
  function moveFocus(currentIndex: number, delta: number) {
    const next = currentIndex + delta;
    if (next < 0 || next > 11) return;
    const cells =
      gridRef.current?.querySelectorAll<HTMLElement>('[role="button"]');
    cells?.[next]?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const focused = document.activeElement as HTMLElement;
    const cells = Array.from(
      gridRef.current?.querySelectorAll<HTMLElement>('[role="button"]') ?? [],
    );
    const currentIndex = cells.indexOf(focused);
    if (currentIndex === -1) return;

    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        moveFocus(currentIndex, 1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        moveFocus(currentIndex, -1);
        break;
      case "ArrowDown":
        e.preventDefault();
        moveFocus(currentIndex, 3);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveFocus(currentIndex, -3);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        focused.click();
        break;
    }
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-[12px] font-normal text-black/54">
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
              "h-9 w-full justify-start text-left text-[length:var(--app-control-font-size)] font-normal shadow-none",
              !value && "text-muted-foreground",
              isStandard
                ? cn(
                    "rounded-none border-0 border-b border-black/12 bg-transparent px-0 hover:bg-transparent",
                    open && "border-b-2 border-[#0c51a4]",
                    error
                      ? "border-b-2 border-destructive"
                      : "focus-visible:border-b-2 focus-visible:border-[#0c51a4] focus-visible:ring-0",
                  )
                : cn(
                    "rounded-md",
                    error &&
                      "border-destructive focus-visible:ring-destructive",
                  ),
            )}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 truncate">
              {value ? format(value, "MMM yyyy") : placeholder}
            </span>
            {value && (
              <X
                className="ml-auto h-3.5 w-3.5 shrink-0 opacity-60 hover:opacity-100"
                onClick={handleClear}
              />
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-56 p-2.5" align="start">
          {/* Year navigation */}
          <div className="mb-2.5 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous year"
              disabled={!canGoPrev}
              onClick={() => setViewYear((y) => y - 1)}
              className={cn(
                "rounded p-1 hover:bg-accent transition-colors",
                !canGoPrev && "opacity-40 pointer-events-none",
              )}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <span className="text-[13px] font-semibold" aria-live="polite">
              {viewYear}
            </span>

            <button
              type="button"
              aria-label="Next year"
              disabled={!canGoNext}
              onClick={() => setViewYear((y) => y + 1)}
              className={cn(
                "rounded p-1 hover:bg-accent transition-colors",
                !canGoNext && "opacity-40 pointer-events-none",
              )}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Month grid */}
          <div
            ref={gridRef}
            role="grid"
            aria-label={`Months for ${viewYear}`}
            className="grid grid-cols-3 gap-1"
            onKeyDown={handleKeyDown}
          >
            {MONTH_LABELS.map((month, idx) => {
              const isSelected =
                idx === selectedMonth && viewYear === selectedYear;
              const isDisabled = isMonthDisabled(idx);

              return (
                <div key={month} role="gridcell">
                  <span
                    role="button"
                    tabIndex={isDisabled ? -1 : 0}
                    aria-selected={isSelected}
                    aria-disabled={isDisabled}
                    aria-label={`${month} ${viewYear}`}
                    onClick={() => handleMonthClick(idx)}
                    className={cn(
                      "block cursor-pointer select-none rounded-md px-2 py-1 text-[11px] text-center transition-colors",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "bg-primary text-primary-foreground font-medium"
                        : isDisabled
                          ? "text-muted-foreground opacity-40 cursor-not-allowed"
                          : "hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    {month}
                  </span>
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
