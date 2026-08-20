"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormFieldVariant } from "@/common/components/forms/form-field-variant";

type AnyRow = Record<string, any>;

const DEFAULT_STUDENT_PHOTO = "/assets/images/avatars/default_Student.png";
const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_MIN_SEARCH_LEN = 5;

export interface StudentSearchSelectProps {
  label?: string;
  placeholder?: string;
  value: number | null;
  students: AnyRow[];
  selectedStudent?: AnyRow | null;
  isLoading?: boolean;
  /** Minimum characters before search fires. Defaults to 5 (Students List parity). */
  minChars?: number;
  onSearch: (term: string) => void;
  onChange: (studentId: number | null, student: AnyRow | null) => void;
  className?: string;
  /** When true, input stretches to parent width (no max-w-md cap). */
  fullWidth?: boolean;
  disabled?: boolean;
  disabled?: boolean;
  /**
   * `outlined` — bordered box.
   * `standard` — Fuse / Angular Material underline-only field (app default).
   */
  variant?: "outlined" | "standard";
}

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const k of keys) {
    const n = Number(row[k]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function photoSrc(path: string | null | undefined): string {
  const raw = String(path ?? "").trim();
  if (!raw) return DEFAULT_STUDENT_PHOTO;
  return raw.includes("?") ? raw : `${raw}?${Date.now()}`;
}

function isStudentActive(row: AnyRow): boolean {
  if (row.isActive === false || row.isActive === "false") return false;
  if (row.isActive === true || row.isActive === "true") return true;
  return row.isActive !== "" && row.isActive != null;
}

function statusLabel(row: AnyRow): string {
  return pickText(row, ["studentStatusDisplayName", "studentStatusCode"]);
}

function statusTone(code: string): string {
  const normalized = code.toUpperCase().replace(/\s+/g, "");
  switch (normalized) {
    case "INCOLLEGE":
      return "text-[green]";
    case "DTND":
      return "text-red-600 font-bold";
    case "PASSEDOUT":
      return "text-blue-600 font-bold";
    case "DETAINRECOMMENDED":
      return "text-amber-600 font-bold";
    case "DISCONTINUED":
      return "text-slate-500 font-bold";
    default:
      return "text-muted-foreground font-bold";
  }
}

function triggerLabel(row: AnyRow): string {
  const name = pickText(row, ["firstName", "studentName"]);
  const ht = pickText(row, [
    "hallticketNumber",
    "rollNumber",
    "admissionNumber",
  ]);
  if (name && ht) return `${name} (${ht})`;
  return name || ht || "";
}

function useDebouncedCallback(fn: (v: string) => void, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);
  const run = useCallback(
    (v: string) => {
      cancel();
      timer.current = setTimeout(() => {
        timer.current = null;
        fn(v);
      }, delay);
    },
    [fn, delay, cancel],
  );
  return { run, cancel };
}

function StudentSearchOption({
  row,
  selected,
  onSelect,
}: {
  row: AnyRow;
  selected: boolean;
  onSelect: () => void;
}) {
  const active = isStudentActive(row);
  const name = pickText(row, ["firstName", "studentName"]);
  const studentIdLine = pickText(row, [
    "hallticketNumber",
    "rollNumber",
    "admissionNumber",
    "studentId",
  ]);
  const status = statusLabel(row);
  const statusCode = pickText(row, ["studentStatusCode"]);

  // Angular student typeahead: ID on top, then NAME (blue) + status (green).
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      // Select on pointerdown so Radix Dialog outside-interaction handlers
      // (which call preventDefault on pointerdown and suppress click) cannot block selection.
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect();
      }}
      className={cn(
        "flex w-full items-center gap-3 border-b border-[#9e9e9e52] px-3 py-2 text-left transition-colors last:border-b-0",
        "hover:bg-slate-100 focus:bg-slate-100 focus:outline-none",
        selected && "bg-slate-100",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoSrc(row.studentPhotoPath ?? row.student_photo_path)}
        alt=""
        className={cn(
          "h-[50px] w-[50px] shrink-0 rounded-full object-cover",
          active ? "border-2 border-[#34e834]" : "border-2 border-[#f44336]",
        )}
        onError={(e) => {
          const img = e.currentTarget;
          if (!img.src.endsWith("default_Student.png"))
            img.src = DEFAULT_STUDENT_PHOTO;
        }}
      />
      <div className="min-w-0 flex-1 leading-snug">
        {hallticket ? (
          <p className="text-[13px] font-normal text-[rgba(0,0,0,0.87)]">
            {hallticket}
          </p>
        ) : null}
        <p className="mt-0.5 text-[13px]">
          {name ? (
            <span className="font-bold text-[#0c51a4]">{name}</span>
          ) : null}
          {name && status ? <span> </span> : null}
          {status ? (
            <span className={statusTone(statusCode || status)}>{status}</span>
          ) : null}
        </p>
      </div>
    </button>
  );
}

export function StudentSearchSelect({
  label = "Student",
  placeholder = "Search by student name or rollno.",
  value,
  students,
  selectedStudent,
  isLoading = false,
  minChars = DEFAULT_MIN_SEARCH_LEN,
  onSearch,
  onChange,
  className,
  fullWidth = false,
  disabled = false,
  variant: variantProp,
}: StudentSearchSelectProps) {
  const variant = useFormFieldVariant(variantProp);
  const isStandard = variant === "standard";
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [displayValue, setDisplayValue] = useState("");
  const [listPos, setListPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const active = open || focused;

  const searchNotify = useCallback(
    (term: string) => {
      onSearch(term);
    },
    [onSearch],
  );
  const { run: scheduleSearch, cancel: cancelSearch } = useDebouncedCallback(
    searchNotify,
    SEARCH_DEBOUNCE_MS,
  );

  const resolvedSelected =
    selectedStudent ??
    students.find(
      (row) => pickNum(row, ["studentId", "fk_student_id"]) === value,
    ) ??
    null;

  const showList =
    open &&
    (isLoading || students.length > 0 || searchTerm.trim().length >= minChars);

  const updateListPosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setListPos({
      top: rect.bottom + 2,
      left: rect.left,
      width: Math.max(rect.width, 360),
    });
  }, []);

  useEffect(() => {
    if (!value || !resolvedSelected) {
      if (!open) setDisplayValue("");
      return;
    }
    if (!open) setDisplayValue(triggerLabel(resolvedSelected));
  }, [value, resolvedSelected, open]);

  useLayoutEffect(() => {
    if (!showList) {
      setListPos(null);
      return;
    }
    updateListPosition();
    window.addEventListener("resize", updateListPosition);
    window.addEventListener("scroll", updateListPosition, true);
    return () => {
      window.removeEventListener("resize", updateListPosition);
      window.removeEventListener("scroll", updateListPosition, true);
    };
  }, [showList, students.length, isLoading, updateListPosition]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        rootRef.current?.contains(target) ||
        listRef.current?.contains(target)
      )
        return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  function handleInputChange(term: string) {
    if (disabled) return;
    setSearchTerm(term);
    setDisplayValue(term);
    setOpen(true);
    queueMicrotask(() => updateListPosition());
    if (term.trim().length >= minChars) {
      scheduleSearch(term);
    } else {
      cancelSearch();
      onSearch("");
    }
  }

  function handleFocus() {
    if (disabled) return;
    setFocused(true);
    setOpen(true);
    queueMicrotask(() => updateListPosition());
    if (resolvedSelected && !searchTerm) {
      setDisplayValue("");
      setSearchTerm("");
    }
  }

  function handleBlur() {
    setFocused(false);
  }

  function handleClear() {
    cancelSearch();
    setSearchTerm("");
    setDisplayValue("");
    setOpen(false);
    onChange(null, null);
    onSearch("");
    inputRef.current?.focus();
  }

  function handleSelect(row: AnyRow) {
    const sid = pickNum(row, ["studentId", "fk_student_id"]);
    cancelSearch();
    setSearchTerm("");
    setDisplayValue(triggerLabel(row));
    setOpen(false);
    onChange(sid || null, row);
  }

  const listbox =
    showList && listPos && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={listRef}
            role="listbox"
            data-student-search-listbox=""
            style={{
              position: "fixed",
              top: listPos.top,
              left: listPos.left,
              width: listPos.width,
              zIndex: 9999,
              // Radix modal Dialog sets pointer-events:none on body; re-enable for this portal.
              pointerEvents: "auto",
            }}
            className="max-h-72 overflow-y-auto rounded-md border border-slate-300 bg-white shadow-lg"
            // Keep Radix Dialog from treating list clicks as "outside" interactions.
            onPointerDown={(e) => e.stopPropagation()}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Searching…</span>
              </div>
            ) : students.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {searchTerm.trim().length < minChars
                  ? `Type at least ${minChars} characters to search`
                  : "No matching students found"}
              </div>
            ) : (
              students.map((row) => {
                const sid = pickNum(row, ["studentId", "fk_student_id"]);
                return (
                  <StudentSearchOption
                    key={
                      sid || pickText(row, ["hallticketNumber", "rollNumber"])
                    }
                    row={row}
                    selected={value === sid}
                    onSelect={() => handleSelect(row)}
                  />
                );
              })
            )}
          </div>,
          document.body,
        )
      : null;

  const showClear = Boolean(displayValue || value);

  return (
    <div ref={rootRef} className={cn("flex min-w-0 flex-col gap-1", className)}>
      {label ? (
        <label
          htmlFor={inputId}
          className={cn(
            "text-[12px] font-medium leading-none transition-colors",
            active ? "text-[#0c51a4]" : "text-black/54",
          )}
        >
          {label}
        </label>
      ) : null}

      <div
        ref={anchorRef}
        className={cn(
          "app-control relative flex w-full min-w-0 items-center",
          !fullWidth && "max-w-md",
          disabled && "cursor-not-allowed opacity-50",
          isStandard
            ? cn(
                "h-9 rounded-none border-0 border-b border-black/12 bg-transparent px-0 py-1.5 shadow-none",
                active && !disabled && "border-b-2 border-[#0c51a4]",
              )
            : cn(
                "rounded-md border border-slate-300 bg-white shadow-sm",
                disabled && "opacity-50",
              ),
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          disabled={disabled}
          value={displayValue}
          placeholder={placeholder}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            "h-full w-full min-w-0 flex-1 bg-transparent text-[length:var(--app-control-font-size)] font-medium text-[rgba(0,0,0,0.87)] placeholder:font-medium placeholder:text-[rgba(0,0,0,0.54)] focus:outline-none focus:ring-0",
            isStandard ? "px-0 pr-14" : "px-3 pr-9",
          )}
        />
        <span
          className={cn(
            "absolute flex shrink-0 items-center gap-1",
            isStandard ? "right-0" : "right-2",
          )}
        >
          {showClear && !disabled ? (
            <button
              type="button"
              aria-label="Clear student"
              onClick={handleClear}
              className="rounded p-0.5 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {isStandard ? (
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                active ? "rotate-180 text-[#0c51a4]" : "text-slate-400",
              )}
              aria-hidden
            />
          ) : null}
        </span>
      </div>
      {listbox}
    </div>
  );
}
