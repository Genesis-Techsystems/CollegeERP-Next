'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { ColDef, ICellRendererParams, ValueGetterParams } from 'ag-grid-community'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, PencilIcon, PlusIcon, ShieldCheck, UserPlus, X } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { SearchInput } from '@/common/components/search'
import { StatusBadge } from '@/common/components/data-display'
import { FormModal } from '@/common/components/feedback'
import { FormField } from '@/common/components/forms'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/common/components/select'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import {
  getParentAccountById,
  listParentAccountsPage,
  listRolesByOrganization,
  listUserRoles,
  saveUserRoles,
  updateParentAccount,
  type ParentAccount,
  type UserRole,
} from '@/services'

const DEFAULT_PAGE_SIZE = 50

function parentNameGetter(p: ValueGetterParams<ParentAccount>) {
  const d = p.data
  if (!d) return ''
  const parts = [d.firstName, d.lastName].filter(Boolean)
  return parts.join(' ').trim() || (d.userName ?? '')
}

function makeSiNoGetter(page: number, pageSize: number) {
  return (p: ValueGetterParams<ParentAccount>) => {
    const ri = p.node?.rowIndex
    const local = typeof ri === 'number' ? ri : 0
    return page * pageSize + local + 1
  }
}

const COL_DEFS = {
  siNo: { headerName: 'SI.No', width: 70, flex: 0 } as ColDef<ParentAccount>,
  parentName: { headerName: 'Parent Name', minWidth: 180, flex: 1 } as ColDef<ParentAccount>,
  collegeCode: { field: 'collegeCode', headerName: 'College', minWidth: 120, flex: 0.8 } as ColDef<ParentAccount>,
  userName: { field: 'userName', headerName: 'User Name', minWidth: 170, flex: 1 } as ColDef<ParentAccount>,
  mobileNumber: { field: 'mobileNumber', headerName: 'Mobile No', minWidth: 130, flex: 0.7 } as ColDef<ParentAccount>,
  isActive: { field: 'isActive', headerName: 'Status', minWidth: 110, flex: 0.6 } as ColDef<ParentAccount>,
  actions: { headerName: 'Actions', minWidth: 260, flex: 0 } as ColDef<ParentAccount>,
}

function statusRenderer(p: ICellRendererParams<ParentAccount>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(
  onRoles: (row: ParentAccount | null) => void,
  onEdit: (row: ParentAccount | null) => void,
) {
  return (p: ICellRendererParams<ParentAccount>) => {
    const row = p.data ?? null
    const userId = row?.userId
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
        {userId ? (
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" asChild>
            <Link href={`/user-management/parent-accounts/add-sibling?userId=${userId}`}>
              <UserPlus className="mr-1 h-3 w-3" />
              Add Sibling
            </Link>
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          aria-label="Edit parent"
          onClick={() => onEdit(row)}
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }
}

export default function ParentAccountsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [searchValue, setSearchValue] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [rolesOpen, setRolesOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingRoles, setSavingRoles] = useState(false)
  const [roleIdToAdd, setRoleIdToAdd] = useState<string | null>(null)
  const [roleActiveToAdd, setRoleActiveToAdd] = useState(true)
  const [activeParent, setActiveParent] = useState<ParentAccount | null>(null)
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
    queryKey: QK.parentAccounts.list(page, pageSize),
    queryFn: () => listParentAccountsPage(page, pageSize),
  })

  const rows = data?.rows ?? []
  const totalCount = data?.totalCount ?? 0

  const organizationId = activeParent?.organizationId ?? 0

  const { data: roleOptions, isLoading: rolesLoading } = useCrudList({
    queryKey: ['ParentAccounts', 'roles', organizationId],
    queryFn: () => listRolesByOrganization(organizationId),
    enabled: rolesOpen && organizationId > 0,
  })

  const { data: existingUserRoles } = useCrudList({
    queryKey: ['ParentAccounts', 'userRoles', activeParent?.userId ?? 0],
    queryFn: () => listUserRoles(activeParent?.userId ?? 0),
    enabled: rolesOpen && !!activeParent?.userId,
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

  function invalidateList() {
    void queryClient.invalidateQueries({ queryKey: QK.parentAccounts.all })
  }

  const openRolesModal = useCallback((row: ParentAccount | null) => {
    if (!row) return
    if (!row.organizationId) {
      toastError('Organization is missing for this row; user roles cannot be loaded.')
      return
    }
    setActiveParent(row)
    setRoleIdToAdd(null)
    setRoleActiveToAdd(true)
    setRolesOpen(true)
  }, [])

  const openEditModal = useCallback(async (row: ParentAccount | null) => {
    if (!row?.userId) return
    const full = await getParentAccountById(row.userId).catch(() => null)
    const user = full ?? row
    setActiveParent(user)
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

  const columnDefs = useMemo<ColDef<ParentAccount>[]>(() => [
    { ...COL_DEFS.siNo, valueGetter: makeSiNoGetter(page, pageSize) },
    { ...COL_DEFS.parentName, valueGetter: parentNameGetter },
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
    if (!activeParent?.userId) return
    if (form.password && form.password !== form.passwordConfirm) {
      return toastError('Password and confirm password must match')
    }
    try {
      setSaving(true)
      const passwordToSend = form.password || activeParent.password || ''
      await updateParentAccount(activeParent.userId, {
        userId: activeParent.userId,
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
      toastSuccess('Parent account updated successfully')
      invalidateList()
    } catch (error) {
      toastError(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  function addRoleToDraft() {
    if (!roleIdToAdd || !activeParent?.userId) return
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
        userId: activeParent.userId,
        userTypeId: activeParent.userTypeId ?? 0,
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
    if (!activeParent?.userId) return
    if (roleRows.length === 0) return toastError('Please add at least one role')
    try {
      setSavingRoles(true)
      await saveUserRoles(roleRows.map((r) => ({
        ...r,
        userId: activeParent.userId,
        userTypeId: activeParent.userTypeId ?? r.userTypeId,
        userName: activeParent.userName ?? r.userName,
        firstName: activeParent.firstName ?? r.firstName ?? null,
        lastName: activeParent.lastName ?? r.lastName ?? null,
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

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
          <h2 className="app-card-title inline-flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Parent Accounts
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
            <Button size="sm" asChild>
              <Link href="/user-management/parent-accounts/manage">
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Parent
              </Link>
            </Button>
          )}
        />
      </div>

      <FormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={activeParent?.userName ? `Edit Parent — ${activeParent.userName}` : 'Edit Parent Account'}
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
          {activeParent ? (
            <div className="rounded-md border border-[#bde8ee] bg-[#f7fdff] p-3">
              <div className="grid grid-cols-[150px_1fr] gap-y-1 text-[12px]">
                <div className="text-slate-800">College</div>
                <div className="font-semibold text-[#1f3bb3]">: {activeParent.collegeCode ?? '-'}</div>
                <div className="text-slate-800">User Name</div>
                <div className="font-semibold text-[#1f3bb3]">: {activeParent.userName ?? '-'}</div>
                <div className="text-slate-800">Parent Name</div>
                <div className="font-semibold text-[#1f3bb3]">
                  :
                  {' '}
                  {[activeParent.firstName, activeParent.lastName].filter(Boolean).join(' ').trim() || activeParent.userName || '-'}
                </div>
                <div className="text-slate-800">Mobile No</div>
                <div className="font-semibold text-[#1f3bb3]">: {activeParent.mobileNumber ?? '-'}</div>
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
