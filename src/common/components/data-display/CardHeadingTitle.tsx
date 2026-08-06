import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface CardHeadingTitleProps {
  children: ReactNode;
  className?: string;
  as?: "h2" | "h3" | "div";
}

/**
 * Angular filters-card heading: Material `book` icon + title + gold underline
 * (underline is on the parent header row via `.app-card-title` CSS).
 */
export function CardHeadingTitle({
  children,
  className,
  as: Tag = "h2",
}: CardHeadingTitleProps) {
  return (
    <Tag className={cn("app-card-title", className)}>
      <span className="material-icons app-card-title__icon" aria-hidden="true">
        book
      </span>
      <span className="app-card-title__text">{children}</span>
    </Tag>
  );
}
