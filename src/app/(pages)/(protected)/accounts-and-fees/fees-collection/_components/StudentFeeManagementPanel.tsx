'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useMutation, useQuery } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { FilterCard, FILTER_CARD_SELECT_CLASS, FILTER_CARD_THEME } from '@/common/components/feedback'
import { SearchInput } from '@/common/components/search'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useSessionContext } from '@/context/SessionContext'
import { useLoginEmployeeId } from '@/hooks/useLoginEmployeeId'
import { QK } from '@/lib/query-keys'
import { toastError, toastSuccess } from '@/lib/toast'
import { rowIndexGetter } from '@/lib/utils'
import {
  buildFeeManagementSavePayloads,
  getFeeMasterCollegeFilters,
  listFeeCategoriesByCollege,
  listFeeManagementStudentsByFilters,
  listFeeParticularsByCollege,
  listPaySchedulesForFeeManagement,
  patchFeeManagementStudentDetail,
  saveFeeManagementStudentDetails,
  searchFeeManagementStudents,
} from '@/services'
import type { FeeManagementStudentRow } from '@/types/fees-collection'
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
  pickNum,
  type FilterRow,
} from '../../fee-masters/_lib/fee-master-filters'

type SearchMode = 'student' | 'all'

const FEE_MGMT_GRID_CELL = 'fee-mgmt-grid-cell'

const COL = ['fk_college_id', 'collegeId']

function studentOptionLabel(s: FeeManagementStudentRow): string {
  const name = s.firstName ?? 'Student'
  const id = s.hallticketNumber ?? s.rollNumber ?? s.studentId
  return id ? `${name} (${id})` : name
}

function contextHeader(students: FeeManagementStudentRow[]): string {
  const s = students[0]
  if (!s) return ''
  const coursePart = s.courseCode || s.groupCode ? [s.courseCode, s.groupCode].filter(Boolean).join('-') : ''
  return [s.collegeCode, s.academicYear, coursePart || s.groupCode, s.courseYearName]
    .filter(Boolean)
    .join(' | ')
}

function studentStatusClass(code?: string): string {
  const c = String(code ?? '').toUpperCase()
  if (c === 'INCOLLEGE') return 'text-emerald-700 font-semibold'
  if (c === 'DTND') return 'text-red-600 font-semibold'
  return 'text-slate-600 font-medium'
}

function feeMgmtRowMatchesSearch(row: FeeManagementStudentRow, q: string): boolean {
  const hay = [
    row.firstName,
    row.hallticketNumber,
    row.rollNumber,
    row.admissionNumber,
    row.mobile,
    row.collegeCode,
    row.academicYear,
    row.courseCode,
    row.groupCode,
    row.courseYearName,
    row.section,
    row.studentStatusDisplayName,
    row.studentStatusCode,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(q)
}

function studentCoursePath(row: FeeManagementStudentRow): string {
  const parts = [
    row.collegeCode,
    row.academicYear,
    row.courseCode || '-',
    row.groupCode,
    row.courseYearName,
    row.section,
  ].filter((p) => p != null && String(p).trim() !== '')
  return parts.join(' | ')
}

function studentNameRenderer(p: ICellRendererParams<FeeManagementStudentRow>) {
  const row = p.data
  if (!row) return null
  const roll = row.hallticketNumber ?? row.rollNumber ?? row.admissionNumber
  const name = row.firstName?.trim()
  const lateral = row.isLateral ? '(LATERAL)' : '(REG)'
  const path = studentCoursePath(row)

  return (
    <div className="fee-mgmt-student-cell-inner min-w-0 py-1 text-xs leading-snug">
      <p className="text-sm font-medium text-blue-700">
        {roll ? <span>{roll}, </span> : null}
        <span>{name || '—'}</span>{' '}
        <span className="font-semibold">{lateral}</span>
      </p>
      {path ? <p className="font-medium text-amber-800/90">{path}</p> : null}
      {row.mobile ? (
        <p className="text-slate-800">
          {row.mobile}
          {row.studentStatusCode ? (
            <>
              {' '}
              |{' '}
              <span className={studentStatusClass(row.studentStatusCode)}>
                {row.studentStatusDisplayName ?? row.studentStatusCode}
              </span>
            </>
          ) : (
            ' |'
          )}
        </p>
      ) : null}
    </div>
  )
}

function makeSelectRenderer(
  options: { value: string; label: string }[],
  field: 'payScheduleId' | 'feeCategoryId' | 'feeParticularsId',
  onPatch: (studentId: number, value: number | undefined) => void,
) {
  return (p: ICellRendererParams<FeeManagementStudentRow>) => {
    const row = p.data
    if (!row) return null
    const dto = row.feeManagmentStdDetailsDtos?.[0]
    const raw = dto?.[field]
    return (
      <Select
        className="min-w-[140px]"
        value={raw != null ? String(raw) : null}
        onChange={(v) => onPatch(row.studentId, v ? Number(v) : undefined)}
        options={options}
        placeholder={
          field === 'payScheduleId'
            ? 'Fee Schedule'
            : field === 'feeCategoryId'
              ? 'Category'
              : 'Fee Particular'
        }
      />
    )
  }
}

function makeAmountRenderer(
  onPatch: (studentId: number, value: string) => void,
) {
  return (p: ICellRendererParams<FeeManagementStudentRow>) => {
    const row = p.data
    if (!row) return null
    const dto = row.feeManagmentStdDetailsDtos?.[0]
    return (
      <Input
        type="text"
        className="h-8 max-w-[120px]"
        value={dto?.grossAmount != null ? String(dto.grossAmount) : ''}
        onChange={(e) => onPatch(row.studentId, e.target.value)}
      />
    )
  }
}

function makeCheckboxRenderer(
  onToggle: (studentId: number, checked: boolean) => void,
) {
  return (p: ICellRendererParams<FeeManagementStudentRow>) => {
    const row = p.data
    if (!row) return null
    return (
      <Checkbox
        checked={!!row.checked}
        onCheckedChange={(v) => onToggle(row.studentId, v === true)}
        aria-label="Select student"
      />
    )
  }
}

export function StudentFeeManagementPanel() {
  const { user, isLoading: sessionLoading } = useSessionContext()
  const { employeeId } = useLoginEmployeeId(user, sessionLoading)

  const orgId =
    Number(user?.organizationId ?? 0) ||
    Number(globalThis.localStorage?.getItem('organizationId') ?? 0) ||
    1

  const [mode, setMode] = useState<SearchMode>('student')
  const [studentSearchLoading, setStudentSearchLoading] = useState(false)
  const [studentRows, setStudentRows] = useState<FeeManagementStudentRow[]>([])
  const [studentId, setStudentId] = useState<string | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<FeeManagementStudentRow | null>(null)
  const [students, setStudents] = useState<FeeManagementStudentRow[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [tableSearch, setTableSearch] = useState('')

  const [collegeId, setCollegeId] = useState<string | null>(null)
  const [academicYearId, setAcademicYearId] = useState<string | null>(null)
  const [courseId, setCourseId] = useState<string | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<string | null>(null)
  const [courseYearId, setCourseYearId] = useState<string | null>(null)

  const activeCollegeId = Number(
    mode === 'student' ? (selectedStudent?.collegeId ?? 0) : (collegeId ?? 0),
  )

  const { data: filterBundle } = useQuery({
    queryKey: QK.feesCollection.feeMgmtFilters(orgId, employeeId),
    queryFn: () => getFeeMasterCollegeFilters(orgId, employeeId),
    enabled: mode === 'all' && orgId > 0,
  })

  const filtersData = filterBundle?.filtersData ?? []
  const academicData = filterBundle?.academicData ?? []

  const { data: paySchedules = [] } = useQuery({
    queryKey: ['feesCollection', 'paySchedules'],
    queryFn: listPaySchedulesForFeeManagement,
  })

  const { data: feeCategories = [] } = useQuery({
    queryKey: ['feesCollection', 'feeCategories', activeCollegeId],
    queryFn: () => listFeeCategoriesByCollege(activeCollegeId),
    enabled: activeCollegeId > 0,
  })

  const { data: feeParticulars = [] } = useQuery({
    queryKey: ['feesCollection', 'feeParticulars', activeCollegeId],
    queryFn: () => listFeeParticularsByCollege(activeCollegeId),
    enabled: activeCollegeId > 0,
  })

  const payScheduleOptions = useMemo(
    () =>
      paySchedules.map((p) => ({
        value: String(p.generalDetailId ?? ''),
        label: String(p.generalDetailDisplayName ?? p.generalDetailId ?? ''),
      })),
    [paySchedules],
  )

  const categoryOptions = useMemo(
    () =>
      feeCategories.map((c) => ({
        value: String(c.feeCategoryId ?? ''),
        label: String(c.categoryName ?? c.feeCategoryId ?? ''),
      })),
    [feeCategories],
  )

  const particularOptions = useMemo(
    () =>
      feeParticulars.map((p) => ({
        value: String(p.feeParticularsId ?? ''),
        label: String(p.particularsName ?? p.feeParticularsId ?? ''),
      })),
    [feeParticulars],
  )

  const collegeOptions = useMemo(
    () => filterColleges(filtersData).map(collegeOption),
    [filtersData],
  )

  const academicYearOptions = useMemo(
    () =>
      filterAcademicYears(academicData, collegeId ? Number(collegeId) : null, filtersData).map(
        academicYearOption,
      ),
    [academicData, collegeId, filtersData],
  )

  const courseOptions = useMemo(
    () => filterCourses(filtersData, collegeId ? Number(collegeId) : null).map(courseOption),
    [filtersData, collegeId],
  )

  const courseGroupOptions = useMemo(
    () =>
      filterCourseGroups(
        filtersData,
        collegeId ? Number(collegeId) : null,
        courseId ? Number(courseId) : null,
      ).map(courseGroupOption),
    [filtersData, collegeId, courseId],
  )

  const courseYearOptions = useMemo(
    () =>
      filterCourseYears(
        filtersData,
        collegeId ? Number(collegeId) : null,
        courseId ? Number(courseId) : null,
        courseGroupId ? Number(courseGroupId) : null,
      ).map(courseYearOption),
    [filtersData, collegeId, courseId, courseGroupId],
  )

  const onStudentSearch = useCallback(async (term: string) => {
    const q = term.trim()
    if (q.length < 5) {
      setStudentRows([])
      return
    }
    setStudentSearchLoading(true)
    try {
      const rows = await searchFeeManagementStudents(q)
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

  const loadAllStudents = useCallback(async () => {
    const cId = Number(collegeId ?? 0)
    const ayId = Number(academicYearId ?? 0)
    const cyId = Number(courseYearId ?? 0)
    const cgId = Number(courseGroupId ?? 0)
    if (!cId || !ayId || !cyId || !cgId) return
    try {
      const rows = await listFeeManagementStudentsByFilters({
        collegeId: cId,
        academicYearId: ayId,
        courseYearId: cyId,
        courseGroupId: cgId,
      })
      setStudents(rows.map((r) => ({ ...r, checked: false })))
      setSelectAll(false)
    } catch (e) {
      toastError(e, 'Failed to load students')
      setStudents([])
    }
  }, [collegeId, academicYearId, courseYearId, courseGroupId])

  useEffect(() => {
    if (mode !== 'all' || !courseYearId) return
    void loadAllStudents()
  }, [mode, courseYearId, loadAllStudents])

  useEffect(() => {
    if (mode !== 'all' || collegeOptions.length === 0 || collegeId) return
    setCollegeId(collegeOptions[0]?.value ?? null)
  }, [mode, collegeOptions, collegeId])

  useEffect(() => {
    if (mode !== 'all' || !collegeId || academicYearOptions.length === 0 || academicYearId) return
    const current = academicData.find(
      (r: FilterRow) =>
        pickNum(r, COL) === Number(collegeId) && Number(r.is_curr_ay ?? 0) === 1,
    )
    if (current) {
      const ayId = pickNum(current, ['fk_academic_year_id', 'academicYearId'])
      if (ayId) setAcademicYearId(String(ayId))
    } else if (academicYearOptions[0]) {
      setAcademicYearId(academicYearOptions[0].value)
    }
  }, [mode, collegeId, academicYearOptions, academicYearId, academicData])

  const patchRow = useCallback(
    (studentIdNum: number, patch: Parameters<typeof patchFeeManagementStudentDetail>[1]) => {
      setStudents((prev) =>
        prev.map((s) =>
          s.studentId === studentIdNum ? patchFeeManagementStudentDetail(s, patch) : s,
        ),
      )
    },
    [],
  )

  const saveMutation = useMutation({
    mutationFn: async () => {
      const rowsToSave =
        mode === 'all' ? students.filter((s) => s.checked) : students.slice(0, 1)
      const payloads = buildFeeManagementSavePayloads(rowsToSave, employeeId)
      return saveFeeManagementStudentDetails(payloads)
    },
    onSuccess: async () => {
      toastSuccess('Fee details saved successfully')
      if (mode === 'all') {
        await loadAllStudents()
      } else if (selectedStudent) {
        setStudents([selectedStudent])
      }
    },
    onError: (e) => toastError(e),
  })

  const handleSelectAllChange = useCallback((on: boolean) => {
    setSelectAll(on)
    setStudents((prev) => prev.map((s) => ({ ...s, checked: on })))
  }, [])

  const columnDefs = useMemo<ColDef<FeeManagementStudentRow>[]>(() => {
    const cols: ColDef<FeeManagementStudentRow>[] = [
      {
        colId: 'sno',
        headerName: 'SNo.',
        valueGetter: rowIndexGetter,
        width: 64,
        minWidth: 64,
        maxWidth: 64,
        flex: 0,
        cellClass: `${FEE_MGMT_GRID_CELL} fee-mgmt-compact-cell`,
        headerClass: `${FEE_MGMT_GRID_CELL} fee-mgmt-compact-cell`,
        suppressSizeToFit: true,
      },
    ]

    if (mode === 'all') {
      cols.push({
        colId: 'selectAll',
        width: 56,
        minWidth: 56,
        maxWidth: 56,
        flex: 0,
        cellClass: `${FEE_MGMT_GRID_CELL} fee-mgmt-compact-cell`,
        headerClass: `${FEE_MGMT_GRID_CELL} fee-mgmt-compact-cell`,
        suppressSizeToFit: true,
        headerComponent: () => (
          <div className="flex h-full w-full items-center justify-center gap-1">
            <Checkbox
              checked={selectAll}
              onCheckedChange={(v) => handleSelectAllChange(v === true)}
              aria-label="Select all students"
            />
            <span className="text-[11px] font-semibold leading-none">All</span>
          </div>
        ),
        cellRenderer: makeCheckboxRenderer((id, checked) => {
          setStudents((prev) =>
            prev.map((s) => (s.studentId === id ? { ...s, checked } : s)),
          )
        }),
      })
    }

    cols.push(
      {
        colId: 'studentName',
        headerName: 'Student Name',
        minWidth: 420,
        width: 420,
        flex: 2,
        wrapText: true,
        autoHeight: true,
        cellClass: `${FEE_MGMT_GRID_CELL} fee-mgmt-student-cell`,
        headerClass: FEE_MGMT_GRID_CELL,
        valueGetter: () => '',
        cellRenderer: studentNameRenderer,
      },
      {
        headerName: 'Fee Schedule',
        minWidth: 160,
        cellClass: FEE_MGMT_GRID_CELL,
        headerClass: FEE_MGMT_GRID_CELL,
        cellRenderer: makeSelectRenderer(payScheduleOptions, 'payScheduleId', (id, v) =>
          patchRow(id, { payScheduleId: v }),
        ),
      },
      {
        headerName: 'Category',
        minWidth: 160,
        cellClass: FEE_MGMT_GRID_CELL,
        headerClass: FEE_MGMT_GRID_CELL,
        cellRenderer: makeSelectRenderer(categoryOptions, 'feeCategoryId', (id, v) =>
          patchRow(id, { feeCategoryId: v }),
        ),
      },
      {
        headerName: 'Fee Particular',
        minWidth: 180,
        cellClass: FEE_MGMT_GRID_CELL,
        headerClass: FEE_MGMT_GRID_CELL,
        cellRenderer: makeSelectRenderer(particularOptions, 'feeParticularsId', (id, v) =>
          patchRow(id, { feeParticularsId: v }),
        ),
      },
      {
        headerName: 'Amount',
        minWidth: 120,
        flex: 0,
        width: 130,
        cellClass: FEE_MGMT_GRID_CELL,
        headerClass: FEE_MGMT_GRID_CELL,
        cellRenderer: makeAmountRenderer((id, v) => patchRow(id, { grossAmount: v })),
      },
    )

    return cols
  }, [
    mode,
    selectAll,
    handleSelectAllChange,
    payScheduleOptions,
    categoryOptions,
    particularOptions,
    patchRow,
  ])

  function handleModeChange(next: SearchMode) {
    setMode(next)
    setStudents([])
    setStudentId(null)
    setSelectedStudent(null)
    setStudentRows([])
    setSelectAll(false)
    setTableSearch('')
    setCollegeId(null)
    setAcademicYearId(null)
    setCourseId(null)
    setCourseGroupId(null)
    setCourseYearId(null)
  }

  function handleStudentChange(v: string | null) {
    setStudentId(v)
    if (!v) {
      setSelectedStudent(null)
      setStudents([])
      return
    }
    const row =
      studentRows.find((s) => String(s.studentId) === v) ??
      (selectedStudent && String(selectedStudent.studentId) === v ? selectedStudent : null)
    setSelectedStudent(row)
    setStudents(row ? [row] : [])
  }

  const headerLine = contextHeader(students)

  const filteredStudents = useMemo(() => {
    const q = tableSearch.trim().toLowerCase()
    if (!q) return students
    return students.filter((row) => feeMgmtRowMatchesSearch(row, q))
  }, [students, tableSearch])

  return (
    <PageContainer className="space-y-5">
      <RadioGroup
        value={mode}
        onValueChange={(v) => handleModeChange(v as SearchMode)}
        className="flex flex-wrap gap-6"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="student" id="fee-mgmt-by-student" />
          <Label htmlFor="fee-mgmt-by-student" className="font-normal cursor-pointer">
            Search By Student
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="all" id="fee-mgmt-by-all" />
          <Label htmlFor="fee-mgmt-by-all" className="font-normal cursor-pointer">
            Search By All Students
          </Label>
        </div>
      </RadioGroup>

      {mode === 'student' ? (
        <FilterCard title="Students Search" fieldMaxWidth="32rem">
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
      ) : (
        <FilterCard title="Student Fee Management">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <Select
              label="College"
              className={FILTER_CARD_SELECT_CLASS}
              value={collegeId}
              onChange={(v) => {
                setCollegeId(v)
                setAcademicYearId(null)
                setCourseId(null)
                setCourseGroupId(null)
                setCourseYearId(null)
                setStudents([])
              }}
              options={collegeOptions}
              placeholder="College"
              searchable
            />
            <Select
              label="Academic Year"
              className={FILTER_CARD_SELECT_CLASS}
              value={academicYearId}
              onChange={(v) => {
                setAcademicYearId(v)
                setCourseId(null)
                setCourseGroupId(null)
                setCourseYearId(null)
                setStudents([])
              }}
              options={academicYearOptions}
              placeholder="Academic Year"
              disabled={!collegeId}
              searchable
            />
            <Select
              label="Course"
              className={FILTER_CARD_SELECT_CLASS}
              value={courseId}
              onChange={(v) => {
                setCourseId(v)
                setCourseGroupId(null)
                setCourseYearId(null)
                setStudents([])
              }}
              options={courseOptions}
              placeholder="Course"
              disabled={!collegeId}
              searchable
            />
            <Select
              label="Course Group"
              className={FILTER_CARD_SELECT_CLASS}
              value={courseGroupId}
              onChange={(v) => {
                setCourseGroupId(v)
                setCourseYearId(null)
                setStudents([])
              }}
              options={courseGroupOptions}
              placeholder="Course Group"
              disabled={!courseId}
              searchable
            />
            <Select
              label="Course Year"
              className={FILTER_CARD_SELECT_CLASS}
              value={courseYearId}
              onChange={setCourseYearId}
              options={courseYearOptions}
              placeholder="Course Year"
              disabled={!courseGroupId}
              searchable
            />
          </div>
        </FilterCard>
      )}

      {students.length > 0 ? (
        <>
          <TableCard
            headerLeft={
              headerLine ? (
                <p
                  className="w-full text-right text-sm font-semibold"
                  style={{ color: FILTER_CARD_THEME.titleTeal }}
                >
                  {headerLine}
                </p>
              ) : undefined
            }
          >
            <div className="fee-mgmt-data-table">
              <DataTable
                columnDefs={columnDefs}
                rowData={filteredStudents}
                height="auto"
                getRowId={(p) => String(p.data?.studentId ?? '')}
                toolbar={{ search: false, columnPicker: true, exportPdf: true }}
                toolbarLeading={
                  <SearchInput
                    className="w-[220px]"
                    placeholder="Search"
                    value={tableSearch}
                    onChange={setTableSearch}
                  />
                }
              />
            </div>
          </TableCard>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </>
      ) : null}
    </PageContainer>
  )
}



