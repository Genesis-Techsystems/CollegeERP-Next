'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/common/components/feedback'
import {
  buildStudentFeeParticularGroups,
  buildStudentFeeView,
  formatFeeCell,
  loadStudentProfileTabData,
  parseFeeYearLabel,
  summarizeStudentFeeParticulars,
  type StudentFeeParticularGroup,
  type StudentFeeParticularTotals,
  type StudentFeeYearRow,
} from '@/services'

type AnyRow = Record<string, unknown>

const TH_CLASS = 'border border-border bg-[#C3D9FF] px-2 py-1.5 text-center text-xs font-medium'
const TD_CLASS =
  'border border-border px-2 py-1.5 text-center text-xs font-medium hover:bg-[#c3d9ff59] cursor-pointer'
const TD_STATIC = 'border border-border px-2 py-1.5 text-center text-xs font-medium'
const AMOUNT_COLS: Array<{ key: keyof StudentFeeYearRow; label: string }> = [
  { key: 'totalAmount', label: 'Total Amount' },
  { key: 'rtfAmount', label: 'RTF Amount' },
  { key: 'collegeAmount', label: 'College Amount' },
  { key: 'collegeDiscount', label: 'College Discount' },
  { key: 'netAmount', label: 'NET Amount' },
  { key: 'paidAmount', label: 'Paid Amount' },
  { key: 'dueCollegeAmount', label: 'Due College Amount' },
  { key: 'rtfReceived', label: 'RTF Received' },
  { key: 'dueRtfAmount', label: 'Due RTF Amount' },
  { key: 'totalDue', label: 'Total Due' },
]

function ParticularAmountColumn({ values }: { values: (number | null)[] }) {
  return (
    <td className={`${TD_STATIC} text-right`}>
      {values.map((value, i) => (
        <p key={i} className="my-1">
          {formatFeeCell(value)}
        </p>
      ))}
    </td>
  )
}

function YearSummaryTable({
  rows,
  onYearClick,
}: {
  rows: StudentFeeYearRow[]
  onYearClick: (yearNo: number) => void
}) {
  const yearRows = rows.filter((r) => !r.isTotal)
  const totalRow = rows.find((r) => r.isTotal)

  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr>
          <th className={TH_CLASS} rowSpan={2}>
            Year
          </th>
          <th className={TH_CLASS} colSpan={10}>
            Amount
          </th>
        </tr>
        <tr>
          {AMOUNT_COLS.map((col) => (
            <th key={col.key} className={TH_CLASS}>
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {yearRows.map((row) => {
          const yearNo = parseFeeYearLabel(row.year)
          const clickable = yearNo != null
          const cellClass = clickable ? TD_CLASS : TD_STATIC
          return (
            <tr key={row.year}>
              <td
                className={cellClass}
                onClick={clickable ? () => onYearClick(yearNo!) : undefined}
              >
                {yearNo != null ? row.year : '—'}
              </td>
              {AMOUNT_COLS.map((col) => (
                <td
                  key={col.key}
                  className={cellClass}
                  onClick={clickable ? () => onYearClick(yearNo!) : undefined}
                >
                  {formatFeeCell(row[col.key] as number | null)}
                </td>
              ))}
            </tr>
          )
        })}
        {totalRow ? (
          <tr>
            <td className={TD_STATIC}>Total</td>
            {AMOUNT_COLS.map((col) => (
              <td key={col.key} className={TD_STATIC}>
                {formatFeeCell(totalRow[col.key] as number | null)}
              </td>
            ))}
          </tr>
        ) : null}
      </tbody>
    </table>
  )
}

function ParticularsTable({
  group,
  totals,
  onBack,
}: {
  group: StudentFeeParticularGroup
  totals: StudentFeeParticularTotals
  onBack: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button type="button" size="sm" variant="secondary" onClick={onBack}>
          Back
        </Button>
      </div>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className={TH_CLASS} rowSpan={2}>
              Year
            </th>
            <th className={TH_CLASS} rowSpan={2}>
              Particulars
            </th>
            <th className={TH_CLASS} colSpan={10}>
              Amount
            </th>
          </tr>
          <tr>
            {AMOUNT_COLS.map((col) => (
              <th key={col.key} className={TH_CLASS}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={TD_STATIC}>{group.year} year</td>
            <td className={`${TD_STATIC} text-left`}>
              {group.structures.map((name, i) => (
                <p key={i} className="my-1">
                  {name}
                </p>
              ))}
            </td>
            <ParticularAmountColumn values={group.totalAmt} />
            <ParticularAmountColumn values={group.rtfAmt} />
            <ParticularAmountColumn values={group.collegeAmt} />
            <ParticularAmountColumn values={group.discountAmt} />
            <ParticularAmountColumn values={group.netAmt} />
            <ParticularAmountColumn values={group.paidAmt} />
            <ParticularAmountColumn values={group.dueCollegeAmt} />
            <ParticularAmountColumn values={group.rtfReceivedAmt} />
            <ParticularAmountColumn values={group.dueRtfAmt} />
            <ParticularAmountColumn values={group.totalDueAmt} />
          </tr>
          <tr>
            <td className={TD_STATIC} colSpan={2}>
              Total
            </td>
            <td className={`${TD_STATIC} text-right`}>{formatFeeCell(totals.total)}</td>
            <td className={`${TD_STATIC} text-right`}>{formatFeeCell(totals.rtf)}</td>
            <td className={`${TD_STATIC} text-right`}>{formatFeeCell(totals.college)}</td>
            <td className={`${TD_STATIC} text-right`}>{formatFeeCell(totals.discount)}</td>
            <td className={`${TD_STATIC} text-right`}>{formatFeeCell(totals.net)}</td>
            <td className={`${TD_STATIC} text-right`}>{formatFeeCell(totals.paid)}</td>
            <td className={`${TD_STATIC} text-right`}>{formatFeeCell(totals.dueCollege)}</td>
            <td className={`${TD_STATIC} text-right`}>{formatFeeCell(totals.rtfReceived)}</td>
            <td className={`${TD_STATIC} text-right`}>{formatFeeCell(totals.dueRtf)}</td>
            <td className={`${TD_STATIC} text-right`}>{formatFeeCell(totals.totalDue)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export function FeeDetailsTab({ student }: { readonly student: AnyRow }) {
  const [loading, setLoading] = useState(true)
  const [rawRows, setRawRows] = useState<AnyRow[]>([])
  const [drillYear, setDrillYear] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setDrillYear(null)
      try {
        const data = await loadStudentProfileTabData('fee', student)
        if (!cancelled) setRawRows(data)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [student])

  const summary = useMemo(() => buildStudentFeeView(rawRows), [rawRows])
  const particularGroups = useMemo(() => buildStudentFeeParticularGroups(rawRows), [rawRows])

  const activeGroup = useMemo(
    () => (drillYear != null ? particularGroups.find((g) => g.year === drillYear) ?? null : null),
    [drillYear, particularGroups],
  )

  const particularTotals = useMemo(
    () => (drillYear != null ? summarizeStudentFeeParticulars(rawRows, drillYear) : null),
    [drillYear, rawRows],
  )

  const hasData = summary.rows.some((r) => !r.isTotal && r.totalAmount != null && r.totalAmount > 0)

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
  }

  if (!hasData && particularGroups.length === 0) {
    return <EmptyState title="No fee details found." />
  }

  return (
    <div className="space-y-3">
      <p className="text-center text-base font-medium text-[#0c51a4]">Student Fee Details</p>
      {drillYear != null && activeGroup && particularTotals ? (
        <ParticularsTable
          group={activeGroup}
          totals={particularTotals}
          onBack={() => setDrillYear(null)}
        />
      ) : (
        <YearSummaryTable rows={summary.rows} onYearClick={setDrillYear} />
      )}
    </div>
  )
}
