"use client";

/**
 * Angular parity: achievements-modal
 * Required: organizationId, achivementTitle, achievementLevelCatId
 * Orgs: active only (orgCode labels); Sub-cats: active (achievementSubcategoryCode)
 * Levels: ACHVMNTLVL; Prizes: PRIZECAT
 * Students/Employees: multi-select; add = search (min 5 chars), edit = college list preload
 * Dates default today (YYYY-MM-DD); update includes achievementId
 */

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { FormModal } from "@/common/components/feedback";
import { ActiveStatusField } from "@/common/components/forms";
import { DatePicker } from "@/common/components/date-picker";
import { Select, MultiSelect } from "@/common/components/select";
import type { SelectOption } from "@/common/components/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GM_CODES } from "@/config/constants/ui";
import { useSession } from "@/hooks/useSession";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createAchievement,
  listActiveAchievementSubCategories,
  listActiveOrganizations,
  listEmployeesForAchievementEdit,
  listGeneralDetailsByCode,
  listStudentsForAchievementEdit,
  searchEmployeesForAchievement,
  searchStudentsForAchievement,
  updateAchievement,
} from "@/services";
import type { Achievement, AchievementSubCategory } from "@/types/placements";
import type { Organization } from "@/types/organization";

type AnyRow = Record<string, unknown>;

const schema = z
  .object({
    organizationId: z.string().min(1, "Organization is required"),
    subcategoryId: z.string().optional(),
    achivementTitle: z.string().min(1, "Achievement title is required"),
    achievementLevelCatId: z.string().min(1, "Achievement level is required"),
    prizeCatId: z.string().optional(),
    specialization: z.string().optional(),
    achivementDescription: z.string().optional(),
    ranks: z.string().optional(),
    grade: z.string().optional(),
    percentage: z.string().optional(),
    durationFrom: z.date().nullable().optional(),
    durationTo: z.date().nullable().optional(),
    referenceNo: z.string().optional(),
    isActive: z.boolean(),
    reason: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.isActive && !String(values.reason ?? "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reason is required when inactive",
        path: ["reason"],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function todayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getDefaults(edit?: Achievement | null): FormValues {
  const today = todayLocal();
  return {
    organizationId:
      edit?.organizationId != null ? String(edit.organizationId) : "",
    subcategoryId:
      edit?.subcategoryId != null ? String(edit.subcategoryId) : "",
    achivementTitle: edit?.achivementTitle ?? "",
    achievementLevelCatId:
      edit?.achievementLevelCatId != null
        ? String(edit.achievementLevelCatId)
        : "",
    prizeCatId: edit?.prizeCatId != null ? String(edit.prizeCatId) : "",
    specialization: edit?.specialization ?? "",
    achivementDescription: edit?.achivementDescription ?? "",
    ranks: edit?.ranks ?? "",
    grade: edit?.grade ?? "",
    percentage:
      edit?.percentage != null && edit.percentage !== undefined
        ? String(edit.percentage)
        : "",
    durationFrom: edit ? (parseDate(edit.durationFrom) ?? today) : today,
    durationTo: edit ? (parseDate(edit.durationTo) ?? today) : today,
    referenceNo: edit?.referenceNo ?? "",
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? "active",
  };
}

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const k of keys) {
    const n = Number(row[k] ?? 0);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function toStudentOptions(rows: AnyRow[]): SelectOption[] {
  return rows
    .map((r) => {
      const id = pickNum(r, ["studentId", "fk_student_id"]);
      if (!id) return null;
      const name = pickText(r, ["firstName", "studentName"]) || "Student";
      const roll = pickText(r, ["rollNumber", "hallticketNumber"]);
      return {
        value: String(id),
        label: roll ? `(${roll}) ${name}` : name,
      };
    })
    .filter((o): o is SelectOption => o != null);
}

function toEmployeeOptions(rows: AnyRow[]): SelectOption[] {
  return rows
    .map((r) => {
      const id = pickNum(r, ["employeeId", "employee_id"]);
      if (!id) return null;
      const num = pickText(r, ["empNumber", "employeeNumber"]);
      const name = pickText(r, [
        "firstName",
        "employeeName",
        "empName",
        "name",
      ]);
      const label = num
        ? name
          ? `${num} (${name})`
          : num
        : name || "Employee";
      return { value: String(id), label };
    })
    .filter((o): o is SelectOption => o != null);
}

export interface AchievementModalProps {
  open: boolean;
  onClose: () => void;
  editData: Achievement | null;
  onSaved: () => void;
}

export function AchievementModal({
  open,
  onClose,
  editData,
  onSaved,
}: Readonly<AchievementModalProps>) {
  const isEditing = editData != null;
  const { user } = useSession();
  const collegeId = Number(user?.collegeId ?? 0);

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [subCategories, setSubCategories] = useState<AchievementSubCategory[]>(
    [],
  );
  const [achievementLevels, setAchievementLevels] = useState<AnyRow[]>([]);
  const [prizes, setPrizes] = useState<AnyRow[]>([]);

  const [studentOptions, setStudentOptions] = useState<SelectOption[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: getDefaults(),
  });

  useEffect(() => {
    if (!open) return;
    reset(getDefaults(editData));
    setSubmitError(null);

    void listActiveOrganizations().then(setOrganizations).catch(console.error);
    void listActiveAchievementSubCategories()
      .then(setSubCategories)
      .catch(console.error);
    void listGeneralDetailsByCode(GM_CODES.ACHIEVEMENT_LEVEL)
      .then(setAchievementLevels)
      .catch(console.error);
    void listGeneralDetailsByCode(GM_CODES.PRIZES)
      .then(setPrizes)
      .catch(console.error);

    const stdIds = editData?.fkParticipatedStdIds
      ? editData.fkParticipatedStdIds
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const empIds = editData?.fkParticipatedEmpIds
      ? editData.fkParticipatedEmpIds
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    setSelectedStudentIds(stdIds);
    setSelectedEmployeeIds(empIds);

    if (editData && collegeId) {
      // Angular edit: preload StudentDetail / EmployeeDetail by college
      setLoadingStudents(true);
      setLoadingEmployees(true);
      void listStudentsForAchievementEdit(collegeId)
        .then((rows) => setStudentOptions(toStudentOptions(rows)))
        .catch(() => setStudentOptions([]))
        .finally(() => setLoadingStudents(false));
      void listEmployeesForAchievementEdit(collegeId)
        .then((rows) => setEmployeeOptions(toEmployeeOptions(rows)))
        .catch(() => setEmployeeOptions([]))
        .finally(() => setLoadingEmployees(false));
    } else {
      setStudentOptions([]);
      setEmployeeOptions([]);
    }
  }, [open, editData, reset, collegeId]);

  const isActive = watch("isActive");

  const organizationOptions = useMemo<SelectOption[]>(
    () =>
      organizations.map((o) => ({
        value: String(o.organizationId),
        label: o.orgCode || o.orgName || String(o.organizationId),
      })),
    [organizations],
  );

  const subCategoryOptions = useMemo<SelectOption[]>(
    () =>
      subCategories.map((s) => ({
        value: String(s.subCategoryId),
        label: s.achievementSubcategoryCode || s.achievementSubcategory,
      })),
    [subCategories],
  );

  const levelOptions = useMemo<SelectOption[]>(
    () =>
      achievementLevels
        .map((l) => ({
          value: String(l.generalDetailId ?? l.gd_id ?? ""),
          label: String(l.generalDetailDisplayName ?? l.gd_name ?? "Level"),
        }))
        .filter((o) => o.value),
    [achievementLevels],
  );

  const prizeOptions = useMemo<SelectOption[]>(
    () =>
      prizes
        .map((p) => ({
          value: String(p.generalDetailId ?? p.gd_id ?? ""),
          label: String(p.generalDetailDisplayName ?? p.gd_name ?? "Prize"),
        }))
        .filter((o) => o.value),
    [prizes],
  );

  async function handleStudentSearch(term: string) {
    if (isEditing) return; // Angular edit uses local filter only
    if (!collegeId || term.trim().length < 5) {
      setStudentOptions([]);
      return;
    }
    setLoadingStudents(true);
    try {
      const rows = await searchStudentsForAchievement(collegeId, term);
      setStudentOptions(toStudentOptions(rows));
    } catch {
      setStudentOptions([]);
    } finally {
      setLoadingStudents(false);
    }
  }

  async function handleEmployeeSearch(term: string) {
    if (isEditing) {
      // Angular edit: client-side filter of preloaded employees (MultiSelect does local filter)
      return;
    }
    if (!collegeId || term.trim().length < 5) {
      setEmployeeOptions([]);
      return;
    }
    setLoadingEmployees(true);
    try {
      const rows = await searchEmployeesForAchievement(collegeId, term);
      setEmployeeOptions(toEmployeeOptions(rows));
    } catch {
      setEmployeeOptions([]);
    } finally {
      setLoadingEmployees(false);
    }
  }

  async function onSubmit(values: FormValues) {
    setSubmitError(null);

    // Angular: join student ids; employees via array.toString()
    const fkParticipatedStdIds =
      selectedStudentIds.length > 0 ? selectedStudentIds.join(",") : undefined;
    const fkParticipatedEmpIds =
      selectedEmployeeIds.length > 0
        ? selectedEmployeeIds.join(",")
        : undefined;

    const payload: Record<string, unknown> = {
      organizationId: Number(values.organizationId),
      achivementTitle: values.achivementTitle.trim(),
      subcategoryId: values.subcategoryId ? Number(values.subcategoryId) : null,
      specialization: values.specialization?.trim() || null,
      prizeCatId: values.prizeCatId ? Number(values.prizeCatId) : null,
      achivementDescription: values.achivementDescription?.trim() || null,
      ranks: values.ranks?.trim() || null,
      grade: values.grade?.trim() || null,
      percentage: values.percentage ? Number(values.percentage) : null,
      durationFrom: values.durationFrom
        ? format(values.durationFrom, "yyyy-MM-dd")
        : null,
      durationTo: values.durationTo
        ? format(values.durationTo, "yyyy-MM-dd")
        : null,
      referenceNo: values.referenceNo?.trim() || null,
      achievementLevelCatId: Number(values.achievementLevelCatId),
      fkParticipatedStdIds: fkParticipatedStdIds ?? null,
      fkParticipatedEmpIds: fkParticipatedEmpIds ?? null,
      isActive: values.isActive,
      reason: values.isActive
        ? "active"
        : String(values.reason ?? "").trim() || "inactive",
    };

    try {
      if (isEditing && editData?.achievementId) {
        // Angular parent: details.achievementId = data.achievementId
        payload.achievementId = editData.achievementId;
        await updateAchievement(
          editData.achievementId,
          payload as Partial<Achievement>,
        );
        toastSuccess("Achievement updated successfully");
      } else {
        await createAchievement(payload as Partial<Achievement>);
        toastSuccess("Achievement created successfully");
      }
      onSaved();
      onClose();
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Unable to process your request at this time, please try again!";
      setSubmitError(message);
      toastError(e, "Failed to save achievement");
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Achievement" : "Add Achievement"}
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
      isSubmitting={isSubmitting}
      submitLabel="Save"
      cancelLabel="Close"
      size="xl"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Controller
          name="organizationId"
          control={control}
          render={({ field }) => (
            <Select
              label="Organization"
              required
              value={field.value || null}
              onChange={(v) => field.onChange(v ?? "")}
              options={organizationOptions}
              placeholder="Organization"
              searchable
              error={errors.organizationId?.message}
            />
          )}
        />

        <Controller
          name="subcategoryId"
          control={control}
          render={({ field }) => (
            <Select
              label="Achievement Sub-Category"
              value={field.value || null}
              onChange={(v) => field.onChange(v ?? "")}
              options={subCategoryOptions}
              placeholder="Achievement Sub-Category"
              searchable
              clearable
            />
          )}
        />

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="achivementTitle">Achievement Title *</Label>
          <Input id="achivementTitle" {...register("achivementTitle")} />
          {errors.achivementTitle ? (
            <p className="text-xs text-destructive">
              {errors.achivementTitle.message}
            </p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <MultiSelect
            label="Student"
            value={selectedStudentIds}
            onChange={setSelectedStudentIds}
            options={studentOptions}
            placeholder="Student"
            searchable
            onSearch={
              isEditing
                ? undefined
                : (t) => {
                    void handleStudentSearch(t);
                  }
            }
            isLoading={loadingStudents}
            showSelectAll={false}
          />
        </div>

        <div className="sm:col-span-2">
          <MultiSelect
            label="Employee"
            value={selectedEmployeeIds}
            onChange={setSelectedEmployeeIds}
            options={employeeOptions}
            placeholder="Employee"
            searchable
            onSearch={
              isEditing
                ? undefined
                : (t) => {
                    void handleEmployeeSearch(t);
                  }
            }
            isLoading={loadingEmployees}
            showSelectAll={false}
          />
        </div>

        <Controller
          name="durationFrom"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="From Date"
              value={field.value ?? null}
              onChange={field.onChange}
              placeholder="From Date"
              displayFormat="dd/MM/yyyy"
            />
          )}
        />

        <Controller
          name="durationTo"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="To Date"
              value={field.value ?? null}
              onChange={field.onChange}
              placeholder="To Date"
              displayFormat="dd/MM/yyyy"
            />
          )}
        />

        <Controller
          name="achievementLevelCatId"
          control={control}
          render={({ field }) => (
            <Select
              label="Achievement Level"
              required
              value={field.value || null}
              onChange={(v) => field.onChange(v ?? "")}
              options={levelOptions}
              placeholder="Achievement Level"
              searchable
              error={errors.achievementLevelCatId?.message}
            />
          )}
        />

        <Controller
          name="prizeCatId"
          control={control}
          render={({ field }) => (
            <Select
              label="Prize"
              value={field.value || null}
              onChange={(v) => field.onChange(v ?? "")}
              options={prizeOptions}
              placeholder="Prize"
              searchable
              clearable
            />
          )}
        />

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="achivementDescription">Description</Label>
          <Textarea
            id="achivementDescription"
            className="min-h-[72px]"
            {...register("achivementDescription")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="specialization">Specialization</Label>
          <Input id="specialization" {...register("specialization")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ranks">Rank</Label>
          <Input id="ranks" {...register("ranks")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="grade">Grade</Label>
          <Input id="grade" {...register("grade")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="percentage">Percentage</Label>
          <Input id="percentage" type="number" {...register("percentage")} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="referenceNo">Reference No</Label>
          <Input id="referenceNo" {...register("referenceNo")} />
        </div>

        <div className="sm:col-span-2">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch("reason") ?? ""}
                onActiveChange={(v) => field.onChange(v === true)}
                onReasonChange={(v) => setValue("reason", v)}
                reasonError={errors.reason?.message}
                reasonRequired={!isActive}
              />
            )}
          />
        </div>
      </div>

      {submitError ? (
        <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-600">
          {submitError}
        </p>
      ) : null}
    </FormModal>
  );
}
