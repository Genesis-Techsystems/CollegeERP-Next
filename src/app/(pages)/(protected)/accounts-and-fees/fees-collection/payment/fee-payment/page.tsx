'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Monitor } from 'lucide-react'
import { DataTable, TableCard } from '@/common/components/table'
import { FilterCard, FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { toastError } from '@/lib/toast'
import {
  listStudentFeeStructuresByStudent,
  searchStudentsForFeeCollection,
} from '@/services'
import type { StudentFeeSearchRow, StudentFeeStructureRow } from '@/types/fees-collection'
import { FeeStudentProfileCard } from '../../_components/FeeStudentProfileCard'
import { FeeStructureDetailsDialog } from '../../_components/FeeStructureDetailsDialog'
import { buildPayFeesSearchParams } from '../../_lib/pay-fees-params'

function studentOptionLabel(s: StudentFeeSearchRow): string {
  const name = s.firstName ?? 'Student'
  const id = s.hallticketNumber ?? s.rollNumber ?? s.studentId
  return id ? `${name} (${id})` : name
}

function courseYearCellRenderer(p: ICellRendererParams<StudentFeeStructureRow>) {
  const row = p.data
  if (!row) return null
  const yearNo = row.courseYearNo ?? row.courseYearName
  return (
    <span>
      <span className="font-medium">{yearNo} year</span>
      {row.academicYear ? (
        <span className="text-blue-600 font-medium"> ({row.academicYear})</span>
      ) : null}
    </span>
  )
}

export function FeePaymentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const appliedQueryKey = useRef<string | null>(null)

  const [studentSearchLoading, setStudentSearchLoading] = useState(false)
  const [studentRows, setStudentRows] = useState<StudentFeeSearchRow[]>([])
  const [studentId, setStudentId] = useState<string | null>(searchParams.get('studentId'))
  const [selectedStudent, setSelectedStudent] = useState<StudentFeeSearchRow | null>(null)
  const [detailsRow, setDetailsRow] = useState<StudentFeeStructureRow | null>(null)

  const studentNum = Number(studentId ?? 0)

  const { data: feeRowsRaw = [], isLoading: feeLoading } = useQuery({
    queryKey: QK.feesCollection.studentStructures(studentNum),
    queryFn: () => listStudentFeeStructuresByStudent(studentNum),
    enabled: studentNum > 0,
  })

  const feeRows = useMemo(
    () =>
      [...feeRowsRaw].sort(
        (a, b) => Number(a.courseYearNo ?? 0) - Number(b.courseYearNo ?? 0),
      ),
    [feeRowsRaw],
  )

  const onStudentSearch = useCallback(async (term: string) => {
    const q = term.trim()
    if (q.length < 5) {
      setStudentRows([])
      return
    }
    setStudentSearchLoading(true)
    try {
      const rows = await searchStudentsForFeeCollection(q)
      setStudentRows(Array.isArray(rows) ? rows : [])
    } catch (e) {
      toastError(e, 'Student search failed')
      setStudentRows([])
    } finally {
      setStudentSearchLoading(false)
    }
  }, [])

  const studentOptions = useMemo(() => {
    const base = studentRows.map((s) => ({
      value: String(s.studentId),
      label: studentOptionLabel(s),
    }))
    const sid = studentId
    if (sid && selectedStudent && !base.some((o) => o.value === sid)) {
      return [{ value: sid, label: studentOptionLabel(selectedStudent) }, ...base]
    }
    return base
  }, [studentRows, studentId, selectedStudent])

  useEffect(() => {
    const roll = searchParams.get('rollNumber')
    const sid = searchParams.get('studentId')
    if (!roll && !sid) return

    const key = searchParams.toString()
    if (appliedQueryKey.current === key) return
    appliedQueryKey.current = key

    void (async () => {
      const q = roll?.trim() ?? ''
      if (q.length < 5 && !sid) return

      setStudentSearchLoading(true)
      try {
        const rows = q.length >= 5 ? await searchStudentsForFeeCollection(q) : []
        setStudentRows(rows)
        const pick = sid
          ? rows.find((r) => String(r.studentId) === sid) ?? null
          : rows[0] ?? null
        if (pick) {
          setStudentId(String(pick.studentId))
          setSelectedStudent(pick)
        }
      } catch (e) {
        toastError(e, 'Student search failed')
      } finally {
        setStudentSearchLoading(false)
      }
    })()
  }, [searchParams])

  function handleStudentChange(v: string | null) {
    setStudentId(v)
    if (!v) {
      setSelectedStudent(null)
      return
    }
    const row =
      studentRows.find((s) => String(s.studentId) === v) ??
      (selectedStudent && String(selectedStudent.studentId) === v ? selectedStudent : null)
    setSelectedStudent(row)
  }

  function handlePay(row: StudentFeeStructureRow) {
    if (!selectedStudent || !row.studentId) return
    const params = buildPayFeesSearchParams(selectedStudent, row, 'fee-payment')
    router.push(`/accounts-and-fees/fees-collection/payment/pay-fees?${params}`)
  }

  function handleBack() {
    setStudentId(null)
    setSelectedStudent(null)
    setStudentRows([])
  }

  const columnDefs = useMemo<ColDef<StudentFeeStructureRow>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      { headerName: 'Course Year', minWidth: 160, cellRenderer: courseYearCellRenderer },
      { field: 'grossAmount', headerName: 'Gross Amt', minWidth: 100 },
      { field: 'discountAmount', headerName: 'Discount Amt', minWidth: 110 },
      {
        field: 'fineAmount',
        headerName: 'LateFee',
        minWidth: 90,
        valueGetter: (p) => p.data?.fineAmount ?? 0,
      },
      { field: 'netAmount', headerName: 'Net Amt', minWidth: 90 },
      { field: 'paidAmount', headerName: 'Paid Amt', minWidth: 90 },
      {
        field: 'balanceAmount',
        headerName: 'Balance Due',
        minWidth: 110,
        cellClass: 'font-medium',
      },
      {
        headerName: 'Fee Details',
        minWidth: 110,
        flex: 0,
        width: 110,
        cellRenderer: (p: ICellRendererParams<StudentFeeStructureRow>) => (
          <Button
            type="button"
            size="sm"
            className="h-8 bg-[#00b8ff] hover:bg-[#00a0e0] text-white"
            onClick={() => p.data && setDetailsRow(p.data)}
          >
            View
          </Button>
        ),
      },
      {
        headerName: 'Payment',
        minWidth: 110,
        flex: 0,
        width: 110,
        cellRenderer: (p: ICellRendererParams<StudentFeeStructureRow>) => (
          <Button
            type="button"
            size="sm"
            className="h-8 bg-[#ffcf46] hover:bg-[#e6ba3f] text-slate-900"
            onClick={() => p.data && handlePay(p.data)}
          >
            Payment
          </Button>
        ),
      },
    ],
    [selectedStudent],
  )

  return (
    <PageContainer className="space-y-5">
      <FilterCard
        title={
          <span className="inline-flex items-center gap-2">
            <Monitor className="h-4 w-4 text-slate-500" />
            Fee Payment
          </span>
        }
        fieldMaxWidth="32rem"
      >
        <Select
          className={FILTER_CARD_SELECT_CLASS}
          label="Student"
          required
          value={studentId}
          onChange={handleStudentChange}
          options={studentOptions}
          placeholder="Search by student name or roll no."
          searchable
          onSearch={(t) => void onStudentSearch(t)}
          isLoading={studentSearchLoading}
          clearable
        />
      </FilterCard>

      {selectedStudent && studentNum > 0 ? (
        <>
          <FeeStudentProfileCard student={selectedStudent} />

          {feeRows.length > 0 ? (
            <TableCard headerLeft={<span className="text-sm font-semibold">Student Fee Data</span>}>
              <DataTable
                columnDefs={columnDefs}
                rowData={feeRows}
                loading={feeLoading}
                height="auto"
              />
            </TableCard>
          ) : !feeLoading ? (
            <p className="text-sm text-slate-500">No fee structures found for this student.</p>
          ) : null}

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              className="bg-[#ffcf46] hover:bg-[#e6ba3f] border-amber-300 text-slate-900"
              onClick={handleBack}
            >
              Back
            </Button>
          </div>
        </>
      ) : null}

      {selectedStudent && detailsRow ? (
        <FeeStructureDetailsDialog
          open={!!detailsRow}
          onClose={() => setDetailsRow(null)}
          student={selectedStudent}
          row={detailsRow}
        />
      ) : null}
    </PageContainer>
  )
}

export default function FeePaymentPage() {
  return (
    <Suspense fallback={null}>
      <FeePaymentContent />
    </Suspense>
  )
}
