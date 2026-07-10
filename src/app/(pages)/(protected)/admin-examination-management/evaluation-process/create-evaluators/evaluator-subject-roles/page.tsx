'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, type SelectOption } from '@/common/components/select'
import { toastError, toastSuccess } from '@/lib/toast'
import { listExamLabBatches } from '@/services/exam-lab-batches'
import {
  getAssignSubjectsEvaluatorRoles,
  getEvaluatorSubjectRolesExamFilters,
  getEvaluationModerationRest,
  getEvaluatorSubjectRolesSubjects,
  listEvaluatorProfiles,
  listExamEvaluatorProfileDetails,
  popProfileEmployees,
  setupExamCommittees,
  updateEvaluatorProfile,
} from '@/services/evaluation-process'
import { PageContainer } from '@/components/layout'
import { GlobalFilterBar } from '@/common/components/forms'

type AnyRow = Record<string, any>

const ROLE_EXTRA_FILTER_IDS = new Set([64, 70, 96, 97, 116])

const pickNum = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return 0
  for (const k of keys) {
    const n = Number(row[k])
    if (n > 0) return n
  }
  return 0
}

const pickText = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return ''
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

function dedupeBy<T>(rows: T[], keyFn: (r: T) => string | number) {
  const seen = new Set<string | number>()
  return rows.filter((r) => {
    const key = keyFn(r)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function formatYmd(v: unknown) {
  if (v == null || v === '') return ''
  let raw: string | number | Date = ''
  if (typeof v === 'string' || typeof v === 'number') raw = v
  else if (v instanceof Date) raw = v.getTime()
  if (raw === '') return ''
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ''
  const day = String(d.getDate()).padStart(2, '0')
  const mon = String(d.getMonth() + 1).padStart(2, '0')
  const y = d.getFullYear()
  return `${day}-${mon}-${y}`
}

function roleLabel(roleId: number) {
  const m: Record<number, string> = {
    64: 'Evaluator',
    67: 'Moderator',
    70: 'Exam Question Paper Setter',
    96: 'External Evaluator',
    97: 'Internal Evaluator',
    116: 'Chief Evaluator',
  }
  return m[roleId] ?? `Role ${roleId}`
}

function tableCell(value: unknown): string {
  if (value == null) return '-'
  if (typeof value === 'boolean') return String(value)
  const text = String(value).trim()
  return text === '' ? '-' : text
}

export default function EvaluatorSubjectRolesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const profileId = Number(searchParams.get('examEvaluatorProfileId') ?? 0)
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<AnyRow | null>(null)
  const [dialogTitle, setDialogTitle] = useState('Add Evaluator Details')

  const [filterRows, setFilterRows] = useState<AnyRow[]>([])
  const [regulationFullRows, setRegulationFullRows] = useState<AnyRow[]>([])
  const [subjectsAll, setSubjectsAll] = useState<AnyRow[]>([])
  const [roleRows, setRoleRows] = useState<AnyRow[]>([])
  const [examLabBatches, setExamLabBatches] = useState<AnyRow[]>([])

  const [courseId, setCourseId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [examId, setExamId] = useState<number | null>(null)
  const [regulationId, setRegulationId] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)
  const [roleId, setRoleId] = useState<number | null>(null)
  const [isReEvaluation, setIsReEvaluation] = useState(false)
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null)
  const [courseYearId, setCourseYearId] = useState<number | null>(null)
  const [examLabBatchesId, setExamLabBatchesId] = useState<number | null>(null)
  const [maxNoOfEvaluationsAssign, setMaxNoOfEvaluationsAssign] = useState('')
  const [maxNoOfReevaluationsAssign, setMaxNoOfReevaluationsAssign] = useState('')

  const [examSearch, setExamSearch] = useState('')
  const [subjectSearch, setSubjectSearch] = useState('')

  const [detailPayloads, setDetailPayloads] = useState<AnyRow[]>([])
  const [tableRows, setTableRows] = useState<AnyRow[]>([])

  const displayFilters = roleId != null && ROLE_EXTRA_FILTER_IDS.has(roleId)

  const courses = useMemo(
    () => dedupeBy(filterRows, (r) => pickNum(r, ['fk_course_id', 'courseId'])),
    [filterRows],
  )
  const academicYears = useMemo(() => {
    if (!courseId) return []
    return dedupeBy(
      filterRows.filter((r) => pickNum(r, ['fk_course_id', 'courseId']) === Number(courseId)),
      (r) => pickNum(r, ['fk_academic_year_id', 'academicYearId']),
    ).sort((a, b) => {
      const ya = Number.parseInt(String(pickText(a, ['academic_year']) || '0'), 10)
      const yb = Number.parseInt(String(pickText(b, ['academic_year']) || '0'), 10)
      return yb - ya
    })
  }, [filterRows, courseId])

  const exams = useMemo(() => {
    if (!courseId || !academicYearId) return []
    return dedupeBy(
      filterRows.filter(
        (r) =>
          pickNum(r, ['fk_course_id', 'courseId']) === Number(courseId) &&
          pickNum(r, ['fk_academic_year_id', 'academicYearId']) === Number(academicYearId),
      ),
      (r) => pickNum(r, ['fk_exam_id', 'examId']),
    )
  }, [filterRows, courseId, academicYearId])

  const examsFiltered = useMemo(() => {
    const t = examSearch.trim().toLowerCase()
    if (!t) return exams
    return exams.filter((e) => pickText(e, ['exam_name', 'examName']).toLowerCase().includes(t))
  }, [exams, examSearch])

  const regulations = useMemo(
    () =>
      dedupeBy(regulationFullRows, (r) => pickNum(r, ['fk_regulation_id', 'regulationId'])),
    [regulationFullRows],
  )

  const subjectsFiltered = useMemo(() => {
    const t = subjectSearch.trim().toLowerCase()
    if (!t) return subjectsAll
    return subjectsAll.filter((s) => {
      const name = pickText(s, ['subject_name', 'subjectName']).toLowerCase()
      const code = pickText(s, ['subject_code', 'subjectCode']).toLowerCase()
      return name.includes(t) || code.includes(t)
    })
  }, [subjectsAll, subjectSearch])

  const courseYears = useMemo(() => {
    const list = dedupeBy(regulationFullRows, (r) => pickNum(r, ['fk_course_year_id', 'courseYearId']))
    return list.sort(
      (a, b) =>
        (pickNum(a, ['cy_sort_order']) || 0) - (pickNum(b, ['cy_sort_order']) || 0),
    )
  }, [regulationFullRows])

  const colleges = useMemo(() => {
    if (!regulationId) return []
    return dedupeBy(
      regulationFullRows.filter((r) => pickNum(r, ['fk_regulation_id', 'regulationId']) === Number(regulationId)),
      (r) => pickNum(r, ['fk_college_id', 'collegeId']),
    )
  }, [regulationFullRows, regulationId])

  const courseGroups = useMemo(() => {
    if (!collegeId || !regulationId) return []
    return dedupeBy(
      regulationFullRows.filter(
        (r) =>
          pickNum(r, ['fk_college_id', 'collegeId']) === Number(collegeId) &&
          pickNum(r, ['fk_regulation_id', 'regulationId']) === Number(regulationId),
      ),
      (r) => pickNum(r, ['fk_course_group_id', 'courseGroupId']),
    )
  }, [regulationFullRows, collegeId, regulationId])

  const showWideTable = displayFilters || tableRows.some((r) => pickNum(r, ['collegeId', 'fk_college_id']) > 0)

  const resetDownstream = useCallback((from: 'course' | 'year' | 'exam' | 'regulation' | 'role') => {
    if (from === 'course') {
      setAcademicYearId(null)
      setExamId(null)
      setRegulationId(null)
      setSubjectId(null)
      setRoleId(null)
      setRegulationFullRows([])
      setSubjectsAll([])
      setRoleRows([])
      setCollegeId(null)
      setCourseGroupId(null)
      setCourseYearId(null)
      setExamLabBatchesId(null)
      setExamLabBatches([])
      return
    }
    if (from === 'year') {
      setExamId(null)
      setRegulationId(null)
      setSubjectId(null)
      setRoleId(null)
      setRegulationFullRows([])
      setSubjectsAll([])
      setRoleRows([])
      setCollegeId(null)
      setCourseGroupId(null)
      setCourseYearId(null)
      setExamLabBatchesId(null)
      setExamLabBatches([])
      return
    }
    if (from === 'exam') {
      setRegulationId(null)
      setSubjectId(null)
      setRoleId(null)
      setRegulationFullRows([])
      setSubjectsAll([])
      setRoleRows([])
      setCollegeId(null)
      setCourseGroupId(null)
      setCourseYearId(null)
      setExamLabBatchesId(null)
      setExamLabBatches([])
      return
    }
    if (from === 'regulation') {
      setSubjectId(null)
      setRoleId(null)
      setSubjectsAll([])
      setRoleRows([])
      setCollegeId(null)
      setCourseGroupId(null)
      setCourseYearId(null)
      setExamLabBatchesId(null)
      setExamLabBatches([])
      return
    }
    if (from === 'role') {
      setCollegeId(null)
      setCourseGroupId(null)
      setCourseYearId(null)
      setExamLabBatchesId(null)
      setExamLabBatches([])
    }
  }, [])

  useEffect(() => {
    const raw = globalThis?.localStorage?.getItem('evaluatorSubjectRoleProfile')
    if (raw) {
      try {
        setProfile(JSON.parse(raw) as AnyRow)
      } catch {
        setProfile(null)
      }
    }
  }, [])

  useEffect(() => {
    if (profile || !profileId) return
    void (async () => {
      const list = await listEvaluatorProfiles().catch(() => [])
      const rows = Array.isArray(list) ? list : []
      const row = rows.find((r) => Number(r?.examEvaluatorProfileId) === profileId)
      if (row) setProfile(row)
    })()
  }, [profile, profileId])

  useEffect(() => {
    if (!profileId) return
    void (async () => {
      setLoading(true)
      try {
        // Angular getExamFiltersList(): univ_exam_filters with REGSUP flag_type.
        const filters = await getEvaluatorSubjectRolesExamFilters(employeeId).catch(() => [])
        const f = Array.isArray(filters) ? filters : []
        setFilterRows(f)
        if (f[0]) setCourseId(pickNum(f[0], ['fk_course_id', 'courseId']))

        const existing = await listExamEvaluatorProfileDetails(profileId).catch(() => [])
        if (Array.isArray(existing) && existing.length > 0) {
          setDialogTitle('Edit Evaluator Details')
          setDetailPayloads(existing.map((r) => ({ ...r })))
          setTableRows(
            existing.map((r) => ({
              examEvaluatorProfileDetId: pickNum(r, ['examEvaluatorProfileDetId', 'exam_evaluator_profile_det_id']),
              examName: pickText(r, ['examName', 'exam_name']),
              evaluatorRoleId: pickNum(r, ['evaluatorRoleId', 'evaluator_role_id']),
              regulationCode: pickText(r, ['regulationCode', 'regulation_code']),
              subjectCode: pickText(r, ['subjectCode', 'subject_code']),
              subjectId: pickNum(r, ['subjectId', 'subject_id']),
              collegeCode: pickText(r, ['collegeCode', 'college_code']),
              courseGroupCode: pickText(r, ['courseGroupCode', 'course_group_code', 'group_code']),
              courseYearCode: pickText(r, ['courseYearCode', 'course_year_code']),
              examLabBatchName: pickText(r, ['examLabBatchName', 'batchName', 'exam_lab_batch_name']),
              isReEvaluation: Boolean(r?.isReEvaluation ?? r?.is_re_evaluation),
              maxNoOfEvaluationsAssign: r?.maxNoOfEvaluationsAssign ?? r?.max_no_of_evaluations_assign,
              maxNoOfReevaluationsAssign: r?.maxNoOfReevaluationsAssign ?? r?.max_no_of_reevaluations_assign,
              collegeId: pickNum(r, ['collegeId', 'college_id']),
              roleName: roleLabel(pickNum(r, ['evaluatorRoleId', 'evaluator_role_id'])),
            })),
          )
        }
      } catch {
        toastError('Failed to load evaluator subject data.')
      } finally {
        setLoading(false)
      }
    })()
  }, [profileId, employeeId])

  useEffect(() => {
    if (!courseId || !academicYearId || !examId) return
    void (async () => {
      const rows = await getEvaluationModerationRest({
        employeeId,
        courseId,
        academicYearId,
        examId,
      }).catch(() => [])
      setRegulationFullRows(Array.isArray(rows) ? rows : [])
    })()
  }, [courseId, academicYearId, examId, employeeId])

  useEffect(() => {
    if (!academicYearId && academicYears[0]) {
      setAcademicYearId(pickNum(academicYears[0], ['fk_academic_year_id', 'academicYearId']))
    }
  }, [academicYears, academicYearId])

  useEffect(() => {
    if (!examId && exams[0]) {
      setExamId(pickNum(exams[0], ['fk_exam_id', 'examId']))
    }
  }, [exams, examId])

  useEffect(() => {
    if (!regulationId && regulations[0]) {
      setRegulationId(pickNum(regulations[0], ['fk_regulation_id', 'regulationId']))
    }
  }, [regulations, regulationId])

  useEffect(() => {
    if (!courseId || !academicYearId || !examId || !regulationId) return
    void (async () => {
      const [subjects, roles] = await Promise.all([
        getEvaluatorSubjectRolesSubjects({
          courseId,
          examId,
          academicYearId,
          regulationId,
          employeeId,
        }).catch(() => []),
        getAssignSubjectsEvaluatorRoles().catch(() => []),
      ])
      setSubjectsAll(Array.isArray(subjects) ? subjects : [])
      setRoleRows(Array.isArray(roles) ? roles : [])
    })()
  }, [courseId, academicYearId, examId, regulationId, employeeId])

  useEffect(() => {
    if (!subjectId && subjectsAll[0]) {
      setSubjectId(pickNum(subjectsAll[0], ['fk_subject_id', 'subjectId']))
    }
  }, [subjectsAll, subjectId])

  useEffect(() => {
    if (!roleId && roleRows[0]) {
      setRoleId(pickNum(roleRows[0], ['pk_role_id', 'roleId']))
    }
  }, [roleRows, roleId])

  useEffect(() => {
    if (!displayFilters || !collegeId || !courseGroupId || !courseYearId || !examId || !regulationId || !subjectId) {
      return
    }
    void (async () => {
      const rows = await listExamLabBatches({
        collegeId,
        examId,
        courseYearId,
        courseGroupId,
        regulationId,
        subjectId,
      }).catch(() => [])
      setExamLabBatches(Array.isArray(rows) ? rows : [])
    })()
  }, [displayFilters, collegeId, courseGroupId, courseYearId, examId, regulationId, subjectId])

  function getExamRow(eid: number) {
    return exams.find((e) => pickNum(e, ['fk_exam_id', 'examId']) === eid)
  }
  function getRegRow(rid: number) {
    return regulations.find((r) => pickNum(r, ['fk_regulation_id', 'regulationId']) === rid)
  }
  function getSubjectRow(sid: number) {
    return subjectsAll.find((s) => pickNum(s, ['fk_subject_id', 'subjectId']) === sid)
  }

  function addToTable() {
    // Required only up to Role; college / course group / course year / lab
    // batch are optional (Angular: the form is valid once role is chosen).
    if (!courseId || !academicYearId || !examId || !regulationId || !subjectId || !roleId) {
      toastError('Please select course, academic year, exam, regulation, subject, and role.')
      return
    }

    const exam = getExamRow(examId)
    const reg = getRegRow(regulationId)
    const sub = getSubjectRow(subjectId)
    const role = roleRows.find((r) => pickNum(r, ['pk_role_id', 'roleId']) === roleId)

    const examName = pickText(exam, ['exam_name', 'examName'])
    const regulationCode = pickText(reg, ['regulation_code', 'regulationCode'])
    const subjectCode = pickText(sub, ['subject_code', 'subjectCode'])
    const roleName = pickText(role, ['role_name', 'roleName'])

    const college = colleges.find((c) => pickNum(c, ['fk_college_id', 'collegeId']) === Number(collegeId))
    const cg = courseGroups.find((g) => pickNum(g, ['fk_course_group_id', 'courseGroupId']) === Number(courseGroupId))
    const cy = courseYears.find((y) => pickNum(y, ['fk_course_year_id', 'courseYearId']) === Number(courseYearId))
    const batch = examLabBatches.find((b) => pickNum(b, ['eaxmLabBatchId', 'examLabBatchesId']) === Number(examLabBatchesId))

    const baseDetail =
      dialogTitle === 'Add Evaluator Details'
        ? {
            examId,
            evaluatorRoleId: roleId,
            regulationId,
            subjectId,
            collegeId: collegeId ?? null,
            courseGroupId: courseGroupId ?? null,
            courseYearId: courseYearId ?? null,
            examLabBatchesId: examLabBatchesId ?? null,
            isReEvaluation,
            maxNoOfEvaluationsAssign: isReEvaluation ? undefined : Number(maxNoOfEvaluationsAssign || 0),
            maxNoOfReevaluationsAssign: isReEvaluation ? Number(maxNoOfReevaluationsAssign || 0) : undefined,
            isActive: true,
            reason: null,
            createdUser: employeeId,
          }
        : {
            examEvaluatorProfileId: profileId,
            examId,
            regulationId,
            evaluatorRoleId: roleId,
            subjectId,
            collegeId: collegeId ?? null,
            courseGroupId: courseGroupId ?? null,
            courseYearId: courseYearId ?? null,
            examLabBatchesId: examLabBatchesId ?? null,
            isReEvaluation,
            maxNoOfEvaluationsAssign: isReEvaluation ? undefined : Number(maxNoOfEvaluationsAssign || 0),
            maxNoOfReevaluationsAssign: isReEvaluation ? Number(maxNoOfReevaluationsAssign || 0) : undefined,
            isActive: true,
            reason: null,
            updatedUser: employeeId,
            examName,
            regulationCode,
            subjectCode,
            collegeCode: pickText(college, ['college_code', 'collegeCode']),
            courseGroupCode: pickText(cg, ['group_code', 'groupCode']),
            courseYearCode: pickText(cy, ['course_year_code', 'courseYearCode']),
            examLabBatchName: pickText(batch, ['batchName', 'examLabBatchName']),
          }

    const display = {
      examName,
      evaluatorRoleId: roleId,
      regulationCode,
      subjectCode,
      subjectId,
      roleName,
      collegeCode: pickText(college, ['college_code', 'collegeCode']),
      courseGroupCode: pickText(cg, ['group_code', 'groupCode']),
      courseYearCode: pickText(cy, ['course_year_code', 'courseYearCode']),
      examLabBatchName: pickText(batch, ['batchName', 'examLabBatchName']),
      isReEvaluation,
      maxNoOfEvaluationsAssign: isReEvaluation ? undefined : Number(maxNoOfEvaluationsAssign || 0),
      maxNoOfReevaluationsAssign: isReEvaluation ? Number(maxNoOfReevaluationsAssign || 0) : undefined,
      collegeId: collegeId ?? 0,
    }

    setDetailPayloads((prev) => [...prev, baseDetail])
    setTableRows((prev) => [...prev, display])

    setSubjectId(null)
    setRoleId(null)
    setIsReEvaluation(false)
    setMaxNoOfEvaluationsAssign('')
    setMaxNoOfReevaluationsAssign('')
  }

  function deleteRow(row: AnyRow, rowIndex: number) {
    const sid = pickNum(row, ['subjectId'])
    const detId = pickNum(row, ['examEvaluatorProfileDetId', 'exam_evaluator_profile_det_id'])
    if (dialogTitle === 'Add Evaluator Details') {
      setDetailPayloads((prev) => prev.filter((_, i) => i !== rowIndex))
      setTableRows((prev) => prev.filter((_, i) => i !== rowIndex))
      return
    }
    setDetailPayloads((prev) =>
      prev.map((d) => {
        const match =
          detId > 0
            ? pickNum(d, ['examEvaluatorProfileDetId', 'exam_evaluator_profile_det_id']) === detId
            : pickNum(d, ['subjectId']) === sid && d.isActive !== false
        return match ? { ...d, isActive: false } : d
      }),
    )
    setTableRows((prev) => prev.filter((_, i) => i !== rowIndex))
  }

  async function submit() {
    if (!profileId) return
    if (!profile) {
      toastError('Loading evaluator profile… try again in a moment, or open from Evaluators profile → Subjects.')
      return
    }
    setLoading(true)
    try {
      await updateEvaluatorProfile({
        ...profile,
        examEvaluatorProfileId: profileId,
        examEvaluatorProfileDetailsDTOS: detailPayloads,
      })
      // Angular submit() success chain: map profile→employees, then set up
      // exam committees (the implicit "Map evaluators" side effects).
      await popProfileEmployees(profileId)
      await setupExamCommittees()
      toastSuccess('Saved successfully.')
      router.push('/admin-examination-management/evaluation-process/create-evaluators')
    } catch (e: any) {
      toastError(e?.message ?? 'Save failed.')
    } finally {
      setLoading(false)
    }
  }

  const evaluatorName = pickText(profile, ['evaluatorName', 'evaluator_name']) || 'Evaluator'

  if (!profileId) {
    return (
      <div className="p-6">
        <div className="app-card overflow-hidden p-4 text-[13px]">
          <p>Missing exam evaluator profile id. Use Subjects from Create Evaluators.</p>
          <Button type="button" variant="outline" className="mt-2" onClick={() => router.push('/admin-examination-management/evaluation-process/create-evaluators')}>
            Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <PageContainer className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">Evaluator Subject Roles</h2>

      <GlobalFilterBar title={`${dialogTitle} — ${evaluatorName}`} defaultOpen>
        <div className="space-y-4 text-[13px]">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-2">
              <Label className="text-[12px] text-muted-foreground">Course</Label>
              <Select
                value={courseId ? String(courseId) : null}
                onChange={(v) => { setCourseId(v ? Number(v) : null); resetDownstream('course') }}
                options={courses.map((c) => ({ value: String(pickNum(c, ['fk_course_id'])), label: pickText(c, ['course_code', 'courseCode']) } as SelectOption))}
                placeholder="Course"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-[12px] text-muted-foreground">Academic Year *</Label>
              <Select
                value={academicYearId ? String(academicYearId) : null}
                onChange={(v) => { setAcademicYearId(v ? Number(v) : null); resetDownstream('year') }}
                options={academicYears.map((a) => ({ value: String(pickNum(a, ['fk_academic_year_id'])), label: pickText(a, ['academic_year']) } as SelectOption))}
                placeholder="Academic Year"
              />
            </div>
            <div className="md:col-span-4">
              <Label className="text-[12px] text-muted-foreground">Exam</Label>
              <Select
                value={examId ? String(examId) : null}
                onChange={(v) => { setExamId(v ? Number(v) : null); resetDownstream('exam') }}
                options={exams.map((e) => ({ value: String(pickNum(e, ['fk_exam_id'])), label: `${pickText(e, ['exam_name'])} (${formatYmd(e.from_date ?? e.fromDate)} – ${formatYmd(e.to_date ?? e.toDate)})` } as SelectOption))}
                placeholder="Exam"
                searchable
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-[12px] text-muted-foreground">Regulation</Label>
              <Select
                value={regulationId ? String(regulationId) : null}
                onChange={(v) => { setRegulationId(v ? Number(v) : null); resetDownstream('regulation') }}
                options={regulations.map((r) => ({ value: String(pickNum(r, ['fk_regulation_id'])), label: pickText(r, ['regulation_code', 'regulationCode']) } as SelectOption))}
                placeholder="Regulation"
              />
            </div>
            <div className="md:col-span-4">
              <Label className="text-[12px] text-muted-foreground">Subjects</Label>
              <Select
                value={subjectId ? String(subjectId) : null}
                onChange={(v) => setSubjectId(v ? Number(v) : null)}
                options={subjectsAll.map((s) => ({ value: String(pickNum(s, ['fk_subject_id'])), label: `${pickText(s, ['subject_name'])} (${pickText(s, ['subject_code'])})` } as SelectOption))}
                placeholder="Subjects"
                searchable
              />
            </div>
            <div className="md:col-span-3">
              <Label className="text-[12px] text-muted-foreground">Select Role</Label>
              <Select
                value={roleId ? String(roleId) : null}
                onChange={(v) => { setRoleId(v ? Number(v) : null); resetDownstream('role') }}
                options={roleRows.map((r) => ({ value: String(pickNum(r, ['pk_role_id'])), label: pickText(r, ['role_name']) } as SelectOption))}
                placeholder="Select Role"
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-2 pt-6">
              <Checkbox checked={isReEvaluation} onCheckedChange={(v) => setIsReEvaluation(v === true)} />
              <span className="text-[12px]">Is Re-Evaluation</span>
            </div>
          </div>

          {displayFilters && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end border-t border-slate-100 pt-3">
              <div className="md:col-span-2">
                <Label className="text-[12px] text-muted-foreground">Course Year</Label>
                <Select
                  value={courseYearId ? String(courseYearId) : null}
                  onChange={(v) => setCourseYearId(v ? Number(v) : null)}
                  options={courseYears.map((y) => ({ value: String(pickNum(y, ['fk_course_year_id'])), label: pickText(y, ['course_year_code']) } as SelectOption))}
                  placeholder="Course Year"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-[12px] text-muted-foreground">College</Label>
                <Select
                  value={collegeId ? String(collegeId) : null}
                  onChange={(v) => { setCollegeId(v ? Number(v) : null); setCourseGroupId(null); setExamLabBatchesId(null) }}
                  options={colleges.map((c) => ({ value: String(pickNum(c, ['fk_college_id'])), label: pickText(c, ['college_code']) } as SelectOption))}
                  placeholder="College"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-[12px] text-muted-foreground">Course Group</Label>
                <Select
                  value={courseGroupId ? String(courseGroupId) : null}
                  onChange={(v) => { setCourseGroupId(v ? Number(v) : null); setExamLabBatchesId(null) }}
                  options={courseGroups.map((g) => ({ value: String(pickNum(g, ['fk_course_group_id'])), label: pickText(g, ['group_code']) } as SelectOption))}
                  placeholder="Course Group"
                />
              </div>
              <div className="md:col-span-3">
                <Label className="text-[12px] text-muted-foreground">Exam Lab Batch</Label>
                <Select
                  value={examLabBatchesId ? String(examLabBatchesId) : null}
                  onChange={(v) => setExamLabBatchesId(v ? Number(v) : null)}
                  options={examLabBatches.map((b) => ({
                    value: String(pickNum(b, ['eaxmLabBatchId', 'examLabBatchesId', 'exam_lab_batches_id', 'pk_eaxm_lab_batch_id'])),
                    label: pickText(b, ['batchName', 'examLabBatchName', 'batch_name', 'exam_lab_batch_name']),
                  } as SelectOption))}
                  placeholder="Exam Lab Batch"
                />
              </div>
              {!isReEvaluation && (
                <div className="md:col-span-2">
                  <Label className="text-[12px] text-muted-foreground">Max evaluations</Label>
                  <Input
                    type="number"
                    className="h-8 text-[12px]"
                    placeholder="Max evaluations"
                    value={maxNoOfEvaluationsAssign}
                    onChange={(e) => setMaxNoOfEvaluationsAssign(e.target.value)}
                  />
                </div>
              )}
              {isReEvaluation && (
                <div className="md:col-span-2">
                  <Label className="text-[12px] text-muted-foreground">Max re-evaluations</Label>
                  <Input
                    type="number"
                    className="h-8 text-[12px]"
                    placeholder="Max re-evaluations"
                    value={maxNoOfReevaluationsAssign}
                    onChange={(e) => setMaxNoOfReevaluationsAssign(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {!displayFilters && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              {!isReEvaluation && (
                <div className="md:col-span-2">
                  <Label className="text-[12px] text-muted-foreground">Max evaluations</Label>
                  <Input
                    type="number"
                    className="h-8 text-[12px]"
                    placeholder="Max evaluations"
                    value={maxNoOfEvaluationsAssign}
                    onChange={(e) => setMaxNoOfEvaluationsAssign(e.target.value)}
                  />
                </div>
              )}
              {isReEvaluation && (
                <div className="md:col-span-2">
                  <Label className="text-[12px] text-muted-foreground">Max re-evaluations</Label>
                  <Input
                    type="number"
                    className="h-8 text-[12px]"
                    placeholder="Max re-evaluations"
                    value={maxNoOfReevaluationsAssign}
                    onChange={(e) => setMaxNoOfReevaluationsAssign(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" className="h-8 text-[12px]" onClick={addToTable} disabled={loading}>
              Add
            </Button>
            <Button type="button" variant="outline" className="h-8 text-[12px]" onClick={() => router.push('/admin-examination-management/evaluation-process/create-evaluators')}>
              Back
            </Button>
          </div>
        </div>
      </GlobalFilterBar>

      {tableRows.length > 0 && (
        <div className="app-card overflow-hidden">
          <div className="px-3 py-2 border-b border-border bg-muted/40 text-[13px] font-medium">{dialogTitle}</div>
          <div className="overflow-x-auto p-2">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-2 font-medium">Exam</th>
                  <th className="p-2 font-medium">Role</th>
                  <th className="p-2 font-medium">Regulation</th>
                  <th className="p-2 font-medium">Subjects</th>
                  {showWideTable && (
                    <>
                      <th className="p-2 font-medium">College</th>
                      <th className="p-2 font-medium">Course Group</th>
                      <th className="p-2 font-medium">Course Year</th>
                      <th className="p-2 font-medium">Lab Batch</th>
                    </>
                  )}
                  <th className="p-2 font-medium">Re-eval</th>
                  <th className="p-2 font-medium">Max eval</th>
                  <th className="p-2 font-medium">Max re-eval</th>
                  <th className="p-2 font-medium w-16">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, index) => (
                  <tr key={`row-${index}-${row.subjectId}`} className="border-b border-slate-100">
                    <td className="p-2">{tableCell(row.examName)}</td>
                    <td className="p-2">{tableCell(row.roleName ?? roleLabel(Number(row.evaluatorRoleId)))}</td>
                    <td className="p-2">{tableCell(row.regulationCode)}</td>
                    <td className="p-2">{tableCell(row.subjectCode)}</td>
                    {showWideTable && (
                      <>
                        <td className="p-2">{tableCell(row.collegeCode)}</td>
                        <td className="p-2">{tableCell(row.courseGroupCode)}</td>
                        <td className="p-2">{tableCell(row.courseYearCode)}</td>
                        <td className="p-2">{tableCell(row.examLabBatchName)}</td>
                      </>
                    )}
                    <td className="p-2">{tableCell(row.isReEvaluation)}</td>
                    <td className="p-2">{tableCell(row.maxNoOfEvaluationsAssign)}</td>
                    <td className="p-2">{tableCell(row.maxNoOfReevaluationsAssign)}</td>
                    <td className="p-2">
                      <button
                        type="button"
                        className="text-red-600 hover:text-red-800"
                        aria-label="Remove row"
                        onClick={() => deleteRow(row, index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 flex justify-end border-t border-slate-100">
            <Button type="button" className="h-8 text-[12px]" onClick={() => void submit()} disabled={loading}>
              Save
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
