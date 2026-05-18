'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Monitor, Plus } from 'lucide-react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { FilterCard, FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  listAcademicYearsByUniversity,
  listCollegesActive,
  listCourseGroups,
  listCourseYearsForFeeCollection,
  listCoursesByUniversity,
  listFeeStructuresForStudentCourseYear,
  listStudentFeeStructuresByStudent,
  mapFeeStructureToStudents,
  searchStudentsInCollege,
} from '@/services'
import type { StudentFeeSearchRow, StudentFeeStructureRow } from '@/types/fees-collection'
import { FeeStudentProfileCard } from './FeeStudentProfileCard'
import { FeeStructureDetailsDialog } from './FeeStructureDetailsDialog'

type PendingStructureRow = {
  collegeId: number
  courseYearName: string
  academicYear: string
  feeStructureName: string
  studentId: number
  courseGroupId: number
  courseYearId: number
  academicYearId: number
  isManual: boolean
  feeStructureId: number
  yearNo: number
}

function studentOptionLabel(s: StudentFeeSearchRow): string {
  const name = s.firstName ?? 'Student'
  const id = s.hallticketNumber ?? s.rollNumber ?? s.studentId
  return id ? `${name} (${id})` : name
}

function numField(row: StudentFeeSearchRow, ...keys: string[]): number {
  const r = row as Record<string, unknown>
  for (const key of keys) {
    const v = Number(r[key] ?? 0)
    if (v > 0) return v
  }
  return 0
}

export function AllocateStructureToStudentPanel() {
  const queryClient = useQueryClient()

  const [collegeId, setCollegeId] = useState<string | null>(null)
  const [courseId, setCourseId] = useState<string | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<string | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<StudentFeeSearchRow | null>(null)
  const [universityId, setUniversityId] = useState(0)
  const [studentSearchLoading, setStudentSearchLoading] = useState(false)
  const [studentRows, setStudentRows] = useState<StudentFeeSearchRow[]>([])

  const [addCourseYearId, setAddCourseYearId] = useState<string | null>(null)
  const [addAcademicYearId, setAddAcademicYearId] = useState<string | null>(null)
  const [addFeeStructureId, setAddFeeStructureId] = useState<string | null>(null)
  const [pendingRows, setPendingRows] = useState<PendingStructureRow[]>([])
  const [detailsRow, setDetailsRow] = useState<StudentFeeStructureRow | null>(null)

  const collegeNum = Number(collegeId ?? 0)
  const courseNum = Number(courseId ?? 0)
  const courseGroupNum = Number(courseGroupId ?? 0)
  const studentNum = Number(studentId ?? 0)
  const studentCourseId = numField(selectedStudent ?? {}, 'courseId', 'fk_course_id') || courseNum
  const studentCourseGroupId =
    numField(selectedStudent ?? {}, 'courseGroupId', 'fk_course_group_id') || courseGroupNum
  const studentQuotaId = numField(selectedStudent ?? {}, 'quotaId', 'fk_quota_id', 'generalDetailId')

  const { data: colleges = [] } = useQuery({
    queryKey: ['feesCollection', 'colleges'],
    queryFn: listCollegesActive,
  })

  const { data: courses = [] } = useQuery({
    queryKey: ['feesCollection', 'courses', universityId],
    queryFn: () => listCoursesByUniversity(universityId),
    enabled: universityId > 0,
  })

  const { data: courseGroups = [] } = useQuery({
    queryKey: ['feesCollection', 'courseGroups', courseNum],
    queryFn: () => listCourseGroups(courseNum),
    enabled: courseNum > 0,
  })

  const { data: academicYears = [] } = useQuery({
    queryKey: ['feesCollection', 'academicYears', universityId],
    queryFn: () => listAcademicYearsByUniversity(universityId),
    enabled: universityId > 0,
  })

  const { data: courseYears = [] } = useQuery({
    queryKey: ['feesCollection', 'courseYears', studentCourseId],
    queryFn: () => listCourseYearsForFeeCollection(studentCourseId),
    enabled: studentCourseId > 0,
  })

  const { data: feeStructureOptions = [] } = useQuery({
    queryKey: [
      'allocateStructureFeeOptions',
      studentCourseGroupId,
      addCourseYearId,
      studentQuotaId,
      addAcademicYearId,
    ],
    queryFn: () =>
      listFeeStructuresForStudentCourseYear({
        courseGroupId: studentCourseGroupId,
        courseYearId: Number(addCourseYearId ?? 0),
        quotaId: studentQuotaId,
        academicYearId: Number(addAcademicYearId ?? 0),
      }),
    enabled:
      studentCourseGroupId > 0 &&
      studentQuotaId > 0 &&
      Number(addCourseYearId ?? 0) > 0 &&
      Number(addAcademicYearId ?? 0) > 0,
  })

  const { data: existingStructures = [], isLoading: existingLoading } = useQuery({
    queryKey: QK.feesCollection.studentStructures(studentNum),
    queryFn: () => listStudentFeeStructuresByStudent(studentNum),
    enabled: studentNum > 0,
  })

  const existingRows = useMemo(
    () =>
      [...existingStructures].sort(
        (a, b) => String(a.courseYearName ?? '').localeCompare(String(b.courseYearName ?? '')),
      ),
    [existingStructures],
  )

  useEffect(() => {
    if (!collegeId) {
      setUniversityId(0)
      return
    }
    const college = colleges.find((c) => String(c.collegeId) === collegeId)
    setUniversityId(Number(college?.universityId ?? 0))
  }, [collegeId, colleges])

  const onStudentSearch = useCallback(
    async (term: string) => {
      const q = term.trim()
      if (q.length < 5 || collegeNum <= 0) {
        setStudentRows([])
        return
      }
      setStudentSearchLoading(true)
      try {
        const rows = await searchStudentsInCollege(collegeNum, q, {
          courseId: courseNum || undefined,
          courseGroupId: courseGroupNum || undefined,
        })
        setStudentRows(Array.isArray(rows) ? rows : [])
      } catch (e) {
        toastError(e, 'Student search failed')
        setStudentRows([])
      } finally {
        setStudentSearchLoading(false)
      }
    },
    [collegeNum, courseNum, courseGroupNum],
  )

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

  function handleStudentChange(v: string | null) {
    setStudentId(v)
    setPendingRows([])
    setAddCourseYearId(null)
    setAddAcademicYearId(null)
    setAddFeeStructureId(null)
    if (!v) {
      setSelectedStudent(null)
      return
    }
    const row =
      studentRows.find((s) => String(s.studentId) === v) ??
      (selectedStudent && String(selectedStudent.studentId) === v ? selectedStudent : null)
    setSelectedStudent(row)
  }

  const saveMutation = useMutation({
    mutationFn: () => mapFeeStructureToStudents(pendingRows),
    onSuccess: () => {
      toastSuccess('Fee structure(s) allocated successfully')
      setPendingRows([])
      queryClient.invalidateQueries({ queryKey: QK.feesCollection.studentStructures(studentNum) })
    },
    onError: (e) => toastError(e),
  })

  function resetAddForm() {
    setAddCourseYearId(null)
    setAddAcademicYearId(null)
    setAddFeeStructureId(null)
  }

  function handleAddStructure() {
    if (!selectedStudent || !collegeId || !studentId) return
    if (!addCourseYearId || !addAcademicYearId || !addFeeStructureId) {
      toastError('Select course year, academic year, and fee structure')
      return
    }

    const cy = courseYears.find((c) => String(c.courseYearId ?? c.pk_course_year_id) === addCourseYearId)
    const ay = academicYears.find((a) => String(a.academicYearId ?? a.pk_academic_year_id) === addAcademicYearId)
    const fs = feeStructureOptions.find(
      (f) => String(f.feeStructureId ?? f.pk_fee_structure_id) === addFeeStructureId,
    )

    const yearNo = Number(cy?.yearNo ?? cy?.sortOrder ?? 0)
    const courseYearName = String(cy?.courseYearName ?? cy?.course_year_name ?? '')
    const academicYear = String(ay?.academicYear ?? ay?.academic_year ?? '')
    const feeStructureName = String(fs?.classGroupName ?? fs?.structureName ?? '')

    const activeSameYear = existingRows.some(
      (r) =>
        Number(r.courseYearNo ?? 0) === yearNo &&
        (r.isActive ?? r.feeStudentDataDTO?.isActive) !== false,
    )
    if (activeSameYear) {
      toastError('Fee structure already exists for this course year')
      return
    }

    const row: PendingStructureRow = {
      collegeId: collegeNum,
      courseYearName,
      academicYear,
      feeStructureName,
      studentId: studentNum,
      courseGroupId: studentCourseGroupId,
      courseYearId: Number(addCourseYearId),
      academicYearId: Number(addAcademicYearId),
      isManual: true,
      feeStructureId: Number(addFeeStructureId),
      yearNo,
    }

    setPendingRows((prev) => [...prev, row])
    resetAddForm()
  }

  const pendingColumnDefs = useMemo<ColDef<PendingStructureRow>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 },
      { field: 'courseYearName', headerName: 'Course Year', minWidth: 120 },
      { field: 'academicYear', headerName: 'Academic Year', minWidth: 120 },
      { field: 'feeStructureName', headerName: 'Fee Structure', minWidth: 160 },
      {
        headerName: 'Actions',
        minWidth: 120,
        flex: 0,
        width: 120,
        cellRenderer: (p: ICellRendererParams<PendingStructureRow>) => (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-blue-600"
              onClick={() => {
                if (!p.data || !selectedStudent) return
                setDetailsRow({
                  feeStructureId: p.data.feeStructureId,
                  academicYearId: p.data.academicYearId,
                  academicYear: p.data.academicYear,
                  structureName: p.data.feeStructureName,
                  studentId: p.data.studentId,
                } as StudentFeeStructureRow)
              }}
            >
              View
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-red-600"
              onClick={() => {
                const i = p.node?.rowIndex
                if (i == null) return
                setPendingRows((rows) => rows.filter((_, idx) => idx !== i))
              }}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [selectedStudent],
  )

  const existingColumnDefs = useMemo<ColDef<StudentFeeStructureRow>[]>(
    () => [
      {
        headerName: 'Structure',
        minWidth: 140,
        valueGetter: (p) => p.data?.structureName ?? p.data?.classGroupName,
      },
      {
        headerName: 'Course',
        minWidth: 160,
        cellRenderer: (p: ICellRendererParams<StudentFeeStructureRow>) => {
          const row = p.data
          if (!row) return null
          return (
            <span>
              {row.courseYearName}
              {row.academicYear ? (
                <span className="text-blue-600 font-medium"> ({row.academicYear})</span>
              ) : null}
            </span>
          )
        },
      },
      { field: 'courseYearNo', headerName: 'Course Year No.', minWidth: 110 },
      { field: 'grossAmount', headerName: 'Gross Amt', minWidth: 90 },
      { field: 'discountAmount', headerName: 'Discount Amt', minWidth: 100 },
      {
        field: 'fineAmount',
        headerName: 'LateFee',
        minWidth: 80,
        valueGetter: (p) => p.data?.fineAmount ?? 0,
      },
      { field: 'netAmount', headerName: 'Net Amt', minWidth: 90 },
      { field: 'paidAmount', headerName: 'Paid Amt', minWidth: 90 },
      { field: 'balanceAmount', headerName: 'Balance Due', minWidth: 100 },
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
        headerName: 'Status',
        minWidth: 100,
        cellRenderer: (p: ICellRendererParams<StudentFeeStructureRow>) => {
          const active = p.data?.isActive ?? p.data?.feeStudentDataDTO?.isActive ?? false
          return <StatusBadge status={Boolean(active)} label={active ? 'Active' : 'In Active'} />
        },
      },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-5">
      <FilterCard
        title={
          <span className="inline-flex items-center gap-2">
            <Monitor className="h-4 w-4 text-slate-500" />
            Allocate Structure To Student
          </span>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            className={FILTER_CARD_SELECT_CLASS}
            label="College"
            required
            value={collegeId}
            onChange={(v) => {
              setCollegeId(v)
              setCourseId(null)
              setCourseGroupId(null)
              setStudentId(null)
              setSelectedStudent(null)
              setStudentRows([])
              setPendingRows([])
            }}
            options={colleges.map((c) => ({
              value: String(c.collegeId ?? ''),
              label: String(c.collegeCode ?? c.collegeId ?? ''),
            }))}
            placeholder="Select college"
            searchable
          />
          <Select
            className={FILTER_CARD_SELECT_CLASS}
            label="Course"
            value={courseId}
            onChange={(v) => {
              setCourseId(v)
              setCourseGroupId(null)
              setStudentId(null)
              setSelectedStudent(null)
              setStudentRows([])
            }}
            options={[
              { value: '', label: 'Select' },
              ...courses.map((c) => ({
                value: String(c.courseId ?? c.pk_course_id ?? ''),
                label: String(c.courseCode ?? c.course_code ?? c.courseId ?? ''),
              })),
            ]}
            placeholder="Select course"
            disabled={!collegeId}
            searchable
          />
          <Select
            className={FILTER_CARD_SELECT_CLASS}
            label="Course Group"
            value={courseGroupId}
            onChange={(v) => {
              setCourseGroupId(v)
              setStudentId(null)
              setSelectedStudent(null)
              setStudentRows([])
            }}
            options={[
              { value: '', label: 'Select' },
              ...courseGroups.map((g) => ({
                value: String(g.courseGroupId ?? g.pk_course_group_id ?? ''),
                label: String(g.groupCode ?? g.group_code ?? g.courseGroupId ?? ''),
              })),
            ]}
            placeholder="Select course group"
            disabled={!courseId}
            searchable
          />
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
            disabled={!collegeId}
            clearable
          />
        </div>
      </FilterCard>

      {selectedStudent && studentNum > 0 ? (
        <>
          <FeeStudentProfileCard student={selectedStudent} />

          <div className="rounded-md border-4 border-[#c3d9ff] p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Plus className="h-4 w-4" aria-hidden />
              Add Fee Structure
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
              <Select
                className={FILTER_CARD_SELECT_CLASS}
                label="Course Year"
                required
                value={addCourseYearId}
                onChange={(v) => {
                  setAddCourseYearId(v)
                  setAddAcademicYearId(null)
                  setAddFeeStructureId(null)
                }}
                options={courseYears.map((cy) => ({
                  value: String(cy.courseYearId ?? cy.pk_course_year_id ?? ''),
                  label: String(cy.courseYearName ?? cy.course_year_name ?? ''),
                }))}
                placeholder="Select course year"
                searchable
              />
              <Select
                className={FILTER_CARD_SELECT_CLASS}
                label="Academic Year"
                required
                value={addAcademicYearId}
                onChange={(v) => {
                  setAddAcademicYearId(v)
                  setAddFeeStructureId(null)
                }}
                options={academicYears.map((ay) => ({
                  value: String(ay.academicYearId ?? ay.pk_academic_year_id ?? ''),
                  label: String(ay.academicYear ?? ay.academic_year ?? ''),
                }))}
                placeholder="Select academic year"
                searchable
              />
              <Select
                className={FILTER_CARD_SELECT_CLASS}
                label="Fee Structure"
                required
                value={addFeeStructureId}
                onChange={setAddFeeStructureId}
                options={feeStructureOptions.map((fs) => ({
                  value: String(fs.feeStructureId ?? fs.pk_fee_structure_id ?? ''),
                  label: String(fs.classGroupName ?? fs.structureName ?? fs.feeStructureId ?? ''),
                }))}
                placeholder="Select fee structure"
                disabled={!addAcademicYearId}
                searchable
              />
              <Button type="button" onClick={handleAddStructure}>
                Add
              </Button>
              <Button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={pendingRows.length === 0 || saveMutation.isPending}
              >
                {saveMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>

            {pendingRows.length > 0 ? (
              <TableCard>
                <DataTable
                  columnDefs={pendingColumnDefs}
                  rowData={pendingRows}
                  height="auto"
                />
              </TableCard>
            ) : null}
          </div>

          {existingRows.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-800">Existing Fee Structures</h2>
              <TableCard>
                <DataTable
                  columnDefs={existingColumnDefs}
                  rowData={existingRows}
                  loading={existingLoading}
                  height="auto"
                />
              </TableCard>
            </div>
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
    </PageContainer>
  )
}
