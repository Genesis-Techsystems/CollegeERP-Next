'use client'

import { Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { pickText } from '@/app/(pages)/(protected)/admin-student-information-system/students-profile/profile-utils'
import { PROFILE_VIEW } from './profile-view-styles'

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

const thClass =
  'border px-2 py-1 text-left text-[12px] font-bold'
const tdClass = 'border px-2 py-1 text-[12px] text-[#333333]'

export function ActivitySectionTable({
  rows,
  titleHeader,
  emptyMessage,
  onAdd,
  onEdit,
}: ActivitySectionTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px]" style={{ borderColor: PROFILE_VIEW.border }}>
        <thead>
          <tr className="bg-white">
            <th className={thClass} style={{ borderColor: PROFILE_VIEW.border, color: PROFILE_VIEW.navy, width: 48 }}>
              Sl.No
            </th>
            <th className={thClass} style={{ borderColor: PROFILE_VIEW.border, color: PROFILE_VIEW.navy }}>
              {titleHeader}
            </th>
            <th className={thClass} style={{ borderColor: PROFILE_VIEW.border, color: PROFILE_VIEW.navy }}>
              Year/Semester
            </th>
            <th className={thClass} style={{ borderColor: PROFILE_VIEW.border, color: PROFILE_VIEW.navy }}>
              View Certificate
            </th>
            <th className={thClass} style={{ borderColor: PROFILE_VIEW.border, color: PROFILE_VIEW.navy }}>
              Viewing of Videos/Photos
            </th>
            <th className={thClass} style={{ borderColor: PROFILE_VIEW.border, color: PROFILE_VIEW.navy, width: 72 }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="border px-2 py-6 text-center text-[12px]"
                style={{ borderColor: PROFILE_VIEW.border, color: PROFILE_VIEW.muted }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={String(row.studentProfileId ?? row.student_profile_id ?? index)} className="bg-white">
                <td className={tdClass} style={{ borderColor: PROFILE_VIEW.border }}>
                  {index + 1}
                </td>
                <td className={tdClass} style={{ borderColor: PROFILE_VIEW.border }}>
                  {cell(row, ['eventTitleCatdetName', 'event_title_catdet_name', 'eventTitle', 'title'])}
                </td>
                <td className={tdClass} style={{ borderColor: PROFILE_VIEW.border }}>
                  {cell(row, ['courseYearName', 'course_year_name'])}
                </td>
                <td className={tdClass} style={{ borderColor: PROFILE_VIEW.border }}>
                  —
                </td>
                <td className={tdClass} style={{ borderColor: PROFILE_VIEW.border }}>
                  —
                </td>
                <td className={tdClass} style={{ borderColor: PROFILE_VIEW.border }}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-[#007bff] hover:bg-transparent hover:text-[#0056b3]"
                    onClick={() => onEdit(row)}
                    aria-label="Edit activity"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))
          )}
          <tr className="bg-white">
            <td className="border px-2 py-2" colSpan={6} style={{ borderColor: PROFILE_VIEW.border }}>
              <Button
                type="button"
                size="icon"
                className="h-8 w-8 rounded-full text-white hover:opacity-90"
                style={{ backgroundColor: PROFILE_VIEW.linkBlue }}
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
