'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
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
import { buildPayFeesSearchParams } from '../_lib/pay-fees-params'
import { FeeStudentProfileCard } from './FeeStudentProfileCard'

function studentOptionLabel(s: StudentFeeSearchRow): string {
  const name = s.firstName ?? 'Student'
  const id = s.hallticketNumber ?? s.rollNumber ?? s.studentId
  return id ? `${name} (${id})` : name
}

function statusRenderer(p: ICellRendererParams<StudentFeeStructureRow>) {
  const bal = Number(p.data?.balanceAmount ?? 0)
  return (
    <span className={bal > 0 ? 'text-amber-700 font-medium' : 'text-emerald-700 font-medium'}>
      {bal > 0 ? 'Due' : 'Paid'}
    </span>
  )
}

function makePayRenderer(onPay: (row: StudentFeeStructureRow) => void) {
  return (p: ICellRendererParams<StudentFeeStructureRow>) => (
    <Button type="button" size="sm" variant="default" onClick={() => p.data && onPay(p.data)}>
      Pay Details
    </Button>
  )
}

export function StudentCategoryFeeList({ title, payPage }: { title: string; payPage: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const appliedQueryKey = useRef<string | null>(null)

  const [studentSearchLoading, setStudentSearchLoading] = useState(false)
  const [studentRows, setStudentRows] = useState<StudentFeeSearchRow[]>([])
  const [studentId, setStudentId] = useState<string | null>(searchParams.get('studentId'))
  const [selectedStudent, setSelectedStudent] = useState<StudentFeeSearchRow | null>(null)

  const studentNum = Number(studentId ?? 0)

  const { data: feeRows = [], isLoading } = useQuery({
    queryKey: QK.feesCollection.studentStructures(studentNum),
    queryFn: () => listStudentFeeStructuresByStudent(studentNum),
    enabled: studentNum > 0,
  })

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

  const columnDefs = useMemo<ColDef<StudentFeeStructureRow>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      { field: 'structureName', headerName: 'Structure', minWidth: 160 },
      {
        headerName: 'Course',
        minWidth: 180,
        valueGetter: (p) => {
          const row = p.data
          if (!row) return ''
          const year = row.courseYearName ?? ''
          const ay = row.academicYear ? ` (${row.academicYear})` : ''
          return `${year}${ay}`
        },
      },
      { headerName: 'Status', minWidth: 90, cellRenderer: statusRenderer },
      {
        headerName: 'Pay Details',
        minWidth: 120,
        flex: 0,
        width: 130,
        cellRenderer: makePayRenderer((row) => {
          if (!selectedStudent) return
          const params = buildPayFeesSearchParams(selectedStudent, row, payPage)
          router.push(`/accounts-and-fees/fees-collection/payment/pay-fees?${params}`)
        }),
      },
    ],
    [router, selectedStudent, payPage],
  )

  return (
    <PageContainer className="space-y-5">
      <FilterCard title={title} fieldMaxWidth="32rem">
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

          <TableCard headerLeft={<span className="text-sm font-medium">Student Fee Data</span>}>
            <DataTable
              columnDefs={columnDefs}
              rowData={feeRows}
              loading={isLoading}
              height="auto"
            />
          </TableCard>
        </>
      ) : null}
    </PageContainer>
  )
}
