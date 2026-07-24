"use client";

/**
 * Angular parity: faculty-data-security-level / data-security-modal
 * Required: collegeId
 * Optional: department, course, course group, semester, subject
 * Cascades match Angular selectedCollege / selectedCourse / selectedGroup / subjectList
 * isActive default true; reason default 'active' (shown when inactive)
 * No print.
 */

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormModal } from "@/common/components/feedback";
import { ActiveStatusField } from "@/common/components/forms";
import { Select } from "@/common/components/select";
import type { SelectOption } from "@/common/components/select";
import { toastError, toastSuccess } from "@/lib/toast";
import type { College } from "@/types/college";
import type { Course } from "@/types/course";
import type { CourseGroup } from "@/types/course-group";
import type { CourseYear } from "@/types/course-year";
import type { Department } from "@/types/department";
import {
  createEmployeeDataSecurity,
  listCollegesForFacultyDataSecurity,
  listCourseGroupsForFacultyDataSecurity,
  listCoursesForFacultyDataSecurity,
  listCourseYearsForFacultyDataSecurity,
  listDepartmentsForFacultyDataSecurity,
  listSubjectsForFacultyDataSecurity,
  updateEmployeeDataSecurity,
  type EmployeeDataSecurity,
  type FacultySecuritySubject,
} from "@/services";

const schema = z.object({
  collegeId: z.string().min(1, "College is required"),
  employeeDepartmentId: z.string().optional(),
  courseId: z.string().optional(),
  courseGroupId: z.string().optional(),
  courseYearId: z.string().optional(),
  subjectId: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function emptyOr(v: unknown): string {
  if (v == null || v === "") return "";
  return String(v);
}

function getDefaults(edit?: EmployeeDataSecurity | null): FormValues {
  return {
    collegeId: emptyOr(edit?.collegeId),
    employeeDepartmentId: emptyOr(edit?.employeeDepartmentId),
    courseId: emptyOr(edit?.courseId),
    courseGroupId: emptyOr(edit?.courseGroupId),
    courseYearId: emptyOr(edit?.courseYearId),
    subjectId: emptyOr(edit?.subjectId),
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? "active",
  };
}

function optionalId(v?: string): number | "" {
  const n = Number(v);
  return n > 0 ? n : "";
}

export interface FacultyDataSecurityModalProps {
  open: boolean;
  onClose: () => void;
  editData: EmployeeDataSecurity | null;
  /** Angular stamps create with form employeeId into employeeDetailId. */
  employeeId: number;
  onSaved: () => void;
}

export function FacultyDataSecurityModal({
  open,
  onClose,
  editData,
  employeeId,
  onSaved,
}: Readonly<FacultyDataSecurityModalProps>) {
  const isEditing = editData != null;

  const [colleges, setColleges] = useState<College[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseGroups, setCourseGroups] = useState<CourseGroup[]>([]);
  const [courseYears, setCourseYears] = useState<CourseYear[]>([]);
  const [subjects, setSubjects] = useState<FacultySecuritySubject[]>([]);
  const [subjectFilter, setSubjectFilter] = useState("");

  const {
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

  const collegeId = watch("collegeId");
  const courseId = watch("courseId");
  const courseGroupId = watch("courseGroupId");
  const isActive = watch("isActive");

  useEffect(() => {
    if (!open) return;
    reset(getDefaults(editData));
    setSubjectFilter("");
    void listCollegesForFacultyDataSecurity()
      .then(setColleges)
      .catch((e) => toastError(e, "Failed to load colleges"));
  }, [open, editData, reset]);

  // College → courses (by university) + departments
  useEffect(() => {
    if (!open) return;
    const id = Number(collegeId) || 0;
    if (!id) {
      setCourses([]);
      setDepartments([]);
      return;
    }
    const college = colleges.find((c) => c.collegeId === id);
    const universityId = Number(college?.universityId) || 0;
    void Promise.all([
      universityId
        ? listCoursesForFacultyDataSecurity(universityId)
        : Promise.resolve([] as Course[]),
      listDepartmentsForFacultyDataSecurity(id),
    ])
      .then(([courseRows, deptRows]) => {
        setCourses(courseRows);
        setDepartments(deptRows);
      })
      .catch((e) => toastError(e, "Failed to load college dependents"));
  }, [open, collegeId, colleges]);

  // Course → groups + subjects
  useEffect(() => {
    if (!open) return;
    const id = Number(courseId) || 0;
    if (!id) {
      setCourseGroups([]);
      setSubjects([]);
      return;
    }
    void Promise.all([
      listCourseGroupsForFacultyDataSecurity(id),
      listSubjectsForFacultyDataSecurity(id),
    ])
      .then(([groups, subs]) => {
        setCourseGroups(groups as CourseGroup[]);
        setSubjects(subs);
      })
      .catch((e) => toastError(e, "Failed to load course dependents"));
  }, [open, courseId]);

  // Course group gate → course years by courseId (Angular quirk)
  useEffect(() => {
    if (!open) return;
    const cid = Number(courseId) || 0;
    const gid = Number(courseGroupId) || 0;
    if (!cid || !gid) {
      setCourseYears([]);
      return;
    }
    void listCourseYearsForFacultyDataSecurity(cid)
      .then((rows) => setCourseYears(rows as CourseYear[]))
      .catch((e) => toastError(e, "Failed to load semesters"));
  }, [open, courseId, courseGroupId]);

  const collegeOptions = useMemo<SelectOption[]>(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: c.collegeCode ?? String(c.collegeId),
      })),
    [colleges],
  );

  const departmentOptions = useMemo<SelectOption[]>(
    () => [
      { value: "", label: "Select" },
      ...departments.map((d) => ({
        value: String(d.departmentId),
        label: d.deptCode ?? String(d.departmentId),
      })),
    ],
    [departments],
  );

  const courseOptions = useMemo<SelectOption[]>(
    () => [
      { value: "", label: "Select" },
      ...courses.map((c) => ({
        value: String(c.courseId),
        label: c.courseName ?? c.courseCode ?? String(c.courseId),
      })),
    ],
    [courses],
  );

  const courseGroupOptions = useMemo<SelectOption[]>(
    () => [
      { value: "", label: "Select" },
      ...courseGroups.map((g) => ({
        value: String(g.courseGroupId),
        label: g.groupCode ?? g.groupName ?? String(g.courseGroupId),
      })),
    ],
    [courseGroups],
  );

  const courseYearOptions = useMemo<SelectOption[]>(
    () => [
      { value: "", label: "Select" },
      ...courseYears.map((y) => ({
        value: String(y.courseYearId),
        label: y.courseYearName ?? y.courseYearCode ?? String(y.courseYearId),
      })),
    ],
    [courseYears],
  );

  const subjectOptions = useMemo<SelectOption[]>(() => {
    const filter = subjectFilter.trim().toLowerCase();
    const list = filter
      ? subjects.filter(
          (s) =>
            (s.subjectName ?? "").toLowerCase().includes(filter) ||
            (s.subjectCode ?? "").toLowerCase().includes(filter),
        )
      : subjects;
    return list.map((s) => ({
      value: String(s.subjectId),
      label:
        `${s.subjectName ?? ""}${s.subjectCode ? ` (${s.subjectCode})` : ""}`.trim(),
      title: `${s.subjectName ?? ""}(${s.subjectCode ?? ""})`,
    }));
  }, [subjects, subjectFilter]);

  async function onSubmit(values: FormValues) {
    const payload: Partial<EmployeeDataSecurity> = {
      collegeId: Number(values.collegeId),
      employeeDepartmentId: optionalId(values.employeeDepartmentId),
      courseId: optionalId(values.courseId),
      courseGroupId: optionalId(values.courseGroupId),
      courseYearId: optionalId(values.courseYearId),
      subjectId: optionalId(values.subjectId),
      isActive: values.isActive,
      reason: values.isActive
        ? "active"
        : String(values.reason ?? "").trim() || "active",
    };

    try {
      if (isEditing && editData?.empDataSecurityId) {
        await updateEmployeeDataSecurity(editData.empDataSecurityId, {
          ...payload,
          empDataSecurityId: editData.empDataSecurityId,
          employeeDetailId: editData.employeeDetailId,
          createdDt: editData.createdDt,
        });
        toastSuccess("Data Level Security updated successfully");
      } else {
        await createEmployeeDataSecurity({
          ...payload,
          employeeDetailId: employeeId,
        });
        toastSuccess("Data Level Security created successfully");
      }
      onSaved();
      onClose();
    } catch (e) {
      toastError(e, "Failed to save data level security");
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Data Level Security" : "Add Data Level Security"}
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
      isSubmitting={isSubmitting}
      submitLabel="Save"
      cancelLabel="Close"
      size="lg"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Controller
          name="collegeId"
          control={control}
          render={({ field }) => (
            <Select
              label="College *"
              value={field.value || null}
              onChange={(v) => {
                field.onChange(v ?? "");
                setValue("courseId", "");
                setValue("courseGroupId", "");
                setValue("courseYearId", "");
                setValue("employeeDepartmentId", "");
                setValue("subjectId", "");
              }}
              options={collegeOptions}
              placeholder="College"
              error={errors.collegeId?.message}
            />
          )}
        />

        <Controller
          name="employeeDepartmentId"
          control={control}
          render={({ field }) => (
            <Select
              label="Department"
              value={field.value || null}
              onChange={(v) => field.onChange(v ?? "")}
              options={departmentOptions}
              placeholder="Department"
              clearable
            />
          )}
        />

        <Controller
          name="courseId"
          control={control}
          render={({ field }) => (
            <Select
              label="Course"
              value={field.value || null}
              onChange={(v) => {
                field.onChange(v ?? "");
                setValue("courseGroupId", "");
                setValue("courseYearId", "");
                setValue("subjectId", "");
              }}
              options={courseOptions}
              placeholder="Course"
              clearable
            />
          )}
        />

        <Controller
          name="courseGroupId"
          control={control}
          render={({ field }) => (
            <Select
              label="Course Group"
              value={field.value || null}
              onChange={(v) => {
                field.onChange(v ?? "");
                setValue("courseYearId", "");
              }}
              options={courseGroupOptions}
              placeholder="Course Group"
              clearable
            />
          )}
        />

        <Controller
          name="courseYearId"
          control={control}
          render={({ field }) => (
            <Select
              label="Semester"
              value={field.value || null}
              onChange={(v) => field.onChange(v ?? "")}
              options={courseYearOptions}
              placeholder="Semester"
              clearable
            />
          )}
        />

        <Controller
          name="subjectId"
          control={control}
          render={({ field }) => (
            <Select
              label="Subjects"
              value={field.value || null}
              onChange={(v) => field.onChange(v ?? "")}
              options={subjectOptions}
              placeholder="Subjects"
              searchable
              onSearch={setSubjectFilter}
              clearable
              className="sm:col-span-2"
            />
          )}
        />

        <div className="sm:col-span-2">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch("reason") ?? ""}
                onActiveChange={(v) => {
                  field.onChange(v === true);
                  if (v === true) setValue("reason", "active");
                }}
                onReasonChange={(v) => setValue("reason", v)}
                reasonRequired={false}
              />
            )}
          />
        </div>
      </div>
    </FormModal>
  );
}
