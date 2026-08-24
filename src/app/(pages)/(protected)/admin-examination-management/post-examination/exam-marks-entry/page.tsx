"use client";

/**
 * Exam Marks Entry — Angular
 * `examination/post-examination/exam-marks-entry`
 *
 * Marks Edit modal exists in Angular TS but Action column is commented out
 * (not reachable). Publish Marks also has no UI in Angular HTML.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Download, GraduationCap, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select as CommonSelect,
  type SelectOption,
} from "@/common/components/select";
import { DatePicker } from "@/common/components/date-picker";
import {
  downloadSecureMarksTemplate,
  getCollegeById,
  getExamMarksEntryFilters,
  getExamMarksEntryRestFilters,
  getExamMarksEntrySubjectMarks,
  getExamMarksEntrySubjects,
  getExamTypeMarkDetailsBundle,
  listExamFeeTypes,
  listExamMarksSetupForEntry,
  listExamStudentInternalMarksForEntry,
  saveInternalMarksEntry,
  searchEmployeesForFacultyDataSecurity,
  uploadSecureExamMarks,
} from "@/services";
import { MINIO_URL } from "@/config/constants/api";
import { USER_ROLES } from "@/config/constants/app";
import { toastError, toastSuccess } from "@/lib/toast";
import { useSecureMarksPrint } from "../secure-exam-marks-entry/_print/useSecureMarksPrint";
import { format, parseISO, isValid } from "date-fns";

type AnyRow = Record<string, any>;

/** Angular CONSTANTS.THEORY / ELECTIVE */
const THEORY_SUBJECT_TYPE_ID = 3;
const ELECTIVE_SUBJECT_TYPE_ID = 4;

function employeeOptionLabel(empNumber: string, firstName?: string | null) {
  const num = String(empNumber ?? "").trim();
  const name = String(firstName ?? "").trim();
  return name ? `${num} (${name})` : num || "Employee";
}

function dedupeBy<T extends AnyRow>(arr: T[], key: string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of arr) {
    const value = String(row?.[key] ?? "");
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(row);
  }
  return out;
}

function numFrom(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const value = row?.[key];
    const num = Number(value);
    if (Number.isFinite(num) && num > 0) return num;
  }
  return 0;
}

function n(v: unknown): number {
  const num = Number(v);
  return Number.isFinite(num) ? num : 0;
}

/** Normalize API / picker values to `yyyy-MM-dd` for payload. */
function toYmd(value: unknown): string {
  if (value instanceof Date) {
    return isValid(value) ? format(value, "yyyy-MM-dd") : "";
  }
  const raw = String(value ?? "").trim();
  if (!raw || raw === "null" || raw === "undefined") return "";
  // Already yyyy-MM-dd (or ISO datetime)
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  // dd/MM/yyyy (Angular mat-datepicker display)
  const dmy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  try {
    const d = new Date(raw);
    return isValid(d) ? format(d, "yyyy-MM-dd") : "";
  } catch {
    return "";
  }
}

function ymdToDate(ymd: string): Date | null {
  const s = toYmd(ymd);
  if (!s) return null;
  try {
    const d = parseISO(s);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

function asBool(v: unknown): boolean {
  return v === true || v === 1 || v === "1" || v === "true";
}

function parseExamDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const raw = String(value).trim();
  if (!raw) return null;
  const iso = parseISO(raw.length >= 10 ? raw.slice(0, 10) : raw);
  if (isValid(iso)) return iso;
  const d = new Date(raw);
  return isValid(d) ? d : null;
}

/** Angular exam-marks-entry: `date:'MMM d, y'` */
function formatExamDateLabel(value: unknown): string {
  const d = parseExamDate(value);
  return d ? format(d, "MMM d, yyyy") : "";
}

function examTypeTags(row: AnyRow): string[] {
  const tags: string[] = [];
  if (asBool(row.is_internal_exam ?? row.isInternalExam)) tags.push("Internal");
  if (asBool(row.is_regular_exam ?? row.isRegularExam)) tags.push("Regular");
  if (asBool(row.is_supply_exam ?? row.isSupplyExam)) tags.push("Supple");
  return tags;
}

/** Label: Exam Name (Dec 22, 2025 - May 6, 2026)(Regular)(Supple) */
function formatExamOptionLabel(row: AnyRow): string {
  const name = String(row.exam_name ?? row.examName ?? "").trim() || "Exam";
  const from = formatExamDateLabel(
    row.from_date ?? row.fromDate ?? row.examFromDate,
  );
  const to = formatExamDateLabel(row.to_date ?? row.toDate ?? row.examToDate);
  const range = from && to ? ` (${from} - ${to})` : "";
  const tags = examTypeTags(row)
    .map((t) => `(${t})`)
    .join("");
  return `${name}${range}${tags}`;
}

function examOptionLabelNode(row: AnyRow) {
  const name = String(row.exam_name ?? row.examName ?? "").trim() || "Exam";
  const from = formatExamDateLabel(
    row.from_date ?? row.fromDate ?? row.examFromDate,
  );
  const to = formatExamDateLabel(row.to_date ?? row.toDate ?? row.examToDate);
  const range = from && to ? ` (${from} - ${to})` : "";
  return (
    <span>
      {name}
      {range}
      {examTypeTags(row).map((t) => (
        <span key={t} className="font-medium text-[#0014ff]">
          ({t})
        </span>
      ))}
    </span>
  );
}

function parseUserRoles(): string[] {
  try {
    const raw =
      globalThis?.localStorage?.getItem("userDetails") ??
      globalThis?.localStorage?.getItem("userdetails");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const roles = parsed?.userRoles ?? parsed?.roles ?? [];
    if (!Array.isArray(roles)) return [];
    return roles
      .map((r: AnyRow | string) =>
        typeof r === "string" ? r : String(r?.roleName ?? r?.name ?? ""),
      )
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Angular semister flag — OFFLINEEVALUATION / ExamController / ADMIN.
 * When true, Subject Type keeps THEORY + ELECTIVE on regular exams.
 */
function hasSemisterRole(roleName: string): boolean {
  const active = String(roleName ?? "").toUpperCase();
  if (
    active === "ADMIN" ||
    active === "EXAMCONTROLLER" ||
    active === USER_ROLES.OFFLINE_EVALUATION.toUpperCase()
  ) {
    return true;
  }
  return parseUserRoles().some((role) => {
    const name = String(role).toUpperCase();
    return (
      name === "ADMIN" ||
      name === "EXAMCONTROLLER" ||
      name === USER_ROLES.OFFLINE_EVALUATION.toUpperCase()
    );
  });
}

/**
 * Angular staff flag — exact MSTAFF / STAFF only (not substring match).
 * Staff see a locked Employee field; everyone else gets searchable Employee.
 */
function isStaffRole(roleName: string): boolean {
  const active = String(roleName ?? "").toUpperCase();
  if (active === "MSTAFF" || active === "STAFF") return true;
  return parseUserRoles().some((role) => {
    const name = String(role).toUpperCase();
    return name === "MSTAFF" || name === "STAFF";
  });
}

function attendanceText(row: AnyRow): string {
  if (row?.isPresent === true) return "Present";
  if (row?.isPresent === false) return "Absent";
  return "Not Marked";
}

/** Angular `span.active` / `span.in-active` — Present plain; Absent/Not Marked orange badge. */
function AttendanceStatusRenderer(params: ICellRendererParams<AnyRow>) {
  const label = attendanceText(params.data ?? {});
  if (params.data?.isPresent === true) {
    return <span className="text-[14px] text-slate-800">{label}</span>;
  }
  return (
    <span className="inline-block rounded-[3px] bg-[#ff6636] px-2 py-0.5 text-[14px] font-medium leading-tight">
      {label}
    </span>
  );
}

function findSubjectMarksRow(
  examMarks: AnyRow[],
  subjectId: number,
): AnyRow | null {
  return (
    examMarks.find(
      (x) => n(x.subjectId ?? x.fk_subject_id ?? x.subject_id) === subjectId,
    ) ?? null
  );
}

function findMarksSetupRow(
  setups: AnyRow[],
  categoryId: number,
): AnyRow | null {
  if (!categoryId) return null;
  return (
    setups.find(
      (x) =>
        n(
          x.subjectCategoryCatDetId ??
            x.subjectCategoryCatdetId ??
            x.fk_subjectcategory_catdet_id,
        ) === categoryId,
    ) ?? null
  );
}

/** Angular enteredMarks — max + isPass */
function applyEnteredMarks(
  item: AnyRow,
  opts: {
    isInternalExam: boolean;
    examMarks: AnyRow[];
    examMarkSetups: AnyRow[];
    toastOverMax?: boolean;
  },
): { row: AnyRow; maxValue: number; cleared?: boolean } {
  const subjectId = n(item.subjectId ?? item.fk_subject_id);
  const categoryId = n(
    item.subjectCategoryCatDetId ??
      item.fk_subjectcategory_catdet_id ??
      item.subjectCategoryId,
  );
  const marksRow = findSubjectMarksRow(opts.examMarks, subjectId);
  const setupRow = findMarksSetupRow(opts.examMarkSetups, categoryId);

  let maxValue = 0;
  if (opts.isInternalExam) {
    const fromSubject = marksRow?.internalmarks ?? marksRow?.internalMarks;
    maxValue =
      fromSubject != null && fromSubject !== ""
        ? n(fromSubject)
        : n(setupRow?.internalMarks ?? setupRow?.internalmarks);
  } else {
    const fromSubject = marksRow?.externalmarks ?? marksRow?.externalMarks;
    maxValue =
      fromSubject != null && fromSubject !== ""
        ? n(fromSubject)
        : n(setupRow?.externalMarks ?? setupRow?.externalmarks);
  }

  let marks: number | string = item.marks;
  let cleared = false;
  if (marks !== "" && marks != null) {
    let parsed = n(marks);
    if (parsed < 0) parsed = 0;
    if (maxValue > 0 && parsed > maxValue) {
      if (opts.toastOverMax) {
        toast.info(`Entered Marks Should Less Than ${maxValue}Marks`);
      }
      marks = "";
      cleared = true;
      parsed = 0;
    } else {
      marks = parsed;
    }
  }

  const extMax =
    marksRow?.externalmarks != null && marksRow.externalmarks !== ""
      ? n(marksRow.externalmarks)
      : n(setupRow?.externalMarks ?? setupRow?.externalmarks);
  const passPct = n(
    setupRow?.externalPassPercentage ?? setupRow?.external_pass_percentage,
  );
  const isMarks =
    extMax > 0 && passPct > 0 ? (extMax * passPct) / 100 > n(marks) : false;

  const next: AnyRow = { ...item, marks: cleared ? "" : marks };
  if (item.isPresent === false) {
    next.isPass = false;
  } else if (item.isPresent != null) {
    if (item.examTypeCode === "Internal") {
      next.isPass = true;
    } else {
      next.isPass = !isMarks;
    }
  }
  return { row: next, maxValue, cleared };
}

function MarksInputRenderer(
  params: ICellRendererParams<AnyRow> & {
    maxMarks?: number;
    onChange: (row: AnyRow, value: number | "") => void;
  },
) {
  const raw = params.data?.marks;
  const disabled = params.data?.isPresent !== true;
  const max =
    params.maxMarks && params.maxMarks > 0 ? params.maxMarks : undefined;
  const display =
    raw === "" || raw == null
      ? ""
      : Number.isFinite(Number(raw))
        ? String(Number(raw))
        : "";
  // Angular mat-form-field outline + text-align:right in External Marks column
  return (
    <div className="flex h-full w-full items-center py-1 pr-1">
      <Input
        type="number"
        min={0}
        max={max}
        step="any"
        className="h-9 w-full rounded-md border border-[#c3d9ff] bg-white px-2 text-left text-[13px] tabular-nums shadow-none focus-visible:border-[#0c51a4] focus-visible:ring-1 focus-visible:ring-[#0c51a4]/40 disabled:bg-[#f3f6fb] disabled:opacity-80"
        value={display}
        disabled={disabled}
        onChange={(e) => {
          if (!params.data) return;
          const v = e.target.value;
          params.onChange(params.data, v === "" ? "" : Number(v));
        }}
      />
    </div>
  );
}

export default function ExamMarksEntryPage() {
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const empNumber = globalThis?.localStorage?.getItem("empNumber") ?? "";
  const userName = globalThis?.localStorage?.getItem("userName") ?? "";
  const roleName = globalThis?.localStorage?.getItem("roleName") ?? "";
  const userRole = globalThis?.localStorage?.getItem("userRole") ?? "";
  const examEvaluatorProfileId = Number(
    globalThis?.localStorage?.getItem("examEvaluatorProfileId") ?? 0,
  );
  const orgCode = globalThis?.localStorage?.getItem("orgCode") ?? "";
  const semister = hasSemisterRole(roleName || userRole);
  const staff = isStaffRole(roleName || userRole);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const [allFilters, setAllFilters] = useState<AnyRow[]>([]);
  const [restFilters, setRestFilters] = useState<AnyRow[]>([]);
  const [regRows, setRegRows] = useState<AnyRow[]>([]);
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([]);
  const [examMarks, setExamMarks] = useState<AnyRow[]>([]);
  const [examMarkSetups, setExamMarkSetups] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [allExamFeeTypes, setAllExamFeeTypes] = useState<AnyRow[]>([]);
  const [marksView, setMarksView] = useState<"list" | "import">("list");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [internalEvaluators, setInternalEvaluators] = useState<AnyRow[]>([]);
  const [externalEvaluators, setExternalEvaluators] = useState<AnyRow[]>([]);
  const [collegeLogoUrl, setCollegeLogoUrl] = useState<string | null>(null);
  const [maxValue, setMaxValue] = useState(0);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [examTypeId, setExamTypeId] = useState<number>(0);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number | null>(null);
  const [courseYearId, setCourseYearId] = useState<number | null>(null);
  const [regulationId, setRegulationId] = useState<number | null>(null);
  const [subjectTypeId, setSubjectTypeId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [labBatchId, setLabBatchId] = useState(0);
  const [examDate, setExamDate] = useState("");
  const [marksEnteredEmpId, setMarksEnteredEmpId] = useState(employeeId);
  const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>(() =>
    employeeId
      ? [
          {
            value: String(employeeId),
            label: employeeOptionLabel(empNumber, userName),
          },
        ]
      : [],
  );
  const [employeeSearching, setEmployeeSearching] = useState(false);

  const employeeDisplay = userName ? `${empNumber} (${userName})` : empNumber;

  useEffect(() => {
    // Angular: only STAFF / MSTAFF lock marks-entered employee to login member.
    if (staff) {
      setMarksEnteredEmpId(employeeId);
      setEmployeeOptions(
        employeeId
          ? [
              {
                value: String(employeeId),
                label: employeeOptionLabel(empNumber, userName),
              },
            ]
          : [],
      );
    }
  }, [employeeId, empNumber, userName, staff]);

  const selectedCourseFilter = allFilters.find(
    (row) => Number(row.fk_course_id) === Number(courseId),
  );
  const universityCode = String(
    selectedCourseFilter?.university_code ??
      selectedCourseFilter?.universityCode ??
      globalThis?.localStorage?.getItem("universityCode") ??
      "",
  );
  const { printMode, printButton, printView } = useSecureMarksPrint({
    students: rows,
    internalEvaluators,
    externalEvaluators,
    logoUrl: collegeLogoUrl,
    orgCode,
    universityCode,
    documentTitle: "Exam Marks Entry",
  });

  const courses = useMemo(
    () => dedupeBy(allFilters, "fk_course_id"),
    [allFilters],
  );
  const academicYears = useMemo(() => {
    const list = dedupeBy(
      allFilters.filter((x) => Number(x.fk_course_id) === Number(courseId)),
      "fk_academic_year_id",
    );
    return [...list].sort(
      (a, b) => n(b.is_curr_ay ?? b.isCurrAy) - n(a.is_curr_ay ?? a.isCurrAy),
    );
  }, [allFilters, courseId]);

  const exams = useMemo(() => {
    let list = dedupeBy(
      allFilters.filter(
        (x) =>
          Number(x.fk_course_id) === Number(courseId) &&
          Number(x.fk_academic_year_id) === Number(academicYearId),
      ),
      "fk_exam_id",
    );
    // Angular: ADMIN sees all; others (incl. Offline Internal Evaluator) hide published.
    // Use loose == like Angular (`is_published == false`).
    if (roleName !== "ADMIN") {
      list = list.filter(
        (x) => x.is_published == false || x.isPublished == false,
      );
    }
    return list;
  }, [allFilters, courseId, academicYearId, roleName]);

  const examTypes = useMemo(() => {
    const ex = exams.find((x) => Number(x.fk_exam_id) === Number(examId));
    const opts: Array<{ id: number; code: string }> = [{ id: 0, code: "All" }];
    const types = Array.isArray(allExamFeeTypes) ? allExamFeeTypes : [];
    const regular = types.find(
      (t) => String(t.generalDetailCode ?? "").toLowerCase() === "regular",
    );
    const supple = types.find(
      (t) => String(t.generalDetailCode ?? "").toLowerCase() === "supple",
    );
    const internal = types.find(
      (t) => String(t.generalDetailCode ?? "").toLowerCase() === "internal",
    );
    if (ex?.is_regular_exam && regular?.generalDetailId)
      opts.push({ id: Number(regular.generalDetailId), code: "Regular" });
    if (ex?.is_supply_exam && supple?.generalDetailId)
      opts.push({ id: Number(supple.generalDetailId), code: "Supple" });
    if (ex?.is_internal_exam && internal?.generalDetailId)
      opts.push({ id: Number(internal.generalDetailId), code: "Internal" });
    return opts;
  }, [exams, examId, allExamFeeTypes]);

  const colleges = useMemo(() => {
    const list = dedupeBy(restFilters, "fk_college_id").filter((r) => {
      const id = Number(r.fk_college_id);
      const code = String(r.college_code ?? r.collegeCode ?? "").trim();
      return id > 0 && !!code && code !== "undefined";
    });
    return [...list].sort(
      (a, b) =>
        n(a.clg_sort_order ?? a.sort_order) -
        n(b.clg_sort_order ?? b.sort_order),
    );
  }, [restFilters]);

  const courseGroups = useMemo(
    () =>
      dedupeBy(
        restFilters.filter(
          (x) => Number(x.fk_college_id) === Number(collegeId),
        ),
        "fk_course_group_id",
      ).filter((r) => {
        const id = Number(r.fk_course_group_id);
        const code = String(r.group_code ?? r.groupCode ?? "").trim();
        return id > 0 && !!code && code !== "undefined";
      }),
    [restFilters, collegeId],
  );
  const courseYears = useMemo(
    () =>
      dedupeBy(
        restFilters.filter(
          (x) =>
            Number(x.fk_college_id) === Number(collegeId) &&
            Number(x.fk_course_group_id) === Number(courseGroupId),
        ),
        "fk_course_year_id",
      ).filter((r) => {
        const id = Number(r.fk_course_year_id);
        const code = String(
          r.course_year_code ?? r.courseYearCode ?? "",
        ).trim();
        return id > 0 && !!code && code !== "undefined";
      }),
    [restFilters, collegeId, courseGroupId],
  );
  const regulationsFlex = useMemo(() => {
    const source = (regRows.length > 0 ? regRows : restFilters).filter((r) => {
      return (
        numFrom(r, ["fk_regulation_id", "regulationId", "regulation_id"]) > 0 ||
        String(r?.flag ?? "").toLowerCase() === "regulations"
      );
    });
    const seen = new Set<number>();
    const out: AnyRow[] = [];
    for (const row of source) {
      const id = numFrom(row, [
        "fk_regulation_id",
        "regulationId",
        "regulation_id",
      ]);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(row);
    }
    return out;
  }, [regRows, restFilters]);

  const selectedExam = useMemo(
    () => exams.find((x) => Number(x.fk_exam_id) === Number(examId)),
    [exams, examId],
  );
  const isInternalExam = Boolean(selectedExam?.is_internal_exam);

  const subjectTypes = useMemo(() => {
    // Angular selectedRegulation: dedupe subject types from proc rows (already
    // scoped by in_regulation_id) — no extra client regulation filter.
    const seen = new Set<number>();
    let out: AnyRow[] = [];
    for (const row of subjectRows) {
      const id = numFrom(row, [
        "fk_subjecttype_catdet_id",
        "fk_subject_type_catdet_id",
        "subjectTypeId",
        "subject_type_id",
        "subjecttype_catdet_id",
      ]);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(row);
    }
    // Angular: non-semister roles hide THEORY/ELECTIVE on regular exams
    if (!semister && Boolean(selectedExam?.is_regular_exam)) {
      out = out.filter((x) => {
        const id = numFrom(x, [
          "fk_subjecttype_catdet_id",
          "fk_subject_type_catdet_id",
          "subjectTypeId",
          "subject_type_id",
          "subjecttype_catdet_id",
        ]);
        return id !== THEORY_SUBJECT_TYPE_ID && id !== ELECTIVE_SUBJECT_TYPE_ID;
      });
    }
    return out;
  }, [subjectRows, semister, selectedExam]);

  const subjects = useMemo(() => {
    const currentTypeId = Number(subjectTypeId ?? 0);
    // Angular only lists subjects after a Subject Type is selected.
    if (currentTypeId <= 0) return [];
    const filtered = subjectRows.filter((x) => {
      const rowTypeId = numFrom(x, [
        "fk_subjecttype_catdet_id",
        "fk_subject_type_catdet_id",
        "subjectTypeId",
        "subject_type_id",
        "subjecttype_catdet_id",
      ]);
      return rowTypeId === 0 || rowTypeId === currentTypeId;
    });
    const seen = new Set<number>();
    const out: AnyRow[] = [];
    for (const row of filtered) {
      const id = numFrom(row, [
        "fk_subject_id",
        "subjectId",
        "subject_id",
        "fk_sub_id",
      ]);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(row);
    }
    return out;
  }, [subjectRows, subjectTypeId]);

  const selectedSubject = useMemo(
    () =>
      subjects.find(
        (x) =>
          numFrom(x, [
            "fk_subject_id",
            "subjectId",
            "subject_id",
            "fk_sub_id",
          ]) === Number(subjectId),
      ),
    [subjects, subjectId],
  );

  const isLabSubject =
    String(
      selectedSubject?.subject_type ?? selectedSubject?.subjectType ?? "",
    ).toUpperCase() === "LAB";

  const labBatches = useMemo(
    () =>
      dedupeBy(
        subjectRows.filter(
          (x) =>
            Number(x.fk_subject_id) === Number(subjectId) &&
            Number(x.fk_exam_labbatch_id ?? 0) > 0,
        ),
        "fk_exam_labbatch_id",
      ),
    [subjectRows, subjectId],
  );

  function clearResults() {
    setRows([]);
    setHasFetched(false);
    setMarksView("list");
    setInternalEvaluators([]);
    setExternalEvaluators([]);
    setMaxValue(0);
  }

  async function onEmployeeSearch(term: string) {
    if (staff) return;
    const q = term.trim();
    if (q.length <= 4) {
      if (!marksEnteredEmpId && employeeId) {
        setEmployeeOptions([
          {
            value: String(employeeId),
            label: employeeOptionLabel(empNumber, userName),
          },
        ]);
      }
      return;
    }
    setEmployeeSearching(true);
    try {
      const found = await searchEmployeesForFacultyDataSecurity(q);
      setEmployeeOptions(
        found.map((e) => ({
          value: String(e.employeeId),
          label: employeeOptionLabel(String(e.empNumber ?? ""), e.firstName),
        })),
      );
    } catch (e) {
      toastError(e, "Failed to search employees");
      setEmployeeOptions([]);
    } finally {
      setEmployeeSearching(false);
    }
  }

  useEffect(() => {
    async function run() {
      setLoading(true);
      try {
        const [filtersData, feeTypesData] = await Promise.all([
          getExamMarksEntryFilters(employeeId),
          listExamFeeTypes(),
        ]);
        setAllFilters(Array.isArray(filtersData) ? filtersData : []);
        setAllExamFeeTypes(Array.isArray(feeTypesData) ? feeTypesData : []);
      } catch (e) {
        toastError(e, "Failed to load filters");
        setAllFilters([]);
        setAllExamFeeTypes([]);
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, [employeeId]);

  useEffect(() => {
    let cancelled = false;
    if (!collegeId) {
      setCollegeLogoUrl(null);
      return;
    }
    getCollegeById(collegeId)
      .then((college) => {
        if (cancelled) return;
        const logo = String(college?.logo ?? "");
        setCollegeLogoUrl(
          logo
            ? /^(https?:\/\/|data:)/i.test(logo)
              ? logo
              : `${MINIO_URL}${logo.replace(/^\/+/, "")}`
            : null,
        );
      })
      .catch(() => {
        if (!cancelled) setCollegeLogoUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [collegeId]);

  useEffect(() => {
    if (courses[0]?.fk_course_id && !courseId)
      setCourseId(Number(courses[0].fk_course_id));
  }, [courses, courseId]);

  useEffect(() => {
    if (!academicYears.length) return;
    if (
      !academicYears.some(
        (r) => Number(r.fk_academic_year_id) === Number(academicYearId),
      )
    ) {
      setAcademicYearId(Number(academicYears[0].fk_academic_year_id));
    }
  }, [academicYears, academicYearId]);

  useEffect(() => {
    if (!exams.length) {
      setExamId(null);
      return;
    }
    if (!exams.some((r) => Number(r.fk_exam_id) === Number(examId))) {
      setExamId(Number(exams[0].fk_exam_id));
    }
  }, [exams, examId]);

  useEffect(() => {
    if (!examTypes.some((t) => t.id === examTypeId)) {
      setExamTypeId(examTypes[0]?.id ?? 0);
    }
  }, [examTypes, examTypeId]);

  useEffect(() => {
    async function run() {
      setRestFilters([]);
      setRegRows([]);
      setSubjectRows([]);
      setExamMarks([]);
      setExamMarkSetups([]);
      if (!courseId || !examId || !academicYearId) return;
      try {
        const data = await getExamMarksEntryRestFilters({
          courseId,
          examId,
          academicYearId,
          employeeId,
        });
        setRestFilters(Array.isArray(data.restFilters) ? data.restFilters : []);
        setRegRows(Array.isArray(data.regulations) ? data.regulations : []);
      } catch (e) {
        toastError(e, "Failed to load college filters");
        setRestFilters([]);
        setRegRows([]);
      }
    }
    void run();
  }, [courseId, examId, academicYearId, employeeId]);

  useEffect(() => {
    if (!colleges.length) {
      if (collegeId != null) setCollegeId(null);
      return;
    }
    if (!colleges.some((r) => Number(r.fk_college_id) === Number(collegeId))) {
      setCollegeId(Number(colleges[0].fk_college_id));
    }
  }, [colleges, collegeId]);

  useEffect(() => {
    if (!courseGroups.length) {
      if (courseGroupId != null) setCourseGroupId(null);
      return;
    }
    if (
      !courseGroups.some(
        (r) => Number(r.fk_course_group_id) === Number(courseGroupId),
      )
    ) {
      setCourseGroupId(Number(courseGroups[0].fk_course_group_id));
    }
  }, [courseGroups, courseGroupId]);

  useEffect(() => {
    if (!courseYears.length) {
      if (courseYearId != null) setCourseYearId(null);
      return;
    }
    if (
      !courseYears.some(
        (r) => Number(r.fk_course_year_id) === Number(courseYearId),
      )
    ) {
      setCourseYearId(Number(courseYears[0].fk_course_year_id));
    }
  }, [courseYears, courseYearId]);

  useEffect(() => {
    const first = regulationsFlex[0];
    const id = numFrom(first ?? {}, [
      "fk_regulation_id",
      "regulationId",
      "regulation_id",
    ]);
    if (id > 0) {
      if (
        !regulationsFlex.some(
          (r) =>
            numFrom(r, [
              "fk_regulation_id",
              "regulationId",
              "regulation_id",
            ]) === Number(regulationId),
        )
      ) {
        setRegulationId(id);
      }
    }
  }, [regulationsFlex, regulationId]);

  useEffect(() => {
    async function run() {
      setSubjectRows([]);
      if (
        !collegeId ||
        !courseId ||
        !courseGroupId ||
        !courseYearId ||
        !examId ||
        !academicYearId ||
        !regulationId
      )
        return;
      try {
        const data = await getExamMarksEntrySubjects({
          collegeId,
          courseId,
          courseGroupId,
          courseYearId,
          examId,
          academicYearId,
          regulationId,
          employeeId,
        });
        setSubjectRows(Array.isArray(data) ? data : []);
      } catch (e) {
        toastError(e, "Failed to load subjects");
        setSubjectRows([]);
      }
    }
    void run();
  }, [
    collegeId,
    courseId,
    courseGroupId,
    courseYearId,
    examId,
    academicYearId,
    regulationId,
    employeeId,
  ]);

  useEffect(() => {
    const typeKeys = [
      "fk_subjecttype_catdet_id",
      "fk_subject_type_catdet_id",
      "subjectTypeId",
      "subject_type_id",
      "subjecttype_catdet_id",
    ];
    const first = subjectTypes[0];
    const id = numFrom(first ?? {}, typeKeys);
    if (!subjectTypes.length) {
      if (subjectTypeId != null) setSubjectTypeId(null);
      return;
    }
    if (
      id > 0 &&
      !subjectTypes.some((r) => numFrom(r, typeKeys) === Number(subjectTypeId))
    ) {
      setSubjectTypeId(id);
    }
  }, [subjectTypes, subjectTypeId]);

  useEffect(() => {
    const first = subjects[0];
    const id = numFrom(first ?? {}, [
      "fk_subject_id",
      "subjectId",
      "subject_id",
      "fk_sub_id",
    ]);
    if (
      id > 0 &&
      !subjects.some(
        (r) =>
          numFrom(r, [
            "fk_subject_id",
            "subjectId",
            "subject_id",
            "fk_sub_id",
          ]) === Number(subjectId),
      )
    ) {
      setSubjectId(id);
    } else if (!subjects.length) {
      setSubjectId(null);
    }
  }, [subjects, subjectId]);

  // Angular getMarksSetup on subject type change
  useEffect(() => {
    async function run() {
      setExamMarks([]);
      setExamMarkSetups([]);
      if (
        !collegeId ||
        !courseGroupId ||
        !courseYearId ||
        !regulationId ||
        !courseId ||
        !subjects.length
      )
        return;
      try {
        const [marks, setups] = await Promise.all([
          getExamMarksEntrySubjectMarks({
            collegeId,
            courseGroupId,
            courseYearId,
            regulationId,
          }),
          listExamMarksSetupForEntry(courseId, regulationId),
        ]);
        setExamMarks(Array.isArray(marks) ? marks : []);
        setExamMarkSetups(Array.isArray(setups) ? setups : []);
      } catch {
        setExamMarks([]);
        setExamMarkSetups([]);
      }
    }
    void run();
  }, [
    collegeId,
    courseGroupId,
    courseYearId,
    regulationId,
    courseId,
    subjectTypeId,
    subjects.length,
  ]);

  // Default exam date (Angular cascade) — user can override via DatePicker.
  // Priority: lab batch exam_date → subject exam_date → exam from_date.
  useEffect(() => {
    if (labBatchId > 0) {
      const batch = labBatches.find(
        (b) => Number(b.fk_exam_labbatch_id) === Number(labBatchId),
      );
      const d = toYmd(batch?.exam_date ?? batch?.examDate);
      if (d) {
        setExamDate(d);
        return;
      }
    }
    const fromSubject = toYmd(
      selectedSubject?.exam_date ?? selectedSubject?.examDate,
    );
    if (fromSubject) {
      setExamDate(fromSubject);
      return;
    }
    setExamDate(toYmd(selectedExam?.from_date ?? selectedExam?.fromDate));
  }, [selectedSubject, selectedExam, labBatchId, labBatches]);

  const examMinDate = useMemo(
    () => ymdToDate(toYmd(selectedExam?.from_date ?? selectedExam?.fromDate)),
    [selectedExam],
  );
  const examMaxDate = useMemo(
    () => ymdToDate(toYmd(selectedExam?.to_date ?? selectedExam?.toDate)),
    [selectedExam],
  );

  useEffect(() => {
    if (!isLabSubject) setLabBatchId(0);
  }, [isLabSubject, subjectId]);

  const onMarkChange = useCallback(
    (target: AnyRow, marks: number | "") => {
      const sid = Number(target.studentId ?? target.fk_student_id ?? 0);
      setRows((prev) =>
        prev.map((row) => {
          const rid = Number(row.studentId ?? row.fk_student_id ?? 0);
          if (
            sid > 0
              ? rid !== sid
              : String(row.hallticketNumber) !== String(target.hallticketNumber)
          )
            return row;
          const { row: next, maxValue: mv } = applyEnteredMarks(
            { ...row, marks },
            {
              isInternalExam,
              examMarks,
              examMarkSetups,
              toastOverMax: true,
            },
          );
          if (mv > 0) setMaxValue(mv);
          return next;
        }),
      );
    },
    [isInternalExam, examMarks, examMarkSetups],
  );

  async function onGetList() {
    if (
      !collegeId ||
      !courseId ||
      !examId ||
      !courseGroupId ||
      !courseYearId ||
      !regulationId ||
      !subjectId ||
      !subjectTypeId
    ) {
      toast.info("Please Select Valid Filters");
      return;
    }
    if (!examDate) {
      toast.info("Choose a exam date.");
      return;
    }
    setLoading(true);
    setHasFetched(true);
    try {
      const bundle = await getExamTypeMarkDetailsBundle({
        collegeId,
        courseId,
        examId,
        courseGroupId,
        courseYearId,
        regulationId,
        subjectId,
        labBatchId,
        examDate,
        examTypeId,
      });
      let list = (Array.isArray(bundle.students) ? bundle.students : []).map(
        (r) => {
          const base: AnyRow = {
            ...r,
            marks: r.marks == null ? 0 : r.marks,
            isMarksPublished: r.isMarksPublished ?? false,
            subjectId: n(r.subjectId ?? subjectId),
            subjectCategoryCatDetId: n(
              r.subjectCategoryCatDetId ??
                r.fk_subjectcategory_catdet_id ??
                selectedSubject?.fk_subjectcategory_catdet_id,
            ),
          };
          if (base.isPresent === false) base.isPass = false;
          const { row: next, maxValue: mv } = applyEnteredMarks(base, {
            isInternalExam,
            examMarks,
            examMarkSetups,
          });
          if (mv > 0) setMaxValue(mv);
          return next;
        },
      );

      if (isInternalExam) {
        const existing = await listExamStudentInternalMarksForEntry({
          collegeId,
          examId,
          subjectId,
        });
        if (existing.length) {
          list = list.map((row) => {
            const match = existing.find(
              (e) =>
                n(e.studentId ?? e.student?.studentId) === n(row.studentId),
            );
            if (!match) return row;
            return {
              ...row,
              marks: match.marks ?? row.marks,
              extMarks: 0,
              examStdInternalMarkId:
                match.examStdInternalMarkId ?? match.exam_std_internal_mark_id,
            };
          });
        }
      }

      setRows(list);
      setExternalEvaluators(bundle.externalEvaluators ?? []);
      setInternalEvaluators(bundle.internalEvaluators ?? []);
      if (!list.length) toast.info("No Records Found.");
    } catch (e) {
      toastError(e, "Failed to load students");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function onDownloadImportTemplate() {
    if (
      !collegeId ||
      !subjectId ||
      !examId ||
      !courseGroupId ||
      !courseYearId ||
      !examDate
    ) {
      toast.info("Please Select Valid Filters");
      return;
    }
    setDownloadingTemplate(true);
    try {
      const blob = await downloadSecureMarksTemplate({
        collegeId,
        subjectId,
        examId,
        courseGroupId,
        courseYearId,
        examdate: examDate,
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "Marks Sheet";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toastError(error, "Failed to download marks sheet");
    } finally {
      setDownloadingTemplate(false);
    }
  }

  async function onUploadImportMarks() {
    if (!importFile) {
      toast.info("Please choose a file.");
      return;
    }
    if (
      !collegeId ||
      !courseId ||
      !courseYearId ||
      !subjectId ||
      !examId ||
      !regulationId ||
      !subjectTypeId
    ) {
      toast.info("Please Select Valid Filters");
      return;
    }

    const subjectCategoryId = numFrom(selectedSubject ?? {}, [
      "fk_subjectcategory_catdet_id",
      "subjectCategoryId",
    ]);
    setImporting(true);
    try {
      const result = await uploadSecureExamMarks({
        file: importFile,
        collegeId,
        courseId,
        courseYearId,
        subjectId,
        examId,
        regulationId,
        subjectCategoryId,
        subjectTypeId,
      });
      const uploadedByStudent = new Map(
        result.rows.map((item) => [
          numFrom(item, ["studentId", "fk_student_id"]),
          item,
        ]),
      );
      setRows((current) =>
        current.map((row) => {
          const uploaded = uploadedByStudent.get(
            numFrom(row, ["studentId", "fk_student_id"]),
          );
          if (!uploaded) return row;
          const merged = {
            ...row,
            marks: Number(
              uploaded.examMarks ?? uploaded.marks ?? row.marks ?? 0,
            ),
            isvalidate: uploaded.isvalidate,
            reason: uploaded.reason,
            color: uploaded.isvalidate === false ? "#ff7070" : null,
          };
          const { row: next } = applyEnteredMarks(merged, {
            isInternalExam,
            examMarks,
            examMarkSetups,
          });
          return {
            ...next,
            color: merged.color,
            isvalidate: merged.isvalidate,
            reason: merged.reason,
          };
        }),
      );
      toastSuccess(result.message);
      setImportFile(null);
      if (importInputRef.current) importInputRef.current.value = "";
    } catch (error) {
      toastError(error, "Failed to upload marks");
    } finally {
      setImporting(false);
    }
  }

  async function onSave() {
    if (
      rows.length === 0 ||
      !collegeId ||
      !courseId ||
      !examId ||
      !courseYearId ||
      !subjectId ||
      !regulationId ||
      !subjectTypeId
    ) {
      toast.info("Please Select Valid Filters");
      return;
    }
    setSaving(true);
    try {
      const isExternalEvaluator =
        userRole.toUpperCase() === "EXTERNAL EVALUATOR";
      const subCredits = n(
        selectedSubject?.sub_credits ?? selectedSubject?.subCredits,
      );
      const payload = rows.map((row) => {
        const detail = {
          ...row,
          marksEnteredEmpId: marksEnteredEmpId || employeeId,
          courseId,
          regulationId,
          subjectTypeId,
          isExtenalpersonApprove: isExternalEvaluator,
          examEvaluatorProfileId: isExternalEvaluator
            ? examEvaluatorProfileId || null
            : null,
          credits: row.isPass ? subCredits : 0,
        };
        return {
          examStudentDetailDTO: detail,
          examStudentInternalMarkDTO: isInternalExam
            ? {
                examDate,
                isActive: true,
                isPresent: row.isPresent,
                isPublished: false,
                marks: row.marks === "" ? 0 : Number(row.marks ?? 0),
                collegeId,
                studentId: Number(row.studentId ?? row.fk_student_id ?? 0),
                courseYearId,
                subjectId,
                examId,
                employeeId: marksEnteredEmpId || employeeId,
                createdDt: new Date().toISOString(),
                examStdInternalMarkId:
                  row.examStdInternalMarkId ??
                  row.exam_std_internal_mark_id ??
                  null,
              }
            : null,
        };
      });
      await saveInternalMarksEntry(payload);
      toastSuccess("Marks saved successfully");
      await onGetList();
    } catch (e) {
      toastError(e, "Failed to save marks");
    } finally {
      setSaving(false);
    }
  }

  const selectedCollege = useMemo(
    () => colleges.find((x) => Number(x.fk_college_id) === Number(collegeId)),
    [colleges, collegeId],
  );
  const selectedCourse = useMemo(
    () => courses.find((x) => Number(x.fk_course_id) === Number(courseId)),
    [courses, courseId],
  );
  const selectedGroup = useMemo(
    () =>
      courseGroups.find(
        (x) => Number(x.fk_course_group_id) === Number(courseGroupId),
      ),
    [courseGroups, courseGroupId],
  );
  const selectedYear = useMemo(
    () =>
      courseYears.find(
        (x) => Number(x.fk_course_year_id) === Number(courseYearId),
      ),
    [courseYears, courseYearId],
  );
  const selectedRegulation = useMemo(
    () =>
      regulationsFlex.find(
        (x) =>
          numFrom(x, ["fk_regulation_id", "regulationId", "regulation_id"]) ===
          Number(regulationId),
      ),
    [regulationsFlex, regulationId],
  );
  const selectedAy = useMemo(
    () =>
      academicYears.find(
        (x) => Number(x.fk_academic_year_id) === Number(academicYearId),
      ),
    [academicYears, academicYearId],
  );

  const examTypeLabel =
    examTypes.find((t) => t.id === examTypeId)?.code ??
    (isInternalExam
      ? "Internal"
      : selectedExam?.is_supply_exam
        ? "Supple"
        : "Regular");

  const marksHeader = isInternalExam ? "Internal Marks" : "External Marks";

  const courseOptions = useMemo(
    () =>
      courses.map((x) => ({
        value: String(x.fk_course_id),
        label: String(x.course_code ?? ""),
      })),
    [courses],
  );
  const academicYearOptions = useMemo(
    () =>
      academicYears.map((x) => ({
        value: String(x.fk_academic_year_id),
        label: String(x.academic_year ?? ""),
      })),
    [academicYears],
  );
  const examOptions = useMemo(
    () =>
      exams.map((x) => {
        const label = formatExamOptionLabel(x);
        return {
          value: String(x.fk_exam_id),
          label,
          title: label,
          labelNode: examOptionLabelNode(x),
        };
      }),
    [exams],
  );
  const examTypeOptions = useMemo(
    () =>
      examTypes.map((t) => ({
        value: String(t.id),
        label: String(t.code ?? ""),
      })),
    [examTypes],
  );
  const collegeOptions = useMemo(
    () =>
      colleges.map((x) => ({
        value: String(x.fk_college_id),
        label: String(x.college_code ?? ""),
      })),
    [colleges],
  );
  const groupOptions = useMemo(
    () =>
      courseGroups.map((x) => ({
        value: String(x.fk_course_group_id),
        label: String(x.group_code ?? ""),
      })),
    [courseGroups],
  );
  const courseYearOptions = useMemo(
    () =>
      courseYears.map((x) => ({
        value: String(x.fk_course_year_id),
        label: String(x.course_year_code ?? ""),
      })),
    [courseYears],
  );
  const regulationOptions = useMemo(
    () =>
      regulationsFlex
        .map((x) => {
          const id = numFrom(x, [
            "fk_regulation_id",
            "regulationId",
            "regulation_id",
          ]);
          if (id <= 0) return null;
          return {
            value: String(id),
            label: String(
              x.regulation_code ?? x.regulationCode ?? x.regulation_name ?? "-",
            ),
          };
        })
        .filter(Boolean) as Array<{ value: string; label: string }>,
    [regulationsFlex],
  );
  const subjectTypeOptions = useMemo(
    () =>
      subjectTypes
        .map((x) => {
          const id = numFrom(x, [
            "fk_subjecttype_catdet_id",
            "fk_subject_type_catdet_id",
            "subjectTypeId",
            "subject_type_id",
            "subjecttype_catdet_id",
          ]);
          if (id <= 0) return null;
          return {
            value: String(id),
            label: String(
              x.subject_type ?? x.subjectType ?? x.subject_type_name ?? "-",
            ),
          };
        })
        .filter(Boolean) as Array<{ value: string; label: string }>,
    [subjectTypes],
  );
  const subjectOptions = useMemo(
    () =>
      subjects
        .map((x) => {
          const id = numFrom(x, [
            "fk_subject_id",
            "subjectId",
            "subject_id",
            "fk_sub_id",
          ]);
          if (id <= 0) return null;
          return {
            value: String(id),
            label: `${String(x.subject_name ?? x.subjectName ?? "-")} (${String(x.subject_code ?? x.subjectCode ?? "-")})`,
          };
        })
        .filter(Boolean) as Array<{ value: string; label: string }>,
    [subjects],
  );
  const labBatchOptions = useMemo(
    () => [
      { value: "0", label: "All" },
      ...labBatches.map((x) => ({
        value: String(x.fk_exam_labbatch_id),
        label: String(x.labbatch_name ?? x.lab_batch_name ?? "-"),
      })),
    ],
    [labBatches],
  );

  const invalidRowStyle = useCallback(
    (p: { data?: AnyRow }) =>
      p.data?.color ? { backgroundColor: String(p.data.color) } : undefined,
    [],
  );

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "SI No",
        width: 70,
        flex: 0,
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        cellStyle: invalidRowStyle,
      },
      {
        field: "hallticketNumber",
        headerName: "Hallticket Number",
        minWidth: 190,
        flex: 1,
        cellStyle: invalidRowStyle,
      },
      {
        field: "firstName",
        headerName: "Student",
        minWidth: 240,
        flex: 2,
        cellStyle: invalidRowStyle,
      },
      {
        headerName: "Attendance Status",
        minWidth: 150,
        flex: 1,
        sortable: true,
        valueGetter: (p) => attendanceText(p.data ?? {}),
        cellRenderer: AttendanceStatusRenderer,
        cellStyle: invalidRowStyle,
      },
      {
        field: "marks",
        headerName: marksHeader,
        minWidth: 170,
        flex: 1,
        sortable: true,
        // Numeric sort — empty / non-numeric treated as 0 (Angular list order by marks)
        comparator: (a, b) => {
          const na =
            a === "" || a == null || Number.isNaN(Number(a)) ? 0 : Number(a);
          const nb =
            b === "" || b == null || Number.isNaN(Number(b)) ? 0 : Number(b);
          return na - nb;
        },
        cellRenderer: MarksInputRenderer,
        cellRendererParams: { maxMarks: maxValue, onChange: onMarkChange },
        cellStyle: invalidRowStyle,
      },
    ],
    [maxValue, marksHeader, onMarkChange, invalidRowStyle],
  );

  if (printMode) return <>{printView}</>;

  return (
    <FilteredListPage
      title="Exam Marks Entry"
      filters={
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[repeat(16,minmax(0,1fr))] items-end">
            <div className="space-y-1 md:col-span-3">
              <Label>Course *</Label>
              <CommonSelect
                value={courseId ? String(courseId) : null}
                onChange={(v) => {
                  // Angular selectedCourse — clear everything below Course
                  setCourseId(v ? Number(v) : null);
                  setAcademicYearId(null);
                  setExamId(null);
                  setExamTypeId(0);
                  setCollegeId(null);
                  setCourseGroupId(null);
                  setCourseYearId(null);
                  setRegulationId(null);
                  setSubjectTypeId(null);
                  setSubjectId(null);
                  setLabBatchId(0);
                  setRestFilters([]);
                  setRegRows([]);
                  setSubjectRows([]);
                  clearResults();
                }}
                options={courseOptions}
                placeholder="Course"
                searchable
              />
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label>Academic Year *</Label>
              <CommonSelect
                value={academicYearId ? String(academicYearId) : null}
                onChange={(v) => {
                  // Angular selectedAcademicYear — clear Exam and below
                  setAcademicYearId(v ? Number(v) : null);
                  setExamId(null);
                  setExamTypeId(0);
                  setCollegeId(null);
                  setCourseGroupId(null);
                  setCourseYearId(null);
                  setRegulationId(null);
                  setSubjectTypeId(null);
                  setSubjectId(null);
                  setLabBatchId(0);
                  setRestFilters([]);
                  setRegRows([]);
                  setSubjectRows([]);
                  clearResults();
                }}
                options={academicYearOptions}
                placeholder="Academic Year"
                searchable
              />
            </div>
            <div className="space-y-1 md:col-span-8">
              <Label>Exam *</Label>
              <CommonSelect
                value={examId ? String(examId) : null}
                onChange={(v) => {
                  // Angular selectedExam — clear college cascade below Exam
                  setExamId(v ? Number(v) : null);
                  setExamTypeId(0);
                  setCollegeId(null);
                  setCourseGroupId(null);
                  setCourseYearId(null);
                  setRegulationId(null);
                  setSubjectTypeId(null);
                  setSubjectId(null);
                  setLabBatchId(0);
                  setRestFilters([]);
                  setRegRows([]);
                  setSubjectRows([]);
                  clearResults();
                }}
                options={examOptions}
                placeholder="Exam"
                searchable
                wrapOptionLabels
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Exam Type *</Label>
              <CommonSelect
                value={String(examTypeId)}
                onChange={(v) => {
                  setExamTypeId(Number(v || 0));
                  clearResults();
                }}
                options={examTypeOptions}
                placeholder="Exam Type"
                searchable
              />
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label>College *</Label>
              <CommonSelect
                value={collegeId ? String(collegeId) : null}
                onChange={(v) => {
                  setCollegeId(v ? Number(v) : null);
                  setCourseGroupId(null);
                  setCourseYearId(null);
                  setRegulationId(null);
                  setSubjectTypeId(null);
                  setSubjectId(null);
                  setLabBatchId(0);
                  setSubjectRows([]);
                  clearResults();
                }}
                options={collegeOptions}
                placeholder="Faculty"
                searchable
              />
            </div>
            <div className="space-y-1 md:col-span-3">
              <Label>course Group *</Label>
              <CommonSelect
                value={courseGroupId ? String(courseGroupId) : null}
                onChange={(v) => {
                  setCourseGroupId(v ? Number(v) : null);
                  setCourseYearId(null);
                  setRegulationId(null);
                  setSubjectTypeId(null);
                  setSubjectId(null);
                  setLabBatchId(0);
                  setSubjectRows([]);
                  clearResults();
                }}
                options={groupOptions}
                placeholder="Course Group"
                searchable
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Course Year *</Label>
              <CommonSelect
                value={courseYearId ? String(courseYearId) : null}
                onChange={(v) => {
                  setCourseYearId(v ? Number(v) : null);
                  setRegulationId(null);
                  setSubjectTypeId(null);
                  setSubjectId(null);
                  setLabBatchId(0);
                  setSubjectRows([]);
                  clearResults();
                }}
                options={courseYearOptions}
                placeholder="Course Year"
                searchable
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Regulation *</Label>
              <CommonSelect
                value={regulationId ? String(regulationId) : null}
                onChange={(v) => {
                  setRegulationId(v ? Number(v) : null);
                  clearResults();
                }}
                options={regulationOptions}
                placeholder="Regulation"
                searchable
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Subject Type *</Label>
              <CommonSelect
                value={subjectTypeId ? String(subjectTypeId) : null}
                onChange={(v) => {
                  setSubjectTypeId(v ? Number(v) : null);
                  setSubjectId(null);
                  clearResults();
                }}
                options={subjectTypeOptions}
                placeholder="Subject Type"
                searchable
              />
            </div>
            <div className="space-y-1 md:col-span-4">
              <Label>Subject</Label>
              <CommonSelect
                value={subjectId ? String(subjectId) : null}
                onChange={(v) => {
                  setSubjectId(v ? Number(v) : null);
                  setLabBatchId(0);
                  clearResults();
                }}
                options={subjectOptions}
                placeholder="Subject"
                searchable
                wrapOptionLabels
              />
            </div>
            {isLabSubject && (
              <div className="space-y-1 md:col-span-2">
                <Label>Lab Batch</Label>
                <CommonSelect
                  value={String(labBatchId)}
                  onChange={(v) => {
                    setLabBatchId(Number(v || 0));
                    clearResults();
                  }}
                  options={labBatchOptions}
                  placeholder="All"
                  searchable
                />
              </div>
            )}
            {subjectId ? (
              <div className="space-y-1 md:col-span-2">
                <DatePicker
                  label="Choose a exam date."
                  placeholder="dd/MM/yyyy"
                  displayFormat="dd/MM/yyyy"
                  value={ymdToDate(examDate)}
                  minDate={examMinDate ?? undefined}
                  maxDate={examMaxDate ?? undefined}
                  clearable={false}
                  disabled
                  onChange={(date) => {
                    setExamDate(date ? format(date, "yyyy-MM-dd") : "");
                    clearResults();
                  }}
                />
              </div>
            ) : null}
            {courseYearId ? (
              <>
                <div className="space-y-1 md:col-span-2">
                  <Label>Employee</Label>
                  {staff ? (
                    <Input
                      className="h-8 text-[12px]"
                      value={employeeDisplay}
                      disabled
                    />
                  ) : (
                    <CommonSelect
                      value={
                        marksEnteredEmpId ? String(marksEnteredEmpId) : null
                      }
                      onChange={(v) => {
                        if (!v) {
                          setMarksEnteredEmpId(0);
                          return;
                        }
                        setMarksEnteredEmpId(Number(v));
                        const selected = employeeOptions.find(
                          (o) => o.value === v,
                        );
                        if (selected) setEmployeeOptions([selected]);
                      }}
                      options={employeeOptions}
                      placeholder="Search Employee"
                      searchable
                      onSearch={(t) => void onEmployeeSearch(t)}
                      isLoading={employeeSearching}
                    />
                  )}
                </div>
                <div className="md:col-span-2">
                  <Button
                    className="h-8 w-full text-[12px]"
                    onClick={() => void onGetList()}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Get List"}
                  </Button>
                </div>
              </>
            ) : null}
          </div>
          {hasFetched && rows.length > 0 && (
            <RadioGroup
              className="flex items-center gap-5 px-1 py-1"
              value={marksView}
              onValueChange={(value) => {
                const next = value as "list" | "import";
                setMarksView(next);
                // Angular clear(): Import reloads list; List clears rows.
                if (next === "import") void onGetList();
                else setRows([]);
              }}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem id="exam-marks-list" value="list" />
                <Label
                  htmlFor="exam-marks-list"
                  className="cursor-pointer font-normal"
                >
                  List Of Marks
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="exam-marks-import" value="import" />
                <Label
                  htmlFor="exam-marks-import"
                  className="cursor-pointer font-normal"
                >
                  Import Marks
                </Label>
              </div>
            </RadioGroup>
          )}
          {hasFetched && rows.length > 0 && marksView === "import" && (
            <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
              <div className="min-w-64 flex-1 space-y-1">
                <Label htmlFor="exam-marks-import-file">Upload Marks :</Label>
                <Input
                  ref={importInputRef}
                  id="exam-marks-import-file"
                  type="file"
                  accept=".xlsx"
                  className="h-8 text-[12px]"
                  onChange={(event) =>
                    setImportFile(event.target.files?.[0] ?? null)
                  }
                />
              </div>
              <Button
                className="h-8 text-[12px]"
                onClick={() => void onUploadImportMarks()}
                disabled={importing}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {importing ? "Uploading..." : "Upload"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-8 text-[12px]"
                onClick={() => void onDownloadImportTemplate()}
                disabled={downloadingTemplate}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                {downloadingTemplate
                  ? "Downloading..."
                  : "Download Sample Excel"}
              </Button>
            </div>
          )}
          {hasFetched && rows.length > 0 ? (
            <div className="overflow-hidden rounded-md border border-[#c3d9ff]">
              <div className="flex items-start gap-4 p-3">
                <div className="flex h-20 w-24 shrink-0 items-center justify-center bg-[#c3d9ff] text-slate-700">
                  <GraduationCap className="h-10 w-10" />
                </div>
                <div className="space-y-1 text-[13px] leading-snug">
                  <p className="text-slate-700">
                    {selectedExam?.exam_name ?? "-"}{" "}
                    <span className="text-muted-foreground">
                      ({String(selectedExam?.from_date ?? "").slice(0, 10)} -{" "}
                      {String(selectedExam?.to_date ?? "").slice(0, 10)})
                    </span>{" "}
                    {examDate ? (
                      <span className="text-blue-700">({examDate})</span>
                    ) : null}
                  </p>
                  <p className="text-[#8c8c8c]">
                    / {selectedCollege?.college_code ?? "-"} /{" "}
                    {selectedCourse?.course_code ?? "-"} /{" "}
                    {selectedGroup?.group_code ?? "-"} /{" "}
                    {selectedYear?.course_year_code ?? "-"} /{" "}
                    <span className="text-blue-700">
                      ({selectedAy?.academic_year ?? "-"})
                    </span>
                  </p>
                  <p className="font-semibold text-slate-900">
                    {selectedSubject?.subject_name ?? "-"} (
                    {selectedRegulation?.regulation_code ??
                      selectedRegulation?.regulationCode ??
                      "-"}
                    ) -{" "}
                    <span className="font-medium text-blue-700">
                      {selectedSubject?.subject_type ?? "-"}
                    </span>{" "}
                    <span className="font-normal">({examTypeLabel})</span>
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      }
      tableTitle="Students List"
      rowData={hasFetched ? rows : []}
      columnDefs={columnDefs}
      loading={loading}
      resultsVisible={hasFetched && rows.length > 0}
      hideEmptyGrid
      getRowId={(p) =>
        String(
          p.data.studentId ??
            p.data.fk_student_id ??
            p.data.hallticketNumber ??
            "",
        )
      }
      pagination
      toolbar={
        hasFetched && rows.length > 0
          ? {
              search: true,
              searchPlaceholder: "Search…",
              exportExcel: false,
              exportPdf: false,
              columnPicker: true,
            }
          : false
      }
      toolbarTrailing={
        hasFetched && rows.length > 0 ? (
          <>
            <div className="order-first shrink-0 whitespace-nowrap text-[12px] font-semibold text-slate-700">
              Max Marks :{" "}
              <span className="text-red-600">{maxValue || "-"}</span>
            </div>
            <Button
              className="h-9 px-3 text-[12px]"
              onClick={() => void onSave()}
              disabled={saving || rows.length === 0}
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {saving ? "Saving..." : "Save Marks"}
            </Button>
            {printButton}
          </>
        ) : undefined
      }
    />
  );
}
