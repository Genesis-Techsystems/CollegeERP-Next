'use client'

import { useEffect, useState, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
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
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useSessionContext } from '@/context/SessionContext'
import { getAllRecords } from '@/services/crud.service'
import { createExamSession, updateExamSession } from '@/services/exam-session.service'
import type { ExamSession } from '@/types/exam-session'
import type { CollegeWiseFilterRow } from '@/types/exam-master'

// ─── Filter result types ────────────────────────────────────────────────────

interface GeneralDetailRow {
  generalDetailId: number
  generalDetailCode: string
  generalDetailName: string
  gm_code?: string
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z
  .object({
    examSessionName: z.string().min(1, 'Session name is required'),
    sessionStartTime: z.string().min(1, 'Start time is required'),
    sessionEndTime: z.string().min(1, 'End time is required'),
    universityId: z.number({ error: 'University is required' }).min(1, 'University is required'),
    examsessioninCatId: z.number().optional(),
    isActive: z.boolean(),
    reason: z.string(),
  })
  .refine(
    (data) => {
      if (!data.sessionStartTime || !data.sessionEndTime) return true
      return data.sessionEndTime > data.sessionStartTime
    },
    {
      message: 'End time must be after start time',
      path: ['sessionEndTime'],
    }
  )

type FormValues = z.infer<typeof schema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface ExamSessionModalProps {
  open: boolean
  onClose: () => void
  editData: ExamSession | null
  onSuccess: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalise "HH:mm:ss" → "HH:mm" for the HTML time input */
function toTimeInput(val: string | undefined | null): string {
  if (!val) return ''
  // Spring Boot returns "HH:mm:ss" — trim to "HH:mm"
  return val.slice(0, 5)
}

function getDefaults(session: ExamSession | null): FormValues {
  if (session) {
    return {
      examSessionName: session.examSessionName,
      sessionStartTime: toTimeInput(session.sessionStartTime),
      sessionEndTime: toTimeInput(session.sessionEndTime),
      universityId: session.universityId ?? 0,
      examsessioninCatId: session.examsessioninCatId,
      isActive: session.isActive,
      reason: session.reason ?? 'active',
    }
  }
  return {
    examSessionName: '',
    sessionStartTime: '',
    sessionEndTime: '',
    universityId: 0,
    examsessioninCatId: undefined,
    isActive: true,
    reason: 'active',
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ExamSessionModal({
  open,
  onClose,
  editData,
  onSuccess,
}: ExamSessionModalProps) {
  const isEdit = editData !== null
  const queryClient = useQueryClient()
  const { user } = useSessionContext()

  const [formError, setFormError] = useState<string | null>(null)

  const orgId = user?.organizationId ?? 0
  const empId = user?.employeeId ?? 0

  // ── Fetch filter data (universities + session-in categories) ──────────
  const { data: filterData } = useQuery({
    queryKey: ['exam-session-filters', orgId, empId],
    queryFn: () =>
      getAllRecords<{ result: unknown[][] }>(
        's_get_collegewisedetails_bycode',
        {
          in_flag: 'clg_filters,gm_codes',
          in_gm_codes: 'EXMSESN',
          in_org_id: orgId,
          in_college_id: 0,
          in_course_id: 0,
          in_course_group_id: 0,
          in_course_year_id: 0,
          in_group_section_id: 0,
          in_academic_year_id: 0,
          in_dept_id: 0,
          in_isadmin: 0,
          in_loginuser_empid: empId,
          in_loginuser_roleid: 0,
          in_subject: '',
          in_employee: '',
        },
      ),
    enabled: open && !!user,
  })

  const { universities, sessionsIn } = useMemo(() => {
    const result = filterData?.result ?? []
    let universities: CollegeWiseFilterRow[] = []
    let sessionsIn: GeneralDetailRow[] = []

    for (const arr of result) {
      if (!Array.isArray(arr) || arr.length === 0) continue
      const first = arr[0] as Record<string, unknown>
      if (first.flag === 'clg_filters') {
        universities = arr as unknown as CollegeWiseFilterRow[]
      }
      if (first.gm_code === 'EXMSESN') {
        sessionsIn = arr as unknown as GeneralDetailRow[]
      }
    }

    return { universities, sessionsIn }
  }, [filterData])

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaults(editData),
  })

  // Reset form when modal opens or editData changes
  useEffect(() => {
    if (open) {
      reset(getDefaults(editData))
      setFormError(null)
    }
  }, [open, editData, reset])

  const isActive = watch('isActive')

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      // Append :00 to produce HH:mm:ss format expected by Spring Boot
      const payload = {
        ...values,
        sessionStartTime: values.sessionStartTime + ':00',
        sessionEndTime: values.sessionEndTime + ':00',
      }
      if (isEdit) {
        return updateExamSession(editData!.examSessionId, payload)
      }
      return createExamSession(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-sessions'] })
      onSuccess()
      onClose()
    },
    onError: (err: Error) => {
      setFormError(err.message || 'Something went wrong')
    },
  })

  function onSubmit(values: FormValues) {
    setFormError(null)
    mutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Exam Session' : 'Add Exam Session'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the exam session details.'
              : 'Create a new exam time slot.'}
          </DialogDescription>
        </DialogHeader>

        {formError && (
          <div className="rounded-md px-3 py-2 text-sm bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))] border border-[hsl(var(--destructive)/0.3)]">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* University */}
          <div className="space-y-1.5">
            <Label>
              University <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={control}
              name="universityId"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : undefined}
                  onValueChange={(val) => field.onChange(Number(val))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select university" />
                  </SelectTrigger>
                  <SelectContent>
                    {universities.map((u) => (
                      <SelectItem
                        key={u.fk_university_id}
                        value={String(u.fk_university_id)}
                      >
                        {u.university_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.universityId && (
              <p className="text-xs text-destructive">{errors.universityId.message}</p>
            )}
          </div>

          {/* Session Name */}
          <div className="space-y-1.5">
            <Label>
              Session Name <span className="text-destructive">*</span>
            </Label>
            <Input
              {...register('examSessionName')}
              placeholder="e.g. Morning Session"
            />
            {errors.examSessionName && (
              <p className="text-xs text-destructive">{errors.examSessionName.message}</p>
            )}
          </div>

          {/* Session In (category) */}
          <div className="space-y-1.5">
            <Label>Session In</Label>
            <Controller
              control={control}
              name="examsessioninCatId"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : undefined}
                  onValueChange={(val) => field.onChange(Number(val))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select session category" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessionsIn.map((s) => (
                      <SelectItem
                        key={s.generalDetailId}
                        value={String(s.generalDetailId)}
                      >
                        {s.generalDetailName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.examsessioninCatId && (
              <p className="text-xs text-destructive">{errors.examsessioninCatId.message}</p>
            )}
          </div>

          {/* Start Time | End Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>
                Start Time <span className="text-destructive">*</span>
              </Label>
              <Input
                {...register('sessionStartTime')}
                type="time"
              />
              {errors.sessionStartTime && (
                <p className="text-xs text-destructive">{errors.sessionStartTime.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>
                End Time <span className="text-destructive">*</span>
              </Label>
              <Input
                {...register('sessionEndTime')}
                type="time"
              />
              {errors.sessionEndTime && (
                <p className="text-xs text-destructive">{errors.sessionEndTime.message}</p>
              )}
            </div>
          </div>

          {/* Is Active + optional Reason */}
          <div className="grid grid-cols-2 gap-4 items-start">
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox id="isActive" checked={field.value} onCheckedChange={field.onChange} />
                  <Label htmlFor="isActive" className="cursor-pointer">Is Active</Label>
                </div>
              )}
            />
            {!isActive && (
              <div className="space-y-1.5">
                <Label>Reason</Label>
                <Input
                  {...register('reason')}
                  placeholder="Reason for deactivation"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
