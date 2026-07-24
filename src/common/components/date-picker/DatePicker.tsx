"use client";

import { useId, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const currentYear = new Date().getFullYear();
const DEFAULT_START_MONTH = new Date(currentYear - 100, 0, 1);
const DEFAULT_END_MONTH = new Date(currentYear + 100, 11, 31);

export interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  clearable?: boolean;
  /** date-fns format string for the trigger label. Defaults to long text (`PPP`). */
  displayFormat?: string;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  label,
  required = false,
  error,
  disabled = false,
  minDate,
  maxDate,
  clearable = true,
  displayFormat = "PPP",
  className,
}: Readonly<DatePickerProps>) {
  const id = useId();
  const [open, setOpen] = useState(false);

  function handleSelect(date: Date | undefined) {
    onChange(date ?? null);
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
    setOpen(false);
  }

  function isDisabled(date: Date): boolean {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-[12px] font-medium">
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
              "h-8 w-full justify-start text-left text-[12px] font-normal",
              !value && "text-muted-foreground",
              error && "border-destructive focus-visible:ring-destructive",
            )}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 truncate">
              {value ? format(value, displayFormat) : placeholder}
            </span>
            {clearable && value && (
              <X
                className="ml-auto h-3.5 w-3.5 shrink-0 opacity-60 hover:opacity-100"
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
            startMonth={minDate ?? DEFAULT_START_MONTH}
            endMonth={maxDate ?? DEFAULT_END_MONTH}
            // Angular Material-style: month + year dropdowns in the caption
            captionLayout="dropdown"
            className="p-2"
            classNames={{
              month_caption:
                "rdp-month_caption flex justify-center pt-1 relative items-center gap-1 text-xs font-medium",
              // Visible native month/year selects (RDP default hides selects via opacity:0)
              dropdowns: "rdp-dropdowns flex items-center justify-center gap-1.5",
              dropdown_root:
                "rdp-dropdown_root relative inline-flex items-center",
              dropdown:
                "h-7 max-w-[8rem] cursor-pointer appearance-auto rounded-md border border-input bg-background px-1.5 text-[11px] font-medium opacity-100 relative z-[2]",
              caption_label: "hidden",
              months_dropdown: "rdp-months_dropdown",
              years_dropdown: "rdp-years_dropdown",
              button_previous:
                "absolute left-1 h-6 w-6 bg-transparent p-0 opacity-60 hover:opacity-100",
              button_next:
                "absolute right-1 h-6 w-6 bg-transparent p-0 opacity-60 hover:opacity-100",
              weekday:
                "text-muted-foreground rounded-md w-7 font-normal text-[10px]",
              day: "relative p-0 text-center text-xs focus-within:relative focus-within:z-20",
              day_button:
                "h-7 w-7 p-0 text-[11px] font-normal aria-selected:opacity-100",
            }}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
