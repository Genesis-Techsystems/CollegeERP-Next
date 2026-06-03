'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  getExamLabTimetableGrid,
  getLabCreateFilters,
  saveExamLabTimetableBatches,
} from '@/services/exam-lab-timetable'
import { PageContainer, PageHeader } from '@/components/layout'
import { toDateStr, toDateOnlyISO } from '@/common/generic-functions'

type AnyRow = Record<string, any>

export default function AddExamLabTimetablesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const empId = 31754
  const orgId = 0

  const pageParams = {
    collegeId: Number(searchParams.get('collegeId') ?? 0),
    courseId: Number(searchParams.get('courseId') ?? 0),
    courseYearId: Number(searchParams.get('courseYearId') ?? 0),
    academicYearId: Number(searchParams.get('academicYearId') ?? 0),
    examId: Number(searchParams.get('examId') ?? 0),
    courseYearName: String(searchParams.get('courseYearName') ?? ''),
  }

  const [details, setDetails] = useState<AnyRow[]>([])
  const [sessions, setSessions] = useState<AnyRow[]>([])
  const [existingRows, setExistingRows] = useState<AnyRow[]>([])

  const [examDate, setExamDate] = useState<string>('')
  const [examSessionId, setExamSessionId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)

  const [courseGroupYears, setCourseGroupYears] = useState<AnyRow[]>([])
  const [selectedCourseYears, setSelectedCourseYears] = useState<AnyRow[]>([])
  const [staged, setStaged] = useState<AnyRow[]>([])

  useEffect(() => {
    async function load() {
      const res = await getLabCreateFilters({
        orgId,
        collegeId: pageParams.collegeId,
        courseId: pageParams.courseId,
        courseYearId: pageParams.courseYearId,
        academicYearId: pageParams.academicYearId,
        examId: pageParams.examId,
        empId,
      }).catch(() => ({ details: [], sessions: [] }))
      setDetails(res.details ?? [])
      const sess = dedupeBy((res.sessions ?? []).map((s: AnyRow) => ({
        examSessionId: s.fk_exam_session_id,
        examSessionName: s.exam_display_session_name,
        examsessioninCatCode: s.examsessioninCatCode ?? s.examsessionin_cat_code,
        sessionStartTime: s.session_start_time,
        sessionEndTime: s.session_end_time,
      })), 'examSessionId')
      setSessions(sess)
      if (sess[0]?.examSessionId) setExamSessionId(Number(sess[0].examSessionId))

      const examMeta = (res.details ?? [])[0]
      if (examMeta?.from_date) setExamDate(toDateStr(examMeta.from_date))

      const grid = await getExamLabTimetableGrid({
        orgId,
        collegeId: pageParams.collegeId,
        courseId: pageParams.courseId,
        courseYearId: pageParams.courseYearId,
        examId: pageParams.examId,
        empId,
      }).catch(() => [])
      setExistingRows(Array.isArray(grid) ? grid : [])
    }
    load()
  }, [])

  const regulations = useMemo(
    () => dedupeBy(details.map((d) => ({ regulationId: d.fk_regulation_id, regulationName: d.regulation_code })), 'regulationId'),
    [details],
  )

  useEffect(() => {
    if (regulations[0]?.regulationId) setRegulationId(Number(regulations[0].regulationId))
  }, [regulations])

  const subjects = useMemo(() => {
    if (!regulationId) return []
    return dedupeBy(
      details
        .filter((d) => Number(d.fk_regulation_id) === Number(regulationId) && String(d.subject_type).toUpperCase() === 'LAB')
        .map((d) => ({
          subjectId: d.fk_subject_id,
          subjectName: d.subject_name,
          subjectCode: d.subject_code,
          subjectType: d.subject_type,
        })),
      'subjectId',
    )
  }, [details, regulationId])

  useEffect(() => {
    if (subjects[0]?.subjectId) setSubjectId(Number(subjects[0].subjectId))
  }, [subjects])

  useEffect(() => {
    if (!subjectId) {
      setCourseGroupYears([])
      setSelectedCourseYears([])
      return
    }
    const selectedSub = subjects.find((s) => Number(s.subjectId) === Number(subjectId))
    const list = details.filter(
      (d) =>
        d.subject_code === selectedSub?.subjectCode &&
        d.fk_eaxm_labbatch_id != null,
    )
    const out = list
      .map((d) => ({
        key: `${d.fk_course_group_id}-${d.fk_eaxm_labbatch_id}-${d.fk_examtype_catdet_id}`,
        courseGroupId: d.fk_course_group_id,
        groupName: d.group_code,
        subjectName: d.subject_name,
        subjecttypeName: d.subject_type,
        regulationName: d.regulation_code,
        reg: d.examTypeCatCode,
        batch: d.labbatch_name,
        examLabBatchesId: d.fk_eaxm_labbatch_id,
        examTimetableDetId: d.fk_exam_timetable_det_id,
        examTypeCatId: d.fk_examtype_catdet_id,
        checked: false,
      }))
      .sort((a, b) => String(a.groupName).localeCompare(String(b.groupName)))
    setCourseGroupYears(out)
    setSelectedCourseYears([])
  }, [subjectId, details, subjects])

  function toggleGroup(key: string, checked: boolean) {
    const next = courseGroupYears.map((g) => (g.key === key ? { ...g, checked } : g))
    setCourseGroupYears(next)
    setSelectedCourseYears(next.filter((g) => g.checked))
  }

  function addGroups() {
    if (!examSessionId || !examDate || selectedCourseYears.length === 0) return
    if (staged.length > 0) {
      alert('Save with only one row at a time.')
      return
    }
    const session = sessions.find((s) => Number(s.examSessionId) === Number(examSessionId))
    const toAdd = selectedCourseYears.map((g) => ({
      eaxmLabBatchId: g.examLabBatchesId,
      examDate,
      examSessionId,
      session: session?.examsessioninCatCode ?? session?.examSessionName ?? '',
      sessionStartTime: session?.sessionStartTime ?? null,
      sessionEndTime: session?.sessionEndTime ?? null,
      isActive: true,
      reason: null,
      groupName: g.groupName,
      subjectName: g.subjectName,
      subjecttypeName: g.subjecttypeName,
      batch: g.batch,
      reg: g.reg,
      examTimetableDetId: g.examTimetableDetId,
    }))
    setStaged(toAdd)
    setCourseGroupYears((prev) => prev.map((g) => ({ ...g, checked: false })))
    setSelectedCourseYears([])
  }

  function removeStaged(idx: number) {
    setStaged((s) => s.filter((_, i) => i !== idx))
  }

  async function save() {
    if (staged.length === 0) return
    const res = await saveExamLabTimetableBatches(staged).catch(() => null)
    if (res?.success === false) {
      alert(res.message ?? 'Save failed')
      return
    }
    alert('Saved')
    setStaged([])
    const grid = await getExamLabTimetableGrid({
      orgId,
      collegeId: pageParams.collegeId,
      courseId: pageParams.courseId,
      courseYearId: pageParams.courseYearId,
      examId: pageParams.examId,
      empId,
    }).catch(() => [])
    setExistingRows(Array.isArray(grid) ? grid : [])
  }

  const dateColumns = useMemo(() => {
    const first = details[0]
    if (!first?.from_date || !first?.to_date) return []
    const out: Date[] = []
    const cur = new Date(first.from_date)
    const end = new Date(first.to_date)
    while (cur <= end) {
      out.push(new Date(cur))
      cur.setDate(cur.getDate() + 1)
    }
    return out
  }, [details])

  const groupCodes = useMemo(() => dedupeBy(details.map((d) => ({ code: d.group_code, id: d.fk_course_group_id })), 'id'), [details])
  const matrix = useMemo(() => {
    const map: Record<string, AnyRow[]> = {}
    for (const r of existingRows) {
      const code = String(r.group_code ?? r.groupCode ?? '')
      if (!map[code]) map[code] = []
      map[code].push(r)
    }
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    return groupCodes.map((g) => ({
      code: g.code,
      cells: dateColumns.map((d) => {
        const ymd = toDateOnlyISO(d)
        const rows = (map[g.code] ?? []).filter((r) => toDateStr(r.examDate) === ymd)
        return { date: d, day: days[d.getDay()], rows }
      }),
    }))
  }, [existingRows, groupCodes, dateColumns])

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Create College Timetable" subtitle="Schedule lab exam timetables" />
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">Create College Timetable</h2>
        </div>
        <div className="p-3 space-y-3">
        {details[0] && (
          <div className="rounded-md border bg-muted/40/50 px-3 py-2 text-[12px]">
            <span className="font-medium">
              {details[0]?.college_code ?? ''} / {details[0]?.course_code ?? ''} / {pageParams.courseYearName}
            </span>{' '}
            - ({details[0]?.exam_name ?? ''}{' '}
            {details[0]?.from_date ? `(${toDateStr(details[0]?.from_date)} - ${toDateStr(details[0]?.to_date)})` : ''})
            <span className="text-blue-700 ml-1">
              {details[0]?.is_internal_exam ? '[Internal] ' : ''}
              {details[0]?.is_regular_exam ? '[Regular] ' : ''}
              {details[0]?.is_supply_exam ? '[Supple]' : ''}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
          <div className="space-y-1">
            <Label>Exam Date</Label>
            <Input type="date" className="h-8 text-[12px]" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Exam Session</Label>
            <Select value={examSessionId ? String(examSessionId) : undefined} onValueChange={(v) => setExamSessionId(Number(v))}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Exam Session" /></SelectTrigger>
              <SelectContent>{sessions.map((s, i) => <SelectItem key={`s-${s.examSessionId ?? i}`} value={String(s.examSessionId)}>{s.examSessionName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Regulation</Label>
            <Select value={regulationId ? String(regulationId) : undefined} onValueChange={(v) => setRegulationId(Number(v))}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Regulation" /></SelectTrigger>
              <SelectContent>{regulations.map((r, i) => <SelectItem key={`r-${r.regulationId ?? i}`} value={String(r.regulationId)}>{r.regulationName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Subject</Label>
            <Select value={subjectId ? String(subjectId) : undefined} onValueChange={(v) => setSubjectId(Number(v))}>
              <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Subject" /></SelectTrigger>
              <SelectContent>
                {subjects.map((s, i) => (
                  <SelectItem key={`sub-${s.subjectId ?? i}`} value={String(s.subjectId)}>
                    {s.subjectCode} - {s.subjectName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {(courseGroupYears.length > 0 || staged.length > 0) && (
          <div className="grid grid-cols-12 gap-2 items-start">
            <div className="col-span-3 rounded-md border">
              <div className="px-3 py-2 bg-muted/40 border-b text-[12px] font-medium">Select Course Group</div>
              <div className="p-2 space-y-1 max-h-72 overflow-auto text-[12px]">
                {courseGroupYears.map((g) => (
                  <label key={g.key} className="flex items-center gap-2">
                    <input type="checkbox" checked={!!g.checked} onChange={(e) => toggleGroup(g.key, e.target.checked)} />
                    <span>{g.groupName} <span className="text-blue-700">({g.reg})</span> {g.batch ? <span className="text-blue-700">({g.batch})</span> : null}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="col-span-2 rounded-md border">
              <div className="px-3 py-2 bg-muted/40 border-b text-[12px] font-medium">Selected Course Groups</div>
              <div className="p-2 space-y-1 min-h-32 text-[12px]">
                {selectedCourseYears.map((g) => (
                  <div key={`sel-${g.key}`}>{g.groupName} <span className="text-blue-700">({g.reg})</span> {g.batch ? <span className="text-blue-700">({g.batch})</span> : null}</div>
                ))}
              </div>
              <div className="p-2">
                <Button className="h-8 text-[12px]" onClick={addGroups} disabled={selectedCourseYears.length === 0}>Add</Button>
              </div>
            </div>
            <div className="col-span-7 rounded-md border w-full">
              <div className="px-3 py-2 bg-muted/40 border-b text-[12px] font-medium">
                {staged[0]?.session} {staged[0]?.sessionStartTime ? `(${staged[0]?.sessionStartTime} - ${staged[0]?.sessionEndTime})` : ''}
              </div>
              <div className="overflow-auto">
                <table className="w-full min-w-[780px] text-[12px]">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-2 py-1 text-left">SI.No</th>
                      <th className="px-2 py-1 text-left">Exam Date</th>
                      <th className="px-2 py-1 text-left">Group</th>
                      <th className="px-2 py-1 text-left">Subject</th>
                      <th className="px-2 py-1 text-left">Exam Type</th>
                      <th className="px-2 py-1 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staged.map((r, i) => (
                      <tr key={`st-${i}`}>
                        <td className="px-2 py-1">{i + 1}</td>
                        <td className="px-2 py-1">{r.examDate}</td>
                        <td className="px-2 py-1">{r.groupName}</td>
                        <td className="px-2 py-1">{r.subjectName} <span className="text-muted-foreground">({r.subjecttypeName})</span> {r.batch ? <span className="text-muted-foreground">({r.batch})</span> : null}</td>
                        <td className="px-2 py-1">{r.reg}</td>
                        <td className="px-2 py-1"><Button variant="ghost" size="sm" onClick={() => removeStaged(i)}>Remove</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button className="h-8 text-[12px]" onClick={save} disabled={staged.length === 0}>Save</Button>
        </div>
        </div>
      </div>

      {existingRows.length > 0 && (
        <div className="app-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/40">
            <h3 className="app-card-title">View Exam Lab Timetable</h3>
          </div>
          <div className="p-3">
          <div className="overflow-auto">
            <table className="w-full text-[12px] border">
              <thead className="bg-muted/40">
                <tr>
                  <th className="border px-2 py-1">Branch</th>
                  {dateColumns.map((d) => (
                    <th className="border px-2 py-1" key={d.toISOString()}>
                      {d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                      <div className="text-blue-600">({['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()]})</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((g) => (
                  <tr key={g.code}>
                    <td className="border px-2 py-1 text-blue-700">{g.code}</td>
                    {g.cells.map((c) => (
                      <td className="border px-2 py-1 align-top" key={`${g.code}-${c.date.toISOString()}`}>
                        {c.rows.map((r: AnyRow, i: number) => (
                          <p key={`x-${i}`} className={`mb-1 p-1 rounded ${String(r.examsessioninCatCode).toUpperCase() === 'AFTERNOON' ? 'bg-yellow-100' : 'bg-sky-100'}`}>
                            {r.subjectCode} {r.examLabBatchName ? `(${r.examLabBatchName})` : ''}
                            <span className="ml-1 text-[10px]">
                              {String(r.examTypeCatCode ?? '').toLowerCase() === 'regular'
                                ? 'R'
                                : String(r.examTypeCatCode ?? '').toLowerCase() === 'supple'
                                ? 'S'
                                : String(r.examTypeCatCode ?? '').toLowerCase() === 'internal'
                                ? 'I'
                                : String(r.examTypeCatCode ?? '').slice(0, 1)}
                            </span>
                          </p>
                        ))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          variant="outline"
          className="h-8 text-[12px]"
          onClick={() =>
            router.push(
              `/admin-examination-management/admin-exam-masters/exam-lab-timetable?collegeId=${pageParams.collegeId}&courseId=${pageParams.courseId}&courseYearId=${pageParams.courseYearId}&academicYearId=${pageParams.academicYearId}&examId=${pageParams.examId}`,
            )
          }
        >
          Back
        </Button>
      </div>
    </PageContainer>
  )
}

function dedupeBy<T extends Record<string, any>>(arr: T[], key: string): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of arr) {
    const v = String(item?.[key] ?? '')
    if (!v || seen.has(v)) continue
    seen.add(v)
    out.push(item)
  }
  return out
}

