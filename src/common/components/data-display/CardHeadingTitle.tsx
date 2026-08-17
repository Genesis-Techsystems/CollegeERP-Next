import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface CardHeadingTitleProps {
  children: ReactNode;
  className?: string;
  as?: "h2" | "h3" | "div";
  /** Material Icons ligature. Angular Timing Set uses `timelapse`. Default `book`. */
  icon?: string;
}

/**
 * Angular filters-card heading: Material icon + title + gold underline
 * (underline is on the parent header row via `.app-card-title` CSS).
 */
export function CardHeadingTitle({
  children,
  className,
  as: Tag = "h2",
  icon = "book",
}: CardHeadingTitleProps) {
  return (
    <Tag className={cn("app-card-title", className)}>
      <span className="material-icons app-card-title__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="app-card-title__text">{children}</span>
    </Tag>
  );
}
