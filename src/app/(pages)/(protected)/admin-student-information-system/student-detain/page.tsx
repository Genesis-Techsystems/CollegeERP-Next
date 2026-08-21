"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { GraduationCap } from "lucide-react";
import { DataTable } from "@/common/components/table";
import { FormModal } from "@/common/components/feedback";
import { FilteredPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/context/SessionContext";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  listActiveCollegesForGeneralSettings,
  listActiveCourseGroupsByCourse,
  listActiveCourseYearsByCourse,
  listActiveCoursesByUniversity,
  listAcademicYearsByUniversity,
  listEmployeeDataSecurityByEmployeeId,
  listGroupSectionsByFilters,
  listStudentsForPromotionPreview,
  normalizeStudentRow,
  resolveStudentStatusGeneralDetailId,
  searchStudentsByKeyword,
  submitStudentDetain,
  type EmployeeDataSecurity,
} from "@/services";
import { StudentSearchSelect } from "@/common/components/student-search";

type AnyRow = Record<string, any>;

const SEARCH_ONLY_TOOLBAR = {
  search: true,
  searchPlaceholder: "Search",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

const UNIV = ["fk_university_id", "universityId"];
const COL = ["fk_college_id", "collegeId"];
const AY = ["fk_academic_year_id", "academicYearId"];
const CRS = ["fk_course_id", "courseId"];
const GRP = ["fk_course_group_id", "courseGroupId"];
const YR = ["fk_course_year_id", "courseYearId"];
const SEC = [
  "pk_group_section_id",
  "groupSectionId",
  "group_section_id",
  "fk_group_section_id",
];

/** Angular empSecurity → unique colleges for Search By Section. */
function collegesFromEmpSecurity(rows: EmployeeDataSecurity[]): AnyRow[] {
  const seen = new Set<number>();
  const out: AnyRow[] = [];
  for (const r of rows) {
    const id = Number(r.collegeId ?? 0);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const universityId = Number((r as AnyRow).universityId ?? 0);
    out.push({
      collegeId: id,
      fk_college_id: id,
      collegeCode: String(r.collegeCode ?? ""),
      college_code: String(r.collegeCode ?? ""),
      universityId,
      fk_university_id: universityId,
    });
  }
  return out;
}

function dedupeSecurityDim(
  rows: EmployeeDataSecurity[],
  collegeId: number,
  courseId: number | null,
  key: "courseId" | "courseGroupId" | "courseYearId",
): AnyRow[] {
  const seen = new Set<number>();
  const out: AnyRow[] = [];
  for (const r of rows) {
    if (Number(r.collegeId ?? 0) !== collegeId) continue;
    if (courseId && Number(r.courseId ?? 0) !== courseId) continue;
    const id = Number(r[key] ?? 0);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    if (key === "courseId") {
      out.push({
        courseId: id,
        fk_course_id: id,
        courseCode: String(r.courseCode ?? ""),
        course_code: String(r.courseCode ?? ""),
      });
    } else if (key === "courseGroupId") {
      out.push({
        courseGroupId: id,
        fk_course_group_id: id,
        groupCode: String(r.courseGroupCode ?? ""),
        group_code: String(r.courseGroupCode ?? ""),
      });
    } else {
      out.push({
        courseYearId: id,
        fk_course_year_id: id,
        courseYearCode: String(r.courseYearCode ?? ""),
        course_year_code: String(r.courseYearCode ?? ""),
        course_year_name: String(r.courseYearCode ?? ""),
      });
    }
  }
  return out;
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

function studentId(row: AnyRow, fallback: number): number {
  return (
    pickNum(row, [
      "studentId",
      "fk_student_id",
      "student_id",
      "id",
      "studentDetailId",
    ]) || fallback
  );
}

function parseSelectNumber(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function statusCode(row: AnyRow): string {
  return String(row.studentStatusCode ?? row.student_status_code ?? "")
    .trim()
    .toUpperCase();
}

function canDetain(row: AnyRow): boolean {
  const code = statusCode(row);
  if (!code) return true;
  return code !== "DTND" && code !== "DETAINRECOMMENDED";
}

function coursePathLabel(row: AnyRow, fallbackPath: string): string {
  const fromRow = [
    pickText(row, ["collegeCode", "college_code"]),
    pickText(row, ["courseCode", "course_code"]),
    pickText(row, ["groupCode", "group_code", "courseGroupCode"]),
    pickText(row, [
      "courseYearName",
      "course_year_name",
      "courseYearCode",
      "course_year_code",
    ]),
    pickText(row, ["section", "groupSectionName", "group_section_name"]),
  ]
    .filter(Boolean)
    .join("/");
  return fromRow || fallbackPath || "-";
}

function makeSelectRenderer(
  selectedIds: number[],
  onToggle: (id: number, checked: boolean) => void,
) {
  return (p: ICellRendererParams<AnyRow>) => {
    const row = p.data;
    if (!row) return null;
    const sid = studentId(row, (p.node?.rowIndex ?? 0) + 1);
    const disabled = !canDetain(row);
    return (
      <span className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          className="h-4 w-4"
          disabled={disabled}
          checked={selectedIds.includes(sid)}
          onChange={(e) => onToggle(sid, e.target.checked)}
          aria-label={`Select ${pickText(row, ["studentName", "firstName"]) || "student"}`}
        />
        {disabled ? (
          <span className="text-[11px] text-amber-700">{statusCode(row)}</span>
        ) : null}
      </span>
    );
  };
}

// eslint-disable-next-line sonarjs/cognitive-complexity -- Angular student-detain section cascade
export default function StudentDetainPage() {
  const { user } = useSessionContext();
  const employeeId = Number(user?.employeeId ?? 0);

  const [mode, setMode] = useState<"student" | "section">("student");
  const [studentOptions, setStudentOptions] = useState<AnyRow[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null,
  );
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [reasonById, setReasonById] = useState<Record<number, string>>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  /** Angular StudentDetainModal — Submit opens preview; Save POSTs detainrecommended. */
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalRows, setApprovalRows] = useState<AnyRow[]>([]);
  const [approvalFilter, setApprovalFilter] = useState("");

  /** Angular GlobalService.empSecurity$ — drives college / course / group / year when present. */
  const [empSecurity, setEmpSecurity] = useState<EmployeeDataSecurity[]>([]);
  const [colleges, setColleges] = useState<AnyRow[]>([]);
  const [academicYears, setAcademicYears] = useState<AnyRow[]>([]);
  const [courses, setCourses] = useState<AnyRow[]>([]);
  const [courseGroups, setCourseGroups] = useState<AnyRow[]>([]);
  const [courseYears, setCourseYears] = useState<AnyRow[]>([]);
  const [sectionApiRows, setSectionApiRows] = useState<AnyRow[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);

  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [groupSectionId, setGroupSectionId] = useState<number | null>(null);

  const sectionCascadeAutoFill = useRef(true);
  const studentsLoadSeq = useRef(0);

  const selectedRows = useMemo(
    () => rows.filter((row, i) => selectedIds.includes(studentId(row, i + 1))),
    [rows, selectedIds],
  );

  const canSubmit = useMemo(() => {
    if (selectedRows.length === 0 || submitting) return false;
    return selectedRows.every((row, index) => {
      const sid = studentId(row, index + 1);
      return (reasonById[sid] ?? "").trim().length > 0;
    });
  }, [reasonById, selectedRows, submitting]);

  /**
   * Angular student-detain college load:
   * 1) empSecurity unique colleges
   * 2) else domain/list/College?isActive==true (`collegeCrudUrl`)
   * (Not `s_get_collegewisedetails_bycode`.)
   */
  const loadFilters = useCallback(async () => {
    setLoadingFilters(true);
    try {
      const security = employeeId
        ? await listEmployeeDataSecurityByEmployeeId(employeeId).catch(() => [])
        : [];
      const secRows = Array.isArray(security) ? security : [];
      setEmpSecurity(secRows);

      const domainColleges = await listActiveCollegesForGeneralSettings().catch(
        () => [],
      );
      let collegeRows = collegesFromEmpSecurity(secRows);
      if (collegeRows.length === 0) {
        collegeRows = domainColleges.map((c) => ({
          collegeId: c.collegeId,
          fk_college_id: c.collegeId,
          collegeCode: c.collegeCode,
          college_code: c.collegeCode,
          universityId: c.universityId,
          fk_university_id: c.universityId,
          clg_sort_order: c.sortOrder,
        }));
      } else {
        collegeRows = collegeRows.map((c) => {
          const id = pickNum(c, COL);
          const match = domainColleges.find((a) => a.collegeId === id);
          const universityId =
            pickNum(c, UNIV) || Number(match?.universityId ?? 0);
          return {
            ...c,
            universityId,
            fk_university_id: universityId,
            collegeCode:
              pickText(c, ["collegeCode", "college_code"]) ||
              match?.collegeCode ||
              "",
            college_code:
              pickText(c, ["collegeCode", "college_code"]) ||
              match?.collegeCode ||
              "",
            clg_sort_order: match?.sortOrder ?? 0,
          };
        });
        collegeRows.sort(
          (a, b) =>
            (Number(a.clg_sort_order) || 0) - (Number(b.clg_sort_order) || 0),
        );
      }
      setColleges(collegeRows);
    } catch {
      setEmpSecurity([]);
      setColleges([]);
    } finally {
      setLoadingFilters(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (mode === "section") void loadFilters();
  }, [mode, loadFilters]);

  const universityId = useMemo(() => {
    if (!collegeId) return 0;
    const row = colleges.find((r) => pickNum(r, COL) === collegeId);
    return pickNum(row, UNIV);
  }, [colleges, collegeId]);

  useEffect(() => {
    if (mode !== "section" || loadingFilters || colleges.length === 0) return;
    if (!sectionCascadeAutoFill.current) return;
    setCollegeId((prev) =>
      prev && colleges.some((c) => pickNum(c, COL) === prev)
        ? prev
        : pickNum(colleges[0], COL),
    );
  }, [mode, loadingFilters, colleges]);

  // Angular selectedCollege → AcademicYear by universityId, fromDate DESC
  useEffect(() => {
    let cancelled = false;
    async function loadAy() {
      if (!universityId) {
        setAcademicYears([]);
        setAcademicYearId(null);
        return;
      }
      const list = await listAcademicYearsByUniversity(universityId).catch(
        () => [],
      );
      if (cancelled) return;
      setAcademicYears(Array.isArray(list) ? list : []);
    }
    void loadAy();
    return () => {
      cancelled = true;
    };
  }, [universityId]);

  useEffect(() => {
    if (!academicYears.length) {
      setAcademicYearId(null);
      return;
    }
    if (!sectionCascadeAutoFill.current) return;
    setAcademicYearId((prev) =>
      prev && academicYears.some((y) => pickNum(y, AY) === prev)
        ? prev
        : pickNum(academicYears[0], AY),
    );
  }, [academicYears]);

  // Angular selectedAcademicYear → courses from empSecurity, else Course by university
  useEffect(() => {
    let cancelled = false;
    async function loadCourses() {
      if (!collegeId || !universityId) {
        setCourses([]);
        setCourseId(null);
        return;
      }
      let list = dedupeSecurityDim(empSecurity, collegeId, null, "courseId");
      if (list.length === 0) {
        list = await listActiveCoursesByUniversity(universityId).catch(
          () => [],
        );
      }
      if (cancelled) return;
      setCourses(Array.isArray(list) ? list : []);
    }
    void loadCourses();
    return () => {
      cancelled = true;
    };
  }, [collegeId, universityId, empSecurity]);

  useEffect(() => {
    if (!courses.length) {
      setCourseId(null);
      return;
    }
    if (!sectionCascadeAutoFill.current) return;
    setCourseId((prev) =>
      prev && courses.some((c) => pickNum(c, CRS) === prev)
        ? prev
        : pickNum(courses[0], CRS),
    );
  }, [courses]);

  // Angular selectedCourse → course groups from empSecurity, else CourseGroup by course
  useEffect(() => {
    let cancelled = false;
    async function loadGroups() {
      if (!collegeId || !courseId) {
        setCourseGroups([]);
        setCourseGroupId(null);
        return;
      }
      let list = dedupeSecurityDim(
        empSecurity,
        collegeId,
        courseId,
        "courseGroupId",
      );
      if (list.length === 0) {
        list = await listActiveCourseGroupsByCourse(courseId).catch(() => []);
      }
      if (cancelled) return;
      setCourseGroups(Array.isArray(list) ? list : []);
    }
    void loadGroups();
    return () => {
      cancelled = true;
    };
  }, [collegeId, courseId, empSecurity]);

  useEffect(() => {
    if (!courseGroups.length) {
      setCourseGroupId(null);
      return;
    }
    if (!sectionCascadeAutoFill.current) return;
    setCourseGroupId((prev) =>
      prev && courseGroups.some((g) => pickNum(g, GRP) === prev)
        ? prev
        : pickNum(courseGroups[0], GRP),
    );
  }, [courseGroups]);

  // Angular selectedGroup → course years from empSecurity, else CourseYear by course ASC
  useEffect(() => {
    let cancelled = false;
    async function loadYears() {
      if (!collegeId || !courseId || !courseGroupId) {
        setCourseYears([]);
        setCourseYearId(null);
        return;
      }
      let list = dedupeSecurityDim(
        empSecurity,
        collegeId,
        courseId,
        "courseYearId",
      );
      if (list.length === 0) {
        list = await listActiveCourseYearsByCourse(courseId).catch(() => []);
      }
      if (cancelled) return;
      setCourseYears(Array.isArray(list) ? list : []);
    }
    void loadYears();
    return () => {
      cancelled = true;
    };
  }, [collegeId, courseId, courseGroupId, empSecurity]);

  useEffect(() => {
    if (!courseYears.length) {
      setCourseYearId(null);
      return;
    }
    if (!sectionCascadeAutoFill.current) return;
    setCourseYearId((prev) =>
      prev && courseYears.some((y) => pickNum(y, YR) === prev)
        ? prev
        : pickNum(courseYears[0], YR),
    );
  }, [courseYears]);

  // Angular selectedYear → GroupSection by courseYear + academicYear + courseGroup
  useEffect(() => {
    let cancelled = false;
    async function loadSections() {
      if (!collegeId || !courseGroupId || !courseYearId || !academicYearId) {
        setSectionApiRows([]);
        return;
      }
      const apiRows = await listGroupSectionsByFilters({
        collegeId,
        academicYearId,
        courseGroupId,
        courseYearId,
      }).catch(() => []);
      if (cancelled) return;
      setSectionApiRows(Array.isArray(apiRows) ? apiRows : []);
    }
    void loadSections();
    return () => {
      cancelled = true;
    };
  }, [collegeId, courseGroupId, courseYearId, academicYearId]);

  const sectionOpts = useMemo(
    () =>
      sectionApiRows.map((r) => ({
        value: String(pickNum(r, SEC)),
        label:
          pickText(r, ["section", "group_section_name", "groupSectionName"]) ||
          `Section ${pickNum(r, SEC)}`,
      })),
    [sectionApiRows],
  );

  const loadStudentsBySection = useCallback(async () => {
    if (!collegeId || !courseGroupId || !groupSectionId) {
      setRows([]);
      setSelectedIds([]);
      setReasonById({});
      return;
    }
    const seq = ++studentsLoadSeq.current;
    setLoadingRows(true);
    try {
      const fetched = await listStudentsForPromotionPreview({
        collegeId,
        courseGroupId,
        groupSectionId,
      });
      if (seq !== studentsLoadSeq.current) return;
      const normalized = (Array.isArray(fetched) ? fetched : []).map((row) =>
        normalizeStudentRow(row),
      );
      setRows(normalized);
      setSelectedIds([]);
      setReasonById({});
    } catch {
      if (seq !== studentsLoadSeq.current) return;
      setRows([]);
      setSelectedIds([]);
      setReasonById({});
    } finally {
      if (seq === studentsLoadSeq.current) setLoadingRows(false);
    }
  }, [collegeId, courseGroupId, groupSectionId]);

  useEffect(() => {
    if (mode !== "section") return;
    if (!groupSectionId) {
      setRows([]);
      setSelectedIds([]);
      setReasonById({});
      return;
    }
    void loadStudentsBySection();
  }, [mode, groupSectionId, loadStudentsBySection]);

  function clearSectionCascade() {
    setRows([]);
    setGroupSectionId(null);
    setSelectedIds([]);
    setReasonById({});
  }

  function resetSectionFilters() {
    sectionCascadeAutoFill.current = true;
    setCollegeId(null);
    setAcademicYearId(null);
    setCourseId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setGroupSectionId(null);
    setSectionApiRows([]);
    setRows([]);
    setSelectedIds([]);
    setReasonById({});
  }

  async function onSearchStudents(term: string) {
    const q = term.trim();
    if (q.length === 0) {
      setStudentOptions([]);
      return;
    }
    if (q.length < 5) return;
    setLoadingStudents(true);
    try {
      const fetched = await searchStudentsByKeyword(q).catch(() => []);
      setStudentOptions(Array.isArray(fetched) ? fetched : []);
    } finally {
      setLoadingStudents(false);
    }
  }

  function onStudentSelect(nextId: number | null, match: AnyRow | null) {
    setSelectedStudentId(nextId);
    if (!nextId || !match) {
      setRows([]);
      setSelectedIds([]);
      setReasonById({});
      return;
    }
    setRows([normalizeStudentRow(match)]);
    setSelectedIds([]);
    setReasonById({});
  }

  function toggleSelected(id: number, checked: boolean) {
    setSelectedIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  }

  function setReason(id: number, reason: string) {
    setReasonById((prev) => ({ ...prev, [id]: reason }));
  }

  const filterCoursePath = useMemo(() => {
    const college =
      pickText(
        colleges.find((c) => pickNum(c, COL) === collegeId),
        ["collegeCode", "college_code"],
      ) || "";
    const course =
      pickText(
        courses.find((c) => pickNum(c, CRS) === courseId),
        ["courseCode", "course_code"],
      ) || "";
    const group =
      pickText(
        courseGroups.find((g) => pickNum(g, GRP) === courseGroupId),
        ["groupCode", "group_code", "courseGroupCode"],
      ) || "";
    const year =
      pickText(
        courseYears.find((y) => pickNum(y, YR) === courseYearId),
        [
          "courseYearName",
          "course_year_name",
          "courseYearCode",
          "course_year_code",
        ],
      ) || "";
    const section =
      sectionOpts.find((s) => s.value === String(groupSectionId ?? ""))
        ?.label || "";
    return [college, course, group, year, section].filter(Boolean).join("/");
  }, [
    colleges,
    collegeId,
    courses,
    courseId,
    courseGroups,
    courseGroupId,
    courseYears,
    courseYearId,
    sectionOpts,
    groupSectionId,
  ]);

  /** Angular `openDialog()` — open approval list; do not POST yet. */
  function openApprovalDialog() {
    if (!canSubmit) return;
    const selected = rows.filter((row, i) =>
      selectedIds.includes(studentId(row, i + 1)),
    );
    if (selected.length === 0) return;

    const nowIso = new Date().toISOString();
    setApprovalRows(
      selected.map((row, i) => {
        const sid = studentId(row, i + 1);
        return {
          ...row,
          studentId: sid,
          firstName:
            pickText(row, ["firstName", "studentName", "student_name"]) || "",
          rollNumber:
            pickText(row, [
              "rollNumber",
              "hallticketNumber",
              "admissionNumber",
            ]) || "",
          reason: (reasonById[sid] ?? "").trim(),
          isPresent: true,
          isActive: true,
          fromDate: nowIso,
          toDate: nowIso,
          studentStatusCode: "DETAINRECOMMENDED",
          _coursePath: coursePathLabel(row, filterCoursePath),
        };
      }),
    );
    setApprovalFilter("");
    setApprovalOpen(true);
  }

  const filteredApprovalRows = useMemo(() => {
    const q = approvalFilter.trim().toLowerCase();
    if (!q) return approvalRows;
    return approvalRows.filter((row) => {
      const name = pickText(row, [
        "firstName",
        "studentName",
        "student_name",
      ]).toLowerCase();
      const roll = pickText(row, [
        "rollNumber",
        "hallticketNumber",
        "admissionNumber",
      ]).toLowerCase();
      return name.includes(q) || roll.includes(q);
    });
  }, [approvalFilter, approvalRows]);

  /** Angular modal Save → `addMasterDetails(detainrecommended, detainsList)`. */
  async function onSaveApproval() {
    if (approvalRows.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const statusId = await resolveStudentStatusGeneralDetailId(
        "DETAINRECOMMENDED",
      ).catch(() => 0);
      const details = approvalRows.map((row) => {
        const sid = studentId(row, 0);
        const { _coursePath: _path, ...rest } = row;
        return {
          ...rest,
          studentId: sid,
          reason: String(row.reason ?? "").trim(),
          studentStatusCode: "DETAINRECOMMENDED",
          ...(statusId > 0 ? { studentStatusId: statusId } : {}),
          isPresent: true,
          isActive: true,
        };
      });

      await submitStudentDetain(details);

      toastSuccess("Student detain submitted successfully");
      setApprovalOpen(false);
      setApprovalRows([]);
      setApprovalFilter("");

      if (mode === "student") {
        setRows((prev) =>
          prev.map((row, i) =>
            selectedIds.includes(studentId(row, i + 1))
              ? { ...row, studentStatusCode: "DETAINRECOMMENDED" }
              : row,
          ),
        );
      } else if (groupSectionId) {
        await loadStudentsBySection();
      }
      setSelectedIds([]);
      setReasonById({});
    } catch (error) {
      toastError(error, "Failed to submit student detain");
    } finally {
      setSubmitting(false);
    }
  }

  const collegeOpts = colleges.map((r) => ({
    value: String(pickNum(r, COL)),
    label: pickText(r, ["college_code", "collegeCode"]) || "College",
  }));
  const ayOpts = academicYears.map((r) => ({
    value: String(pickNum(r, AY)),
    label:
      pickText(r, ["academic_year", "academicYear"]) || `AY ${pickNum(r, AY)}`,
  }));
  const courseOpts = courses.map((r) => ({
    value: String(pickNum(r, CRS)),
    label: pickText(r, ["course_code", "courseCode"]) || "Course",
  }));
  const groupOpts = courseGroups.map((r) => ({
    value: String(pickNum(r, GRP)),
    label: pickText(r, ["group_code", "groupCode"]) || "Group",
  }));
  const yearOpts = courseYears.map((r) => ({
    value: String(pickNum(r, YR)),
    label:
      pickText(r, [
        "course_year_name",
        "courseYearName",
        "course_year_code",
        "courseYearCode",
      ]) || "Year",
  }));

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "Sl.No",
        valueGetter: rowIndexGetter,
        width: 80,
        flex: 0,
        cellClass: "text-center",
      },
      {
        headerName: "Hallticket No.",
        minWidth: 160,
        flex: 1,
        valueGetter: (p) =>
          pickText(p.data, ["hallticketNumber", "rollNumber"]) || "",
      },
      {
        headerName: "Student Name",
        minWidth: 200,
        flex: 1.4,
        valueGetter: (p) =>
          pickText(p.data, ["studentName", "firstName"]) || "",
      },
      {
        headerName: "Select",
        width: 90,
        flex: 0,
        sortable: false,
        filter: false,
        cellClass: "text-center",
        cellRenderer: makeSelectRenderer(selectedIds, toggleSelected),
      },
    ],
    [selectedIds],
  );

  function switchMode(next: "student" | "section") {
    if (next === mode) return;
    if (next === "student") {
      setMode("student");
      resetSectionFilters();
      setStudentOptions([]);
      setSelectedStudentId(null);
      setRows([]);
      setSelectedIds([]);
      setReasonById({});
      return;
    }
    setMode("section");
    setSelectedStudentId(null);
    setStudentOptions([]);
    setRows([]);
    setSelectedIds([]);
    setReasonById({});
    sectionCascadeAutoFill.current = true;
    void loadFilters();
  }

  return (
    <FilteredPage
      title="Student Detain"
      filterTitle="Student Detain"
      notice={
        <RadioGroup
          value={mode}
          onValueChange={(v) => switchMode(v as "student" | "section")}
          className="flex flex-wrap items-center gap-8 px-1 py-1"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem
              value="student"
              id="detain-mode-student"
              className="h-[18px] w-[18px] border-[#0c51a4] text-[#0c51a4]"
            />
            <Label
              htmlFor="detain-mode-student"
              className="cursor-pointer text-[14px] font-normal text-foreground"
            >
              Search By Student
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem
              value="section"
              id="detain-mode-section"
              className="h-[18px] w-[18px] border-[#0c51a4] text-[#0c51a4]"
            />
            <Label
              htmlFor="detain-mode-section"
              className="cursor-pointer text-[14px] font-normal text-foreground"
            >
              Search By Section
            </Label>
          </div>
        </RadioGroup>
      }
      filters={
        mode === "student" ? (
          <StudentSearchSelect
            label="Student"
            placeholder="Search student"
            value={selectedStudentId}
            students={studentOptions}
            selectedStudent={rows[0] ?? null}
            isLoading={loadingStudents}
            onSearch={(term) => void onSearchStudents(term)}
            onChange={onStudentSelect}
          />
        ) : (
          <GlobalFilterBarRow>
            <GlobalFilterField label="College">
              <Select
                required
                value={collegeId ? String(collegeId) : null}
                options={collegeOpts}
                placeholder="Select College"
                onChange={(v) => {
                  sectionCascadeAutoFill.current = v !== null && v !== "";
                  setCollegeId(parseSelectNumber(v));
                  setCourseId(null);
                  setCourseGroupId(null);
                  setCourseYearId(null);
                  clearSectionCascade();
                }}
                disabled={loadingFilters || !collegeOpts.length}
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField label="Academic Year">
              <Select
                required
                value={academicYearId ? String(academicYearId) : null}
                options={ayOpts}
                placeholder="Select Academic Year"
                onChange={(v) => {
                  sectionCascadeAutoFill.current = v !== null && v !== "";
                  setAcademicYearId(parseSelectNumber(v));
                  clearSectionCascade();
                }}
                disabled={loadingFilters || !ayOpts.length}
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField label="Course">
              <Select
                required
                value={courseId ? String(courseId) : null}
                options={courseOpts}
                placeholder="Select Course"
                onChange={(v) => {
                  sectionCascadeAutoFill.current = v !== null && v !== "";
                  setCourseId(parseSelectNumber(v));
                  setCourseGroupId(null);
                  setCourseYearId(null);
                  clearSectionCascade();
                }}
                disabled={loadingFilters || !courseOpts.length}
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField label="Course Group">
              <Select
                required
                value={courseGroupId ? String(courseGroupId) : null}
                options={groupOpts}
                placeholder="Select Course Group"
                onChange={(v) => {
                  sectionCascadeAutoFill.current = v !== null && v !== "";
                  setCourseGroupId(parseSelectNumber(v));
                  setCourseYearId(null);
                  clearSectionCascade();
                }}
                disabled={loadingFilters || !groupOpts.length}
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField label="Course Year">
              <Select
                required
                value={courseYearId ? String(courseYearId) : null}
                options={yearOpts}
                placeholder="Select Course Year"
                onChange={(v) => {
                  sectionCascadeAutoFill.current = v !== null && v !== "";
                  setCourseYearId(parseSelectNumber(v));
                  clearSectionCascade();
                }}
                disabled={loadingFilters || !yearOpts.length}
                searchable
              />
            </GlobalFilterField>
            <GlobalFilterField label="Section">
              <Select
                required
                value={groupSectionId ? String(groupSectionId) : null}
                options={sectionOpts}
                placeholder="Select Section"
                onChange={(v) => {
                  sectionCascadeAutoFill.current = v !== null && v !== "";
                  setGroupSectionId(parseSelectNumber(v));
                }}
                disabled={
                  loadingFilters || !courseYearId || sectionOpts.length === 0
                }
                searchable
              />
            </GlobalFilterField>
          </GlobalFilterBarRow>
        )
      }
    >
      {loadingRows ? (
        <p className="px-1 text-xs text-muted-foreground">Loading students…</p>
      ) : null}

      {rows.length > 0 ? (
        <div className="app-card angular-filter-card overflow-hidden">
          <div className="angular-filter-card__header">
            <div className="angular-filter-card__title-row">
              <span className="app-card-title">
                <span
                  className="material-icons app-card-title__icon"
                  aria-hidden
                >
                  autorenew
                </span>
                <span className="app-card-title__text">Detain</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="min-w-0 border-b border-[#dee2e6] lg:border-b-0 lg:border-r mr-2">
              <DataTable
                title="Detain"
                subtitle=""
                rowData={rows}
                columnDefs={columnDefs}
                loading={loadingRows}
                pagination={true}
                height="auto"
                bordered={true}
                toolbar={SEARCH_ONLY_TOOLBAR}
              />
            </div>

            <div className="min-h-[300px] flex-col">
              <div className="flex items-center justify-between gap-2 border-b bg-[#ecf3ff] px-4 py-2.5">
                <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-foreground">
                  <GraduationCap
                    className="h-[18px] w-[18px] text-[#0c51a4]"
                    aria-hidden
                  />
                  <span>Selected Student List</span>
                </div>
                <span className="text-[13px] font-bold tabular-nums text-foreground">
                  {selectedRows.length}
                </span>
              </div>
              <div className="flex flex-1 flex-col bg-white p-4 text-[12px]">
                {selectedRows.length === 0 ? (
                  <p className="m-auto text-center text-[13px] text-[#9aa0a6]">
                    No Students Detain.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {selectedRows.map((row, index) => {
                      const sid = studentId(row, index + 1);
                      return (
                        <li
                          key={`selected-${sid}-${index}`}
                          className="space-y-1.5"
                        >
                          <div className="font-medium text-foreground">
                            {pickText(row, ["studentName", "firstName"]) || "-"}{" "}
                            (
                            {pickText(row, [
                              "hallticketNumber",
                              "rollNumber",
                            ]) || "-"}
                            )
                          </div>
                          <textarea
                            value={reasonById[sid] ?? ""}
                            onChange={(e) => setReason(sid, e.target.value)}
                            placeholder="Detain reason"
                            className="w-full rounded border border-[#ccc] bg-white px-2 py-1.5 text-[12px] shadow-none focus:border-[#0c51a4] focus:outline-none focus:ring-1 focus:ring-[#0c51a4]/30"
                            rows={2}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {rows.length > 0 && selectedRows.length > 0 ? (
        <div className="flex justify-end">
          <Button
            type="button"
            className="h-9 px-4 text-[12px]"
            onClick={openApprovalDialog}
            disabled={!canSubmit}
          >
            Submit
          </Button>
        </div>
      ) : null}

      <FormModal
        open={approvalOpen}
        onClose={() => {
          if (!submitting) {
            setApprovalOpen(false);
            setApprovalFilter("");
          }
        }}
        title="Student Detain Request Approval List"
        onSubmit={(e) => {
          e.preventDefault();
          void onSaveApproval();
        }}
        isSubmitting={submitting}
        submitLabel="Save"
        cancelLabel="Close"
        size="lg"
        showHeaderDivider
      >
        <div className="space-y-3">
          <div>
            <Label
              htmlFor="detain-approval-search"
              className="text-[12px] font-medium text-muted-foreground"
            >
              Student Name / Roll Number.
            </Label>
            <input
              id="detain-approval-search"
              type="search"
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value)}
              placeholder="Student Name / Roll Number."
              className="mt-1 h-9 w-full max-w-md rounded-md border border-input bg-background px-3 text-[13px] outline-none focus:border-[#0c51a4] focus:ring-1 focus:ring-[#0c51a4]/30"
            />
          </div>

          <div className="overflow-x-auto rounded border border-[#dee2e6]">
            <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
              <thead className="bg-[#f5f7fa] text-[12px] font-semibold text-foreground">
                <tr>
                  <th className="border-b border-[#dee2e6] px-3 py-2 w-16">
                    Sl No.
                  </th>
                  <th className="border-b border-[#dee2e6] px-3 py-2">
                    Student
                  </th>
                  <th className="border-b border-[#dee2e6] px-3 py-2">
                    Course
                  </th>
                  <th className="border-b border-[#dee2e6] px-3 py-2">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredApprovalRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-6 text-center text-muted-foreground"
                    >
                      No students found.
                    </td>
                  </tr>
                ) : (
                  filteredApprovalRows.map((row, index) => {
                    const name =
                      pickText(row, [
                        "firstName",
                        "studentName",
                        "student_name",
                      ]) || "-";
                    const roll =
                      pickText(row, [
                        "rollNumber",
                        "hallticketNumber",
                        "admissionNumber",
                      ]) || "";
                    return (
                      <tr
                        key={studentId(row, index + 1)}
                        className="border-b border-[#eee] last:border-b-0"
                      >
                        <td className="px-3 py-2.5 tabular-nums">
                          {index + 1}
                        </td>
                        <td className="px-3 py-2.5">
                          <div>{name}</div>
                          {roll ? (
                            <span className="text-[#0c51a4]">({roll})</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5">
                          {String(
                            row._coursePath ??
                              coursePathLabel(row, filterCoursePath),
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {String(row.reason ?? "") || "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </FormModal>
    </FilteredPage>
  );
}
