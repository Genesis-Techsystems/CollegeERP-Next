'use client'

import { useEffect, useMemo, useState } from 'react'
import { FilteredPage } from '@/components/layout'
import { GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/common/components/select'
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

/** Normalize exam_date for compare (ISO datetime vs YYYY-MM-DD). */
const examDateKey = (value: unknown): string => {
  const raw = txt(value)
  if (!raw) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function sessionIdOf(row: AnyRow): number {
  return num(
    row.fk_exam_session_id ??
      row.examSessionId ??
      row.exam_session_id ??
      row.sessionId,
  )
}

function sessionLabelOf(row: AnyRow): string {
  const name = txt(
    row.exam_session_name ??
      row.examSessionName ??
      row.examsessioninCatCode ??
      row.session_name ??
      row.session,
  )
  const time = txt(row.session_time ?? row.sessionTime ?? row.start_time)
  return time ? `${name} (${time})` : name || 'Session'
}

function timetableIdOf(row: AnyRow): number {
  return num(
    row.fk_exam_timetable_id ??
      row.examTimetableId ??
      row.exam_timetable_id ??
      row.timetableId,
  )
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
  // Exam dates + sessions come from univ_exam_rest_in_tt (restRows), not baseRows.
  const examDates = useMemo(
    () =>
      dedupeBy(restRows, (r) => examDateKey(r.exam_date ?? r.examDate))
        .map((r) => examDateKey(r.exam_date ?? r.examDate))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [restRows],
  )
  const sessions = useMemo(
    () =>
      dedupeBy(
        restRows.filter(
          (r) =>
            examDateKey(r.exam_date ?? r.examDate) === examDateKey(examDate) &&
            sessionIdOf(r) > 0,
        ),
        (r) => sessionIdOf(r),
      ),
    [restRows, examDate],
  )
  const courseOptions = useMemo(() => courses.map((c) => ({ value: String(num(c.fk_course_id)), label: txt(c.course_code) })), [courses])
  const academicYearOptions = useMemo(() => academicYears.map((a) => ({ value: String(num(a.fk_academic_year_id)), label: txt(a.academic_year) })), [academicYears])
  const examOptions = useMemo(() => exams.map((e) => ({ value: String(num(e.fk_exam_id)), label: `${txt(e.exam_name)} ${txt(e.exam_date)}` })), [exams])
  const examDateOptions = useMemo(() => examDates.map((d) => ({ value: d, label: formatDate(d) })), [examDates])
  const sessionOptions = useMemo(
    () =>
      sessions.map((s) => ({
        value: String(sessionIdOf(s)),
        label: sessionLabelOf(s),
      })),
    [sessions],
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
    setExamSessionId(sessionIdOf(firstSession ?? {}) || null)
    setExamTimetableId(timetableIdOf(firstSession ?? {}) || null)
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
    <FilteredPage
      title="View Answer Sheets"
      filters={(
        <GlobalFilterBarRow>
          <GlobalFilterField label="Course">
            <Select value={courseId ? String(courseId) : null} onChange={(v) => setCourseId(num(v) || null)} options={courseOptions} placeholder="Course" />
          </GlobalFilterField>
          <GlobalFilterField label="Academic Year">
            <Select value={academicYearId ? String(academicYearId) : null} onChange={(v) => setAcademicYearId(num(v) || null)} options={academicYearOptions} placeholder="Academic Year" />
          </GlobalFilterField>
          <GlobalFilterField label="Exam">
            <Select value={examId ? String(examId) : null} onChange={(v) => setExamId(num(v) || null)} options={examOptions} placeholder="Exam" searchable />
          </GlobalFilterField>
          <GlobalFilterField label="Exam Date">
            <Select value={examDate || null} onChange={(v) => setExamDate(v ?? '')} options={examDateOptions} placeholder="Exam Date" />
          </GlobalFilterField>
          <GlobalFilterField label="Exam Session">
            <Select
              value={examSessionId ? String(examSessionId) : null}
              onChange={(v) => {
                const id = num(v)
                setExamSessionId(id || null)
                const row = sessions.find((s) => sessionIdOf(s) === id)
                setExamTimetableId(timetableIdOf(row ?? {}) || null)
              }}
              options={sessionOptions}
              placeholder="Exam Session"
            />
          </GlobalFilterField>
          <GlobalFilterField label="Action" className="global-filter-field--shrink global-filter-field--action">
            <Button type="button" className="h-[30px] px-3 text-[12px]" onClick={getList} disabled={loading || !examTimetableId}>Get List</Button>
          </GlobalFilterField>
        </GlobalFilterBarRow>
      )}
    >
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
    </FilteredPage>
  )
}

