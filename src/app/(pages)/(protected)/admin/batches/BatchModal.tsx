'use client'

import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActiveStatusField } from '@/common/components/forms'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createBatch, listActiveCollegesForBatches, updateBatch } from '@/services'
import type { Batch } from '@/types/batch'
import type { College } from '@/types/college'

const schema = z.object({
  collegeId: z.number().min(1, 'College is required'),
  batchName: z.string().min(1, 'Batch name is required'),
  batchCode: z.string().min(1, 'Batch code is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function BatchModal({
  open, onClose, row, onSaved,
}: Readonly<{ open: boolean; onClose: () => void; row: Batch | null; onSaved: () => void }>) {
  const isEditing = Boolean(row)
  const [colleges, setColleges] = useState<College[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { register, handleSubmit, reset, control, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { collegeId: undefined, batchName: '', batchCode: '', isActive: true, reason: '' },
  })

  useEffect(() => { if (open) listActiveCollegesForBatches().then(setColleges).catch(console.error) }, [open])
  useEffect(() => {
    if (row) reset({ collegeId: row.collegeId ?? 0, batchName: row.batchName, batchCode: row.batchCode, isActive: row.isActive, reason: row.reason ?? '' })
    else reset()
    setSubmitError(null)
  }, [row, open, reset])

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    try {
      if (isEditing) await updateBatch(row!.batchId, data)
      else await createBatch(data)
      onSaved()
      onClose()
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save batch')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(n) => { if (!n) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit Batch' : 'Add Batch'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <Controller name="collegeId" control={control} render={({ field }) => (
            <Select label="College" required value={field.value ? String(field.value) : null} onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={colleges.map((c) => ({ value: String(c.collegeId), label: c.collegeCode ?? c.collegeName }))} placeholder="Select college" searchable error={errors.collegeId?.message} />
          )} />
          <div className="grid grid-cols-2 gap-2">
            <div><Label htmlFor="bn">Batch Name *</Label><Input id="bn" {...register('batchName')} />{errors.batchName && <p className="text-xs text-red-500">{errors.batchName.message}</p>}</div>
            <div><Label htmlFor="bc">Batch Code *</Label><Input id="bc" {...register('batchCode')} />{errors.batchCode && <p className="text-xs text-red-500">{errors.batchCode.message}</p>}</div>
          </div>
          {isEditing && (
            <Controller name="isActive" control={control} render={({ field }) => (
              <ActiveStatusField isActive={field.value} reason={watch('reason') ?? ''} onActiveChange={field.onChange} onReasonChange={(v) => setValue('reason', v)} reasonError={errors.reason?.message} />
            )} />
          )}
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <DialogFooter className="pt-1"><Button variant="outline" type="button" onClick={onClose}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Save'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
