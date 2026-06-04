'use client'

import { useEffect, useMemo } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ActiveStatusField } from '@/common/components/forms'
import { Select, type SelectOption } from '@/common/components/select'
import {
  createInvStore,
  listCollegesByOrganization,
  listEmployeesForInvStore,
  listOrganizations,
  updateInvStore,
} from '@/services'
import type { InvStore } from '@/types/inventory'
import { getInventoryOrganizationId } from '../_lib/inventory-org'

const schema = z.object({
  organizationId: z.coerce.number().min(1, 'Organization is required'),
  collegeId: z.coerce.number().optional(),
  storeCode: z.string().min(1, 'Store code is required'),
  storeName: z.string().min(1, 'Store name is required'),
  employeeId: z.coerce.number().min(1, 'Employee is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function parseCollegeId(edit?: InvStore | null): number | undefined {
  if (!edit?.collegeIds) return undefined
  const first = edit.collegeIds.split(',')[0]?.trim()
  const n = Number(first)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

function getDefaults(edit?: InvStore | null): FormValues {
  const defaultOrgId = getInventoryOrganizationId()
  return {
    organizationId: edit?.organizationId ?? (defaultOrgId > 0 ? defaultOrgId : 0),
    collegeId: parseCollegeId(edit),
    storeCode: edit?.storeCode ?? '',
    storeName: edit?.storeName ?? '',
    employeeId: edit?.employeeId ?? 0,
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: InvStore | null
  onSaved: () => void
}

export default function StoreMasterModal({ open, onClose, editData, onSaved }: Props) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: getDefaults(),
  })

  const organizationId = watch('organizationId')
  const collegeId = watch('collegeId')

  const { data: organizations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ['Organizations', 'list'],
    queryFn: listOrganizations,
    enabled: open,
  })

  const { data: colleges = [], isLoading: collegesLoading } = useQuery({
    queryKey: ['Colleges', 'byOrganization', organizationId],
    queryFn: () => listCollegesByOrganization(organizationId),
    enabled: open && organizationId > 0,
  })

  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['Employees', 'forInvStore', organizationId, collegeId ?? 0],
    queryFn: () => listEmployeesForInvStore(organizationId, collegeId),
    enabled: open && organizationId > 0,
  })

  const organizationOptions: SelectOption[] = useMemo(
    () => organizations
      .filter((o) => o.isActive !== false)
      .map((o) => ({
        value: String(o.organizationId),
        label: o.orgCode ?? o.orgName ?? String(o.organizationId),
      })),
    [organizations],
  )

  const collegeOptions: SelectOption[] = useMemo(
    () => colleges.map((c) => ({
      value: String(c.collegeId),
      label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
    })),
    [colleges],
  )

  const employeeOptions: SelectOption[] = useMemo(
    () => employees.map((e, idx) => ({
      value: String(e.employeeId ?? idx),
      label: `${e.firstName ?? e.employeeName ?? e.empName ?? '-'} (${e.empNumber ?? e.employeeCode ?? 'NA'})`,
    })),
    [employees],
  )

  useEffect(() => {
    if (!open) return
    reset(getDefaults(editData))
  }, [open, editData, reset])

  useEffect(() => {
    if (!open || editData) return
    if (organizationId > 0) return
    const defaultOrgId = getInventoryOrganizationId()
    if (defaultOrgId > 0) setValue('organizationId', defaultOrgId)
  }, [open, editData, organizationId, setValue])

  async function onSubmit(values: FormValues) {
    const selectedEmployee = employees.find((e) => Number(e.employeeId) === values.employeeId)
    const payload: Partial<InvStore> = {
      storeCode: values.storeCode.trim(),
      storeName: values.storeName.trim(),
      organizationId: values.organizationId,
      collegeIds: values.collegeId ? String(values.collegeId) : undefined,
      employeeId: values.employeeId,
      empName: String(
        selectedEmployee?.firstName
          ?? selectedEmployee?.employeeName
          ?? selectedEmployee?.empName
          ?? editData?.empName
          ?? '',
      ).trim() || undefined,
      isActive: values.isActive,
      reason: values.isActive ? 'active' : (values.reason?.trim() || 'inactive'),
    }
    if (editData) {
      await updateInvStore(editData.storeId, payload)
    } else {
      await createInvStore(payload)
    }
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? 'Edit Stores Master' : 'Add Stores Master'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="organizationId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Organization *"
                  value={field.value > 0 ? String(field.value) : null}
                  onChange={(v) => {
                    field.onChange(v ? Number(v) : 0)
                    setValue('collegeId', undefined)
                    setValue('employeeId', 0)
                  }}
                  options={organizationOptions}
                  placeholder="Select organization"
                  isLoading={orgsLoading}
                  searchable
                  error={errors.organizationId?.message}
                />
              )}
            />
            <Controller
              name="collegeId"
              control={control}
              render={({ field }) => (
                <Select
                  label="College"
                  value={field.value != null && field.value > 0 ? String(field.value) : null}
                  onChange={(v) => {
                    field.onChange(v ? Number(v) : undefined)
                    setValue('employeeId', 0)
                  }}
                  options={collegeOptions}
                  placeholder="Select college"
                  isLoading={collegesLoading}
                  searchable
                  clearable
                  disabled={!organizationId}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-0.5">
              <Label className="text-xs">Store Name *</Label>
              <Input className="h-8 text-xs" {...register('storeName')} />
              {errors.storeName && <p className="text-xs text-red-500">{errors.storeName.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Store Code *</Label>
              <Input className="h-8 text-xs" {...register('storeCode')} />
              {errors.storeCode && <p className="text-xs text-red-500">{errors.storeCode.message}</p>}
            </div>
            <Controller
              name="employeeId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Employee *"
                  value={field.value > 0 ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : 0)}
                  options={employeeOptions}
                  placeholder="Select employee"
                  isLoading={employeesLoading}
                  searchable
                  disabled={!organizationId}
                  error={errors.employeeId?.message}
                />
              )}
            />
          </div>

          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch('reason') ?? ''}
                onActiveChange={field.onChange}
                onReasonChange={(v) => setValue('reason', v)}
                reasonError={errors.reason?.message}
              />
            )}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Close
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
