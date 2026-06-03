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
import {
  listCompanies, listCompanyContactsByCompany,
  createCompanyMeeting, updateCompanyMeeting,
} from '@/services/placements'
import { listGeneralDetailsByCode } from '@/services'
import type { CompanyMeeting, Company, CompanyContact } from '@/types/placements'

type AnyRow = Record<string, any>

const schema = z.object({
  meetingTitle: z.string().min(1, 'Meeting title is required'),
  companyId: z.string().optional(),
  companyContactId: z.string().optional(),
  meetingTypeCatdetId: z.string().optional(),
  meetingOn: z.string().optional(),
  meetingFromTime: z.string().optional(),
  meetingToTime: z.string().optional(),
  meetingOutput: z.string().optional(),
  attendeesNames: z.string().optional(),
  followupMeetingOn: z.string().optional(),
  followupPoints: z.string().optional(),
  meetingDescription: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function getDefaults(edit?: CompanyMeeting | null): FormValues {
  return {
    meetingTitle: edit?.meetingTitle ?? '',
    companyId: String(edit?.companyId ?? ''),
    companyContactId: String(edit?.companyContactId ?? ''),
    meetingTypeCatdetId: String(edit?.meetingTypeCatdetId ?? ''),
    meetingOn: edit?.meetingOn ?? '',
    meetingFromTime: edit?.meetingFromTime ?? '',
    meetingToTime: edit?.meetingToTime ?? '',
    meetingOutput: edit?.meetingOutput ?? '',
    attendeesNames: edit?.attendeesNames ?? '',
    followupMeetingOn: edit?.followupMeetingOn ?? '',
    followupPoints: edit?.followupPoints ?? '',
    meetingDescription: edit?.meetingDescription ?? '',
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: CompanyMeeting | null
  onSaved: () => void
}

export default function CompanyMeetingModal({ open, onClose, editData, onSaved }: Props) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [contacts, setContacts] = useState<CompanyContact[]>([])
  const [meetingTypes, setMeetingTypes] = useState<AnyRow[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
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

  useEffect(() => {
    if (!open) return
    listCompanies().then(setCompanies).catch(console.error)
    listGeneralDetailsByCode('PSTTYPE').then(setMeetingTypes).catch(console.error)
  }, [open])

  useEffect(() => {
    reset(getDefaults(editData))
    setSubmitError(null)
    if (editData?.companyId) {
      listCompanyContactsByCompany(editData.companyId).then(setContacts).catch(console.error)
    } else {
      setContacts([])
    }
  }, [open, editData, reset])

  const companyId = watch('companyId')
  const isActive = watch('isActive')

  useEffect(() => {
    if (companyId) {
      listCompanyContactsByCompany(Number(companyId)).then(setContacts).catch(console.error)
    } else {
      setContacts([])
      setValue('companyContactId', '')
    }
  }, [companyId, setValue])

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    try {
      const payload: Partial<CompanyMeeting> = {
        companyId: values.companyId ? Number(values.companyId) : undefined,
        companyContactId: values.companyContactId ? Number(values.companyContactId) : undefined,
        meetingTitle: values.meetingTitle,
        meetingDescription: values.meetingDescription || undefined,
        meetingTypeCatdetId: values.meetingTypeCatdetId ? Number(values.meetingTypeCatdetId) : undefined,
        meetingOn: values.meetingOn || undefined,
        meetingFromTime: values.meetingFromTime || undefined,
        meetingToTime: values.meetingToTime || undefined,
        meetingOutput: values.meetingOutput || undefined,
        attendeesNames: values.attendeesNames || undefined,
        followupMeetingOn: values.followupMeetingOn || undefined,
        followupPoints: values.followupPoints || undefined,
        isActive: values.isActive,
        reason: values.isActive ? 'active' : (values.reason || 'inactive'),
      }
      if (editData) {
        await updateCompanyMeeting(editData.companyMeetingId, payload)
      } else {
        await createCompanyMeeting(payload)
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
            {editData ? 'Edit Company Meeting' : 'Add Company Meeting'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5 col-span-2">
              <Label className="text-xs">Meeting Title *</Label>
              <Input className="h-8 text-xs" {...register('meetingTitle')} />
              {errors.meetingTitle && <p className="text-xs text-red-500">{errors.meetingTitle.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Company</Label>
              <Controller
                name="companyId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select company" /></SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => (
                        <SelectItem key={c.companyId} value={String(c.companyId)}>{c.companyname}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Company Contact</Label>
              <Controller
                name="companyContactId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange} disabled={!companyId}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select contact" /></SelectTrigger>
                    <SelectContent>
                      {contacts.map((c) => (
                        <SelectItem key={c.companyContactId} value={String(c.companyContactId)}>{c.personName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Meeting Type</Label>
              <Controller
                name="meetingTypeCatdetId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {meetingTypes.map((t) => (
                        <SelectItem key={t.generalDetailId ?? t.gd_id} value={String(t.generalDetailId ?? t.gd_id)}>
                          {t.generalDetailDisplayName ?? t.gd_name ?? 'Type'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Meeting On</Label>
              <Input className="h-8 text-xs" type="date" {...register('meetingOn')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">From Time</Label>
              <Input className="h-8 text-xs" type="time" {...register('meetingFromTime')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">To Time</Label>
              <Input className="h-8 text-xs" type="time" {...register('meetingToTime')} />
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Follow-up Meeting On</Label>
              <Input className="h-8 text-xs" type="date" {...register('followupMeetingOn')} />
            </div>
            <div className="space-y-0.5 col-span-2">
              <Label className="text-xs">Attendees</Label>
              <Input className="h-8 text-xs" {...register('attendeesNames')} placeholder="Comma-separated attendee names" />
            </div>
            <div className="space-y-0.5 col-span-2">
              <Label className="text-xs">Description</Label>
              <Textarea className="text-xs min-h-[56px]" {...register('meetingDescription')} />
            </div>
            <div className="space-y-0.5 col-span-2">
              <Label className="text-xs">Meeting Output</Label>
              <Textarea className="text-xs min-h-[48px]" {...register('meetingOutput')} />
            </div>
            <div className="space-y-0.5 col-span-2">
              <Label className="text-xs">Follow-up Points</Label>
              <Textarea className="text-xs min-h-[48px]" {...register('followupPoints')} />
            </div>
            <div className="col-span-2">
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Checkbox id="cmIsActive" checked={field.value} onCheckedChange={field.onChange} />
                    <label htmlFor="cmIsActive" className="text-xs">Active</label>
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
