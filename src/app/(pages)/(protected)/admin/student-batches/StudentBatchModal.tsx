'use client'

import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  createStudentBatch,
  listActiveBatchesForStudentBatches,
  listActiveSectionsForStudentBatches,
  updateStudentBatch,
} from '@/services'
import type { Batch } from '@/types/batch'
import type { GroupSection } from '@/types/group-section'
import type { StudentBatch } from '@/types/student-batch'

const schema = z.object({
  groupSectionId: z.number().min(1, 'Section is required'),
  batchId: z.number().min(1, 'Batch is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>
function num(v: unknown) { const n = Number(v); return Number.isFinite(n) ? n : 0 }

export default function StudentBatchModal({
  open, onClose, row, onSaved,
}: Readonly<{ open: boolean; onClose: () => void; row: StudentBatch | null; onSaved: () => void }>) {
  const isEditing = Boolean(row)
  const [sections, setSections] = useState<GroupSection[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { handleSubmit, reset, control, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { groupSectionId: undefined, batchId: undefined, isActive: true, reason: '' },
  })

  useEffect(() => {
    if (!open) return
    Promise.all([listActiveSectionsForStudentBatches(), listActiveBatchesForStudentBatches()])
      .then(([s, b]) => { setSections(s); setBatches(b) })
      .catch(console.error)
  }, [open])
  useEffect(() => {
    if (row) reset({ groupSectionId: row.groupSectionId, batchId: row.batchId, isActive: row.isActive, reason: row.reason ?? '' })
    else reset()
    setSubmitError(null)
  }, [row, open, reset])

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    const selectedSection = sections.find((s) => num((s as unknown as Record<string, unknown>).groupSectionId) === data.groupSectionId)
    const payload = {
      ...data,
      collegeId: num((selectedSection as unknown as Record<string, unknown>)?.collegeId),
      courseGroupId: num((selectedSection as unknown as Record<string, unknown>)?.courseGroupId),
      courseYearId: num((selectedSection as unknown as Record<string, unknown>)?.courseYearId),
    }
    try {
      if (isEditing) await updateStudentBatch(num(row?.studentAcademicbatchId ?? row?.studentAcademicBatchId), payload)
      else await createStudentBatch(payload)
      onSaved()
      onClose()
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save student batch')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(n) => { if (!n) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{isEditing ? 'Edit Student Batch' : 'Add Student Batch'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
          <Controller name="groupSectionId" control={control} render={({ field }) => (
            <Select label="Section" required value={field.value ? String(field.value) : null} onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={sections.map((s) => ({ value: String(s.groupSectionId), label: `${s.groupSectionCode} - ${s.groupSectionName}` }))} placeholder="Select section" searchable error={errors.groupSectionId?.message} />
          )} />
          <Controller name="batchId" control={control} render={({ field }) => (
            <Select label="Batch" required value={field.value ? String(field.value) : null} onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={batches.map((b) => ({ value: String(b.batchId), label: `${b.batchCode} - ${b.batchName}` }))} placeholder="Select batch" searchable error={errors.batchId?.message} />
          )} />
          <Controller name="isActive" control={control} render={({ field }) => (
            <ActiveStatusField isActive={field.value} reason={watch('reason') ?? ''} onActiveChange={field.onChange} onReasonChange={(v) => setValue('reason', v)} reasonError={errors.reason?.message} />
          )} />
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <DialogFooter><Button variant="outline" type="button" onClick={onClose}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Save'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
