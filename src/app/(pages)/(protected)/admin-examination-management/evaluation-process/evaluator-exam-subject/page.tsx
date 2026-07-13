'use client'

import { useEffect, useMemo, useState } from 'react'
import { FilteredPage } from '@/components/layout'
import { GlobalFilterBarRow, GlobalFilterField } from '@/common/components/forms'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/common/components/search'
import { Select } from '@/common/components/select'
import { addExamEvaluators, runEvaluationProc } from '@/services/evaluation-process-admin'
import { getUnivExamFiltersByType } from '@/services/pre-examination'

type AnyRow = Record<string, any>

const num = (value: unknown) => {
  const out = Number(value ?? 0)
  return Number.isFinite(out) ? out : 0
}
const txt = (value: unknown) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}
const dedupeBy = <T,>(rows: T[], keyFn: (row: T) => number | string) => {
  const seen = new Set<number | string>()
  return rows.filter((row) => {
    const key = keyFn(row)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export default function EvaluatorExamSubjectPage() {
  const [loading, setLoading] = useState(false)
  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([])
  const [configuredRows, setConfiguredRows] = useState<AnyRow[]>([])
  const [notConfiguredRows, setNotConfiguredRows] = useState<AnyRow[]>([])
  const [selectedEvaluatorIds, setSelectedEvaluatorIds] = useState<number[]>([])
  const [selectedCollegeIds, setSelectedCollegeIds] = useState<number[]>([])
  const [search, setSearch] = useState('')

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)

  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)
  const organizationId = Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)

  const courses = useMemo(() => dedupeBy(baseRows, (r) => num(r.fk_course_id)), [baseRows])
  const academicYears = useMemo(
    () => dedupeBy(baseRows.filter((r) => num(r.fk_course_id) === num(courseId)), (r) => num(r.fk_academic_year_id)),
    [baseRows, courseId],
  )
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => num(r.fk_course_id) === num(courseId) && num(r.fk_academic_year_id) === num(academicYearId)),
        (r) => num(r.fk_exam_id),
      ),
    [baseRows, courseId, academicYearId],
  )
  const courseYears = useMemo(
    () => dedupeBy(restRows, (r) => num(r.fk_course_year_id)),
    [restRows],
  )
  const regulations = useMemo(
    () => dedupeBy(restRows.filter((r) => num(r.fk_course_year_id) === num(courseYearId)), (r) => num(r.fk_regulation_id)),
    [restRows, courseYearId],
  )
  const subjects = useMemo(
    () => dedupeBy(subjectRows, (r) => num(r.fk_subject_id)),
    [subjectRows],
  )
  const courseOptions = useMemo(() => courses.map((r) => ({ value: String(num(r.fk_course_id)), label: txt(r.course_code) })), [courses])
  const academicYearOptions = useMemo(() => academicYears.map((r) => ({ value: String(num(r.fk_academic_year_id)), label: txt(r.academic_year) })), [academicYears])
  const examOptions = useMemo(() => exams.map((r) => ({ value: String(num(r.fk_exam_id)), label: txt(r.exam_name) })), [exams])
  const courseYearOptions = useMemo(() => courseYears.map((r) => ({ value: String(num(r.fk_course_year_id)), label: txt(r.course_year_code) })), [courseYears])
  const regulationOptions = useMemo(() => regulations.map((r) => ({ value: String(num(r.fk_regulation_id)), label: txt(r.regulation_code) })), [regulations])
  const subjectOptions = useMemo(
    () => subjects.map((r) => ({ value: String(num(r.fk_subject_id)), label: `${txt(r.subject_name)} - ${txt(r.subject_code)} (${txt(r.regulation_code)})` })),
    [subjects],
  )

  const filteredConfiguredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return configuredRows
    return configuredRows.filter((r) => JSON.stringify(r).toLowerCase().includes(q))
  }, [configuredRows, search])
  const evaluators = useMemo(
    () => dedupeBy(notConfiguredRows, (r) => num(r.pk_exam_evaluator_profile_id)),
    [notConfiguredRows],
  )
  const colleges = useMemo(
    () => dedupeBy(notConfiguredRows, (r) => num(r.fk_college_id)),
    [notConfiguredRows],
  )

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const rows = await getUnivExamFiltersByType(employeeId, 'REGSUP').catch(() => [])
        const list = Array.isArray(rows) ? rows.filter((r) => txt(r.flag) === 'univ_exam_filters' || !r.flag) : []
        setBaseRows(list)
        setCourseId(num(list[0]?.fk_course_id) || null)
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [employeeId])

  useEffect(() => {
    setAcademicYearId(num(academicYears[0]?.fk_academic_year_id) || null)
  }, [academicYears])

  useEffect(() => {
    setExamId(num(exams[0]?.fk_exam_id) || null)
  }, [exams])

  useEffect(() => {
    async function loadRest() {
      if (!courseId || !academicYearId || !examId) return
      const data = await runEvaluationProc<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
        in_flag: 'univ_exam_rest_in_regexamstd',
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
      }).catch(() => ({ result: [] }))
      const groups = data?.result ?? []
      const rest = groups.find((g) => txt(g?.[0]?.flag) === 'univ_exam_rest_filters') ?? []
      setRestRows(rest)
      setCourseYearId(num(rest[0]?.fk_course_year_id) || null)
    }
    void loadRest()
  }, [courseId, academicYearId, examId, employeeId])

  useEffect(() => {
    setRegulationId(num(regulations[0]?.fk_regulation_id) || null)
  }, [regulations])

  useEffect(() => {
    async function loadSubjects() {
      if (!courseId || !academicYearId || !examId || !courseYearId || !regulationId) return
      const data = await runEvaluationProc<{ result: AnyRow[][] }>('s_get_exam_filters_bycode', {
        in_flag: 'univ_exam_subject_regexamstd',
        in_flag_type: 'REGSUP',
        in_university_id: 0,
        in_univ_examcenter_id: 0,
        in_college_id: 0,
        in_course_id: courseId,
        in_course_group_id: 0,
        in_course_year_id: courseYearId,
        in_exam_id: examId,
        in_academic_year_id: academicYearId,
        in_regulation_id: regulationId,
        in_sub_flag_type: 'NoLAB',
        in_subject_id: 0,
        in_param1: 0,
        in_param2: 0,
        in_loginuser_roleid: 0,
        in_loginuser_empid: employeeId,
      }).catch(() => ({ result: [] }))
      const groups = data?.result ?? []
      const sub = groups.find((g) => txt(g?.[0]?.flag) === 'univ_exam_sub_regexamstd') ?? []
      setSubjectRows(sub)
      setSubjectId(num(sub[0]?.fk_subject_id) || null)
    }
    void loadSubjects()
  }, [courseId, academicYearId, examId, courseYearId, regulationId, employeeId])

  async function onGetList() {
    if (!courseId || !academicYearId || !examId || !courseYearId || !regulationId || !subjectId) return
    setLoading(true)
    try {
      const params = {
        in_flag: 'list_evaluator_subjects',
        in_orgid: organizationId || 1,
        in_fdate: '1990-01-01',
        in_tdate: '1990-01-01',
        in_evalutor_profileid: 0,
        in_exam_date: '1990-01-01',
        in_emp_id: 0,
        in_questionpaper_id: 0,
        in_evaluator_role_id: 0,
        in_academic_year: '',
        in_exam_short_name: '',
        in_affiliatedto_catdet_id: 0,
        in_exam_id: examId,
        in_course_year_id: courseYearId,
        in_subject_id: subjectId,
        in_regulation_id: regulationId,
        in_course_id: courseId,
        in_academic_year_id: academicYearId,
        in_loginuser_empid: employeeId,
      }

      const procCandidates = ['s_get_examevaluation_bycodes', 's_get_examquestionpaper_details']
      let listRows: AnyRow[] = []
      for (const proc of procCandidates) {
        const data = await runEvaluationProc<{ result: AnyRow[][] }>(proc, params).catch(() => ({ result: [] }))
        const first = Array.isArray(data?.result?.[0]) ? data.result[0] : []
        if (first.length > 0) {
          listRows = first
          break
        }
      }
      setConfiguredRows(listRows.filter((r) => num(r.is_configured) === 1))
      setNotConfiguredRows(listRows.filter((r) => num(r.is_configured) !== 1))
      setSelectedCollegeIds([])
      setSelectedEvaluatorIds([])
    } finally {
      setLoading(false)
    }
  }

  async function onAssign() {
    const chosenEvaluators = evaluators.filter((r) => selectedEvaluatorIds.includes(num(r.pk_exam_evaluator_profile_id)))
    const chosenColleges = colleges.filter((r) => selectedCollegeIds.includes(num(r.fk_college_id)))
    const payload: AnyRow[] = []

    for (const evaluator of chosenEvaluators) {
      for (const college of chosenColleges) {
        const timetableIds = txt(college.pk_exam_timetable_det_ids).split(',').map((x) => num(x)).filter((x) => x > 0)
        for (const timetableDetId of timetableIds) {
          payload.push({
            examEvaluatorProfileId: num(evaluator.pk_exam_evaluator_profile_id),
            examTimetableDetId: timetableDetId,
            subjectCode: txt(college.subject_code),
            subjectId: num(college.fk_subject_id),
            studentsAssigned: '',
            evaluationsCompleted: '',
            validityStartDate: new Date().toISOString(),
            validityEndDate: new Date().toISOString(),
            isActive: true,
            reason: '',
            isReevaluation: false,
          })
        }
      }
    }
    if (payload.length === 0) return
    setLoading(true)
    try {
      await addExamEvaluators(payload)
      await onGetList()
    } finally {
      setLoading(false)
    }
  }

  function toggleEvaluator(id: number, checked: boolean) {
    setSelectedEvaluatorIds((s) => (checked ? [...s, id] : s.filter((x) => x !== id)))
  }

  function toggleCollege(id: number, checked: boolean) {
    setSelectedCollegeIds((s) => (checked ? [...s, id] : s.filter((x) => x !== id)))
  }

  return (
    <FilteredPage
      title="Evaluator Exam Subjects"
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
          <GlobalFilterField label="Course Year">
            <Select value={courseYearId ? String(courseYearId) : null} onChange={(v) => setCourseYearId(num(v) || null)} options={courseYearOptions} placeholder="Course Year" />
          </GlobalFilterField>
          <GlobalFilterField label="Regulation">
            <Select value={regulationId ? String(regulationId) : null} onChange={(v) => setRegulationId(num(v) || null)} options={regulationOptions} placeholder="Regulation" />
          </GlobalFilterField>
          <GlobalFilterField label="Subject">
            <Select value={subjectId ? String(subjectId) : null} onChange={(v) => setSubjectId(num(v) || null)} options={subjectOptions} placeholder="Subject" searchable />
          </GlobalFilterField>
          <GlobalFilterField label="Action" className="global-filter-field--shrink global-filter-field--action">
            <Button type="button" className="h-[30px] px-3 text-[12px]" onClick={onGetList} disabled={loading}>Get List</Button>
          </GlobalFilterField>
        </GlobalFilterBarRow>
      )}
    >
      {configuredRows.length > 0 && (
        <div className="app-card p-3 space-y-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="w-full max-w-sm" />
          <div className="overflow-auto rounded border">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/40"><tr><th className="px-2 py-1 text-left">SI.No</th><th className="px-2 py-1 text-left">Evaluator Name</th><th className="px-2 py-1 text-left">Subject</th><th className="px-2 py-1 text-left">College</th><th className="px-2 py-1 text-left">Exam Month Year</th></tr></thead>
              <tbody>{filteredConfiguredRows.map((r, i) => <tr key={`${txt(r.evaluator_name)}-${txt(r.subject_code)}-${txt(r.college_code)}`} className="border-t"><td className="px-2 py-1">{i + 1}</td><td className="px-2 py-1">{txt(r.evaluator_name)}</td><td className="px-2 py-1">{txt(r.subject_code)}</td><td className="px-2 py-1">{txt(r.college_code)}</td><td className="px-2 py-1">{txt(r.exam_month_yr)}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}
      {notConfiguredRows.length > 0 && (
        <div className="app-card p-3 space-y-3">
          <h3 className="app-card-title">List Of Evaluator</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded border p-2">
              <p className="text-[12px] font-semibold mb-2">Evaluators List: <span className="text-blue-700">{evaluators.length}</span></p>
              <div className="max-h-[260px] overflow-auto space-y-1">
                {evaluators.map((e) => {
                  const id = num(e.pk_exam_evaluator_profile_id)
                  const checked = selectedEvaluatorIds.includes(id)
                  return (
                    <label key={id} className="flex items-center gap-2 text-[12px]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(ev) => toggleEvaluator(id, ev.target.checked)}
                      />
                      {txt(e.evaluator_name)}
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="rounded border p-2">
              <p className="text-[12px] font-semibold mb-2">Colleges: <span className="text-blue-700">{colleges.length}</span></p>
              <div className="max-h-[260px] overflow-auto space-y-1">
                {colleges.map((c) => {
                  const id = num(c.fk_college_id)
                  const checked = selectedCollegeIds.includes(id)
                  return (
                    <label key={id} className="flex items-center gap-2 text-[12px]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(ev) => toggleCollege(id, ev.target.checked)}
                      />
                      {txt(c.college_code)}
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="button" onClick={onAssign} disabled={loading || selectedEvaluatorIds.length === 0 || selectedCollegeIds.length === 0}>
              Assign
            </Button>
          </div>
        </div>
      )}
    </FilteredPage>
  )
}

