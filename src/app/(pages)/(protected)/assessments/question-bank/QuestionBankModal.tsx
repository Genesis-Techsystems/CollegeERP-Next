'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select } from '@/common/components/select'
import { createQuestionBank, updateQuestionBank, searchCourses } from '@/services/admin/question-bank'
import type { Assessment, OnlineCourse, CourseLesson, CourseLessonTopic } from '@/types/question-bank'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  assessmentName: z.string().min(1, 'Name is required'),
  assessmentNo: z.number({ error: 'Number is required' }).min(0),
  assessmentDescription: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
  isPublic: z.boolean(),
  isOnlineCourse: z.boolean(),
  onlineCourseId: z.number().nullable(),
  courseLessonId: z.number().nullable(),
  courseLessonTopicId: z.number().nullable(),
})

type FormValues = z.infer<typeof schema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  bank: Assessment | null
  onSaved: () => void
  userId: number
}

function getDefaults(bank: Assessment | null): FormValues {
  return {
    assessmentName: bank?.assessmentName ?? '',
    assessmentNo: bank?.assessmentNo ?? 0,
    assessmentDescription: bank?.assessmentDescription ?? '',
    isActive: bank?.isActive ?? true,
    reason: bank?.reason ?? '',
    isPublic: bank?.isPublic ?? true,
    isOnlineCourse: bank?.isOnlineCourse ?? false,
    onlineCourseId: bank?.onlineCourseId ?? null,
    courseLessonId: bank?.courseLessonId ?? null,
    courseLessonTopicId: bank?.courseLessonTopicId ?? null,
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function QuestionBankModal({ open, onClose, bank, onSaved, userId }: Props) {
  const isEditing = bank !== null
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [courses, setCourses] = useState<OnlineCourse[]>([])

  // Cascaded dropdown data
  const [lessons, setLessons] = useState<CourseLesson[]>([])
  const [topics, setTopics] = useState<CourseLessonTopic[]>([])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaults(null),
  })

  const selectedCourseId = watch('onlineCourseId')
  const selectedLessonId = watch('courseLessonId')

  // Reset form on open/bank change
  useEffect(() => {
    if (open) {
      reset(getDefaults(bank))
      setSubmitError(null)
      searchCourses('')
        .then((results) => setCourses(results))
        .catch(() => setCourses([]))
      setLessons([])
      setTopics([])

      // Pre-populate course cascade when editing
      if (bank?.isOnlineCourse && bank.onlineCourseId) {
        searchCourses('').then((results) => {
          setCourses(results)
          const course = results.find((c) => c.onlineCourseId === bank.onlineCourseId)
          if (course) {
            setLessons(course.courseLessonDTOs)
            const lesson = course.courseLessonDTOs.find(
              (l) => l.courseLessonId === bank.courseLessonId,
            )
            if (lesson) setTopics(lesson.courseLessonTopicDTOs)
          }
        })
      }
    }
  }, [open, bank, reset])

  // Populate lessons when course changes
  useEffect(() => {
    if (!selectedCourseId) { setLessons([]); setTopics([]); return }
    const course = courses.find((c) => c.onlineCourseId === selectedCourseId)
    setLessons(course?.courseLessonDTOs ?? [])
    setValue('courseLessonId', null)
    setValue('courseLessonTopicId', null)
    setTopics([])
  }, [selectedCourseId, courses, setValue])

  // Populate topics when lesson changes
  useEffect(() => {
    if (!selectedLessonId) { setTopics([]); return }
    const lesson = lessons.find((l) => l.courseLessonId === selectedLessonId)
    setTopics(lesson?.courseLessonTopicDTOs ?? [])
    setValue('courseLessonTopicId', null)
  }, [selectedLessonId, lessons, setValue])

  const onSubmit = async (data: FormValues) => {
    setSubmitError(null)
    try {
      const payload = {
        ...data,
        assessmentNo: data.assessmentNo as number,
        isForQuestionbank: true,
        userId,
        preparedbyUserId: userId,
      }
      if (isEditing) {
        await updateQuestionBank(bank!.assessmentId, payload)
      } else {
        await createQuestionBank(payload as Omit<Assessment, 'assessmentId' | 'assessmentQuestionDTOs'>)
      }
      onSaved()
      onClose()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden border-slate-200 bg-slate-100 p-0">
        <DialogHeader className="border-b border-amber-300 bg-white pt-8 pb-3 pl-[48px] pr-6">
          <DialogTitle className="text-base font-semibold text-teal-600">
            {isEditing ? 'Edit Question Bank' : 'Add Question Bank'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-6 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="space-y-1 md:col-span-8">
              <Label htmlFor="assessmentName" className="text-sm text-slate-700">Question Bank Name *</Label>
              <Input id="assessmentName" {...register('assessmentName')} className="h-11 rounded-md border-slate-300 bg-white" />
              {errors.assessmentName && (
                <p className="text-xs text-red-500">{errors.assessmentName.message}</p>
              )}
            </div>
            <div className="space-y-1 md:col-span-4">
              <Label htmlFor="assessmentNo" className="text-sm text-slate-500">Question Bank No. *</Label>
              <Input
                id="assessmentNo"
                type="number"
                {...register('assessmentNo', { valueAsNumber: true })}
                className="h-11 rounded-md border-slate-300 bg-white"
              />
            {errors.assessmentNo && (
              <p className="text-xs text-red-500">{errors.assessmentNo.message}</p>
            )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="assessmentDescription" className="text-sm text-slate-500">Description</Label>
            <Input
              id="assessmentDescription"
              {...register('assessmentDescription')}
              className="h-11 rounded-md border-slate-300 bg-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Controller
              name="onlineCourseId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Subject"
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : null)}
                  options={courses.map((c) => ({
                    value: String(c.onlineCourseId),
                    label: c.onlineCourseName || c.onlineCourseCode,
                  }))}
                  placeholder="Select subject"
                  className="[&_button[role='combobox']]:h-11 [&_button[role='combobox']]:rounded-md [&_button[role='combobox']]:border-slate-300"
                />
              )}
            />
            <Controller
              name="courseLessonId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Lesson"
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : null)}
                  options={lessons.map((l) => ({
                    value: String(l.courseLessonId),
                    label: l.lessonName,
                  }))}
                  placeholder="Select lesson"
                  className="[&_button[role='combobox']]:h-11 [&_button[role='combobox']]:rounded-md [&_button[role='combobox']]:border-slate-300"
                />
              )}
            />
            <Controller
              name="courseLessonTopicId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Lesson Topic"
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : null)}
                  options={topics.map((t) => ({
                    value: String(t.courseLessonTopicId),
                    label: t.topicName,
                  }))}
                  placeholder="Select lesson topic"
                  className="[&_button[role='combobox']]:h-11 [&_button[role='combobox']]:rounded-md [&_button[role='combobox']]:border-slate-300"
                />
              )}
            />
          </div>

          <div className="flex flex-wrap gap-10 pt-2">
            <Controller
              name="isOnlineCourse"
              control={control}
              render={({ field }) => (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} id="isOnlineCourse" />
                  <span>Online Course</span>
                </label>
              )}
            />
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} id="isActive" />
                  <span>Active</span>
                </label>
              )}
            />
          </div>

          {submitError && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{submitError}</p>
          )}

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="border-cyan-100 bg-cyan-50 text-teal-600 hover:bg-cyan-100 hover:text-teal-700">
              Close
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-[#0b3f78] hover:bg-[#0a3768]">
              {isSubmitting ? 'Saving…' : isEditing ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
