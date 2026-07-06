'use client'

import { useEffect, useState } from 'react'
import { StatusBadge } from '@/common/components/data-display'
import { loadStudentProfileTabData, pickProfileCell } from '@/services'
import { formatProfileDate } from './profile-utils'

type AnyRow = Record<string, unknown>

const TH_CLASS = 'border border-border bg-[#C3D9FF] px-2 py-1.5 text-left text-xs font-medium'
const TD_CLASS = 'border border-border px-2 py-1.5 text-left text-xs font-medium'

function bookDetailValue(row: AnyRow, keys: string[]): string {
  const nested = row.bookDetail ?? row.book_detail ?? row.book
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const detail = nested as AnyRow
    for (const key of keys) {
      const value = detail[key]
      if (value != null && String(value).trim() !== '') return String(value).trim()
    }
  }
  const flat = pickProfileCell(row, keys)
  return flat && flat !== '—' ? flat : '—'
}

function bookValue(row: AnyRow, keys: string[]): string {
  const value = pickProfileCell(row, keys)
  return value && value !== '—' ? value : '—'
}

function formatIssueDate(value: unknown): string {
  if (!value) return '—'
  const parsed = new Date(String(value))
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  return formatProfileDate(value)
}

function isReturned(row: AnyRow): boolean {
  const raw = row.isreturned ?? row.isReturned ?? row.is_returned
  return raw === true || raw === 1 || raw === '1' || String(raw).toLowerCase() === 'true'
}

function fineTypeCode(row: AnyRow): string {
  return String(row.fineTypeCode ?? row.fine_type_code ?? '').toUpperCase()
}

function ReturnStatusCell({ row }: { row: AnyRow }) {
  if (fineTypeCode(row) === 'BOOKLOST') {
    return (
      <span className="rounded bg-destructive px-1.5 py-0.5 text-[11px] font-medium text-white">
        Book Lost
      </span>
    )
  }
  if (isReturned(row)) {
    return <StatusBadge status="active" label="Returned" />
  }
  return <StatusBadge status="inactive" label="Not Returned" />
}

function BooksTable({ rows, loading }: { rows: AnyRow[]; loading: boolean }) {
  if (loading) {
    return <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className={`${TH_CLASS} w-[5%]`}>SI.No</th>
            <th className={TH_CLASS}>Book Title</th>
            <th className={TH_CLASS}>Accession No</th>
            <th className={TH_CLASS}>Issue Date</th>
            <th className={TH_CLASS}>Return Date</th>
            <th className={TH_CLASS}>Issued On</th>
            <th className={`${TH_CLASS} text-center`}>Return Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className={`${TH_CLASS} text-center`}>
                <span className="text-sm font-medium text-destructive">No library books found.</span>
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={`${bookDetailValue(row, ['bookTitle', 'book_title', 'title'])}-${index}`}
                className={index % 2 === 0 ? 'bg-white' : 'bg-[#f1f6ff]'}
              >
                <td className={TD_CLASS}>{index + 1}</td>
                <td className={TD_CLASS}>
                  {bookDetailValue(row, ['bookTitle', 'book_title', 'title', 'bookName'])}
                </td>
                <td className={TD_CLASS}>
                  {bookDetailValue(row, ['accessionno', 'accessionNo', 'accession_no', 'accessionNumber'])}
                </td>
                <td className={TD_CLASS}>
                  {formatIssueDate(row.issueFromdate ?? row.issueFromDate ?? row.issue_from_date ?? row.issueDate)}
                </td>
                <td className={TD_CLASS}>
                  {formatIssueDate(row.issueTodate ?? row.issueToDate ?? row.issue_to_date ?? row.returnDate)}
                </td>
                <td className={TD_CLASS}>
                  {bookValue(row, ['bookIssuedOnCode', 'book_issued_on_code', 'issuedOn', 'issued_on'])}
                </td>
                <td className={`${TD_CLASS} text-center`}>
                  <ReturnStatusCell row={row} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export function BooksTab({ student }: { readonly student: AnyRow }) {
  const [rows, setRows] = useState<AnyRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const data = await loadStudentProfileTabData('books', student)
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
      <p className="text-base font-medium text-[#0c51a4]">Student Book Details</p>
      <BooksTable rows={rows} loading={loading} />
    </div>
  )
}
