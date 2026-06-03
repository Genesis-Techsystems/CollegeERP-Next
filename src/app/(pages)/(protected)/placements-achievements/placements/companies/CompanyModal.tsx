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
import { createCompany, updateCompany } from '@/services/placements'
import type { Company } from '@/types/placements'

const schema = z.object({
  companyname: z.string().min(1, 'Company name is required'),
  location: z.string().min(1, 'Location is required'),
  website: z.string().min(1, 'Website is required'),
  linkedin: z.string().optional(),
  companydescription: z.string().optional(),
  lastParticipatedDate: z.string().optional(),
  phoneNumber: z.string().optional(),
  primaryContactDetails: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function getDefaults(edit?: Company | null): FormValues {
  return {
    companyname: edit?.companyname ?? '',
    location: edit?.location ?? '',
    website: edit?.website ?? '',
    linkedin: edit?.linkedin ?? '',
    companydescription: edit?.companydescription ?? '',
    lastParticipatedDate: edit?.lastParticipatedDate ?? '',
    phoneNumber: edit?.phoneNumber ?? '',
    primaryContactDetails: edit?.primaryContactDetails ?? '',
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: Company | null
  onSaved: () => void
}

export default function CompanyModal({ open, onClose, editData, onSaved }: Props) {
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
    reset(getDefaults(editData))
    setSubmitError(null)
  }, [open, editData, reset])

  const isActive = watch('isActive')

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    try {
      const payload: Partial<Company> = {
        companyname: values.companyname,
        location: values.location,
        website: values.website,
        linkedin: values.linkedin || undefined,
        companydescription: values.companydescription || undefined,
        lastParticipatedDate: values.lastParticipatedDate || undefined,
        phoneNumber: values.phoneNumber || undefined,
        primaryContactDetails: values.primaryContactDetails || undefined,
        isActive: values.isActive,
        reason: values.isActive ? 'active' : (values.reason || 'inactive'),
      }
      if (editData) {
        await updateCompany(editData.companyId, payload)
      } else {
        await createCompany(payload)
      }
      onSaved()
      onClose()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? 'Edit Company' : 'Add Company'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5 col-span-2">
              <Label className="text-xs">Company Name *</Label>
              <Input className="h-8 text-xs" {...register('companyname')} />
              {errors.companyname && <p className="text-xs text-red-500">{errors.companyname.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Location *</Label>
              <Input className="h-8 text-xs" {...register('location')} />
              {errors.location && <p className="text-xs text-red-500">{errors.location.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Website *</Label>
              <Input className="h-8 text-xs" {...register('website')} />
              {errors.website && <p className="text-xs text-red-500">{errors.website.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">LinkedIn</Label>
              <Input className="h-8 text-xs" {...register('linkedin')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Phone Number</Label>
              <Input className="h-8 text-xs" {...register('phoneNumber')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Last Participated Date</Label>
              <Input className="h-8 text-xs" type="date" {...register('lastParticipatedDate')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Primary Contact Details</Label>
              <Input className="h-8 text-xs" {...register('primaryContactDetails')} />
            </div>
            <div className="space-y-0.5 col-span-2">
              <Label className="text-xs">Description</Label>
              <Textarea className="text-xs min-h-[56px]" {...register('companydescription')} />
            </div>
            <div className="col-span-2">
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Checkbox id="coIsActive" checked={field.value} onCheckedChange={field.onChange} />
                    <label htmlFor="coIsActive" className="text-xs">Active</label>
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
