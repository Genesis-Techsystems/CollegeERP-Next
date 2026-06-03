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
  createCommitteeMember,
  updateCommitteeMember,
  listAllCommitteePositions,
  searchEmployeesForHr,
} from '@/services'
import { QK } from '@/lib/query-keys'
import type { UnivCommitteeMember } from '@/types/committees'

type AnyRow = Record<string, unknown>

function employeeLabel(row: AnyRow): string {
  const name = String(row.firstName ?? row.employeeName ?? row.empName ?? '')
  const num = row.empNumber != null ? ` (${String(row.empNumber)})` : ''
  return `${name}${num}`.trim() || String(row.employeeId ?? '')
}

const schema = z.object({
  univCommitteePositionsId: z.string().min(1, 'Position is required'),
  committeeMemberEmpId: z.string().min(1, 'Employee is required'),
  fromDate: z.string().min(1, 'From date is required'),
  toDate: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function getDefaults(edit?: UnivCommitteeMember | null): FormValues {
  return {
    univCommitteePositionsId: edit?.univCommitteePositionsId ? String(edit.univCommitteePositionsId) : '',
    committeeMemberEmpId: edit?.committeeMemberEmpId ? String(edit.committeeMemberEmpId) : '',
    fromDate: edit?.fromDate?.slice(0, 10) ?? '',
    toDate: edit?.toDate?.slice(0, 10) ?? '',
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: UnivCommitteeMember | null
  committeeId: number
  onSaved: () => void
}

export default function CommitteeMemberModal({ open, onClose, editData, committeeId, onSaved }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [employeeOptions, setEmployeeOptions] = useState<{ value: string; label: string }[]>([])
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false)

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

  const { data: positions = [] } = useQuery({
    queryKey: QK.committeePositions.allPositions(),
    queryFn: listAllCommitteePositions,
    enabled: open,
  })

  useEffect(() => {
    reset(getDefaults(editData))
    setSubmitError(null)
    if (editData?.committeeMemberEmpId) {
      setEmployeeOptions([{
        value: String(editData.committeeMemberEmpId),
        label: editData.committeeMemberEmployeeFirstName ?? String(editData.committeeMemberEmpId),
      }])
    } else {
      setEmployeeOptions([])
    }
  }, [open, editData, reset])

  const positionOptions = useMemo(
    () => positions.map((p) => ({
      value: String(p.univCommitteePositionId),
      label: p.committeePossitoinName,
    })),
    [positions],
  )

  async function onEmployeeSearch(term: string) {
    const q = term.trim()
    if (q.length < 4) {
      setEmployeeOptions([])
      return
    }
    setEmployeeSearchLoading(true)
    try {
      const rows = await searchEmployeesForHr(q)
      setEmployeeOptions(rows.map((row) => ({
        value: String(row.employeeId),
        label: employeeLabel(row as AnyRow),
      })))
    } catch {
      setEmployeeOptions([])
    } finally {
      setEmployeeSearchLoading(false)
    }
  }

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    try {
      const payload: Partial<UnivCommitteeMember> = {
        univCommitteesId: committeeId,
        univCommitteePositionsId: Number(values.univCommitteePositionsId),
        committeeMemberEmpId: Number(values.committeeMemberEmpId),
        fromDate: values.fromDate,
        toDate: values.toDate || undefined,
        isActive: values.isActive,
        reason: values.isActive ? 'active' : (values.reason?.trim() || 'inactive'),
      }
      if (editData) {
        await updateCommitteeMember(editData.univCommitteeMemberId, payload)
      } else {
        await createCommitteeMember(payload)
      }
      onSaved()
      onClose()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save committee member.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? 'Edit Committee Member' : 'Add Committee Member'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <Controller
            name="univCommitteePositionsId"
            control={control}
            render={({ field }) => (
              <Select
                label="Position"
                required
                value={field.value || null}
                onChange={(v) => field.onChange(v ?? '')}
                options={positionOptions}
                placeholder="Select position"
                searchable
                error={errors.univCommitteePositionsId?.message}
              />
            )}
          />

          <Controller
            name="committeeMemberEmpId"
            control={control}
            render={({ field }) => (
              <Select
                label="Employee"
                required
                value={field.value || null}
                onChange={(v) => field.onChange(v ?? '')}
                options={employeeOptions}
                placeholder="Search employee (min 4 chars)"
                searchable
                onSearch={onEmployeeSearch}
                isLoading={employeeSearchLoading}
                error={errors.committeeMemberEmpId?.message}
              />
            )}
          />

          <div className="grid grid-cols-2 gap-3">
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

          {submitError && <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || committeeId <= 0}>
              {isSubmitting ? 'Saving…' : editData ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
