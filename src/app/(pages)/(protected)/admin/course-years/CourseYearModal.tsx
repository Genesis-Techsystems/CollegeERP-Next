"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ActiveStatusField } from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCourseYear,
  listActiveCoursesByUniversityForYear,
  listActiveUniversities,
  updateCourseYear,
} from "@/services";
import type { Course } from "@/types/course";
import type { CourseYear } from "@/types/course-year";
import type { University } from "@/types/university";

/** Coerce empty optional number inputs to undefined (Angular allows blank). */
const optionalNumber = z.preprocess(
  (v) =>
    v === "" || v == null || (typeof v === "number" && Number.isNaN(v))
      ? undefined
      : v,
  z.coerce.number().optional(),
);

const schema = z.object({
  universityId: z.number().min(1, "University is required"),
  courseId: z.number().min(1, "Course is required"),
  courseYearName: z.string().min(1, "Semester name is required"),
  courseYearCode: z.string().optional(),
  yearNo: z.coerce.number().min(1, "Year number is required"),
  semNo: optionalNumber,
  feeLabel: z.string().optional(),
  sortOrder: optionalNumber,
  minFeePercent: optionalNumber,
  isFeeYear: z.boolean(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function CourseYearModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  row: CourseYear | null;
  onSaved: () => void;
}>) {
  const isEditing = Boolean(row);
  const [universities, setUniversities] = useState<University[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      universityId: undefined,
      courseId: undefined,
      courseYearName: "",
      courseYearCode: "",
      yearNo: undefined,
      semNo: undefined,
      feeLabel: "",
      sortOrder: undefined,
      minFeePercent: undefined,
      isFeeYear: false,
      isActive: true,
      reason: "active",
    },
  });
  const selectedUniversityId = watch("universityId");

  useEffect(() => {
    if (open)
      listActiveUniversities().then(setUniversities).catch(console.error);
  }, [open]);
  useEffect(() => {
    if (selectedUniversityId) {
      listActiveCoursesByUniversityForYear(selectedUniversityId)
        .then(setCourses)
        .catch(console.error);
    } else {
      setCourses([]);
    }
  }, [selectedUniversityId]);
  useEffect(() => {
    if (row) {
      reset({
        universityId: row.universityId,
        courseId: row.courseId,
        courseYearName: row.courseYearName ?? "",
        courseYearCode: row.courseYearCode ?? "",
        yearNo: row.yearNo ?? 1,
        semNo: row.semNo,
        feeLabel: row.feeLabel ?? "",
        sortOrder: row.sortOrder,
        minFeePercent: row.minFeePercent,
        isFeeYear: Boolean(row.isFeeYear),
        isActive: row.isActive,
        reason: row.reason ?? "",
      });
    } else {
      reset({
        universityId: undefined,
        courseId: undefined,
        courseYearName: "",
        courseYearCode: "",
        yearNo: undefined,
        semNo: undefined,
        feeLabel: "",
        sortOrder: undefined,
        minFeePercent: undefined,
        isFeeYear: false,
        isActive: true,
        reason: "active",
      });
    }
    setSubmitError(null);
  }, [row, open, reset]);

  async function onSubmit(data: FormValues) {
    setSubmitError(null);
    try {
      if (isEditing) await updateCourseYear(row!.courseYearId, data, row!);
      else await createCourseYear(data);
      onSaved();
      onClose();
    } catch (e: unknown) {
      setSubmitError(
        e instanceof Error ? e.message : "Failed to save semester",
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(n) => {
        if (!n) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? "Edit Semester" : "Add Semester"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Controller
              name="universityId"
              control={control}
              render={({ field }) => (
                <Select
                  label="University"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => {
                    field.onChange(v ? Number(v) : undefined);
                    setValue("courseId", undefined as unknown as number);
                  }}
                  options={universities.map((u) => ({
                    value: String(u.universityId),
                    label: u.universityCode ?? u.universityName,
                  }))}
                  placeholder="Select university"
                  searchable
                  error={errors.universityId?.message}
                />
              )}
            />
            <Controller
              name="courseId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Course"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={courses.map((c) => ({
                    value: String(c.courseId),
                    label: `${c.courseName}${c.courseCode ? ` (${c.courseCode})` : ""}`,
                  }))}
                  placeholder="Select course"
                  searchable
                  error={errors.courseId?.message}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <Label htmlFor="cyn">Semester Name *</Label>
              <Input id="cyn" {...register("courseYearName")} />
              {errors.courseYearName && (
                <p className="text-xs text-red-500">
                  {errors.courseYearName.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="cyc">Semester Code</Label>
              <Input id="cyc" {...register("courseYearCode")} />
              {errors.courseYearCode && (
                <p className="text-xs text-red-500">
                  {errors.courseYearCode.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="yno">Year Number *</Label>
              <Input id="yno" type="number" min={1} {...register("yearNo")} />
              {errors.yearNo && (
                <p className="text-xs text-red-500">{errors.yearNo.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <Label htmlFor="semNo">Semester Number</Label>
              <Input id="semNo" type="number" {...register("semNo")} />
              {errors.semNo && (
                <p className="text-xs text-red-500">{errors.semNo.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="feeLabel">Fee Label</Label>
              <Input id="feeLabel" {...register("feeLabel")} />
            </div>
            <div>
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                min={0}
                {...register("sortOrder")}
              />
              {errors.sortOrder && (
                <p className="text-xs text-red-500">
                  {errors.sortOrder.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
            <div>
              <Label htmlFor="minFeePercent">Min Fee Percent</Label>
              <Input
                id="minFeePercent"
                type="number"
                {...register("minFeePercent")}
              />
              {errors.minFeePercent && (
                <p className="text-xs text-red-500">
                  {errors.minFeePercent.message}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Controller
                name="isFeeYear"
                control={control}
                render={({ field }) => (
                  <>
                    <Checkbox
                      id="isFeeYear"
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        field.onChange(Boolean(checked))
                      }
                    />
                    <Label htmlFor="isFeeYear">Is Fee Year</Label>
                  </>
                )}
              />
            </div>
            <div className="pb-1">
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <ActiveStatusField
                    isActive={field.value}
                    reason={watch("reason") ?? ""}
                    onActiveChange={field.onChange}
                    onReasonChange={(v) => setValue("reason", v)}
                    reasonError={errors.reason?.message}
                  />
                )}
              />
            </div>
          </div>

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <DialogFooter className="pt-1">
            <Button variant="outline" type="button" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
