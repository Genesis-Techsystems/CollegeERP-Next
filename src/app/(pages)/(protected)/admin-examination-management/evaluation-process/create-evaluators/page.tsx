'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ColDef } from 'ag-grid-community'
import { LayoutList, PencilIcon, Settings } from 'lucide-react'
import { Select, MultiSelect, type SelectOption } from '@/common/components/select'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer, PageHeader } from '@/components/layout'
import { toastError, toastSuccess } from '@/lib/toast'
import { toDateOnlyISO } from '@/common/generic-functions'
import { listActiveColleges } from '@/services/pre-examination'
import { listRegulations } from '@/services/examination'
import {
  createEvaluatorProfile,
  getEvaluationExamFilters,
  listActiveCourses,
  listEvaluatorProfiles,
  listExamEvaluatorPreferences,
  listSubjectsByCourseForPreferences,
  sendEvaluatorCredentials,
  updateEvaluatorProfile,
  updateExamEvaluatorPreferences,
} from '@/services/evaluation-process'

type AnyRow = Record<string, any>

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

const toYmd = (v?: string | Date) => {
  if (!v) return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ''
  return toDateOnlyISO(d)
}

function statusRenderer(p: { value?: boolean }) {
  return <StatusBadge status={p.value ?? false} />
}

function makeDetailsRenderer(
  openSubjects: (row: AnyRow) => void,
  openPreferences: (row: AnyRow) => void,
) {
  return (p: { data?: AnyRow }) => (
    <div className="text-[12px]">
      <button type="button" className="text-blue-700 hover:underline" onClick={() => openSubjects(p.data ?? {})}>
        Subjects
      </button>
      <span className="px-1 text-slate-500">|</span>
      <button type="button" className="text-blue-700 hover:underline" onClick={() => openPreferences(p.data ?? {})}>
        Preferences
      </button>
    </div>
  )
}

function makeActionsRenderer(openEdit: (row: AnyRow) => void, sendOne: (row: AnyRow) => void) {
  return (p: { data?: AnyRow }) => (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        aria-label="Edit evaluator"
        onClick={() => openEdit(p.data ?? {})}
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </Button>
      <button type="button" className="text-[12px] text-blue-700 hover:underline" onClick={() => sendOne(p.data ?? {})}>
        Mail
      </button>
    </div>
  )
}

type FormState = {
  collegeCode: string
  title: string
  evaluatorName: string
  email: string
  phoneNumber: string
  alternatePhoneNumber: string
  aadhar: string
  panCardNo: string
  profileValidFromDate: string
  profileValidToDate: string
  isActive: boolean
  reason: string
}

function emptyForm(): FormState {
  const today = toDateOnlyISO(new Date())
  return {
    collegeCode: '',
    title: '',
    evaluatorName: '',
    email: '',
    phoneNumber: '',
    alternatePhoneNumber: '',
    aadhar: '',
    panCardNo: '',
    profileValidFromDate: today,
    profileValidToDate: today,
    isActive: true,
    reason: '',
  }
}

export default function CreateEvaluatorsPage() {
  const router = useRouter()
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const [rows, setRows] = useState<AnyRow[]>([])
  const [colleges, setColleges] = useState<AnyRow[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRow, setEditRow] = useState<AnyRow | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())

  const [prefOpen, setPrefOpen] = useState(false)
  const [prefRow, setPrefRow] = useState<AnyRow | null>(null)
  const [prefCourses, setPrefCourses] = useState<AnyRow[]>([])
  const [prefRegulations, setPrefRegulations] = useState<AnyRow[]>([])
  const [prefSubjects, setPrefSubjects] = useState<AnyRow[]>([])
  const [prefAll, setPrefAll] = useState<AnyRow[]>([])
  const [prefCourseId, setPrefCourseId] = useState<number | null>(null)
  const [prefRegulationId, setPrefRegulationId] = useState<number | null>(null)
  const [prefSubjectIds, setPrefSubjectIds] = useState<string[]>([])
  const [prefLoading, setPrefLoading] = useState(false)

  const [credOpen, setCredOpen] = useState(false)
  const [credMode, setCredMode] = useState<'bulk' | 'single'>('bulk')
  const [credSingleRow, setCredSingleRow] = useState<AnyRow | null>(null)
  const [credFilterRows, setCredFilterRows] = useState<AnyRow[]>([])
  const [credCourseId, setCredCourseId] = useState<number | null>(null)
  const [credAcademicYearId, setCredAcademicYearId] = useState<number | null>(null)
  const [credExamId, setCredExamId] = useState<number | null>(null)
  const [credExamSearch, setCredExamSearch] = useState('')

  async function loadList() {
    setLoading(true)
    try {
      const list = await listEvaluatorProfiles().catch(() => [])
      setRows(Array.isArray(list) ? list : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadList()
    void (async () => {
      const list = await listActiveColleges().catch(() => [])
      const all = Array.isArray(list) ? list : []
      const onlyUniversity = all.filter((c) => c?.isUniversity === true || c?.is_university === true)
      setColleges(onlyUniversity.length > 0 ? onlyUniversity : all)
    })()
  }, [])

  const credCourses = useMemo(
    () => dedupeBy(credFilterRows, (r) => pickNum(r, ['fk_course_id', 'courseId'])),
    [credFilterRows],
  )
  const credAcademicYears = useMemo(() => {
    if (!credCourseId) return []
    return dedupeBy(
      credFilterRows.filter((r) => pickNum(r, ['fk_course_id', 'courseId']) === Number(credCourseId)),
      (r) => pickNum(r, ['fk_academic_year_id', 'academicYearId']),
    ).sort((a, b) => {
      const ya = Number.parseInt(String(pickText(a, ['academic_year']) || '0'), 10)
      const yb = Number.parseInt(String(pickText(b, ['academic_year']) || '0'), 10)
      return yb - ya
    })
  }, [credFilterRows, credCourseId])

  const credExams = useMemo(() => {
    if (!credCourseId || !credAcademicYearId) return []
    return dedupeBy(
      credFilterRows.filter(
        (r) =>
          pickNum(r, ['fk_course_id', 'courseId']) === Number(credCourseId) &&
          pickNum(r, ['fk_academic_year_id', 'academicYearId']) === Number(credAcademicYearId),
      ),
      (r) => pickNum(r, ['fk_exam_id', 'examId']),
    )
  }, [credFilterRows, credCourseId, credAcademicYearId])

  const credExamsFiltered = useMemo(() => {
    const t = credExamSearch.trim().toLowerCase()
    if (!t) return credExams
    return credExams.filter((e) => pickText(e, ['exam_name', 'examName']).toLowerCase().includes(t))
  }, [credExams, credExamSearch])

  useEffect(() => {
    if (!credOpen) return
    void (async () => {
      const f = await getEvaluationExamFilters(employeeId).catch(() => [])
      setCredFilterRows(Array.isArray(f) ? f : [])
    })()
  }, [credOpen, employeeId])

  useEffect(() => {
    if (!credOpen || credCourseId != null || credCourses.length === 0) return
    setCredCourseId(pickNum(credCourses[0], ['fk_course_id', 'courseId']))
  }, [credOpen, credCourseId, credCourses])

  useEffect(() => {
    if (!credOpen || credAcademicYearId != null || credAcademicYears.length === 0) return
    setCredAcademicYearId(pickNum(credAcademicYears[0], ['fk_academic_year_id', 'academicYearId']))
  }, [credOpen, credAcademicYearId, credAcademicYears])

  useEffect(() => {
    if (!credOpen || credExamId != null || credExams.length === 0) return
    setCredExamId(pickNum(credExams[0], ['fk_exam_id', 'examId']))
  }, [credOpen, credExamId, credExams])

  function resetCredForm() {
    setCredExamSearch('')
    setCredCourseId(null)
    setCredAcademicYearId(null)
    setCredExamId(null)
  }

  function openSendCredentialsModal(mode: 'bulk' | 'single', row?: AnyRow) {
    setCredMode(mode)
    setCredSingleRow(row ?? null)
    resetCredForm()
    setCredOpen(true)
  }

  async function submitSendCredentials() {
    if (!credExamId) {
      toastError('Please select an exam.')
      return
    }
    setLoading(true)
    try {
      let payload: AnyRow[]
      if (credMode === 'single' && credSingleRow?.examEvaluatorProfileId) {
        payload = [{ examEvaluatorProfileId: credSingleRow.examEvaluatorProfileId, examId: credExamId }]
      } else {
        payload = rows
          .map((r) => ({ examEvaluatorProfileId: r.examEvaluatorProfileId, examId: credExamId }))
          .filter((p) => Number(p.examEvaluatorProfileId) > 0)
      }
      if (payload.length === 0) {
        toastError('No evaluator profiles to send.')
        return
      }
      await sendEvaluatorCredentials(payload)
      toastSuccess('Credentials sent.')
      setCredOpen(false)
      await loadList()
    } catch (e: any) {
      toastError(e?.message ?? 'Failed to send credentials.')
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setEditRow(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  function openEdit(row: AnyRow) {
    setEditRow(row)
    setForm({
      collegeCode: String(row?.collegeCode ?? ''),
      title: String(row?.title ?? ''),
      evaluatorName: String(row?.evaluatorName ?? ''),
      email: String(row?.email ?? ''),
      phoneNumber: String(row?.phoneNumber ?? ''),
      alternatePhoneNumber: String(row?.alternatePhoneNumber ?? ''),
      aadhar: String(row?.aadhar ?? ''),
      panCardNo: String(row?.panCardNo ?? ''),
      profileValidFromDate: toYmd(row?.profileValidFromDate),
      profileValidToDate: toYmd(row?.profileValidToDate),
      isActive: Boolean(row?.isActive),
      reason: String(row?.reason ?? ''),
    })
    setModalOpen(true)
  }

  async function onSave() {
    if (!form.evaluatorName || !form.phoneNumber || !form.aadhar) {
      toastError('Please fill required fields.')
      return
    }
    const payload = {
      collegeCode: form.collegeCode,
      title: form.title,
      evaluatorName: form.evaluatorName,
      email: form.email,
      phoneNumber: form.phoneNumber,
      alternatePhoneNumber: form.alternatePhoneNumber,
      aadhar: form.aadhar,
      panCardNo: form.panCardNo,
      profileValidFromDate: form.profileValidFromDate,
      profileValidToDate: form.profileValidToDate,
      isActive: form.isActive,
      reason: form.reason || null,
    }
    setLoading(true)
    try {
      if (editRow?.examEvaluatorProfileId) {
        await updateEvaluatorProfile({ ...payload, examEvaluatorProfileId: editRow.examEvaluatorProfileId })
      } else {
        await createEvaluatorProfile(payload)
      }
      toastSuccess('Saved successfully.')
      setModalOpen(false)
      await loadList()
    } catch (error: any) {
      toastError(error?.message ?? 'Failed to save evaluator profile.')
    } finally {
      setLoading(false)
    }
  }

  const openSubjects = useCallback(
    (row: AnyRow) => {
      const profileId = Number(row?.examEvaluatorProfileId ?? 0)
      if (profileId > 0) {
        globalThis?.localStorage?.setItem('evaluatorSubjectRoleProfile', JSON.stringify(row))
        router.push(`/admin-examination-management/evaluation-process/assign-evaluator-subject?examEvaluatorProfileId=${profileId}`)
        return
      }
      toastError('Invalid evaluator profile.')
    },
    [router],
  )

  async function loadPreferencesModalData(row: AnyRow) {
    const profileId = Number(row?.examEvaluatorProfileId ?? 0)
    if (profileId <= 0) return
    setPrefLoading(true)
    try {
      const [courses, existing] = await Promise.all([
        listActiveCourses().catch(() => []),
        listExamEvaluatorPreferences(profileId).catch(() => []),
      ])
      setPrefCourses(Array.isArray(courses) ? courses : [])
      const list = Array.isArray(existing) ? existing : []
      setPrefAll(list.map((r) => ({ ...r })))
      setPrefCourseId(null)
      setPrefRegulationId(null)
      setPrefSubjectIds([])
      setPrefRegulations([])
      setPrefSubjects([])
    } catch {
      toastError('Failed to load preferences.')
    } finally {
      setPrefLoading(false)
    }
  }

  const openPreferences = useCallback(
    (row: AnyRow) => {
      setPrefRow(row)
      setPrefOpen(true)
      void loadPreferencesModalData(row)
    },
    [],
  )

  useEffect(() => {
    if (!prefCourseId) {
      setPrefRegulations([])
      setPrefSubjects([])
      return
    }
    void (async () => {
      const [regs, subs] = await Promise.all([
        listRegulations(prefCourseId).catch(() => []),
        listSubjectsByCourseForPreferences(prefCourseId).catch(() => []),
      ])
      setPrefRegulations(Array.isArray(regs) ? regs : [])
      const s = Array.isArray(subs) ? subs : []
      const sorted = [...s].sort((a, b) => pickNum(b, ['subjectId']) - pickNum(a, ['subjectId']))
      setPrefSubjects(sorted)
    })()
  }, [prefCourseId])

  function addPreferenceRow() {
    if (!prefRow?.examEvaluatorProfileId || !prefCourseId || !prefRegulationId || prefSubjectIds.length === 0) {
      toastError('Please select course, regulation, and at least one subject.')
      return
    }
    const courseObj = prefCourses.find((c) => pickNum(c, ['courseId']) === prefCourseId)
    const regulationObj = prefRegulations.find((r) => pickNum(r, ['regulationId']) === prefRegulationId)
    let duplicate = false
    const next = [...prefAll]
    for (const sid of prefSubjectIds.map(Number)) {
      const subjectObj = prefSubjects.find((s) => pickNum(s, ['subjectId']) === sid)
      const existing = next.find(
        (p) =>
          pickNum(p, ['courseId']) === prefCourseId &&
          pickNum(p, ['regulationId']) === prefRegulationId &&
          pickNum(p, ['subjectId']) === sid,
      )
      if (!existing) {
        next.push({
          examEvaluatorProfileId: prefRow.examEvaluatorProfileId,
          courseId: prefCourseId,
          courseCode: pickText(courseObj, ['courseCode']),
          regulationId: prefRegulationId,
          regulationCode: pickText(regulationObj, ['regulationCode', 'regulationName']),
          subjectId: sid,
          subjectCode: pickText(subjectObj, ['subjectCode']),
          isActive: true,
        })
      } else if (existing.isActive) {
        duplicate = true
      } else {
        existing.isActive = true
      }
    }
    if (duplicate) {
      toastError('One or more subjects already exist for this course and regulation.')
    }
    setPrefAll(next)
    setPrefSubjectIds([])
  }

  function deletePrefRow(row: AnyRow) {
    setPrefAll((prev) =>
      prev.map((p) => {
        const match =
          pickNum(p, ['courseId']) === pickNum(row, ['courseId']) &&
          pickNum(p, ['regulationId']) === pickNum(row, ['regulationId']) &&
          pickNum(p, ['subjectId']) === pickNum(row, ['subjectId'])
        return match ? { ...p, isActive: false } : p
      }),
    )
  }

  const prefTableRows = useMemo(() => prefAll.filter((p) => p.isActive !== false), [prefAll])

  const subjectOptions: SelectOption[] = useMemo(
    () =>
      prefSubjects.map((s) => ({
        value: String(pickNum(s, ['subjectId'])),
        label: `${pickText(s, ['subjectName'])} (${pickText(s, ['subjectCode'])})`,
      })),
    [prefSubjects],
  )

  async function savePreferences() {
    if (!prefRow?.examEvaluatorProfileId) {
      toastError('Invalid evaluator profile.')
      return
    }
    if (prefAll.length === 0) {
      toastError('No preferences to save.')
      return
    }
    setLoading(true)
    try {
      await updateExamEvaluatorPreferences(prefAll)
      toastSuccess('Preferences saved.')
      setPrefOpen(false)
      await loadList()
    } catch (e: any) {
      toastError(e?.message ?? 'Failed to save preferences.')
    } finally {
      setLoading(false)
    }
  }

  const cols = useMemo<ColDef[]>(
    () => [
      { headerName: 'No.', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70 },
      { field: 'collegeCode', headerName: 'Faculty', minWidth: 120 },
      { field: 'evaluatorName', headerName: 'Name', minWidth: 220 },
      { field: 'phoneNumber', headerName: 'Phone', minWidth: 130 },
      { field: 'email', headerName: 'Email', minWidth: 220 },
      { field: 'aadhar', headerName: 'AadharCard', minWidth: 150 },
      { headerName: 'Details', minWidth: 170, cellRenderer: makeDetailsRenderer(openSubjects, openPreferences) },
      { field: 'isActive', headerName: 'Status', minWidth: 100, cellRenderer: statusRenderer },
      {
        headerName: 'Actions',
        minWidth: 150,
        cellRenderer: makeActionsRenderer(openEdit, (row) => openSendCredentialsModal('single', row)),
      },
    ],
    [openSubjects, openPreferences],
  )

  const evaluatorName = pickText(prefRow, ['evaluatorName'])

  return (
    <PageContainer className="space-y-5">
      <PageHeader title="Create Evaluators" subtitle="Assign evaluators to examinations" />
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60">
          <h2 className="text-[16px] font-semibold text-[hsl(var(--primary))]">Evaluator&apos;s Profile</h2>
        </div>
        <div className="p-4 space-y-3">
          <DataTable
            rowData={rows}
            columnDefs={cols}
            pagination
            loading={loading}
            toolbar={{
              search: true,
              searchPlaceholder: 'Search…',
              pdfDocumentTitle: "Create Evaluators",
            }}
            toolbarTrailing={
              <>
                <Button type="button" variant="outline" onClick={() => openSendCredentialsModal('bulk')} disabled={loading}>
                  Send Evaluator Credentials
                </Button>
                <Button type="button" onClick={openAdd} disabled={loading}>
                  Create Evaluator
                </Button>
              </>
            }
          />
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editRow ? 'Edit Evaluator Profile' : 'Create Evaluator Profile'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-[12px]">University College</Label>
              <Select
                value={form.collegeCode || null}
                onChange={(v) => setForm((p) => ({ ...p, collegeCode: v ?? '' }))}
                options={colleges.map((c) => {
                  const value = String(c?.collegeCode ?? c?.college_code ?? c?.collegeId ?? c?.pk_college_id ?? '')
                  return { value, label: String(c?.collegeCode ?? c?.college_code ?? c?.collegeName ?? c?.college_name ?? value) } as SelectOption
                })}
                placeholder="University College"
              />
            </div>
            <div>
              <Label className="text-[12px]">Title</Label>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[12px]">Name</Label>
              <Input value={form.evaluatorName} onChange={(e) => setForm((p) => ({ ...p, evaluatorName: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[12px]">Email</Label>
              <Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[12px]">Phone Number</Label>
              <Input value={form.phoneNumber} onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[12px]">Alternate Phone</Label>
              <Input value={form.alternatePhoneNumber} onChange={(e) => setForm((p) => ({ ...p, alternatePhoneNumber: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[12px]">Aadhar</Label>
              <Input value={form.aadhar} onChange={(e) => setForm((p) => ({ ...p, aadhar: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[12px]">Pan Card No.</Label>
              <Input value={form.panCardNo} onChange={(e) => setForm((p) => ({ ...p, panCardNo: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[12px]">Start Date</Label>
              <Input type="date" value={form.profileValidFromDate} onChange={(e) => setForm((p) => ({ ...p, profileValidFromDate: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[12px]">End Date</Label>
              <Input type="date" value={form.profileValidToDate} onChange={(e) => setForm((p) => ({ ...p, profileValidToDate: e.target.value }))} />
            </div>
            <div className="md:col-span-3 flex items-center gap-2">
              <Checkbox checked={form.isActive} onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v === true }))} />
              <span className="text-[12px]">Active</span>
            </div>
            {!form.isActive && (
              <div className="md:col-span-3">
                <Label className="text-[12px]">Reason</Label>
                <Input value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={loading}>
              Close
            </Button>
            <Button onClick={() => void onSave()} disabled={loading}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={prefOpen} onOpenChange={setPrefOpen}>
        <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden sm:max-w-4xl">
          <div className="bg-white px-4 py-3">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-[hsl(var(--primary))]">
              <Settings className="h-5 w-5 shrink-0 text-[hsl(var(--primary))]" aria-hidden />
              <span>Add Preferences — {evaluatorName}</span>
            </div>
            <div className="mt-2 h-px w-full bg-amber-400/80" />
          </div>
          <div className="p-4 space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[160px] flex-1">
                <Label className="text-[12px]">
                  Course <span className="text-red-600">*</span>
                </Label>
                <Select
                  value={prefCourseId ? String(prefCourseId) : null}
                  onChange={(v) => { setPrefCourseId(v ? Number(v) : null); setPrefRegulationId(null); setPrefSubjectIds([]) }}
                  options={prefCourses.map((c) => ({ value: String(pickNum(c, ['courseId'])), label: pickText(c, ['courseCode']) } as SelectOption))}
                  placeholder="Course"
                  disabled={prefLoading}
                />
              </div>
              <div className="min-w-[160px] flex-1">
                <Label className="text-[12px]">
                  Regulation <span className="text-red-600">*</span>
                </Label>
                <Select
                  value={prefRegulationId ? String(prefRegulationId) : null}
                  onChange={(v) => setPrefRegulationId(v ? Number(v) : null)}
                  options={prefRegulations.map((r) => ({ value: String(pickNum(r, ['regulationId'])), label: pickText(r, ['regulationName', 'regulationCode']) } as SelectOption))}
                  placeholder="Regulation"
                  disabled={!prefCourseId}
                />
              </div>
              <div className="min-w-[220px] flex-[2]">
                <Label className="text-[12px]">Subjects</Label>
                <MultiSelect
                  value={prefSubjectIds}
                  onChange={setPrefSubjectIds}
                  options={subjectOptions}
                  placeholder="Subjects"
                  searchable
                  showSelectAll
                  disabled={!prefCourseId}
                />
              </div>
              <Button type="button" className="h-9" onClick={addPreferenceRow} disabled={loading || prefLoading}>
                Add
              </Button>
            </div>

            {prefTableRows.length > 0 && (
              <div className="max-h-[210px] overflow-auto rounded border border-slate-200">
                <table className="w-full text-[12px]">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="border-b border-slate-200 text-left">
                      <th className="p-2 font-medium">Course</th>
                      <th className="p-2 font-medium">Regulation</th>
                      <th className="p-2 font-medium">Subject</th>
                      <th className="p-2 w-16"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {prefTableRows.map((row, i) => (
                      <tr key={`pref-${i}-${pickNum(row, ['subjectId'])}`} className="border-b border-slate-100">
                        <td className="p-2">{pickText(row, ['courseCode'])}</td>
                        <td className="p-2">{pickText(row, ['regulationCode'])}</td>
                        <td className="p-2">{pickText(row, ['subjectCode'])}</td>
                        <td className="p-2">
                          <button
                            type="button"
                            className="text-red-600 text-[12px] hover:underline"
                            onClick={() => deletePrefRow(row)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-slate-200 px-4 py-3 sm:justify-end gap-2">
            <Button variant="outline" onClick={() => setPrefOpen(false)} disabled={loading}>
              Close
            </Button>
            <Button onClick={() => void savePreferences()} disabled={loading || prefLoading}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={credOpen} onOpenChange={setCredOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden sm:max-w-2xl">
          <div className="bg-white px-4 py-3">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-[hsl(var(--primary))]">
              <LayoutList className="h-5 w-5 shrink-0 text-[hsl(var(--primary))]" aria-hidden />
              <span>Send Credentials</span>
            </div>
            <div className="mt-2 h-px w-full bg-amber-400/80" />
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <Label className="text-[12px]">
                  Course <span className="text-red-600">*</span>
                </Label>
                <Select
                  value={credCourseId ? String(credCourseId) : null}
                  onChange={(v) => { setCredCourseId(v ? Number(v) : null); setCredAcademicYearId(null); setCredExamId(null) }}
                  options={credCourses.map((c) => ({ value: String(pickNum(c, ['fk_course_id'])), label: pickText(c, ['course_code', 'courseCode']) } as SelectOption))}
                  placeholder="Course"
                />
              </div>
              <div>
                <Label className="text-[12px]">Academic Year</Label>
                <Select
                  value={credAcademicYearId ? String(credAcademicYearId) : null}
                  onChange={(v) => { setCredAcademicYearId(v ? Number(v) : null); setCredExamId(null) }}
                  options={credAcademicYears.map((a) => ({ value: String(pickNum(a, ['fk_academic_year_id'])), label: pickText(a, ['academic_year']) } as SelectOption))}
                  placeholder="Academic Year"
                />
              </div>
              <div className="sm:col-span-1">
                <Label className="text-[12px]">
                  Exam <span className="text-red-600">*</span>
                </Label>
                <Select
                  value={credExamId ? String(credExamId) : null}
                  onChange={(v) => setCredExamId(v ? Number(v) : null)}
                  options={credExams.map((e) => ({ value: String(pickNum(e, ['fk_exam_id'])), label: `${pickText(e, ['exam_name'])} (${formatYmd(e.from_date ?? e.fromDate)} – ${formatYmd(e.to_date ?? e.toDate)})` } as SelectOption))}
                  placeholder="Exam"
                  searchable
                  disabled={!credCourseId || !credAcademicYearId}
                />
              </div>
            </div>
            <p className="text-[13px] text-slate-700">
              Send Credentials to{' '}
              {credMode === 'single' ? (
                <span className="font-medium text-blue-700">{pickText(credSingleRow, ['evaluatorName']) || '—'}</span>
              ) : (
                <span className="font-medium text-blue-700">All Evaluators</span>
              )}
            </p>
          </div>
          <DialogFooter className="border-t border-slate-200 px-4 py-3 sm:justify-end gap-2">
            <Button onClick={() => void submitSendCredentials()} disabled={loading}>
              Send
            </Button>
            <Button variant="outline" onClick={() => setCredOpen(false)} disabled={loading}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
