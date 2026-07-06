'use client'

import { PencilIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface TableRowActionsProps {
  onEdit?: () => void
  onDelete?: () => void
  editLabel?: string
  deleteLabel?: string
  className?: string
}

/** Standard edit / delete action buttons for AG Grid action columns. */
export function TableRowActions({
  onEdit,
  onDelete,
  editLabel = 'Edit',
  deleteLabel = 'Delete',
  className,
}: TableRowActionsProps) {
  return (
    <div className={cn('app-table-row-actions flex items-center gap-1.5', className)}>
      {onEdit ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-table-action="edit"
          className="app-table-action-edit h-8 w-8 rounded-md p-0"
          aria-label={editLabel}
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </Button>
      ) : null}
      {onDelete ? (
        <Button
          type="button"
          size="sm"
          variant="destructive"
          data-table-action="delete"
          className="app-table-action-delete h-8 w-8 rounded-md p-0"
          aria-label={deleteLabel}
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2Icon className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  )
}
