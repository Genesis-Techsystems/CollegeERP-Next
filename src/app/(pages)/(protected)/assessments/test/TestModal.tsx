"use client";

import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/common/components/select";
import { createTest, searchCourses, updateTest } from "@/services";
import type {
  Assessment,
  CourseLesson,
  CourseLessonTopic,
  OnlineCourse,
} from "@/types/question-bank";

const schema = z.object({
  testType: z.enum(["1", "2"]),
  assessmentName: z.string().trim().min(1, "Test Name is required"),
  assessmentNo: z
    .number({ error: "Test No. is required" })
    .refine((n) => !Number.isNaN(n), "Test No. is required"),
  assessmentDescription: z.string().optional(),
  onlineCourseId: z.number().nullable(),
  courseLessonId: z.number().nullable(),
  courseLessonTopicId: z.number().nullable(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  test: Assessment | null;
  onSaved: () => void;
}

function getDefaults(test: Assessment | null): FormValues {
  return {
    testType: test?.isCertification ? "2" : "1",
    assessmentName: test?.assessmentName ?? "",
    assessmentNo: test?.assessmentNo ?? (NaN as unknown as number),
    assessmentDescription: test?.assessmentDescription ?? "",
    onlineCourseId: test?.onlineCourseId ?? null,
    courseLessonId: test?.courseLessonId ?? null,
    courseLessonTopicId: test?.courseLessonTopicId ?? null,
    isActive: test?.isActive ?? true,
  };
}

export default function TestModal({ open, onClose, test, onSaved }: Props) {
  const isEditing = test !== null;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [courses, setCourses] = useState<OnlineCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [topics, setTopics] = useState<CourseLessonTopic[]>([]);
  const hydratingRef = useRef(false);

  const {
    handleSubmit,
    reset,
    setValue,
    control,
    register,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: getDefaults(null),
  });

  useEffect(() => {
    if (!open) return;
    reset(getDefaults(test));
    setSubmitError(null);
    setCourses([]);
    setLessons([]);
    setTopics([]);

    if (test?.onlineCourseName) {
      hydratingRef.current = true;
      setCoursesLoading(true);
      searchCourses(test.onlineCourseName)
        .then((rows) => {
          setCourses(rows);
          const course = rows.find(
            (c) => c.onlineCourseId === test.onlineCourseId,
          );
          if (course) {
            setLessons(course.courseLessonDTOs ?? []);
            const lesson = (course.courseLessonDTOs ?? []).find(
              (l) => l.courseLessonId === test.courseLessonId,
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
  }, [open, reset, test]);

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
      return;
    }
    const course = courses.find((c) => c.onlineCourseId === onlineCourseId);
    setLessons(course?.courseLessonDTOs ?? []);
  };

  const onLessonChange = (courseLessonId: number | null) => {
    setValue("courseLessonId", courseLessonId);
    if (!hydratingRef.current) setValue("courseLessonTopicId", null);
    if (courseLessonId == null) {
      setTopics([]);
      return;
    }
    const lesson = lessons.find((l) => l.courseLessonId === courseLessonId);
    setTopics(lesson?.courseLessonTopicDTOs ?? []);
  };

  const onSubmit = async (data: FormValues) => {
    try {
      setSubmitError(null);
      const isForPractice = data.testType === "1";
      const isCertification = data.testType === "2";

      if (isEditing && test) {
        // Angular editDialog: mutate item fields then update(full item)
        await updateTest({
          ...test,
          assessmentDescription: data.assessmentDescription ?? "",
          assessmentName: data.assessmentName,
          assessmentNo: data.assessmentNo,
          isCertification,
          isForPractice,
          isActive: data.isActive,
          isForQuestionbank: false,
          onlineCourseId: data.onlineCourseId,
          courseLessonId: data.courseLessonId,
          courseLessonTopicId: data.courseLessonTopicId,
        });
        toast.success("Test updated");
      } else {
        // Angular create: form value (incl. testType) + isCertification / isForPractice
        await createTest({
          assessmentName: data.assessmentName,
          assessmentNo: data.assessmentNo,
          assessmentDescription: data.assessmentDescription ?? "",
          isActive: data.isActive,
          onlineCourseId: data.onlineCourseId,
          courseLessonId: data.courseLessonId,
          courseLessonTopicId: data.courseLessonTopicId,
          testType: Number(data.testType),
          isForPractice,
          isCertification,
          isForQuestionbank: false,
        });
        toast.success("Test created");
      }
      onSaved();
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to save test",
      );
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
            {isEditing ? "Edit Test" : "Create Test"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
          <Controller
            name="testType"
            control={control}
            render={({ field }) => (
              <Select
                label="Test Type"
                value={field.value}
                onChange={(v) => field.onChange(v ?? "1")}
                options={[
                  { value: "1", label: "For Practice" },
                  { value: "2", label: "For Certification" },
                ]}
              />
            )}
          />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="space-y-1 md:col-span-8">
              <Label htmlFor="assessmentName">Test Name *</Label>
              <Input
                id="assessmentName"
                placeholder="Test Name"
                {...register("assessmentName")}
                aria-invalid={!!errors.assessmentName}
                className={errors.assessmentName ? "border-red-500" : undefined}
              />
              {errors.assessmentName && (
                <p className="text-xs text-red-500">
                  {errors.assessmentName.message}
                </p>
              )}
            </div>
            <div className="space-y-1 md:col-span-4">
              <Label htmlFor="assessmentNo">Test No. *</Label>
              <Input
                id="assessmentNo"
                type="number"
                placeholder="Test No."
                {...register("assessmentNo", { valueAsNumber: true })}
                aria-invalid={!!errors.assessmentNo}
                className={errors.assessmentNo ? "border-red-500" : undefined}
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
                  label="Course"
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => onCourseChange(v ? Number(v) : null)}
                  onSearch={handleCourseSearch}
                  isLoading={coursesLoading}
                  options={courses.map((c) => ({
                    value: String(c.onlineCourseId),
                    label: c.onlineCourseName,
                  }))}
                  placeholder="Course"
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
                  onChange={(v) => onLessonChange(v ? Number(v) : null)}
                  options={lessons.map((l) => ({
                    value: String(l.courseLessonId),
                    label: l.lessonName,
                  }))}
                  placeholder="Course Lesson"
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
                  options={topics.map((t) => ({
                    value: String(t.courseLessonTopicId),
                    label: t.topicName,
                  }))}
                  placeholder="Course Lesson Topic"
                />
              )}
            />
          </div>

          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <span>Active</span>
              </label>
            )}
          />

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Close
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
