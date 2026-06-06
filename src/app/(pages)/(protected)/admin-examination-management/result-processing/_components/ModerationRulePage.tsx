'use client'

import { useEffect, useState } from 'react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select } from '@/common/components/select'
import {
  getExamCourseYearSubjects,
  getModerationAcademicYears,
  getModerationColleges,
  getModerationCourseGroups,
  getModerationCourseYears,
  getModerationCourses,
  getModerationExams,
  getSubjectWiseModerationMarks,
} from '@/services'
import { toastError, toastSuccess } from '@/lib/toast'

type AnyRow = Record<string, any>

/** Display date "MMM d, y" (Angular date pipe in exam option labels). */
function fmtDate(v: unknown): string {
  const s = v ? String(v).slice(0, 10) : ''
  if (!s) return '-'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Mirrors Angular apply-moderation-rule.component.ts — the same component backs
 * both "Moderation Rule Setup" and "Apply Moderation Rule" menu entries.
 * Filter cascade uses domain lists (College → AcademicYear → Course →
 * CourseGroup → CourseYear → ExamMaster) and examCourseYearSubject for subjects,
 * exactly like Angular; Generate calls s_pop_exam_subjectwisemoderation.
 */
export function ModerationRulePage({
  title,
  subtitle,
}: Readonly<{ title: string; subtitle: string }>) {
  const [loading, setLoading] = useState(false)

  const [colleges, setColleges] = useState<AnyRow[]>([])
  const [academicYears, setAcademicYears] = useState<AnyRow[]>([])
  const [courses, setCourses] = useState<AnyRow[]>([])
  const [courseGroups, setCourseGroups] = useState<AnyRow[]>([])
  const [courseYears, setCourseYears] = useState<AnyRow[]>([])
  const [exams, setExams] = useState<AnyRow[]>([])
  const [subjects, setSubjects] = useState<AnyRow[]>([])

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)

  const [students, setStudents] = useState<AnyRow[]>([])
  const [moderationInfo, setModerationInfo] = useState<AnyRow[]>([])
  const [selectedData, setSelectedData] = useState('')

  /*----------- COLLEGES (Angular getData) -----------*/
  useEffect(() => {
    async function init() {
      try {
        setColleges(await getModerationColleges())
      } catch (error) {
        setColleges([])
        toastError(error, 'Failed to load colleges')
      }
    }
    void init()
  }, [])

  function clearResults() {
    setStudents([])
    setModerationInfo([])
    setSelectedData('')
  }

  /*----------- ACADEMIC YEARS (Angular selectedCollege) -----------*/
  function onCollegeChange(value: string | null) {
    const id = value ? Number(value) : null
    setCollegeId(id)
    setAcademicYearId(null)
    setCourseId(null)
    setCourseGroupId(null)
    setCourseYearId(null)
    setExamId(null)
    setSubjectId(null)
    setAcademicYears([])
    setCourses([])
    setCourseGroups([])
    setCourseYears([])
    setExams([])
    setSubjects([])
    clearResults()
    if (!id) return
    getModerationAcademicYears(id)
      .then(setAcademicYears)
      .catch((error) => toastError(error, 'Failed to load academic years'))
  }

  /*----------- COURSES (Angular selectedAcademicYear) -----------*/
  function onAcademicYearChange(value: string | null) {
    const id = value ? Number(value) : null
    setAcademicYearId(id)
    setCourseId(null)
    setCourseGroupId(null)
    setCourseYearId(null)
    setExamId(null)
    setSubjectId(null)
    setCourses([])
    setCourseGroups([])
    setCourseYears([])
    setExams([])
    setSubjects([])
    clearResults()
    if (!id || !collegeId) return
    getModerationCourses(collegeId)
      .then(setCourses)
      .catch((error) => toastError(error, 'Failed to load courses'))
  }

  /*----------- COURSE GROUPS (Angular selectedCourse) -----------*/
  function onCourseChange(value: string | null) {
    const id = value ? Number(value) : null
    setCourseId(id)
    setCourseGroupId(null)
    setCourseYearId(null)
    setExamId(null)
    setSubjectId(null)
    setCourseGroups([])
    setCourseYears([])
    setExams([])
    setSubjects([])
    clearResults()
    if (!id) return
    getModerationCourseGroups(id)
      .then(setCourseGroups)
      .catch((error) => toastError(error, 'Failed to load course groups'))
  }

  /*----------- COURSE YEARS (Angular selectedCourseGroup) -----------*/
  function onCourseGroupChange(value: string | null) {
    const id = value ? Number(value) : null
    setCourseGroupId(id)
    setCourseYearId(null)
    setExamId(null)
    setSubjectId(null)
    setCourseYears([])
    setExams([])
    setSubjects([])
    clearResults()
    if (!id || !courseId) return
    getModerationCourseYears(courseId)
      .then(setCourseYears)
      .catch((error) => toastError(error, 'Failed to load course years'))
  }

  /*----------- EXAMS (Angular selectedCourseYear) -----------*/
  function onCourseYearChange(value: string | null) {
    const id = value ? Number(value) : null
    setCourseYearId(id)
    setExamId(null)
    setSubjectId(null)
    setExams([])
    setSubjects([])
    clearResults()
    if (!id || !collegeId || !courseId || !academicYearId) return
    getModerationExams({ collegeId, courseId, academicYearId })
      .then(setExams)
      .catch((error) => toastError(error, 'Failed to load exams'))
  }

  /*----------- SUBJECTS (Angular selectedExam → examCourseYearSubject) -----------*/
  function onExamChange(value: string | null) {
    const id = value ? Number(value) : null
    setExamId(id)
    setSubjectId(null)
    setSubjects([])
    clearResults()
    if (!id || !collegeId || !academicYearId || !courseYearId || !courseGroupId) return
    getExamCourseYearSubjects({ collegeId, academicYearId, courseYearId, courseGroupId })
      .then(setSubjects)
      .catch(() => setSubjects([]))
  }

  const formValid = Boolean(
    collegeId && academicYearId && courseId && courseGroupId && courseYearId && examId && subjectId,
  )

  /*----------- GENERATE (Angular getDetails) -----------*/
  async function onGenerate() {
    if (!formValid) return
    setLoading(true)
    try {
      const parts = [
        colleges.find((x) => Number(x.collegeId) === collegeId)?.collegeCode,
        academicYears.find((x) => Number(x.academicYearId) === academicYearId)?.academicYear,
        courses.find((x) => Number(x.courseId) === courseId)?.courseCode,
        courseGroups.find((x) => Number(x.courseGroupId) === courseGroupId)?.groupCode,
        courseYears.find((x) => Number(x.courseYearId) === courseYearId)?.courseYearName,
        subjects.find((x) => Number(x.subjectId) === subjectId)?.subjectName,
      ].filter(Boolean)
      setSelectedData(parts.join(' / '))

      const { students: rows, info } = await getSubjectWiseModerationMarks({
        collegeId: collegeId!,
        examId: examId!,
        courseYearId: courseYearId!,
        courseGroupId: courseGroupId!,
        subjectId: subjectId!,
      })
      setStudents(rows)
      setModerationInfo(info)
      if (rows.length === 0) toastSuccess('No Records Found.')
    } catch (error) {
      setStudents([])
      setModerationInfo([])
      toastError(error, 'Failed to fetch moderation details')
    } finally {
      setLoading(false)
    }
  }

  const collegeOptions = colleges.map((x) => ({
    value: String(x.collegeId),
    label: String(x.collegeCode ?? x.collegeName ?? ''),
  }))
  const academicYearOptions = academicYears.map((x) => ({
    value: String(x.academicYearId),
    label: String(x.academicYear ?? ''),
  }))
  const courseOptions = courses.map((x) => ({
    value: String(x.courseId),
    label: String(x.courseCode ?? x.courseName ?? ''),
  }))
  const courseGroupOptions = courseGroups.map((x) => ({
    value: String(x.courseGroupId),
    label: String(x.groupCode ?? x.courseGroupName ?? ''),
  }))
  const courseYearOptions = courseYears.map((x) => ({
    value: String(x.courseYearId),
    label: String(x.courseYearName ?? ''),
  }))
  const examOptions = exams.map((x) => ({
    value: String(x.examId),
    label: `${x.examName ?? ''} (${fmtDate(x.fromDate)} - ${fmtDate(x.toDate)})`,
  }))
  const subjectOptions = subjects.map((x) => ({
    value: String(x.subjectId),
    label: `${x.subjectCode ?? ''} - ${x.subjectName ?? ''}${x.regulationCode ? ` (${x.regulationCode})` : ''}`,
  }))

  return (
    <PageContainer className="space-y-4">
      <PageHeader title={title} subtitle={subtitle} />

      <div className="app-card p-3 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-10 gap-2 items-end">
          <div className="space-y-1 md:col-span-2">
            <Label>College</Label>
            <Select value={collegeId ? String(collegeId) : null} onChange={onCollegeChange} options={collegeOptions} placeholder="College" searchable />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Exam Year</Label>
            <Select value={academicYearId ? String(academicYearId) : null} onChange={onAcademicYearChange} options={academicYearOptions} placeholder="Exam Year" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Course</Label>
            <Select value={courseId ? String(courseId) : null} onChange={onCourseChange} options={courseOptions} placeholder="Course" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Course Group</Label>
            <Select value={courseGroupId ? String(courseGroupId) : null} onChange={onCourseGroupChange} options={courseGroupOptions} placeholder="Course Group" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Course Year</Label>
            <Select value={courseYearId ? String(courseYearId) : null} onChange={onCourseYearChange} options={courseYearOptions} placeholder="Course Year" />
          </div>
          <div className="space-y-1 md:col-span-4">
            <Label>Exam</Label>
            <Select value={examId ? String(examId) : null} onChange={onExamChange} options={examOptions} placeholder="Exam" searchable />
          </div>
          <div className="space-y-1 md:col-span-4">
            <Label>Exam Subject</Label>
            <Select
              value={subjectId ? String(subjectId) : null}
              onChange={(v) => {
                setSubjectId(v ? Number(v) : null)
                clearResults()
              }}
              options={subjectOptions}
              placeholder="Exam Subject"
              searchable
            />
          </div>
          <div className="md:col-span-2">
            <Button
              className="h-8 w-full text-[12px] text-[#FFFFFF] bg-gradient-to-r from-[#0E7096] via-[#1C8FA8] to-[#27A9B4] hover:from-[#0E7096] hover:via-[#1C8FA8] hover:to-[#27A9B4]"
              disabled={!formValid || loading}
              onClick={() => void onGenerate()}
            >
              Generate
            </Button>
          </div>
        </div>
      </div>

      {selectedData && students.length > 0 && (
        <div className="app-card p-3">
          <p className="text-[13px] font-semibold">{selectedData}</p>
        </div>
      )}

      {moderationInfo.length > 0 && students.length > 0 && (
        <div className="app-card p-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-[12px]">
          {moderationInfo.map((info) => (
            <div
              key={`mi-${info.ModerationMarks_added ?? 'na'}-${info.actual_pass_percentage ?? 'na'}-${info.moderation_pass_percentage ?? 'na'}`}
              className="rounded border p-2 space-y-1"
            >
              <p><span className="text-slate-500">Moderation Marks Added:</span> {info.ModerationMarks_added ?? '-'}</p>
              <p><span className="text-slate-500">Actual Marks Percentage:</span> {info.actual_pass_percentage ?? '-'}%</p>
              <p><span className="text-slate-500">Moderation Pass Percentage:</span> {info.moderation_pass_percentage ?? '-'}%</p>
              <p><span className="text-slate-500">Students with Moderation Marks:</span> {info.NoOfStudentsPassed_With_ModerationMarks ?? '-'}%</p>
            </div>
          ))}
        </div>
      )}

      {students.length > 0 && (
        <div className="app-card p-3">
          <div className="overflow-auto rounded border">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-2 py-1">S.No</th>
                  <th className="text-left px-2 py-1">Student Name</th>
                  <th className="text-left px-2 py-1">Internal Marks</th>
                  <th className="text-left px-2 py-1">External Marks</th>
                  <th className="text-left px-2 py-1">Total Marks</th>
                  <th className="text-left px-2 py-1">Moderation Marks</th>
                  <th className="text-left px-2 py-1">After Moderation</th>
                </tr>
              </thead>
              <tbody>
                {students.map((row, index) => (
                  <tr key={`st-${row.hallticket_number ?? 'na'}-${row.StudentName ?? 'na'}-${index}`} className="border-t">
                    <td className="px-2 py-1">{index + 1}</td>
                    <td className="px-2 py-1">{row.StudentName ?? '-'} ({row.hallticket_number ?? '-'})</td>
                    <td className="px-2 py-1">{row.internal_marks ?? '-'}</td>
                    <td className="px-2 py-1">{row.external_marks ?? '-'}</td>
                    <td className="px-2 py-1">{row.totalmarks ?? '-'}</td>
                    <td className="px-2 py-1">{row.ModerationMarks_added ?? '-'}</td>
                    <td className="px-2 py-1">{row.ModerationMarks ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
