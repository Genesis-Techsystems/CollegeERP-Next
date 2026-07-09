'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  createWorkflowMemberAuthorization,
  getWorkflowMemberAuthorizationFormFilters,
  listActiveCollegesForWorkflowAuthorization,
  updateWorkflowMemberAuthorization,
  type WorkflowMemberAuthorizationEmployeeRow,
  type WorkflowMemberAuthorizationFormFilters,
} from '@/services'
import type { College } from '@/types/college'
import type { WorkflowMemberAuthorization } from '@/types/workflow-member-authorization'

const optionalNumber = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}, z.number().optional())

const schema = z.object({
  collegeId: z.number().min(1, 'College is required'),
  wfForCode: z.string().min(1, 'Workflow for code is required'),
  wfStage: z.number().min(1, 'Workflow stage is required'),
  assignmentType: z.enum(['role', 'employee']),
  roleId: optionalNumber,
  employeeDetailId: optionalNumber,
  storeIsActive: z.boolean(),
  storeId: optionalNumber,
  isActive: z.boolean(),
  reason: z.string().optional(),
}).superRefine((values, ctx) => {
  if (values.storeIsActive && !(values.storeId && values.storeId > 0)) {
    ctx.addIssue({ code: 'custom', path: ['storeId'], message: 'Store is required' })
  }
  if (values.assignmentType === 'role' && !(values.roleId && values.roleId > 0)) {
    ctx.addIssue({ code: 'custom', path: ['roleId'], message: 'Role is required' })
  }
  if (values.assignmentType === 'employee') {
    if (!(values.roleId && values.roleId > 0)) {
      ctx.addIssue({ code: 'custom', path: ['roleId'], message: 'Role is required' })
    }
    if (!(values.employeeDetailId && values.employeeDetailId > 0)) {
      ctx.addIssue({ code: 'custom', path: ['employeeDetailId'], message: 'Employee is required' })
    }
  }
})
type FormValues = z.infer<typeof schema>

function getOrganizationId(): number {
  return Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)
}

function findEmployee(
  employees: WorkflowMemberAuthorizationEmployeeRow[],
  employeeDetailId?: number,
): WorkflowMemberAuthorizationEmployeeRow | undefined {
  if (!employeeDetailId) return undefined
  return employees.find((employee) => employee.pk_emp_id === employeeDetailId)
}

function findStageName(
  filters: WorkflowMemberAuthorizationFormFilters | null,
  wfStage?: number,
): string {
  if (!filters || wfStage == null) return ''
  const match = filters.wfStages.find((row) => Number(row.wf_stage) === Number(wfStage))
  return match?.wf_name ?? ''
}

export default function WorkflowMemberAuthorizationModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<{ open: boolean; onClose: () => void; row: WorkflowMemberAuthorization | null; onSaved: () => void }>) {
  const isEditing = Boolean(row)
  const [colleges, setColleges] = useState<College[]>([])
  const [filters, setFilters] = useState<WorkflowMemberAuthorizationFormFilters | null>(null)
  const [filteredEmployees, setFilteredEmployees] = useState<WorkflowMemberAuthorizationEmployeeRow[]>([])
  const [stageName, setStageName] = useState('')
  const [employeeMobile, setEmployeeMobile] = useState('')
  const [employeeRole, setEmployeeRole] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    control,
    reset,
    setValue,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      collegeId: undefined,
      wfForCode: '',
      wfStage: undefined,
      assignmentType: 'role',
      roleId: undefined,
      employeeDetailId: undefined,
      storeIsActive: true,
      storeId: undefined,
      isActive: true,
      reason: '',
    },
  })

  const assignmentType = watch('assignmentType')
  const storeIsActive = watch('storeIsActive')
  const selectedRoleId = watch('roleId')
  const selectedEmployeeDetailId = watch('employeeDetailId')
  const selectedWfStage = watch('wfStage')

  useEffect(() => {
    if (!open) return
    const organizationId = getOrganizationId()
    Promise.all([
      listActiveCollegesForWorkflowAuthorization(),
      getWorkflowMemberAuthorizationFormFilters(organizationId),
    ])
      .then(([collegeRows, filterRows]) => {
        setColleges(collegeRows)
        setFilters(filterRows)
      })
      .catch(console.error)
  }, [open])

  useEffect(() => {
    if (!filters) return
    setStageName(findStageName(filters, selectedWfStage))
  }, [filters, selectedWfStage])

  useEffect(() => {
    if (!filters) {
      setFilteredEmployees([])
      return
    }
    if (!(selectedRoleId && selectedRoleId > 0)) {
      setFilteredEmployees([])
      return
    }
    setFilteredEmployees(
      filters.employees.filter((employee) => Number(employee.fk_emp_role_id) === Number(selectedRoleId)),
    )
  }, [filters, selectedRoleId])

  useEffect(() => {
    const employee = findEmployee(filters?.employees ?? [], selectedEmployeeDetailId)
    setEmployeeMobile(employee?.mobile ?? '')
    setEmployeeRole(employee?.role_name ?? '')
  }, [filters, selectedEmployeeDetailId])

  useEffect(() => {
    if (!open) return
    if (row) {
      const hasStore = Boolean(row.storeId)
      reset({
        collegeId: row.collegeId,
        wfForCode: row.wfForCode ?? '',
        wfStage: row.wfStage ? Number(row.wfStage) : undefined,
        assignmentType: row.roleId ? 'role' : 'employee',
        roleId: row.roleId ? Number(row.roleId) : undefined,
        employeeDetailId: row.employeeDetailId ? Number(row.employeeDetailId) : undefined,
        storeIsActive: hasStore,
        storeId: row.storeId ? Number(row.storeId) : undefined,
        isActive: row.isActive,
        reason: row.reason ?? '',
      })
      setStageName(row.wfStageName ?? findStageName(filters, row.wfStage ? Number(row.wfStage) : undefined))
    } else {
      reset({
        collegeId: undefined,
        wfForCode: '',
        wfStage: undefined,
        assignmentType: 'role',
        roleId: undefined,
        employeeDetailId: undefined,
        storeIsActive: true,
        storeId: undefined,
        isActive: true,
        reason: '',
      })
      setStageName('')
      setEmployeeMobile('')
      setEmployeeRole('')
    }
    setSubmitError(null)
  }, [row, open, reset])

  useEffect(() => {
    if (!open || !row || !filters) return
    const wfStage = row.wfStage ? Number(row.wfStage) : undefined
    setStageName(row.wfStageName ?? findStageName(filters, wfStage))
    if (row.employeeDetailId) {
      const employee = findEmployee(filters.employees, Number(row.employeeDetailId))
      setEmployeeMobile(employee?.mobile ?? '')
      setEmployeeRole(employee?.role_name ?? row.roleName ?? '')
    }
  }, [open, row, filters])

  const collegeOptions = useMemo(
    () => colleges.map((college) => ({
      value: String(college.collegeId),
      label: college.collegeCode ?? college.collegeName ?? String(college.collegeId),
    })),
    [colleges],
  )

  const wfCodeOptions = useMemo(
    () => (filters?.wfCodes ?? []).map((item) => ({
      value: item.wf_for_code,
      label: item.wf_for || item.wf_for_code,
    })),
    [filters],
  )

  const wfStageOptions = useMemo(
    () => (filters?.wfStages ?? []).map((item) => ({
      value: String(item.wf_stage),
      label: String(item.wf_stage),
    })),
    [filters],
  )

  const roleOptions = useMemo(
    () => (filters?.roles ?? []).map((role) => ({
      value: String(role.pk_role_id),
      label: role.role_name,
    })),
    [filters],
  )

  const employeeOptions = useMemo(
    () => filteredEmployees.map((employee) => ({
      value: String(employee.pk_emp_id),
      label: `${employee.last_name} (${employee.pk_emp_id})`,
    })),
    [filteredEmployees],
  )

  const storeOptions = useMemo(
    () => (filters?.stores ?? []).map((store) => ({
      value: String(store.pk_store_id),
      label: store.store_name,
    })),
    [filters],
  )

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    const organizationId = getOrganizationId()
    const payload = {
      organizationId: organizationId > 0 ? organizationId : row?.organizationId ?? 1,
      collegeId: data.collegeId,
      wfForCode: data.wfForCode,
      wfStage: Number(data.wfStage),
      roleId: data.assignmentType === 'role' ? Number(data.roleId) : null,
      employeeDetailId: data.assignmentType === 'employee' ? Number(data.employeeDetailId) : null,
      storeId: data.storeIsActive && data.storeId ? Number(data.storeId) : null,
      isActive: data.isActive,
      reason: data.reason ?? '',
    }
    try {
      if (isEditing) await updateWorkflowMemberAuthorization(row!.wfMemberAuthorizationId, payload)
      else await createWorkflowMemberAuthorization(payload as Omit<WorkflowMemberAuthorization, 'wfMemberAuthorizationId'>)
      onSaved()
      onClose()
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save workflow authorization')
    }
  }

  const dialogTitle = isEditing ? 'Edit Workflow Authorization' : 'Add Workflow Authorization'
  let submitLabel = 'Save'
  if (isSubmitting) submitLabel = 'Saving...'
  else if (isEditing) submitLabel = 'Update'

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="flex items-center gap-2">
            <Controller
              name="storeIsActive"
              control={control}
              render={({ field }) => (
                <>
                  <Checkbox
                    id="storeIsActive"
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      const next = checked === true
                      field.onChange(next)
                      if (!next) setValue('storeId', undefined)
                    }}
                  />
                  <Label htmlFor="storeIsActive" className="cursor-pointer">
                    is Store
                  </Label>
                </>
              )}
            />
          </div>
          {storeIsActive && (
            <Controller
              name="storeId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Store"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(value) => field.onChange(value ? Number(value) : undefined)}
                  options={storeOptions}
                  placeholder="Select store"
                  searchable
                  error={errors.storeId?.message}
                />
              )}
            />
          )}
          <Controller
            name="collegeId"
            control={control}
            render={({ field }) => (
              <Select
                label="College"
                required
                value={field.value ? String(field.value) : null}
                onChange={(value) => field.onChange(value ? Number(value) : undefined)}
                options={collegeOptions}
                placeholder="Select college"
                searchable
                error={errors.collegeId?.message}
              />
            )}
          />
          <div className="grid grid-cols-2 gap-2">
            <Controller
              name="wfForCode"
              control={control}
              render={({ field }) => (
                <Select
                  label="WorkFlow Code"
                  required
                  value={field.value || null}
                  onChange={(value) => field.onChange(value ?? '')}
                  options={wfCodeOptions}
                  placeholder="Select workflow code"
                  searchable
                  error={errors.wfForCode?.message}
                />
              )}
            />
            <Controller
              name="wfStage"
              control={control}
              render={({ field }) => (
                <Select
                  label="Workflow Stage"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(value) => {
                    const next = value ? Number(value) : undefined
                    field.onChange(next)
                    setStageName(findStageName(filters, next))
                  }}
                  options={wfStageOptions}
                  placeholder="Select workflow stage"
                  error={errors.wfStage?.message}
                />
              )}
            />
          </div>
          <Controller
            name="assignmentType"
            control={control}
            render={({ field }) => (
              <Select
                label="Level"
                required
                value={field.value}
                onChange={(value) => {
                  const next = value === 'employee' ? 'employee' : 'role'
                  field.onChange(next)
                  if (next === 'role') setValue('employeeDetailId', undefined)
                }}
                options={[
                  { value: 'role', label: 'Role Level' },
                  { value: 'employee', label: 'Employee Level' },
                ]}
                error={errors.assignmentType?.message}
              />
            )}
          />
          <div className={assignmentType === 'employee' ? 'grid grid-cols-2 gap-2' : undefined}>
            <Controller
              name="roleId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Role"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(value) => {
                    const next = value ? Number(value) : undefined
                    field.onChange(next)
                    if (assignmentType === 'employee') setValue('employeeDetailId', undefined)
                  }}
                  options={roleOptions}
                  placeholder="Select role"
                  searchable
                  error={errors.roleId?.message}
                />
              )}
            />
            {assignmentType === 'employee' && (
              <Controller
                name="employeeDetailId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Employee"
                    required
                    value={field.value ? String(field.value) : null}
                    onChange={(value) => field.onChange(value ? Number(value) : undefined)}
                    options={employeeOptions}
                    placeholder="Select employee"
                    searchable
                    error={errors.employeeDetailId?.message}
                  />
                )}
              />
            )}
          </div>
          <div className="space-y-1 text-sm">
            <p>
              Workflow Stage Name:
              <span className="ml-2 font-medium text-[hsl(var(--primary))]">{stageName || '-'}</span>
            </p>
            {assignmentType === 'employee' && (
              <>
                <p>
                  Employee Mobile No:
                  <span className="ml-2 font-medium text-[hsl(var(--primary))]">{employeeMobile || '-'}</span>
                </p>
                <p>
                  Employee Role:
                  <span className="ml-2 font-medium text-[hsl(var(--primary))]">{employeeRole || '-'}</span>
                </p>
              </>
            )}
          </div>
          {isEditing && (
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <ActiveStatusField
                  isActive={field.value}
                  reason={watch('reason') ?? ''}
                  onActiveChange={field.onChange}
                  onReasonChange={(value) => setValue('reason', value)}
                  reasonError={errors.reason?.message}
                />
              )}
            />
          )}
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <DialogFooter className="pt-1">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
