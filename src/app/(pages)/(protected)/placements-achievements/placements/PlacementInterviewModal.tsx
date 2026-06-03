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
import { updatePlacementStudentReg } from '@/services/placements'
import { formatDate } from '@/common/generic-functions'
import type { PlacementStudentRegistration } from '@/types/placements'

const schema = z.object({
  isCVShortlisted: z.boolean(),
  isClearedWritten: z.boolean(),
  isClearedGD: z.boolean(),
  isClearedPreHR: z.boolean(),
  isClearedFirstTech: z.boolean(),
  isClearedSecondTech: z.boolean(),
  isClearedThirdTech: z.boolean(),
  isClearedManagerRound: z.boolean(),
  isClearedHR: z.boolean(),
  isPlaced: z.boolean(),
  offerDate: z.string().optional(),
  isOfferRollOut: z.boolean(),
  joiningDate: z.string().optional(),
  isJoined: z.boolean(),
  joinedOn: z.string().optional(),
  interviewerComments: z.string().optional(),
  isActive: z.boolean(),
})
type FormValues = z.infer<typeof schema>

function getDefaults(edit?: PlacementStudentRegistration | null): FormValues {
  return {
    isCVShortlisted: edit?.isCVShortlisted ?? false,
    isClearedWritten: edit?.isClearedWritten ?? false,
    isClearedGD: edit?.isClearedGD ?? false,
    isClearedPreHR: edit?.isClearedPreHR ?? false,
    isClearedFirstTech: edit?.isClearedFirstTech ?? false,
    isClearedSecondTech: edit?.isClearedSecondTech ?? false,
    isClearedThirdTech: edit?.isClearedThirdTech ?? false,
    isClearedManagerRound: edit?.isClearedManagerRound ?? false,
    isClearedHR: edit?.isClearedHR ?? false,
    isPlaced: edit?.isPlaced ?? false,
    offerDate: edit?.offerDate ?? '',
    isOfferRollOut: edit?.isOfferRollOut ?? false,
    joiningDate: edit?.joiningDate ?? '',
    isJoined: edit?.isJoined ?? false,
    joinedOn: edit?.joinedOn ?? '',
    interviewerComments: edit?.interviewerComments ?? '',
    isActive: edit?.isActive ?? true,
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: PlacementStudentRegistration | null
  onSaved: () => void
}

export default function PlacementInterviewModal({ open, onClose, editData, onSaved }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaults(),
  })

  useEffect(() => {
    reset(getDefaults(editData))
    setSubmitError(null)
  }, [open, editData, reset])

  const isPlaced = watch('isPlaced')
  const isOfferRollOut = watch('isOfferRollOut')
  const isJoined = watch('isJoined')

  async function onSubmit(values: FormValues) {
    if (!editData) return
    setSubmitError(null)
    try {
      await updatePlacementStudentReg(editData.placementStdRegId, {
        isCVShortlisted: values.isCVShortlisted,
        isClearedWritten: values.isClearedWritten,
        isClearedGD: values.isClearedGD,
        isClearedPreHR: values.isClearedPreHR,
        isClearedFirstTech: values.isClearedFirstTech,
        isClearedSecondTech: values.isClearedSecondTech,
        isClearedThirdTech: values.isClearedThirdTech,
        isClearedManagerRound: values.isClearedManagerRound,
        isClearedHR: values.isClearedHR,
        isPlaced: values.isPlaced,
        offerDate: values.isPlaced ? values.offerDate || undefined : undefined,
        isOfferRollOut: values.isPlaced ? values.isOfferRollOut : undefined,
        joiningDate: values.isOfferRollOut ? values.joiningDate || undefined : undefined,
        isJoined: values.isOfferRollOut ? values.isJoined : undefined,
        joinedOn: values.isJoined ? values.joinedOn || undefined : undefined,
        interviewerComments: values.interviewerComments || undefined,
        isActive: values.isActive,
        reason: values.isActive ? 'active' : 'inactive',
        studentId: editData.studentId ?? undefined,
        registeredDate: editData.registeredDate ?? undefined,
        companyId: editData.companyId ?? undefined,
        isRegistered: editData.isRegistered ?? undefined,
        placementId: editData.placementId ?? undefined,
      })
      onSaved()
      onClose()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to update.')
    }
  }

  const student = editData?.firstName ?? ''
  const rollNumber = editData?.rollNumber ?? ''
  const company = editData?.companyname ?? ''

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">Interview</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1 max-h-[75vh] overflow-y-auto pr-1">
          {editData && (
            <div className="rounded-lg border border-border p-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div>
                <span className="text-muted-foreground">Student Name: </span>
                <span>{student}{rollNumber ? ` (${rollNumber})` : ''}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Company: </span>
                <span>{company || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Register Date: </span>
                <span>{formatDate(editData.registeredDate)}</span>
              </div>
            </div>
          )}
          <p className="text-xs font-semibold pt-1">Interview Rounds</p>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4">
            {(
              [
                ['isCVShortlisted', 'im-cv', 'CV Shortlisted'],
                ['isClearedWritten', 'im-written', 'Cleared Written'],
                ['isClearedGD', 'im-gd', 'Cleared GD'],
                ['isClearedPreHR', 'im-preHR', 'Cleared Pre-HR'],
                ['isClearedFirstTech', 'im-tech1', 'Cleared Tech 1'],
                ['isClearedSecondTech', 'im-tech2', 'Cleared Tech 2'],
                ['isClearedThirdTech', 'im-tech3', 'Cleared Tech 3'],
                ['isClearedManagerRound', 'im-mgr', 'Cleared Manager'],
                ['isClearedHR', 'im-hr', 'Cleared HR'],
              ] as [keyof FormValues, string, string][]
            ).map(([name, id, label]) => (
              <Controller
                key={name}
                name={name}
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Checkbox id={id} checked={!!field.value} onCheckedChange={field.onChange} />
                    <label htmlFor={id} className="text-xs">{label}</label>
                  </div>
                )}
              />
            ))}
            <Controller
              name="isPlaced"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="im-placed"
                    checked={field.value}
                    onCheckedChange={(v) => {
                      const val = v === true
                      field.onChange(val)
                      if (!val) {
                        setValue('isOfferRollOut', false)
                        setValue('isJoined', false)
                      }
                    }}
                  />
                  <label htmlFor="im-placed" className="text-xs">Placed</label>
                </div>
              )}
            />
            {isPlaced && (
              <>
                <div className="space-y-0.5 col-span-2">
                  <Label className="text-xs">Offer Date</Label>
                  <Input className="h-8 text-xs" type="date" {...register('offerDate')} />
                </div>
                <Controller
                  name="isOfferRollOut"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="im-offerRoll"
                        checked={field.value}
                        onCheckedChange={(v) => {
                          const val = v === true
                          field.onChange(val)
                          if (!val) setValue('isJoined', false)
                        }}
                      />
                      <label htmlFor="im-offerRoll" className="text-xs">Offer Rolled Out</label>
                    </div>
                  )}
                />
              </>
            )}
            {isOfferRollOut && (
              <>
                <div className="space-y-0.5 col-span-2">
                  <Label className="text-xs">Joining Date</Label>
                  <Input className="h-8 text-xs" type="date" {...register('joiningDate')} />
                </div>
                <Controller
                  name="isJoined"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center gap-2">
                      <Checkbox id="im-joined" checked={field.value} onCheckedChange={field.onChange} />
                      <label htmlFor="im-joined" className="text-xs">Joined</label>
                    </div>
                  )}
                />
              </>
            )}
            {isJoined && (
              <div className="space-y-0.5 col-span-2">
                <Label className="text-xs">Joined On</Label>
                <Input className="h-8 text-xs" type="date" {...register('joinedOn')} />
              </div>
            )}
            <div className="space-y-0.5 col-span-2">
              <Label className="text-xs">Interviewer Comments</Label>
              <Input className="h-8 text-xs" {...register('interviewerComments')} />
            </div>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Checkbox id="im-isActive" checked={field.value} onCheckedChange={field.onChange} />
                  <label htmlFor="im-isActive" className="text-xs">Active</label>
                </div>
              )}
            />
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
