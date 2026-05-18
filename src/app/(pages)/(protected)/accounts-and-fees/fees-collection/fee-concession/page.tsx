'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Monitor } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { FilterCard, FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import { useLoginEmployeeId } from '@/hooks/useLoginEmployeeId'
import { useSessionContext } from '@/context/SessionContext'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { toastError } from '@/lib/toast'
import {
  listAcademicYearsByUniversity,
  listCollegesActive,
  listFeeConcessions,
  listStudentFeeStructuresByStudent,
  searchStudentsForFeeCollection,
} from '@/services'
import type { FeeConcessionRow, StudentFeeSearchRow, StudentFeeStructureRow } from '@/types/fees-collection'
import { FeeStudentProfileCard } from '../_components/FeeStudentProfileCard'
import { FeeStructureDetailsDialog } from '../_components/FeeStructureDetailsDialog'
import { InstitutionalScholarshipModal } from '../_components/InstitutionalScholarshipModal'

type ConcessionMode = 'list' | 'scholarship'

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

function FeeConcessionContent() {
  const searchParams = useSearchParams()
  const { user, isLoading: sessionLoading } = useSessionContext()
  const { employeeId } = useLoginEmployeeId(user, sessionLoading)

  const [mode, setMode] = useState<ConcessionMode>(
    searchParams.get('studentId') ? 'scholarship' : 'list',
  )
  const [collegeId, setCollegeId] = useState<string | null>(null)
  const [academicYearId, setAcademicYearId] = useState<string | null>(null)
  const [universityId, setUniversityId] = useState(0)

  const [studentSearchLoading, setStudentSearchLoading] = useState(false)
  const [studentRows, setStudentRows] = useState<StudentFeeSearchRow[]>([])
  const [studentId, setStudentId] = useState<string | null>(searchParams.get('studentId'))
  const [selectedStudent, setSelectedStudent] = useState<StudentFeeSearchRow | null>(null)
  const [detailsRow, setDetailsRow] = useState<StudentFeeStructureRow | null>(null)
  const [scholarshipRow, setScholarshipRow] = useState<StudentFeeStructureRow | null>(null)

  const studentNum = Number(studentId ?? 0)

  const { data: colleges = [] } = useQuery({
    queryKey: ['feesCollection', 'colleges'],
    queryFn: listCollegesActive,
  })

  const { data: academicYears = [] } = useQuery({
    queryKey: ['feesCollection', 'academicYears', universityId],
    queryFn: () => listAcademicYearsByUniversity(universityId),
    enabled: universityId > 0,
  })

  const listFilters = {
    collegeId: Number(collegeId ?? 0),
    academicYearId: Number(academicYearId ?? 0),
    employeeId: employeeId ?? 0,
  }

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: QK.feesCollection.feeConcessions(listFilters),
    queryFn: () => listFeeConcessions(listFilters),
    enabled: mode === 'list' && listFilters.collegeId > 0 && listFilters.academicYearId > 0,
  })

  const { data: feeRowsRaw = [], isLoading: feeLoading } = useQuery({
    queryKey: QK.feesCollection.studentStructures(studentNum),
    queryFn: () => listStudentFeeStructuresByStudent(studentNum),
    enabled: mode === 'scholarship' && studentNum > 0,
  })

  const feeRows = useMemo(
    () =>
      [...feeRowsRaw].sort((a, b) =>
        String(a.courseYearName ?? '').localeCompare(String(b.courseYearName ?? '')),
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
    if (studentId && selectedStudent && !base.some((o) => o.value === studentId)) {
      return [{ value: studentId, label: studentOptionLabel(selectedStudent) }, ...base]
    }
    return base
  }, [studentRows, studentId, selectedStudent])

  useEffect(() => {
    const roll = searchParams.get('rollNumber')
    const sid = searchParams.get('studentId')
    if (!roll && !sid) return
    if (sid) setMode('scholarship')
    const q = roll?.trim() ?? ''
    if (q.length < 5 && !sid) return

    void (async () => {
      setStudentSearchLoading(true)
      try {
        const rows = q.length >= 5 ? await searchStudentsForFeeCollection(q) : []
        setStudentRows(rows)
        const pick = sid ? rows.find((r) => String(r.studentId) === sid) ?? null : rows[0] ?? null
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

  function handleModeChange(next: ConcessionMode) {
    setMode(next)
    setCollegeId(null)
    setAcademicYearId(null)
    setUniversityId(0)
    setStudentId(null)
    setSelectedStudent(null)
    setStudentRows([])
    setDetailsRow(null)
  }

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

  const listColumnDefs = useMemo<ColDef<FeeConcessionRow>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      { field: 'studentRollNo', headerName: 'Roll No', minWidth: 110 },
      { field: 'studentFirstName', headerName: 'Student', minWidth: 160 },
      { field: 'quotaName', headerName: 'Quota', minWidth: 100 },
      { field: 'course', headerName: 'Course', minWidth: 140 },
      { field: 'requestedEmployeeFirstName', headerName: 'Requested By', minWidth: 130 },
      { field: 'categoryName', headerName: 'Category', minWidth: 120 },
      { field: 'value', headerName: 'Value', minWidth: 90 },
    ],
    [],
  )

  const scholarshipColumnDefs = useMemo<ColDef<StudentFeeStructureRow>[]>(
    () => [
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
      { field: 'balanceAmount', headerName: 'Balance Due', minWidth: 110 },
      {
        headerName: 'Fee Details',
        minWidth: 100,
        flex: 0,
        width: 100,
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
        headerName: 'Institutional Scholarship',
        minWidth: 175,
        flex: 0,
        width: 175,
        wrapHeaderText: true,
        autoHeaderHeight: true,
        cellRenderer: (p: ICellRendererParams<StudentFeeStructureRow>) => (
          <button
            type="button"
            className="text-blue-600 underline text-xs font-medium whitespace-nowrap"
            onClick={() => {
              if (!p.data || !selectedStudent) return
              setScholarshipRow(p.data)
            }}
          >
            Institutional Scholarship
          </button>
        ),
      },
    ],
    [selectedStudent],
  )

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId ?? ''),
        label: String(c.collegeCode ?? c.collegeId ?? ''),
      })),
    [colleges],
  )

  const academicYearOptions = useMemo(
    () =>
      academicYears.map((ay) => ({
        value: String(ay.academicYearId ?? ''),
        label: String(ay.academicYear ?? ay.academicYearId ?? ''),
      })),
    [academicYears],
  )

  return (
    <PageContainer className="space-y-5">
      <FilterCard
        title={
          <span className="inline-flex items-center gap-2">
            <Monitor className="h-4 w-4 text-slate-500" />
            Institutional Scholarship
          </span>
        }
      >
        <RadioGroup
          value={mode}
          onValueChange={(v) => handleModeChange((v as ConcessionMode) || 'list')}
          className="flex flex-wrap gap-6 mb-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="list" id="concession-mode-list" />
            <Label htmlFor="concession-mode-list" className="font-normal text-slate-600">
              Institutional Scholarship List
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="scholarship" id="concession-mode-scholarship" />
            <Label htmlFor="concession-mode-scholarship" className="font-normal text-slate-600">
              Institutional Scholarship
            </Label>
          </div>
        </RadioGroup>

        {mode === 'list' ? (
          <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
            <Select
              label="College"
              className={FILTER_CARD_SELECT_CLASS}
              value={collegeId}
              onChange={(v) => {
                setCollegeId(v)
                setAcademicYearId(null)
                const college = colleges.find((c) => String(c.collegeId) === v)
                setUniversityId(Number(college?.universityId ?? 0))
              }}
              options={collegeOptions}
              placeholder="Select college"
              searchable
            />
            <Select
              label="Academic Year"
              className={FILTER_CARD_SELECT_CLASS}
              value={academicYearId}
              onChange={setAcademicYearId}
              options={academicYearOptions}
              placeholder="Select academic year"
              disabled={!collegeId}
              searchable
            />
          </div>
        ) : (
          <div className="max-w-xl">
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
          </div>
        )}

        {mode === 'list' && listData && listFilters.academicYearId > 0 ? (
          <p className="text-sm text-slate-600 mt-3">
            Total Institutional Scholarship: <strong>{listData.totalValue}</strong> (
            {listData.totalCount} records)
          </p>
        ) : null}
      </FilterCard>

      {mode === 'list' && listFilters.academicYearId > 0 ? (
        <TableCard>
          <DataTable
            columnDefs={listColumnDefs}
            rowData={listData?.rows ?? []}
            loading={listLoading}
            height="auto"
          />
        </TableCard>
      ) : null}

      {mode === 'scholarship' && selectedStudent && studentNum > 0 ? (
        <>
          <FeeStudentProfileCard student={selectedStudent} />

          {feeRows.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-800">Student Fee Data</h2>
              <TableCard>
                <DataTable
                  columnDefs={scholarshipColumnDefs}
                  rowData={feeRows}
                  loading={feeLoading}
                  height="auto"
                />
              </TableCard>
            </div>
          ) : !feeLoading ? (
            <p className="text-sm text-slate-500">No fee structures found for this student.</p>
          ) : null}
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

      {selectedStudent && scholarshipRow ? (
        <InstitutionalScholarshipModal
          open={!!scholarshipRow}
          onClose={() => setScholarshipRow(null)}
          student={selectedStudent}
          structureRow={scholarshipRow}
          onSaved={() => setScholarshipRow(null)}
        />
      ) : null}
    </PageContainer>
  )
}

export default function FeeConcessionPage() {
  return (
    <Suspense fallback={null}>
      <FeeConcessionContent />
    </Suspense>
  )
}
