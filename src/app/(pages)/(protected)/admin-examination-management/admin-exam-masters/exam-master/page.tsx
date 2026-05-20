'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import type { ColDef, CellClickedEvent, ICellRendererParams } from 'ag-grid-community'
import { PlusIcon, ClipboardList, Download, Tag, Pencil, Filter, ChevronDown } from 'lucide-react'
import { useSessionContext } from '@/context/SessionContext'
import type { ExamMaster, CollegeWiseFilterRow } from '@/types/exam-master'
import {
  getCollegeFilters,
  fetchExamsByUniversity as fetchExamsByUniversityService,
  fetchExamsByCollege as fetchExamsByCollegeService,
} from '@/services/exam-master'
import { distinct } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { DataTable } from '@/common/components/table'
import { TableCard } from '@/common/components/table'
import ExamMasterModal from './ExamMasterModal'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer, PageHeader } from '@/components/layout'

export default function ExamMasterPage() {
  const router = useRouter()
  const { user } = useSessionContext()

  const [mode, setMode] = useState<1 | 2>(1)
  const [filtersdata, setFiltersdata] = useState<CollegeWiseFilterRow[]>([])
  const [academicData, setAcademicData] = useState<CollegeWiseFilterRow[]>([])
  const [universities, setUniversities] = useState<CollegeWiseFilterRow[]>([])
  const [selectedUniversityId, setSelectedUniversityId] = useState<number | null>(null)
  const [courses, setCourses] = useState<CollegeWiseFilterRow[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [academicYears, setAcademicYears] = useState<CollegeWiseFilterRow[]>([])
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | null>(null)
  const [colleges, setColleges] = useState<CollegeWiseFilterRow[]>([])
  const [selectedCollegeId, setSelectedCollegeId] = useState<number | null>(null)
  const [examsList, setExamsList] = useState<ExamMaster[]>([])
  const [tableVisible, setTableVisible] = useState(false)
  const [loadingFilters, setLoadingFilters] = useState(true)
  const [loadingExams, setLoadingExams] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingExam, setEditingExam] = useState<ExamMaster | null>(null)
  const [filterOpen, setFilterOpen] = useState(true)

  const fetchFilterDetails = useCallback(async () => {
    setLoadingFilters(true)
    try {
      const orgIdFromStorage = Number(globalThis.localStorage?.getItem('organizationId') ?? 0)
      const empIdFromStorage = Number(globalThis.localStorage?.getItem('employeeId') ?? 0)
      const orgIdFromSession = Number(user?.organizationId ?? 0)
      const empIdFromSession = Number(user?.employeeId ?? 0)

      const orgId = orgIdFromStorage || orgIdFromSession || 1
      const empId = empIdFromStorage || empIdFromSession || 31754
      const { filtersData: filters, academicData: academic } = await getCollegeFilters(orgId, empId)

      setFiltersdata(filters)
      setAcademicData(academic)

      const unis = distinct(filters, (r) => r.fk_university_id)
      setUniversities(unis)

      if (unis.length > 0) {
        const firstUniId = unis[0].fk_university_id
        setSelectedUniversityId(firstUniId)
        handleUniversityChange(firstUniId, filters, academic)
      }
    } finally {
      setLoadingFilters(false)
    }
  }, [user?.organizationId, user?.employeeId])

  useEffect(() => {
    fetchFilterDetails()
  }, [fetchFilterDetails])

  function handleUniversityChange(
    universityId: number,
    filtersRef = filtersdata,
    academicRef = academicData,
    modeOverride?: 1 | 2
  ) {
    setSelectedUniversityId(universityId)
    setSelectedCourseId(null)
    setSelectedAcademicYearId(null)
    setSelectedCollegeId(null)
    setCourses([])
    setAcademicYears([])
    setColleges([])
    setExamsList([])
    setTableVisible(false)

    const filtered = filtersRef.filter((r) => r.fk_university_id === universityId)
    const distinctCourses = distinct(filtered, (r) => r.fk_course_id)
    setCourses(distinctCourses)

    if (distinctCourses.length > 0) {
      const firstCourseId = distinctCourses[0].fk_course_id
      setSelectedCourseId(firstCourseId)
      handleCourseChange(firstCourseId, universityId, academicRef, filtersRef, modeOverride)
    }
  }

  function handleCourseChange(
    courseId: number,
    universityId = selectedUniversityId!,
    academicRef = academicData,
    filtersRef = filtersdata,
    modeOverride?: 1 | 2
  ) {
    setSelectedCourseId(courseId)
    setSelectedAcademicYearId(null)
    setSelectedCollegeId(null)
    setAcademicYears([])
    setColleges([])
    setExamsList([])
    setTableVisible(false)

    const filtered = academicRef.filter((r) => r.fk_university_id === universityId)
    const distinctAY = distinct(filtered, (r) => r.fk_academic_year_id ?? 0)

    const sorted = [...distinctAY].sort((a, b) => (b.is_curr_ay ?? 0) - (a.is_curr_ay ?? 0))
    const currentAY = sorted[0]

    const displayList = [...distinctAY].sort((a, b) => {
      const aYear = parseInt(a.academic_year ?? '0', 10)
      const bYear = parseInt(b.academic_year ?? '0', 10)
      return bYear - aYear
    })
    setAcademicYears(displayList)

    if (currentAY?.fk_academic_year_id) {
      const ayId = currentAY.fk_academic_year_id
      setSelectedAcademicYearId(ayId)
      handleAcademicYearChange(ayId, universityId, courseId, filtersRef, modeOverride)
    }
  }

  function handleAcademicYearChange(
    academicYearId: number,
    universityId = selectedUniversityId!,
    courseId = selectedCourseId!,
    filtersRef = filtersdata,
    modeOverride?: 1 | 2
  ) {
    setSelectedAcademicYearId(academicYearId)
    setColleges([])
    setExamsList([])
    setTableVisible(false)

    const effectiveMode = modeOverride ?? mode
    if (effectiveMode === 1) {
      // For university mode, table loads only when "Get List" is clicked.
    } else {
      const filtered = filtersRef.filter(
        (r) => r.fk_university_id === universityId && r.fk_course_id === courseId
      )
      const distinctColleges = distinct(filtered, (r) => r.fk_college_id ?? 0)
      setColleges(distinctColleges)
    }
  }

  async function fetchExamsByUniversity(
    uniId = selectedUniversityId!,
    courseId = selectedCourseId!,
    ayId = selectedAcademicYearId!
  ) {
    setLoadingExams(true)
    try {
      const results = await fetchExamsByUniversityService(uniId, courseId, ayId)
      setExamsList(results)
    } finally {
      setLoadingExams(false)
    }
  }

  async function fetchExamsByCollege(
    colId = selectedCollegeId!,
    courseId = selectedCourseId!,
    ayId = selectedAcademicYearId!
  ) {
    setLoadingExams(true)
    try {
      const results = await fetchExamsByCollegeService(colId, courseId, ayId)
      setExamsList(results)
    } finally {
      setLoadingExams(false)
    }
  }

  function handleCollegeChange(collegeId: number) {
    setSelectedCollegeId(collegeId)
    setExamsList([])
    setTableVisible(false)
  }

  async function handleGetList() {
    if (!selectedUniversityId || !selectedCourseId || !selectedAcademicYearId) return
    if (mode === 2 && !selectedCollegeId) return

    setTableVisible(true)
    if (mode === 1) {
      await fetchExamsByUniversity(selectedUniversityId, selectedCourseId, selectedAcademicYearId)
    } else {
      await fetchExamsByCollege(selectedCollegeId!, selectedCourseId, selectedAcademicYearId)
    }
  }

  function handleModeChange(newMode: 1 | 2) {
    setMode(newMode)
    setSelectedCourseId(null)
    setSelectedAcademicYearId(null)
    setSelectedCollegeId(null)
    setCourses([])
    setAcademicYears([])
    setColleges([])
    setExamsList([])
    setTableVisible(false)

    if (selectedUniversityId) {
      setTimeout(() => {
        handleUniversityChange(selectedUniversityId!, filtersdata, academicData, newMode)
      }, 0)
    }
  }

  const columnDefs = useMemo<ColDef<ExamMaster>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 56, minWidth: 56, flex: 0 },
      { field: 'examName', headerName: 'Exam Name', minWidth: 120 },
      { field: 'examShortName', headerName: 'Short Name', minWidth: 96 },
      {
        headerName: 'Exam Type',
        minWidth: 120,
        valueGetter: (p) => {
          const types: string[] = []
          if (p.data?.isRegularExam) types.push('Regular')
          if (p.data?.isSupplyExam) types.push('Supple')
          if (p.data?.isInternalExam) types.push('Internal')
          return types.join(' / ') || '—'
        },
      },
      {
        field: 'examMonthYr',
        headerName: 'Month/Year',
        minWidth: 92,
        valueFormatter: (p) => (p.value ? format(new Date(p.value), 'MM/yyyy') : '—'),
      },
      {
        field: 'fromDate',
        headerName: 'From Date',
        minWidth: 90,
        valueFormatter: (p) => (p.value ? format(new Date(p.value), 'dd/MM/yyyy') : '—'),
      },
      {
        field: 'toDate',
        headerName: 'To Date',
        minWidth: 90,
        valueFormatter: (p) => (p.value ? format(new Date(p.value), 'dd/MM/yyyy') : '—'),
      },
      {
        headerName: 'Fee Notification',
        minWidth: 92,
        cellRenderer: (p: ICellRendererParams<ExamMaster>) =>
          p.data?.feeNotificationFilePath ? (
            <a
              href={p.data.feeNotificationFilePath}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label="Download fee notification"
              className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-border bg-muted/40 text-slate-700 hover:bg-slate-100"
            >
              <Download className="h-4 w-4" />
            </a>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        headerName: 'Notification',
        minWidth: 92,
        cellRenderer: (p: ICellRendererParams<ExamMaster>) =>
          p.data?.notificationFilePath ? (
            <a
              href={p.data.notificationFilePath}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label="Download notification"
              className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-border bg-muted/40 text-slate-700 hover:bg-slate-100"
            >
              <Download className="h-4 w-4" />
            </a>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        headerName: 'Exam Labels',
        minWidth: 92,
        cellRenderer: (p: ICellRendererParams<ExamMaster>) => (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (p.data) sessionStorage.setItem('examMasterDetails', JSON.stringify(p.data))
              router.push(
                `/admin-examination-management/admin-exam-masters/exam-master/exam-master-details?examId=${p.data?.examId}`
              )
            }}
            aria-label="Create label"
            className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-border bg-muted/40 text-slate-700 hover:bg-slate-100"
          >
            <Tag className="h-4 w-4" />
          </button>
        ),
      },
      {
        field: 'isActive',
        headerName: 'Status',
        width: 76,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<ExamMaster>) => (
          <StatusBadge status={p.data?.isActive ?? false} />
        ),
      },
      {
        headerName: 'Actions',
        minWidth: 80,
        flex: 0,
        width: 80,
        cellRenderer: (p: ICellRendererParams<ExamMaster>) => (
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setEditingExam(p.data ?? null)
              setModalOpen(true)
            }}
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    []
  )

  const onCellClicked = useCallback(
    (event: CellClickedEvent<ExamMaster>) => {
      if (event.colDef.headerName === 'Exam Labels') {
        if (event.data) sessionStorage.setItem('examMasterDetails', JSON.stringify(event.data))
        router.push(
          `/admin-examination-management/admin-exam-masters/exam-master/exam-master-details?examId=${event.data?.examId}`
        )
      }
      if (event.colDef.headerName === 'Actions') {
        setEditingExam(event.data ?? null)
        setModalOpen(true)
      }
    },
    [router]
  )

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Exam Master" subtitle="Configure and manage examinations" />
      <div className="app-card space-y-3 overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-muted/40">
          <div className="flex items-center justify-between gap-2">
            <h2 className="app-card-title">Exam Master</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 px-2.5 text-[12px]"
              onClick={() => setFilterOpen((prev) => !prev)}
              aria-expanded={filterOpen}
            >
              <Filter className="mr-1.5 h-3.5 w-3.5" />
              Filter
              <ChevronDown className={`ml-1.5 h-3.5 w-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>
        {filterOpen && (
        <div className="px-4 py-3 space-y-2">
        <RadioGroup
          value={String(mode)}
          onValueChange={(v) => handleModeChange(Number(v) as 1 | 2)}
          className="flex gap-5"
        >
          <label className="flex items-center gap-2 cursor-pointer text-[12px]">
            <RadioGroupItem value="1" />
            <span>Is For University</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-[12px]">
            <RadioGroupItem value="2" />
            <span>Is For College</span>
          </label>
        </RadioGroup>

        <div className="flex flex-wrap items-end gap-2.5 mt-1">
          <div className="space-y-1 min-w-[200px]">
            <Label className="text-[12px]">University</Label>
            <Select
              value={selectedUniversityId != null ? String(selectedUniversityId) : undefined}
              onValueChange={(v) => handleUniversityChange(Number(v))}
              disabled={loadingFilters}
            >
              <SelectTrigger className="h-8 text-[12px]">
                <SelectValue placeholder="Select University" />
              </SelectTrigger>
              <SelectContent>
                {universities.map((u) => (
                  <SelectItem key={u.fk_university_id} value={String(u.fk_university_id)}>
                    {u.university_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 min-w-[200px]">
            <Label className="text-[12px]">Course</Label>
            <Select
              value={selectedCourseId != null ? String(selectedCourseId) : undefined}
              onValueChange={(v) => handleCourseChange(Number(v))}
              disabled={courses.length === 0}
            >
              <SelectTrigger className="h-8 text-[12px]">
                <SelectValue placeholder="Select Course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.fk_course_id} value={String(c.fk_course_id)}>
                    {c.course_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 min-w-[180px]">
            <Label className="text-[12px]">Academic Year</Label>
            <Select
              value={selectedAcademicYearId != null ? String(selectedAcademicYearId) : undefined}
              onValueChange={(v) => handleAcademicYearChange(Number(v))}
              disabled={academicYears.length === 0}
            >
              <SelectTrigger className="h-8 text-[12px]">
                <SelectValue placeholder="Select Academic Year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((ay) => (
                  <SelectItem key={ay.fk_academic_year_id} value={String(ay.fk_academic_year_id)}>
                    {ay.academic_year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === 2 && (
            <div className="space-y-1 min-w-[220px]">
              <Label className="text-[12px]">College</Label>
              <Select
                value={selectedCollegeId != null ? String(selectedCollegeId) : undefined}
                onValueChange={(v) => handleCollegeChange(Number(v))}
                disabled={colleges.length === 0}
              >
                <SelectTrigger className="h-8 text-[12px]">
                  <SelectValue placeholder="Select College" />
                </SelectTrigger>
                <SelectContent>
                  {colleges.map((c) => (
                    <SelectItem key={c.fk_college_id} value={String(c.fk_college_id)}>
                      {c.college_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button
           
           
            onClick={handleGetList}
            disabled={
              loadingFilters ||
              loadingExams ||
              !selectedUniversityId ||
              !selectedCourseId ||
              !selectedAcademicYearId ||
              (mode === 2 && !selectedCollegeId)
            } className="h-8 px-3 text-[12px]">
            Get List
          </Button>
        </div>
        </div>
        )}
      </div>

      {tableVisible && (
        <>
          <TableCard withHeaderBorder={false}>
            {!loadingExams && examsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ClipboardList className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No records found</p>
              </div>
            ) : (
              <DataTable
                rowData={examsList}
                columnDefs={columnDefs}
                loading={loadingExams}
                onCellClicked={onCellClicked}
                pagination
                toolbar={{
                  search: true,
                  searchPlaceholder: 'Search exams…',
                  pdfDocumentTitle: 'Exam Master',
                }}
                toolbarTrailing={(
                  <Button size="sm" className="h-[30px] px-3 text-[12px]" onClick={() => { setEditingExam(null); setModalOpen(true) }}>
                    <PlusIcon className="mr-1 h-3.5 w-3.5" />
                    Add Exam
                  </Button>
                )}
              />
            )}
          </TableCard>
        </>
      )}

      <ExamMasterModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingExam(null)
        }}
        exam={editingExam}
        context={{
          universityId: selectedUniversityId,
          collegeId: selectedCollegeId,
          courseId: selectedCourseId,
          academicYearId: selectedAcademicYearId,
        }}
        onSaved={() => {
          if (mode === 1) fetchExamsByUniversity()
          else if (selectedCollegeId) fetchExamsByCollege()
        }}
      />
    </PageContainer>
  )
}

