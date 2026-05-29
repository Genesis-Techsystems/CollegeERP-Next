'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select } from '@/common/components/select'
import { listCompanies, createPlacementBroadcast, updatePlacementBroadcast } from '@/services/placements'
import type { PlacementBroadcast, Company } from '@/types/placements'

const schema = z.object({
  companyId: z.string().min(1, 'Company is required'),
  postHeader: z.string().optional(),
  post: z.string().optional(),
  postSignature: z.string().optional(),
  isApproved: z.boolean(),
  approvedOn: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function getDefaults(edit?: PlacementBroadcast | null): FormValues {
  return {
    companyId: String(edit?.companyId ?? ''),
    postHeader: edit?.postHeader ?? '',
    post: edit?.post ?? '',
    postSignature: edit?.postSignature ?? '',
    isApproved: edit?.isApproved ?? false,
    approvedOn: edit?.approvedOn?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

interface FilterContext {
  yearName: string
  posttypeCatdetId: string
}

interface Props {
  open: boolean
  onClose: () => void
  editData: PlacementBroadcast | null
  filterContext: FilterContext
  onSaved: () => void
}

export default function PlacementBroadcastModal({
  open, onClose, editData, filterContext, onSaved,
}: Props) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaults(),
  })

  useEffect(() => {
    if (!open) return
    listCompanies().then(setCompanies).catch(console.error)
  }, [open])

  useEffect(() => {
    reset(getDefaults(editData))
    setSubmitError(null)
  }, [open, editData, reset])

  const isActive = watch('isActive')
  const isApproved = watch('isApproved')

  const companyOptions = companies.map((c) => ({
    value: String(c.companyId),
    label: c.companyname,
  }))

  async function onSubmit(values: FormValues) {
    if (!filterContext.yearName || !filterContext.posttypeCatdetId) {
      setSubmitError('Select year and post type before saving.')
      return
    }

    setSubmitError(null)
    try {
      const payload: Partial<PlacementBroadcast> = {
        companyId: Number(values.companyId),
        posttypeCatdetId: editData?.posttypeCatdetId ?? Number(filterContext.posttypeCatdetId),
        yearName: editData?.yearName ?? filterContext.yearName,
        postHeader: values.postHeader || undefined,
        post: values.post || undefined,
        postSignature: values.postSignature || undefined,
        isApproved: values.isApproved,
        approvedOn: values.isApproved ? values.approvedOn || undefined : undefined,
        isActive: values.isActive,
        reason: values.isActive ? 'active' : (values.reason || 'inactive'),
      }
      if (editData) {
        await updatePlacementBroadcast(editData.placementBroadcastId, payload)
      } else {
        await createPlacementBroadcast(payload)
      }
      onSaved()
      onClose()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? 'Edit Placement Broadcast' : 'Add Placement Broadcast'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-0.5">
              <Label className="text-xs">Company *</Label>
              <Controller
                name="companyId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || null}
                    onChange={(v) => field.onChange(v ?? '')}
                    options={companyOptions}
                    placeholder="Select company"
                    searchable
                  />
                )}
              />
              {errors.companyId && <p className="text-xs text-red-500">{errors.companyId.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Post Header</Label>
              <Input className="h-8 text-xs" {...register('postHeader')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Post</Label>
              <Textarea className="text-xs min-h-[96px]" {...register('post')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Post Signature</Label>
              <Input className="h-8 text-xs" {...register('postSignature')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Controller
                name="isApproved"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Checkbox id="pbApproved" checked={field.value} onCheckedChange={field.onChange} />
                    <label htmlFor="pbApproved" className="text-xs">Approve</label>
                  </div>
                )}
              />
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Checkbox id="pbIsActive" checked={field.value} onCheckedChange={field.onChange} />
                    <label htmlFor="pbIsActive" className="text-xs">Active</label>
                  </div>
                )}
              />
            </div>
            {isApproved && (
              <div className="space-y-0.5">
                <Label className="text-xs">Approve Date</Label>
                <Input className="h-8 text-xs" type="date" {...register('approvedOn')} />
              </div>
            )}
            {!isActive && (
              <div className="space-y-0.5">
                <Label className="text-xs">Reason</Label>
                <Input className="h-8 text-xs" {...register('reason')} />
              </div>
            )}
          </div>
          {submitError && <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
