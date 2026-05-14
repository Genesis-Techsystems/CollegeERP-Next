'use client'

import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select } from '@/common/components/select'
import { createTest, searchCourses, updateTest } from '@/services/admin/question-bank'
import type { Assessment, CourseLesson, CourseLessonTopic, OnlineCourse } from '@/types/question-bank'

const schema = z.object({
  testType: z.enum(['practice', 'certification']),
  assessmentName: z.string().min(1, 'Test Name is required'),
  assessmentNo: z.number({ error: 'Test No. is required' }).min(0),
  assessmentDescription: z.string().optional(),
  onlineCourseId: z.number().nullable(),
  courseLessonId: z.number().nullable(),
  courseLessonTopicId: z.number().nullable(),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  test: Assessment | null
  onSaved: () => void
  userId: number
}

function defaults(test: Assessment | null): FormValues {
  return {
    testType: test?.isCertification ? 'certification' : 'practice',
    assessmentName: test?.assessmentName ?? '',
    assessmentNo: test?.assessmentNo ?? 0,
    assessmentDescription: test?.assessmentDescription ?? '',
    onlineCourseId: test?.onlineCourseId ?? null,
    courseLessonId: test?.courseLessonId ?? null,
    courseLessonTopicId: test?.courseLessonTopicId ?? null,
    isActive: test?.isActive ?? true,
  }
}

export default function TestModal({ open, onClose, test, onSaved, userId }: Props) {
  const isEditing = test !== null
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [courses, setCourses] = useState<OnlineCourse[]>([])
  const [lessons, setLessons] = useState<CourseLesson[]>([])
  const [topics, setTopics] = useState<CourseLessonTopic[]>([])

  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    register,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults(null),
  })

  const selectedCourseId = watch('onlineCourseId')
  const selectedLessonId = watch('courseLessonId')

  useEffect(() => {
    if (!open) return
    reset(defaults(test))
    setSubmitError(null)
    searchCourses('')
      .then((rows) => setCourses(rows))
      .catch(() => setCourses([]))
  }, [open, reset, test])

  useEffect(() => {
    if (!selectedCourseId) {
      setLessons([])
      setTopics([])
      return
    }
    const course = courses.find((c) => c.onlineCourseId === selectedCourseId)
    setLessons(course?.courseLessonDTOs ?? [])
    setValue('courseLessonId', null)
    setValue('courseLessonTopicId', null)
    setTopics([])
  }, [selectedCourseId, courses, setValue])

  useEffect(() => {
    if (!selectedLessonId) {
      setTopics([])
      return
    }
    const lesson = lessons.find((l) => l.courseLessonId === selectedLessonId)
    setTopics(lesson?.courseLessonTopicDTOs ?? [])
    setValue('courseLessonTopicId', null)
  }, [selectedLessonId, lessons, setValue])

  const onSubmit = async (data: FormValues) => {
    try {
      setSubmitError(null)
      const payload: Omit<Assessment, 'assessmentId' | 'assessmentQuestionDTOs'> = {
        assessmentName: data.assessmentName,
        assessmentNo: data.assessmentNo,
        assessmentDescription: data.assessmentDescription ?? '',
        isActive: data.isActive,
        isForQuestionbank: false,
        isForPractice: data.testType === 'practice',
        isCertification: data.testType === 'certification',
        isPublic: true,
        isOnlineCourse: Boolean(data.onlineCourseId),
        onlineCourseId: data.onlineCourseId,
        courseLessonId: data.courseLessonId,
        courseLessonTopicId: data.courseLessonTopicId,
        userId,
        preparedbyUserId: userId,
      }
      if (isEditing && test) {
        await updateTest(test.assessmentId, payload)
      } else {
        await createTest(payload)
      }
      onSaved()
      onClose()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save test')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-5xl overflow-hidden border-slate-200 bg-slate-100 p-0">
        <DialogHeader className="border-b border-amber-300 bg-white pt-8 pb-3 pl-[48px] pr-6">
          <DialogTitle className="text-base font-semibold text-teal-600">
            {isEditing ? 'Edit Test' : 'Create Test'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-6 py-5">
          <div className="max-w-sm">
            <Controller
              name="testType"
              control={control}
              render={({ field }) => (
                <Select
                  label="Test Type"
                  value={field.value}
                  onChange={(v) => field.onChange(v ?? 'practice')}
                  options={[
                    { value: 'practice', label: 'For Practice' },
                    { value: 'certification', label: 'For Certification' },
                  ]}
                  className="[&_button[role='combobox']]:h-11 [&_button[role='combobox']]:rounded-md"
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="space-y-1 md:col-span-8">
              <Label htmlFor="assessmentName">Test Name *</Label>
              <Input id="assessmentName" {...register('assessmentName')} className="h-11 rounded-md border-slate-300 bg-white" />
              {errors.assessmentName && <p className="text-xs text-red-500">{errors.assessmentName.message}</p>}
            </div>
            <div className="space-y-1 md:col-span-4">
              <Label htmlFor="assessmentNo">Test No. *</Label>
              <Input id="assessmentNo" type="number" {...register('assessmentNo', { valueAsNumber: true })} className="h-11 rounded-md border-slate-300 bg-white" />
              {errors.assessmentNo && <p className="text-xs text-red-500">{errors.assessmentNo.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="assessmentDescription">Description</Label>
            <Input id="assessmentDescription" {...register('assessmentDescription')} className="h-11 rounded-md border-slate-300 bg-white" />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Controller
              name="onlineCourseId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Course"
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : null)}
                  options={courses.map((c) => ({ value: String(c.onlineCourseId), label: c.onlineCourseName }))}
                  placeholder="Select course"
                />
              )}
            />
            <Controller
              name="courseLessonId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Course Lesson"
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : null)}
                  options={lessons.map((l) => ({ value: String(l.courseLessonId), label: l.lessonName }))}
                  placeholder="Select lesson"
                />
              )}
            />
            <Controller
              name="courseLessonTopicId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Course Lesson Topic"
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : null)}
                  options={topics.map((t) => ({ value: String(t.courseLessonTopicId), label: t.topicName }))}
                  placeholder="Select topic"
                />
              )}
            />
          </div>

          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                <span>Active</span>
              </label>
            )}
          />

          {submitError && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{submitError}</p>}

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="border-cyan-100 bg-cyan-50 text-teal-600 hover:bg-cyan-100 hover:text-teal-700">
              Close
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-[#0b3f78] hover:bg-[#0a3768]">
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

