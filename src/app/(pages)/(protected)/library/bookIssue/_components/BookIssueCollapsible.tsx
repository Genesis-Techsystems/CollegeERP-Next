"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookIssueCollapsibleProps {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  /** Controlled open state (e.g. exclusive accordion). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  titleExtra?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Padding for collapsible body only (e.g. form sections). Omit for tables. */
  contentClassName?: string;
  /** Header button class override. */
  headerClassName?: string;
  /** Title text class override. */
  titleClassName?: string;
  /** Right side of header row (e.g. Filter label). */
  headerTrailing?: ReactNode;
}

/** Angular mat-expansion-panel parity for Book Issue sections. */
export function BookIssueCollapsible({
  title,
  icon,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  titleExtra,
  children,
  className,
  contentClassName,
  headerClassName,
  titleClassName,
  headerTrailing,
}: Readonly<BookIssueCollapsibleProps>) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;

  const toggle = () => {
    const next = !open;
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  return (
    <div
      className={cn("rounded-md border border-border bg-background", className)}
    >
      <button
        type="button"
        className={cn(
          "flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/30",
          headerClassName,
        )}
        onClick={toggle}
        aria-expanded={open}
        aria-label={`Toggle ${title}`}
      >
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          {icon ? (
            <span className="inline-flex shrink-0 text-[hsl(var(--card-title))]">
              {icon}
            </span>
          ) : null}
          <span
            className={cn(
              "text-[13px] font-semibold text-[hsl(var(--card-title))]",
              titleClassName,
            )}
          >
            {title}
          </span>
          {titleExtra}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {headerTrailing}
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-in-out",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </span>
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className={contentClassName}>{children}</div>
        </div>
      </div>
    </div>
  );
}
