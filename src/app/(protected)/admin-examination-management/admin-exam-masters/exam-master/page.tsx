'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import type { ColDef, CellClickedEvent, ICellRendererParams } from 'ag-grid-community'
import { PlusIcon, ClipboardList } from 'lucide-react'
import { useSessionContext } from '@/context/SessionContext'
import type { ExamMaster, CollegeWiseFilterRow } from '@/types/exam-master'
import {
  getCollegeFilters,
  fetchExamsByUniversity as fetchExamsByUniversityService,
  fetchExamsByCollege as fetchExamsByCollegeService,
} from '@/services/exam-master.service'
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
import DataTable from '@/components/data-table/DataTable'
import PageHeader from '@/components/layout/PageHeader'
import ExamMasterModal from './ExamMasterModal'

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ExamMasterPage() {
  const router = useRouter()
  const { user } = useSessionContext()

  // ── State ───────────────────────────────────────────────────────────────
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

  // ── Fetch filter details ────────────────────────────────────────────────
  const fetchFilterDetails = useCallback(async () => {
    setLoadingFilters(true)
    try {
      const orgId = user?.organizationId ?? 0
      const empId = user?.employeeId ?? 0
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

  // ── Filter cascade handlers ─────────────────────────────────────────────
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

    // Sort by is_curr_ay DESC to find current AY
    const sorted = [...distinctAY].sort((a, b) => (b.is_curr_ay ?? 0) - (a.is_curr_ay ?? 0))
    const currentAY = sorted[0]

    // Sort display list by academic_year DESC (numeric)
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
      fetchExamsByUniversity(universityId, courseId, academicYearId)
    } else {
      const filtered = filtersRef.filter(
        (r) => r.fk_university_id === universityId && r.fk_course_id === courseId
      )
      const distinctColleges = distinct(filtered, (r) => r.fk_college_id)
      setColleges(distinctColleges)
    }
  }

  // ── Fetch exams ─────────────────────────────────────────────────────────
  async function fetchExamsByUniversity(
    uniId = selectedUniversityId!,
    courseId = selectedCourseId!,
    ayId = selectedAcademicYearId!
  ) {
    setLoadingExams(true)
    setTableVisible(true)
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
    setTableVisible(true)
    try {
      const results = await fetchExamsByCollegeService(colId, courseId, ayId)
      setExamsList(results)
    } finally {
      setLoadingExams(false)
    }
  }

  function handleCollegeChange(collegeId: number) {
    setSelectedCollegeId(collegeId)
    fetchExamsByCollege(collegeId)
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
      // Pass newMode explicitly — avoids stale closure on the `mode` state variable
      setTimeout(() => {
        handleUniversityChange(selectedUniversityId!, filtersdata, academicData, newMode)
      }, 0)
    }
  }

  // ── AG Grid columns ─────────────────────────────────────────────────────
  const columnDefs = useMemo<ColDef<ExamMaster>[]>(
    () => [
      { headerName: 'SI.No', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70, flex: 0 },
      { field: 'examName', headerName: 'Exam Name', minWidth: 160 },
      { field: 'examShortName', headerName: 'Short Name', minWidth: 120 },
      {
        headerName: 'Exam Type',
        minWidth: 160,
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
        minWidth: 120,
        valueFormatter: (p) => (p.value ? format(new Date(p.value), 'MM/yyyy') : '—'),
      },
      {
        field: 'fromDate',
        headerName: 'From Date',
        minWidth: 110,
        valueFormatter: (p) => (p.value ? format(new Date(p.value), 'dd/MM/yyyy') : '—'),
      },
      {
        field: 'toDate',
        headerName: 'To Date',
        minWidth: 110,
        valueFormatter: (p) => (p.value ? format(new Date(p.value), 'dd/MM/yyyy') : '—'),
      },
      {
        headerName: 'Fee Notification',
        minWidth: 140,
        cellRenderer: (p: ICellRendererParams<ExamMaster>) =>
          p.data?.feeNotificationFilePath ? (
            <a
              href={p.data.feeNotificationFilePath}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 underline text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              Download
            </a>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        headerName: 'Notification',
        minWidth: 120,
        cellRenderer: (p: ICellRendererParams<ExamMaster>) =>
          p.data?.notificationFilePath ? (
            <a
              href={p.data.notificationFilePath}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 underline text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              Download
            </a>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        headerName: 'Exam Labels',
        minWidth: 120,
        cellRenderer: () => (
          <span className="text-indigo-600 underline cursor-pointer text-xs">Create Label</span>
        ),
      },
      {
        field: 'isActive',
        headerName: 'Status',
        minWidth: 100,
        cellRenderer: (p: ICellRendererParams<ExamMaster>) =>
          p.data?.isActive ? (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700">
              Active
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-red-50 text-red-700">
              Inactive
            </span>
          ),
      },
      {
        headerName: 'Actions',
        minWidth: 100,
        flex: 0,
        width: 100,
        cellRenderer: () => (
          <Button size="sm" variant="ghost">
            Edit
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

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Exam Master"
        subtitle="Manage examination master records"
        action={
          <Button size="sm" onClick={() => { setEditingExam(null); setModalOpen(true) }}>
            <PlusIcon />
            Add Exam
          </Button>
        }
      />

      {/* Filter panel */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <RadioGroup
          value={String(mode)}
          onValueChange={(v) => handleModeChange(Number(v) as 1 | 2)}
          className="flex gap-6"
        >
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <RadioGroupItem value="1" />
            <span>Is For University</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <RadioGroupItem value="2" />
            <span>Is For College</span>
          </label>
        </RadioGroup>

        <div className="flex flex-wrap items-end gap-4">
          {/* University */}
          <div className="space-y-1 min-w-[160px]">
            <Label>University</Label>
            <Select
              value={selectedUniversityId != null ? String(selectedUniversityId) : undefined}
              onValueChange={(v) => handleUniversityChange(Number(v))}
              disabled={loadingFilters}
            >
              <SelectTrigger>
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

          {/* Course */}
          <div className="space-y-1 min-w-[160px]">
            <Label>Course</Label>
            <Select
              value={selectedCourseId != null ? String(selectedCourseId) : undefined}
              onValueChange={(v) => handleCourseChange(Number(v))}
              disabled={courses.length === 0}
            >
              <SelectTrigger>
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

          {/* Academic Year */}
          <div className="space-y-1 min-w-[160px]">
            <Label>Academic Year</Label>
            <Select
              value={selectedAcademicYearId != null ? String(selectedAcademicYearId) : undefined}
              onValueChange={(v) => handleAcademicYearChange(Number(v))}
              disabled={academicYears.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Academic Year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((ay) => (
                  <SelectItem
                    key={ay.fk_academic_year_id}
                    value={String(ay.fk_academic_year_id)}
                  >
                    {ay.academic_year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* College — only when mode=2 */}
          {mode === 2 && (
            <div className="space-y-1 min-w-[160px]">
              <Label>College</Label>
              <Select
                value={selectedCollegeId != null ? String(selectedCollegeId) : undefined}
                onValueChange={(v) => handleCollegeChange(Number(v))}
                disabled={colleges.length === 0}
              >
                <SelectTrigger>
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
        </div>
      </div>

      {/* Table */}
      {tableVisible && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          {!loadingExams && examsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <ClipboardList className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">No records found</p>
            </div>
          ) : (
            <DataTable
              rowData={examsList}
              columnDefs={columnDefs}
              loading={loadingExams}
              onCellClicked={onCellClicked}
            />
          )}
        </div>
      )}

      {/* Modal */}
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
    </div>
  )
}
