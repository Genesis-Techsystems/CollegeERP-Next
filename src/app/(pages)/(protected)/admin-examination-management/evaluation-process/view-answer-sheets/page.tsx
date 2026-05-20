'use client'

import { useEffect, useMemo, useState } from 'react'
import { Filter } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { runEvaluationProc } from '@/services/evaluation-process-admin'
import { getUnivExamFiltersByType } from '@/services/pre-examination'
import { dedupeBy, num, txt } from '@/common/utils/data-helpers'

type AnyRow = Record<string, any>
const formatDate = (value: unknown): string => {
  const raw = txt(value)
  if (!raw) return ''
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

async function callExamFilters(params: Record<string, string | number>) {
  const data = await runEvaluationProc<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', params).catch(() => ({ result: [] }))
  return Array.isArray(data?.result) ? data.result : []
}

async function callCollegeExamDetails(params: Record<string, string | number>) {
  const procs = ['s_get_collegeexamdetails_bycode', 's_get_collegewisedetails_bycode', 's_get_exam_assignments']
  for (const proc of procs) {
    const data = await runEvaluationProc<{ result: AnyRow[][] }>(proc, params).catch(() => ({ result: [] }))
    if (Array.isArray(data?.result) && data.result.length > 0) return data.result
  }
  return []
}

export default function ViewAnswerSheetsPage() {
  const [loading, setLoading] = useState(false)
  const [filterOpen, setFilterOpen] = useState(true)
  const [showList, setShowList] = useState(false)

  const [searchSummary, setSearchSummary] = useState('')
  const [searchGroup, setSearchGroup] = useState('')
  const [searchDetail, setSearchDetail] = useState('')

  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [summaryRows, setSummaryRows] = useState<AnyRow[]>([])
  const [groupRows, setGroupRows] = useState<AnyRow[]>([])
  const [detailRows, setDetailRows] = useState<AnyRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [examDate, setExamDate] = useState<string>('')
  const [examSessionId, setExamSessionId] = useState<number | null>(null)
  const [examTimetableId, setExamTimetableId] = useState<number | null>(null)

  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const organizationId = Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)

  const courses = useMemo(() => dedupeBy(baseRows, (r) => num(r.fk_course_id)), [baseRows])
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => num(r.fk_course_id) === num(courseId)),
        (r) => num(r.fk_academic_year_id),
      ).sort((a, b) => txt(b.academic_year).localeCompare(txt(a.academic_year))),
    [baseRows, courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            num(r.fk_course_id) === num(courseId) &&
            num(r.fk_academic_year_id) === num(academicYearId),
        ),
        (r) => num(r.fk_exam_id),
      ),
    [baseRows, courseId, academicYearId],
  )
  const examDates = useMemo(
    () =>
      dedupeBy(restRows, (r) => txt(r.exam_date))
        .map((r) => txt(r.exam_date))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [restRows],
  )
  const sessions = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => txt(r.exam_date) === examDate),
        (r) => num(r.fk_exam_session_id),
      ),
    [baseRows, examDate],
  )

  const filteredSummary = useMemo(() => {
    const q = searchSummary.trim().toLowerCase()
    if (!q) return summaryRows
    return summaryRows.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }, [summaryRows, searchSummary])

  const filteredGroup = useMemo(() => {
    const q = searchGroup.trim().toLowerCase()
    if (!q) return groupRows
    return groupRows.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }, [groupRows, searchGroup])

  const filteredDetail = useMemo(() => {
    const q = searchDetail.trim().toLowerCase()
    if (!q) return detailRows
    return detailRows.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }, [detailRows, searchDetail])

  useEffect(() => {
    async function loadBase() {
      setLoading(true)
      try {
        const rows = await getUnivExamFiltersByType(employeeId, 'REGSUP').catch(() => [])
        setBaseRows(Array.isArray(rows) ? rows.filter((r) => txt(r.flag) === 'univ_exam_filters' || !r.flag) : [])
      } finally {
        setLoading(false)
      }
    }
    void loadBase()
  }, [employeeId])

  useEffect(() => {
    const first = num(courses[0]?.fk_course_id)
    setCourseId(first || null)
  }, [courses])

  useEffect(() => {
    const first = num(academicYears[0]?.fk_academic_year_id)
    setAcademicYearId(first || null)
  }, [academicYears])

  useEffect(() => {
    const first = num(exams[0]?.fk_exam_id)
    setExamId(first || null)
  }, [exams])

  useEffect(() => {
    async function loadRestForExam() {
      if (!courseId || !academicYearId || !examId) {
        setRestRows([])
        return
      }
      setLoading(true)
      try {
        const groups = await callExamFilters({
          in_flag: 'univ_exam_rest_in_tt',
          in_flag_type: 'REGSUP',
          in_university_id: 0,
          in_univ_examcenter_id: 0,
          in_college_id: 0,
          in_course_id: courseId,
          in_course_group_id: 0,
          in_course_year_id: 0,
          in_exam_id: examId,
          in_academic_year_id: academicYearId,
          in_regulation_id: 0,
          in_subject_id: 0,
          in_sub_flag_type: '',
          in_param1: 0,
          in_param2: 0,
          in_loginuser_roleid: 0,
          in_loginuser_empid: employeeId,
        })
        const rest = groups.find((g) => txt(g?.[0]?.flag) === 'univ_exam_rest_filters') ?? groups.flatMap((g) => g || [])
        setRestRows(rest)
      } finally {
        setLoading(false)
      }
    }
    void loadRestForExam()
  }, [courseId, academicYearId, examId, employeeId])

  useEffect(() => {
    setExamDate(examDates[0] ?? '')
  }, [examDates])

  useEffect(() => {
    const firstSession = sessions[0]
    setExamSessionId(num(firstSession?.fk_exam_session_id) || null)
    setExamTimetableId(num(firstSession?.fk_exam_timetable_id) || null)
  }, [sessions])

  async function getList() {
    if (!academicYearId || !examId || !examTimetableId) return
    setLoading(true)
    setShowList(true)
    try {
      const groups = await callCollegeExamDetails({
        in_flag: 'exam_timetable_answerpaper_details',
        in_org_id: organizationId || 0,
        in_college_id: 0,
        in_academic_year_id: academicYearId,
        in_isadmin: 0,
        in_exam_id: examId,
        in_timetable_id: examTimetableId,
        in_exam_date: '1990-01-01',
        in_loginuser_empid: 0,
        in_loginuser_roleid: 0,
        in_subject_id: 0,
      })

      setSummaryRows(Array.isArray(groups[0]) ? groups[0] : [])
      setDetailRows(Array.isArray(groups[1]) ? groups[1] : [])
      setGroupRows(Array.isArray(groups[2]) ? groups[2] : [])
    } finally {
      setLoading(false)
    }
  }

  const examName = txt(exams.find((e) => num(e.fk_exam_id) === num(examId))?.exam_name)
  const totalStudents = filteredSummary.reduce((acc, r) => acc + num(r.total_students), 0)
  const attendanceMarked = filteredSummary.reduce((acc, r) => acc + num(r.attendance_marked), 0)
  const attendanceNotMarked = filteredSummary.reduce((acc, r) => acc + num(r.attendance_not_marked), 0)
  const presented = filteredSummary.reduce((acc, r) => acc + num(r.presented_Students), 0)
  const uploaded = filteredSummary.reduce((acc, r) => acc + num(r.no_oof_answerpaper_uploaded), 0)

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="View Answer Sheets" subtitle="Evaluation process view uploaded answer sheets" />

      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
          <h2 className="app-card-title">View Answer Sheet</h2>
          <Button type="button" variant="outline" size="sm" className="h-6 px-2.5 text-[12px]" onClick={() => setFilterOpen((v) => !v)}>
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filter
          </Button>
        </div>

        {filterOpen && (
          <div className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-2 space-y-1">
                <Label>Course</Label>
                <Select value={courseId ? String(courseId) : undefined} onValueChange={(v) => setCourseId(num(v) || null)}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course" /></SelectTrigger>
                  <SelectContent>{courses.map((c) => <SelectItem key={String(num(c.fk_course_id))} value={String(num(c.fk_course_id))}>{txt(c.course_code)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Academic Year</Label>
                <Select value={academicYearId ? String(academicYearId) : undefined} onValueChange={(v) => setAcademicYearId(num(v) || null)}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Academic Year" /></SelectTrigger>
                  <SelectContent>{academicYears.map((a) => <SelectItem key={String(num(a.fk_academic_year_id))} value={String(num(a.fk_academic_year_id))}>{txt(a.academic_year)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3 space-y-1">
                <Label>Exam</Label>
                <Select value={examId ? String(examId) : undefined} onValueChange={(v) => setExamId(num(v) || null)}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam" /></SelectTrigger>
                  <SelectContent>{exams.map((e) => <SelectItem key={String(num(e.fk_exam_id))} value={String(num(e.fk_exam_id))}>{txt(e.exam_name)} {txt(e.exam_date)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Exam Date</Label>
                <Select value={examDate || undefined} onValueChange={setExamDate}>
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam Date" /></SelectTrigger>
                  <SelectContent>{examDates.map((d) => <SelectItem key={d} value={d}>{formatDate(d)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Exam Session</Label>
                <Select
                  value={examSessionId ? String(examSessionId) : undefined}
                  onValueChange={(v) => {
                    const id = num(v)
                    setExamSessionId(id || null)
                    const row = sessions.find((s) => num(s.fk_exam_session_id) === id)
                    setExamTimetableId(num(row?.fk_exam_timetable_id) || null)
                  }}
                >
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam Session" /></SelectTrigger>
                  <SelectContent>{sessions.map((s) => <SelectItem key={String(num(s.fk_exam_session_id))} value={String(num(s.fk_exam_session_id))}>{txt(s.exam_session_name)} {txt(s.session_time) ? `(${txt(s.session_time)})` : ''}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-1">
                <Button type="button" className="h-8 px-3 text-[12px]" onClick={getList} disabled={loading || !examTimetableId}>
                  Get List
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showList && (
        <>
          <div className="app-card p-3 space-y-2">
            <h3 className="app-card-title border-b border-amber-200 pb-2">Summary List ({examName} / {formatDate(examDate || '1990-01-01')})</h3>
            <div className="w-full max-w-sm"><Input placeholder="Search" value={searchSummary} onChange={(e) => setSearchSummary(e.target.value)} className="h-8 text-[12px]" /></div>
            <p className="text-[12px] font-medium">
              Total Students: <span className="text-red-600">{totalStudents}</span> | Attendance Marked: <span className="text-red-600">{attendanceMarked}</span> | Attendance Not Marked: <span className="text-red-600">{attendanceNotMarked}</span> | Presented Students: <span className="text-red-600">{presented}</span> | Answerpaper Uploaded: <span className="text-red-600">{uploaded}</span>
            </p>
            <div className="overflow-auto rounded border max-h-[300px]">
              <table className="w-full text-[12px]">
                <thead className="bg-muted/40"><tr><th className="px-2 py-1 text-left">SI.No</th><th className="px-2 py-1 text-left">Invigilator</th><th className="px-2 py-1 text-left">Room</th><th className="px-2 py-1 text-left">Total Students</th><th className="px-2 py-1 text-left">Attendance Marked</th><th className="px-2 py-1 text-left">Attendance Not Marked</th><th className="px-2 py-1 text-left">Presented Students</th><th className="px-2 py-1 text-left">No.of.Answerpaper Uploaded</th></tr></thead>
                <tbody>{filteredSummary.map((r, i) => <tr key={`s-${txt(r.invigilator_emp_name)}-${txt(r.room_name)}-${num(r.total_students)}`} className="border-t"><td className="px-2 py-1">{i + 1}</td><td className="px-2 py-1">{txt(r.invigilator_emp_name)}</td><td className="px-2 py-1">{txt(r.room_name)}</td><td className="px-2 py-1">{num(r.total_students)}</td><td className="px-2 py-1">{num(r.attendance_marked)}</td><td className="px-2 py-1">{num(r.attendance_not_marked)}</td><td className="px-2 py-1">{num(r.presented_Students)}</td><td className="px-2 py-1">{num(r.no_oof_answerpaper_uploaded)}</td></tr>)}</tbody>
              </table>
            </div>
          </div>

          <div className="app-card p-3 space-y-2">
            <h3 className="app-card-title border-b border-amber-200 pb-2">Group Wise List ({examName} / {formatDate(examDate || '1990-01-01')})</h3>
            <div className="w-full max-w-sm"><Input placeholder="Search" value={searchGroup} onChange={(e) => setSearchGroup(e.target.value)} className="h-8 text-[12px]" /></div>
            <div className="overflow-auto rounded border max-h-[300px]">
              <table className="w-full text-[12px]">
                <thead className="bg-muted/40"><tr><th className="px-2 py-1 text-left">SI.No</th><th className="px-2 py-1 text-left">Course Year</th><th className="px-2 py-1 text-left">Group</th><th className="px-2 py-1 text-left">Total Students</th><th className="px-2 py-1 text-left">Attendance Marked</th><th className="px-2 py-1 text-left">Attendance Not Marked</th><th className="px-2 py-1 text-left">Presented Students</th><th className="px-2 py-1 text-left">No.of.Answerpaper Uploaded</th></tr></thead>
                <tbody>{filteredGroup.map((r, i) => <tr key={`g-${txt(r.course_year_code)}-${txt(r.group_code)}-${num(r.total_students)}`} className="border-t"><td className="px-2 py-1">{i + 1}</td><td className="px-2 py-1">{txt(r.course_year_code)}</td><td className="px-2 py-1">{txt(r.group_code)}</td><td className="px-2 py-1">{num(r.total_students)}</td><td className="px-2 py-1">{num(r.attendance_marked)}</td><td className="px-2 py-1">{num(r.attendance_not_marked)}</td><td className="px-2 py-1">{num(r.presented_Students)}</td><td className="px-2 py-1">{num(r.no_oof_answerpaper_uploaded)}</td></tr>)}</tbody>
              </table>
            </div>
          </div>

          <div className="app-card p-3 space-y-2">
            <h3 className="app-card-title border-b border-amber-200 pb-2">Detail List ({examName} / {formatDate(examDate || '1990-01-01')})</h3>
            <div className="w-full max-w-sm"><Input placeholder="Search" value={searchDetail} onChange={(e) => setSearchDetail(e.target.value)} className="h-8 text-[12px]" /></div>
            <div className="overflow-auto rounded border max-h-[400px]">
              <table className="w-full text-[12px]">
                <thead className="bg-muted/40"><tr><th className="px-2 py-1 text-left">SI.No</th><th className="px-2 py-1 text-left">Course Year</th><th className="px-2 py-1 text-left">Hallticket Number</th><th className="px-2 py-1 text-left">Student Name</th><th className="px-2 py-1 text-left">Subject</th><th className="px-2 py-1 text-left">Invigilator</th><th className="px-2 py-1 text-left">Room</th><th className="px-2 py-1 text-left">Attendance</th><th className="px-2 py-1 text-left">Answer Paper Uploaded</th></tr></thead>
                <tbody>{filteredDetail.map((r, i) => <tr key={`d-${txt(r.hallticket_number)}-${txt(r.student_name)}-${txt(r.subject_name)}`} className="border-t"><td className="px-2 py-1">{i + 1}</td><td className="px-2 py-1">{txt(r.course_year_code)}</td><td className="px-2 py-1">{txt(r.hallticket_number)}</td><td className="px-2 py-1">{txt(r.student_name)}</td><td className="px-2 py-1">{txt(r.subject_name)}</td><td className="px-2 py-1">{txt(r.invigilator_emp_name)}</td><td className="px-2 py-1">{txt(r.room_name)}</td><td className="px-2 py-1">{txt(r.is_present_lbl)}</td><td className="px-2 py-1">{num(r.is_answerpaper_uploaded) === 1 ? 'Completed' : 'Pending'}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  )
}

