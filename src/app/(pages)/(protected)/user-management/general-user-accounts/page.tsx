'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Eye, EyeOff, PencilIcon, PlusIcon, X } from 'lucide-react'
import { Select } from '@/common/components/select'
import { StatusBadge } from '@/common/components/data-display'
import { FormModal } from '@/common/components/feedback'
import { FormField } from '@/common/components/forms'
import { FilteredListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/common/components/date-picker'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import {
  createGeneralUserAccount,
  getGeneralUserAccountById,
  listGeneralUserAccountColleges,
  listGeneralUserAccountsByCollege,
  listDepartmentsByCollege,
  listRolesByOrganization,
  listUserRoles,
  listUserTypesByOrganization,
  saveUserRoles,
  updateGeneralUserAccount,
  type GeneralUserAccount,
  type UserRole,
} from '@/services'
import type { College } from '@/types/college'
import type { Department } from '@/types/department'

const COL_DEFS = {
  siNo: {
    headerName: 'Sl.No',
    valueGetter: rowIndexGetter,
    width: 76,
    flex: 0,
  } as ColDef<GeneralUserAccount>,
  userName: {
    field: 'userName',
    headerName: 'User Name',
    minWidth: 170,
    flex: 1,
  } as ColDef<GeneralUserAccount>,
  employeeName: {
    headerName: 'Employee Name',
    minWidth: 180,
    flex: 1,
    valueGetter: (p) =>
      [p.data?.firstName, p.data?.lastName].filter(Boolean).join(' ').trim(),
  } as ColDef<GeneralUserAccount>,
  mobileNumber: {
    field: 'mobileNumber',
    headerName: 'Mobile No',
    minWidth: 130,
    flex: 0.75,
  } as ColDef<GeneralUserAccount>,
  collegeCode: {
    field: 'collegeCode',
    headerName: 'College',
    minWidth: 110,
    flex: 0.65,
  } as ColDef<GeneralUserAccount>,
  organizationCode: {
    field: 'organizationCode',
    headerName: 'Organization',
    minWidth: 120,
    flex: 0.7,
  } as ColDef<GeneralUserAccount>,
  status: {
    field: 'isActive',
    headerName: 'Status',
    minWidth: 100,
    flex: 0.55,
  } as ColDef<GeneralUserAccount>,
  actions: {
    headerName: 'Actions',
    minWidth: 200,
    flex: 0.9,
  } as ColDef<GeneralUserAccount>,
}

function statusRenderer(p: ICellRendererParams<GeneralUserAccount>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  onRoles: (row: GeneralUserAccount | null) => void,
  onEdit: (row: GeneralUserAccount | null) => void,
) {
  return (p: ICellRendererParams<GeneralUserAccount>) => (
    <div className="flex items-center gap-1.5 text-xs">
      <button
        type="button"
        className="text-primary hover:underline font-medium"
        onClick={() => onRoles(p.data ?? null)}
      >
        User Roles
      </button>
      <span className="text-slate-300 select-none" aria-hidden>
        |
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0"
        aria-label="Edit user"
        onClick={() => onEdit(p.data ?? null)}
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

export default function GeneralUserAccountsPage() {
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [rolesOpen, setRolesOpen] = useState(false)
  const [savingUser, setSavingUser] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [savingRoles, setSavingRoles] = useState(false)
  const [roleIdToAdd, setRoleIdToAdd] = useState<string | null>(null)
  const [roleActiveToAdd, setRoleActiveToAdd] = useState(true)
  const [activeUser, setActiveUser] = useState<GeneralUserAccount | null>(null)
  const [roleRows, setRoleRows] = useState<UserRole[]>([])
  const [form, setForm] = useState({
    departmentId: '',
    firstName: '',
    lastName: '',
    userName: '',
    email: '',
    mobileNumber: '',
    userTypeId: '',
    password: '',
    passwordConfirm: '',
    isActive: true,
    isEditable: false,
    isReset: false,
    reason: 'active',
    passwordExpDate: new Date(),
  })

  const { data: colleges, isLoading: collegesLoading } = useCrudList<College>({
    queryKey: QK.colleges.list(),
    queryFn: listGeneralUserAccountColleges,
  })

  const { data: rows, isLoading, invalidate: invalidateUsers } = useCrudList<GeneralUserAccount>({
    queryKey: QK.generalUserAccounts.list(collegeId ?? undefined),
    queryFn: () => listGeneralUserAccountsByCollege(collegeId ?? 0),
    enabled: !!collegeId,
  })
  const selectedCollege = useMemo(
    () => colleges.find((c) => c.collegeId === collegeId) ?? null,
    [colleges, collegeId],
  )
  const selectedOrganizationId = selectedCollege?.organizationId ?? 0

  const { data: userTypes, isLoading: userTypesLoading } = useCrudList({
    queryKey: ['GeneralUserAccounts', 'userTypes', selectedOrganizationId],
    queryFn: () => listUserTypesByOrganization(selectedOrganizationId),
    enabled: selectedOrganizationId > 0 && addOpen,
  })
  const { data: departments, isLoading: departmentsLoading } = useCrudList<Department>({
    queryKey: ['GeneralUserAccounts', 'departments', collegeId ?? 0],
    queryFn: () => listDepartmentsByCollege(collegeId ?? 0),
    enabled: !!collegeId && addOpen,
  })

  const { data: roleOptions, isLoading: rolesLoading } = useCrudList({
    queryKey: ['GeneralUserAccounts', 'roles', selectedOrganizationId],
    queryFn: () => listRolesByOrganization(selectedOrganizationId),
    enabled: selectedOrganizationId > 0 && rolesOpen,
  })

  const { data: existingUserRoles } = useCrudList({
    queryKey: ['GeneralUserAccounts', 'userRoles', activeUser?.userId ?? 0],
    queryFn: () => listUserRoles(activeUser?.userId ?? 0),
    enabled: rolesOpen && !!activeUser?.userId,
  })

  useEffect(() => {
    if (!rolesOpen) return
    setRoleRows(existingUserRoles.map((r) => ({ ...r, isActive: r.isActive !== false })))
  }, [existingUserRoles, rolesOpen])

  function resetForm() {
    setForm({
      departmentId: '',
      firstName: '',
      lastName: '',
      userName: '',
      email: '',
      mobileNumber: '',
      userTypeId: '',
      password: '',
      passwordConfirm: '',
      isActive: true,
      isEditable: false,
      isReset: false,
      reason: 'active',
      passwordExpDate: new Date(),
    })
  }

  function openAddModal() {
    resetForm()
    setAddOpen(true)
  }

  async function openEditModal(row: GeneralUserAccount | null) {
    if (!row) return
    const fullUser = await getGeneralUserAccountById(row.userId).catch(() => null)
    const user = fullUser ?? row
    setActiveUser(user)
    setForm({
      departmentId: user.departmentId ? String(user.departmentId) : '',
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      userName: user.userName ?? '',
      email: user.email ?? '',
      mobileNumber: user.mobileNumber ?? '',
      userTypeId: user.userTypeId ? String(user.userTypeId) : '',
      password: user.password ?? '',
      passwordConfirm: user.password ?? '',
      isActive: user.isActive !== false,
      isEditable: user.isEditable ?? false,
      isReset: user.isReset ?? false,
      reason: user.reason ?? (user.isActive === false ? 'inactive' : 'active'),
      passwordExpDate: user.passwordExpDate ? new Date(user.passwordExpDate) : new Date(),
    })
    setEditOpen(true)
  }

  function openRolesModal(row: GeneralUserAccount | null) {
    if (!row) return
    setActiveUser(row)
    setRoleIdToAdd(null)
    setRoleActiveToAdd(true)
    setRolesOpen(true)
  }

  async function submitAddUser(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!selectedCollege) return
    if (!form.departmentId) return toastError('Please select a department')
    if (!form.userTypeId) return toastError('Please select a user type')
    if (!form.password || form.password !== form.passwordConfirm) {
      return toastError('Password and confirm password must match')
    }
    try {
      setSavingUser(true)
      await createGeneralUserAccount({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        userName: form.userName.trim(),
        email: form.email.trim(),
        mobileNumber: form.mobileNumber.trim(),
        userTypeId: Number(form.userTypeId),
        departmentId: Number(form.departmentId),
        password: form.password,
        passwordConfirm: form.passwordConfirm,
        passwordExpDate: form.passwordExpDate,
        isActive: form.isActive,
        isEditable: form.isEditable,
        isReset: form.isReset,
        reason: form.reason.trim() || (form.isActive ? 'active' : 'inactive'),
        collegeId: selectedCollege.collegeId,
        organizationId: selectedCollege.organizationId,
      })
      setAddOpen(false)
      toastSuccess('User account created successfully')
      void invalidateUsers().catch(() => undefined)
    } catch {
      toastError('Failed to create user account')
    } finally {
      setSavingUser(false)
    }
  }

  async function submitEditUser(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!activeUser?.userId || !selectedCollege) return
    if (form.password && form.password !== form.passwordConfirm) {
      return toastError('Password and confirm password must match')
    }
    try {
      setSavingUser(true)
      const passwordToSend = form.password || activeUser.password || ''
      const passwordConfirmToSend = form.passwordConfirm || activeUser.passwordConfirm || passwordToSend
      await updateGeneralUserAccount(activeUser.userId, {
        userId: activeUser.userId,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        userName: form.userName.trim(),
        email: form.email.trim(),
        mobileNumber: form.mobileNumber.trim(),
        userTypeId: activeUser.userTypeId ?? (form.userTypeId ? Number(form.userTypeId) : undefined),
        departmentId: activeUser.departmentId ?? (form.departmentId ? Number(form.departmentId) : undefined),
        password: passwordToSend,
        passwordConfirm: passwordConfirmToSend,
        passwordExpDate: form.passwordExpDate,
        isActive: form.isActive,
        isEditable: form.isEditable,
        isReset: form.isReset,
        reason: form.reason.trim() || (form.isActive ? 'active' : 'inactive'),
        collegeId: activeUser.collegeId ?? selectedCollege.collegeId,
        organizationId: activeUser.organizationId ?? selectedCollege.organizationId,
      })
      setEditOpen(false)
      toastSuccess('User account updated successfully')
      void invalidateUsers().catch(() => undefined)
    } catch (error) {
      toastError(getErrorMessage(error))
    } finally {
      setSavingUser(false)
    }
  }

  function addRoleToDraft() {
    if (!roleIdToAdd || !activeUser?.userId) return
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
        userId: activeUser.userId,
        userTypeId: activeUser.userTypeId ?? Number(form.userTypeId || 0),
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
    if (!activeUser?.userId) return
    if (roleRows.length === 0) return toastError('Please add at least one role')
    try {
      setSavingRoles(true)
      await saveUserRoles(roleRows.map((r) => ({
        ...r,
        userId: activeUser.userId,
        userTypeId: activeUser.userTypeId ?? r.userTypeId,
        userName: activeUser.userName ?? r.userName ?? undefined,
        firstName: activeUser.firstName ?? r.firstName ?? null,
        lastName: activeUser.lastName ?? r.lastName ?? null,
        resetPasswordCode: r.resetPasswordCode ?? null,
      })))
      setRolesOpen(false)
      toastSuccess('User roles saved successfully')
      void invalidateUsers().catch(() => undefined)
    } catch {
      toastError('Failed to save user roles')
    } finally {
      setSavingRoles(false)
    }
  }

  const columnDefs = useMemo<ColDef<GeneralUserAccount>[]>(() => [
    COL_DEFS.siNo,
    COL_DEFS.userName,
    COL_DEFS.employeeName,
    COL_DEFS.mobileNumber,
    COL_DEFS.collegeCode,
    COL_DEFS.organizationCode,
    { ...COL_DEFS.status, cellRenderer: statusRenderer },
    { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(openRolesModal, openEditModal) },
  ], [])

  return (
    <FilteredListPage
      title="General User Accounts"
      filters={(
        <div className="max-w-sm">
          <Select
            label="College"
            value={collegeId ? String(collegeId) : null}
            onChange={(v) => setCollegeId(v ? Number(v) : null)}
            options={colleges.map((c) => ({
              value: String(c.collegeId),
              label: `${c.orgCode ?? ''}${c.orgCode ? ' - ' : ''}${c.collegeCode}`,
            }))}
            searchable
            clearable
            isLoading={collegesLoading}
            placeholder="Select college"
          />
        </div>
      )}
      rowData={collegeId ? rows : []}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search users…',
        columnPicker: true,
        exportPdf: true,
        pdfDocumentTitle: 'General User Accounts',
      }}
      toolbarTrailing={collegeId ? (
        <Button size="sm" onClick={openAddModal}>
          <PlusIcon className="h-4 w-4 mr-1" />
          Add User
        </Button>
      ) : undefined}
    >
      <FormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add User Account"
        onSubmit={submitAddUser}
        isSubmitting={savingUser}
        size="lg"
        titleClassName="text-[#2aa6a4] text-[16px] font-semibold"
        contentClassName="sm:max-w-4xl bg-[#f3f5fb]"
        formClassName="space-y-3 py-1 [&_label]:text-[12px]"
        submitLabel="Save"
        cancelLabel="Cancel"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
          <div className="md:col-span-2 flex justify-end text-[12px] font-semibold text-slate-700">
            College : {selectedCollege?.orgCode ?? '-'} - {selectedCollege?.collegeCode ?? '-'}
          </div>
          <FormField label="Department" required>
            <Select
              value={form.departmentId || null}
              onChange={(v) => setForm((s) => ({ ...s, departmentId: v ?? '' }))}
              options={departments.map((d) => ({ value: String(d.departmentId), label: d.deptCode || d.deptName }))}
              isLoading={departmentsLoading}
              searchable
              className="[&_button]:h-10 [&_button]:text-[12px]"
            />
          </FormField>
          <FormField label="User Type" required>
            <Select
              value={form.userTypeId || null}
              onChange={(v) => setForm((s) => ({ ...s, userTypeId: v ?? '' }))}
              options={userTypes.map((r) => ({ value: String(r.userTypeId), label: r.userTypeName ?? r.userTypeCode ?? `Type ${r.userTypeId}` }))}
              isLoading={userTypesLoading}
              searchable
              className="[&_button]:h-10 [&_button]:text-[12px]"
            />
          </FormField>
          <FormField label="First Name" required>
            <Input className="h-10 text-[12px]" value={form.firstName} onChange={(e) => setForm((s) => ({ ...s, firstName: e.target.value }))} />
          </FormField>
          <FormField label="Last Name">
            <Input className="h-10 text-[12px]" value={form.lastName} onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))} />
          </FormField>
          <FormField label="User Name" required>
            <Input className="h-10 text-[12px]" value={form.userName} onChange={(e) => setForm((s) => ({ ...s, userName: e.target.value }))} />
          </FormField>
          <FormField label="Email" required>
            <Input className="h-10 text-[12px]" type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
          </FormField>
          <FormField label="Mobile Number" required>
            <Input className="h-10 text-[12px]" value={form.mobileNumber} onChange={(e) => setForm((s) => ({ ...s, mobileNumber: e.target.value }))} />
          </FormField>
          <FormField label="Password" required>
            <div className="relative">
              <Input
                className="h-10 pr-10 text-[12px]"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </FormField>
          <FormField label="Confirm Password" required>
            <div className="relative">
              <Input
                className="h-10 pr-10 text-[12px]"
                type={showPasswordConfirm ? 'text' : 'password'}
                value={form.passwordConfirm}
                onChange={(e) => setForm((s) => ({ ...s, passwordConfirm: e.target.value }))}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                onClick={() => setShowPasswordConfirm((value) => !value)}
                aria-label={showPasswordConfirm ? 'Hide password confirmation' : 'Show password confirmation'}
              >
                {showPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </FormField>
          <FormField label="Password Expired Date">
            <DatePicker value={form.passwordExpDate} onChange={(v) => setForm((s) => ({ ...s, passwordExpDate: v ?? s.passwordExpDate }))} />
          </FormField>
          <div className="flex items-end">
            <div className="flex items-center gap-5 text-[12px] text-slate-700">
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
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={activeUser?.userName ? `Edit User Account - ${activeUser.userName}` : 'Edit User Account'}
        onSubmit={submitEditUser}
        isSubmitting={savingUser}
        size="lg"
        titleClassName="text-[#2aa6a4] text-[16px] font-semibold"
        contentClassName="sm:max-w-4xl bg-[#f3f5fb]"
        formClassName="space-y-3 py-1 [&_label]:text-[12px]"
        submitLabel="Save"
        cancelLabel="Cancel"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
          <div className="md:col-span-2 flex justify-end text-[12px] font-semibold text-slate-700">
            College : {selectedCollege?.orgCode ?? '-'} - {selectedCollege?.collegeCode ?? '-'}
          </div>
          <FormField label="First Name" required>
            <Input className="h-10 text-[12px]" value={form.firstName} onChange={(e) => setForm((s) => ({ ...s, firstName: e.target.value }))} />
          </FormField>
          <FormField label="Last Name">
            <Input className="h-10 text-[12px]" value={form.lastName} onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))} />
          </FormField>
          <FormField label="User Name" required>
            <Input className="h-10 text-[12px]" value={form.userName} onChange={(e) => setForm((s) => ({ ...s, userName: e.target.value }))} />
          </FormField>
          <FormField label="Email" required>
            <Input className="h-10 text-[12px]" type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
          </FormField>
          <FormField label="Mobile Number" required>
            <Input className="h-10 text-[12px]" value={form.mobileNumber} onChange={(e) => setForm((s) => ({ ...s, mobileNumber: e.target.value }))} />
          </FormField>
          <FormField label="New Password">
            <div className="relative">
              <Input
                className="h-10 pr-10 text-[12px]"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </FormField>
          <FormField label="Confirm New Password">
            <div className="relative">
              <Input
                className="h-10 pr-10 text-[12px]"
                type={showPasswordConfirm ? 'text' : 'password'}
                value={form.passwordConfirm}
                onChange={(e) => setForm((s) => ({ ...s, passwordConfirm: e.target.value }))}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                onClick={() => setShowPasswordConfirm((value) => !value)}
                aria-label={showPasswordConfirm ? 'Hide password confirmation' : 'Show password confirmation'}
              >
                {showPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </FormField>
          <FormField label="Password Expired Date">
            <DatePicker value={form.passwordExpDate} onChange={(v) => setForm((s) => ({ ...s, passwordExpDate: v ?? s.passwordExpDate }))} />
          </FormField>
          <div className="flex items-end">
            <div className="flex items-center gap-5 text-[12px] text-slate-700">
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
          {activeUser ? (
            <div className="rounded-md border border-[#bde8ee] bg-[#f7fdff] p-3">
              <div className="grid grid-cols-[150px_1fr] gap-y-1 text-[12px]">
                <div className="text-slate-800">College</div>
                <div className="font-semibold text-[#1f3bb3]">: {activeUser.collegeCode ?? '-'}</div>
                <div className="text-slate-800">User Name</div>
                <div className="font-semibold text-[#1f3bb3]">: {activeUser.userName ?? '-'}</div>
                <div className="text-slate-800">Employee Name</div>
                <div className="font-semibold text-[#1f3bb3]">: {activeUser.firstName ?? '-'}</div>
                <div className="text-slate-800">Mobile No</div>
                <div className="font-semibold text-[#1f3bb3]">: {activeUser.mobileNumber ?? '-'}</div>
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
    </FilteredListPage>
  )
}
