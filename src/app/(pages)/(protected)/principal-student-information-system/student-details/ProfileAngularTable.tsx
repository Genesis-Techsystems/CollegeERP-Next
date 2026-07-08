'use client'

import { PROFILE_VIEW } from './profile-view-styles'

type AnyRow = Record<string, unknown>

export type ProfileAngularColumn = {
  id: string
  label: string
  align?: 'left' | 'center' | 'right'
  render: (row: AnyRow) => string
}

export interface ProfileAngularTableProps {
  columns: ProfileAngularColumn[]
  rows: AnyRow[]
  emptyText?: string
}

export function ProfileAngularTable({
  columns,
  rows,
  emptyText = 'No records found.',
}: ProfileAngularTableProps) {
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full border-collapse text-[12px]"
        style={{ borderColor: PROFILE_VIEW.border }}
      >
        <thead>
          <tr className="bg-white">
            {columns.map((col) => (
              <th
                key={col.id}
                className="border px-2 py-1 font-bold"
                style={{
                  borderColor: PROFILE_VIEW.border,
                  color: PROFILE_VIEW.navy,
                  textAlign: col.align ?? 'left',
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="border px-2 py-4 text-center text-[12px]"
                style={{ borderColor: PROFILE_VIEW.border, color: PROFILE_VIEW.muted }}
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} className="bg-white">
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className="border px-2 py-1 text-[12px] text-[#333333]"
                    style={{
                      borderColor: PROFILE_VIEW.border,
                      textAlign: col.align ?? 'left',
                    }}
                  >
                    {col.render(row) || '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
