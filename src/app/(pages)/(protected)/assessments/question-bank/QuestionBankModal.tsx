'use client'

import { useEffect, useState, useRef } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ActiveStatusField } from '@/common/components/forms'
import { SearchInput } from '@/common/components/search'
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

  // Course search state
  const [courseSearch, setCourseSearch] = useState('')
  const [courses, setCourses] = useState<OnlineCourse[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const isOnlineCourse = watch('isOnlineCourse')
  const selectedCourseId = watch('onlineCourseId')
  const selectedLessonId = watch('courseLessonId')

  // Reset form on open/bank change
  useEffect(() => {
    if (open) {
      reset(getDefaults(bank))
      setSubmitError(null)
      setCourseSearch('')
      setCourses([])
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

  // Debounced course search
  useEffect(() => {
    if (!isOnlineCourse) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (!courseSearch.trim()) { setCourses([]); return }
      setSearching(true)
      try {
        const results = await searchCourses(courseSearch)
        setCourses(results)
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [courseSearch, isOnlineCourse])

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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Question Bank' : 'Add Question Bank'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="assessmentName">Name *</Label>
            <Input id="assessmentName" {...register('assessmentName')} placeholder="e.g. Mathematics Unit 1" />
            {errors.assessmentName && (
              <p className="text-xs text-red-500">{errors.assessmentName.message}</p>
            )}
          </div>

          {/* Number */}
          <div className="space-y-1">
            <Label htmlFor="assessmentNo">Assessment No *</Label>
            <Input
              id="assessmentNo"
              type="number"
              {...register('assessmentNo', { valueAsNumber: true })}
              placeholder="e.g. 1"
            />
            {errors.assessmentNo && (
              <p className="text-xs text-red-500">{errors.assessmentNo.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="assessmentDescription">Description</Label>
            <Input
              id="assessmentDescription"
              {...register('assessmentDescription')}
              placeholder="Optional description"
            />
          </div>

          {/* Flags row */}
          <div className="flex flex-wrap gap-6">
            <Controller
              name="isPublic"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    id="isPublic"
                  />
                  <span>Public</span>
                </label>
              )}
            />

            <Controller
              name="isOnlineCourse"
              control={control}
              render={({ field }) => (
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(v) => {
                      field.onChange(v)
                      if (!v) {
                        setValue('onlineCourseId', null)
                        setValue('courseLessonId', null)
                        setValue('courseLessonTopicId', null)
                        setCourses([])
                        setLessons([])
                        setTopics([])
                      }
                    }}
                    id="isOnlineCourse"
                  />
                  <span>Link to Online Course</span>
                </label>
              )}
            />
          </div>

          {/* Course cascade — only when isOnlineCourse is checked */}
          {isOnlineCourse && (
            <div className="space-y-3 rounded-md border p-3">
              {/* Course search */}
              <div className="space-y-1">
                <Label>Course</Label>
                <SearchInput
                  placeholder="Search course…"
                  value={courseSearch}
                  onChange={setCourseSearch}
                  serverSearch
                />
                {searching && (
                  <p className="text-xs text-muted-foreground">Searching…</p>
                )}
                {courses.length > 0 && (
                  <Controller
                    name="onlineCourseId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ? String(field.value) : ''}
                        onValueChange={(v) => field.onChange(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select course" />
                        </SelectTrigger>
                        <SelectContent>
                          {courses.map((c) => (
                            <SelectItem key={c.onlineCourseId} value={String(c.onlineCourseId)}>
                              {c.onlineCourseName} ({c.onlineCourseCode})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </div>

              {/* Lesson — shown when a course is selected */}
              {lessons.length > 0 && (
                <div className="space-y-1">
                  <Label>Lesson</Label>
                  <Controller
                    name="courseLessonId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ? String(field.value) : ''}
                        onValueChange={(v) => field.onChange(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select lesson" />
                        </SelectTrigger>
                        <SelectContent>
                          {lessons.map((l) => (
                            <SelectItem key={l.courseLessonId} value={String(l.courseLessonId)}>
                              {l.lessonName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}

              {/* Topic — shown when a lesson is selected */}
              {topics.length > 0 && (
                <div className="space-y-1">
                  <Label>Topic</Label>
                  <Controller
                    name="courseLessonTopicId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value ? String(field.value) : ''}
                        onValueChange={(v) => field.onChange(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select topic" />
                        </SelectTrigger>
                        <SelectContent>
                          {topics.map((t) => (
                            <SelectItem
                              key={t.courseLessonTopicId}
                              value={String(t.courseLessonTopicId)}
                            >
                              {t.topicName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}
            </div>
          )}

          {/* Active / Reason */}
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch('reason') ?? ''}
                onActiveChange={field.onChange}
                onReasonChange={(v) => setValue('reason', v)}
                reasonError={errors.reason?.message}
              />
            )}
          />

          {submitError && (
            <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEditing ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
