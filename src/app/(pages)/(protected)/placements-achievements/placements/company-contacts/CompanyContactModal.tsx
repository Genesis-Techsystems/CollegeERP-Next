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
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { createCompanyContact, updateCompanyContact } from '@/services/placements'
import type { CompanyContact } from '@/types/placements'

const schema = z.object({
  personName: z.string().min(1, 'Person name is required'),
  mobile: z.string().min(1, 'Mobile is required'),
  designation: z.string().min(1, 'Designation is required'),
  landline: z.string().optional(),
  details: z.string().optional(),
  emailid: z.string().optional(),
  lastContactedOn: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function getDefaults(edit?: CompanyContact | null): FormValues {
  return {
    personName: edit?.personName ?? '',
    mobile: edit?.mobile ?? '',
    designation: edit?.designation ?? '',
    landline: edit?.landline ?? '',
    details: edit?.details ?? '',
    emailid: edit?.emailid ?? '',
    lastContactedOn: edit?.lastContactedOn ?? '',
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: CompanyContact | null
  companyId: number
  onSaved: () => void
}

export default function CompanyContactModal({ open, onClose, editData, companyId, onSaved }: Props) {
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
      const payload: Partial<CompanyContact> = {
        companyId,
        personName: values.personName,
        mobile: values.mobile,
        designation: values.designation,
        landline: values.landline || undefined,
        details: values.details || undefined,
        emailid: values.emailid || undefined,
        lastContactedOn: values.lastContactedOn || undefined,
        isActive: values.isActive,
        reason: values.isActive ? 'active' : (values.reason || 'inactive'),
      }
      if (editData) {
        await updateCompanyContact(editData.companyContactId, payload)
      } else {
        await createCompanyContact(payload)
      }
      onSaved()
      onClose()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? 'Edit Company Contact' : 'Add Company Contact'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5 col-span-2">
              <Label className="text-xs">Person Name *</Label>
              <Input className="h-8 text-xs" {...register('personName')} />
              {errors.personName && <p className="text-xs text-red-500">{errors.personName.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Mobile *</Label>
              <Input className="h-8 text-xs" {...register('mobile')} />
              {errors.mobile && <p className="text-xs text-red-500">{errors.mobile.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Designation *</Label>
              <Input className="h-8 text-xs" {...register('designation')} />
              {errors.designation && <p className="text-xs text-red-500">{errors.designation.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Landline</Label>
              <Input className="h-8 text-xs" {...register('landline')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Email</Label>
              <Input className="h-8 text-xs" type="email" {...register('emailid')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Last Contacted On</Label>
              <Input className="h-8 text-xs" type="date" {...register('lastContactedOn')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Details</Label>
              <Input className="h-8 text-xs" {...register('details')} />
            </div>
            <div className="col-span-2">
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Checkbox id="ccIsActive" checked={field.value} onCheckedChange={field.onChange} />
                    <label htmlFor="ccIsActive" className="text-xs">Active</label>
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
