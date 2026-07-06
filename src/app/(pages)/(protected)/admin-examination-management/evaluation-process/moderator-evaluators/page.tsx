'use client'

import { useEffect, useMemo, useState } from 'react'
import { Filter } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Select as SearchableSelect } from '@/common/components/select'
import type { SelectOption } from '@/common/components/select'
import { SearchInput } from '@/common/components/search'
import {
  addMultipleEvaluators,
  getModeratorEvaluatorProfiles,
  getRegSupBaseFilters,
  getRegSupRestFilters,
  getRegSupSubjectFilters,
  listModeratorEvaluationMapping,
} from '@/services/evaluation'
import { dedupeBy, num, txt } from '@/common/utils/data-helpers'

type AnyRow = Record<string, unknown>

export default function ModeratorEvaluatorsPage() {
  const [loading, setLoading] = useState(false)
  const [filterOpen, setFilterOpen] = useState(true)
  const [showPanel, setShowPanel] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [baseRows, setBaseRows] = useState<AnyRow[]>([])
  const [restRows, setRestRows] = useState<AnyRow[]>([])
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([])
  const [moderatorRows, setModeratorRows] = useState<AnyRow[]>([])
  const [availableRows, setAvailableRows] = useState<AnyRow[]>([])
  const [mappedRows, setMappedRows] = useState<AnyRow[]>([])

  const [selectedEvaluatorIds, setSelectedEvaluatorIds] = useState<number[]>([])
  const [checkAll, setCheckAll] = useState(false)

  const [searchAvailable, setSearchAvailable] = useState('')

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)
  const [examModeratorId, setExamModeratorId] = useState<number>(0)

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
  const courseYears = useMemo(() => dedupeBy(restRows, (r) => num(r.fk_course_year_id)), [restRows])
  const regulations = useMemo(
    () => dedupeBy(restRows.filter((r) => num(r.fk_course_year_id) === num(courseYearId)), (r) => num(r.fk_regulation_id)),
    [restRows, courseYearId],
  )
  const subjects = useMemo(() => dedupeBy(subjectRows, (r) => num(r.fk_subject_id)), [subjectRows])
  const moderators = useMemo(() => moderatorRows, [moderatorRows])
  const examOptions = useMemo<SelectOption[]>(
    () => exams.map((r) => ({ value: String(num(r.fk_exam_id)), label: txt(r.exam_name) })),
    [exams],
  )
  const subjectOptions = useMemo<SelectOption[]>(
    () =>
      subjects.map((r) => ({
        value: String(num(r.fk_subject_id)),
        label: `${txt(r.subject_name)} - ${txt(r.subject_code)} (${txt(r.regulation_code)})`,
      })),
    [subjects],
  )
  const moderatorOptions = useMemo<SelectOption[]>(
    () => [{ value: '0', label: 'All' }, ...moderators.map((m) => ({ value: String(num(m.examEvaluatorProfileId)), label: txt(m.evaluatorName) }))],
    [moderators],
  )

  const filteredAvailable = useMemo(() => {
    const q = searchAvailable.trim().toLowerCase()
    if (!q) return availableRows
    return availableRows.filter((r) => `${txt(r.evaluator_name)} ${txt(r.email)}`.toLowerCase().includes(q))
  }, [availableRows, searchAvailable])

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const [filters, moderatorsList] = await Promise.all([
          getRegSupBaseFilters(employeeId),
          getModeratorEvaluatorProfiles().catch(() => []),
        ])
        setBaseRows(filters)
        setModeratorRows(moderatorsList as AnyRow[])
        setCourseId(num(filters[0]?.fk_course_id) || null)
        if (moderatorsList.length > 0) {
          setExamModeratorId(num((moderatorsList[0] as AnyRow).examEvaluatorProfileId))
        }
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [employeeId])

  useEffect(() => setAcademicYearId(num(academicYears[0]?.fk_academic_year_id) || null), [academicYears])
  useEffect(() => setExamId(num(exams[0]?.fk_exam_id) || null), [exams])
  useEffect(() => setRegulationId(num(regulations[0]?.fk_regulation_id) || null), [regulations])

  useEffect(() => {
    async function loadRest() {
      if (!courseId || !academicYearId || !examId) return
      const rest = await getRegSupRestFilters({ courseId, academicYearId, examId, employeeId })
      setRestRows(rest)
      setCourseYearId(num(rest[0]?.fk_course_year_id) || null)
    }
    void loadRest()
  }, [courseId, academicYearId, examId, employeeId])

  useEffect(() => {
    async function loadSubjects() {
      if (!courseId || !academicYearId || !examId || !courseYearId || !regulationId) return
      const sub = await getRegSupSubjectFilters({
        courseId,
        academicYearId,
        examId,
        courseYearId,
        regulationId,
        employeeId,
      })
      setSubjectRows(sub)
      setSubjectId(num(sub[0]?.fk_subject_id) || null)
    }
    void loadSubjects()
  }, [courseId, academicYearId, examId, courseYearId, regulationId, employeeId])

  function resetLists() {
    setShowPanel(false)
    setAvailableRows([])
    setMappedRows([])
    setSelectedEvaluatorIds([])
    setCheckAll(false)
  }

  async function getList() {
    if (!courseId || !academicYearId || !examId || !courseYearId || !regulationId || !subjectId) return
    setLoading(true)
    setErrorMsg('')
    resetLists()
    try {
      const rows = await listModeratorEvaluationMapping({
        organizationId: organizationId || 1,
        examId,
        courseYearId,
        subjectId,
        regulationId,
        courseId,
        academicYearId,
        employeeId,
        moderatorProfileId: examModeratorId,
      })
      setAvailableRows(rows.filter((r) => num(r.is_mapped) === 0))
      setMappedRows(rows.filter((r) => num(r.is_mapped) === 1))
      setShowPanel(true)
    } finally {
      setLoading(false)
    }
  }

  function toggleOne(id: number, checked: boolean) {
    setSelectedEvaluatorIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)))
  }

  function toggleAll(checked: boolean) {
    setCheckAll(checked)
    setSelectedEvaluatorIds(checked ? filteredAvailable.map((r) => num(r.pk_exam_evaluator_profile_id)).filter((id) => id > 0) : [])
  }

  async function assign() {
    if (!examId || !subjectId || selectedEvaluatorIds.length === 0) return
    if (!examModeratorId) {
      setErrorMsg('Please select a specific Moderator Name instead of All before assigning.')
      return
    }
    setErrorMsg('')
    const payload = selectedEvaluatorIds.map((evaluatorProfileId) => ({
      examId,
      subjectId,
      moderatorProfileId: examModeratorId,
      evaluatorProfileId,
      isActive: true,
      reason: null,
    }))
    setLoading(true)
    try {
      await addMultipleEvaluators(payload)
      await getList()
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Failed to assign evaluators.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedEvaluatorIds.length !== filteredAvailable.length) setCheckAll(false)
  }, [selectedEvaluatorIds, filteredAvailable.length])

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Moderator Evaluator" subtitle="Map available evaluators to moderator profile" />

      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
          <h2 className="app-card-title">Moderator Evaluator</h2>
          <Button type="button" variant="outline" size="sm" className="h-6 px-2.5 text-[12px]" onClick={() => setFilterOpen((v) => !v)}>
            <Filter className="mr-1.5 h-3.5 w-3.5" /> Filter
          </Button>
        </div>
        {(
          <div className="p-3 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-2 space-y-1"><Label>Course</Label><Select value={courseId ? String(courseId) : undefined} onValueChange={(v) => { setCourseId(num(v) || null); resetLists() }}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course" /></SelectTrigger><SelectContent>{courses.map((r) => <SelectItem key={String(num(r.fk_course_id))} value={String(num(r.fk_course_id))}>{txt(r.course_code)}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-2 space-y-1"><Label>Academic Year</Label><Select value={academicYearId ? String(academicYearId) : undefined} onValueChange={(v) => { setAcademicYearId(num(v) || null); resetLists() }}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Academic Year" /></SelectTrigger><SelectContent>{academicYears.map((r) => <SelectItem key={String(num(r.fk_academic_year_id))} value={String(num(r.fk_academic_year_id))}>{txt(r.academic_year)}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-4 space-y-1">
                <Label>Exam</Label>
                <SearchableSelect
                  value={examId ? String(examId) : null}
                  onChange={(v) => {
                    setExamId(num(v) || null)
                    resetLists()
                  }}
                  options={examOptions}
                  placeholder="Search exam…"
                  searchable
                />
              </div>
              <div className="md:col-span-2 space-y-1"><Label>Course Year</Label><Select value={courseYearId ? String(courseYearId) : undefined} onValueChange={(v) => { setCourseYearId(num(v) || null); resetLists() }}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Course Year" /></SelectTrigger><SelectContent>{courseYears.map((r) => <SelectItem key={String(num(r.fk_course_year_id))} value={String(num(r.fk_course_year_id))}>{txt(r.course_year_code)}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-2 space-y-1"><Label>Regulation</Label><Select value={regulationId ? String(regulationId) : undefined} onValueChange={(v) => { setRegulationId(num(v) || null); resetLists() }}><SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Regulation" /></SelectTrigger><SelectContent>{regulations.map((r) => <SelectItem key={String(num(r.fk_regulation_id))} value={String(num(r.fk_regulation_id))}>{txt(r.regulation_code)}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-4 space-y-1">
                <Label>Subject</Label>
                <SearchableSelect
                  value={subjectId ? String(subjectId) : null}
                  onChange={(v) => {
                    setSubjectId(num(v) || null)
                    resetLists()
                  }}
                  options={subjectOptions}
                  placeholder="Search subjects…"
                  searchable
                />
              </div>
              <div className="md:col-span-4 space-y-1">
                <Label>Moderator Name</Label>
                <SearchableSelect
                  value={String(examModeratorId)}
                  onChange={(v) => {
                    setExamModeratorId(num(v))
                    resetLists()
                  }}
                  options={moderatorOptions}
                  placeholder="Search names…"
                  searchable
                />
              </div>
              <div className="md:col-span-2 flex justify-end"><Button type="button" onClick={getList} disabled={loading}>Get List</Button></div>
            </div>
          </div>
        )}
      </div>

      {showPanel && (
        <>
          <div className="app-card p-3 space-y-3">
            {errorMsg && <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{errorMsg}</div>}
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-blue-700">Available Evaluator</h3>
              {availableRows.length > 0 && (
                <Button
                  type="button"
                  onClick={assign}
                  disabled={loading || selectedEvaluatorIds.length === 0 || examModeratorId === 0}
                  title={examModeratorId === 0 ? 'Select a specific Moderator Name to assign' : undefined}
                >
                  Assign
                </Button>
              )}
            </div>
            <SearchInput placeholder="Search evaluators…" value={searchAvailable} onChange={setSearchAvailable} className="w-full max-w-sm" />
            <div className="overflow-auto rounded border">
              <table className="w-full text-[12px]">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-2 py-1 text-left">
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={checkAll} onChange={(e) => toggleAll(e.target.checked)} />
                        <span>All</span>
                      </label>
                    </th>
                    <th className="px-2 py-1 text-left">SI.No</th>
                    <th className="px-2 py-1 text-left">Evaluator Name</th>
                    <th className="px-2 py-1 text-left">Evaluator Email</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAvailable.map((row, i) => {
                    const id = num(row.pk_exam_evaluator_profile_id)
                    return (
                      <tr key={`${id}-${i}`} className="border-t">
                        <td className="px-2 py-1"><input type="checkbox" checked={selectedEvaluatorIds.includes(id)} onChange={(e) => toggleOne(id, e.target.checked)} /></td>
                        <td className="px-2 py-1">{i + 1}</td>
                        <td className="px-2 py-1">{txt(row.evaluator_name)}</td>
                        <td className="px-2 py-1">{txt(row.email)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {mappedRows.length > 0 && (
            <div className="app-card p-3 space-y-3">
              <h3 className="text-[14px] font-semibold text-blue-700">Mapped Evaluator List</h3>
              <div className="overflow-auto rounded border">
                <table className="w-full text-[12px]">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-2 py-1 text-left">SI.No</th>
                      <th className="px-2 py-1 text-left">Evaluator Name</th>
                      <th className="px-2 py-1 text-left">Evaluator Email</th>
                      <th className="px-2 py-1 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappedRows.map((row, i) => (
                      <tr key={`${num(row.pk_exam_evaluator_profile_id)}-${i}`} className="border-t">
                        <td className="px-2 py-1">{i + 1}</td>
                        <td className="px-2 py-1">{txt(row.evaluator_name)}</td>
                        <td className="px-2 py-1">{txt(row.email)}</td>
                        <td className="px-2 py-1">{num(row.is_active) === 1 || row.is_active === true ? 'Active' : 'InActive'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </PageContainer>
  )
}

