"use client";

/**
 * Angular `emp-notifications/add-notification/add-notification.component`
 * Route: `#/principal-communications/notifications/send-notifications/add-notification`
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bell, FileIcon, Trash2Icon, Upload, X } from "lucide-react";
import { ConfirmDialog } from "@/common/components/feedback";
import { DatePicker } from "@/common/components/date-picker";
import { FileDropzone } from "@/common/components/forms";
import {
  MultiSelect,
  Select,
  type SelectOption,
} from "@/common/components/select";
import { Table } from "@/common/components/table";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MINIO_URL } from "@/config/constants/api";
import { GM_CODES } from "@/config/constants/ui";
import { useSessionContext } from "@/context/SessionContext";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  formatLeaveYmd,
  getNotificationById,
  listCourseGroups,
  listCourseYears,
  listCoursesByUniversity,
  listDepartmentsByCollege,
  listEmployeeDataSecurityByEmployeeId,
  listGeneralDetailsByMaster,
  listGroupSectionsForTakeProxy,
  saveNotifications,
  uploadNotificationDoc,
  type EmployeeDataSecurity,
  type NotificationAudienceRow,
  type NotificationSaveRow,
} from "@/services";
import type { GeneralDetail } from "@/types/exam-master";

const MAX_FILE_BYTES = 24_000_000;

type CourseOpt = SelectOption & { courseCode?: string; courseName?: string };
type DeptOpt = SelectOption & { deptCode?: string };
type YearOpt = SelectOption & {
  courseCode?: string;
  courseYearName?: string;
};
type GroupOpt = SelectOption & { groupCode?: string };
type SectionOpt = SelectOption & {
  section?: string;
  groupCode?: string;
  courseYearName?: string;
};

function readStorage(key: string): string {
  if (typeof globalThis.window === "undefined") return "";
  return globalThis.localStorage.getItem(key) ?? "";
}

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function generalDetailLabel(row: GeneralDetail): string {
  const ext = row as GeneralDetail & { generalDetailDisplayName?: string };
  return String(
    ext.generalDetailDisplayName ??
      row.generalDetailName ??
      row.generalDetailCode ??
      row.generalDetailId ??
      "",
  );
}

function parseDate(raw: unknown): Date {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;
  if (raw == null || raw === "") return new Date();
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function audienceCodeOf(
  audienceTypes: GeneralDetail[],
  audienceTypeId: number,
): string {
  return (
    audienceTypes.find((a) => Number(a.generalDetailId) === audienceTypeId)
      ?.generalDetailCode ?? ""
  );
}

/** Same as StaffDashboard — Angular `CONSTANTS.MINIO` + relative path. */
function docHref(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (!path) return "#";
  return `${MINIO_URL}${path}`;
}

/**
 * Angular `genericFunctions.dataSecurity()` —
 * true for admin/principal (skip empSecurity dept filter).
 */
function isDataSecurityUnlocked(): boolean {
  return (
    readStorage("isAdmin") === "true" || readStorage("isPRINCIPAL") === "true"
  );
}

/**
 * Angular `genericFunctions.dataSecurityLevel()` —
 * true for staff (non-admin, non-principal) → auto-select course group.
 */
function isDataSecStaff(): boolean {
  if (readStorage("isAdmin") === "true") return false;
  if (readStorage("isPRINCIPAL") === "true") return false;
  return true;
}

function coursesFromEmpSecurity(
  security: EmployeeDataSecurity[],
  collegeId: number,
): CourseOpt[] {
  const out: CourseOpt[] = [];
  for (const row of security) {
    if (Number(row.collegeId) !== collegeId) continue;
    const id = Number(row.courseId ?? 0);
    if (!id || out.some((c) => Number(c.value) === id)) continue;
    const code = String(row.courseCode ?? id);
    out.push({
      value: String(id),
      label: code,
      courseCode: code,
      courseName: code,
    });
  }
  return out;
}

function departmentsFromEmpSecurity(
  security: EmployeeDataSecurity[],
  collegeId: number,
): DeptOpt[] {
  const out: DeptOpt[] = [];
  for (const row of security) {
    if (Number(row.collegeId) !== collegeId) continue;
    const id = Number(row.employeeDepartmentId ?? 0);
    if (!id || out.some((d) => Number(d.value) === id)) continue;
    const code = String(row.employeeDepartmentCode ?? id);
    out.push({ value: String(id), label: code, deptCode: code });
  }
  return out;
}

function groupsFromEmpSecurity(
  security: EmployeeDataSecurity[],
  collegeId: number,
  courseId: number,
): GroupOpt[] {
  const out: GroupOpt[] = [];
  for (const row of security) {
    if (Number(row.collegeId) !== collegeId) continue;
    if (Number(row.courseId) !== courseId) continue;
    const id = Number(row.courseGroupId ?? 0);
    if (!id || out.some((g) => Number(g.value) === id)) continue;
    const code = String(row.courseGroupCode ?? id);
    out.push({ value: String(id), label: code, groupCode: code });
  }
  return out;
}

function yearsFromEmpSecurity(
  security: EmployeeDataSecurity[],
  collegeId: number,
  courseId: number,
): YearOpt[] {
  const out: YearOpt[] = [];
  for (const row of security) {
    if (Number(row.collegeId) !== collegeId) continue;
    if (Number(row.courseId) !== courseId) continue;
    const id = Number(row.courseYearId ?? 0);
    if (!id || out.some((y) => Number(y.value) === id)) continue;
    const name = String(row.courseYearCode ?? id);
    out.push({
      value: String(id),
      label: name,
      courseCode: String(row.courseCode ?? ""),
      courseYearName: name,
    });
  }
  return out;
}

export function AddNotificationPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useSessionContext();

  const collegeId = positiveId(
    searchParams.get("collegeId"),
    readStorage("collegeId"),
    user?.collegeId,
  );
  const academicYearId = positiveId(
    searchParams.get("academicYearId"),
    readStorage("academicYearId"),
    user?.academicYearId,
  );
  const notificationIdParam = positiveId(searchParams.get("notificationId"));
  const universityId = positiveId(
    readStorage("universityId"),
    user?.universityId,
  );
  const employeeId = positiveId(readStorage("employeeId"), user?.employeeId);
  const dataSecurity = isDataSecurityUnlocked();
  const dataSecStaff = isDataSecStaff();

  const [dialogTitle, setDialogTitle] = useState("Add Notification");
  const [existing, setExisting] = useState<NotificationSaveRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [publishDate, setPublishDate] = useState<Date>(() => new Date());
  const [notificationEnddate, setNotificationEnddate] = useState<Date>(
    () => new Date(),
  );
  const [notificationTitle, setNotificationTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isPublished] = useState(true);
  const [reason, setReason] = useState("active");
  const [titleError, setTitleError] = useState("");

  const [fileTooLarge, setFileTooLarge] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [audienceTypes, setAudienceTypes] = useState<GeneralDetail[]>([]);
  const [audienceTypeOptions, setAudienceTypeOptions] = useState<
    SelectOption[]
  >([]);
  const [courses, setCourses] = useState<CourseOpt[]>([]);
  const [courseGroups, setCourseGroups] = useState<GroupOpt[]>([]);
  const [courseYears, setCourseYears] = useState<YearOpt[]>([]);
  const [sections, setSections] = useState<SectionOpt[]>([]);
  const [departments, setDepartments] = useState<DeptOpt[]>([]);
  const [empSecurity, setEmpSecurity] = useState<EmployeeDataSecurity[]>([]);

  const [audienceTypeId, setAudienceTypeId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [sectionIds, setSectionIds] = useState<string[]>([]);
  const [departmentId, setDepartmentId] = useState<number | null>(null);

  const [selectedFlag, setSelectedFlag] = useState(false);
  const [selectedFlagDept, setSelectedFlagDept] = useState(false);

  const [notificationAudiences, setNotificationAudiences] = useState<
    NotificationAudienceRow[]
  >([]);
  const [deletedAudiences, setDeletedAudiences] = useState<
    NotificationAudienceRow[]
  >([]);
  const [deleteTarget, setDeleteTarget] = useState<{
    row: NotificationAudienceRow;
    index: number;
  } | null>(null);

  const clearAudienceForm = useCallback(() => {
    setAudienceTypeId(null);
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setSectionIds([]);
    setDepartmentId(null);
    setSelectedFlag(false);
    setSelectedFlagDept(false);
    setCourseGroups([]);
    setCourseYears([]);
    setSections([]);
  }, []);

  const navigateBack = useCallback(() => {
    const qs = new URLSearchParams();
    if (collegeId) qs.set("collegeId", String(collegeId));
    if (academicYearId) qs.set("academicYearId", String(academicYearId));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";

    // Angular admin add-notification → notifications-&-announcements/notifications-list
    if (pathname?.includes("/notifications-and-announcements")) {
      router.push(
        `/notifications-and-announcements/notifications-list${suffix}`,
      );
      return;
    }

    // Angular principal goBack / post-save:
    // HOD → principal-communications/announcements
    // PRINCIPAL → principal-communications/notifications/send-notifications
    const isHod =
      readStorage("isHOD") === "true" || readStorage("userRole") === "HOD";
    const isPrincipal =
      readStorage("isPRINCIPAL") === "true" ||
      readStorage("userRole") === "PRINCIPAL";
    if (isHod && !isPrincipal) {
      router.push(`/principal-communications/announcements${suffix}`);
      return;
    }
    if (isPrincipal) {
      router.push(
        `/principal-communications/notifications/send-notifications${suffix}`,
      );
      return;
    }
    router.push(`/principal-communications/announcements${suffix}`);
  }, [router, pathname, collegeId, academicYearId]);

  // Bootstrap masters + optional edit load
  // Angular selectedCollege: prefer empSecurity courses/depts, else domain lists
  useEffect(() => {
    let cancelled = false;
    async function boot() {
      setLoading(true);
      try {
        const securityRows = employeeId
          ? await listEmployeeDataSecurityByEmployeeId(employeeId).catch(
              () => [] as EmployeeDataSecurity[],
            )
          : [];
        if (cancelled) return;
        const security = (
          Array.isArray(securityRows) ? securityRows : []
        ).filter((r) => Number(r.collegeId ?? 0) > 0);
        setEmpSecurity(security);

        const securedCourses = coursesFromEmpSecurity(security, collegeId);
        const securedDepts =
          security.length > 0 && !dataSecurity
            ? departmentsFromEmpSecurity(security, collegeId)
            : [];

        const [audiences, courseRows, deptRows] = await Promise.all([
          listGeneralDetailsByMaster(GM_CODES.AUDIENCE).catch(() => []),
          securedCourses.length > 0
            ? Promise.resolve([])
            : universityId
              ? listCoursesByUniversity(universityId).catch(() => [])
              : Promise.resolve([]),
          securedDepts.length > 0
            ? Promise.resolve([])
            : collegeId
              ? listDepartmentsByCollege(collegeId).catch(() => [])
              : Promise.resolve([]),
        ]);

        if (cancelled) return;

        const sorted = [...audiences].sort(
          (a, b) =>
            Number(a.generalDetailSortOrder ?? 0) -
            Number(b.generalDetailSortOrder ?? 0),
        );
        setAudienceTypes(sorted);
        setAudienceTypeOptions(
          sorted
            .filter((r) => r.generalDetailId)
            .map((r) => ({
              value: String(r.generalDetailId),
              label: generalDetailLabel(r),
            })),
        );

        if (securedCourses.length > 0) {
          setCourses(securedCourses);
        } else {
          setCourses(
            courseRows
              .map((c) => {
                const id = Number((c as { courseId?: number }).courseId ?? 0);
                const code = String(
                  (c as { courseCode?: string }).courseCode ?? "",
                );
                const name = String(
                  (c as { courseName?: string }).courseName ?? "",
                );
                return {
                  value: String(id),
                  label: code || name || String(id),
                  courseCode: code,
                  courseName: name,
                } satisfies CourseOpt;
              })
              .filter((o) => o.value && o.value !== "0"),
          );
        }

        if (securedDepts.length > 0) {
          setDepartments(securedDepts);
        } else {
          setDepartments(
            deptRows.map((d) => {
              const id = Number(d.departmentId ?? 0);
              const code = String(
                (d as { deptCode?: string }).deptCode ?? d.deptName ?? id,
              );
              return {
                value: String(id),
                label: code,
                deptCode: code,
              } satisfies DeptOpt;
            }),
          );
        }

        if (notificationIdParam > 0) {
          const row = await getNotificationById(notificationIdParam);
          if (cancelled) return;
          if (row) {
            setExisting(row);
            setDialogTitle("Edit Notification");
            setNotificationTitle(String(row.notificationTitle ?? ""));
            setDescription(String(row.description ?? ""));
            setPublishDate(parseDate(row.publishDate));
            setNotificationEnddate(parseDate(row.notificationEnddate));
            setIsAnnouncement(row.isAnnouncement === true);
            setIsActive(row.isActive !== false);
            setReason(String(row.reason ?? "active"));
            const active = (row.notificationAudiences ?? []).filter(
              (a) => a.isActive !== false,
            );
            setNotificationAudiences(active);
            setDeletedAudiences([]);
          }
        }
      } catch (e) {
        if (!cancelled) toastError(getErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [collegeId, universityId, notificationIdParam, employeeId, dataSecurity]);

  // Angular selectedCourse / selectedGroup: prefer empSecurity groups & years
  useEffect(() => {
    if (!courseId) {
      setCourseGroups([]);
      setCourseYears([]);
      setSections([]);
      return;
    }

    let cancelled = false;

    async function loadGroupsAndYears() {
      const securedGroups = groupsFromEmpSecurity(
        empSecurity,
        collegeId,
        courseId!,
      );
      const securedYears = yearsFromEmpSecurity(
        empSecurity,
        collegeId,
        courseId!,
      );

      if (securedGroups.length > 0) {
        if (!cancelled) setCourseGroups(securedGroups);
        // Angular dataSecStaff auto-selects courseGroupId from localStorage
        if (dataSecStaff) {
          const storedGroup = positiveId(readStorage("courseGroupId"));
          if (
            storedGroup > 0 &&
            securedGroups.some((g) => Number(g.value) === storedGroup)
          ) {
            if (!cancelled) setCourseGroupId(storedGroup);
          }
        }
      } else {
        try {
          const rows = await listCourseGroups(courseId!);
          if (cancelled) return;
          const mapped = rows.map((g) => ({
            value: String(g.courseGroupId),
            label: String(g.groupCode ?? g.courseGroupName ?? g.courseGroupId),
            groupCode: String(g.groupCode ?? ""),
          }));
          setCourseGroups(mapped);
          if (dataSecStaff && mapped.length > 0) {
            const storedGroup = positiveId(readStorage("courseGroupId"));
            if (
              storedGroup > 0 &&
              mapped.some((g) => Number(g.value) === storedGroup)
            ) {
              setCourseGroupId(storedGroup);
            }
          }
        } catch {
          if (!cancelled) setCourseGroups([]);
        }
      }

      if (securedYears.length > 0) {
        if (!cancelled) setCourseYears(securedYears);
      } else {
        try {
          const rows = await listCourseYears(courseId!);
          if (cancelled) return;
          setCourseYears(
            rows.map((y) => ({
              value: String(y.courseYearId),
              label: String(y.courseYearName ?? y.yearName ?? y.courseYearId),
              courseCode: String(
                (y as { courseCode?: string }).courseCode ?? "",
              ),
              courseYearName: String(y.courseYearName ?? y.yearName ?? ""),
            })),
          );
        } catch {
          if (!cancelled) setCourseYears([]);
        }
      }
    }

    void loadGroupsAndYears();
    return () => {
      cancelled = true;
    };
  }, [courseId, collegeId, empSecurity, dataSecStaff]);

  // Angular selectedYear: GroupSection by academicYear + courseGroup + courseYear
  useEffect(() => {
    if (!courseGroupId || !courseYearId || !academicYearId) {
      setSections([]);
      return;
    }
    let cancelled = false;
    void listGroupSectionsForTakeProxy({
      academicYearId,
      courseGroupId,
      courseYearId,
    })
      .then((rows) => {
        if (cancelled) return;
        setSections(
          rows.map((s) => {
            const id = Number(s.groupSectionId ?? 0);
            const section = String(s.section ?? s.groupSectionName ?? id);
            return {
              value: String(id),
              label: section,
              section,
              groupCode: String(s.groupCode ?? ""),
              courseYearName: String(s.courseYearName ?? ""),
            } satisfies SectionOpt;
          }),
        );
      })
      .catch(() => {
        if (!cancelled) setSections([]);
      });
    return () => {
      cancelled = true;
    };
  }, [academicYearId, courseGroupId, courseYearId]);

  function onAudienceTypeChange(nextId: number | null) {
    setAudienceTypeId(nextId);
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setSectionIds([]);
    setDepartmentId(null);
    setCourseGroups([]);
    setCourseYears([]);
    setSections([]);

    if (!nextId) {
      setSelectedFlag(false);
      setSelectedFlagDept(false);
      return;
    }
    const code = audienceCodeOf(audienceTypes, nextId);
    if (code === "STD" || code === "Parents") {
      setSelectedFlag(true);
      setSelectedFlagDept(false);
    } else if (code === "TCHNGSTF") {
      setSelectedFlag(false);
      setSelectedFlagDept(true);
      const empDeptId = positiveId(readStorage("empDeptId"));
      if (
        empDeptId > 0 &&
        departments.some((d) => Number(d.value) === empDeptId)
      ) {
        setDepartmentId(empDeptId);
      }
    } else {
      setSelectedFlag(false);
      setSelectedFlagDept(false);
    }
  }

  function onFileChange(files: File[]) {
    setFileTooLarge(false);
    setSelectedFile(null);
    const file = files[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setFileTooLarge(true);
      return;
    }
    setSelectedFile(file);
  }

  function buildStudentCategory(code: string): {
    categoryName: string;
    categoryValue: string | number;
    nextCourseId: number | null;
    ok: boolean;
  } {
    if (!courseId) {
      toastInfo("Select atleast one section.");
      return {
        categoryName: "",
        categoryValue: "",
        nextCourseId: null,
        ok: false,
      };
    }

    const course = courses.find((c) => Number(c.value) === courseId);
    const courseCode = course?.courseCode ?? course?.label ?? "";

    if (sectionIds.length > 0) {
      let categoryName = "";
      let categoryValue = "";
      for (let i = 0; i < sectionIds.length; i++) {
        const sid = Number(sectionIds[i]);
        const sec = sections.find((s) => Number(s.value) === sid);
        if (i === 0) {
          categoryValue = String(sid);
          if (sec) {
            categoryName = `section-(${courseCode}/${sec.groupCode ?? ""}/${sec.courseYearName ?? ""})${sec.section ?? sec.label}`;
          }
        } else {
          categoryValue = `${categoryValue},${sid}`;
          if (sec) {
            categoryName = `${categoryName},${sec.section ?? sec.label}`;
          }
        }
      }
      return {
        categoryName,
        categoryValue,
        nextCourseId: courseId,
        ok: true,
      };
    }

    // Parents require sections (Angular)
    if (code === "Parents") {
      toastInfo("Select atleast one section.");
      return {
        categoryName: "",
        categoryValue: "",
        nextCourseId: null,
        ok: false,
      };
    }

    // STD without sections: year → group → course
    if (courseYearId) {
      const year = courseYears.find((y) => Number(y.value) === courseYearId);
      const group = courseGroups.find((g) => Number(g.value) === courseGroupId);
      const yCode = year?.courseCode || courseCode;
      const gCode = group?.groupCode ?? group?.label ?? "";
      const yName = year?.courseYearName ?? year?.label ?? "";
      return {
        categoryName: `courseYear-(${yCode}/${gCode})${yName}`,
        categoryValue: courseYearId,
        nextCourseId: courseId,
        ok: true,
      };
    }
    if (courseGroupId) {
      const group = courseGroups.find((g) => Number(g.value) === courseGroupId);
      const gCode = group?.groupCode ?? group?.label ?? "";
      return {
        categoryName: `courseGroup-(${courseCode})${gCode}`,
        categoryValue: courseGroupId,
        nextCourseId: courseId,
        ok: true,
      };
    }
    return {
      categoryName: `course-(${courseCode})`,
      categoryValue: courseId,
      nextCourseId: courseId,
      ok: true,
    };
  }

  function audienceAlreadyExists(
    next: NotificationAudienceRow,
    sectionIdNums: number[],
  ): boolean {
    const existingForType = notificationAudiences.filter(
      (y) => Number(y.audienceTypeId) === Number(next.audienceTypeId),
    );
    if (existingForType.length === 0) return false;

    const first = existingForType[0]!;
    if (first.audienceTypeCode === "ALL") {
      // Angular leaves flag false (no add) without toast for ALL duplicate path
      return true;
    }

    if (first.audienceTypeCode === "TCHNGSTF") {
      return String(first.categoryValue) === String(next.categoryValue);
    }

    if (
      first.audienceTypeCode === "STD" ||
      first.audienceTypeCode === "Parents"
    ) {
      const parts = String(first.categoryValue ?? "")
        .split(",")
        .map((p) => Number(p.trim()))
        .filter((n) => Number.isFinite(n));
      if (sectionIdNums.length > 0) {
        return sectionIdNums.some((id) => parts.includes(id));
      }
      return String(first.categoryValue) === String(next.categoryValue);
    }

    return String(first.categoryValue) === String(next.categoryValue);
  }

  function addAudience() {
    if (!audienceTypeId) {
      toastInfo("Select atleast any audience.");
      return;
    }

    const code = audienceCodeOf(audienceTypes, audienceTypeId);
    const hasCourseOrDept = departmentId != null || courseId != null;
    const isBroad =
      code === "ALL" || code === "NTCHNGSTF" || code === "ALLTCHNGSTF";

    if (!hasCourseOrDept && !isBroad) {
      toastInfo("Select atleast any audience.");
      return;
    }

    let categoryName = "";
    let categoryValue: string | number = "";
    let nextCourseId: number | null = null;
    let pushTypeId = audienceTypeId;
    let pushTypeCode = code;

    if (hasCourseOrDept) {
      if (code === "ALL") {
        categoryName = "all";
        categoryValue = "all";
        nextCourseId = null;
      } else if (code === "TCHNGSTF") {
        const dept = departments.find((d) => Number(d.value) === departmentId);
        categoryName = dept
          ? `department-(${dept.deptCode ?? dept.label})`
          : "department";
        categoryValue = departmentId ?? "";
        nextCourseId = null;
      } else if (code === "STD" || code === "Parents") {
        const built = buildStudentCategory(code);
        if (!built.ok) return;
        categoryName = built.categoryName;
        categoryValue = built.categoryValue;
        nextCourseId = built.nextCourseId;
      } else if (code === "NTCHNGSTF") {
        categoryName = "ALL";
        categoryValue = "ALL";
        nextCourseId = null;
      } else if (code === "ALLTCHNGSTF") {
        categoryName = "All";
        categoryValue = "All";
        nextCourseId = null;
      } else {
        toastInfo("Select atleast any audience.");
        return;
      }
    } else {
      // Broad types without course/dept
      if (code === "ALL") {
        categoryName = "all";
        categoryValue = "all";
      } else if (code === "NTCHNGSTF") {
        categoryName = "ALL";
        categoryValue = "ALL";
      } else if (code === "ALLTCHNGSTF") {
        categoryName = "All";
        categoryValue = "All";
        const teaching = audienceTypes.find(
          (a) => a.generalDetailCode === "TCHNGSTF",
        );
        if (teaching?.generalDetailId) {
          pushTypeId = Number(teaching.generalDetailId);
          pushTypeCode = "TCHNGSTF";
        }
      } else {
        toastInfo("Select atleast any audience.");
        return;
      }
    }

    const course = courses.find((c) => Number(c.value) === nextCourseId);
    const nextRow: NotificationAudienceRow = {
      audienceTypeId: pushTypeId,
      audienceTypeCode: pushTypeCode,
      collegeId,
      courseId: nextCourseId,
      courseName: course?.courseName ?? course?.label ?? null,
      categoryName,
      categoryValue,
      isActive: true,
    };

    const sectionNums = sectionIds
      .map(Number)
      .filter((n) => Number.isFinite(n));
    if (audienceAlreadyExists(nextRow, sectionNums)) {
      toastInfo("Already exists in event audience.");
      return;
    }

    setNotificationAudiences((prev) => [...prev, nextRow]);
    clearAudienceForm();
  }

  async function submit() {
    if (!notificationTitle.trim()) {
      setTitleError("Notification Title is required");
      return;
    }
    setTitleError("");

    const activePlusDeleted = [...notificationAudiences, ...deletedAudiences];
    if (activePlusDeleted.length === 0) {
      toastInfo("Add atleast one event audience.");
      return;
    }

    if (!collegeId || !academicYearId) {
      toastError("College and academic year are required.");
      return;
    }

    setSubmitting(true);
    try {
      let notificationDoc = existing?.notificationDoc ?? null;
      if (notificationDoc != null && String(notificationDoc).includes("cms/")) {
        notificationDoc =
          String(notificationDoc).split("cms/")[1] ?? notificationDoc;
      }

      // Angular: publishDate via momentWithDateFormatYMD; startDate/endDate null when unset
      const publishYmd = formatLeaveYmd(publishDate);
      const endYmd = formatLeaveYmd(notificationEnddate);

      const payload: NotificationSaveRow = {
        ...(existing ?? {}),
        notificationTitle: notificationTitle.trim(),
        description: description || null,
        publishDate: publishYmd,
        notificationEnddate: endYmd,
        startDate: null,
        endDate: null,
        isPublished,
        isAnnouncement,
        isActive,
        reason: isActive ? "active" : reason || "inactive",
        notificationDoc,
        collegeId,
        academicYearId,
        notificationAudiences: activePlusDeleted,
      };
      if (existing?.notificationId) {
        payload.notificationId = existing.notificationId;
        payload.createdDt = existing.createdDt;
      }

      const result = await saveNotifications([payload]);
      if (!result.success) {
        toastError(result.message ?? "Failed to save notification");
        return;
      }

      const newId = result.data;
      if (selectedFile && newId != null && newId !== "") {
        const formData = new FormData();
        formData.append("notificationId", String(newId));
        formData.append("notificationDoc", selectedFile, selectedFile.name);
        try {
          await uploadNotificationDoc(formData);
        } catch (e) {
          toastError(getErrorMessage(e));
        }
      }

      toastSuccess(result.message ?? "Notification saved");
      navigateBack();
    } catch (e) {
      toastError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  const audienceColumns = useMemo(
    () => [
      {
        id: "siNo",
        label: "SI.No",
        width: 10,
        render: (_row: NotificationAudienceRow, index: number) => index + 1,
      },
      {
        id: "audienceTypeCode",
        label: "Audience Type",
        width: 25,
        render: (r: NotificationAudienceRow) => r.audienceTypeCode ?? "—",
      },
      {
        id: "categoryName",
        label: "Category",
        width: 55,
        render: (r: NotificationAudienceRow) => r.categoryName ?? "—",
      },
      {
        id: "actions",
        label: "Actions",
        width: 10,
        render: (row: NotificationAudienceRow, index: number) => (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-destructive"
            onClick={() => setDeleteTarget({ row, index })}
            aria-label="Delete Notification Audience"
          >
            <Trash2Icon className="h-3.5 w-3.5" />
          </Button>
        ),
      },
    ],
    [],
  );

  const docHrefResolved = existing?.notificationDoc
    ? docHref(String(existing.notificationDoc))
    : null;

  return (
    <PageContainer>
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="app-data-table-heading flex items-center gap-2 px-5 pt-5 pb-3">
          <Bell className="h-5 w-5 text-foreground" aria-hidden />
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {dialogTitle}
          </h2>
        </div>

        <div className="space-y-4 px-5 py-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <DatePicker
                  label="Notification Date"
                  value={publishDate}
                  onChange={(d) => {
                    if (!d) return;
                    setPublishDate(d);
                    if (notificationEnddate.getTime() < d.getTime()) {
                      setNotificationEnddate(d);
                    }
                  }}
                  clearable={false}
                />
                <DatePicker
                  label="End Date"
                  value={notificationEnddate}
                  onChange={(d) => {
                    if (!d) return;
                    setNotificationEnddate(d);
                  }}
                  minDate={publishDate}
                  clearable={false}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="notificationTitle" className="text-[12px]">
                  Notification Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="notificationTitle"
                  className="h-9 text-[12px]"
                  placeholder="Enter notification title"
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                />
                {titleError ? (
                  <p className="text-xs text-destructive">{titleError}</p>
                ) : null}
              </div>

              <div className="space-y-1">
                <Label htmlFor="description" className="text-[12px]">
                  Description
                </Label>
                <Textarea
                  id="description"
                  rows={4}
                  className="h-auto min-h-[96px] resize-y text-[12px]"
                  placeholder="Enter description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isAnnouncement"
                    checked={isAnnouncement}
                    onCheckedChange={(v) => setIsAnnouncement(v === true)}
                  />
                  <Label
                    htmlFor="isAnnouncement"
                    className="cursor-pointer text-[12px]"
                  >
                    Announcement
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isActive"
                    checked={isActive}
                    onCheckedChange={(v) => {
                      const next = v === true;
                      setIsActive(next);
                      if (next) setReason("active");
                    }}
                  />
                  <Label
                    htmlFor="isActive"
                    className="cursor-pointer text-[12px]"
                  >
                    Active
                  </Label>
                </div>
              </div>

              {!isActive ? (
                <div className="space-y-1">
                  <Label htmlFor="reason" className="text-[12px]">
                    Reason
                  </Label>
                  <Input
                    id="reason"
                    className="h-9 text-[12px]"
                    placeholder="Enter reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
              ) : null}

              <div className="space-y-1">
                <Label className="text-[12px]">Attachment</Label>
                <FileDropzone
                  accept=".png,.jpg,.jpeg,.pdf,.doc"
                  onFilesChange={onFileChange}
                  className="max-w-full"
                >
                  <div className="flex items-center gap-2 text-[12px] text-slate-700">
                    <Upload
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span>
                      Drag &amp; drop a file here, or click to browse
                      <span className="text-muted-foreground">
                        {" "}
                        (PNG, JPG, PDF, DOC)
                      </span>
                    </span>
                  </div>
                </FileDropzone>
                {selectedFile ? (
                  <div className="mt-2 inline-flex max-w-full items-center rounded-md border border-dashed border-input bg-muted/40 px-2.5 py-1.5">
                    <div className="inline-flex min-w-0 items-center gap-1.5">
                      <FileIcon
                        className="h-4 w-4 shrink-0 text-emerald-600"
                        aria-hidden
                      />
                      <p className="truncate text-xs text-slate-700">
                        {selectedFile.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setFileTooLarge(false);
                        }}
                        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-slate-200 hover:text-slate-700"
                        aria-label="Remove selected file"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : null}
                {docHrefResolved ? (
                  <a
                    href={docHrefResolved}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block text-[12px] font-medium text-blue-600 underline"
                  >
                    Notification Doc
                  </a>
                ) : null}
                {!fileTooLarge ? (
                  <p className="mt-2 text-[12px] font-bold text-green-600">
                    File size should not greater than 24MB
                  </p>
                ) : (
                  <p className="mt-2 text-[12px] font-bold text-[coral]">
                    File size is greater than 24MB
                  </p>
                )}
              </div>

              <div className="rounded-[5px] border-2 border-[#60c7f6] p-3">
                <div className="border-b border-[#ffcf46] pb-2">
                  <strong className="text-[13px]">Notification Audience</strong>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Select
                    label="Notification Audience *"
                    value={audienceTypeId ? String(audienceTypeId) : null}
                    onChange={(v) => onAudienceTypeChange(v ? Number(v) : null)}
                    options={audienceTypeOptions}
                    searchable
                  />
                </div>

                {selectedFlag ? (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <Select
                      label="Course"
                      value={courseId ? String(courseId) : null}
                      onChange={(v) => {
                        setCourseId(v ? Number(v) : null);
                        setCourseGroupId(null);
                        setCourseYearId(null);
                        setSectionIds([]);
                        setSections([]);
                      }}
                      options={courses}
                      searchable
                      clearable
                    />
                    <Select
                      label="Course Group"
                      value={courseGroupId ? String(courseGroupId) : null}
                      onChange={(v) => {
                        setCourseGroupId(v ? Number(v) : null);
                        setCourseYearId(null);
                        setSectionIds([]);
                        setSections([]);
                      }}
                      options={courseGroups}
                      searchable
                      clearable
                    />
                    <Select
                      label="Course Year"
                      value={courseYearId ? String(courseYearId) : null}
                      onChange={(v) => {
                        setCourseYearId(v ? Number(v) : null);
                        setSectionIds([]);
                      }}
                      options={courseYears}
                      searchable
                      clearable
                    />
                    <MultiSelect
                      label="Section"
                      value={sectionIds}
                      onChange={setSectionIds}
                      options={sections}
                    />
                  </div>
                ) : null}

                {selectedFlagDept ? (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <Select
                      label="Department"
                      value={departmentId ? String(departmentId) : null}
                      onChange={(v) => setDepartmentId(v ? Number(v) : null)}
                      options={departments}
                      searchable
                      clearable
                    />
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-4 text-[12px]"
                    onClick={clearAudienceForm}
                  >
                    Clear
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 px-4 text-[12px]"
                    onClick={addAudience}
                  >
                    Add
                  </Button>
                </div>

                {notificationAudiences.length > 0 ? (
                  <div className="mt-4">
                    <Table
                      rows={notificationAudiences}
                      columns={audienceColumns}
                      pageSize={0}
                      density="compact"
                    />
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 min-w-[100px] text-[12px]"
                  onClick={navigateBack}
                  disabled={submitting}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  className="h-9 min-w-[140px] text-[12px]"
                  onClick={() => void submit()}
                  disabled={submitting}
                >
                  {submitting ? "Sending…" : "Send Notification"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget != null}
        title="Confirm Delete"
        description="Delete this notification audience?"
        confirmLabel="Delete"
        confirmVariant="destructive"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          const { row, index } = deleteTarget;
          if (row.notificationAudienceId) {
            setDeletedAudiences((prev) => [
              ...prev,
              { ...row, isActive: false },
            ]);
          }
          setNotificationAudiences((prev) =>
            prev.filter((_, i) => i !== index),
          );
          setDeleteTarget(null);
        }}
      />
    </PageContainer>
  );
}
