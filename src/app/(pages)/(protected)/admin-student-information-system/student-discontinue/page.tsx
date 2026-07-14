"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { User } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { DataTable } from "@/common/components/table";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { DatePicker } from "@/common/components/date-picker";
import { FormModal } from "@/common/components/feedback";
import { StatusBadge } from "@/common/components/data-display";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSessionContext } from "@/context/SessionContext";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  listAcademicYearsForReadmissionWithProcFallback,
  listActiveOrganizations,
  listCollegesByOrganization,
  listCourseGroups,
  listCourseGroupsForCourseCascade,
  listStudentCourseYearsByCourse,
  listCoursesByUniversity,
  listCoursesForUniversityCascade,
  listDiscontinuedStudents,
  listGroupSectionsByFilters,
  listStudentsForPromotionPreview,
  normalizeStudentRow,
  resolveUniversityIdForReadmission,
  searchStudentsByKeyword,
  submitStudentDiscontinue,
} from "@/services";
import { StudentSearchSelect } from "@/common/components/student-search";

type AnyRow = Record<string, any>;

const SEARCH_ONLY_TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

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

function studentId(row: AnyRow, index: number): number {
  const id = pickNum(row, ["studentId", "fk_student_id", "student_id", "id"]);
  return id > 0 ? id : index + 1;
}

function toIsoDate(d: Date | null): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const TAB_TRIGGER_CLASS =
  "rounded-none border-b-2 border-transparent px-4 py-2.5 text-[13px] font-medium whitespace-nowrap data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none";

function statusUpper(row: AnyRow): string {
  return String(row.studentStatusCode ?? row.student_status_code ?? "")
    .trim()
    .toUpperCase();
}

function buildDiscontinuePayload(
  row: AnyRow,
  reason: string,
  isoDate: string,
): Record<string, unknown> {
  return {
    studentId: pickNum(row, ["studentId", "fk_student_id", "student_id"]),
    collegeId: pickNum(row, ["collegeId", "fk_college_id", "college_id"]),
    academicYearId: pickNum(row, [
      "academicYearId",
      "fk_academic_year_id",
      "acdmYearId",
    ]),
    courseId: pickNum(row, ["courseId", "fk_course_id"]),
    courseGroupId: pickNum(row, ["courseGroupId", "fk_course_group_id"]),
    courseYearId: pickNum(row, ["courseYearId", "fk_course_year_id"]),
    groupSectionId: pickNum(row, [
      "groupSectionId",
      "fk_group_section_id",
      "group_section_id",
    ]),
    quotaId: pickNum(row, ["quotaId", "fk_quota_id"]),
    regulationId: pickNum(row, ["regulationId", "fk_regulation_id"]),
    reason: reason.trim(),
    fromDate: isoDate,
    toDate: isoDate,
  };
}

function studentDetailsLine(row: AnyRow): string {
  return [
    pickText(row, ["collegeCode"]),
    pickText(row, ["courseCode"]),
    pickText(row, ["groupCode"]),
    pickText(row, ["courseYearName"]),
    pickText(row, ["section", "sectionName"]),
  ]
    .filter(Boolean)
    .join(" | ");
}

function studentSearchText(row: AnyRow): string {
  return [
    pickText(row, ["hallticketNumber", "rollNumber"]),
    pickText(row, ["firstName", "studentName"]),
    studentDetailsLine(row),
    pickText(row, ["mobile", "mobileNumber"]),
    pickText(row, ["reason"]),
  ]
    .filter(Boolean)
    .join(" ");
}

function photoRenderer(_p: ICellRendererParams<AnyRow>) {
  return (
    <div className="my-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-slate-100 text-muted-foreground">
      <User className="h-5 w-5" strokeWidth={1.75} aria-hidden />
    </div>
  );
}

function studentInfoRenderer(p: ICellRendererParams<AnyRow>) {
  const row = p.data;
  if (!row) return null;
  return (
    <div className="leading-snug py-2">
      <div className="font-medium text-slate-900">
        {pickText(row, ["hallticketNumber", "rollNumber"])},{" "}
        {pickText(row, ["firstName", "studentName"])}
      </div>
      <div className="text-slate-600">{studentDetailsLine(row) || "-"}</div>
      <div className="text-slate-600">
        {pickText(row, ["mobile", "mobileNumber"]) || "-"}
      </div>
    </div>
  );
}

function makeDiscontinueActionRenderer(onOpen: (row: AnyRow) => void) {
  return (p: ICellRendererParams<AnyRow>) => {
    const row = p.data;
    if (!row) return null;
    const already = statusUpper(row) === "DISCONTINUED";
    if (already) {
      return (
        <div className="py-2">
          <StatusBadge status="inactive" label="DISCONTINUED" />
        </div>
      );
    }
    return (
      <div className="py-2">
        <Button
          type="button"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onOpen(row)}
        >
          Discontinue
        </Button>
      </div>
    );
  };
}

export default function StudentDiscontinuePage() {
  const { user } = useSessionContext();

  const [mainTab, setMainTab] = useState<"discontinue" | "list">("discontinue");
  const [searchMode, setSearchMode] = useState<"student" | "section">(
    "student",
  );

  const [organizations, setOrganizations] = useState<AnyRow[]>([]);
  const [colleges, setColleges] = useState<AnyRow[]>([]);
  const [academicYears, setAcademicYears] = useState<AnyRow[]>([]);
  const [courses, setCourses] = useState<AnyRow[]>([]);
  const [courseGroups, setCourseGroups] = useState<AnyRow[]>([]);
  const [courseYears, setCourseYears] = useState<AnyRow[]>([]);
  const [sections, setSections] = useState<AnyRow[]>([]);

  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [groupSectionId, setGroupSectionId] = useState<number | null>(null);

  const [tableRows, setTableRows] = useState<AnyRow[]>([]);
  const [discRows, setDiscRows] = useState<AnyRow[]>([]);

  const [studentOptions, setStudentOptions] = useState<AnyRow[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null,
  );
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingSectionStudents, setLoadingSectionStudents] = useState(false);
  const [loadingDisc, setLoadingDisc] = useState(false);

  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingColleges, setLoadingColleges] = useState(false);

  /** College row often omits universityId; async resolve in loadAy — courses need this for listCoursesByUniversity */
  const [resolvedUniversityId, setResolvedUniversityId] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalRow, setModalRow] = useState<AnyRow | null>(null);
  const [modalFrom, setModalFrom] = useState<Date | null>(null);
  const [modalReason, setModalReason] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const defaultAcademicYearId = useMemo(
    () => Number(user?.academicYearId ?? 0),
    [user?.academicYearId],
  );

  const univId = useMemo(() => {
    const c = colleges.find(
      (x) => pickNum(x, ["collegeId", "fk_college_id"]) === collegeId,
    );
    return c ? pickNum(c, ["universityId", "fk_university_id", "univId"]) : 0;
  }, [colleges, collegeId]);

  const effectiveUnivId = useMemo(
    () => univId || resolvedUniversityId,
    [univId, resolvedUniversityId],
  );

  useEffect(() => {
    async function load() {
      setLoadingOrgs(true);
      try {
        const rows = await listActiveOrganizations();
        setOrganizations(Array.isArray(rows) ? rows : []);
        if (rows?.length) {
          const first = pickNum(rows[0], [
            "organizationId",
            "fk_organization_id",
          ]);
          setOrganizationId((prev) => prev ?? first);
        }
      } catch (e) {
        toastError(e, "Failed to load organizations");
        setOrganizations([]);
      } finally {
        setLoadingOrgs(false);
      }
    }
    void load();
  }, []);

  useEffect(() => {
    async function load() {
      if (!organizationId) {
        setColleges([]);
        setCollegeId(null);
        return;
      }
      setLoadingColleges(true);
      try {
        const rows = await listCollegesByOrganization(organizationId);
        const arr = Array.isArray(rows) ? rows : [];
        setColleges(arr);
        if (arr.length) {
          const cid = pickNum(arr[0], ["collegeId", "fk_college_id"]);
          setCollegeId(cid);
        } else setCollegeId(null);
      } catch (e) {
        toastError(e, "Failed to load colleges");
        setColleges([]);
        setCollegeId(null);
      } finally {
        setLoadingColleges(false);
      }
    }
    void load();
  }, [organizationId]);

  useEffect(() => {
    setResolvedUniversityId(0);
  }, [collegeId]);

  const resetCascadeFromAy = useCallback(() => {
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setGroupSectionId(null);
    setCourses([]);
    setCourseGroups([]);
    setCourseYears([]);
    setSections([]);
    setTableRows([]);
  }, []);

  const resetCascadeFromCourse = useCallback(() => {
    setCourseGroupId(null);
    setCourseYearId(null);
    setGroupSectionId(null);
    setCourseGroups([]);
    setCourseYears([]);
    setSections([]);
    setTableRows([]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadAy() {
      if (!collegeId) {
        setAcademicYears([]);
        setAcademicYearId(null);
        setResolvedUniversityId(0);
        return;
      }
      try {
        let resolvedUniv = univId;
        if (!resolvedUniv) {
          resolvedUniv = await resolveUniversityIdForReadmission(
            { collegeId },
            0,
          );
        }
        if (!cancelled)
          setResolvedUniversityId(resolvedUniv > 0 ? resolvedUniv : 0);
        const orgForAy = Number(organizationId ?? user?.organizationId ?? 0);
        const empForAy = Number(user?.employeeId ?? 0);
        const rows = await listAcademicYearsForReadmissionWithProcFallback(
          resolvedUniv,
          collegeId,
          orgForAy,
          empForAy,
        );
        if (cancelled) return;
        const list = Array.isArray(rows) ? rows : [];
        setAcademicYears(list);
        const ids = list.map((r) =>
          pickNum(r, ["academicYearId", "fk_academic_year_id"]),
        );
        setAcademicYearId((prev) => {
          if (prev && ids.includes(prev)) return prev;
          if (defaultAcademicYearId > 0 && ids.includes(defaultAcademicYearId))
            return defaultAcademicYearId;
          if (list.length)
            return pickNum(list[0], ["academicYearId", "fk_academic_year_id"]);
          return null;
        });
      } catch {
        if (!cancelled) {
          setAcademicYears([]);
          setAcademicYearId(null);
          setResolvedUniversityId(0);
        }
      }
    }
    void loadAy();
    return () => {
      cancelled = true;
    };
  }, [
    collegeId,
    univId,
    organizationId,
    defaultAcademicYearId,
    user?.organizationId,
    user?.employeeId,
    mainTab,
  ]);

  useEffect(() => {
    resetCascadeFromAy();
  }, [collegeId, resetCascadeFromAy]);

  useEffect(() => {
    async function loadCourses() {
      const uid = effectiveUnivId;
      if (!uid || !academicYearId) {
        setCourses([]);
        setCourseId(null);
        return;
      }
      try {
        let rows = await listCoursesByUniversity(uid).catch(() => []);
        if (!Array.isArray(rows) || rows.length === 0) {
          rows = await listCoursesForUniversityCascade(uid);
        }
        setCourses(Array.isArray(rows) ? rows : []);
        if (rows?.length) {
          setCourseId(pickNum(rows[0], ["courseId", "fk_course_id"]));
        } else setCourseId(null);
      } catch {
        setCourses([]);
        setCourseId(null);
      }
    }
    void loadCourses();
  }, [effectiveUnivId, academicYearId]);

  useEffect(() => {
    resetCascadeFromCourse();
  }, [academicYearId, resetCascadeFromCourse]);

  useEffect(() => {
    async function loadCg() {
      if (!courseId) {
        setCourseGroups([]);
        setCourseGroupId(null);
        return;
      }
      try {
        let rows: AnyRow[] = await listCourseGroups(courseId).catch(() => []);
        if (!Array.isArray(rows) || rows.length === 0) {
          rows = await listCourseGroupsForCourseCascade(courseId);
        }
        setCourseGroups(Array.isArray(rows) ? rows : []);
        if (rows?.length) {
          setCourseGroupId(
            pickNum(rows[0], ["courseGroupId", "fk_course_group_id"]),
          );
        } else setCourseGroupId(null);
      } catch {
        setCourseGroups([]);
        setCourseGroupId(null);
      }
    }
    void loadCg();
  }, [courseId]);

  useEffect(() => {
    async function loadCy() {
      if (!courseId) {
        setCourseYears([]);
        setCourseYearId(null);
        return;
      }
      try {
        const rows = await listStudentCourseYearsByCourse(courseId);
        setCourseYears(Array.isArray(rows) ? rows : []);
        if (rows?.length) {
          setCourseYearId(
            pickNum(rows[0], ["courseYearId", "fk_course_year_id"]),
          );
        } else setCourseYearId(null);
      } catch {
        setCourseYears([]);
        setCourseYearId(null);
      }
    }
    void loadCy();
  }, [courseId, courseGroupId]);

  useEffect(() => {
    async function loadSec() {
      if (!collegeId || !academicYearId || !courseGroupId || !courseYearId) {
        setSections([]);
        setGroupSectionId(null);
        return;
      }
      try {
        const rows = await listGroupSectionsByFilters({
          collegeId,
          academicYearId,
          courseGroupId,
          courseYearId,
        });
        setSections(Array.isArray(rows) ? rows : []);
      } catch {
        setSections([]);
      }
    }
    void loadSec();
  }, [collegeId, academicYearId, courseGroupId, courseYearId]);

  useEffect(() => {
    async function load() {
      if (mainTab !== "list" || !collegeId || !academicYearId) {
        setDiscRows([]);
        return;
      }
      setLoadingDisc(true);
      try {
        const rows = await listDiscontinuedStudents(collegeId, academicYearId);
        setDiscRows(Array.isArray(rows) ? rows : []);
      } catch (e) {
        toastError(e, "Failed to load discontinued list");
        setDiscRows([]);
      } finally {
        setLoadingDisc(false);
      }
    }
    void load();
  }, [mainTab, collegeId, academicYearId]);

  useEffect(() => {
    async function load() {
      if (mainTab !== "discontinue" || searchMode !== "section") return;
      if (!collegeId || !courseGroupId || !groupSectionId) {
        setTableRows([]);
        return;
      }
      setLoadingSectionStudents(true);
      try {
        const rows = await listStudentsForPromotionPreview({
          collegeId,
          courseGroupId,
          groupSectionId,
        });
        setTableRows(
          (Array.isArray(rows) ? rows : []).map((r) => ({
            ...normalizeStudentRow(r),
            ...r,
          })),
        );
      } catch (e) {
        toastError(e, "Failed to load students");
        setTableRows([]);
      } finally {
        setLoadingSectionStudents(false);
      }
    }
    void load();
  }, [mainTab, searchMode, collegeId, courseGroupId, groupSectionId]);

  useEffect(() => {
    if (searchMode !== "student" || !selectedStudentId) {
      if (searchMode === "student") setTableRows([]);
      return;
    }
    const match = studentOptions.find(
      (r, i) => studentId(r, i) === selectedStudentId,
    );
    if (match) {
      setTableRows([{ ...normalizeStudentRow(match), ...match }]);
    }
  }, [searchMode, selectedStudentId, studentOptions]);

  async function onSearchStudents(term: string) {
    const q = term.trim();
    if (q.length === 0) {
      setStudentOptions([]);
      return;
    }
    if (q.length < 5) return;
    setLoadingStudents(true);
    try {
      const rows = await searchStudentsByKeyword(q).catch(() => []);
      setStudentOptions(Array.isArray(rows) ? rows : []);
    } finally {
      setLoadingStudents(false);
    }
  }

  function onStudentSelect(nextId: number | null, match: AnyRow | null) {
    setSelectedStudentId(nextId);
    if (!nextId || !match) {
      setTableRows([]);
      return;
    }
    setTableRows([{ ...normalizeStudentRow(match), ...match }]);
  }

  function openModal(row: AnyRow) {
    setModalRow(row);
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setModalFrom(d);
    setModalReason("");
    setModalOpen(true);
  }

  async function onModalSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!modalRow || !modalFrom) {
      toastError(new Error("Date is required"), "Discontinue");
      return;
    }
    const r = modalReason.trim();
    if (!r) {
      toastError(new Error("Reason is required"), "Discontinue");
      return;
    }
    const iso = toIsoDate(modalFrom);
    const payload = [buildDiscontinuePayload(modalRow, r, iso)];
    setModalSubmitting(true);
    try {
      await submitStudentDiscontinue(payload);
      toastSuccess("Student discontinued successfully");
      setModalOpen(false);
      setModalRow(null);
      if (mainTab === "list" && collegeId && academicYearId) {
        const rows = await listDiscontinuedStudents(collegeId, academicYearId);
        setDiscRows(Array.isArray(rows) ? rows : []);
      }
      if (
        searchMode === "section" &&
        collegeId &&
        courseGroupId &&
        groupSectionId
      ) {
        const rows = await listStudentsForPromotionPreview({
          collegeId,
          courseGroupId,
          groupSectionId,
        });
        setTableRows(
          (Array.isArray(rows) ? rows : []).map((x) => ({
            ...normalizeStudentRow(x),
            ...x,
          })),
        );
      }
      if (searchMode === "student") {
        setSelectedStudentId(null);
        setStudentOptions([]);
        setTableRows([]);
      }
    } catch (err) {
      toastError(err, "Failed to discontinue");
    } finally {
      setModalSubmitting(false);
    }
  }

  function clearDiscontinue() {
    setSelectedStudentId(null);
    setStudentOptions([]);
    setTableRows([]);
    setGroupSectionId(null);
  }

  const orgOptions = useMemo(
    () =>
      organizations.map((r) => ({
        value: String(pickNum(r, ["organizationId", "fk_organization_id"])),
        label:
          pickText(r, ["orgCode", "organizationCode", "organizationName"]) ||
          "Organization",
      })),
    [organizations],
  );
  const collegeOptions = useMemo(
    () =>
      colleges.map((r) => ({
        value: String(pickNum(r, ["collegeId", "fk_college_id"])),
        label:
          pickText(r, ["collegeCode", "college_code", "collegeName"]) ||
          "College",
      })),
    [colleges],
  );
  const ayOptions = useMemo(
    () =>
      academicYears
        .map((r) => ({
          value: String(
            pickNum(r, [
              "academicYearId",
              "fk_academic_year_id",
              "academic_year_id",
            ]),
          ),
          label:
            pickText(r, [
              "academicYear",
              "academic_year",
              "academic_year_name",
            ]) || "Academic Year",
        }))
        .filter((o) => o.value !== "0" && o.value !== ""),
    [academicYears],
  );
  const courseOpts = useMemo(
    () =>
      courses.map((r) => ({
        value: String(pickNum(r, ["courseId", "fk_course_id"])),
        label:
          pickText(r, ["courseCode", "course_code", "courseName"]) || "Course",
      })),
    [courses],
  );
  const cgOpts = useMemo(
    () =>
      courseGroups.map((r) => ({
        value: String(pickNum(r, ["courseGroupId", "fk_course_group_id"])),
        label: pickText(r, ["groupCode", "group_code", "groupName"]) || "Group",
      })),
    [courseGroups],
  );
  const cyOpts = useMemo(
    () =>
      courseYears.map((r) => ({
        value: String(pickNum(r, ["courseYearId", "fk_course_year_id"])),
        label:
          pickText(r, [
            "courseYearName",
            "course_year_name",
            "courseYearCode",
          ]) || "Year",
      })),
    [courseYears],
  );
  const secOpts = useMemo(
    () =>
      sections.map((r) => ({
        value: String(pickNum(r, ["groupSectionId", "fk_group_section_id"])),
        label:
          pickText(r, ["section", "groupSectionName", "group_section_name"]) ||
          "Section",
      })),
    [sections],
  );

  const selectCls =
    "[&_label]:text-xs [&_label]:font-medium [&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]";

  const discontinueColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "Photo",
        width: 80,
        flex: 0,
        sortable: false,
        autoHeight: true,
        cellRenderer: photoRenderer,
        cellClass: "flex items-center",
      },
      {
        headerName: "Student",
        minWidth: 280,
        flex: 1,
        wrapText: true,
        autoHeight: true,
        valueGetter: (p) => studentSearchText(p.data ?? {}),
        cellRenderer: studentInfoRenderer,
      },
      {
        headerName: "Action",
        width: 140,
        flex: 0,
        sortable: false,
        autoHeight: true,
        cellRenderer: makeDiscontinueActionRenderer(openModal),
        cellClass: "flex items-center",
      },
    ],
    [],
  );

  const discListColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "Photo",
        width: 80,
        flex: 0,
        sortable: false,
        autoHeight: true,
        cellRenderer: photoRenderer,
        cellClass: "flex items-center",
      },
      {
        headerName: "Student",
        minWidth: 280,
        flex: 1,
        wrapText: true,
        autoHeight: true,
        valueGetter: (p) => studentSearchText(p.data ?? {}),
        cellRenderer: studentInfoRenderer,
      },
      {
        headerName: "Reason",
        minWidth: 160,
        autoHeight: true,
        wrapText: true,
        valueGetter: (p) => pickText(p.data, ["reason"]) || "—",
        cellClass: "flex items-center py-2",
      },
    ],
    [],
  );

  const discontinuedListFilters = (
    <GlobalFilterBarRow columns={3}>
      <GlobalFilterField label="Organization">
        <Select
          required
          value={organizationId ? String(organizationId) : null}
          onChange={(v) => setOrganizationId(v ? Number(v) : null)}
          options={orgOptions}
          placeholder="Organization"
          isLoading={loadingOrgs}
          className="[&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]"
        />
      </GlobalFilterField>
      <GlobalFilterField label="College">
        <Select
          required
          value={collegeId ? String(collegeId) : null}
          onChange={(v) => setCollegeId(v ? Number(v) : null)}
          options={collegeOptions}
          placeholder="College"
          isLoading={loadingColleges}
          disabled={!organizationId}
          className="[&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]"
        />
      </GlobalFilterField>
      <GlobalFilterField label="Academic Year">
        <Select
          required
          value={academicYearId ? String(academicYearId) : null}
          onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
          options={ayOptions}
          placeholder="Academic Year"
          disabled={!collegeId}
          className="[&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]"
        />
      </GlobalFilterField>
    </GlobalFilterBarRow>
  );

  return (
    <PageContainer className="space-y-4">
      <Tabs
        value={mainTab}
        onValueChange={(v) => {
          setMainTab(v as "discontinue" | "list");
        }}
      >
        <div className="app-card overflow-hidden" data-no-page-name>
          <div className="overflow-x-auto border-b border-border bg-muted/20">
            <TabsList className="h-auto min-w-max justify-start rounded-none bg-transparent p-0">
              <TabsTrigger value="discontinue" className={TAB_TRIGGER_CLASS}>
                Discontinue
              </TabsTrigger>
              <TabsTrigger value="list" className={TAB_TRIGGER_CLASS}>
                Discontinued List
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="discontinue" className="m-0 p-4 mt-4 space-y-4">
            <Tabs
              value={searchMode}
              onValueChange={(v) => {
                const mode = v as "student" | "section";
                setSearchMode(mode);
                if (mode === "student") {
                  clearDiscontinue();
                } else {
                  setSelectedStudentId(null);
                  setStudentOptions([]);
                  setTableRows([]);
                }
              }}
            >
              <TabsList className="mb-4 h-auto w-full justify-start rounded-none border-b border-border bg-transparent p-0">
                <TabsTrigger value="student" className={TAB_TRIGGER_CLASS}>
                  Search by Student
                </TabsTrigger>
                <TabsTrigger value="section" className={TAB_TRIGGER_CLASS}>
                  Search by Section
                </TabsTrigger>
              </TabsList>

              <TabsContent value="student" className="mt-0">
                <StudentSearchSelect
                  label="Student"
                  placeholder="Search student"
                  value={selectedStudentId}
                  students={studentOptions}
                  selectedStudent={tableRows[0] ?? null}
                  isLoading={loadingStudents}
                  onSearch={(term) => void onSearchStudents(term)}
                  onChange={onStudentSelect}
                />
              </TabsContent>

              <TabsContent value="section" className="mt-0">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  <Select
                    label="Organization"
                    required
                    value={organizationId ? String(organizationId) : null}
                    onChange={(v) => setOrganizationId(v ? Number(v) : null)}
                    options={orgOptions}
                    placeholder="Organization"
                    isLoading={loadingOrgs}
                    className={selectCls}
                  />
                  <Select
                    label="College"
                    required
                    value={collegeId ? String(collegeId) : null}
                    onChange={(v) => setCollegeId(v ? Number(v) : null)}
                    options={collegeOptions}
                    placeholder="College"
                    isLoading={loadingColleges}
                    disabled={!organizationId}
                    className={selectCls}
                  />
                  <Select
                    label="Academic Year"
                    required
                    value={academicYearId ? String(academicYearId) : null}
                    onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
                    options={ayOptions}
                    placeholder="Academic Year"
                    disabled={!collegeId}
                    className={selectCls}
                  />
                  <Select
                    label="Course"
                    required
                    value={courseId ? String(courseId) : null}
                    onChange={(v) => setCourseId(v ? Number(v) : null)}
                    options={courseOpts}
                    placeholder="Course"
                    disabled={!academicYearId}
                    className={selectCls}
                  />
                  <Select
                    label="Course Group"
                    required
                    value={courseGroupId ? String(courseGroupId) : null}
                    onChange={(v) => setCourseGroupId(v ? Number(v) : null)}
                    options={cgOpts}
                    placeholder="Course Group"
                    disabled={!courseId}
                    className={selectCls}
                  />
                  <Select
                    label="Course Year"
                    required
                    value={courseYearId ? String(courseYearId) : null}
                    onChange={(v) => setCourseYearId(v ? Number(v) : null)}
                    options={cyOpts}
                    placeholder="Course Year"
                    disabled={!courseGroupId}
                    className={selectCls}
                  />
                  <Select
                    label="Section"
                    required
                    value={groupSectionId ? String(groupSectionId) : null}
                    onChange={(v) => setGroupSectionId(v ? Number(v) : null)}
                    options={secOpts}
                    placeholder="Section"
                    searchable
                    disabled={!courseYearId || sections.length === 0}
                    className={selectCls}
                  />
                </div>
                {loadingSectionStudents ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Loading students…
                  </p>
                ) : null}
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="list" className="m-0 p-4">
            <DataTable
              title=""
              filters={discontinuedListFilters}
              filtersCollapsible={false}
              rowData={discRows}
              columnDefs={discListColumnDefs}
              loading={loadingDisc}
              pagination
              toolbar={SEARCH_ONLY_TOOLBAR}
            />
          </TabsContent>
        </div>

        {mainTab === "discontinue" && tableRows.length > 0 && (
          <DataTable
            rowData={tableRows}
            columnDefs={discontinueColumnDefs}
            pagination
            toolbar={SEARCH_ONLY_TOOLBAR}
          />
        )}
      </Tabs>

      <FormModal
        open={modalOpen}
        onClose={() => {
          if (!modalSubmitting) {
            setModalOpen(false);
            setModalRow(null);
          }
        }}
        title="Discontinue Reason"
        onSubmit={onModalSubmit}
        isSubmitting={modalSubmitting}
        submitLabel="Save"
        cancelLabel="Close"
        size="md"
      >
        <div className="grid gap-3 py-2">
          <DatePicker
            label="From Date"
            value={modalFrom}
            onChange={setModalFrom}
            placeholder="From date"
            className="max-w-xs"
          />
          <div>
            <label className="text-xs font-medium text-slate-700">Reason</label>
            <textarea
              value={modalReason}
              onChange={(e) => setModalReason(e.target.value)}
              rows={4}
              required
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-[12px]"
              placeholder="Reason"
            />
          </div>
        </div>
      </FormModal>
    </PageContainer>
  );
}
