"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/common/components/select";
import {
  createQuestionBank,
  updateQuestionBank,
  searchCourses,
} from "@/services";
import type {
  Assessment,
  OnlineCourse,
  CourseLesson,
  CourseLessonTopic,
} from "@/types/question-bank";

// ─── Schema (Angular validators: assessmentName + assessmentNo required) ──────

const schema = z.object({
  assessmentName: z.string().trim().min(1, "Question Bank Name is required"),
  assessmentNo: z
    .number({ error: "Question Bank No. is required" })
    .refine((n) => !Number.isNaN(n), "Question Bank No. is required"),
  assessmentDescription: z.string().optional(),
  isActive: z.boolean(),
  isOnlineCourse: z.boolean(),
  onlineCourseId: z.number().nullable(),
  courseLessonId: z.number().nullable(),
  courseLessonTopicId: z.number().nullable(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  bank: Assessment | null;
  onSaved: () => void;
  userId: number;
}

function getDefaults(bank: Assessment | null): FormValues {
  return {
    assessmentName: bank?.assessmentName ?? "",
    // Angular starts empty on create so required validation can fire
    assessmentNo: bank?.assessmentNo ?? (NaN as unknown as number),
    assessmentDescription: bank?.assessmentDescription ?? "",
    isActive: bank?.isActive ?? true,
    isOnlineCourse: bank?.isOnlineCourse ?? false,
    onlineCourseId: bank?.onlineCourseId ?? null,
    courseLessonId: bank?.courseLessonId ?? null,
    courseLessonTopicId: bank?.courseLessonTopicId ?? null,
  };
}

export default function QuestionBankModal({
  open,
  onClose,
  bank,
  onSaved,
  userId,
}: Props) {
  const isEditing = bank !== null;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [courses, setCourses] = useState<OnlineCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [topics, setTopics] = useState<CourseLessonTopic[]>([]);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  /** Skip clearing lesson/topic when hydrating edit form */
  const hydratingRef = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaults(null),
  });

  useEffect(() => {
    if (!open) return;

    reset(getDefaults(bank));
    setSubmitError(null);
    setCourses([]);
    setLessons([]);
    setTopics([]);
    setSubjectId(bank?.subjectId ?? null);

    // Angular edit: enteredCourse(onlineCourseName, 'view') — search by existing name
    if (bank?.onlineCourseName) {
      hydratingRef.current = true;
      setCoursesLoading(true);
      searchCourses(bank.onlineCourseName)
        .then((results) => {
          setCourses(results);
          const course = results.find(
            (c) => c.onlineCourseId === bank.onlineCourseId,
          );
          if (course) {
            setLessons(course.courseLessonDTOs ?? []);
            setSubjectId(course.subjectId ?? null);
            const lesson = (course.courseLessonDTOs ?? []).find(
              (l) => l.courseLessonId === bank.courseLessonId,
            );
            if (lesson) setTopics(lesson.courseLessonTopicDTOs ?? []);
          }
        })
        .catch(() => setCourses([]))
        .finally(() => {
          setCoursesLoading(false);
          hydratingRef.current = false;
        });
    }
  }, [open, bank, reset]);

  /** Angular: enteredCourse — API only when search length > 4 */
  const handleCourseSearch = (term: string) => {
    if (term.length <= 4) {
      if (!term) setCourses([]);
      return;
    }
    setCoursesLoading(true);
    searchCourses(term)
      .then(setCourses)
      .catch(() => setCourses([]))
      .finally(() => setCoursesLoading(false));
  };

  const onCourseChange = (onlineCourseId: number | null) => {
    setValue("onlineCourseId", onlineCourseId);
    if (!hydratingRef.current) {
      setValue("courseLessonId", null);
      setValue("courseLessonTopicId", null);
      setTopics([]);
    }
    if (onlineCourseId == null) {
      setLessons([]);
      setSubjectId(null);
      return;
    }
    const course = courses.find((c) => c.onlineCourseId === onlineCourseId);
    setLessons(course?.courseLessonDTOs ?? []);
    setSubjectId(course?.subjectId ?? null);
  };

  const onLessonChange = (courseLessonId: number | null) => {
    setValue("courseLessonId", courseLessonId);
    if (!hydratingRef.current) {
      setValue("courseLessonTopicId", null);
    }
    if (courseLessonId == null) {
      setTopics([]);
      return;
    }
    const lesson = lessons.find((l) => l.courseLessonId === courseLessonId);
    setTopics(lesson?.courseLessonTopicDTOs ?? []);
  };

  const onSubmit = async (data: FormValues) => {
    setSubmitError(null);
    try {
      if (isEditing && bank) {
        // Angular editDialog → updateQuestionBank request shape
        await updateQuestionBank({
          assessmentId: bank.assessmentId,
          assessmentDescription: data.assessmentDescription ?? "",
          assessmentName: data.assessmentName,
          assessmentNo: data.assessmentNo,
          isActive: data.isActive,
          onlineCourseId: data.onlineCourseId,
          courseLessonId: data.courseLessonId,
          courseLessonTopicId: data.courseLessonTopicId,
          isForQuestionbank: bank.isForQuestionbank ?? true,
        });
        toast.success("Question bank updated");
      } else {
        // Angular openDialog → full form value + subjectId + preparedbyUserId
        await createQuestionBank({
          assessmentName: data.assessmentName,
          assessmentNo: data.assessmentNo,
          assessmentDescription: data.assessmentDescription ?? "",
          isActive: data.isActive,
          isOnlineCourse: data.isOnlineCourse,
          isForQuestionbank: true,
          onlineCourseId: data.onlineCourseId,
          courseLessonId: data.courseLessonId,
          courseLessonTopicId: data.courseLessonTopicId,
          userId,
          preparedbyUserId: userId,
          isPublic: true,
          subjectId,
        });
        toast.success("Question bank created");
      }
      onSaved();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? "Edit Question Bank" : "Add Question Bank"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="space-y-1 md:col-span-8">
              <Label htmlFor="assessmentName">Question Bank Name *</Label>
              <Input
                id="assessmentName"
                placeholder="Question Bank Name"
                {...register("assessmentName")}
                aria-invalid={!!errors.assessmentName}
                className={
                  errors.assessmentName
                    ? "border-red-500 focus-visible:ring-red-500"
                    : undefined
                }
              />
              {errors.assessmentName && (
                <p className="text-xs text-red-500">
                  {errors.assessmentName.message}
                </p>
              )}
            </div>
            <div className="space-y-1 md:col-span-4">
              <Label htmlFor="assessmentNo">Question Bank No. *</Label>
              <Input
                id="assessmentNo"
                type="number"
                placeholder="Question Bank No."
                {...register("assessmentNo", { valueAsNumber: true })}
                aria-invalid={!!errors.assessmentNo}
                className={
                  errors.assessmentNo
                    ? "border-red-500 focus-visible:ring-red-500"
                    : undefined
                }
              />
              {errors.assessmentNo && (
                <p className="text-xs text-red-500">
                  {errors.assessmentNo.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="assessmentDescription">Description</Label>
            <textarea
              id="assessmentDescription"
              placeholder="Description"
              {...register("assessmentDescription")}
              className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
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
                  onChange={(v) => onCourseChange(v ? Number(v) : null)}
                  onSearch={handleCourseSearch}
                  isLoading={coursesLoading}
                  options={courses.map((c) => ({
                    value: String(c.onlineCourseId),
                    label: c.onlineCourseCode
                      ? `(${c.onlineCourseCode}) ${c.onlineCourseName}`
                      : c.onlineCourseName,
                  }))}
                  placeholder="Subject"
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
                  onChange={(v) => onLessonChange(v ? Number(v) : null)}
                  options={lessons.map((l) => ({
                    value: String(l.courseLessonId),
                    label: l.lessonName,
                  }))}
                  placeholder="Lesson"
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
                  placeholder="Lesson Topic"
                />
              )}
            />
          </div>

          <div className="flex flex-wrap gap-8 pt-1">
            <Controller
              name="isOnlineCourse"
              control={control}
              render={({ field }) => (
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    id="isOnlineCourse"
                  />
                  <span>Online Course</span>
                </label>
              )}
            />
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    id="isActive"
                  />
                  <span>Active</span>
                </label>
              )}
            />
          </div>

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
