'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ColDef, ICellRendererParams, ValueGetterParams } from 'ag-grid-community'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { BookOpen, Eye, EyeOff, Loader2, PencilIcon, PlusIcon, ShieldCheck, User, X } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { SearchInput } from '@/common/components/search'
import { StatusBadge } from '@/common/components/data-display'
import { FormModal } from '@/common/components/feedback'
import { FormField } from '@/common/components/forms'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select } from '@/common/components/select'
import { scheduleNavigation } from '@/lib/schedule-navigation'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { MINIO_URL } from '@/config/constants/api'
import {
  createStudentUserAccountForStudent,
  fetchStudentDetail,
  getStudentAccountById,
  listRolesByOrganization,
  listStaffAccountColleges,
  listStudentAccountsPage,
  listStudentsByCollegeForStudentAccount,
  searchStudentsByCollegeForStudentAccount,
  listUserRoles,
  saveUserRoles,
  updateStudentAccount,
  type CreateStudentUserAccountForm,
  type StudentAccount,
  type StudentForAccountPick,
  type UserRole,
} from '@/services'
import type { College } from '@/types/college'
const DEFAULT_PAGE_SIZE = 50

const EMPTY_ADD_ACCOUNT_FORM: CreateStudentUserAccountForm = {
  firstName: '',
  lastName: '',
  userName: '',
  email: '',
  mobileNumber: '',
  password: '',
  passwordConfirm: '',
}

/** Same initial password as legacy auto-create (user can change before Save). */
const ADD_ACCOUNT_DEFAULT_PASSWORD = 'Student@123'

function strDetail(v: unknown): string {
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return ''
}

function mergeStudentDetailFragment(row: Record<string, unknown>): Record<string, unknown> {
  const chunks = [row.studentDetail, row.StudentDetail, row.studentProfile, row.StudentProfile].filter(
    (v): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v),
  )
  const nested = chunks.reduce<Record<string, unknown>>((acc, cur) => ({ ...acc, ...cur }), {})
  return { ...row, ...nested }
}

function studentPhotoUrl(d: Record<string, unknown>): string | null {
  const p = strDetail(d.studentPhotoPath ?? d.student_photo_path ?? d.photoPath)
  if (!p) return null
  if (p.startsWith('http')) return p
  const base = MINIO_URL.replace(/\/$/, '')
  const path = p.startsWith('/') ? p : `/${p}`
  return base ? `${base}${path}` : p
}

function academicSummaryLine(d: Record<string, unknown>, collegeCode: string): string {
  const m = mergeStudentDetailFragment(d)
  const yearSem =
    [strDetail(m.courseYearName), strDetail(m.semesterName)].filter(Boolean).join(' ').trim()
    || strDetail(m.yearSemDetail ?? m.semesterDetail)
  const parts = [
    collegeCode || strDetail(m.collegeCode),
    strDetail(m.courseName ?? m.coursename),
    strDetail(m.departmentName ?? m.departmentCode ?? m.deptName),
    yearSem,
    strDetail(m.sectionName ?? m.groupSectionName ?? m.section ?? m.groupsectionName),
  ].filter(Boolean)
  return parts.join(' / ') || collegeCode || '—'
}

function firstNonEmptyFromRow(row: Record<string, unknown> | null | undefined, keys: string[]): string {
  if (!row) return ''
  const m = mergeStudentDetailFragment(row)
  for (const k of keys) {
    const v = strDetail(m[k])
    if (v) return v
  }
  return ''
}

function emailFromMergedStudentRow(row: Record<string, unknown> | null | undefined): string {
  return firstNonEmptyFromRow(row, [
    'email',
    'studentEmail',
    'stdEmailId',
    'student_email',
    'std_email_id',
    'emailId',
    'mailId',
    'stdEmail',
    'studentEmailId',
    'collegeEmail',
  ])
}

function mobileFromMergedStudentRow(row: Record<string, unknown> | null | undefined): string {
  return firstNonEmptyFromRow(row, [
    'mobileNumber',
    'mobile_number',
    'student_mobile_no',
    'phone',
    'mobile',
    'contactNumber',
    'primaryContact',
    'fatherMobile',
    'motherMobile',
    'smsMobile',
    'whatsappNo',
    'whatsapp_no',
    'stdMobile',
  ])
}

function studentNameGetter(p: ValueGetterParams<StudentAccount>) {
  const d = p.data
  if (!d) return ''
  const parts = [d.firstName, d.lastName].filter(Boolean)
  return parts.join(' ').trim() || (d.userName ?? '')
}

function makeSiNoGetter(page: number, pageSize: number) {
  return (p: ValueGetterParams<StudentAccount>) => {
    const ri = p.node?.rowIndex
    const local = typeof ri === 'number' ? ri : 0
    return page * pageSize + local + 1
  }
}

const COL_DEFS = {
  siNo: { headerName: 'SI.No', width: 70, flex: 0 } as ColDef<StudentAccount>,
  studentName: { headerName: 'Student Name', minWidth: 180, flex: 1 } as ColDef<StudentAccount>,
  collegeCode: { field: 'collegeCode', headerName: 'College', minWidth: 120, flex: 0.8 } as ColDef<StudentAccount>,
  userName: { field: 'userName', headerName: 'User Name', minWidth: 170, flex: 1 } as ColDef<StudentAccount>,
  mobileNumber: { field: 'mobileNumber', headerName: 'Mobile No', minWidth: 130, flex: 0.7 } as ColDef<StudentAccount>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 110, flex: 0.6 } as ColDef<StudentAccount>,
  actions: { headerName: 'Actions', minWidth: 160, flex: 0 } as ColDef<StudentAccount>,
}

function statusRenderer(p: ICellRendererParams<StudentAccount>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  onRoles: (row: StudentAccount | null) => void,
  onEdit: (row: StudentAccount | null) => void,
) {
  return (p: ICellRendererParams<StudentAccount>) => {
    const row = p.data ?? null
    return (
      <div className="flex flex-wrap items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={() => onRoles(row)}
        >
          <ShieldCheck className="mr-1 h-3 w-3" />
          User Roles
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          aria-label="Edit student account"
          onClick={() => onEdit(row)}
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }
}

export default function StudentAccountsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [searchValue, setSearchValue] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [addCollegeId, setAddCollegeId] = useState<string | null>(null)
  const [addStudentId, setAddStudentId] = useState<string | null>(null)
  const [addStudentSearchQuery, setAddStudentSearchQuery] = useState('')
  const [addAccountForm, setAddAccountForm] = useState<CreateStudentUserAccountForm>(EMPTY_ADD_ACCOUNT_FORM)
  const [addShowPassword, setAddShowPassword] = useState(false)
  const [addSaving, setAddSaving] = useState(false)
  const addFormHydrateStudentRef = useRef(0)
  const [editOpen, setEditOpen] = useState(false)
  const [rolesOpen, setRolesOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingRoles, setSavingRoles] = useState(false)
  const [roleIdToAdd, setRoleIdToAdd] = useState<string | null>(null)
  const [roleActiveToAdd, setRoleActiveToAdd] = useState(true)
  const [activeStudent, setActiveStudent] = useState<StudentAccount | null>(null)
  const [roleRows, setRoleRows] = useState<UserRole[]>([])
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    userName: '',
    email: '',
    mobileNumber: '',
    password: '',
    passwordConfirm: '',
    isActive: true,
    isEditable: false,
    isReset: false,
    reason: 'active',
  })

  const { data, isLoading } = useQuery({
    queryKey: QK.studentAccounts.list(page, pageSize),
    queryFn: () => listStudentAccountsPage(page, pageSize),
  })

  const { data: colleges = [], isLoading: collegesLoading } = useCrudList<College>({
    queryKey: QK.colleges.list(),
    queryFn: listStaffAccountColleges,
  })

  const addCollegeIdNum = addCollegeId ? Number(addCollegeId) : 0
  const addStudentIdNum = addStudentId ? Number(addStudentId) : 0

  const { data: addStudentDetail, isLoading: addStudentDetailLoading } = useQuery({
    queryKey: ['StudentAccounts', 'addModal', 'studentDetail', addStudentIdNum],
    queryFn: () => fetchStudentDetail(addStudentIdNum),
    enabled: addOpen && addStudentIdNum > 0,
  })
  const { data: collegeStudentRows = [], isLoading: collegeStudentsLoading } = useQuery({
    queryKey: ['StudentAccounts', 'addModal', 'students', addCollegeIdNum],
    queryFn: () => listStudentsByCollegeForStudentAccount(addCollegeIdNum),
    enabled: addOpen && addCollegeIdNum > 0,
  })

  const studentSearchTrimmed = addStudentSearchQuery.trim()
  const { data: studentSearchRows = [], isFetching: studentSearchFetching } = useQuery({
    queryKey: ['StudentAccounts', 'addModal', 'studentSearch', addCollegeIdNum, studentSearchTrimmed],
    queryFn: () => searchStudentsByCollegeForStudentAccount(addCollegeIdNum, studentSearchTrimmed),
    enabled: addOpen && addCollegeIdNum > 0 && studentSearchTrimmed.length > 0,
  })

  const studentPickRows = useMemo(
    () => (studentSearchTrimmed ? studentSearchRows : collegeStudentRows),
    [studentSearchTrimmed, studentSearchRows, collegeStudentRows],
  )

  const studentPickOptions = useMemo(() => {
    const labelOf = (s: StudentForAccountPick) => {
      const ht = s.hallticketNumber ?? s.rollNumber ?? ''
      const name = [s.firstName, s.lastName].filter(Boolean).join(' ').trim()
      // Match Angular picker: hallticket (FULL NAME) so search hits ID and name.
      if (ht && name) return `${ht} (${name})`
      return name || ht || `Student ${s.studentId}`
    }
    return studentPickRows.map((s) => ({ value: String(s.studentId), label: labelOf(s) }))
  }, [studentPickRows])

  const selectedPick = useMemo(
    () => studentPickRows.find((s) => s.studentId === addStudentIdNum) ?? null,
    [studentPickRows, addStudentIdNum],
  )

  const previewMerged = useMemo((): Record<string, unknown> | null => {
    if (!addStudentIdNum) return null
    const base: Record<string, unknown> = {}
    if (selectedPick) {
      base.studentId = selectedPick.studentId
      base.firstName = selectedPick.firstName
      base.lastName = selectedPick.lastName
      base.hallticketNumber = selectedPick.hallticketNumber
      base.rollNumber = selectedPick.rollNumber
    }
    if (addStudentDetail && typeof addStudentDetail === 'object') {
      return { ...base, ...(addStudentDetail as Record<string, unknown>) }
    }
    return Object.keys(base).length ? base : null
  }, [addStudentIdNum, selectedPick, addStudentDetail])

  const selectedAddCollege = useMemo(
    () => colleges.find((c) => c.collegeId === addCollegeIdNum) ?? null,
    [colleges, addCollegeIdNum],
  )

  useEffect(() => {
    if (searchParams.get('add') !== '1') return
    setAddCollegeId(null)
    setAddStudentId(null)
    setAddOpen(true)
    const cancel = scheduleNavigation(() => {
      router.replace('/user-management/student-accounts', { scroll: false })
    })
    return cancel
  }, [searchParams, router])

  useEffect(() => {
    if (!addOpen) {
      setAddStudentSearchQuery('')
      setAddAccountForm(EMPTY_ADD_ACCOUNT_FORM)
      setAddShowPassword(false)
      addFormHydrateStudentRef.current = 0
    }
  }, [addOpen])

  useEffect(() => {
    if (!addOpen) return
    setAddStudentId(null)
    setAddStudentSearchQuery('')
  }, [addCollegeId, addOpen])

  useEffect(() => {
    if (!addOpen) return
    if (!addStudentIdNum) {
      addFormHydrateStudentRef.current = 0
      setAddAccountForm(EMPTY_ADD_ACCOUNT_FORM)
      return
    }
    const studentJustChanged = addFormHydrateStudentRef.current !== addStudentIdNum
    addFormHydrateStudentRef.current = addStudentIdNum
    const pick = selectedPick
    const d =
      addStudentDetail && typeof addStudentDetail === 'object'
        ? mergeStudentDetailFragment(addStudentDetail as Record<string, unknown>)
        : null
    const hydrateSource: Record<string, unknown> | null =
      pick || (addStudentDetail && typeof addStudentDetail === 'object')
        ? {
            ...(pick
              ? {
                  studentId: pick.studentId,
                  firstName: pick.firstName,
                  lastName: pick.lastName,
                  hallticketNumber: pick.hallticketNumber,
                  rollNumber: pick.rollNumber,
                }
              : {}),
            ...(addStudentDetail && typeof addStudentDetail === 'object'
              ? (addStudentDetail as Record<string, unknown>)
              : {}),
          }
        : null
    const hall =
      pick?.hallticketNumber
      ?? pick?.rollNumber
      ?? strDetail(d?.hallticketNumber ?? d?.hallTicketNumber ?? d?.rollNumber)
    const namePick = pick ? [pick.firstName, pick.lastName].filter(Boolean).join(' ').trim() : ''
    let email = emailFromMergedStudentRow(hydrateSource ?? undefined)
    let mobile = mobileFromMergedStudentRow(hydrateSource ?? undefined)
    if (!email && hall) email = `${hall}@student.local`
    setAddAccountForm((prev) => ({
      firstName: strDetail(d?.firstName ?? d?.studentName) || namePick,
      lastName: strDetail(d?.lastName) || pick?.lastName || '',
      userName: hall,
      email,
      mobileNumber: mobile,
      password: studentJustChanged ? ADD_ACCOUNT_DEFAULT_PASSWORD : prev.password,
      passwordConfirm: studentJustChanged ? ADD_ACCOUNT_DEFAULT_PASSWORD : prev.passwordConfirm,
    }))
  }, [addOpen, addStudentIdNum, addStudentDetail, selectedPick])

  const rows = data?.rows ?? []
  const totalCount = data?.totalCount ?? 0

  const organizationId = activeStudent?.organizationId ?? 0

  const { data: roleOptions, isLoading: rolesLoading } = useCrudList({
    queryKey: ['StudentAccounts', 'roles', organizationId],
    queryFn: () => listRolesByOrganization(organizationId),
    enabled: rolesOpen && organizationId > 0,
  })

  const { data: existingUserRoles } = useCrudList({
    queryKey: ['StudentAccounts', 'userRoles', activeStudent?.userId ?? 0],
    queryFn: () => listUserRoles(activeStudent?.userId ?? 0),
    enabled: rolesOpen && !!activeStudent?.userId,
  })

  useEffect(() => {
    if (!rolesOpen) return
    setRoleRows(existingUserRoles.map((r) => ({ ...r, isActive: r.isActive !== false })))
  }, [existingUserRoles, rolesOpen])

  const filteredRows = useMemo(() => {
    const q = searchValue.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => (
      `${row.userName ?? ''} ${row.firstName ?? ''} ${row.lastName ?? ''} ${row.mobileNumber ?? ''} ${row.collegeCode ?? ''}`
        .toLowerCase()
        .includes(q)
    ))
  }, [rows, searchValue])

  const addPreview = useMemo(() => {
    if (!previewMerged) return null
    const m = mergeStudentDetailFragment(previewMerged)
    const collegeCode = selectedAddCollege?.collegeCode ?? ''
    const name =
      [strDetail(m.firstName), strDetail(m.lastName)].filter(Boolean).join(' ').trim()
      || strDetail(m.studentName)
      || (selectedPick ? [selectedPick.firstName, selectedPick.lastName].filter(Boolean).join(' ').trim() : '')
    const hall =
      strDetail(m.hallticketNumber ?? m.hallTicketNumber ?? m.rollNumber ?? m.roll_no)
      || selectedPick?.hallticketNumber
      || selectedPick?.rollNumber
      || '—'
    const phone = mobileFromMergedStudentRow(previewMerged) || '—'
    return {
      name,
      hall,
      academicLine: academicSummaryLine(previewMerged, collegeCode),
      phone,
      photoUrl: studentPhotoUrl(m),
    }
  }, [previewMerged, selectedAddCollege?.collegeCode, selectedPick])

  function invalidateList() {
    void queryClient.invalidateQueries({ queryKey: QK.studentAccounts.all })
  }

  const openRolesModal = useCallback((row: StudentAccount | null) => {
    if (!row) return
    if (!row.organizationId) {
      toastError('Organization is missing for this row; user roles cannot be loaded.')
      return
    }
    setActiveStudent(row)
    setRoleIdToAdd(null)
    setRoleActiveToAdd(true)
    setRolesOpen(true)
  }, [])

  const openEditModal = useCallback(async (row: StudentAccount | null) => {
    if (!row?.userId) return
    const full = await getStudentAccountById(row.userId).catch(() => null)
    const user = full ?? row
    setActiveStudent(user)
    setForm({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      userName: user.userName ?? '',
      email: user.email ?? '',
      mobileNumber: user.mobileNumber ?? '',
      password: user.password ?? '',
      passwordConfirm: user.password ?? '',
      isActive: user.isActive !== false,
      isEditable: user.isEditable ?? false,
      isReset: user.isReset ?? false,
      reason: user.reason ?? (user.isActive === false ? 'inactive' : 'active'),
    })
    setEditOpen(true)
  }, [])

  const columnDefs = useMemo<ColDef<StudentAccount>[]>(() => [
    { ...COL_DEFS.siNo, valueGetter: makeSiNoGetter(page, pageSize) },
    { ...COL_DEFS.studentName, valueGetter: studentNameGetter },
    COL_DEFS.collegeCode,
    COL_DEFS.userName,
    COL_DEFS.mobileNumber,
    { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
    { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(openRolesModal, openEditModal) },
  ], [page, pageSize, openRolesModal, openEditModal])

  function handlePageChange(nextPage: number, nextSize: number) {
    setPage(nextPage)
    setPageSize(nextSize)
  }

  async function submitEdit(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!activeStudent?.userId) return
    if (form.password && form.password !== form.passwordConfirm) {
      return toastError('Password and confirm password must match')
    }
    try {
      setSaving(true)
      const passwordToSend = form.password || activeStudent.password || ''
      await updateStudentAccount(activeStudent.userId, {
        userId: activeStudent.userId,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        userName: form.userName.trim(),
        email: form.email.trim(),
        mobileNumber: form.mobileNumber.trim(),
        password: passwordToSend,
        passwordConfirm: form.passwordConfirm || passwordToSend,
        isActive: form.isActive,
        isEditable: form.isEditable,
        isReset: form.isReset,
        reason: form.reason.trim() || (form.isActive ? 'active' : 'inactive'),
      })
      setEditOpen(false)
      toastSuccess('Student account updated successfully')
      invalidateList()
    } catch (error) {
      toastError(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  function addRoleToDraft() {
    if (!roleIdToAdd || !activeStudent?.userId) return
    const roleId = Number(roleIdToAdd)
    const exists = roleRows.some((r) => r.roleId === roleId && r.isActive !== false)
    if (exists) {
      toastError('Role already added for this user')
      return
    }
    const role = roleOptions.find((r) => r.roleId === roleId)
    setRoleRows((prev) => [
      ...prev.filter((r) => r.roleId !== roleId),
      {
        userId: activeStudent.userId,
        userTypeId: activeStudent.userTypeId ?? 0,
        roleId,
        roleName: role?.roleName ?? `Role ${roleId}`,
        isActive: roleActiveToAdd,
      },
    ])
    setRoleIdToAdd(null)
    setRoleActiveToAdd(true)
  }

  function deactivateRole(roleId: number) {
    setRoleRows((prev) => prev.map((r) => (r.roleId === roleId ? { ...r, isActive: false } : r)))
  }

  async function submitRoles(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!activeStudent?.userId) return
    if (roleRows.length === 0) return toastError('Please add at least one role')
    try {
      setSavingRoles(true)
      await saveUserRoles(roleRows.map((r) => ({
        ...r,
        userId: activeStudent.userId,
        userTypeId: activeStudent.userTypeId ?? r.userTypeId,
        userName: activeStudent.userName ?? r.userName,
        firstName: activeStudent.firstName ?? r.firstName ?? null,
        lastName: activeStudent.lastName ?? r.lastName ?? null,
        resetPasswordCode: r.resetPasswordCode ?? null,
      })))
      setRolesOpen(false)
      toastSuccess('User roles saved successfully')
      invalidateList()
    } catch {
      toastError('Failed to save user roles')
    } finally {
      setSavingRoles(false)
    }
  }

  function openAddStudentModal() {
    setAddCollegeId(null)
    setAddStudentId(null)
    setAddOpen(true)
  }

  async function submitAddStudentAccount(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!addCollegeId) return toastError('Please select a college')
    if (!addStudentId) return toastError('Please select a student')
    if (!selectedAddCollege) return toastError('Invalid college selection')
    if (!addAccountForm.firstName.trim()) return toastError('First name is required')
    if (!addAccountForm.userName.trim()) return toastError('User name is required')
    const emailOut = addAccountForm.email.trim() || `${addAccountForm.userName.trim()}@student.local`
    if (!addAccountForm.password || !addAccountForm.passwordConfirm) {
      return toastError('Password and confirm password are required')
    }
    if (addAccountForm.password !== addAccountForm.passwordConfirm) {
      return toastError('Password and confirm password must match')
    }
    try {
      setAddSaving(true)
      await createStudentUserAccountForStudent({
        studentId: Number(addStudentId),
        collegeId: selectedAddCollege.collegeId,
        organizationId: selectedAddCollege.organizationId,
        account: {
          firstName: addAccountForm.firstName.trim(),
          lastName: addAccountForm.lastName.trim(),
          userName: addAccountForm.userName.trim(),
          email: emailOut,
          mobileNumber: addAccountForm.mobileNumber.trim(),
          password: addAccountForm.password,
          passwordConfirm: addAccountForm.passwordConfirm,
        },
      })
      setAddOpen(false)
      toastSuccess('Student account created successfully.')
      invalidateList()
    } catch (error) {
      toastError(getErrorMessage(error))
    } finally {
      setAddSaving(false)
    }
  }

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
          <h2 className="app-card-title inline-flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Student Accounts
          </h2>
        </div>
      </div>

      <div className="app-card overflow-hidden">
        <DataTable
          rowData={filteredRows}
          columnDefs={columnDefs}
          loading={isLoading}
          getRowId={(p) => String(p.data?.userId ?? '')}
          serverSide
          totalCount={totalCount}
          currentPage={page}
          onPageChange={handlePageChange}
          pagination={false}
          paginationPageSize={DEFAULT_PAGE_SIZE}
          toolbar={{ columnPicker: true, exportPdf: true }}
          toolbarLeading={(
            <SearchInput
              className="w-full max-w-sm"
              placeholder="Search this page…"
              value={searchValue}
              onChange={setSearchValue}
            />
          )}
          toolbarTrailing={(
            <Button size="sm" type="button" onClick={openAddStudentModal}>
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Student
            </Button>
          )}
        />
      </div>

      <Dialog open={addOpen} onOpenChange={(v) => { if (!v) setAddOpen(false) }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pr-8 border-b border-amber-200/80 pb-2">
            <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))] inline-flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded border border-border bg-muted/40 text-slate-600">
                <BookOpen className="h-3.5 w-3.5" />
              </span>
              <span>Student Account</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={submitAddStudentAccount} className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium text-slate-700">College *</Label>
                <Select
                  value={addCollegeId}
                  onChange={(v) => setAddCollegeId(v)}
                  options={colleges.map((c) => ({
                    value: String(c.collegeId),
                    label: `${c.orgCode ?? ''}${c.orgCode ? ' - ' : ''}${c.collegeCode}`,
                  }))}
                  searchable
                  clearable
                  isLoading={collegesLoading}
                  placeholder="Select college"
                  className="[&_button]:h-10 [&_button]:text-[12px] [&_button]:rounded-md [&_button]:border-input [&_button]:bg-card"
                />
              </div>
              <div className="space-y-0.5">
                <Label className="text-sm font-medium text-slate-700">Student</Label>
                <Select
                  value={addStudentId}
                  onChange={setAddStudentId}
                  options={studentPickOptions}
                  searchable
                  onSearch={setAddStudentSearchQuery}
                  clearable
                  disabled={!addCollegeId}
                  isLoading={studentSearchTrimmed ? studentSearchFetching : collegeStudentsLoading}
                  placeholder={addCollegeId ? 'Select student' : 'Select college first'}
                  className="[&_button]:h-10 [&_button]:text-[12px] [&_button]:rounded-md [&_button]:border-input [&_button]:bg-card"
                />
              </div>
            </div>

            {addPreview && addStudentIdNum ? (
              <div className="flex gap-3 rounded-md border border-sky-300/90 bg-sky-50/50 p-3 shadow-sm">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-muted-foreground">
                  {addPreview.photoUrl ? (
                    <img src={addPreview.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-8 w-8" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-0.5 text-[13px]">
                  <p className="font-semibold text-amber-800">{addPreview.name || '—'}</p>
                  <p className="text-slate-700">
                    <span className="text-muted-foreground">ID:</span> {addPreview.hall}
                  </p>
                  <p className="leading-snug text-slate-600">{addPreview.academicLine}</p>
                  <p className="text-slate-700">
                    <span className="text-muted-foreground">Phone:</span> {addPreview.phone}
                  </p>
                  {addStudentDetailLoading ? (
                    <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                      Loading student details…
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {addStudentIdNum ? (
              <div className="space-y-3 border-t border-slate-100 pt-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField label="First Name" required>
                    <Input
                      className="h-10 text-[13px]"
                      value={addAccountForm.firstName}
                      onChange={(e) => setAddAccountForm((s) => ({ ...s, firstName: e.target.value }))}
                    />
                  </FormField>
                  <FormField label="Last Name">
                    <Input
                      className="h-10 text-[13px]"
                      value={addAccountForm.lastName}
                      onChange={(e) => setAddAccountForm((s) => ({ ...s, lastName: e.target.value }))}
                    />
                  </FormField>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <FormField label="User Name" required>
                    <Input
                      className="h-10 text-[13px]"
                      value={addAccountForm.userName}
                      onChange={(e) => setAddAccountForm((s) => ({ ...s, userName: e.target.value }))}
                    />
                  </FormField>
                  <FormField label="Email" required>
                    <Input
                      className="h-10 text-[13px]"
                      type="email"
                      autoComplete="off"
                      value={addAccountForm.email}
                      onChange={(e) => setAddAccountForm((s) => ({ ...s, email: e.target.value }))}
                    />
                  </FormField>
                  <FormField label="Mobile Number" required>
                    <Input
                      className="h-10 text-[13px]"
                      inputMode="tel"
                      value={addAccountForm.mobileNumber}
                      onChange={(e) => setAddAccountForm((s) => ({ ...s, mobileNumber: e.target.value }))}
                    />
                  </FormField>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField label="Enter your password" required>
                    <div className="relative">
                      <Input
                        className="h-10 pr-10 text-[13px]"
                        type={addShowPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={addAccountForm.password}
                        onChange={(e) => setAddAccountForm((s) => ({ ...s, password: e.target.value }))}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-1/2 h-8 w-9 -translate-y-1/2 p-0 text-muted-foreground"
                        aria-label={addShowPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setAddShowPassword((v) => !v)}
                      >
                        {addShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </FormField>
                  <FormField label="Confirm Password" required>
                    <Input
                      className="h-10 text-[13px]"
                      type={addShowPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={addAccountForm.passwordConfirm}
                      onChange={(e) => setAddAccountForm((s) => ({ ...s, passwordConfirm: e.target.value }))}
                    />
                  </FormField>
                </div>
              </div>
            ) : null}

            <DialogFooter className="pt-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="border-cyan-100 bg-cyan-50 text-teal-600 hover:bg-cyan-100 hover:text-teal-700"
                onClick={() => setAddOpen(false)}
                disabled={addSaving}
              >
                Close
              </Button>
              <Button type="submit" disabled={addSaving} className="bg-[#0b3f78] hover:bg-[#0a3768] text-primary-foreground">
                {addSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <FormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={activeStudent?.userName ? `Edit Student — ${activeStudent.userName}` : 'Edit Student Account'}
        onSubmit={submitEdit}
        isSubmitting={saving}
        size="lg"
        titleClassName="text-[#2aa6a4] text-[16px] font-semibold"
        contentClassName="sm:max-w-4xl bg-[#f3f5fb]"
        formClassName="space-y-3 py-1 [&_label]:text-[12px]"
        submitLabel="Save"
        cancelLabel="Cancel"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
          <FormField label="First Name" required>
            <Input className="h-10 text-[12px]" value={form.firstName} onChange={(e) => setForm((s) => ({ ...s, firstName: e.target.value }))} />
          </FormField>
          <FormField label="Last Name">
            <Input className="h-10 text-[12px]" value={form.lastName} onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))} />
          </FormField>
          <FormField label="User Name" required>
            <Input className="h-10 text-[12px]" value={form.userName} onChange={(e) => setForm((s) => ({ ...s, userName: e.target.value }))} />
          </FormField>
          <FormField label="Email">
            <Input className="h-10 text-[12px]" type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
          </FormField>
          <FormField label="Mobile Number">
            <Input className="h-10 text-[12px]" value={form.mobileNumber} onChange={(e) => setForm((s) => ({ ...s, mobileNumber: e.target.value }))} />
          </FormField>
          <FormField label="New Password">
            <Input className="h-10 text-[12px]" type="password" value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} />
          </FormField>
          <FormField label="Confirm New Password">
            <Input className="h-10 text-[12px]" type="password" value={form.passwordConfirm} onChange={(e) => setForm((s) => ({ ...s, passwordConfirm: e.target.value }))} />
          </FormField>
          <div className="md:col-span-2 flex items-end">
            <div className="flex flex-wrap items-center gap-5 text-[12px] text-slate-700">
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" checked={form.isEditable} onChange={(e) => setForm((s) => ({ ...s, isEditable: e.target.checked }))} />
                <span>Editable</span>
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" checked={form.isReset} onChange={(e) => setForm((s) => ({ ...s, isReset: e.target.checked }))} />
                <span>Reset</span>
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.checked }))} />
                <span>Active</span>
              </label>
            </div>
          </div>
        </div>
      </FormModal>

      <FormModal
        open={rolesOpen}
        onClose={() => setRolesOpen(false)}
        title="Edit User Role"
        onSubmit={submitRoles}
        isSubmitting={savingRoles}
        size="lg"
        submitLabel="Save"
        cancelLabel="Close"
        titleClassName="text-[#2aa6a4] text-[18px] font-semibold"
        contentClassName="sm:max-w-3xl"
        formClassName="space-y-3 py-1"
      >
        <div className="space-y-3 text-[12px]">
          {activeStudent ? (
            <div className="rounded-md border border-[#bde8ee] bg-[#f7fdff] p-3">
              <div className="grid grid-cols-[150px_1fr] gap-y-1 text-[12px]">
                <div className="text-slate-800">College</div>
                <div className="font-semibold text-[#1f3bb3]">: {activeStudent.collegeCode ?? '-'}</div>
                <div className="text-slate-800">User Name</div>
                <div className="font-semibold text-[#1f3bb3]">: {activeStudent.userName ?? '-'}</div>
                <div className="text-slate-800">Student Name</div>
                <div className="font-semibold text-[#1f3bb3]">
                  :
                  {' '}
                  {[activeStudent.firstName, activeStudent.lastName].filter(Boolean).join(' ').trim() || activeStudent.userName || '-'}
                </div>
                <div className="text-slate-800">Mobile No</div>
                <div className="font-semibold text-[#1f3bb3]">: {activeStudent.mobileNumber ?? '-'}</div>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] items-end gap-3">
            <div>
              <Select
                label="Role *"
                value={roleIdToAdd}
                onChange={setRoleIdToAdd}
                options={roleOptions.map((r) => ({ value: String(r.roleId), label: r.roleName }))}
                searchable
                isLoading={rolesLoading}
              />
            </div>
            <label className="inline-flex items-center gap-2 text-[12px] pb-1.5 text-slate-700">
              <input
                type="checkbox"
                checked={roleActiveToAdd}
                onChange={(e) => setRoleActiveToAdd(e.target.checked)}
              />
              <span>Active</span>
            </label>
            <Button type="button" className="h-8 px-5 text-[12px] bg-[#0a2e67] hover:bg-[#082653]" onClick={addRoleToDraft}>Add</Button>
          </div>

          <div className="rounded border border-border overflow-hidden">
            <table className="w-full text-[12px]">
              <thead className="bg-slate-100 border-b border-border">
                <tr>
                  <th className="text-left px-3 py-1 text-[11px] font-semibold text-slate-700">Role Name</th>
                  <th className="text-left px-3 py-1 text-[11px] font-semibold text-slate-700">Status</th>
                  <th className="text-left px-3 py-1 text-[11px] font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roleRows.map((r) => (
                  <tr key={`${r.roleId}-${r.userRoleId ?? 'new'}`} className="border-b border-border last:border-b-0 hover:bg-muted/40">
                    <td className="px-3 py-0.5 text-[11px] text-slate-800">{r.roleName ?? `Role ${r.roleId}`}</td>
                    <td className="px-3 py-0.5 text-[11px] text-slate-800">{r.isActive === false ? 'InActive' : 'Active'}</td>
                    <td className="px-3 py-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 text-red-600 hover:text-red-700"
                        onClick={() => deactivateRole(r.roleId)}
                        disabled={r.isActive === false}
                        aria-label="Remove role"
                      >
                        <X className="h-2.5 w-2.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {roleRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-2 text-[12px] text-muted-foreground" colSpan={3}>No roles added yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </FormModal>
    </PageContainer>
  )
}
