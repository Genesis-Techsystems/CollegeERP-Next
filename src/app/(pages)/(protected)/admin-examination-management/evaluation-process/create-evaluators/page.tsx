'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { FileText, Mail, PencilIcon } from 'lucide-react'
import { Select, MultiSelect, type SelectOption } from '@/common/components/select'
import { DataTable, TableRowActions } from '@/common/components/table'
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
  createEvaluatorBankDetails,
  createEvaluatorProfile,
  getAssignSubjectsEvaluatorRoles,
  getEvaluationExamFilters,
  getEvaluatorBankDetails,
  listActiveCourses,
  listEvaluatorProfiles,
  listEvaluatorTitles,
  updateEvaluatorBankDetails,
  listExamEvaluatorPreferences,
  listSubjectsByCourseForPreferences,
  searchEvaluatorEmployees,
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

function prefCourseIdOf(row: AnyRow | null | undefined) {
  return pickNum(row, ['courseId', 'fk_course_id', 'course_id'])
}

function prefRegulationIdOf(row: AnyRow | null | undefined) {
  return pickNum(row, ['regulationId', 'fk_regulation_id', 'regulation_id'])
}

function prefSubjectIdOf(row: AnyRow | null | undefined) {
  return pickNum(row, ['subjectId', 'fk_subject_id', 'subject_id'])
}

function prefRowKey(row: AnyRow | null | undefined) {
  return `${prefCourseIdOf(row)}-${prefRegulationIdOf(row)}-${prefSubjectIdOf(row)}`
}

function prefRowsMatch(a: AnyRow, b: AnyRow) {
  const key = prefRowKey(a)
  return key !== '0-0-0' && key === prefRowKey(b)
}

function isPersistedPrefRow(row: AnyRow) {
  return pickNum(row, ['examEvaluatorPreferenceId', 'examEvaluatorPreferencesId', 'pk_exam_evaluator_preference_id']) > 0
}

function normalizePrefRow(row: AnyRow, profileId: number): AnyRow {
  return {
    ...row,
    examEvaluatorProfileId: pickNum(row, ['examEvaluatorProfileId']) || profileId,
    courseId: prefCourseIdOf(row),
    courseCode: pickText(row, ['courseCode', 'course_code']),
    regulationId: prefRegulationIdOf(row),
    regulationCode: pickText(row, ['regulationCode', 'regulation_code', 'regulationName']),
    subjectId: prefSubjectIdOf(row),
    subjectCode: pickText(row, ['subjectCode', 'subject_code']),
    isActive: row.isActive !== false,
  }
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
      <span className="px-1 text-muted-foreground">|</span>
      <button type="button" className="text-blue-700 hover:underline" onClick={() => openPreferences(p.data ?? {})}>
        Preferences
      </button>
    </div>
  )
}

function BankSummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-1 px-2 py-1">
      <p className="sm:col-span-1 text-[13px] font-medium m-0">{label}</p>
      <p className="sm:col-span-4 text-[13px] font-medium m-0">
        <span className="text-[#0d29ff]">{value || '—'}</span>
      </p>
    </div>
  )
}

function makeActionsRenderer(
  openEdit: (row: AnyRow) => void,
  sendOne: (row: AnyRow) => void,
  openBank: (row: AnyRow) => void,
) {
  return (p: { data?: AnyRow }) => (
    <div className="flex items-center gap-1.5">
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
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        aria-label="Send credentials"
        onClick={() => sendOne(p.data ?? {})}
      >
        <Mail className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        aria-label="Bank copy"
        onClick={() => openBank(p.data ?? {})}
      >
        <FileText className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

const PREF_COL_DEFS = {
  course: { field: 'courseCode', headerName: 'Course', minWidth: 120, flex: 1 } as ColDef<AnyRow>,
  regulation: { field: 'regulationCode', headerName: 'Regulation', minWidth: 120, flex: 1 } as ColDef<AnyRow>,
  subject: { field: 'subjectCode', headerName: 'Subject', minWidth: 160, flex: 1 } as ColDef<AnyRow>,
  actions: { headerName: 'Actions', minWidth: 90, width: 90, flex: 0 } as ColDef<AnyRow>,
}

function makePrefActionsRenderer(onDelete: (row: AnyRow) => void) {
  return (p: ICellRendererParams<AnyRow>) => (
    <TableRowActions onDelete={() => onDelete(p.data ?? {})} deleteLabel="Remove preference" />
  )
}

type FormState = {
  collegeId: string
  isEmp: boolean
  evaluatorEmpId: string
  userId: number | null
  titleId: string
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
    collegeId: '',
    isEmp: false,
    evaluatorEmpId: '',
    userId: null,
    titleId: '',
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

// Validation patterns mirror the Angular create-evaluator form.
// Angular CONSTANTS.patterns (extracted from the deployed bundle):
//   phNo: [6-9]{1}[0-9]{9}   email: ^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+.[a-zA-Z0-9-.]+$
//   aadharNo: [0-9]{12}      panNo: ^[A-Za-z]{5}[0-9]{4}[A-Za-z]$
const RE_EMAIL = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/
const RE_PHONE = /^[6-9][0-9]{9}$/
const RE_AADHAR = /^[0-9]{12}$/
const RE_PAN = /^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/

function validateEvaluatorFields(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.isEmp && !form.collegeId) errors.collegeId = 'University College is required.'
  if (!form.titleId) errors.titleId = 'Title is required.'
  if (!form.evaluatorName.trim()) errors.evaluatorName = 'Name is required.'
  if (form.email.trim() && !RE_EMAIL.test(form.email.trim())) errors.email = 'Enter a valid email.'
  if (!RE_PHONE.test(form.phoneNumber.trim())) errors.phoneNumber = 'Phone Number must be 10 digits starting with 6-9.'
  if (!RE_PHONE.test(form.alternatePhoneNumber.trim())) {
    errors.alternatePhoneNumber = 'Alternate Phone must be 10 digits starting with 6-9.'
  }
  if (!RE_AADHAR.test(form.aadhar.trim())) errors.aadhar = 'Aadhar must be 12 digits.'
  if (form.panCardNo.trim() && !RE_PAN.test(form.panCardNo.trim())) {
    errors.panCardNo = 'Enter a valid PAN number (e.g. ABCDE1234F).'
  }
  if (!form.profileValidFromDate) errors.profileValidFromDate = 'Start Date is required.'
  if (!form.profileValidToDate) errors.profileValidToDate = 'End Date is required.'
  if (!form.isActive && !form.reason.trim()) errors.reason = 'Reason is required when inactive.'
  return errors
}

export default function CreateEvaluatorsPage() {
  const router = useRouter()
  const employeeId = Number(globalThis?.localStorage?.getItem('employeeId') ?? 0)

  const [rows, setRows] = useState<AnyRow[]>([])
  const [colleges, setColleges] = useState<AnyRow[]>([])
  const [titles, setTitles] = useState<AnyRow[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editRow, setEditRow] = useState<AnyRow | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([])
  const [employeeCache, setEmployeeCache] = useState<AnyRow[]>([])
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [prefFieldErrors, setPrefFieldErrors] = useState<Record<string, string>>({})

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
  const [credFieldErrors, setCredFieldErrors] = useState<Record<string, string>>({})
  const [credMode, setCredMode] = useState<'bulk' | 'single'>('bulk')
  const [credSingleRow, setCredSingleRow] = useState<AnyRow | null>(null)
  const [credFilterRows, setCredFilterRows] = useState<AnyRow[]>([])
  const [credCourseId, setCredCourseId] = useState<number | null>(null)
  const [credAcademicYearId, setCredAcademicYearId] = useState<number | null>(null)
  const [credExamId, setCredExamId] = useState<number | null>(null)
  const [credExamSearch, setCredExamSearch] = useState('')
  const [credRoleId, setCredRoleId] = useState<number | null>(null)
  const [credRoles, setCredRoles] = useState<AnyRow[]>([])

  const [bankOpen, setBankOpen] = useState(false)
  const [bankProfile, setBankProfile] = useState<AnyRow | null>(null)
  const [bankEditId, setBankEditId] = useState<number | null>(null)
  const [bankForm, setBankForm] = useState({
    bankName: '',
    branchName: '',
    bankAddress: '',
    phone: '',
    ifscCode: '',
    accountNumber: '',
    upi: '',
    isActive: true,
    reason: '',
  })

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
    void (async () => {
      const list = await listEvaluatorTitles().catch(() => [])
      setTitles(Array.isArray(list) ? list : [])
    })()
  }, [])

  const titleOptions: SelectOption[] = useMemo(
    () =>
      titles.map((t) => ({
        value: String(pickNum(t, ['generalDetailId'])),
        label: pickText(t, ['generalDetailDisplayName', 'generalDetailName']),
      })),
    [titles],
  )

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
      const [f, roles] = await Promise.all([
        getEvaluationExamFilters(employeeId).catch(() => []),
        getAssignSubjectsEvaluatorRoles().catch(() => []),
      ])
      setCredFilterRows(Array.isArray(f) ? f : [])
      setCredRoles(Array.isArray(roles) ? roles : [])
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
    setCredRoleId(null)
    setCredFieldErrors({})
  }

  const credRoleOptions: SelectOption[] = useMemo(
    () =>
      credRoles.map((r) => ({
        value: String(pickNum(r, ['pk_role_id', 'roleId'])),
        label: pickText(r, ['role_name', 'roleName']),
      })),
    [credRoles],
  )

  function openSendCredentialsModal(mode: 'bulk' | 'single', row?: AnyRow) {
    setCredMode(mode)
    setCredSingleRow(row ?? null)
    resetCredForm()
    setCredOpen(true)
  }

  function buildSendCredentialsItem(examEvaluatorProfileId: number, examId: number, evaluatorRoleId: number): AnyRow {
    return {
      examEvaluatorProfileId,
      examId,
      examEvaluatorProfileDetailsDTOS: [{ evaluatorRoleId }],
    }
  }

  function validateCredSend(): boolean {
    const next: Record<string, string> = {}
    if (!credCourseId) next.courseId = 'Course is required.'
    if (!credAcademicYearId) next.academicYearId = 'Academic year is required.'
    if (!credExamId) next.examId = 'Exam is required.'
    if (!credRoleId) next.roleId = 'Role is required.'
    setCredFieldErrors(next)
    return Object.keys(next).length === 0
  }

  async function submitSendCredentials() {
    if (!validateCredSend()) return
    const examId = credExamId!
    const roleId = credRoleId!
    setLoading(true)
    try {
      let payload: AnyRow[]
      if (credMode === 'single' && credSingleRow?.examEvaluatorProfileId) {
        payload = [buildSendCredentialsItem(
          Number(credSingleRow.examEvaluatorProfileId),
          examId,
          roleId,
        )]
      } else {
        payload = rows
          .map((r) => buildSendCredentialsItem(
            Number(r.examEvaluatorProfileId),
            examId,
            roleId,
          ))
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
    } catch (error) {
      toastError(error, 'Failed to send credentials.')
    } finally {
      setLoading(false)
    }
  }

  // Angular AddBankDetails(): look up existing bank row by profile; edit it if
  // present, else open a blank create form (phone defaults to the evaluator's).
  async function openBank(row: AnyRow) {
    const profileId = Number(row?.examEvaluatorProfileId ?? 0)
    if (profileId <= 0) {
      toastError('Invalid evaluator profile.')
      return
    }
    setBankProfile(row)
    setLoading(true)
    try {
      const existing = await getEvaluatorBankDetails(profileId)
      const b = Array.isArray(existing) && existing.length > 0 ? existing[0] : null
      if (b) {
        setBankEditId(Number(b.evaluatorBankDetailId) || null)
        setBankForm({
          bankName: String(b.bankName ?? ''),
          branchName: String(b.branchName ?? ''),
          bankAddress: String(b.bankAddress ?? ''),
          phone: String(b.phone ?? row.phoneNumber ?? ''),
          ifscCode: String(b.ifscCode ?? ''),
          accountNumber: String(b.accountNumber ?? ''),
          upi: String(b.upi ?? ''),
          isActive: b.isActive !== false,
          reason: String(b.reason ?? ''),
        })
      } else {
        setBankEditId(null)
        setBankForm({
          bankName: '',
          branchName: '',
          bankAddress: '',
          phone: String(row.phoneNumber ?? ''),
          ifscCode: '',
          accountNumber: '',
          upi: '',
          isActive: true,
          reason: '',
        })
      }
      setBankOpen(true)
    } finally {
      setLoading(false)
    }
  }

  async function saveBank() {
    if (!bankForm.phone || !bankForm.ifscCode || !bankForm.accountNumber) {
      toastError('Phone, IFSC code and account number are required.')
      return
    }
    const profileId = Number(bankProfile?.examEvaluatorProfileId ?? 0)
    setLoading(true)
    try {
      const payload: AnyRow = {
        bankName: bankForm.bankName || null,
        branchName: bankForm.branchName || null,
        bankAddress: bankForm.bankAddress || null,
        phone: bankForm.phone,
        ifscCode: bankForm.ifscCode,
        accountNumber: bankForm.accountNumber,
        upi: bankForm.upi || null,
        isActive: bankForm.isActive,
        reason: bankForm.isActive ? null : bankForm.reason || null,
      }
      if (bankEditId) {
        await updateEvaluatorBankDetails(bankEditId, { ...payload, evaluatorBankDetailId: bankEditId })
      } else {
        await createEvaluatorBankDetails({ ...payload, examEvaluatorProfilesId: profileId })
      }
      toastSuccess('Bank details saved.')
      setBankOpen(false)
      await loadList()
    } catch (e: any) {
      toastError(e?.message ?? 'Failed to save bank details.')
    } finally {
      setLoading(false)
    }
  }

  // Angular enteredEmployee(): search once the term exceeds 4 chars.
  const onEmployeeSearch = useCallback(async (q: string) => {
    if (!q || q.trim().length <= 4) {
      setEmployeeOptions([])
      return
    }
    setEmployeeSearchLoading(true)
    try {
      const list = await searchEvaluatorEmployees(q.trim()).catch(() => [])
      const rows = Array.isArray(list) ? list : []
      setEmployeeCache(rows)
      setEmployeeOptions(
        rows.map((emp, i) => ({
          value: String(emp?.employeeId ?? i),
          label: `${String(emp?.empNumber ?? '')}${emp?.firstName ? ` (${String(emp.firstName)})` : ''}`,
        })),
      )
    } finally {
      setEmployeeSearchLoading(false)
    }
  }, [])

  // Angular setEmployee(): autofill college/email/name/phone/userId from the pick.
  function onSelectEmployeeId(employeeId: string | null) {
    const emp = employeeCache.find((e) => String(e?.employeeId) === employeeId)
    if (!emp) {
      setForm((p) => ({ ...p, evaluatorEmpId: '', userId: null }))
      return
    }
    setForm((p) => ({
      ...p,
      evaluatorEmpId: emp?.employeeId != null ? String(emp.employeeId) : '',
      userId: emp?.userId != null ? Number(emp.userId) : null,
      collegeId: emp?.collegeId != null ? String(emp.collegeId) : p.collegeId,
      email: emp?.email != null ? String(emp.email) : p.email,
      evaluatorName: emp?.firstName != null ? String(emp.firstName) : p.evaluatorName,
      phoneNumber: emp?.mobile != null ? String(emp.mobile) : p.phoneNumber,
    }))
  }

  function openAdd() {
    setEditRow(null)
    setForm(emptyForm())
    setEmployeeOptions([])
    setEmployeeCache([])
    setFieldErrors({})
    setModalOpen(true)
  }

  function openEdit(row: AnyRow) {
    setFieldErrors({})
    setEditRow(row)
    setForm({
      collegeId: row?.collegeId != null ? String(row.collegeId) : '',
      isEmp: false,
      evaluatorEmpId: row?.evaluatorEmpId != null ? String(row.evaluatorEmpId) : '',
      userId: row?.userId != null ? Number(row.userId) : null,
      titleId: row?.titleId != null ? String(row.titleId) : '',
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

  /** Angular serializes form Dates straight into JSON (full ISO datetime). */
  function toIsoDateTime(value: string): string {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? value : d.toISOString()
  }

  async function onSave() {
    const nextErrors = validateEvaluatorFields(form)
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    // Mirror Angular submit() Obj exactly (same JSON for add + edit).
    const payload: AnyRow = {
      collegeId: form.collegeId ? Number(form.collegeId) : null,
      evaluatorEmpId: form.evaluatorEmpId ? Number(form.evaluatorEmpId) : null,
      userId: form.userId ?? null,
      roleId: null,
      titleId: form.titleId ? Number(form.titleId) : null,
      evaluatorName: form.evaluatorName,
      phoneNumber: form.phoneNumber,
      alternatePhoneNumber: form.alternatePhoneNumber,
      email: form.email,
      aadhar: form.aadhar,
      panCardNo: form.panCardNo.toUpperCase(),
      // Angular serializes Date objects -> full ISO datetimes in the JSON.
      profileValidFromDate: toIsoDateTime(form.profileValidFromDate),
      profileValidToDate: toIsoDateTime(form.profileValidToDate),
      isActive: form.isActive,
      // Angular always sends the reason form value (defaults to '').
      reason: form.reason ?? '',
      // Angular: +localStorage.getItem('employeeId') -> 0 when absent, never null.
      createdUser: employeeId || 0,
      examEvaluatorProfileDetailsDTOS: editRow?.examEvaluatorProfileDetailsDTOS ?? [],
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
    } catch (error) {
      // Pass the error object itself — toastError(getErrorMessage) extracts
      // the real Spring message; passing a string collapsed every failure to
      // the generic "unexpected error" toast.
      toastError(error, 'Failed to save evaluator profile')
    } finally {
      setLoading(false)
    }
  }

  const openSubjects = useCallback(
    (row: AnyRow) => {
      const profileId = Number(row?.examEvaluatorProfileId ?? 0)
      if (profileId > 0) {
        // Angular viewSubjects(): navigate to the evaluator-subject-roles page
        // with the profile row (that page reads examEvaluatorProfileId + the
        // cached evaluatorSubjectRoleProfile).
        globalThis?.localStorage?.setItem('evaluatorSubjectRoleProfile', JSON.stringify(row))
        router.push(`/admin-examination-management/evaluation-process/create-evaluators/evaluator-subject-roles?examEvaluatorProfileId=${profileId}`)
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
      setPrefAll(list.map((r) => normalizePrefRow(r, profileId)))
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
      setPrefFieldErrors({})
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

  function validatePrefAdd(): boolean {
    const next: Record<string, string> = {}
    if (!prefCourseId) next.courseId = 'Course is required.'
    if (!prefRegulationId) next.regulationId = 'Regulation is required.'
    if (prefSubjectIds.length === 0) next.subjectIds = 'Select at least one subject.'
    setPrefFieldErrors(next)
    return Object.keys(next).length === 0
  }

  function addPreferenceRow() {
    if (!prefRow?.examEvaluatorProfileId) {
      toastError('Invalid evaluator profile.')
      return
    }
    if (!validatePrefAdd()) return
    const courseObj = prefCourses.find((c) => pickNum(c, ['courseId']) === prefCourseId)
    const regulationObj = prefRegulations.find((r) => pickNum(r, ['regulationId']) === prefRegulationId)
    let duplicate = false
    const next = [...prefAll]
    for (const sid of prefSubjectIds.map(Number)) {
      const subjectObj = prefSubjects.find((s) => pickNum(s, ['subjectId']) === sid)
      const existing = next.find(
        (p) =>
          prefCourseIdOf(p) === prefCourseId &&
          prefRegulationIdOf(p) === prefRegulationId &&
          prefSubjectIdOf(p) === sid,
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
    setPrefFieldErrors({})
  }

  const deletePrefRow = useCallback((row: AnyRow) => {
    setPrefAll((prev) => {
      if (!isPersistedPrefRow(row)) {
        return prev.filter((p) => !prefRowsMatch(p, row))
      }
      return prev.map((p) => (prefRowsMatch(p, row) ? { ...p, isActive: false } : p))
    })
  }, [])

  const prefTableRows = useMemo(() => prefAll.filter((p) => p.isActive !== false), [prefAll])

  const prefColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      PREF_COL_DEFS.course,
      PREF_COL_DEFS.regulation,
      PREF_COL_DEFS.subject,
      { ...PREF_COL_DEFS.actions, cellRenderer: makePrefActionsRenderer(deletePrefRow) },
    ],
    [deletePrefRow],
  )

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
    const hasPendingDeletes = prefAll.some((p) => p.isActive === false)
    if (prefTableRows.length === 0 && !hasPendingDeletes) {
      if (!validatePrefAdd()) return
      setPrefFieldErrors({ subjectIds: 'Add at least one preference before saving.' })
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
      { headerName: 'S.NO', valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1, width: 70 },
      { field: 'collegeCode', headerName: 'College', minWidth: 120 },
      { field: 'evaluatorName', headerName: 'Name', minWidth: 220 },
      { field: 'phoneNumber', headerName: 'Phone', minWidth: 130 },
      { field: 'email', headerName: 'Email', minWidth: 220 },
      { field: 'aadhar', headerName: 'AadharCard', minWidth: 150 },
      { headerName: 'Details', minWidth: 170, cellRenderer: makeDetailsRenderer(openSubjects, openPreferences) },
      { field: 'isActive', headerName: 'Status', minWidth: 100, cellRenderer: statusRenderer },
      {
        headerName: 'Actions',
        minWidth: 130,
        cellRenderer: makeActionsRenderer(openEdit, (row) => openSendCredentialsModal('single', row), openBank),
      },
    ],
    [openSubjects, openPreferences],
  )

  const evaluatorName = pickText(prefRow, ['evaluatorName'])

  return (
    <PageContainer className="space-y-4">
      {/* <PageHeader title="Create Evaluators" subtitle="Assign evaluators to examinations" /> */}
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">Evaluator&apos;s Profile</h2>
        </div>
        <div className="p-4 space-y-3">
          <DataTable
            rowData={rows}
            columnDefs={cols}
            pagination
            loading={loading}
            subtitle=""
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
            {!editRow && (
              <div className="md:col-span-3 flex items-center gap-2">
                <Checkbox
                  checked={form.isEmp}
                  onCheckedChange={(v) => {
                    setForm((p) => ({ ...p, isEmp: v === true, evaluatorEmpId: '', userId: null }))
                    setEmployeeOptions([])
                    setEmployeeCache([])
                  }}
                />
                <span className="text-[12px]">Existing Employee</span>
              </div>
            )}
            {form.isEmp ? (
              <div className="md:col-span-2 space-y-1">
                <Label className="text-[12px]">Employee</Label>
                <Select
                  value={form.evaluatorEmpId || null}
                  onChange={onSelectEmployeeId}
                  options={employeeOptions}
                  placeholder="Search by employee name or empNo."
                  searchable
                  onSearch={onEmployeeSearch}
                  isLoading={employeeSearchLoading}
                />
                {fieldErrors.evaluatorEmpId ? (
                  <p className="text-[11px] text-destructive">{fieldErrors.evaluatorEmpId}</p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-[12px]">University College <span className="text-red-600">*</span></Label>
                <Select
                  value={form.collegeId || null}
                  onChange={(v) => setForm((p) => ({ ...p, collegeId: v ?? '' }))}
                  options={colleges.map((c) => ({
                    value: String(c?.collegeId ?? c?.pk_college_id ?? ''),
                    label: String(c?.collegeCode ?? c?.college_code ?? c?.collegeName ?? c?.college_name ?? ''),
                  } as SelectOption))}
                  placeholder="University College"
                />
                {fieldErrors.collegeId ? (
                  <p className="text-[11px] text-destructive">{fieldErrors.collegeId}</p>
                ) : null}
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-[12px]">Title <span className="text-red-600">*</span></Label>
              <Select
                value={form.titleId || null}
                onChange={(v) => setForm((p) => ({ ...p, titleId: v ?? '' }))}
                options={titleOptions}
                placeholder="Title"
              />
              {fieldErrors.titleId ? (
                <p className="text-[11px] text-destructive">{fieldErrors.titleId}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Name <span className="text-red-600">*</span></Label>
              <Input
                value={form.evaluatorName}
                onChange={(e) => setForm((p) => ({ ...p, evaluatorName: e.target.value }))}
                placeholder="Name"
              />
              {fieldErrors.evaluatorName ? (
                <p className="text-[11px] text-destructive">{fieldErrors.evaluatorName}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Email <span className="text-red-600">*</span></Label>
              <Input
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="Email"
              />
              {fieldErrors.email ? (
                <p className="text-[11px] text-destructive">{fieldErrors.email}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Phone Number <span className="text-red-600">*</span></Label>
              <Input
                value={form.phoneNumber}
                onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                placeholder="Phone Number"
              />
              {fieldErrors.phoneNumber ? (
                <p className="text-[11px] text-destructive">{fieldErrors.phoneNumber}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Alternate Phone <span className="text-red-600">*</span></Label>
              <Input
                value={form.alternatePhoneNumber}
                onChange={(e) => setForm((p) => ({ ...p, alternatePhoneNumber: e.target.value }))}
                placeholder="Alternate Phone"
              />
              {fieldErrors.alternatePhoneNumber ? (
                <p className="text-[11px] text-destructive">{fieldErrors.alternatePhoneNumber}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Aadhar <span className="text-red-600">*</span></Label>
              <Input
                value={form.aadhar}
                onChange={(e) => setForm((p) => ({ ...p, aadhar: e.target.value }))}
                placeholder="Aadhar"
              />
              {fieldErrors.aadhar ? (
                <p className="text-[11px] text-destructive">{fieldErrors.aadhar}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Pan Card No. <span className="text-red-600">*</span></Label>
              <Input
                value={form.panCardNo}
                onChange={(e) => setForm((p) => ({ ...p, panCardNo: e.target.value }))}
                placeholder="Pan Card No."
              />
              {fieldErrors.panCardNo ? (
                <p className="text-[11px] text-destructive">{fieldErrors.panCardNo}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">Start Date <span className="text-red-600">*</span></Label>
              <Input
                type="date"
                className="org-modal-date-input pr-10"
                value={form.profileValidFromDate}
                onChange={(e) => setForm((p) => ({ ...p, profileValidFromDate: e.target.value }))}
                placeholder="Start Date"
              />
              {fieldErrors.profileValidFromDate ? (
                <p className="text-[11px] text-destructive">{fieldErrors.profileValidFromDate}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label className="text-[12px]">End Date <span className="text-red-600">*</span></Label>
              <Input
                type="date"
                className="org-modal-date-input pr-10"
                value={form.profileValidToDate}
                onChange={(e) => setForm((p) => ({ ...p, profileValidToDate: e.target.value }))}
                placeholder="End Date"
              />
              {fieldErrors.profileValidToDate ? (
                <p className="text-[11px] text-destructive">{fieldErrors.profileValidToDate}</p>
              ) : null}
            </div>
            <div className="md:col-span-3 flex items-center gap-2">
              <Checkbox checked={form.isActive} onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v === true }))} />
              <span className="text-[12px]">Active</span>
            </div>
            {!form.isActive && (
              <div className="md:col-span-3 space-y-1">
                <Label className="text-[12px]">Reason</Label>
                <Input
                  value={form.reason}
                  onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="Reason"
                />
                {fieldErrors.reason ? (
                  <p className="text-[11px] text-destructive">{fieldErrors.reason}</p>
                ) : null}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={() => void onSave()} disabled={loading}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={prefOpen} onOpenChange={setPrefOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Add Preferences — {evaluatorName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
              <div className="md:col-span-3 space-y-1">
                <Label className="text-[12px]">
                  Course <span className="text-red-600">*</span>
                </Label>
                <Select
                  value={prefCourseId ? String(prefCourseId) : null}
                  onChange={(v) => {
                    setPrefCourseId(v ? Number(v) : null)
                    setPrefRegulationId(null)
                    setPrefSubjectIds([])
                    if (prefFieldErrors.courseId) {
                      setPrefFieldErrors((prev) => {
                        const next = { ...prev }
                        delete next.courseId
                        return next
                      })
                    }
                  }}
                  options={prefCourses.map((c) => ({ value: String(pickNum(c, ['courseId'])), label: pickText(c, ['courseCode']) } as SelectOption))}
                  placeholder="Course"
                  disabled={prefLoading}
                  error={prefFieldErrors.courseId}
                />
              </div>
              <div className="md:col-span-3 space-y-1">
                <Label className="text-[12px]">
                  Regulation <span className="text-red-600">*</span>
                </Label>
                <Select
                  value={prefRegulationId ? String(prefRegulationId) : null}
                  onChange={(v) => {
                    setPrefRegulationId(v ? Number(v) : null)
                    if (prefFieldErrors.regulationId) {
                      setPrefFieldErrors((prev) => {
                        const next = { ...prev }
                        delete next.regulationId
                        return next
                      })
                    }
                  }}
                  options={prefRegulations.map((r) => ({ value: String(pickNum(r, ['regulationId'])), label: pickText(r, ['regulationName', 'regulationCode']) } as SelectOption))}
                  placeholder="Regulation"
                  disabled={!prefCourseId}
                  error={prefFieldErrors.regulationId}
                />
              </div>
              <div className="md:col-span-4 space-y-1">
                <Label className="text-[12px]">
                  Subjects <span className="text-red-600">*</span>
                </Label>
                <MultiSelect
                  value={prefSubjectIds}
                  onChange={(ids) => {
                    setPrefSubjectIds(ids)
                    if (prefFieldErrors.subjectIds) {
                      setPrefFieldErrors((prev) => {
                        const next = { ...prev }
                        delete next.subjectIds
                        return next
                      })
                    }
                  }}
                  options={subjectOptions}
                  placeholder="Subjects"
                  searchable
                  showSelectAll
                  disabled={!prefCourseId}
                  error={prefFieldErrors.subjectIds}
                />
              </div>
              <div className="md:col-span-2 flex items-end self-stretch pb-0.5">
                <Button type="button" className="h-9 w-full md:w-auto" onClick={addPreferenceRow} disabled={loading || prefLoading}>
                  Add
                </Button>
              </div>
            </div>

            {prefTableRows.length > 0 && (
              <DataTable
                rowData={prefTableRows}
                columnDefs={prefColumnDefs}
                pagination={false}
                toolbar={false}
                bordered
                height="210px"
                getRowId={(p) => prefRowKey(p.data)}
              />
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPrefOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={() => void savePreferences()} disabled={loading || prefLoading}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={credOpen} onOpenChange={setCredOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Send Credentials</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
              <div className="md:col-span-3 space-y-1">
                <Label className="text-[12px]">
                  Course <span className="text-red-600">*</span>
                </Label>
                <Select
                  value={credCourseId ? String(credCourseId) : null}
                  onChange={(v) => {
                    setCredCourseId(v ? Number(v) : null)
                    setCredAcademicYearId(null)
                    setCredExamId(null)
                    if (credFieldErrors.courseId) {
                      setCredFieldErrors((prev) => {
                        const next = { ...prev }
                        delete next.courseId
                        return next
                      })
                    }
                  }}
                  options={credCourses.map((c) => ({ value: String(pickNum(c, ['fk_course_id'])), label: pickText(c, ['course_code', 'courseCode']) } as SelectOption))}
                  placeholder="Course"
                  error={credFieldErrors.courseId}
                />
              </div>
              <div className="md:col-span-3 space-y-1">
                <Label className="text-[12px]">
                  Academic Year <span className="text-red-600">*</span>
                </Label>
                <Select
                  value={credAcademicYearId ? String(credAcademicYearId) : null}
                  onChange={(v) => {
                    setCredAcademicYearId(v ? Number(v) : null)
                    setCredExamId(null)
                    if (credFieldErrors.academicYearId) {
                      setCredFieldErrors((prev) => {
                        const next = { ...prev }
                        delete next.academicYearId
                        return next
                      })
                    }
                  }}
                  options={credAcademicYears.map((a) => ({ value: String(pickNum(a, ['fk_academic_year_id'])), label: pickText(a, ['academic_year']) } as SelectOption))}
                  placeholder="Academic Year"
                  disabled={!credCourseId}
                  error={credFieldErrors.academicYearId}
                />
              </div>
              <div className="md:col-span-6 space-y-1">
                <Label className="text-[12px]">
                  Exam <span className="text-red-600">*</span>
                </Label>
                <Select
                  value={credExamId ? String(credExamId) : null}
                  onChange={(v) => {
                    setCredExamId(v ? Number(v) : null)
                    if (credFieldErrors.examId) {
                      setCredFieldErrors((prev) => {
                        const next = { ...prev }
                        delete next.examId
                        return next
                      })
                    }
                  }}
                  options={credExams.map((e) => ({ value: String(pickNum(e, ['fk_exam_id'])), label: `${pickText(e, ['exam_name'])} (${formatYmd(e.from_date ?? e.fromDate)} – ${formatYmd(e.to_date ?? e.toDate)})` } as SelectOption))}
                  placeholder="Exam"
                  searchable
                  wrapOptionLabels
                  disabled={!credCourseId || !credAcademicYearId}
                  error={credFieldErrors.examId}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
              <div className="md:col-span-6 space-y-1">
                <Label className="text-[12px]">
                  Select Role <span className="text-red-600">*</span>
                </Label>
                <Select
                  value={credRoleId ? String(credRoleId) : null}
                  onChange={(v) => {
                    setCredRoleId(v ? Number(v) : null)
                    if (credFieldErrors.roleId) {
                      setCredFieldErrors((prev) => {
                        const next = { ...prev }
                        delete next.roleId
                        return next
                      })
                    }
                  }}
                  options={credRoleOptions}
                  placeholder="Select Role"
                  wrapOptionLabels
                  error={credFieldErrors.roleId}
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
          <DialogFooter className="gap-2">
            <Button onClick={() => void submitSendCredentials()} disabled={loading}>
              Send
            </Button>
            <Button variant="outline" onClick={() => setCredOpen(false)} disabled={loading}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bankOpen} onOpenChange={setBankOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{bankEditId ? 'Edit Bank Details' : 'Add Bank Details'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border-2 border-[#B2EBF2] p-2">
              <BankSummaryRow label="Evaluator :" value={pickText(bankProfile, ['evaluatorName'])} />
              <BankSummaryRow label="Role :" value={pickText(bankProfile, ['roleName', 'role_name'])} />
              <BankSummaryRow label="Mobile :" value={pickText(bankProfile, ['phoneNumber', 'phone'])} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-[12px]">Bank Name</Label>
                <Input
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm((p) => ({ ...p, bankName: e.target.value }))}
                  placeholder="Bank Name"
                />
              </div>
              <div>
                <Label className="text-[12px]">Branch Name</Label>
                <Input
                  value={bankForm.branchName}
                  onChange={(e) => setBankForm((p) => ({ ...p, branchName: e.target.value }))}
                  placeholder="Branch Name"
                />
              </div>
              <div>
                <Label className="text-[12px]">Account Number</Label>
                <Input
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm((p) => ({ ...p, accountNumber: e.target.value }))}
                  placeholder="Account Number"
                />
              </div>
              <div>
                <Label className="text-[12px]">Ifsc Code</Label>
                <Input
                  value={bankForm.ifscCode}
                  onChange={(e) => setBankForm((p) => ({ ...p, ifscCode: e.target.value }))}
                  placeholder="Ifsc Code"
                />
              </div>
              <div>
                <Label className="text-[12px]">Bank Address</Label>
                <Input
                  value={bankForm.bankAddress}
                  onChange={(e) => setBankForm((p) => ({ ...p, bankAddress: e.target.value }))}
                  placeholder="Bank Address"
                />
              </div>
              <div>
                <Label className="text-[12px]">Phone no</Label>
                <Input
                  value={bankForm.phone}
                  onChange={(e) => setBankForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="Phone no"
                />
              </div>
              <div>
                <Label className="text-[12px]">Upi</Label>
                <Input
                  value={bankForm.upi}
                  onChange={(e) => setBankForm((p) => ({ ...p, upi: e.target.value }))}
                  placeholder="Upi"
                />
              </div>
              <div className="md:col-span-3 flex items-center gap-2">
                <Checkbox checked={bankForm.isActive} onCheckedChange={(v) => setBankForm((p) => ({ ...p, isActive: v === true }))} />
                <span className="text-[12px]">Active</span>
              </div>
              {!bankForm.isActive && (
                <div className="md:col-span-3">
                  <Label className="text-[12px]">Reason</Label>
                  <Input
                    value={bankForm.reason}
                    onChange={(e) => setBankForm((p) => ({ ...p, reason: e.target.value }))}
                    placeholder="Reason"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBankOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={() => void saveBank()} disabled={loading}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
