'use client'

import { useEffect, useMemo, useState } from 'react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select } from '@/common/components/select'
import { getAllRecords } from '@/services/crud'
import { toastError } from '@/lib/toast'

type AnyRow = Record<string, any>

function numFrom(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const value = Number(row?.[key])
    if (Number.isFinite(value) && value > 0) return value
  }
  return 0
}

function strFrom(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const value = String(row?.[key] ?? '').trim()
    if (value) return value
  }
  return ''
}

function dedupeBy(rows: AnyRow[], keys: string[]): AnyRow[] {
  const seen = new Set<number>()
  const out: AnyRow[] = []
  for (const row of rows) {
    const id = numFrom(row, keys)
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(row)
  }
  return out
}

export function ModerationRulePage({
  title,
  subtitle,
}: Readonly<{ title: string; subtitle: string }>) {
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const organizationId = Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)

  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<AnyRow[]>([])

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)

  const [subjects, setSubjects] = useState<AnyRow[]>([])
  const [students, setStudents] = useState<AnyRow[]>([])
  const [moderationInfo, setModerationInfo] = useState<AnyRow[]>([])

  const colleges = useMemo(() => dedupeBy(filters, ['fk_college_id', 'collegeId']), [filters])
  const academicYears = useMemo(
    () =>
      dedupeBy(
        filters.filter((x) => numFrom(x, ['fk_college_id', 'collegeId']) === Number(collegeId)),
        ['fk_academic_year_id', 'academicYearId'],
      ),
    [filters, collegeId],
  )
  const courses = useMemo(
    () =>
      dedupeBy(
        filters.filter(
          (x) =>
            numFrom(x, ['fk_college_id', 'collegeId']) === Number(collegeId) &&
            numFrom(x, ['fk_academic_year_id', 'academicYearId']) === Number(academicYearId),
        ),
        ['fk_course_id', 'courseId'],
      ),
    [filters, collegeId, academicYearId],
  )
  const courseGroups = useMemo(
    () =>
      dedupeBy(
        filters.filter(
          (x) =>
            numFrom(x, ['fk_college_id', 'collegeId']) === Number(collegeId) &&
            numFrom(x, ['fk_academic_year_id', 'academicYearId']) === Number(academicYearId) &&
            numFrom(x, ['fk_course_id', 'courseId']) === Number(courseId),
        ),
        ['fk_course_group_id', 'courseGroupId'],
      ),
    [filters, collegeId, academicYearId, courseId],
  )
  const courseYears = useMemo(
    () =>
      dedupeBy(
        filters.filter(
          (x) =>
            numFrom(x, ['fk_college_id', 'collegeId']) === Number(collegeId) &&
            numFrom(x, ['fk_academic_year_id', 'academicYearId']) === Number(academicYearId) &&
            numFrom(x, ['fk_course_id', 'courseId']) === Number(courseId) &&
            numFrom(x, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId),
        ),
        ['fk_course_year_id', 'courseYearId'],
      ),
    [filters, collegeId, academicYearId, courseId, courseGroupId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        filters.filter(
          (x) =>
            numFrom(x, ['fk_college_id', 'collegeId']) === Number(collegeId) &&
            numFrom(x, ['fk_academic_year_id', 'academicYearId']) === Number(academicYearId) &&
            numFrom(x, ['fk_course_id', 'courseId']) === Number(courseId) &&
            numFrom(x, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId) &&
            numFrom(x, ['fk_course_year_id', 'courseYearId']) === Number(courseYearId),
        ),
        ['fk_exam_id', 'examId'],
      ),
    [filters, collegeId, academicYearId, courseId, courseGroupId, courseYearId],
  )

  const collegeOptions = useMemo(
    () =>
      colleges
        .map((x) => ({
          value: String(numFrom(x, ['fk_college_id', 'collegeId'])),
          label: strFrom(x, ['college_code', 'collegeCode', 'college_name', 'collegeName']),
        }))
        .filter((o) => o.value !== '0'),
    [colleges],
  )
  const academicYearOptions = useMemo(
    () =>
      academicYears
        .map((x) => ({
          value: String(numFrom(x, ['fk_academic_year_id', 'academicYearId'])),
          label: strFrom(x, ['academic_year', 'academicYear']),
        }))
        .filter((o) => o.value !== '0'),
    [academicYears],
  )
  const courseOptions = useMemo(
    () =>
      courses
        .map((x) => ({
          value: String(numFrom(x, ['fk_course_id', 'courseId'])),
          label: strFrom(x, ['course_code', 'courseCode', 'course_name', 'courseName']),
        }))
        .filter((o) => o.value !== '0'),
    [courses],
  )
  const courseGroupOptions = useMemo(
    () =>
      courseGroups
        .map((x) => ({
          value: String(numFrom(x, ['fk_course_group_id', 'courseGroupId'])),
          label: strFrom(x, ['group_code', 'groupCode', 'course_group_name', 'courseGroupName']),
        }))
        .filter((o) => o.value !== '0'),
    [courseGroups],
  )
  const courseYearOptions = useMemo(
    () =>
      courseYears
        .map((x) => ({
          value: String(numFrom(x, ['fk_course_year_id', 'courseYearId'])),
          label: strFrom(x, ['course_year_name', 'courseYearName']),
        }))
        .filter((o) => o.value !== '0'),
    [courseYears],
  )
  const examOptions = useMemo(
    () =>
      exams
        .map((x) => ({
          value: String(numFrom(x, ['fk_exam_id', 'examId'])),
          label: strFrom(x, ['exam_name', 'examName']),
        }))
        .filter((o) => o.value !== '0'),
    [exams],
  )
  const subjectOptions = useMemo(
    () =>
      subjects
        .map((x) => ({
          value: String(numFrom(x, ['subjectId', 'fk_subject_id'])),
          label: `${strFrom(x, ['subjectCode', 'subject_code'])} - ${strFrom(x, ['subjectName', 'subject_name'])}`,
        }))
        .filter((o) => o.value !== '0' && o.label !== ' - '),
    [subjects],
  )

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_collegewisedetails_bycode', {
          in_flag: 'clg_exam_timetable_filters',
          in_org_id: organizationId || 0,
          in_college_id: 0,
          in_course_id: 0,
          in_course_group_id: 0,
          in_course_year_id: 0,
          in_group_section_id: 0,
          in_academic_year_id: 0,
          in_dept_id: 0,
          in_isadmin: 0,
          in_loginuser_empid: employeeId || 0,
          in_loginuser_roleid: 0,
          in_employee: '',
          in_subject: '',
          in_gm_codes: 'SUBTYPE',
        })

        const groups = data?.result ?? []
        const picked =
          groups.find((g) => (g?.[0]?.flag ?? '') === 'clg_exam_timetable_filters') ??
          groups.find((g) => Array.isArray(g) && g.length > 0) ??
          []
        setFilters(Array.isArray(picked) ? picked : [])
      } catch {
        setFilters([])
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [employeeId, organizationId])

  useEffect(() => {
    setAcademicYearId(null)
    setCourseId(null)
    setCourseGroupId(null)
    setCourseYearId(null)
    setExamId(null)
    setSubjectId(null)
    setSubjects([])
    setStudents([])
    setModerationInfo([])
  }, [collegeId])
  useEffect(() => {
    setCourseId(null)
    setCourseGroupId(null)
    setCourseYearId(null)
    setExamId(null)
    setSubjectId(null)
    setSubjects([])
    setStudents([])
    setModerationInfo([])
  }, [academicYearId])
  useEffect(() => {
    setCourseGroupId(null)
    setCourseYearId(null)
    setExamId(null)
    setSubjectId(null)
    setSubjects([])
    setStudents([])
    setModerationInfo([])
  }, [courseId])
  useEffect(() => {
    setCourseYearId(null)
    setExamId(null)
    setSubjectId(null)
    setSubjects([])
    setStudents([])
    setModerationInfo([])
  }, [courseGroupId])
  useEffect(() => {
    setExamId(null)
    setSubjectId(null)
    setSubjects([])
    setStudents([])
    setModerationInfo([])
  }, [courseYearId])
  useEffect(() => {
    setSubjectId(null)
    setStudents([])
    setModerationInfo([])
  }, [examId])

  useEffect(() => {
    async function loadSubjects() {
      if (!collegeId || !courseId || !courseGroupId || !courseYearId || !examId || !academicYearId) {
        setSubjects([])
        return
      }
      try {
        const data = await getAllRecords<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
          in_flag: 'univ_exam_subject_regexamstd',
          in_flag_type: 'ALL',
          in_university_id: 0,
          in_univ_examcenter_id: 0,
          in_college_id: collegeId,
          in_course_id: courseId,
          in_course_group_id: courseGroupId,
          in_course_year_id: courseYearId,
          in_exam_id: examId,
          in_academic_year_id: academicYearId,
          in_regulation_id: 0,
          in_sub_flag_type: 'ALL',
          in_subject_id: 0,
          in_param1: 0,
          in_param2: 0,
          in_loginuser_roleid: 0,
          in_loginuser_empid: employeeId || 0,
        })
        const groups = data?.result ?? []
        const rows = groups.flatMap((g) => g ?? [])
        setSubjects(Array.isArray(rows) ? rows : [])
      } catch {
        setSubjects([])
      }
    }
    void loadSubjects()
  }, [collegeId, courseId, courseGroupId, courseYearId, examId, academicYearId, employeeId])

  async function onGenerate() {
    if (!collegeId || !examId || !courseYearId || !courseGroupId || !subjectId) return
    setLoading(true)
    try {
      const data = await getAllRecords<{ result: AnyRow[][] }>('s_pop_exam_subjectwisemoderation', {
        in_flag: 'GetModerationMarks',
        in_collegeid: collegeId,
        in_examid: examId,
        in_courseyearid: courseYearId,
        in_coursegroupid: courseGroupId,
        in_subjectid: subjectId,
      })

      const groups = data?.result ?? []
      setStudents(Array.isArray(groups[0]) ? groups[0] : [])
      setModerationInfo(Array.isArray(groups[1]) ? groups[1] : [])
    } catch (error) {
      setStudents([])
      setModerationInfo([])
      toastError(error, 'Failed to fetch moderation details')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageContainer className="space-y-4">
      <PageHeader title={title} subtitle={subtitle} />

      <div className="app-card p-3 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-10 gap-2 items-end">
          <div className="space-y-1 md:col-span-2">
            <Label>College</Label>
            <Select value={collegeId ? String(collegeId) : null} onChange={(v) => setCollegeId(v ? Number(v) : null)} options={collegeOptions} placeholder="College" searchable />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Exam Year</Label>
            <Select value={academicYearId ? String(academicYearId) : null} onChange={(v) => setAcademicYearId(v ? Number(v) : null)} options={academicYearOptions} placeholder="Exam Year" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Course</Label>
            <Select value={courseId ? String(courseId) : null} onChange={(v) => setCourseId(v ? Number(v) : null)} options={courseOptions} placeholder="Course" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Course Group</Label>
            <Select value={courseGroupId ? String(courseGroupId) : null} onChange={(v) => setCourseGroupId(v ? Number(v) : null)} options={courseGroupOptions} placeholder="Course Group" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Course Year</Label>
            <Select value={courseYearId ? String(courseYearId) : null} onChange={(v) => setCourseYearId(v ? Number(v) : null)} options={courseYearOptions} placeholder="Course Year" />
          </div>
          <div className="space-y-1 md:col-span-4">
            <Label>Exam</Label>
            <Select value={examId ? String(examId) : null} onChange={(v) => setExamId(v ? Number(v) : null)} options={examOptions} placeholder="Exam" searchable />
          </div>
          <div className="space-y-1 md:col-span-4">
            <Label>Exam Subject</Label>
            <Select value={subjectId ? String(subjectId) : null} onChange={(v) => setSubjectId(v ? Number(v) : null)} options={subjectOptions} placeholder="Exam Subject" searchable />
          </div>
          <div className="md:col-span-2">
            <Button
              className="h-8 w-full text-[12px] text-[#FFFFFF] bg-gradient-to-r from-[#0E7096] via-[#1C8FA8] to-[#27A9B4] hover:from-[#0E7096] hover:via-[#1C8FA8] hover:to-[#27A9B4]"
              disabled={!collegeId || !examId || !courseYearId || !courseGroupId || !subjectId || loading}
              onClick={() => void onGenerate()}
            >
              Generate
            </Button>
          </div>
        </div>
      </div>

      {moderationInfo.length > 0 && (
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
              <thead className="bg-slate-50">
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
                  <tr key={`st-${row.hallticket_number ?? row.hallticketNumber ?? 'na'}-${row.StudentName ?? row.studentName ?? 'na'}-${row.subjectId ?? row.fk_subject_id ?? 'na'}`} className="border-t">
                    <td className="px-2 py-1">{index + 1}</td>
                    <td className="px-2 py-1">{row.StudentName ?? row.studentName ?? '-'} ({row.hallticket_number ?? row.hallticketNumber ?? '-'})</td>
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

