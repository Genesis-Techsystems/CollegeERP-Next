'use client'

import { useEffect, useMemo, useState } from 'react'
import { FilteredPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select } from '@/common/components/select'
import { GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import {
  downloadConsolidatedExamReportPdf,
  getFeeMasterCollegeFilters,
  searchStudentsByKeyword,
} from '@/services'
import {
  filterAcademicYears,
  filterColleges,
  filterCourseGroups,
  filterCourses,
  filterCourseYears,
  pickNum,
  pickText,
  type FilterRow,
} from '@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  Building2,
  CalendarDays,
  FileDown,
  GraduationCap,
  Layers,
  RotateCcw,
  School,
  UserRound,
} from 'lucide-react'

type AnyRow = Record<string, any>
type Mode = 'course' | 'student'

function toFilterRows(rows: AnyRow[]): FilterRow[] {
  return rows as FilterRow[]
}

function openPdfBlob(blob: Blob) {
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export default function ConsolidatedExamReportPage() {
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const orgId = Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)

  const [mode, setMode] = useState<Mode>('course')
  const [loading, setLoading] = useState(false)
  const [searchingStudents, setSearchingStudents] = useState(false)

  const [filtersData, setFiltersData] = useState<FilterRow[]>([])
  const [academicData, setAcademicData] = useState<FilterRow[]>([])

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number>(0)
  const [skipAutoSelect, setSkipAutoSelect] = useState(false)

  const [studentQuery, setStudentQuery] = useState('')
  const [studentOptions, setStudentOptions] = useState<AnyRow[]>([])
  const [studentId, setStudentId] = useState<number | null>(null)

  const colleges = useMemo(() => filterColleges(filtersData), [filtersData])
  const academicYears = useMemo(
    () => filterAcademicYears(academicData, collegeId, filtersData),
    [academicData, collegeId, filtersData],
  )
  const courses = useMemo(
    () => filterCourses(filtersData, collegeId),
    [filtersData, collegeId],
  )
  const courseGroups = useMemo(
    () => filterCourseGroups(filtersData, collegeId, courseId),
    [filtersData, collegeId, courseId],
  )
  const courseYears = useMemo(
    () => filterCourseYears(filtersData, collegeId, courseId, courseGroupId),
    [filtersData, collegeId, courseId, courseGroupId],
  )

  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true)
      try {
        const collegeFilters = await getFeeMasterCollegeFilters(orgId, employeeId)
        if (cancelled) return
        const nextFilters = toFilterRows(collegeFilters.filtersData ?? [])
        const nextAy = toFilterRows(collegeFilters.academicData ?? [])
        setFiltersData(nextFilters)
        setAcademicData(nextAy)
        const nextColleges = filterColleges(nextFilters)
        setSkipAutoSelect(false)
        setCollegeId(nextColleges[0] ? pickNum(nextColleges[0], ['fk_college_id', 'collegeId']) : null)
      } catch {
        if (!cancelled) toastError('Failed to load filters')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [orgId, employeeId])

  useEffect(() => {
    if (!collegeId) {
      setAcademicYearId(null)
      return
    }
    if (skipAutoSelect) return
    const years = filterAcademicYears(academicData, collegeId, filtersData)
    const current = years.find((r) => Number(r.is_curr_ay ?? 0) === 1)
    setAcademicYearId(
      current
        ? pickNum(current, ['fk_academic_year_id', 'academicYearId'])
        : years[0]
          ? pickNum(years[0], ['fk_academic_year_id', 'academicYearId'])
          : null,
    )
  }, [collegeId, academicData, filtersData, skipAutoSelect])

  useEffect(() => {
    if (!collegeId) {
      setCourseId(null)
      return
    }
    if (skipAutoSelect) return
    const list = filterCourses(filtersData, collegeId)
    setCourseId(list[0] ? pickNum(list[0], ['fk_course_id', 'courseId']) : null)
  }, [collegeId, filtersData, skipAutoSelect])

  useEffect(() => {
    if (!collegeId || !courseId) {
      setCourseGroupId(null)
      return
    }
    if (skipAutoSelect) return
    const list = filterCourseGroups(filtersData, collegeId, courseId)
    setCourseGroupId(list[0] ? pickNum(list[0], ['fk_course_group_id', 'courseGroupId']) : null)
  }, [collegeId, courseId, filtersData, skipAutoSelect])

  useEffect(() => {
    if (!collegeId || !courseId || !courseGroupId) {
      setCourseYearId(0)
      return
    }
    if (skipAutoSelect) return
    const list = filterCourseYears(filtersData, collegeId, courseId, courseGroupId)
    setCourseYearId(list[0] ? pickNum(list[0], ['fk_course_year_id', 'courseYearId']) : 0)
  }, [collegeId, courseId, courseGroupId, filtersData, skipAutoSelect])

  function handleModeChange(next: Mode) {
    setMode(next)
    setStudentId(null)
    setStudentQuery('')
    setStudentOptions([])
  }

  async function handleSearchStudents() {
    const q = studentQuery.trim()
    if (q.length < 5) {
      toastError('Enter at least 5 characters to search students')
      return
    }
    setSearchingStudents(true)
    try {
      const rows = await searchStudentsByKeyword(q)
      setStudentOptions(rows)
      if (rows.length === 0) toastError('No students found')
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to search students')
    } finally {
      setSearchingStudents(false)
    }
  }

  function handleStudentChange(value: string | null) {
    const id = value ? Number(value) : null
    setStudentId(id)
    if (!id) return
    const std = studentOptions.find(
      (r) => Number(r.studentId ?? r.student_id ?? r.fk_student_id) === id,
    )
    if (!std) return
    setSkipAutoSelect(false)
    const nextCollege = Number(std.collegeId ?? std.fk_college_id ?? 0) || null
    const nextCourse = Number(std.courseId ?? std.fk_course_id ?? 0) || null
    const nextAy = Number(std.academicYearId ?? std.fk_academic_year_id ?? 0) || null
    if (nextCollege) setCollegeId(nextCollege)
    if (nextCourse) setCourseId(nextCourse)
    if (nextAy) setAcademicYearId(nextAy)
  }

  function handleReset() {
    setSkipAutoSelect(true)
    setCollegeId(null)
    setAcademicYearId(null)
    setCourseId(null)
    setCourseGroupId(null)
    setCourseYearId(0)
    setStudentId(null)
    setStudentQuery('')
    setStudentOptions([])
  }

  async function handleGetReport() {
    if (mode === 'student') {
      if (!studentId) {
        toastError('Please select a student')
        return
      }
      setLoading(true)
      try {
        const std = studentOptions.find(
          (r) => Number(r.studentId ?? r.student_id ?? r.fk_student_id) === Number(studentId),
        )
        const blob = await downloadConsolidatedExamReportPdf({
          flag: 'exam_final_std_result_detail',
          examId: 0,
          collegeId:
            Number(std?.collegeId ?? std?.fk_college_id ?? collegeId ?? 0) || collegeId || 0,
          courseId: Number(std?.courseId ?? std?.fk_course_id ?? courseId ?? 0) || courseId || 0,
          courseGroupId: 0,
          courseYearId: 0,
          academicYearId:
            Number(std?.academicYearId ?? std?.fk_academic_year_id ?? academicYearId ?? 0) ||
            academicYearId ||
            0,
          studentId,
          regulationId: 0,
          subjectId: 0,
        })
        openPdfBlob(blob)
        toastSuccess('Student PDF generated')
      } catch (e) {
        toastError(e instanceof Error ? e.message : 'Failed to generate student PDF')
      } finally {
        setLoading(false)
      }
      return
    }

    if (!collegeId || !academicYearId || !courseId || !courseGroupId) {
      toastError('Please select College, Academic Year, Course, and Course Group')
      return
    }
    setLoading(true)
    try {
      // Angular downloadCourseWise() always sends courseYearId: 0 for the PDF.
      const blob = await downloadConsolidatedExamReportPdf({
        flag: 'exam_final_std_result_detail',
        examId: 0,
        collegeId,
        courseId,
        courseGroupId,
        courseYearId: 0,
        academicYearId,
        studentId: 0,
        regulationId: 0,
        subjectId: 0,
      })
      openPdfBlob(blob)
      toastSuccess('PDF generated successfully')
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Failed to generate PDF')
    } finally {
      setLoading(false)
    }
  }

  const modeToggle = (
    <RadioGroup
      value={mode}
      onValueChange={(v) => handleModeChange(v as Mode)}
      className="flex flex-nowrap items-center gap-6 px-0.5"
    >
      <label className="flex items-center gap-2 whitespace-nowrap text-[12px]">
        <RadioGroupItem value="course" id="consolidated-mode-course" />
        By Course
      </label>
      <label className="flex items-center gap-2 whitespace-nowrap text-[12px]">
        <RadioGroupItem value="student" id="consolidated-mode-student" />
        By Student
      </label>
    </RadioGroup>
  )

  const actionButtons = (
    <div className="ml-auto flex shrink-0 items-center gap-3 self-end pb-0.5">
      <Button
        type="button"
        className="h-8 gap-1.5 text-[12px]"
        onClick={() => void handleGetReport()}
        disabled={loading}
      >
        <FileDown className="h-3.5 w-3.5" />
        {loading ? 'Generating...' : 'Get Report'}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-8 gap-1.5 text-[12px]"
        onClick={handleReset}
        title="Reset"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reset
      </Button>
    </div>
  )

  return (
    <FilteredPage
      title="Consolidated Exam Report"
      filters={
        <div className="space-y-3">
          {modeToggle}
          {mode === 'course' ? (
            <GlobalFilterBarRow className="!flex-nowrap overflow-x-auto">
              <GlobalFilterField label="College" icon={Building2} className="!min-w-[9rem]">
                <Select
                  value={collegeId ? String(collegeId) : null}
                  onChange={(v) => {
                    setSkipAutoSelect(false)
                    setCollegeId(v ? Number(v) : null)
                  }}
                  options={colleges.map((r) => ({
                    value: String(pickNum(r, ['fk_college_id', 'collegeId'])),
                    label: pickText(r, ['college_code', 'collegeCode', 'college_name']),
                  }))}
                  placeholder="College"
                  searchable
                  isLoading={loading && filtersData.length === 0}
                />
              </GlobalFilterField>
              <GlobalFilterField label="Academic Year" icon={CalendarDays} className="!min-w-[9rem]">
                <Select
                  value={academicYearId ? String(academicYearId) : null}
                  onChange={(v) => {
                    setSkipAutoSelect(false)
                    setAcademicYearId(v ? Number(v) : null)
                  }}
                  options={academicYears.map((r) => ({
                    value: String(pickNum(r, ['fk_academic_year_id', 'academicYearId'])),
                    label: pickText(r, ['academic_year', 'academicYear']),
                  }))}
                  placeholder="Academic Year"
                  searchable
                />
              </GlobalFilterField>
              <GlobalFilterField label="Course" icon={GraduationCap} className="!min-w-[9rem]">
                <Select
                  value={courseId ? String(courseId) : null}
                  onChange={(v) => {
                    setSkipAutoSelect(false)
                    setCourseId(v ? Number(v) : null)
                  }}
                  options={courses.map((r) => ({
                    value: String(pickNum(r, ['fk_course_id', 'courseId'])),
                    label: pickText(r, ['course_code', 'courseCode', 'course_name']),
                  }))}
                  placeholder="Course"
                  searchable
                />
              </GlobalFilterField>
              <GlobalFilterField label="Course Group" icon={School} className="!min-w-[9rem]">
                <Select
                  value={courseGroupId ? String(courseGroupId) : null}
                  onChange={(v) => {
                    setSkipAutoSelect(false)
                    setCourseGroupId(v ? Number(v) : null)
                  }}
                  options={courseGroups.map((r) => ({
                    value: String(pickNum(r, ['fk_course_group_id', 'courseGroupId'])),
                    label: pickText(r, ['group_code', 'groupCode', 'course_group_code']),
                  }))}
                  placeholder="Course Group"
                  searchable
                />
              </GlobalFilterField>
              <GlobalFilterField label="Course Year" icon={Layers} className="!min-w-[9rem]">
                <Select
                  value={String(courseYearId)}
                  onChange={(v) => setCourseYearId(v ? Number(v) : 0)}
                  options={[
                    { value: '0', label: 'All' },
                    ...courseYears.map((r) => ({
                      value: String(pickNum(r, ['fk_course_year_id', 'courseYearId'])),
                      label: pickText(r, [
                        'course_year_name',
                        'courseYearName',
                        'course_year_code',
                        'courseYearCode',
                      ]),
                    })),
                  ]}
                  placeholder="Course Year"
                  searchable
                />
              </GlobalFilterField>
              {actionButtons}
            </GlobalFilterBarRow>
          ) : (
            <GlobalFilterBarRow className="!flex-nowrap overflow-x-auto">
              <GlobalFilterField label="Search" icon={UserRound} className="!min-w-[14rem] !flex-[1_1_14rem]">
                <div className="flex gap-2">
                  <Input
                    value={studentQuery}
                    onChange={(e) => setStudentQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void handleSearchStudents()
                      }
                    }}
                    placeholder="Student name or roll no."
                    className="h-8 text-[12px]"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 shrink-0 text-[12px]"
                    onClick={() => void handleSearchStudents()}
                    disabled={searchingStudents}
                  >
                    {searchingStudents ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </GlobalFilterField>
              <GlobalFilterField label="Student" icon={UserRound} className="!min-w-[14rem] !flex-[1_1_14rem]">
                <Select
                  value={studentId ? String(studentId) : null}
                  onChange={handleStudentChange}
                  options={studentOptions.map((r) => {
                    const id = Number(r.studentId ?? r.student_id ?? r.fk_student_id)
                    const roll = pickText(r, ['rollNumber', 'roll_number', 'hallticketNumber', 'hallticket_number'])
                    const name = pickText(r, ['firstName', 'first_name', 'studentName', 'student_name'])
                    return {
                      value: String(id),
                      label: name ? `${roll} (${name})` : roll || String(id),
                    }
                  })}
                  placeholder="Select Student"
                  searchable
                />
              </GlobalFilterField>
              {actionButtons}
            </GlobalFilterBarRow>
          )}
        </div>
      }
    />
  )
}
