'use client'

import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/common/components/select'
import { ActiveStatusField } from '@/common/components/forms'
import {
  createRemunerationSetting,
  updateRemunerationSetting,
  listRemunerationDesignations,
  listRolesByOrganization,
  listColleges,
  listAffiliations,
} from '@/services'
import type { UnivRemunerationSetting } from '@/types/committees'

type AnyRow = Record<string, unknown>

function pickNum(row: AnyRow, keys: string[]): number {
  for (const k of keys) {
    const n = Number(row[k] ?? 0)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function pickText(row: AnyRow, keys: string[]): string {
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

const schema = z.object({
  evaluatorroleId: z.string().min(1, 'Role is required'),
  remunerationDesignationCatDetId: z.string().min(1, 'Designation is required'),
  amount: z.string().min(1, 'Amount is required'),
  collegeId: z.string().min(1, 'College is required'),
  affiliatedToCatDetId: z.string().min(1, 'Affiliated to is required'),
  fromDate: z.string().min(1, 'From date is required'),
  toDate: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function getDefaults(edit?: UnivRemunerationSetting | null): FormValues {
  return {
    evaluatorroleId: edit?.evaluatorroleId ? String(edit.evaluatorroleId) : '',
    remunerationDesignationCatDetId: edit?.remunerationDesignationCatDetId
      ? String(edit.remunerationDesignationCatDetId)
      : '',
    amount: edit?.amount != null ? String(edit.amount) : '',
    collegeId: edit?.collegeId ? String(edit.collegeId) : '',
    affiliatedToCatDetId: edit?.affiliatedToCatDetId ? String(edit.affiliatedToCatDetId) : '',
    fromDate: edit?.fromDate?.slice(0, 10) ?? '',
    toDate: edit?.toDate?.slice(0, 10) ?? '',
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: UnivRemunerationSetting | null
  organizationId: number
  onSaved: () => void
}

export default function RemunerationSettingModal({ open, onClose, editData, organizationId, onSaved }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [affiliationOptions, setAffiliationOptions] = useState<{ value: string; label: string }[]>([])

  const {
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaults(),
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['Role', 'byOrganization', organizationId],
    queryFn: () => listRolesByOrganization(organizationId),
    enabled: open && organizationId > 0,
  })

  const { data: designations = [] } = useQuery({
    queryKey: ['RemunerationDesignation', 'list'],
    queryFn: listRemunerationDesignations,
    enabled: open,
  })

  const { data: colleges = [] } = useQuery({
    queryKey: ['College', 'list'],
    queryFn: listColleges,
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    listAffiliations()
      .then(setAffiliationOptions)
      .catch(console.error)
  }, [open])

  useEffect(() => {
    reset(getDefaults(editData))
    setSubmitError(null)
  }, [open, editData, reset])

  const roleOptions = useMemo(
    () => roles.map((r) => ({ value: String(r.roleId), label: r.roleName })),
    [roles],
  )

  const designationOptions = useMemo(
    () => designations.map((row) => ({
      value: String(
        pickNum(row as AnyRow, [
          'remunerationDesignationCatDetId',
          'catDetId',
          'generalDetailId',
          'pk_catdet_id',
        ]),
      ),
      label: pickText(row as AnyRow, [
        'remunerationDesignationName',
        'designationName',
        'name',
        'catdet_name',
      ]),
    })).filter((o) => o.value !== '0'),
    [designations],
  )

  const collegeOptions = useMemo(
    () => colleges.map((c) => ({
      value: String(c.collegeId),
      label: c.collegeCode ? `${c.collegeName} (${c.collegeCode})` : c.collegeName,
    })),
    [colleges],
  )

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    try {
      const payload: Partial<UnivRemunerationSetting> = {
        organizationId,
        evaluatorroleId: Number(values.evaluatorroleId),
        remunerationDesignationCatDetId: Number(values.remunerationDesignationCatDetId),
        amount: Number(values.amount),
        collegeId: Number(values.collegeId),
        affiliatedToCatDetId: Number(values.affiliatedToCatDetId),
        fromDate: values.fromDate,
        toDate: values.toDate || undefined,
        isActive: values.isActive,
        reason: values.isActive ? 'active' : (values.reason?.trim() || 'inactive'),
      }
      if (editData) {
        await updateRemunerationSetting(editData.univRemunerationSettingId, payload)
      } else {
        await createRemunerationSetting(payload)
      }
      onSaved()
      onClose()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save remuneration setting.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? 'Edit Remuneration Setting' : 'Add Remuneration Setting'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="evaluatorroleId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Role"
                  required
                  value={field.value || null}
                  onChange={(v) => field.onChange(v ?? '')}
                  options={roleOptions}
                  placeholder="Select role"
                  searchable
                  error={errors.evaluatorroleId?.message}
                />
              )}
            />
            <Controller
              name="remunerationDesignationCatDetId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Designation"
                  required
                  value={field.value || null}
                  onChange={(v) => field.onChange(v ?? '')}
                  options={designationOptions}
                  placeholder="Select designation"
                  searchable
                  error={errors.remunerationDesignationCatDetId?.message}
                />
              )}
            />
            <div className="space-y-0.5">
              <Label className="text-xs">Amount *</Label>
              <Controller
                name="amount"
                control={control}
                render={({ field }) => (
                  <Input className="h-8 text-xs" type="number" min={0} step="0.01" value={field.value} onChange={field.onChange} />
                )}
              />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <Controller
              name="collegeId"
              control={control}
              render={({ field }) => (
                <Select
                  label="College"
                  required
                  value={field.value || null}
                  onChange={(v) => field.onChange(v ?? '')}
                  options={collegeOptions}
                  placeholder="Select college"
                  searchable
                  error={errors.collegeId?.message}
                />
              )}
            />
            <Controller
              name="affiliatedToCatDetId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Affiliated To"
                  required
                  value={field.value || null}
                  onChange={(v) => field.onChange(v ?? '')}
                  options={affiliationOptions}
                  placeholder="Select affiliation"
                  searchable
                  error={errors.affiliatedToCatDetId?.message}
                />
              )}
            />
            <div className="space-y-0.5">
              <Label className="text-xs">From Date *</Label>
              <Controller
                name="fromDate"
                control={control}
                render={({ field }) => (
                  <Input className="h-8 text-xs" type="date" value={field.value} onChange={field.onChange} />
                )}
              />
              {errors.fromDate && <p className="text-xs text-red-500">{errors.fromDate.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">To Date</Label>
              <Controller
                name="toDate"
                control={control}
                render={({ field }) => (
                  <Input className="h-8 text-xs" type="date" value={field.value ?? ''} onChange={field.onChange} />
                )}
              />
            </div>
            <div className="col-span-2">
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
            </div>
          </div>

          {submitError && <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editData ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
