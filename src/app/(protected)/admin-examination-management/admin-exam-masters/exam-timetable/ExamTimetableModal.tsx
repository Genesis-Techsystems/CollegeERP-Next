'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import DatePicker from '@/components/forms/DatePicker'
import { domainList, buildQuery } from '@/services/crud.service'
import { createExamTimetable, updateExamTimetable, getSubjectsForYear } from '@/services/exam-timetable.service'
import type { ExamSession } from '@/types/exam-session'
import type { ExamTimetable, ExamTimetableFormValues } from '@/types/exam-timetable'
import type { CourseYear } from '@/types/exam-master'

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  examId: z.number({ message: 'Required' }),
  subjectId: z.number({ message: 'Required' }),
  examSessionId: z.number({ message: 'Required' }),
  examDate: z.date({ message: 'Required' }).nullable(),
  courseYearId: z.number().nullable(),
  regulationId: z.number().nullable(),
  examTypeCatId: z.number().nullable(),
  isActive: z.boolean(),
  reason: z.string(),
})

type FormValues = z.infer<typeof schema>

// ─── Props ───────────────────────────────────────────────────────────────────

interface ExamTimetableModalProps {
  open: boolean
  onClose: () => void
  /** The row being edited, or null for a new row */
  row: ExamTimetable | null
  /** The currently selected exam ID */
  examId: number
  /** The currently selected course ID (drives CourseYear and Subject loads) */
  courseId: number
  onSaved: () => void
}

// ─── Modal ───────────────────────────────────────────────────────────────────

export default function ExamTimetableModal({
  open,
  onClose,
  row,
  examId,
  courseId,
  onSaved,
}: ExamTimetableModalProps) {
  const queryClient = useQueryClient()
  const isEdit = row !== null

  // ── Form ───────────────────────────────────────────────────────────────
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      examId,
      subjectId: undefined,
      examSessionId: undefined,
      examDate: null,
      courseYearId: null,
      regulationId: null,
      examTypeCatId: null,
      isActive: true,
      reason: '',
    },
  })

  const selectedCourseYearId = watch('courseYearId')

  // Populate form when editing
  useEffect(() => {
    if (row) {
      reset({
        examId: row.examId,
        subjectId: row.subjectId,
        examSessionId: row.examSessionId,
        examDate: row.examDate ? new Date(row.examDate) : null,
        courseYearId: row.courseYearId ?? null,
        regulationId: row.regulationId ?? null,
        examTypeCatId: row.examTypeCatId ?? null,
        isActive: row.isActive,
        reason: row.reason ?? '',
      })
    } else {
      reset({
        examId,
        subjectId: undefined,
        examSessionId: undefined,
        examDate: null,
        courseYearId: null,
        regulationId: null,
        examTypeCatId: null,
        isActive: true,
        reason: '',
      })
    }
  }, [row, examId, reset])

  // ── Reference Data ─────────────────────────────────────────────────────

  // Exam Sessions
  const { data: examSessions = [] } = useQuery({
    queryKey: ['exam-sessions-active'],
    queryFn: () =>
      domainList<ExamSession>(
        'ExamSession',
        buildQuery({ isActive: true }, { field: 'examSessionName', direction: 'ASC' }),
      ),
    staleTime: 5 * 60 * 1000,
  })

  // Course Years for this course
  const { data: courseYears = [] } = useQuery({
    queryKey: ['course-years', courseId],
    queryFn: () =>
      domainList<CourseYear>(
        'CourseYear',
        buildQuery(
          { 'Course.courseId': courseId, isActive: true },
          { field: 'sortOrder', direction: 'ASC' },
        ),
      ),
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000,
  })

  // Subjects — load when course year is selected
  const { data: subjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ['subjects-for-year', selectedCourseYearId],
    queryFn: () => getSubjectsForYear(selectedCourseYearId!),
    enabled: !!selectedCourseYearId,
  })

  // ── Mutation ───────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: ExamTimetableFormValues = {
        examId: values.examId,
        subjectId: values.subjectId,
        examSessionId: values.examSessionId,
        examDate: values.examDate,
        courseYearId: values.courseYearId,
        regulationId: values.regulationId,
        examTypeCatId: values.examTypeCatId,
        isActive: values.isActive,
        reason: values.reason,
      }
      return isEdit && row
        ? updateExamTimetable(row.examTimetableId, payload)
        : createExamTimetable(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-timetable'] })
      onSaved()
      onClose()
    },
  })

  // ── Submit ─────────────────────────────────────────────────────────────
  const onSubmit = handleSubmit((values) => mutation.mutate(values))

  const isActive = watch('isActive')

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Timetable Entry' : 'Add Timetable Entry'}</DialogTitle>
          <DialogDescription>
            Schedule a subject exam with its date and session.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 py-2">
          {/* Course Year */}
          <div className="space-y-1">
            <Label htmlFor="courseYearId">Course Year</Label>
            <Controller
              name="courseYearId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value?.toString() ?? ''}
                  onValueChange={(v) => field.onChange(v ? Number(v) : null)}
                >
                  <SelectTrigger id="courseYearId">
                    <SelectValue placeholder="Select course year" />
                  </SelectTrigger>
                  <SelectContent>
                    {courseYears.map((cy) => (
                      <SelectItem key={cy.courseYearId} value={cy.courseYearId.toString()}>
                        {cy.courseYearName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Subject */}
          <div className="space-y-1">
            <Label htmlFor="subjectId">
              Subject <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="subjectId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value?.toString() ?? ''}
                  onValueChange={(v) => field.onChange(Number(v))}
                  disabled={!selectedCourseYearId || loadingSubjects}
                >
                  <SelectTrigger id="subjectId">
                    <SelectValue
                      placeholder={
                        !selectedCourseYearId
                          ? 'Select a course year first'
                          : loadingSubjects
                          ? 'Loading subjects…'
                          : 'Select subject'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((sub) => (
                      <SelectItem key={sub.subjectId} value={sub.subjectId.toString()}>
                        {sub.subjectCode} — {sub.subjectName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.subjectId && (
              <p className="text-xs text-destructive">{errors.subjectId.message}</p>
            )}
          </div>

          {/* Exam Date */}
          <div className="space-y-1">
            <Label>
              Exam Date <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="examDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Pick exam date"
                />
              )}
            />
            {errors.examDate && (
              <p className="text-xs text-destructive">{errors.examDate.message as string}</p>
            )}
          </div>

          {/* Exam Session */}
          <div className="space-y-1">
            <Label htmlFor="examSessionId">
              Exam Session <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="examSessionId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value?.toString() ?? ''}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger id="examSessionId">
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent>
                    {examSessions.map((s) => (
                      <SelectItem key={s.examSessionId} value={s.examSessionId.toString()}>
                        {s.examSessionName}
                        {s.sessionStartTime
                          ? ` (${s.sessionStartTime} – ${s.sessionEndTime})`
                          : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.examSessionId && (
              <p className="text-xs text-destructive">{errors.examSessionId.message}</p>
            )}
          </div>

          {/* Is Active */}
          <div className="flex items-center gap-2">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <input
                  id="isActive"
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="h-4 w-4 rounded border border-input"
                />
              )}
            />
            <Label htmlFor="isActive">Active</Label>
          </div>

          {/* Reason */}
          {!isActive && (
            <div className="space-y-1">
              <Label htmlFor="reason">Reason for Deactivation</Label>
              <Input id="reason" {...register('reason')} />
            </div>
          )}

          {mutation.isError && (
            <p className="text-sm text-destructive">
              {(mutation.error as Error)?.message ?? 'Save failed. Please try again.'}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
