'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { FilterCard, FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSessionContext } from '@/context/SessionContext'
import { QK } from '@/lib/query-keys'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  getScholarshipCollegeFilters,
  getScholarshipTypeAndValues,
  getStudentsScholarshipDetails,
  listBatchesByCourse,
  updateStdStudentScholarship,
} from '@/services'
import type {
  AssignScholarshipStudent,
  ScholarshipTypeAndValue,
  UpdateStdStudentScholarshipPayload,
} from '@/types/scholarship'
import {
  academicYearOption,
  collegeOption,
  courseGroupOption,
  courseOption,
  courseYearOption,
  filterAcademicYears,
  filterColleges,
  filterCourseGroups,
  filterCourseYears,
  filterCourses,
  filterUniversities,
  pickNum,
  universityOption,
  type FilterRow,
} from '../_lib/scholarship-filters'

type StructureMode = 'batch' | 'academic'
type AssignTab = 'assigned' | 'unassigned'

const EMPTY_STUDENTS: AssignScholarshipStudent[] = []
const EMPTY_FILTER_ROWS: FilterRow[] = []

const COL = ['fk_college_id', 'collegeId', 'fk_collegeId']
const UNI = ['fk_university_id', 'universityId', 'Universities.universityId']
const CRS = ['fk_course_id', 'courseId']
const GRP = ['fk_course_group_id', 'courseGroupId', 'CourseGroup.courseGroupId']
const CYR = ['fk_course_year_id', 'courseYearId']
const AY = ['fk_academic_year_id', 'academicYearId']

function filterCollegesByUniversity(rows: FilterRow[], universityId: number | null) {
  if (!universityId) return filterColleges(rows)
  return filterColleges(rows).filter((r) => pickNum(r, UNI) === universityId)
}

export default function AssignScholarshipPage() {
  const queryClient = useQueryClient()
  const { user } = useSessionContext()
  const orgId = Number(user?.organizationId ?? globalThis.localStorage?.getItem('organizationId') ?? 1)
  const empId = Number(user?.employeeId ?? globalThis.localStorage?.getItem('employeeId') ?? 0)

  const [mode, setMode] = useState<StructureMode>('batch')
  const [activeTab, setActiveTab] = useState<AssignTab>('assigned')
  const [universityId, setUniversityId] = useState<number | null>(null)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [batchId, setBatchId] = useState<number | null>(null)
  const [scholarshipTypeId, setScholarshipTypeId] = useState<number | null>(null)
  const [studentRows, setStudentRows] = useState<AssignScholarshipStudent[]>([])
  const [selectAllAssigned, setSelectAllAssigned] = useState(false)
  const [selectAllUnassigned, setSelectAllUnassigned] = useState(false)

  const { data: filterData } = useQuery({
    queryKey: QK.scholarshipFilters.college(orgId, empId),
    queryFn: () => getScholarshipCollegeFilters(orgId, empId),
    enabled: orgId > 0,
  })

  const filtersData = filterData?.filtersData ?? EMPTY_FILTER_ROWS
  const academicData = filterData?.academicData ?? EMPTY_FILTER_ROWS

  const universities = useMemo(() => filterUniversities(filtersData), [filtersData])
  const colleges = useMemo(
    () => filterCollegesByUniversity(filtersData, universityId),
    [filtersData, universityId],
  )
  const courses = useMemo(
    () => (collegeId ? filterCourses(filtersData, collegeId) : []),
    [filtersData, collegeId],
  )
  const courseGroups = useMemo(
    () =>
      collegeId && courseId ? filterCourseGroups(filtersData, collegeId, courseId) : [],
    [filtersData, collegeId, courseId],
  )
  const courseYears = useMemo(
    () =>
      collegeId && courseId && courseGroupId
        ? filterCourseYears(filtersData, collegeId, courseId, courseGroupId)
        : [],
    [filtersData, collegeId, courseId, courseGroupId],
  )
  const academicYears = useMemo(
    () => (collegeId ? filterAcademicYears(academicData, collegeId, filtersData) : []),
    [academicData, collegeId, filtersData],
  )

  const { data: batchRows = [] } = useQuery({
    queryKey: QK.assignScholarship.batches(courseId ?? 0),
    queryFn: () => listBatchesByCourse(courseId!),
    enabled: mode === 'batch' && !!courseId,
  })

  const batchOptions = useMemo(
    () =>
      batchRows.map((b) => ({
        value: String(b.batchId),
        label: b.batchName || b.batchCode || String(b.batchId),
      })),
    [batchRows],
  )

  useEffect(() => {
    if (universities.length > 0 && !universityId) {
      setUniversityId(pickNum(universities[0], UNI))
    }
  }, [universities, universityId])

  useEffect(() => {
    if (colleges.length > 0 && !collegeId) {
      setCollegeId(pickNum(colleges[0], COL))
    }
  }, [colleges, collegeId])

  useEffect(() => {
    setScholarshipTypeId(null)
    setSelectAllAssigned(false)
    setSelectAllUnassigned(false)
  }, [universityId, collegeId, courseId, courseGroupId, courseYearId, academicYearId, batchId, mode])

  const baseFilterReady = !!(collegeId && courseId && courseGroupId && courseYearId)
  const periodReady = mode === 'batch' ? batchId != null : academicYearId != null
  const filterReady = baseFilterReady && periodReady

  const assignQueryParams = useMemo(
    () => ({
      collegeId: collegeId!,
      courseId: courseId!,
      courseGroupId: courseGroupId!,
      courseYearId: courseYearId!,
      batchId: mode === 'batch' ? batchId! : undefined,
      academicYearId: mode === 'academic' ? academicYearId! : undefined,
    }),
    [collegeId, courseId, courseGroupId, courseYearId, batchId, academicYearId, mode],
  )

  const { data: scholarshipTypes = [], isFetching: typesLoading } = useQuery({
    queryKey: QK.assignScholarship.types({
      collegeId: collegeId ?? undefined,
      courseId: courseId ?? undefined,
      batchId: mode === 'batch' ? (batchId ?? undefined) : undefined,
      academicYearId: mode === 'academic' ? (academicYearId ?? undefined) : undefined,
    }),
    queryFn: () =>
      getScholarshipTypeAndValues({
        collegeId: assignQueryParams.collegeId,
        courseId: assignQueryParams.courseId,
        batchId: assignQueryParams.batchId,
        academicYearId: assignQueryParams.academicYearId,
      }),
    enabled: filterReady,
  })

  const {
    data: studentsData,
    isLoading: studentsLoading,
    refetch: refetchStudents,
  } = useQuery({
    queryKey: QK.assignScholarship.students({
      collegeId: collegeId ?? undefined,
      courseId: courseId ?? undefined,
      courseGroupId: courseGroupId ?? undefined,
      courseYearId: courseYearId ?? undefined,
      batchId: mode === 'batch' ? (batchId ?? undefined) : undefined,
      academicYearId: mode === 'academic' ? (academicYearId ?? undefined) : undefined,
    }),
    queryFn: () => getStudentsScholarshipDetails(assignQueryParams),
    enabled: filterReady,
  })

  const students = studentsData ?? EMPTY_STUDENTS

  useEffect(() => {
    if (!studentsData) {
      setStudentRows([])
      return
    }
    setStudentRows(studentsData.map((s) => ({ ...s, checked: false })))
    setSelectAllAssigned(false)
    setSelectAllUnassigned(false)
  }, [studentsData])

  const assigned = useMemo(() => studentRows.filter((s) => s.isAssigned), [studentRows])
  const unassigned = useMemo(() => studentRows.filter((s) => !s.isAssigned), [studentRows])

  const typeOptions = useMemo(
    () =>
      scholarshipTypes.map((t: ScholarshipTypeAndValue) => ({
        value: String(t.scholarshipTypeId),
        label: t.scholarshipTypeCode,
      })),
    [scholarshipTypes],
  )

  const selectedTypeAmount = useMemo(() => {
    const match = scholarshipTypes.find((t) => t.scholarshipTypeId === scholarshipTypeId)
    return match?.scholarshipAmount ?? 0
  }, [scholarshipTypes, scholarshipTypeId])

  const contextLine = useMemo(() => {
    const first = students[0]
    if (first?.courseName) {
      return [first.courseName, first.courseGroupName, first.courseYearName, first.batchName]
        .filter(Boolean)
        .join(' | ')
    }
    return ''
  }, [students])

  const toggleRowChecked = useCallback((studentId: number, checked: boolean) => {
    setStudentRows((prev) =>
      prev.map((row) => (row.studentId === studentId ? { ...row, checked } : row)),
    )
  }, [])

  const toggleAllInTab = useCallback((tab: AssignTab, checked: boolean) => {
    const ids = new Set(
      (tab === 'assigned' ? assigned : unassigned).map((s) => s.studentId),
    )
    setStudentRows((prev) =>
      prev.map((row) => (ids.has(row.studentId) ? { ...row, checked } : row)),
    )
    if (tab === 'assigned') setSelectAllAssigned(checked)
    else setSelectAllUnassigned(checked)
  }, [assigned, unassigned])

  function makeCheckboxHeader(tab: AssignTab) {
    return () => (
      <div className="flex items-center gap-2">
        <Checkbox
          checked={tab === 'assigned' ? selectAllAssigned : selectAllUnassigned}
          onCheckedChange={(v) => toggleAllInTab(tab, Boolean(v))}
          aria-label="Select all"
        />
        <span className="text-[12px]">Select All</span>
      </div>
    )
  }

  function makeCheckboxCell(tab: AssignTab) {
    return (p: ICellRendererParams<AssignScholarshipStudent>) => {
      if (!p.data) return null
      return (
        <Checkbox
          checked={!!p.data.checked}
          onCheckedChange={(v) => {
            toggleRowChecked(p.data!.studentId, Boolean(v))
            if (!v) {
              if (tab === 'assigned') setSelectAllAssigned(false)
              else setSelectAllUnassigned(false)
            }
          }}
          aria-label={`Select ${p.data.firstName ?? 'student'}`}
        />
      )
    }
  }

  const columnDefs = useMemo<ColDef<AssignScholarshipStudent>[]>(
    () => [
      {
        headerName: '',
        width: 120,
        flex: 0,
        sortable: false,
        filter: false,
        resizable: false,
        headerComponent: makeCheckboxHeader(activeTab),
        cellRenderer: makeCheckboxCell(activeTab),
      },
      { field: 'firstName', headerName: 'Student', minWidth: 200, flex: 1.3 },
      { field: 'rollNumber', headerName: 'Roll No.', minWidth: 130, flex: 0.9 },
      {
        field: 'scholarshipAmount',
        headerName: 'Value',
        minWidth: 100,
        flex: 0.7,
        valueFormatter: (p) =>
          p.value != null && Number(p.value) > 0 ? Number(p.value).toLocaleString() : '—',
      },
      { field: 'assignedType', headerName: activeTab === 'assigned' ? 'Assigned Type' : 'Scholarship Type', minWidth: 120, flex: 0.8 },
    ],
    [activeTab, selectAllAssigned, selectAllUnassigned, toggleRowChecked, toggleAllInTab],
  )

  const assignMutation = useMutation({
    mutationFn: (payload: UpdateStdStudentScholarshipPayload[]) =>
      updateStdStudentScholarship(payload),
    onSuccess: async () => {
      toastSuccess('Scholarship updated successfully')
      await refetchStudents()
      await queryClient.invalidateQueries({ queryKey: QK.assignScholarship.all })
    },
    onError: (err) => toastError(err, 'Failed to update scholarship'),
  })

  function buildUpdatePayload(
    rows: AssignScholarshipStudent[],
    action: 'Assign' | 'Unassign',
    typeId: number,
  ): UpdateStdStudentScholarshipPayload[] {
    if (!collegeId) return []
    const unAssigned = action === 'Unassign'
    const assignedType = unAssigned ? 'UNASSIGNED' : 'ASSIGNED'
    return rows
      .filter((r) => r.checked)
      .map((r) => {
        const studentScholarshipId = r.studentScholarshipId ?? null
        const amount =
          action === 'Unassign'
            ? Number(r.scholarshipAmount ?? selectedTypeAmount)
            : selectedTypeAmount
        return {
          studentScholarshipId,
          collegeId,
          studentDetailId: r.studentId,
          scholarshipTypesId: typeId,
          amount,
          isStdFeeUpdated: studentScholarshipId != null,
          feeParticularId: null,
          unAssigned,
          isActive: true,
          assignedType,
        }
      })
  }

  function handleAssignAction(action: 'Assign' | 'Unassign') {
    const source = action === 'Assign' ? unassigned : assigned
    const checked = source.filter((r) => r.checked)
    if (checked.length === 0) {
      toastError(new Error('Select at least one student'))
      return
    }
    const typeId =
      action === 'Assign'
        ? scholarshipTypeId
        : scholarshipTypeId ?? checked.find((r) => r.scholarshipTypeId)?.scholarshipTypeId ?? null
    if (!typeId) {
      toastError(new Error('Select scholarship type'))
      return
    }
    assignMutation.mutate(buildUpdatePayload(checked, action, typeId))
  }

  function handleModeChange(next: StructureMode) {
    setMode(next)
    setBatchId(null)
    setAcademicYearId(null)
    setStudentRows([])
  }

  function resetFromUniversity() {
    setCollegeId(null)
    setCourseId(null)
    setCourseGroupId(null)
    setCourseYearId(null)
    setBatchId(null)
    setAcademicYearId(null)
  }

  function resetFromCollege() {
    setCourseId(null)
    setCourseGroupId(null)
    setCourseYearId(null)
    setBatchId(null)
    setAcademicYearId(null)
  }

  function onBatchSelect(value: string | null) {
    setBatchId(value ? Number(value) : null)
  }

  function onScholarshipTypeChange(value: string | null) {
    setScholarshipTypeId(value ? Number(value) : null)
  }

  const isLoading = studentsLoading || typesLoading
  const showStudentSection = students.length > 0

  return (
    <PageContainer className="space-y-5">
      <div className="space-y-1">
        <Label className="text-[13px] font-medium text-[#334155]">Scholarship structure mode</Label>
        <RadioGroup
          value={mode}
          onValueChange={(v) => handleModeChange(v as StructureMode)}
          className="mt-2 flex flex-wrap gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="batch" id="assign-mode-batch" />
            <Label htmlFor="assign-mode-batch" className="text-[13px] font-normal">
              Batch-Wise ScholarShip Structure
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="academic" id="assign-mode-academic" />
            <Label htmlFor="assign-mode-academic" className="text-[13px] font-normal">
              Academic-Wise ScholarShip Structure
            </Label>
          </div>
        </RadioGroup>
      </div>

      <FilterCard title="Assign Scholarship Filter">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            className={FILTER_CARD_SELECT_CLASS}
            label="University"
            value={universityId ? String(universityId) : null}
            onChange={(v) => {
              setUniversityId(v ? Number(v) : null)
              resetFromUniversity()
            }}
            options={universities.map(universityOption)}
            searchable
          />
          <Select
            className={FILTER_CARD_SELECT_CLASS}
            label="College"
            value={collegeId ? String(collegeId) : null}
            onChange={(v) => {
              setCollegeId(v ? Number(v) : null)
              resetFromCollege()
            }}
            options={colleges.map(collegeOption)}
            searchable
            disabled={!universityId}
          />
          <Select
            className={FILTER_CARD_SELECT_CLASS}
            label="Course"
            value={courseId ? String(courseId) : null}
            onChange={(v) => {
              setCourseId(v ? Number(v) : null)
              setCourseGroupId(null)
              setCourseYearId(null)
              setBatchId(null)
            }}
            options={courses.map(courseOption)}
            searchable
            disabled={!collegeId}
          />
          <Select
            className={FILTER_CARD_SELECT_CLASS}
            label="Course Group"
            value={courseGroupId ? String(courseGroupId) : null}
            onChange={(v) => {
              setCourseGroupId(v ? Number(v) : null)
              setCourseYearId(null)
            }}
            options={courseGroups.map(courseGroupOption)}
            searchable
            placeholder="Select group"
            disabled={!courseId}
          />
          <Select
            className={FILTER_CARD_SELECT_CLASS}
            label="Course Year"
            value={courseYearId ? String(courseYearId) : null}
            onChange={(v) => setCourseYearId(v ? Number(v) : null)}
            options={courseYears.map(courseYearOption)}
            searchable
            placeholder="Select year"
            disabled={!courseGroupId}
          />
          {mode === 'batch' ? (
            <Select
              className={FILTER_CARD_SELECT_CLASS}
              label="Batch"
              value={batchId ? String(batchId) : null}
              onChange={onBatchSelect}
              options={batchOptions}
              searchable
              placeholder="Select batch"
              disabled={!courseId}
            />
          ) : (
            <Select
              className={FILTER_CARD_SELECT_CLASS}
              label="Academic Year"
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
              options={academicYears.map(academicYearOption)}
              searchable
              placeholder="Select academic year"
              disabled={!collegeId}
            />
          )}
        </div>
      </FilterCard>

      {showStudentSection ? (
        <div className="space-y-3">
          {contextLine ? (
            <p className="text-[13px] font-medium text-[#2563eb]">{contextLine}</p>
          ) : null}

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as AssignTab)}
          >
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <TabsList className="h-auto w-auto justify-start rounded-none border-b border-slate-200 bg-transparent p-0">
                <TabsTrigger
                  value="assigned"
                  className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-[#c9a227] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Assigned Students ({assigned.length})
                </TabsTrigger>
                <TabsTrigger
                  value="unassigned"
                  className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-[#c9a227] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Unassigned Students ({unassigned.length})
                </TabsTrigger>
              </TabsList>

              {activeTab === 'unassigned' ? (
                <Select
                  className={`${FILTER_CARD_SELECT_CLASS} w-full sm:max-w-xs`}
                  label="Scholarship Type"
                  required
                  value={scholarshipTypeId ? String(scholarshipTypeId) : null}
                  onChange={onScholarshipTypeChange}
                  options={typeOptions}
                  placeholder="Select scholarship type"
                  searchable
                />
              ) : null}
            </div>

            <TabsContent value="assigned" className="mt-0">
              <TableCard withHeaderBorder={false}>
                <DataTable
                  rowData={assigned}
                  columnDefs={columnDefs}
                  loading={isLoading}
                  pagination
                  getRowId={(p) => String(p.data.studentId)}
                  toolbar={{
                    search: true,
                    searchPlaceholder: 'Search',
                    pdfDocumentTitle: 'Assigned Students',
                  }}
                />
                <div className="flex justify-end border-t border-slate-200 p-3">
                  <Button
                    type="button"
                    onClick={() => handleAssignAction('Unassign')}
                    disabled={assignMutation.isPending}
                  >
                    Unassign
                  </Button>
                </div>
              </TableCard>
            </TabsContent>

            <TabsContent value="unassigned" className="mt-0">
              <TableCard withHeaderBorder={false}>
                <DataTable
                  rowData={unassigned}
                  columnDefs={columnDefs}
                  loading={isLoading}
                  pagination
                  getRowId={(p) => String(p.data.studentId)}
                  toolbar={{
                    search: true,
                    searchPlaceholder: 'Search',
                    pdfDocumentTitle: 'Unassigned Students',
                  }}
                />
                <div className="flex justify-end border-t border-slate-200 p-3">
                  <Button
                    type="button"
                    onClick={() => handleAssignAction('Assign')}
                    disabled={assignMutation.isPending || !scholarshipTypeId}
                  >
                    Assign
                  </Button>
                </div>
              </TableCard>
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </PageContainer>
  )
}
