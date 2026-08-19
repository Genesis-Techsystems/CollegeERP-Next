"use client";

import { useId } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useFormFieldVariant } from "@/common/components/forms/form-field-variant";

const UI_DATE_FORMAT = "dd/MM/yyyy";
/** Native Chrome year list uses min/max. Max must be in the future or years stop at 2026. */
const NATIVE_MIN = "1900-01-01";
const NATIVE_MAX = "2099-12-31";

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
  /** Kept for caller compatibility. UI always shows dd/MM/yyyy. */
  displayFormat?: string;
  /**
   * `outlined` — bordered box.
   * `standard` — Fuse / Angular Material underline (app default).
   */
  variant?: "outlined" | "standard";
  className?: string;
}

function toDateInputValue(date: Date | null | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return "";
  return format(date, "yyyy-MM-dd");
}

function fromDateInputValue(raw: string): Date | null {
  if (!raw) return null;
  const [year, month, day] = raw.split("-").map(Number);
  if (!year || !month || !day) return null;
  const next = new Date(year, month - 1, day);
  return Number.isNaN(next.getTime()) ? null : next;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "dd/mm/yyyy",
  label,
  required = false,
  error,
  disabled = false,
  minDate,
  clearable = true,
  variant: variantProp,
  className,
}: Readonly<DatePickerProps>) {
  const id = useId();
  const variant = useFormFieldVariant(variantProp);
  const isStandard = variant === "standard";
  const displayValue = value ? format(value, UI_DATE_FORMAT) : "";
  const nativeMin = toDateInputValue(minDate) || NATIVE_MIN;

  function handleChange(raw: string) {
    const next = fromDateInputValue(raw);
    if (!next) {
      if (clearable) onChange(null);
      return;
    }
    if (minDate) {
      const min = new Date(minDate);
      min.setHours(0, 0, 0, 0);
      if (next < min) return;
    }
    onChange(next);
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-[12px] font-medium text-black/54">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        <Input
          id={id}
          type="date"
          variant={variant}
          value={toDateInputValue(value)}
          min={nativeMin}
          max={NATIVE_MAX}
          disabled={disabled}
          required={required}
          aria-required={required || undefined}
          aria-label={label || placeholder}
          className={cn(
            "org-modal-date-input date-picker-hide-native-value pr-10",
            error &&
              (isStandard
                ? "border-b-2 border-destructive"
                : "border-destructive"),
          )}
          onChange={(e) => handleChange(e.target.value)}
        />
        <span
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 flex items-center text-[length:var(--app-control-font-size)] font-medium",
            isStandard ? "px-0" : "px-3",
            displayValue ? "text-foreground" : "text-[rgba(0,0,0,0.54)]",
          )}
        >
          {displayValue || placeholder}
        </span>
      </div>

      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
