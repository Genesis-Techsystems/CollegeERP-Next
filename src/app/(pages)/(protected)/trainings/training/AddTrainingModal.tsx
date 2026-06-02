'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import type { PlacementTraining } from '@/types/trainings'
import type { College } from '@/types/college'
import type { GeneralMasterDetail } from '@/types/general-master'
import { listColleges } from '@/services/admin/college'
import { listGeneralDetailsByMasterId, listGeneralMasters } from '@/services/admin/general-master'
import { listActiveEmployeesByCollege } from '@/services/admin/staff-subject-mapping'
import { createTraining, updateTraining } from '@/services/trainings'

const schema = z.object({
  collegeId: z.string().min(1, 'College is required'),
  trainingTypeCatId: z.string().optional(),
  yearName: z.string().min(1, 'Year is required'),
  employeeId: z.string().optional(),
  trainingTitle: z.string().min(1, 'Training title is required'),
  trainerName: z.string().min(1, 'Trainer name is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  trainingDescription: z.string().optional(),
  trainerDetails: z.string().optional(),
  discussionPoints: z.string().optional(),
  isTrackAudience: z.boolean().optional(),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof schema>

function getDefaults(edit?: PlacementTraining | null): FormValues {
  if (edit) {
    return {
      collegeId: String(edit.collegeId),
      trainingTypeCatId: edit.trainingTypeCatId ? String(edit.trainingTypeCatId) : '',
      yearName: edit.yearName,
      employeeId: edit.employeeId ? String(edit.employeeId) : '',
      trainingTitle: edit.trainingTitle,
      trainerName: edit.trainerName,
      startDate: edit.startDate,
      endDate: edit.endDate,
      trainingDescription: edit.trainingDescription ?? '',
      trainerDetails: edit.trainerDetails ?? '',
      discussionPoints: edit.discussionPoints ?? '',
      isTrackAudience: edit.isTrackAudience ?? false,
      isActive: edit.isActive,
    }
  }
  return {
    collegeId: '',
    trainingTypeCatId: '',
    yearName: '',
    employeeId: '',
    trainingTitle: '',
    trainerName: '',
    startDate: '',
    endDate: '',
    trainingDescription: '',
    trainerDetails: '',
    discussionPoints: '',
    isTrackAudience: false,
    isActive: true,
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: PlacementTraining | null
  onSaved: () => void
}

export default function AddTrainingModal({ open, onClose, editData, onSaved }: Props) {
  const [colleges, setColleges] = useState<College[]>([])
  const [trainingTypes, setTrainingTypes] = useState<GeneralMasterDetail[]>([])
  const [employees, setEmployees] = useState<Array<{ employeeId: number; empName: string }>>([])
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
    defaultValues: getDefaults(editData),
  })

  const collegeId = watch('collegeId')

  useEffect(() => {
    if (!open) return
    listColleges().then(setColleges).catch(console.error)
    listGeneralMasters()
      .then(async (masters) => {
        const master = masters.find((m) => m.generalMasterCode === 'PLCMNTTRNGTYP')
        if (master?.generalMasterId) {
          const details = await listGeneralDetailsByMasterId(master.generalMasterId)
          setTrainingTypes(details)
        }
      })
      .catch(console.error)
  }, [open])

  useEffect(() => {
    if (collegeId) {
      listActiveEmployeesByCollege(Number(collegeId))
        .then((rows) => setEmployees(rows as Array<{ employeeId: number; empName: string }>))
        .catch(console.error)
    } else {
      setEmployees([])
    }
  }, [collegeId])

  useEffect(() => {
    reset(getDefaults(editData))
    setSubmitError(null)
  }, [open, editData, reset])

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    try {
      const payload: Partial<PlacementTraining> = {
        collegeId: Number(values.collegeId),
        trainingTypeCatId: values.trainingTypeCatId ? Number(values.trainingTypeCatId) : undefined,
        yearName: values.yearName,
        employeeId: values.employeeId ? Number(values.employeeId) : undefined,
        trainingTitle: values.trainingTitle,
        trainerName: values.trainerName,
        startDate: values.startDate,
        endDate: values.endDate,
        trainingDescription: values.trainingDescription,
        trainerDetails: values.trainerDetails,
        discussionPoints: values.discussionPoints,
        isTrackAudience: values.isTrackAudience,
        isActive: values.isActive,
      }
      if (editData) {
        await updateTraining(editData.traningId, payload)
      } else {
        await createTraining(payload)
      }
      onSaved()
      onClose()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save training')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? 'Edit Training' : 'Add Training'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <Label className="text-xs">College *</Label>
              <Controller
                name="collegeId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select college" /></SelectTrigger>
                    <SelectContent>
                      {colleges.map((c) => (
                        <SelectItem key={c.collegeId} value={String(c.collegeId)}>
                          {c.collegeName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.collegeId && <p className="text-xs text-red-500">{errors.collegeId.message}</p>}
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Training Type</Label>
              <Controller
                name="trainingTypeCatId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {trainingTypes.map((t) => (
                        <SelectItem key={t.generalDetailId} value={String(t.generalDetailId)}>
                          {t.generalDetailDisplayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <Label className="text-xs">Year *</Label>
              <Input {...register('yearName')} placeholder="e.g. 2024-25" />
              {errors.yearName && <p className="text-xs text-red-500">{errors.yearName.message}</p>}
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Incharge Employee</Label>
              <Controller
                name="employeeId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                    disabled={!collegeId || employees.length === 0}
                  >
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.employeeId} value={String(e.employeeId)}>
                          {e.empName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <Label className="text-xs">Training Title *</Label>
              <Input {...register('trainingTitle')} placeholder="Training title" />
              {errors.trainingTitle && <p className="text-xs text-red-500">{errors.trainingTitle.message}</p>}
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Trainer Name *</Label>
              <Input {...register('trainerName')} placeholder="Trainer name" />
              {errors.trainerName && <p className="text-xs text-red-500">{errors.trainerName.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <Label className="text-xs">Start Date *</Label>
              <Input type="date" {...register('startDate')} />
              {errors.startDate && <p className="text-xs text-red-500">{errors.startDate.message}</p>}
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">End Date *</Label>
              <Input type="date" {...register('endDate')} />
              {errors.endDate && <p className="text-xs text-red-500">{errors.endDate.message}</p>}
            </div>
          </div>

          <div className="space-y-0.5">
            <Label className="text-xs">Training Description</Label>
            <Textarea {...register('trainingDescription')} rows={2} placeholder="Description" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <Label className="text-xs">Trainer Details</Label>
              <Textarea {...register('trainerDetails')} rows={2} placeholder="Trainer details" />
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Discussion Points</Label>
              <Textarea {...register('discussionPoints')} rows={2} placeholder="Discussion points" />
            </div>
          </div>

          <div className="flex gap-6 pt-1">
            <Controller
              name="isTrackAudience"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                  Track Audience
                </label>
              )}
            />
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  Is Active
                </label>
              )}
            />
          </div>

          {submitError && (
            <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>
          )}

          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editData ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
