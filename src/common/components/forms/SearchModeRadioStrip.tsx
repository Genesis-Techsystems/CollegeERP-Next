"use client";

import { cn } from "@/lib/utils";

export type StudentSearchMode = "student" | "section";

export interface SearchModeRadioOption<T extends string = string> {
  value: T;
  label: string;
}

export interface SearchModeRadioStripProps<T extends string = StudentSearchMode> {
  value: T;
  onChange: (mode: T) => void;
  options?: SearchModeRadioOption<T>[];
  name?: string;
  ariaLabel?: string;
  className?: string;
}

const STUDENT_SEARCH_OPTIONS: SearchModeRadioOption<StudentSearchMode>[] = [
  { value: "student", label: "Search By Student" },
  { value: "section", label: "Search By Section" },
];

/**
 * Angular mat-radio-group strip above filter cards (Student Details, Employee List, …).
 */
export function SearchModeRadioStrip<T extends string = StudentSearchMode>({
  value,
  onChange,
  options,
  name = "search-mode",
  ariaLabel = "Search mode",
  className,
}: SearchModeRadioStripProps<T>) {
  const resolvedOptions = (options ??
    STUDENT_SEARCH_OPTIONS) as SearchModeRadioOption<T>[];

  return (
    <div
      className={cn(
        "search-mode-radio-strip -mx-[var(--spacing-page-x)]",
        className,
      )}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      <div className="search-mode-radio-strip__inner">
        {resolvedOptions.map((option) => (
          <label key={option.value} className="search-mode-radio-strip__option">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
