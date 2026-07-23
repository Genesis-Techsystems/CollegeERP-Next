"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { DatePicker } from "@/common/components/date-picker";
import { FormModal } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toastError } from "@/lib/toast";
import {
  listCourseGroups,
  listCoursesByUniversity,
  listCourseYears,
  searchStudentsForScholarship,
} from "@/services";
import {
  SCHOLARSHIP_STATUS_OPTIONS,
  type ScholarshipApplication,
} from "@/types/scholarship";

/** Angular Validators.required fields on schAppForm. */
const schema = z.object({
  collegeId: z.coerce.number().min(1, "College is required"),
  academicYearId: z.coerce.number().min(1, "Academic Year is required"),
  courseId: z.coerce.number().min(1, "Course is required"),
  courseGroupId: z.coerce.number().min(1, "Course Group is required"),
  courseYearId: z.coerce.number().min(1, "Course Year is required"),
  groupSectionId: z.coerce.number().optional().nullable(),
  studentId: z.coerce.number().min(1, "Student is required"),
  applicantName: z.string().trim().min(1, "Applicant Name is required"),
  schApplicationNo: z.string().trim().min(1, "Application No is required"),
  appliedOn: z.date().nullable().optional(),
  docColelctedOn: z.date().nullable().optional(),
  isAllDocsCollected: z.boolean(),
  docCollectionComments: z.string().optional(),
  clgApprovalStatusAr: z.string().optional().nullable(),
  statusComments: z.string().optional(),
  submittedToGovtOn: z.date().nullable().optional(),
  isSubmittedToGovt: z.boolean(),
  govtApprovalStatusAr: z.string().optional().nullable(),
  govtApprovedOn: z.date().nullable().optional(),
  scholarshipAmount: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number({ required_error: "Amount is required" }).min(0, "Amount is required"),
  ),
  totalAmountReceived: z.coerce.number().optional(),
  isRenewaled: z.boolean(),
  isCompleted: z.boolean(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export type ApplicationModalResult = {
  collegeId: number;
  academicYearId: number;
  courseId: number;
  courseGroupId: number;
  courseYearId: number;
  groupSectionId?: number | null;
  studentId: number;
  applicantName: string;
  schApplicationNo: string;
  appliedOn?: string | null;
  docColelctedOn?: string | null;
  isAllDocsCollected: boolean;
  docCollectionComments?: string;
  clgApprovalStatusAr?: string | null;
  statusComments?: string;
  submittedToGovtOn?: string | null;
  isSubmittedToGovt: boolean;
  govtApprovalStatusAr?: string | null;
  govtApprovedOn?: string | null;
  scholarshipAmount: number;
  totalAmountReceived?: number;
  balanceAmount: number;
  isRenewaled: boolean;
  isCompleted: boolean;
  isActive: boolean;
  reason?: string;
};

type AnyRow = Record<string, unknown>;

function toDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIso(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString();
}

function pickId(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const n = Number(row[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function pickLabel(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function studentOptionLabel(row: AnyRow): string {
  const name = pickLabel(row, ["firstName", "studentName"]);
  const roll = pickLabel(row, ["rollNumber", "hallticketNumber"]);
  if (name && roll) return `${name} (${roll})`;
  return name || roll || String(pickId(row, ["studentId"]));
}

function nestedRow(student: AnyRow, keys: string[]): AnyRow {
  for (const key of keys) {
    const v = student[key];
    if (v && typeof v === "object" && !Array.isArray(v)) return v as AnyRow;
  }
  return {};
}

/** Resolve course / group / year ids from studentsearch row (ids or codes). */
function resolveStudentCourseId(student: AnyRow, courseList: AnyRow[]): number {
  const nested = nestedRow(student, ["Course", "course"]);
  const id =
    pickId(student, ["courseId", "fk_course_id", "course_id"]) ||
    pickId(nested, ["courseId", "fk_course_id"]);
  if (id) return id;
  const code = (
    pickLabel(student, ["courseCode", "course_code"]) ||
    pickLabel(nested, ["courseCode", "course_code"])
  ).toLowerCase();
  if (!code) return 0;
  const match = courseList.find(
    (c) => pickLabel(c, ["courseCode", "courseName"]).toLowerCase() === code,
  );
  return match ? pickId(match, ["courseId"]) : 0;
}

function resolveStudentGroupId(student: AnyRow, groupList: AnyRow[]): number {
  const nested = nestedRow(student, ["CourseGroup", "courseGroup"]);
  const id =
    pickId(student, ["courseGroupId", "fk_course_group_id", "course_group_id"]) ||
    pickId(nested, ["courseGroupId", "fk_course_group_id"]);
  if (id) return id;
  const code = (
    pickLabel(student, ["groupCode", "courseGroupCode", "group_code"]) ||
    pickLabel(nested, ["groupCode", "courseGroupCode"])
  ).toLowerCase();
  if (!code) return 0;
  const match = groupList.find(
    (g) =>
      pickLabel(g, ["groupCode", "courseGroupCode", "groupName"]).toLowerCase() ===
      code,
  );
  return match ? pickId(match, ["courseGroupId"]) : 0;
}

function resolveStudentYearId(student: AnyRow, yearList: AnyRow[]): number {
  const nested = nestedRow(student, ["CourseYear", "courseYear"]);
  const id =
    pickId(student, ["courseYearId", "fk_course_year_id", "course_year_id"]) ||
    pickId(nested, ["courseYearId", "fk_course_year_id"]);
  if (id) return id;
  const name = (
    pickLabel(student, ["courseYearName", "course_year_name", "courseYearCode"]) ||
    pickLabel(nested, ["courseYearName", "courseYearCode"])
  ).toLowerCase();
  if (!name) return 0;
  const match = yearList.find(
    (y) =>
      pickLabel(y, ["courseYearName", "courseYearCode", "yearNo"]).toLowerCase() ===
      name,
  );
  return match ? pickId(match, ["courseYearId"]) : 0;
}

function RequiredMark() {
  return (
    <span className="ml-0.5 text-destructive" aria-hidden="true">
      *
    </span>
  );
}

interface ApplicationModalProps {
  open: boolean;
  onClose: () => void;
  mode: "new" | "edit";
  collegeId: number;
  academicYearId: number;
  universityId: number;
  row?: ScholarshipApplication | null;
  onSubmit: (payload: ApplicationModalResult) => Promise<void>;
}

export function ApplicationModal({
  open,
  onClose,
  mode,
  collegeId,
  academicYearId,
  universityId,
  row,
  onSubmit,
}: Readonly<ApplicationModalProps>) {
  const isEdit = mode === "edit";
  const [studentHits, setStudentHits] = useState<AnyRow[]>([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  /** Student row used to auto-fill Course / Course Group / Course Year. */
  const [cascadeStudent, setCascadeStudent] = useState<AnyRow | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      collegeId,
      academicYearId,
      courseId: undefined,
      courseGroupId: undefined,
      courseYearId: undefined,
      groupSectionId: null,
      studentId: undefined,
      applicantName: "",
      schApplicationNo: "",
      appliedOn: new Date(),
      docColelctedOn: new Date(),
      isAllDocsCollected: false,
      docCollectionComments: "",
      clgApprovalStatusAr: null,
      statusComments: "",
      submittedToGovtOn: new Date(),
      isSubmittedToGovt: false,
      govtApprovalStatusAr: null,
      govtApprovedOn: new Date(),
      scholarshipAmount: 0,
      totalAmountReceived: 0,
      isRenewaled: false,
      isCompleted: false,
      isActive: false,
      reason: "",
    },
  });

  const courseId = Number(watch("courseId") ?? 0);
  const courseGroupId = Number(watch("courseGroupId") ?? 0);
  const studentId = Number(watch("studentId") ?? 0);
  const isActive = Boolean(watch("isActive"));
  const submittedToGovtOn = watch("submittedToGovtOn");

  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ["ScholarshipApplication", "courses", universityId],
    queryFn: () => listCoursesByUniversity(universityId),
    enabled: open && universityId > 0,
  });

  const { data: courseGroups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ["ScholarshipApplication", "courseGroups", courseId],
    queryFn: () => listCourseGroups(courseId),
    enabled: open && courseId > 0,
  });

  const { data: courseYears = [], isLoading: loadingYears } = useQuery({
    queryKey: ["ScholarshipApplication", "courseYears", courseId, courseGroupId],
    queryFn: () => listCourseYears(courseId),
    enabled: open && courseId > 0 && courseGroupId > 0,
  });

  const courseOptions = useMemo(
    () =>
      courses
        .map((c) => ({
          value: String(pickId(c, ["courseId"])),
          label:
            pickLabel(c, ["courseCode", "courseName"]) ||
            String(pickId(c, ["courseId"])),
        }))
        .filter((o) => o.value !== "0"),
    [courses],
  );

  const groupOptions = useMemo(
    () =>
      courseGroups
        .map((g) => ({
          value: String(pickId(g as AnyRow, ["courseGroupId"])),
          label:
            pickLabel(g as AnyRow, ["groupCode", "courseGroupCode", "groupName"]) ||
            String(pickId(g as AnyRow, ["courseGroupId"])),
        }))
        .filter((o) => o.value !== "0"),
    [courseGroups],
  );

  const yearOptions = useMemo(
    () =>
      courseYears
        .map((y) => ({
          value: String(pickId(y as AnyRow, ["courseYearId"])),
          label:
            pickLabel(y as AnyRow, ["courseYearName", "courseYearCode", "yearNo"]) ||
            String(pickId(y as AnyRow, ["courseYearId"])),
        }))
        .filter((o) => o.value !== "0"),
    [courseYears],
  );

  const studentOptions = useMemo(() => {
    const opts = studentHits
      .map((s) => {
        const id = pickId(s, ["studentId", "fk_student_id"]);
        if (!id) return null;
        return { value: String(id), label: studentOptionLabel(s) };
      })
      .filter((o): o is { value: string; label: string } => o != null);

    // Keep selected student visible even if not in latest search hits (edit mode).
    if (
      studentId > 0 &&
      !opts.some((o) => o.value === String(studentId)) &&
      row &&
      Number(row.studentId) === studentId
    ) {
      opts.unshift({
        value: String(studentId),
        label: studentOptionLabel({
          studentId,
          firstName: row.firstName ?? row.applicantName,
          rollNumber: row.rollNumber,
        }),
      });
    }
    return opts;
  }, [studentHits, studentId, row]);

  const statusOptions = useMemo(
    () =>
      SCHOLARSHIP_STATUS_OPTIONS.map((o) => ({
        value: o.value,
        label: o.label,
      })),
    [],
  );

  useEffect(() => {
    if (!open) return;
    setStudentHits([]);
    setCascadeStudent(null);

    if (isEdit && row) {
      reset({
        collegeId: Number(row.collegeId ?? collegeId),
        academicYearId: Number(row.academicYearId ?? academicYearId),
        courseId: Number(row.courseId ?? 0) || undefined,
        courseGroupId: Number(row.courseGroupId ?? 0) || undefined,
        courseYearId: Number(row.courseYearId ?? 0) || undefined,
        groupSectionId: Number(row.groupSectionId ?? 0) || null,
        studentId: Number(row.studentId ?? 0) || undefined,
        applicantName: String(row.applicantName ?? row.firstName ?? ""),
        schApplicationNo: String(row.schApplicationNo ?? ""),
        appliedOn: toDate(row.appliedOn) ?? new Date(),
        docColelctedOn: toDate(row.docColelctedOn) ?? new Date(),
        isAllDocsCollected: Boolean(row.isAllDocsCollected),
        docCollectionComments: String(row.docCollectionComments ?? ""),
        clgApprovalStatusAr: row.clgApprovalStatusAr ?? null,
        statusComments: String(row.statusComments ?? ""),
        submittedToGovtOn: toDate(row.submittedToGovtOn) ?? new Date(),
        isSubmittedToGovt: Boolean(row.isSubmittedToGovt),
        govtApprovalStatusAr: row.govtApprovalStatusAr ?? null,
        govtApprovedOn: toDate(row.govtApprovedOn) ?? new Date(),
        scholarshipAmount: Number(row.scholarshipAmount ?? 0),
        totalAmountReceived: Number(row.totalAmountReceived ?? 0),
        isRenewaled: Boolean(row.isRenewaled),
        isCompleted: Boolean(row.isCompleted),
        isActive: Boolean(row.isActive),
        reason: String(row.reason ?? ""),
      });
      // Angular edit: enteredStudent(firstName, 'TS')
      if (row.firstName) {
        void (async () => {
          try {
            const hits = await searchStudentsForScholarship(
              String(row.firstName),
              Number(row.collegeId ?? collegeId),
            );
            setStudentHits(hits.length > 0 ? hits : [
              {
                studentId: row.studentId,
                firstName: row.firstName,
                rollNumber: row.rollNumber,
              },
            ]);
          } catch {
            setStudentHits([
              {
                studentId: row.studentId,
                firstName: row.firstName,
                rollNumber: row.rollNumber,
              },
            ]);
          }
        })();
      }
      return;
    }

    reset({
      collegeId,
      academicYearId,
      courseId: undefined,
      courseGroupId: undefined,
      courseYearId: undefined,
      groupSectionId: null,
      studentId: undefined,
      applicantName: "",
      schApplicationNo: "",
      appliedOn: new Date(),
      docColelctedOn: new Date(),
      isAllDocsCollected: false,
      docCollectionComments: "",
      clgApprovalStatusAr: null,
      statusComments: "",
      submittedToGovtOn: new Date(),
      isSubmittedToGovt: false,
      govtApprovalStatusAr: null,
      govtApprovedOn: new Date(),
      scholarshipAmount: 0,
      totalAmountReceived: 0,
      isRenewaled: false,
      isCompleted: false,
      isActive: false,
      reason: "",
    });
  }, [open, isEdit, row, collegeId, academicYearId, reset]);

  // Auto-fill Course from selected student (ids or courseCode).
  useEffect(() => {
    if (!open || !cascadeStudent || courses.length === 0) return;
    const resolved = resolveStudentCourseId(cascadeStudent, courses);
    if (!resolved) return;
    if (resolved === courseId) return;
    setValue("courseId", resolved, { shouldValidate: true });
    setValue("courseGroupId", undefined as unknown as number);
    setValue("courseYearId", undefined as unknown as number);
  }, [open, cascadeStudent, courses, courseId, setValue]);

  // Auto-fill Course Group once groups for the course are loaded.
  useEffect(() => {
    if (!open || !cascadeStudent || !courseId || courseGroups.length === 0) return;
    const resolved = resolveStudentGroupId(cascadeStudent, courseGroups as AnyRow[]);
    if (!resolved) return;
    if (resolved === courseGroupId) return;
    setValue("courseGroupId", resolved, { shouldValidate: true });
    setValue("courseYearId", undefined as unknown as number);
  }, [open, cascadeStudent, courseId, courseGroups, courseGroupId, setValue]);

  // Auto-fill Course Year once years are loaded.
  useEffect(() => {
    if (
      !open ||
      !cascadeStudent ||
      !courseId ||
      !courseGroupId ||
      courseYears.length === 0
    ) {
      return;
    }
    const resolved = resolveStudentYearId(cascadeStudent, courseYears as AnyRow[]);
    if (resolved) {
      setValue("courseYearId", resolved, { shouldValidate: true });
    }
    const sectionId =
      pickId(cascadeStudent, [
        "groupSectionId",
        "fk_group_section_id",
        "group_section_id",
      ]) ||
      pickId(nestedRow(cascadeStudent, ["GroupSection", "groupSection"]), [
        "groupSectionId",
        "fk_group_section_id",
      ]);
    if (sectionId) setValue("groupSectionId", sectionId);
  }, [
    open,
    cascadeStudent,
    courseId,
    courseGroupId,
    courseYears,
    setValue,
  ]);

  const handleStudentSearch = useCallback(
    async (term: string) => {
      const q = term.trim();
      // Angular: length > 4
      if (q.length < 5 || !collegeId) {
        if (!q) setStudentHits([]);
        return;
      }
      setSearchingStudents(true);
      try {
        const hits = await searchStudentsForScholarship(q, collegeId);
        setStudentHits(hits);
      } catch (err) {
        toastError(err, "Student search failed");
        setStudentHits([]);
      } finally {
        setSearchingStudents(false);
      }
    },
    [collegeId],
  );

  async function submitForm(values: FormValues) {
    const amount = Number(values.scholarshipAmount ?? 0);
    const received = Number(values.totalAmountReceived ?? 0);
    const payload: ApplicationModalResult = {
      collegeId: Number(values.collegeId),
      academicYearId: Number(values.academicYearId),
      courseId: Number(values.courseId),
      courseGroupId: Number(values.courseGroupId),
      courseYearId: Number(values.courseYearId),
      groupSectionId: values.groupSectionId ?? null,
      studentId: Number(values.studentId),
      applicantName: values.applicantName,
      schApplicationNo: isEdit
        ? String(row?.schApplicationNo ?? values.schApplicationNo)
        : values.schApplicationNo,
      isAllDocsCollected: Boolean(values.isAllDocsCollected),
      docCollectionComments: values.docCollectionComments,
      clgApprovalStatusAr: values.clgApprovalStatusAr ?? null,
      statusComments: values.statusComments,
      isSubmittedToGovt: Boolean(values.isSubmittedToGovt),
      govtApprovalStatusAr: values.govtApprovalStatusAr ?? null,
      scholarshipAmount: amount,
      totalAmountReceived: received,
      balanceAmount: amount - received,
      isRenewaled: Boolean(values.isRenewaled),
      isCompleted: Boolean(values.isCompleted),
      isActive: Boolean(values.isActive),
      reason: values.reason,
      appliedOn: toIso(values.appliedOn ?? null),
      docColelctedOn: toIso(values.docColelctedOn ?? null),
      submittedToGovtOn: toIso(values.submittedToGovtOn ?? null),
      govtApprovedOn: toIso(values.govtApprovedOn ?? null),
    };
    await onSubmit(payload);
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Scholarship Application"
      size="xl"
      isSubmitting={isSubmitting}
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(submitForm)();
      }}
      submitLabel="Save"
      cancelLabel="Close"
    >
      <div className="flex flex-col gap-3">
        {/* Row 1 — Angular: Student 60% + Course/Group/Year 33% each */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="space-y-1.5 md:col-span-7">
            <Controller
              name="studentId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Student"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => {
                    const id = v ? Number(v) : undefined;
                    field.onChange(id);
                    if (!id) {
                      setCascadeStudent(null);
                      return;
                    }
                    const hit = studentHits.find(
                      (s) => pickId(s, ["studentId", "fk_student_id"]) === id,
                    );
                    if (!hit) {
                      setCascadeStudent(null);
                      return;
                    }
                    const name = pickLabel(hit, ["firstName", "studentName"]);
                    if (name) {
                      setValue("applicantName", name, { shouldValidate: true });
                    }
                    // Trigger Course / Course Group / Course Year auto-fill.
                    setCascadeStudent(hit);
                  }}
                  onSearch={(term) => {
                    void handleStudentSearch(term);
                  }}
                  options={studentOptions}
                  placeholder="Student"
                  isLoading={searchingStudents}
                  error={errors.studentId?.message}
                  searchable
                />
              )}
            />
          </div>
          <div className="space-y-1.5 md:col-span-5">
            <Controller
              name="courseId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Course"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => {
                    // Manual override — stop student cascade from re-applying.
                    setCascadeStudent(null);
                    field.onChange(v ? Number(v) : undefined);
                    setValue("courseGroupId", undefined as unknown as number);
                    setValue("courseYearId", undefined as unknown as number);
                  }}
                  options={courseOptions}
                  placeholder="Course"
                  isLoading={loadingCourses}
                  error={errors.courseId?.message}
                  searchable
                />
              )}
            />
          </div>
          <div className="space-y-1.5 md:col-span-4">
            <Controller
              name="courseGroupId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Course Group"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => {
                    setCascadeStudent(null);
                    field.onChange(v ? Number(v) : undefined);
                    setValue("courseYearId", undefined as unknown as number);
                  }}
                  options={groupOptions}
                  placeholder="Course Group"
                  isLoading={loadingGroups}
                  disabled={!courseId}
                  error={errors.courseGroupId?.message}
                  searchable
                />
              )}
            />
          </div>
          <div className="space-y-1.5 md:col-span-4">
            <Controller
              name="courseYearId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Course Year"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => {
                    setCascadeStudent(null);
                    field.onChange(v ? Number(v) : undefined);
                  }}
                  options={yearOptions}
                  placeholder="Course Year"
                  isLoading={loadingYears}
                  disabled={!courseGroupId}
                  error={errors.courseYearId?.message}
                  searchable
                />
              )}
            />
          </div>
        </div>

        {/* Row 2 — Angular: Application No 25% | Applicant Name 50% | Applied On 25% */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="schApplicationNo">
              Application No
              <RequiredMark />
            </Label>
            <Input
              id="schApplicationNo"
              placeholder="Application No"
              disabled={isEdit}
              aria-required
              {...register("schApplicationNo")}
            />
            {errors.schApplicationNo ? (
              <p className="text-xs text-destructive">
                {errors.schApplicationNo.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="applicantName">
              Applicant Name
              <RequiredMark />
            </Label>
            <Input
              id="applicantName"
              placeholder="Applicant Name"
              aria-required
              {...register("applicantName")}
            />
            {errors.applicantName ? (
              <p className="text-xs text-destructive">
                {errors.applicantName.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Controller
              name="appliedOn"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="Applied On"
                  placeholder="Applied On"
                  value={field.value ?? null}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        </div>

        {/* Office Use — Angular sub-boarder */}
        <div className="border-t border-border pt-2">
          <strong className="text-sm">Office Use</strong>
        </div>

        {/* Row 3 — Angular: checkbox 30% | date 25% | comments 45% */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="flex items-center gap-2 md:col-span-4">
            <Controller
              name="isAllDocsCollected"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="isAllDocsCollected"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
              )}
            />
            <Label htmlFor="isAllDocsCollected">All Documents Collected</Label>
          </div>
          <div className="md:col-span-3">
            <Controller
              name="docColelctedOn"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="Documents Collected Date"
                  placeholder="Documents Collected Date"
                  value={field.value ?? null}
                  onChange={field.onChange}
                  maxDate={new Date()}
                />
              )}
            />
          </div>
          <div className="space-y-1.5 md:col-span-5">
            <Label htmlFor="docCollectionComments">Comments</Label>
            <Input
              id="docCollectionComments"
              placeholder="Comments"
              {...register("docCollectionComments")}
            />
          </div>
        </div>

        {/* Row 4 — Angular: College Approval Status 30% | Status Comments 70% */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-10">
          <div className="space-y-1.5 md:col-span-3">
            <Label>College Approval Status</Label>
            <Controller
              name="clgApprovalStatusAr"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v)}
                  options={statusOptions}
                  placeholder="College Approval Status"
                  clearable
                  searchable
                />
              )}
            />
          </div>
          <div className="space-y-1.5 md:col-span-7">
            <Label htmlFor="statusComments">Status Comments</Label>
            <Input
              id="statusComments"
              placeholder="Status Comments"
              {...register("statusComments")}
            />
          </div>
        </div>

        {/* Row 5 — Angular: Submitted/Govt fields + Amount (25% each) */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="flex items-center gap-2 md:col-span-3">
            <Controller
              name="isSubmittedToGovt"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="isSubmittedToGovt"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
              )}
            />
            <Label htmlFor="isSubmittedToGovt">Submitted To Govt</Label>
          </div>
          <div className="md:col-span-3">
            <Controller
              name="submittedToGovtOn"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="Submitted Govt On"
                  placeholder="Submitted Govt On"
                  value={field.value ?? null}
                  onChange={(d) => {
                    field.onChange(d);
                    // Angular calDays(): copy submitted date → govtApprovedOn
                    if (d) setValue("govtApprovedOn", d);
                  }}
                />
              )}
            />
          </div>
          <div className="space-y-1.5 md:col-span-3">
            <Label>Govt Approval Status</Label>
            <Controller
              name="govtApprovalStatusAr"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v)}
                  options={statusOptions}
                  placeholder="Govt Approval Status"
                  clearable
                  searchable
                />
              )}
            />
          </div>
          <div className="md:col-span-3">
            <Controller
              name="govtApprovedOn"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="Govt Approval On"
                  placeholder="Govt Approval On"
                  value={field.value ?? null}
                  onChange={field.onChange}
                  minDate={submittedToGovtOn ?? undefined}
                />
              )}
            />
          </div>
          <div className="space-y-1.5 md:col-span-3">
            <Label htmlFor="scholarshipAmount">
              Amount
              <RequiredMark />
            </Label>
            <Input
              id="scholarshipAmount"
              type="number"
              step="any"
              placeholder="Amount"
              aria-required
              {...register("scholarshipAmount")}
            />
            {errors.scholarshipAmount ? (
              <p className="text-xs text-destructive">
                {errors.scholarshipAmount.message}
              </p>
            ) : null}
          </div>
        </div>

        {/* Row 6 — Angular: Renewaled | Completed | Active | Reason (when inactive) */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="flex items-center gap-2 md:col-span-3">
            <Controller
              name="isRenewaled"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="isRenewaled"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
              )}
            />
            <Label htmlFor="isRenewaled">Renewaled</Label>
          </div>
          <div className="flex items-center gap-2 md:col-span-3">
            <Controller
              name="isCompleted"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="isCompleted"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
              )}
            />
            <Label htmlFor="isCompleted">Completed</Label>
          </div>
          <div className="flex items-center gap-2 md:col-span-3">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="isActive"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
              )}
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
          {!isActive ? (
            <div className="space-y-1.5 md:col-span-6">
              <Label htmlFor="reason">Reason</Label>
              <Input id="reason" placeholder="Reason" {...register("reason")} />
            </div>
          ) : null}
        </div>
      </div>
    </FormModal>
  );
}
