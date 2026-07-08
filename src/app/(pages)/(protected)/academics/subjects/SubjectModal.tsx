"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormModal } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { ActiveStatusField } from "@/common/components/forms";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createSubject,
  isDuplicateSubject,
  listActiveCoursesByUniversity,
  listActiveUniversities,
  listSubjectCategories,
  listSubjectTypes,
  updateSubject,
} from "@/services";

type AnyRow = Record<string, any>;

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const key of keys) {
    const n = Number(row[key] ?? 0);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function pickStr(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" || typeof v === "boolean") return String(v);
  }
  return "";
}

const schema = z
  .object({
    universityId: z.number().min(1, "University is required"),
    courseId: z.number().min(1, "Course is required"),
    subjectName: z.string().trim().min(1, "Subject name is required"),
    subjectCode: z.string().trim().min(1, "Subject code is required"),
    subjectTypeId: z.number().min(1, "Subject type is required"),
    subjectCategoryId: z.number().min(1, "Subject category is required"),
    subCredits: z.string().optional(),
    subCreditHrs: z.string().optional(),
    shortName: z.string().trim().min(1, "Short name is required"),
    orderNo: z.string().optional(),
    isLanguage: z.boolean(),
    isActive: z.boolean(),
    reason: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (!v.isActive && !v.reason?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Reason is required when inactive",
        path: ["reason"],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

interface SubjectModalProps {
  open: boolean;
  onClose: () => void;
  row?: AnyRow | null;
  universityId?: number;
  courseId?: number;
  existingRows?: AnyRow[];
  onSaved?: () => void;
}

export default function SubjectModal({
  open,
  onClose,
  row,
  universityId: initialUniversityId,
  courseId: initialCourseId,
  existingRows = [],
  onSaved,
}: SubjectModalProps) {
  const isEdit = Boolean(row?.subjectId);
  const [universities, setUniversities] = useState<AnyRow[]>([]);
  const [courses, setCourses] = useState<AnyRow[]>([]);
  const [types, setTypes] = useState<AnyRow[]>([]);
  const [categories, setCategories] = useState<AnyRow[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      universityId: 0,
      courseId: 0,
      subjectName: "",
      subjectCode: "",
      subjectTypeId: 0,
      subjectCategoryId: 0,
      subCredits: "",
      subCreditHrs: "",
      shortName: "",
      orderNo: "",
      isLanguage: false,
      isActive: true,
      reason: "active",
    },
  });

  const watchUniversityId = form.watch("universityId");
  const watchIsActive = form.watch("isActive");

  const universityOptions = useMemo(
    () =>
      universities.map((x) => ({
        value: String(pickNum(x, ["universityId", "pk_university_id"])),
        label: pickStr(x, ["universityCode", "universityName"]) || "University",
      })),
    [universities],
  );

  const courseOptions = useMemo(
    () =>
      courses.map((x) => ({
        value: String(pickNum(x, ["courseId", "pk_course_id"])),
        label: pickStr(x, ["courseCode", "courseName"]) || "Course",
      })),
    [courses],
  );

  const typeOptions = useMemo(
    () =>
      types.map((x) => ({
        value: String(pickNum(x, ["generalDetailId", "pk_general_detail_id"])),
        label: pickStr(x, ["generalDetailName", "generalDetailCode"]) || "Type",
      })),
    [types],
  );

  const categoryOptions = useMemo(
    () =>
      categories.map((x) => ({
        value: String(pickNum(x, ["generalDetailId", "pk_general_detail_id"])),
        label:
          pickStr(x, ["generalDetailName", "generalDetailCode"]) || "Category",
      })),
    [categories],
  );

  useEffect(() => {
    if (!open) return;
    setError("");
    setLoadingLookups(true);
    Promise.all([
      listActiveUniversities(),
      listSubjectTypes(),
      listSubjectCategories(),
    ])
      .then(([univList, typeList, categoryList]) => {
        setUniversities(univList);
        setTypes(typeList);
        setCategories(categoryList);
      })
      .catch(() => {
        setUniversities([]);
        setTypes([]);
        setCategories([]);
      })
      .finally(() => setLoadingLookups(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const rowUniversityId =
      pickNum(row, ["universityId", "fk_university_id"]) ||
      pickNum(row?.course, ["universityId", "fk_university_id"]) ||
      initialUniversityId ||
      0;
    const rowCourseId =
      pickNum(row, ["courseId", "fk_course_id"]) || initialCourseId || 0;

    form.reset({
      universityId: rowUniversityId,
      courseId: rowCourseId,
      subjectName: pickStr(row, ["subjectName"]),
      subjectCode: pickStr(row, ["subjectCode"]),
      subjectTypeId: pickNum(row, ["subjectTypeId", "fk_subject_type_id"]),
      subjectCategoryId: pickNum(row, [
        "subjectCategoryId",
        "fk_subject_category_id",
      ]),
      subCredits: row?.subCredits != null ? String(row.subCredits) : "",
      subCreditHrs: row?.subCreditHrs != null ? String(row.subCreditHrs) : "",
      shortName: pickStr(row, ["shortName"]),
      orderNo: row?.orderNo != null ? String(row.orderNo) : "",
      isLanguage: Boolean(row?.isLanguage),
      isActive: row?.isActive !== false,
      reason: row?.isActive === false ? pickStr(row, ["reason"]) : "active",
    });
  }, [open, row, initialUniversityId, initialCourseId, form]);

  useEffect(() => {
    if (!open || !watchUniversityId) {
      setCourses([]);
      if (!watchUniversityId) form.setValue("courseId", 0);
      return;
    }
    listActiveCoursesByUniversity(watchUniversityId)
      .then((list) => {
        setCourses(list);
        const currentCourseId = form.getValues("courseId");
        const hasCurrent = list.some(
          (x) => pickNum(x, ["courseId", "pk_course_id"]) === currentCourseId,
        );
        if (!hasCurrent) {
          const preferred =
            initialCourseId &&
            list.some((x) => pickNum(x, ["courseId"]) === initialCourseId)
              ? initialCourseId
              : pickNum(list[0], ["courseId", "pk_course_id"]);
          form.setValue("courseId", preferred || 0);
        }
      })
      .catch(() => {
        setCourses([]);
        form.setValue("courseId", 0);
      });
  }, [open, watchUniversityId, initialCourseId, form]);

  useEffect(() => {
    if (watchIsActive) form.setValue("reason", "active");
  }, [watchIsActive, form]);

  const buildPayload = (values: FormValues): AnyRow => ({
    universityId: values.universityId,
    courseId: values.courseId,
    subjectName: values.subjectName.trim(),
    subjectCode: values.subjectCode.trim(),
    subjectTypeId: values.subjectTypeId,
    subjectCategoryId: values.subjectCategoryId,
    subCredits: values.subCredits?.trim() ? Number(values.subCredits) : null,
    subCreditHrs: values.subCreditHrs?.trim()
      ? Number(values.subCreditHrs)
      : null,
    shortName: values.shortName.trim(),
    orderNo: values.orderNo?.trim() ? Number(values.orderNo) : null,
    isLanguage: values.isLanguage,
    isActive: values.isActive,
    reason: values.isActive ? "active" : values.reason?.trim() || "",
  });

  const handleFormSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    setError("");
    try {
      const payload = buildPayload(values);
      const subjectId = pickNum(row, ["subjectId"]);

      if (
        isDuplicateSubject(existingRows, {
          subjectName: payload.subjectName as string,
          subjectCode: payload.subjectCode as string,
          subjectId: isEdit ? subjectId : undefined,
        })
      ) {
        setError("Subject with same name or code already exists");
        return;
      }

      if (isEdit && subjectId) {
        await updateSubject(subjectId, payload);
      } else {
        await createSubject(payload);
      }

      onSaved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save subject");
    } finally {
      setSaving(false);
    }
  });

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Subject" : "Add Subject"}
      onSubmit={(e) => {
        e.preventDefault();
        void handleFormSubmit();
      }}
      submitLabel={isEdit ? "Update" : "Save"}
      isSubmitting={saving}
      size="lg"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label="University"
          required
          value={watchUniversityId ? String(watchUniversityId) : ""}
          onChange={(v) => {
            form.setValue("universityId", Number(v) || 0, {
              shouldValidate: true,
            });
            form.setValue("courseId", 0);
          }}
          options={universityOptions}
          placeholder="Select university"
          isLoading={loadingLookups}
          disabled={saving}
        />
        <Select
          label="Course"
          required
          value={form.watch("courseId") ? String(form.watch("courseId")) : ""}
          onChange={(v) =>
            form.setValue("courseId", Number(v) || 0, { shouldValidate: true })
          }
          options={courseOptions}
          placeholder="Select course"
          disabled={!watchUniversityId || saving}
        />

        <div className="space-y-1.5">
          <Label>
            Subject Name <span className="text-destructive">*</span>
          </Label>
          <Input {...form.register("subjectName")} disabled={saving} />
          {form.formState.errors.subjectName && (
            <p className="text-xs text-destructive">
              {form.formState.errors.subjectName.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>
            Subject Code <span className="text-destructive">*</span>
          </Label>
          <Input {...form.register("subjectCode")} disabled={saving} />
          {form.formState.errors.subjectCode && (
            <p className="text-xs text-destructive">
              {form.formState.errors.subjectCode.message}
            </p>
          )}
        </div>

        <Select
          label="Subject Type"
          required
          value={
            form.watch("subjectTypeId")
              ? String(form.watch("subjectTypeId"))
              : ""
          }
          onChange={(v) =>
            form.setValue("subjectTypeId", Number(v) || 0, {
              shouldValidate: true,
            })
          }
          options={typeOptions}
          placeholder="Select type"
          isLoading={loadingLookups}
          disabled={saving}
        />
        <Select
          label="Subject Category"
          required
          value={
            form.watch("subjectCategoryId")
              ? String(form.watch("subjectCategoryId"))
              : ""
          }
          onChange={(v) =>
            form.setValue("subjectCategoryId", Number(v) || 0, {
              shouldValidate: true,
            })
          }
          options={categoryOptions}
          placeholder="Select category"
          isLoading={loadingLookups}
          disabled={saving}
        />

        <div className="space-y-1.5">
          <Label>Credits</Label>
          <Input
            type="number"
            step="any"
            {...form.register("subCredits")}
            disabled={saving}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Credit Hours</Label>
          <Input
            type="number"
            step="any"
            {...form.register("subCreditHrs")}
            disabled={saving}
          />
        </div>

        <div className="space-y-1.5">
          <Label>
            Short Name <span className="text-destructive">*</span>
          </Label>
          <Input {...form.register("shortName")} disabled={saving} />
          {form.formState.errors.shortName && (
            <p className="text-xs text-destructive">
              {form.formState.errors.shortName.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Order No</Label>
          <Input
            type="number"
            {...form.register("orderNo")}
            disabled={saving}
          />
        </div>

        <div className="flex items-center gap-6 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.watch("isLanguage")}
              onCheckedChange={(v) => form.setValue("isLanguage", v === true)}
              disabled={saving}
            />
            Is Language
          </label>
        </div>

        <div className="sm:col-span-2">
          <ActiveStatusField
            isActive={watchIsActive}
            reason={form.watch("reason") ?? ""}
            onActiveChange={(v) => form.setValue("isActive", v === true)}
            onReasonChange={(v) => form.setValue("reason", v)}
            reasonError={form.formState.errors.reason?.message}
          />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </FormModal>
  );
}
