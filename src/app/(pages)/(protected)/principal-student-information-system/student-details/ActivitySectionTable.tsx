'use client'

import { Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { pickText } from '@/app/(pages)/(protected)/admin-student-information-system/students-profile/profile-utils'

type AnyRow = Record<string, unknown>

function cell(row: AnyRow, keys: string[]): string {
  return pickText(row, keys) || '—'
}

export interface ActivitySectionTableProps {
  rows: AnyRow[]
  titleHeader: string
  emptyMessage: string
  onAdd: () => void
  onEdit: (row: AnyRow) => void
}

export function ActivitySectionTable({
  rows,
  titleHeader,
  emptyMessage,
  onAdd,
  onEdit,
}: ActivitySectionTableProps) {
  return (
    <div className="overflow-hidden rounded border border-border">
      <table className="min-w-full text-xs">
        <thead className="bg-sky-50/80 text-left text-muted-foreground">
          <tr>
            <th className="w-12 border-b border-border px-2 py-2 font-medium">Sl.No</th>
            <th className="border-b border-border px-2 py-2 font-medium">{titleHeader}</th>
            <th className="border-b border-border px-2 py-2 font-medium">Year/Semester</th>
            <th className="border-b border-border px-2 py-2 font-medium">View Certificate</th>
            <th className="border-b border-border px-2 py-2 font-medium">Viewing of Videos/Photos</th>
            <th className="w-20 border-b border-border px-2 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-2 py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={String(row.studentProfileId ?? row.student_profile_id ?? index)} className="border-t border-border">
                <td className="px-2 py-2">{index + 1}</td>
                <td className="px-2 py-2">
                  {cell(row, ['eventTitleCatdetName', 'event_title_catdet_name', 'eventTitle', 'title'])}
                </td>
                <td className="px-2 py-2">{cell(row, ['courseYearName', 'course_year_name'])}</td>
                <td className="px-2 py-2">—</td>
                <td className="px-2 py-2">—</td>
                <td className="px-2 py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-primary"
                    onClick={() => onEdit(row)}
                    aria-label="Edit activity"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))
          )}
          <tr className="border-t border-border bg-muted/10">
            <td className="px-2 py-2" colSpan={6}>
              <Button
                type="button"
                size="icon"
                className="h-8 w-8 rounded-full bg-sky-500 text-white hover:bg-sky-600"
                onClick={onAdd}
                aria-label="Add activity"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
