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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { listGeneralDetailsByCode } from '@/services'
import { createPlacement, updatePlacement } from '@/services/placements'
import type { Placement } from '@/types/placements'

type AnyRow = Record<string, any>

const schema = z.object({
  plaecmentTitle: z.string().min(1, 'Placement title is required'),
  placementCatId: z.string().min(1, 'Status is required'),
  description: z.string().optional(),
  placementStartDate: z.string().optional(),
  placementEndDate: z.string().optional(),
  contactPerson: z.string().optional(),
  contactDetails: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  isOffcampus: z.boolean(),
  offcampusLocation: z.string().optional(),
  placementStatusComments: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function getDefaults(edit?: Placement | null): FormValues {
  return {
    plaecmentTitle: edit?.plaecmentTitle ?? '',
    placementCatId: String(edit?.placementCatId ?? ''),
    description: edit?.description ?? '',
    placementStartDate: edit?.placementStartDate ?? '',
    placementEndDate: edit?.placementEndDate ?? '',
    contactPerson: edit?.contactPerson ?? '',
    contactDetails: edit?.contactDetails ?? '',
    address: edit?.address ?? '',
    city: edit?.city ?? '',
    isOffcampus: edit?.isOffcampus ?? false,
    offcampusLocation: edit?.offcampusLocation ?? '',
    placementStatusComments: edit?.placementStatusComments ?? '',
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: Placement | null
  onSaved: () => void
}

export default function PlacementModal({ open, onClose, editData, onSaved }: Props) {
  const [statusList, setStatusList] = useState<AnyRow[]>([])
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
    listGeneralDetailsByCode('PLCMNTSTS').then(setStatusList).catch(console.error)
  }, [open])

  useEffect(() => {
    reset(getDefaults(editData))
    setSubmitError(null)
  }, [open, editData, reset])

  const isOffcampus = watch('isOffcampus')
  const isActive = watch('isActive')

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    try {
      const payload: Partial<Placement> = {
        plaecmentTitle: values.plaecmentTitle,
        placementCatId: Number(values.placementCatId),
        description: values.description || undefined,
        placementStartDate: values.placementStartDate || undefined,
        placementEndDate: values.placementEndDate || undefined,
        contactPerson: values.contactPerson || undefined,
        contactDetails: values.contactDetails || undefined,
        address: values.address || undefined,
        city: values.city || undefined,
        isOffcampus: values.isOffcampus,
        offcampusLocation: values.isOffcampus ? values.offcampusLocation || undefined : undefined,
        placementStatusComments: values.placementStatusComments || undefined,
        isActive: values.isActive,
        reason: values.isActive ? 'active' : (values.reason || 'inactive'),
      }
      if (editData) {
        await updatePlacement(editData.placementId, payload)
      } else {
        await createPlacement(payload)
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
            {editData ? 'Edit Placement' : 'Add Placement'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5 col-span-2">
              <Label className="text-xs">Placement Title *</Label>
              <Input className="h-8 text-xs" {...register('plaecmentTitle')} />
              {errors.plaecmentTitle && <p className="text-xs text-red-500">{errors.plaecmentTitle.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Status *</Label>
              <Controller
                name="placementCatId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      {statusList.map((s) => (
                        <SelectItem key={s.generalDetailId ?? s.gd_id} value={String(s.generalDetailId ?? s.gd_id)}>
                          {s.generalDetailDisplayName ?? s.gd_name ?? 'Status'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.placementCatId && <p className="text-xs text-red-500">{errors.placementCatId.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Contact Person</Label>
              <Input className="h-8 text-xs" {...register('contactPerson')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Start Date</Label>
              <Input className="h-8 text-xs" type="date" {...register('placementStartDate')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">End Date</Label>
              <Input className="h-8 text-xs" type="date" {...register('placementEndDate')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Address</Label>
              <Input className="h-8 text-xs" {...register('address')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">City</Label>
              <Input className="h-8 text-xs" {...register('city')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Contact Details</Label>
              <Input className="h-8 text-xs" {...register('contactDetails')} />
            </div>
            <div className="space-y-0.5 col-span-2">
              <Label className="text-xs">Description</Label>
              <Textarea className="text-xs min-h-[56px]" {...register('description')} />
            </div>
            <div className="space-y-0.5 col-span-2">
              <Label className="text-xs">Status Comments</Label>
              <Input className="h-8 text-xs" {...register('placementStatusComments')} />
            </div>
            <div>
              <Controller
                name="isOffcampus"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Checkbox id="plIsOffcampus" checked={field.value} onCheckedChange={field.onChange} />
                    <label htmlFor="plIsOffcampus" className="text-xs">Off Campus</label>
                  </div>
                )}
              />
            </div>
            {isOffcampus && (
              <div className="space-y-0.5">
                <Label className="text-xs">Off Campus Location</Label>
                <Input className="h-8 text-xs" {...register('offcampusLocation')} />
              </div>
            )}
            <div className="col-span-2">
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Checkbox id="plIsActive" checked={field.value} onCheckedChange={field.onChange} />
                    <label htmlFor="plIsActive" className="text-xs">Active</label>
                  </div>
                )}
              />
            </div>
            {!isActive && (
              <div className="space-y-0.5 col-span-2">
                <Label className="text-xs">Reason</Label>
                <Input className="h-8 text-xs" {...register('reason')} />
              </div>
            )}
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
