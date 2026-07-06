'use client'

import { useEffect, useState } from 'react'
import { StatusBadge } from '@/common/components/data-display'
import { loadStudentProfileTabData, pickProfileCell } from '@/services'
import { formatProfileDate } from './profile-utils'

type AnyRow = Record<string, unknown>

const TH_CLASS = 'border border-border bg-[#C3D9FF] px-2 py-1.5 text-left text-xs font-medium'
const TD_CLASS = 'border border-border px-2 py-1.5 text-left text-xs font-medium'

function placementValue(row: AnyRow, keys: string[]): string {
  const value = pickProfileCell(row, keys)
  return value && value !== '—' ? value : '—'
}

function isRegistered(row: AnyRow): boolean {
  const raw = row.isRegistered ?? row.is_registered ?? row.registered
  if (raw === true || raw === 1 || raw === '1') return true
  if (typeof raw === 'string' && raw.toLowerCase() === 'true') return true
  return false
}

function PlacementsTable({ rows, loading }: { rows: AnyRow[]; loading: boolean }) {
  if (loading) {
    return <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className={`${TH_CLASS} w-[5%]`}>No.</th>
            <th className={TH_CLASS}>Company</th>
            <th className={TH_CLASS}>Placement</th>
            <th className={TH_CLASS}>Date</th>
            <th className={`${TH_CLASS} text-center`}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className={`${TH_CLASS} text-center`}>
                <span className="text-sm font-medium text-destructive">No placement records found.</span>
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={`${placementValue(row, ['companyName', 'company_name'])}-${index}`}
                className={index % 2 === 0 ? 'bg-white' : 'bg-[#f1f6ff]'}
              >
                <td className={TD_CLASS}>{index + 1}</td>
                <td className={TD_CLASS}>
                  {placementValue(row, ['companyName', 'company_name', 'organizationName', 'employerName'])}
                </td>
                <td className={TD_CLASS}>
                  {placementValue(row, [
                    'placementTitle',
                    'placement_title',
                    'plaecmentTitle',
                    'jobRole',
                    'designation',
                  ])}
                </td>
                <td className={TD_CLASS}>
                  {formatProfileDate(
                    row.registeredDate ??
                      row.registered_date ??
                      row.placementStartDate ??
                      row.placement_start_date,
                  )}
                </td>
                <td className={`${TD_CLASS} text-center`}>
                  {isRegistered(row) ? (
                    <StatusBadge status="active" label="Registered" />
                  ) : (
                    <StatusBadge status="pending" label="Register" />
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export function PlacementsTab({ student }: { readonly student: AnyRow }) {
  const [rows, setRows] = useState<AnyRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const data = await loadStudentProfileTabData('placements', student)
        if (!cancelled) setRows(data)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [student])

  return (
    <div className="space-y-3 rounded-md border border-[#e8e8e8] p-2">
      <p className="text-base font-medium text-[#0c51a4]">Student Placement Details</p>
      <PlacementsTable rows={rows} loading={loading} />
    </div>
  )
}
