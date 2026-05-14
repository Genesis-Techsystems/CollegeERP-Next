'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { BookOpen, PencilIcon, PlusIcon } from 'lucide-react'
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
  createStaffAccount,
  getStaffAccountById,
  listDepartmentsByCollege,
  listStaffAccountColleges,
  listStaffAccountsByCollege,
  updateStaffAccount,
  type StaffAccount,
} from '@/services'
import type { College } from '@/types/college'
import type { Department } from '@/types/department'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<StaffAccount>,
  firstName: { field: 'firstName', headerName: 'First Name', minWidth: 180, flex: 1 } as ColDef<StaffAccount>,
  lastName: { field: 'lastName', headerName: 'Last Name', minWidth: 180, flex: 1 } as ColDef<StaffAccount>,
  userName: { field: 'userName', headerName: 'User Name', minWidth: 170, flex: 1 } as ColDef<StaffAccount>,
  status: { field: 'isActive', headerName: 'Status', minWidth: 110, flex: 0.6 } as ColDef<StaffAccount>,
  actions: { headerName: 'Actions', minWidth: 110, flex: 0.4 } as ColDef<StaffAccount>,
}

function statusRenderer(p: ICellRendererParams<StaffAccount>) {
  return <StatusBadge status={p.data?.isActive ?? false} />
}

function makeActionsRenderer(onEdit: (row: StaffAccount | null) => void) {
  return (p: ICellRendererParams<StaffAccount>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 w-7 p-0"
      aria-label="Edit staff"
      onClick={() => onEdit(p.data ?? null)}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  )
}

export default function StaffAccountsPage() {
  const [searchValue, setSearchValue] = useState('')
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [filterOpen, setFilterOpen] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeStaff, setActiveStaff] = useState<StaffAccount | null>(null)
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
    queryFn: listStaffAccountColleges,
  })

  const { data: rows, isLoading, invalidate } = useCrudList<StaffAccount>({
    queryKey: QK.staffAccounts.list(collegeId ?? undefined),
    queryFn: () => listStaffAccountsByCollege(collegeId ?? 0),
    enabled: !!collegeId,
  })

  const { data: departments, isLoading: departmentsLoading } = useCrudList<Department>({
    queryKey: ['StaffAccounts', 'departments', collegeId ?? 0],
    queryFn: () => listDepartmentsByCollege(collegeId ?? 0),
    enabled: !!collegeId && addOpen,
  })

  const selectedCollege = useMemo(
    () => colleges.find((c) => c.collegeId === collegeId) ?? null,
    [colleges, collegeId],
  )

  const filteredRows = useMemo(() => {
    const q = searchValue.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => `${row.firstName ?? ''} ${row.lastName ?? ''} ${row.userName ?? ''}`.toLowerCase().includes(q))
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

  async function openEditModal(row: StaffAccount | null) {
    if (!row) return
    const full = await getStaffAccountById(row.userId).catch(() => null)
    const staff = full ?? row
    setActiveStaff(staff)
    setForm({
      departmentId: staff.departmentId ? String(staff.departmentId) : '',
      firstName: staff.firstName ?? '',
      lastName: staff.lastName ?? '',
      userName: staff.userName ?? '',
      email: staff.email ?? '',
      mobileNumber: staff.mobileNumber ?? '',
      password: staff.password ?? '',
      passwordConfirm: staff.password ?? '',
      isActive: staff.isActive !== false,
      isEditable: staff.isEditable ?? false,
      isReset: staff.isReset ?? false,
      reason: staff.reason ?? (staff.isActive === false ? 'inactive' : 'active'),
    })
    setEditOpen(true)
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
      await createStaffAccount({
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
      toastSuccess('Staff account created successfully')
      invalidate().catch(() => undefined)
    } catch (error) {
      toastError(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function submitEdit(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!activeStaff?.userId || !selectedCollege) return
    if (form.password && form.password !== form.passwordConfirm) {
      return toastError('Password and confirm password must match')
    }
    try {
      setSaving(true)
      const passwordToSend = form.password || activeStaff.password || ''
      await updateStaffAccount(activeStaff.userId, {
        userId: activeStaff.userId,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        userName: form.userName.trim(),
        email: form.email.trim(),
        mobileNumber: form.mobileNumber.trim(),
        password: passwordToSend,
        passwordConfirm: form.passwordConfirm || passwordToSend,
        departmentId: activeStaff.departmentId,
        isActive: form.isActive,
        isEditable: form.isEditable,
        isReset: form.isReset,
        reason: form.reason.trim() || (form.isActive ? 'active' : 'inactive'),
        collegeId: activeStaff.collegeId ?? selectedCollege.collegeId,
        organizationId: activeStaff.organizationId ?? selectedCollege.organizationId,
      })
      setEditOpen(false)
      toastSuccess('Staff account updated successfully')
      invalidate().catch(() => undefined)
    } catch (error) {
      toastError(getErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const columnDefs = useMemo<ColDef<StaffAccount>[]>(() => [
    COL_DEFS.siNo,
    COL_DEFS.firstName,
    COL_DEFS.lastName,
    COL_DEFS.userName,
    { ...COL_DEFS.status, cellRenderer: statusRenderer },
    { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(openEditModal) },
  ], [])

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-[hsl(var(--primary))] inline-flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Staff Accounts
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
                placeholder="Search staff..."
                value={searchValue}
                onChange={setSearchValue}
              />
            )}
            toolbarTrailing={(
              <Button size="sm" onClick={openAddModal}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Staff
              </Button>
            )}
          />
        </div>
      ) : null}

      <FormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Staff Account"
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
        title={activeStaff?.userName ? `Edit Staff Account - ${activeStaff.userName}` : 'Edit Staff Account'}
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
    </PageContainer>
  )
}
