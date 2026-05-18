'use client'

import { useEffect, useMemo, useState } from 'react'
import { Table, TableCard, type TableColumn } from '@/common/components/table'
import { cn } from '@/lib/utils'
import {
  buildStudentFeeView,
  formatFeeCell,
  loadStudentProfileTabData,
  type StudentFeeYearRow,
} from '@/services'

type AnyRow = Record<string, unknown>

/** Matches active profile tab / “Student Details” title (`SIS_PROFILE_THEME.headerBg`) */
const TITLE_COLOR = '#45b3a2'
const FONT_TITLE = 'text-[15px] font-bold'

type StudentFeeTabProps = {
  student: AnyRow
  activeTab: string
}

function amountCell(value: number | null, bold?: boolean) {
  return (
    <span className={cn('block text-center tabular-nums', bold && 'font-semibold')}>
      {formatFeeCell(value)}
    </span>
  )
}

const FEE_TABLE_COLUMNS: TableColumn<StudentFeeYearRow>[] = [
  {
    id: 'year',
    label: 'Year',
    render: (row) => (
      <span className={cn('text-left', row.isTotal && 'font-semibold')}>{row.year}</span>
    ),
  },
  {
    id: 'totalAmount',
    label: 'Total Amount',
    render: (row) => amountCell(row.totalAmount, row.isTotal),
  },
  {
    id: 'rtfAmount',
    label: 'RTF Amount',
    render: (row) => amountCell(row.rtfAmount, row.isTotal),
  },
  {
    id: 'collegeAmount',
    label: 'College Amount',
    render: (row) => amountCell(row.collegeAmount, row.isTotal),
  },
  {
    id: 'collegeDiscount',
    label: 'College Discount',
    render: (row) => amountCell(row.collegeDiscount, row.isTotal),
  },
  {
    id: 'netAmount',
    label: 'NET Amount',
    render: (row) => amountCell(row.netAmount, row.isTotal),
  },
  {
    id: 'paidAmount',
    label: 'Paid Amount',
    render: (row) => amountCell(row.paidAmount, row.isTotal),
  },
  {
    id: 'dueCollegeAmount',
    label: 'Due College Amount',
    render: (row) => amountCell(row.dueCollegeAmount, row.isTotal),
  },
  {
    id: 'rtfReceived',
    label: 'RTF Received',
    render: (row) => amountCell(row.rtfReceived, row.isTotal),
  },
  {
    id: 'dueRtfAmount',
    label: 'Due RTF Amount',
    render: (row) => amountCell(row.dueRtfAmount, row.isTotal),
  },
  {
    id: 'totalDue',
    label: 'Total Due',
    render: (row) => amountCell(row.totalDue, row.isTotal),
  },
]

export function StudentFeeTab({ student, activeTab }: StudentFeeTabProps) {
  const isActive = activeTab === 'fee'
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<AnyRow[]>([])

  useEffect(() => {
    if (!isActive) return
    let cancelled = false
    setLoading(true)
    setRows([])

    loadStudentProfileTabData('fee', student)
      .then((data) => {
        if (!cancelled) setRows(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setRows([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [student, isActive])

  const view = useMemo(() => buildStudentFeeView(rows), [rows])

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || !isActive || rows.length === 0) return
    const studentId = Number(
      student.studentDetailId ?? student.student_detail_id ?? student.studentId ?? student.id ?? 0,
    )
    void fetch('/api/internal/fee-dump', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, source: 'StudentFeeTab', rows }),
    }).catch(() => undefined)
  }, [isActive, rows, student])

  if (!isActive) return null

  return (
    <div>
      <h2 className={`${FONT_TITLE} mb-4 text-center`} style={{ color: TITLE_COLOR }}>
        Student Fee Details
      </h2>

      <TableCard withHeaderBorder={false} className="rounded-lg border-slate-200 shadow-none">
        <Table
          embedded
          rows={view.rows}
          columns={FEE_TABLE_COLUMNS}
          loading={loading}
          emptyText="No fee details found for this student."
          pageSize={0}
          density="default"
        />
      </TableCard>
    </div>
  )
}
