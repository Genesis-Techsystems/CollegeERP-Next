"use client";

import { Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TableRowActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  className?: string;
}

/**
 * Angular mat-table action icons: blue pencil | red ×
 * (features stay in React; visual matches Fuse Angular).
 */
export function TableRowActions({
  onEdit,
  onDelete,
  editLabel = "Edit",
  deleteLabel = "Delete",
  className,
}: TableRowActionsProps) {
  return (
    <div
      className={cn(
        "app-table-row-actions inline-flex items-center gap-1.5",
        className,
      )}
    >
      {onEdit ? (
        <button
          type="button"
          data-table-action="edit"
          className="app-table-action-edit inline-flex h-7 w-7 items-center justify-center rounded-sm text-[#0c51a4] hover:bg-[#0c51a4]/10"
          aria-label={editLabel}
          title={editLabel}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Pencil className="h-4 w-4" strokeWidth={2} />
        </button>
      ) : null}
      {onEdit && onDelete ? (
        <span
          className="select-none text-[13px] leading-none text-black/35"
          aria-hidden
        >
          |
        </span>
      ) : null}
      {onDelete ? (
        <button
          type="button"
          data-table-action="delete"
          className="app-table-action-delete inline-flex h-7 w-7 items-center justify-center rounded-sm text-red-600 hover:bg-red-50"
          aria-label={deleteLabel}
          title={deleteLabel}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>
      ) : null}
    </div>
  );
}
