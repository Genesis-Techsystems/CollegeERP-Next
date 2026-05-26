'use client'

import type { TcClearanceRow } from '@/types/tc-no-due'

interface ClearanceTableProps {
  rows: TcClearanceRow[]
}

export function ClearanceTable({ rows }: Readonly<ClearanceTableProps>) {
  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-3 py-2 text-left font-medium">Clearance</th>
            <th className="w-28 px-3 py-2 text-right font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-b last:border-0">
              <td className="px-3 py-2">{row.name}</td>
              <td className="px-3 py-2 text-right">
                <span
                  className={
                    row.isDue
                      ? 'font-medium text-amber-700'
                      : 'font-medium text-emerald-700'
                  }
                >
                  {row.isDue ? 'Pending' : 'Cleared'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
