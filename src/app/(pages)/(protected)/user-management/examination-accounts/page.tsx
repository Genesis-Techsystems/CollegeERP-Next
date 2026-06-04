'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { BookOpen, PencilIcon, PlusIcon, X } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { SearchInput } from '@/common/components/search'
import { Select } from '@/common/components/select'
import { StatusBadge } from '@/common/components/data-display'
import { FormModal } from '@/common/components/feedback'
import { FormField } from '@/common/components/forms'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import {
  createExaminationAccount,
  getExaminationAccountById,
  listDepartmentsByCollege,
  listExaminationAccountColleges,
  listExaminationAccountsByCollege,
  listRolesByOrganization,
  listUserRoles,
  resolveEvaluationUserTypeId,
  saveUserRoles,
  updateExaminationAccount,
  type ExaminationAccount,
  type UserRole,
} from '@/services'
import type { College } from '@/types/college'
import type { Department } from '@/types/department'

const COL_DEFS = {
  slNo: { headerName: 'Sl.No', valueGetter: rowIndexGetter, width: 76, flex: 0 } as ColDef<ExaminationAccount>,
  userName: { field: 'userName', headerName: 'User Name', minWidth: 170, flex: 1 } as ColDef<ExaminationAccount>,
  employeeName: {
    headerName: 'Employee Name',
    minWidth: 180,
    flex: 1,
    valueGetter: (p) => {
      const d = p.data
      if (!d) return ''
      return [d.firstName, d.lastName].filter(Boolean).join(' ').trim()
    },
  } as ColDef<ExaminationAccount>,
  mobileNumber: { field: 'mobileNumber', headerName: 'Mobile No', minWidth: 130, flex: 0.75 } as ColDef<ExaminationAccount>,
  collegeCode: { field: 'collegeCode', headerName: 'College', minWidth: 110, flex: 0.65 } as ColDef<ExaminationAccount>,
  organizationCode: { field: 'organizationCode', headerName: 'Organization', minWidth: 120, flex: 0.7 } as ColDef<ExaminationAccount>,
  status: { field: 'isActive', headerName: 'Status', minWidth: 100, flex: 0.55 } as ColDef<ExaminationAccount>,
  actions: { headerName: 'Actions', minWidth: 200, flex: 0.9 } as ColDef<ExaminationAccount>,
}

function statusRenderer(p: ICellRendererParams<ExaminationAccount>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  onRoles: (row: ExaminationAccount | null) => void,
  onEdit: (row: ExaminationAccount | null) => void,
) {
  return (p: ICellRendererParams<ExaminationAccount>) => (
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
        aria-label="Edit examination account"
        onClick={() => onEdit(p.data ?? null)}
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

export default function ExaminationAccountsPage() {
  const [searchValue, setSearchValue] = useState('')
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [filterOpen, setFilterOpen] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeRow, setActiveRow] = useState<ExaminationAccount | null>(null)
  const [rolesOpen, setRolesOpen] = useState(false)
  const [savingRoles, setSavingRoles] = useState(false)
  const [roleIdToAdd, setRoleIdToAdd] = useState<string | null>(null)
  const [roleActiveToAdd, setRoleActiveToAdd] = useState(true)
  const [roleSheetUser, setRoleSheetUser] = useState<ExaminationAccount | null>(null)
  const [roleRows, setRoleRows] = useState<UserRole[]>([])
  const [form, setForm] = useState({
    departmentId: '',
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

  const { data: colleges, isLoading: collegesLoading } = useCrudList<College>({
    queryKey: QK.colleges.list(),
    queryFn: listExaminationAccountColleges,
  })

  const { data: rows, isLoading, invalidate } = useCrudList<ExaminationAccount>({
    queryKey: QK.examinationAccounts.list(collegeId ?? undefined),
    queryFn: () => listExaminationAccountsByCollege(collegeId ?? 0),
    enabled: !!collegeId,
  })

  const { data: departments, isLoading: departmentsLoading } = useCrudList<Department>({
    queryKey: ['ExaminationAccounts', 'departments', collegeId ?? 0],
    queryFn: () => listDepartmentsByCollege(collegeId ?? 0),
    enabled: !!collegeId && addOpen,
  })

  const selectedCollege = useMemo(
    () => colleges.find((c) => c.collegeId === collegeId) ?? null,
    [colleges, collegeId],
  )
  const selectedOrganizationId = selectedCollege?.organizationId ?? 0

  const { data: roleOptions, isLoading: rolesLoading } = useCrudList({
    queryKey: ['ExaminationAccounts', 'roles', selectedOrganizationId],
    queryFn: () => listRolesByOrganization(selectedOrganizationId),
    enabled: selectedOrganizationId > 0 && rolesOpen,
  })

  const { data: existingUserRoles } = useCrudList({
    queryKey: ['ExaminationAccounts', 'userRoles', roleSheetUser?.userId ?? 0],
    queryFn: () => listUserRoles(roleSheetUser?.userId ?? 0),
    enabled: rolesOpen && !!roleSheetUser?.userId,
  })

  useEffect(() => {
    if (!rolesOpen) return
    setRoleRows(existingUserRoles.map((r) => ({ ...r, isActive: r.isActive !== false })))
  }, [existingUserRoles, rolesOpen])

  const filteredRows = useMemo(() => {
    const q = searchValue.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) =>
      `${row.userName ?? ''} ${row.firstName ?? ''} ${row.lastName ?? ''} ${row.mobileNumber ?? ''} ${row.collegeCode ?? ''} ${row.organizationCode ?? ''}`
        .toLowerCase()
        .includes(q),
    )
  }, [rows, searchValue])

  function resetForm() {
    setForm({
      departmentId: '',
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
  }

  function openAddModal() {
    resetForm()
    setAddOpen(true)
  }

  async function openEditModal(row: ExaminationAccount | null) {
    if (!row) return
    const full = await getExaminationAccountById(row.userId).catch(() => null)
    const acc = full ?? row
    setActiveRow(acc)
    setForm({
      departmentId: acc.departmentId ? String(acc.departmentId) : '',
      firstName: acc.firstName ?? '',
      lastName: acc.lastName ?? '',
      userName: acc.userName ?? '',
      email: acc.email ?? '',
      mobileNumber: acc.mobileNumber ?? '',
      password: acc.password ?? '',
      passwordConfirm: acc.password ?? '',
      isActive: acc.isActive !== false,
      isEditable: acc.isEditable ?? false,
      isReset: acc.isReset ?? false,
      reason: acc.reason ?? (acc.isActive === false ? 'inactive' : 'active'),
    })
    setEditOpen(true)
  }

  async function openRolesModal(row: ExaminationAccount | null) {
    if (!row) return
    const full = await getExaminationAccountById(row.userId).catch(() => null)
    let user = full ?? row
    if (!user.userTypeId && selectedCollege?.organizationId) {
      try {
        const userTypeId = await resolveEvaluationUserTypeId(selectedCollege.organizationId)
        user = { ...user, userTypeId }
      } catch {
        // Modal still opens; role add/save may surface validation
      }
    }
    setRoleSheetUser(user)
    setRoleIdToAdd(null)
    setRoleActiveToAdd(true)
    setRolesOpen(true)
  }

  function addRoleToDraft() {
    if (!roleIdToAdd || !roleSheetUser?.userId) return
    const roleId = Number(roleIdToAdd)
    const exists = roleRows.some((r) => r.roleId === roleId && r.isActive !== false)
    if (exists) {
      toastError('Role already added for this user')
      return
    }
    const userTypeId = roleSheetUser.userTypeId
    if (!userTypeId) {
      toastError('User type could not be resolved for this account')
      return
    }
    const role = roleOptions.find((r) => r.roleId === roleId)
    setRoleRows((prev) => [
      ...prev.filter((r) => r.roleId !== roleId),
      {
        userId: roleSheetUser.userId,
        userTypeId,
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
    if (!roleSheetUser?.userId) return
    if (roleRows.length === 0) return toastError('Please add at least one role')
    const userTypeId = roleSheetUser.userTypeId
    if (!userTypeId) return toastError('User type could not be resolved for this account')
    try {
      setSavingRoles(true)
      await saveUserRoles(
        roleRows.map((r) => ({
          ...r,
          userId: roleSheetUser.userId,
          userTypeId: roleSheetUser.userTypeId ?? r.userTypeId ?? userTypeId,
          userName: roleSheetUser.userName ?? r.userName ?? undefined,
          firstName: roleSheetUser.firstName ?? r.firstName ?? null,
          lastName: roleSheetUser.lastName ?? r.lastName ?? null,
          resetPasswordCode: r.resetPasswordCode ?? null,
        })),
      )
      setRolesOpen(false)
      toastSuccess('User roles saved successfully')
      invalidate().catch(() => undefined)
    } catch {
      toastError('Failed to save user roles')
    } finally {
      setSavingRoles(false)
    }
  }

  async function submitAdd(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!selectedCollege) return
    if (!form.departmentId) return toastError('Please select a department')
    if (!form.password || form.password !== form.passwordConfirm) {
      return toastError('Password and confirm password must match')
    }
    try {
      setSaving(true)
      await createExaminationAccount({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        userName: form.userName.trim(),
        email: form.email.trim(),
        mobileNumber: form.mobileNumber.trim(),
        departmentId: Number(form.departmentId),
        password: form.password,
        passwordConfirm: form.passwordConfirm,
        isActive: form.isActive,
        isEditable: form.isEditable,
        isReset: form.isReset,
        reason: form.reason.trim() || (form.isActive ? 'active' : 'inactive'),
        collegeId: selectedCollege.collegeId,
        organizationId: selectedCollege.organizationId,
      })
      setAddOpen(false)
      toastSuccess('Examination account created successfully')
      invalidate().catch(() => undefined)
    } catch (error) {
      toastError(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function submitEdit(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!activeRow?.userId || !selectedCollege) return
    if (form.password && form.password !== form.passwordConfirm) {
      return toastError('Password and confirm password must match')
    }
    try {
      setSaving(true)
      const passwordToSend = form.password || activeRow.password || ''
      await updateExaminationAccount(activeRow.userId, {
        userId: activeRow.userId,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        userName: form.userName.trim(),
        email: form.email.trim(),
        mobileNumber: form.mobileNumber.trim(),
        password: passwordToSend,
        passwordConfirm: form.passwordConfirm || passwordToSend,
        departmentId: activeRow.departmentId,
        isActive: form.isActive,
        isEditable: form.isEditable,
        isReset: form.isReset,
        reason: form.reason.trim() || (form.isActive ? 'active' : 'inactive'),
        collegeId: activeRow.collegeId ?? selectedCollege.collegeId,
        organizationId: activeRow.organizationId ?? selectedCollege.organizationId,
      })
      setEditOpen(false)
      toastSuccess('Examination account updated successfully')
      invalidate().catch(() => undefined)
    } catch (error) {
      toastError(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const columnDefs = useMemo<ColDef<ExaminationAccount>[]>(
    () => [
      COL_DEFS.slNo,
      COL_DEFS.userName,
      COL_DEFS.employeeName,
      COL_DEFS.mobileNumber,
      COL_DEFS.collegeCode,
      COL_DEFS.organizationCode,
      { ...COL_DEFS.status, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(openRolesModal, openEditModal) },
    ],
    [],
  )

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
          <h2 className="app-card-title inline-flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Examination Accounts
          </h2>
          <button type="button" className="text-sm text-foreground" onClick={() => setFilterOpen((v) => !v)}>
            Filter
          </button>
        </div>
        {filterOpen ? (
          <div className="p-3 max-w-sm">
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
        ) : null}
      </div>

      {collegeId ? (
        <div className="app-card overflow-hidden">
          <DataTable
            rowData={filteredRows}
            columnDefs={columnDefs}
            loading={isLoading}
            pagination
            toolbar={{ columnPicker: true, exportPdf: true }}
            toolbarLeading={(
              <SearchInput
                className="w-full max-w-sm"
                placeholder="Search"
                value={searchValue}
                onChange={setSearchValue}
              />
            )}
            toolbarTrailing={(
              <Button size="sm" onClick={openAddModal}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add User
              </Button>
            )}
          />
        </div>
      ) : null}

      <FormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Examination Account"
        onSubmit={submitAdd}
        isSubmitting={saving}
        size="lg"
        titleClassName="text-[#2aa6a4] text-[16px] font-semibold"
        contentClassName="sm:max-w-4xl bg-[#f3f5fb]"
        formClassName="space-y-3 py-1 [&_label]:text-[12px]"
        submitLabel="Save"
        cancelLabel="Cancel"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
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
          <FormField label="First Name" required>
            <Input className="h-10 text-[12px]" value={form.firstName} onChange={(e) => setForm((s) => ({ ...s, firstName: e.target.value }))} />
          </FormField>
          <FormField label="Last Name" required>
            <Input className="h-10 text-[12px]" value={form.lastName} onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))} />
          </FormField>
          <FormField label="User Name" required>
            <Input className="h-10 text-[12px]" value={form.userName} onChange={(e) => setForm((s) => ({ ...s, userName: e.target.value }))} />
          </FormField>
          <FormField label="Email" required>
            <Input className="h-10 text-[12px]" type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
          </FormField>
          <FormField label="Mobile Number">
            <Input className="h-10 text-[12px]" value={form.mobileNumber} onChange={(e) => setForm((s) => ({ ...s, mobileNumber: e.target.value }))} />
          </FormField>
          <FormField label="Password" required>
            <Input className="h-10 text-[12px]" type="password" value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} />
          </FormField>
          <FormField label="Confirm Password" required>
            <Input className="h-10 text-[12px]" type="password" value={form.passwordConfirm} onChange={(e) => setForm((s) => ({ ...s, passwordConfirm: e.target.value }))} />
          </FormField>
        </div>
      </FormModal>

      <FormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={activeRow?.userName ? `Edit Examination Account — ${activeRow.userName}` : 'Edit Examination Account'}
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
          <FormField label="Last Name" required>
            <Input className="h-10 text-[12px]" value={form.lastName} onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))} />
          </FormField>
          <FormField label="User Name" required>
            <Input className="h-10 text-[12px]" value={form.userName} onChange={(e) => setForm((s) => ({ ...s, userName: e.target.value }))} />
          </FormField>
          <FormField label="Email" required>
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
          {roleSheetUser ? (
            <div className="rounded-md border border-[#bde8ee] bg-[#f7fdff] p-3">
              <div className="grid grid-cols-[150px_1fr] gap-y-1 text-[12px]">
                <div className="text-slate-800">College</div>
                <div className="font-semibold text-[#1f3bb3]">: {roleSheetUser.collegeCode ?? '-'}</div>
                <div className="text-slate-800">User Name</div>
                <div className="font-semibold text-[#1f3bb3]">: {roleSheetUser.userName ?? '-'}</div>
                <div className="text-slate-800">Employee Name</div>
                <div className="font-semibold text-[#1f3bb3]">
                  :
                  {' '}
                  {[roleSheetUser.firstName, roleSheetUser.lastName].filter(Boolean).join(' ').trim() || '-'}
                </div>
                <div className="text-slate-800">Mobile No</div>
                <div className="font-semibold text-[#1f3bb3]">: {roleSheetUser.mobileNumber ?? '-'}</div>
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
            <Button type="button" className="h-8 px-5 text-[12px] bg-[#0a2e67] hover:bg-[#082653]" onClick={addRoleToDraft}>
              Add
            </Button>
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
                    <td className="px-3 py-2 text-[12px] text-muted-foreground" colSpan={3}>
                      No roles added yet.
                    </td>
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
