"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format, parseISO } from "date-fns";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/common/components/select";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { rowIndexGetter } from "@/lib/utils";
import {
  getGradeMemoIssueFilters,
  getLabRemunerationEvaluators,
  getLabRemunerationReport,
  getLabRemunerationRestFilters,
  getLabRemunerationSubjects,
} from "@/services";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  Building2,
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Printer,
  School,
  UserRound,
} from "lucide-react";
import {
  groupLabRemunerationByProfile,
  printLabRemunerationReport,
} from "../_components/printLabRemunerationReport";

type AnyRow = Record<string, any>;

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search…",
  columnPicker: true,
  exportPdf: false,
  exportExcel: false,
} as const;

/** Angular UI: blue text on Evaluator Name / Phone Number */
function blueTextRenderer(p: ICellRendererParams<AnyRow>) {
  const value = p.value ?? "";
  if (value === "" || value == null) return "";
  return <span>{String(value)}</span>;
}

/**
 * Angular table columns (lab-external-remuneration-report):
 * SI.No, Evaluator Name, Phone Number, Subject Code, Subject Name, Role Name,
 * Evaluation Count, Amount, Travel Allowance, No Of Days, Subject Amount,
 * Final Amount, Account No., IFSC Code
 */
const COL_DEFS = {
  sno: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  evaluatorName: {
    headerName: "Evaluator Name",
    field: "evaluator_name",
    minWidth: 160,
    flex: 1.1,
    cellRenderer: blueTextRenderer,
  } as ColDef<AnyRow>,
  phoneNumber: {
    headerName: "Phone Number",
    minWidth: 130,
    flex: 0.9,
    valueGetter: (p) =>
      strFrom(p.data ?? {}, [
        "phonenumber",
        "phone_number",
        "mobile_number",
        "mobileNumber",
      ]),
    cellRenderer: blueTextRenderer,
  } as ColDef<AnyRow>,
  subjectCode: {
    headerName: "Subject Code",
    field: "subject_code",
    minWidth: 120,
    flex: 0.9,
  } as ColDef<AnyRow>,
  subjectName: {
    headerName: "Subject Name",
    field: "subject_name",
    minWidth: 160,
    flex: 1.2,
  } as ColDef<AnyRow>,
  roleName: {
    headerName: "Role Name",
    field: "role_name",
    minWidth: 160,
    flex: 1.1,
  } as ColDef<AnyRow>,
  evaluationCount: {
    headerName: "Evaluation Count",
    field: "evaluation_count",
    minWidth: 130,
    flex: 0.8,
    cellClass: "text-center",
  } as ColDef<AnyRow>,
  amount: {
    headerName: "Amount",
    field: "amount",
    minWidth: 100,
    flex: 0.7,
    cellClass: "text-center",
  } as ColDef<AnyRow>,
  travelAllowance: {
    headerName: "Travel Allowance",
    minWidth: 130,
    flex: 0.8,
    cellClass: "text-center",
    valueGetter: (p) =>
      strFrom(p.data ?? {}, [
        "ta_amount",
        "travel_allowance",
        "travelAllowance",
      ]),
  } as ColDef<AnyRow>,
  noOfDays: {
    headerName: "No Of Days",
    field: "no_of_days",
    minWidth: 110,
    flex: 0.7,
    cellClass: "text-center",
  } as ColDef<AnyRow>,
  subjectAmount: {
    headerName: "Subject Amount",
    field: "subject_amount",
    minWidth: 120,
    flex: 0.8,
    cellClass: "text-center",
  } as ColDef<AnyRow>,
  finalAmount: {
    headerName: "Final Amount",
    field: "final_amount",
    minWidth: 120,
    flex: 0.8,
    cellClass: "text-center",
  } as ColDef<AnyRow>,
  accountNo: {
    headerName: "Account No.",
    field: "account_number",
    minWidth: 140,
    flex: 1,
  } as ColDef<AnyRow>,
  ifscCode: {
    headerName: "IFSC Code",
    field: "ifsc_code",
    minWidth: 120,
    flex: 0.9,
  } as ColDef<AnyRow>,
};

function numFrom(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const n = Number(row?.[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function strFrom(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const v = String(row?.[key] ?? "").trim();
    if (v) return v;
  }
  return "";
}

function dedupeBy(rows: AnyRow[], keys: string[]): AnyRow[] {
  const seen = new Set<number>();
  const out: AnyRow[] = [];
  for (const row of rows) {
    const id = numFrom(row, keys);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
}

/** Angular date pipe for Exam Master — screenshot: `MMM d, yyyy` (Dec 22, 2025). */
function parseExamDate(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  try {
    if (/^\d{4}-\d{2}-\d{2}/.test(s))
      return format(parseISO(s.slice(0, 10)), "MMM d, yyyy");
    return format(new Date(s), "MMM d, yyyy");
  } catch {
    return s;
  }
}

function examTypeTags(r: AnyRow): string[] {
  const tags: string[] = [];
  if (r.is_internal_exam || r.isInternalExam) tags.push("(Internal)");
  if (r.is_regular_exam || r.isRegularExam) tags.push("(Regular)");
  if (r.is_supply_exam || r.isSupplyExam) tags.push("(Supple)");
  return tags;
}

/** Angular option text without colored spans (trigger + search). */
function examMasterLabel(r: AnyRow): string {
  const name = strFrom(r, ["exam_name", "examName"]) || "Exam";
  const from = parseExamDate(r.from_date ?? r.fromDate);
  const to = parseExamDate(r.to_date ?? r.toDate);
  const range = from && to ? ` (${from} - ${to})` : "";
  const tags = examTypeTags(r);
  return `${name}${range}${tags.length ? ` ${tags.join("")}` : ""}`;
}

/** Angular mat-option: blue (Internal)/(Regular)/(Supple) tags. */
function examMasterLabelNode(r: AnyRow) {
  const name = strFrom(r, ["exam_name", "examName"]) || "Exam";
  const from = parseExamDate(r.from_date ?? r.fromDate);
  const to = parseExamDate(r.to_date ?? r.toDate);
  const range = from && to ? ` (${from} - ${to})` : "";
  const tags = examTypeTags(r);
  return (
    <>
      {name}
      {range}
      {tags.map((t) => (
        <span key={t} style={{ color: "#0014ff", fontWeight: 500 }}>
          {" "}
          {t}
        </span>
      ))}
    </>
  );
}

function examMasterTooltip(r: AnyRow): string {
  const name = strFrom(r, ["exam_name", "examName"]) || "Exam";
  const from = parseExamDate(r.from_date ?? r.fromDate);
  const to = parseExamDate(r.to_date ?? r.toDate);
  return from && to ? `${name} (${from} - ${to})` : name;
}

function exportHtmlTable(filename: string, title: string, bodyHtml: string) {
  const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Worksheet</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>${title}${bodyHtml}</table></body></html>`;
  const link = document.createElement("a");
  link.download = filename;
  link.href = `data:application/vnd.ms-excel;base64,${window.btoa(unescape(encodeURIComponent(template)))}`;
  link.click();
}

export default function LabRemunerationReportPage() {
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  // Angular: +localStorage.organizationId. Proc rejects org 0 (no rows / error).
  const organizationId =
    Number(globalThis?.localStorage?.getItem("organizationId") ?? 0) || 1;

  const [loading, setLoading] = useState(false);
  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [regulationRows, setRegulationRows] = useState<AnyRow[]>([]);
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([]);
  const [evaluatorRows, setEvaluatorRows] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const [examId, setExamId] = useState<number | null>(null);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<number>(0);
  const [courseYearId, setCourseYearId] = useState<number>(0);
  const [regulationId, setRegulationId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number>(0);
  const [evaluatorProfileId, setEvaluatorProfileId] = useState<number>(0);
  const [isReevaluation, setIsReevaluation] = useState(false);
  const [skipAutoSelect, setSkipAutoSelect] = useState(false);

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [examName, setExamName] = useState("");

  const courses = useMemo(
    () => dedupeBy(baseRows, ["fk_course_id", "courseId"]),
    [baseRows],
  );
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) => numFrom(r, ["fk_course_id", "courseId"]) === Number(courseId),
        ),
        ["fk_academic_year_id", "academicYearId"],
      ).sort(
        (a, b) =>
          Number(strFrom(b, ["academic_year", "academicYear"])) -
          Number(strFrom(a, ["academic_year", "academicYear"])),
      ),
    [baseRows, courseId],
  );
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            numFrom(r, ["fk_course_id", "courseId"]) === Number(courseId) &&
            numFrom(r, ["fk_academic_year_id", "academicYearId"]) ===
              Number(academicYearId),
        ),
        ["fk_exam_id", "examId"],
      ),
    [baseRows, courseId, academicYearId],
  );
  const colleges = useMemo(
    () =>
      dedupeBy(restRows, ["fk_college_id", "collegeId"]).sort(
        (a, b) =>
          Number(a.clg_sort_order ?? a.sort_order ?? 0) -
          Number(b.clg_sort_order ?? b.sort_order ?? 0),
      ),
    [restRows],
  );
  const courseGroups = useMemo(
    () =>
      dedupeBy(
        restRows.filter(
          (r) =>
            !collegeId ||
            numFrom(r, ["fk_college_id", "collegeId"]) === Number(collegeId),
        ),
        ["fk_course_group_id", "courseGroupId"],
      ),
    [restRows, collegeId],
  );
  const courseYears = useMemo(
    () =>
      dedupeBy(
        restRows.filter(
          (r) =>
            (!collegeId ||
              numFrom(r, ["fk_college_id", "collegeId"]) ===
                Number(collegeId)) &&
            (courseGroupId === 0 ||
              numFrom(r, ["fk_course_group_id", "courseGroupId"]) ===
                Number(courseGroupId)),
        ),
        ["fk_course_year_id", "courseYearId"],
      ).sort(
        (a, b) => Number(a.cy_sort_order ?? 0) - Number(b.cy_sort_order ?? 0),
      ),
    [restRows, collegeId, courseGroupId],
  );
  const regulations = useMemo(
    () => dedupeBy(regulationRows, ["fk_regulation_id", "regulationId"]),
    [regulationRows],
  );
  const subjects = useMemo(
    () => dedupeBy(subjectRows, ["fk_subject_id", "subjectId"]),
    [subjectRows],
  );
  const evaluators = useMemo(
    () =>
      dedupeBy(evaluatorRows, [
        "pk_exam_evaluator_profile_id",
        "examEvaluatorProfileId",
      ]),
    [evaluatorRows],
  );

  const profiles = useMemo(() => groupLabRemunerationByProfile(rows), [rows]);

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.sno,
      COL_DEFS.evaluatorName,
      COL_DEFS.phoneNumber,
      COL_DEFS.subjectCode,
      COL_DEFS.subjectName,
      COL_DEFS.roleName,
      COL_DEFS.evaluationCount,
      COL_DEFS.amount,
      COL_DEFS.travelAllowance,
      COL_DEFS.noOfDays,
      COL_DEFS.subjectAmount,
      COL_DEFS.finalAmount,
      COL_DEFS.accountNo,
      COL_DEFS.ifscCode,
    ],
    [],
  );

  const getRowId = useCallback((p: { data?: AnyRow }) => {
    const profile = strFrom(p.data ?? {}, [
      "pk_exam_evaluator_profile_id",
      "examEvaluatorProfileId",
    ]);
    const subject = strFrom(p.data ?? {}, ["subject_code", "subjectCode"]);
    return profile && subject
      ? `${profile}-${subject}`
      : `row-${Math.random()}`;
  }, []);

  function clearResults() {
    setRows([]);
    setExamName("");
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      try {
        const list = await getGradeMemoIssueFilters(employeeId);
        if (cancelled) return;
        setBaseRows(list);
        const firstCourse = dedupeBy(list, ["fk_course_id", "courseId"])[0];
        setSkipAutoSelect(false);
        setCourseId(
          firstCourse
            ? numFrom(firstCourse, ["fk_course_id", "courseId"])
            : null,
        );
      } catch {
        if (!cancelled) toastError("Failed to load filters");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  useEffect(() => {
    if (!courseId) {
      setAcademicYearId(null);
      return;
    }
    if (skipAutoSelect) return;
    const years = dedupeBy(
      baseRows.filter(
        (r) => numFrom(r, ["fk_course_id", "courseId"]) === Number(courseId),
      ),
      ["fk_academic_year_id", "academicYearId"],
    ).sort(
      (a, b) =>
        Number(strFrom(b, ["academic_year", "academicYear"])) -
        Number(strFrom(a, ["academic_year", "academicYear"])),
    );
    setAcademicYearId(
      years[0]
        ? numFrom(years[0], ["fk_academic_year_id", "academicYearId"])
        : null,
    );
  }, [courseId, baseRows, skipAutoSelect]);

  useEffect(() => {
    if (!courseId || !academicYearId) {
      setExamId(null);
      return;
    }
    if (skipAutoSelect) return;
    const list = dedupeBy(
      baseRows.filter(
        (r) =>
          numFrom(r, ["fk_course_id", "courseId"]) === Number(courseId) &&
          numFrom(r, ["fk_academic_year_id", "academicYearId"]) ===
            Number(academicYearId),
      ),
      ["fk_exam_id", "examId"],
    );
    setExamId(list[0] ? numFrom(list[0], ["fk_exam_id", "examId"]) : null);
  }, [courseId, academicYearId, baseRows, skipAutoSelect]);

  useEffect(() => {
    let cancelled = false;
    async function loadRest() {
      if (!courseId || !academicYearId || !examId) {
        setRestRows([]);
        setRegulationRows([]);
        setCollegeId(null);
        setCourseGroupId(0);
        setCourseYearId(0);
        setRegulationId(null);
        setSubjectRows([]);
        setEvaluatorRows([]);
        setSubjectId(0);
        setEvaluatorProfileId(0);
        return;
      }
      setLoading(true);
      try {
        const { rest, regulations: regs } = await getLabRemunerationRestFilters(
          {
            courseId,
            academicYearId,
            examId,
            employeeId,
          },
        );
        if (cancelled) return;
        setRestRows(rest);
        setRegulationRows(regs);
        if (skipAutoSelect) {
          setCollegeId(null);
          setCourseGroupId(0);
          setCourseYearId(0);
          setRegulationId(null);
          return;
        }
        const nextColleges = dedupeBy(rest, [
          "fk_college_id",
          "collegeId",
        ]).sort(
          (a, b) =>
            Number(a.clg_sort_order ?? a.sort_order ?? 0) -
            Number(b.clg_sort_order ?? b.sort_order ?? 0),
        );
        setCollegeId(
          nextColleges[0]
            ? numFrom(nextColleges[0], ["fk_college_id", "collegeId"])
            : null,
        );
      } catch {
        if (!cancelled) toastError("Failed to load college filters");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadRest();
    return () => {
      cancelled = true;
    };
  }, [courseId, academicYearId, examId, employeeId, skipAutoSelect]);

  useEffect(() => {
    if (skipAutoSelect) return;
    if (!collegeId) {
      setCourseGroupId(0);
      return;
    }
    const groups = dedupeBy(
      restRows.filter(
        (r) => numFrom(r, ["fk_college_id", "collegeId"]) === Number(collegeId),
      ),
      ["fk_course_group_id", "courseGroupId"],
    );
    setCourseGroupId(
      groups[0]
        ? numFrom(groups[0], ["fk_course_group_id", "courseGroupId"])
        : 0,
    );
  }, [collegeId, restRows, skipAutoSelect]);

  useEffect(() => {
    if (skipAutoSelect) return;
    const years = dedupeBy(
      restRows.filter(
        (r) =>
          (!collegeId ||
            numFrom(r, ["fk_college_id", "collegeId"]) === Number(collegeId)) &&
          (courseGroupId === 0 ||
            numFrom(r, ["fk_course_group_id", "courseGroupId"]) ===
              Number(courseGroupId)),
      ),
      ["fk_course_year_id", "courseYearId"],
    ).sort(
      (a, b) => Number(a.cy_sort_order ?? 0) - Number(b.cy_sort_order ?? 0),
    );
    setCourseYearId(
      years[0] ? numFrom(years[0], ["fk_course_year_id", "courseYearId"]) : 0,
    );
  }, [collegeId, courseGroupId, restRows, skipAutoSelect]);

  useEffect(() => {
    if (skipAutoSelect) return;
    const regs = dedupeBy(regulationRows, ["fk_regulation_id", "regulationId"]);
    setRegulationId(
      regs[0] ? numFrom(regs[0], ["fk_regulation_id", "regulationId"]) : null,
    );
  }, [regulationRows, skipAutoSelect]);

  /**
   * Angular selectedsubject() — load evaluators only after a subject is chosen
   * (including All = 0). Empty evaluator_list is success, not an error toast.
   */
  const selectedSubject = useCallback(
    async (nextSubjectId: number) => {
      setSubjectId(nextSubjectId);
      setEvaluatorRows([]);
      setEvaluatorProfileId(0);
      clearResults();
      if (!courseId || !academicYearId || !examId || !regulationId) return;
      setLoading(true);
      try {
        const list = await getLabRemunerationEvaluators({
          organizationId,
          employeeId,
          examId,
          courseYearId,
          subjectId: nextSubjectId,
          regulationId,
          courseId,
          academicYearId,
        });
        setEvaluatorRows(list);
        const next = dedupeBy(list, [
          "pk_exam_evaluator_profile_id",
          "examEvaluatorProfileId",
        ]);
        setEvaluatorProfileId(
          next[0]
            ? numFrom(next[0], [
                "pk_exam_evaluator_profile_id",
                "examEvaluatorProfileId",
              ])
            : 0,
        );
      } catch (e) {
        toastError(e, "Failed to load evaluators");
        setEvaluatorRows([]);
        setEvaluatorProfileId(0);
      } finally {
        setLoading(false);
      }
    },
    [
      academicYearId,
      courseId,
      courseYearId,
      employeeId,
      examId,
      organizationId,
      regulationId,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadSubjects() {
      if (
        !courseId ||
        !academicYearId ||
        !examId ||
        !collegeId ||
        !regulationId
      ) {
        setSubjectRows([]);
        setSubjectId(0);
        setEvaluatorRows([]);
        setEvaluatorProfileId(0);
        return;
      }
      setLoading(true);
      try {
        const list = await getLabRemunerationSubjects({
          collegeId,
          courseId,
          courseGroupId,
          courseYearId,
          examId,
          academicYearId,
          regulationId,
          employeeId,
        });
        if (cancelled) return;
        setSubjectRows(list);
        if (skipAutoSelect) {
          setSubjectId(0);
          setEvaluatorRows([]);
          setEvaluatorProfileId(0);
          return;
        }
        const next = dedupeBy(list, ["fk_subject_id", "subjectId"]);
        const nextSubjectId = next[0]
          ? numFrom(next[0], ["fk_subject_id", "subjectId"])
          : 0;
        await selectedSubject(nextSubjectId);
      } catch {
        if (!cancelled) toastError("Failed to load subjects");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadSubjects();
    return () => {
      cancelled = true;
    };
  }, [
    courseId,
    academicYearId,
    examId,
    collegeId,
    courseGroupId,
    courseYearId,
    regulationId,
    employeeId,
    skipAutoSelect,
    selectedSubject,
  ]);

  async function handleGetReport() {
    if (
      !courseId ||
      !academicYearId ||
      !examId ||
      !collegeId ||
      !regulationId
    ) {
      toastError("Please select required filters");
      return;
    }
    setLoading(true);
    clearResults();
    try {
      const list = await getLabRemunerationReport({
        examId,
        subjectId,
        evaluatorProfileId,
        isReevaluation,
      });
      if (list.length === 0) {
        toastSuccess("No Records Found.");
        return;
      }
      setRows(list);
      toastSuccess("Data retrieved successfully");
      setExamName(
        examMasterLabel(
          exams.find((r) => numFrom(r, ["fk_exam_id", "examId"]) === examId) ??
            {},
        ),
      );
    } catch (error) {
      toastError(error, "Failed to load lab remuneration report");
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    if (rows.length === 0) return;
    // Angular exportAsExcel — same columns as the on-screen table
    const headerCells = [
      "<th>S.No</th>",
      "<th>Evaluator Name</th>",
      "<th>Phone Number</th>",
      "<th>Subject Code</th>",
      "<th>Subject Name</th>",
      "<th>Role Name</th>",
      "<th>Evaluation Count</th>",
      "<th>Amount</th>",
      "<th>Travel Allowance</th>",
      "<th>No Of Days</th>",
      "<th>Subject Amount</th>",
      "<th>Final Amount</th>",
      "<th>Account Number</th>",
      "<th>IFSC Code</th>",
    ].join("");
    const body = rows
      .map((row, index) => {
        const phone = strFrom(row, [
          "phonenumber",
          "phone_number",
          "mobile_number",
          "mobileNumber",
        ]);
        const ta = strFrom(row, [
          "ta_amount",
          "travel_allowance",
          "travelAllowance",
        ]);
        return `<tr>
          <td>${index + 1}</td>
          <td>${strFrom(row, ["evaluator_name", "evaluatorName"])}</td>
          <td>${phone}</td>
          <td>${strFrom(row, ["subject_code", "subjectCode"])}</td>
          <td>${strFrom(row, ["subject_name", "subjectName"])}</td>
          <td>${strFrom(row, ["role_name", "roleName"])}</td>
          <td>${strFrom(row, ["evaluation_count", "evaluationCount"])}</td>
          <td>${strFrom(row, ["amount"])}</td>
          <td>${ta}</td>
          <td>${strFrom(row, ["no_of_days", "noOfDays"])}</td>
          <td>${strFrom(row, ["subject_amount", "subjectAmount"])}</td>
          <td>${strFrom(row, ["final_amount", "finalAmount"])}</td>
          <td>${strFrom(row, ["account_number", "accountNumber"])}</td>
          <td>${strFrom(row, ["ifsc_code", "ifscCode"])}</td>
        </tr>`;
      })
      .join("");
    exportHtmlTable(
      "Lab Remuneration Report.xls",
      `<caption>Lab Remuneration Report</caption><thead><tr>${headerCells}</tr></thead>`,
      `<tbody>${body}</tbody>`,
    );
  }

  function handlePrint() {
    if (profiles.length === 0) return;
    const selectedCollege =
      colleges.find(
        (row) =>
          numFrom(row, ["fk_college_id", "collegeId"]) === Number(collegeId),
      ) ?? {};
    const selectedCourse =
      courses.find(
        (row) =>
          numFrom(row, ["fk_course_id", "courseId"]) === Number(courseId),
      ) ?? {};
    printLabRemunerationReport(profiles, {
      title: "Lab Remuneration Report",
      examName,
      collegeName: strFrom(selectedCollege, [
        "college_name",
        "collegeName",
        "college_code",
      ]),
      universityCode: strFrom(selectedCourse, [
        "university_code",
        "universityCode",
      ]),
    });
  }

  return (
    <FilteredListPage
      title="Lab Remuneration Report"
      filters={
        <div className="inv-allot-report-filters space-y-2">
          <div className="inv-allot-report-filters__row">
            <div className="inv-allot-report-filters__fx20">
              <GlobalFilterField
                label="Course"
                icon={GraduationCap}
                className="!flex-[2_1_10rem] !min-w-[9rem]"
              >
                <Select
                  value={courseId ? String(courseId) : null}
                  onChange={(v) => {
                    setSkipAutoSelect(false);
                    clearResults();
                    setCourseId(v ? Number(v) : null);
                  }}
                  options={courses.map((r) => ({
                    value: String(numFrom(r, ["fk_course_id", "courseId"])),
                    label: strFrom(r, [
                      "course_code",
                      "courseCode",
                      "course_name",
                    ]),
                  }))}
                  placeholder="Course"
                  searchable
                  isLoading={loading && baseRows.length === 0}
                />
              </GlobalFilterField>
            </div>
            <div className="inv-allot-report-filters__fx20">
              <GlobalFilterField
                label="Exam Year"
                icon={CalendarDays}
                className="!flex-[2_1_10rem] !min-w-[9rem]"
              >
                <Select
                  value={academicYearId ? String(academicYearId) : null}
                  onChange={(v) => {
                    setSkipAutoSelect(false);
                    clearResults();
                    setAcademicYearId(v ? Number(v) : null);
                  }}
                  options={academicYears.map((r) => ({
                    value: String(
                      numFrom(r, ["fk_academic_year_id", "academicYearId"]),
                    ),
                    label: strFrom(r, ["academic_year", "academicYear"]),
                  }))}
                  placeholder="Exam Year"
                  searchable
                />
              </GlobalFilterField>
            </div>
            <div className="inv-allot-report-filters__fx60">
              <GlobalFilterField
                label="Exam Master"
                icon={ClipboardList}
                className="!flex-[6_1_30rem] !min-w-[18rem]"
              >
                <Select
                  value={examId ? String(examId) : null}
                  onChange={(v) => {
                    setSkipAutoSelect(false);
                    clearResults();
                    setExamId(v ? Number(v) : null);
                  }}
                  options={exams.map((r) => ({
                    value: String(numFrom(r, ["fk_exam_id", "examId"])),
                    label: examMasterLabel(r),
                    title: examMasterTooltip(r),
                    labelNode: examMasterLabelNode(r),
                  }))}
                  placeholder="Exam Master"
                  searchable
                  searchPlaceholder="Search..."
                  wrapOptionLabels
                />
              </GlobalFilterField>
            </div>
          </div>

          <div className="inv-allot-report-filters__row">
            <div className="inv-allot-report-filters__fx15">
              <GlobalFilterField
                label="College"
                icon={Building2}
                className="!flex-[4_1_10rem] !min-w-[9rem]"
              >
                <Select
                  value={collegeId ? String(collegeId) : null}
                  onChange={(v) => {
                    setSkipAutoSelect(false);
                    clearResults();
                    setCollegeId(v ? Number(v) : null);
                  }}
                  options={colleges.map((r) => ({
                    value: String(numFrom(r, ["fk_college_id", "collegeId"])),
                    label: strFrom(r, [
                      "college_code",
                      "collegeCode",
                      "college_name",
                    ]),
                  }))}
                  placeholder="College"
                  searchable
                  isLoading={Boolean(examId) && loading}
                />
              </GlobalFilterField>
            </div>
            <div className="inv-allot-report-filters__fx20">
              <GlobalFilterField
                label="Course Group"
                icon={Layers}
                className="!flex-[4_1_10rem] !min-w-[9rem]"
              >
                <Select
                  value={String(courseGroupId)}
                  onChange={(v) => {
                    setSkipAutoSelect(false);
                    clearResults();
                    setCourseGroupId(v ? Number(v) : 0);
                  }}
                  options={[
                    { value: "0", label: "All" },
                    ...courseGroups.map((r) => ({
                      value: String(
                        numFrom(r, ["fk_course_group_id", "courseGroupId"]),
                      ),
                      label: strFrom(r, [
                        "group_code",
                        "groupCode",
                        "group_name",
                      ]),
                    })),
                  ]}
                  placeholder="Course Group"
                  searchable
                />
              </GlobalFilterField>
            </div>
            <div className="inv-allot-report-filters__fx15">
              <GlobalFilterField
                label="Course Year"
                icon={School}
                className="!flex-[3_1_8rem] !min-w-[7rem]"
              >
                <Select
                  value={String(courseYearId)}
                  onChange={(v) => {
                    setSkipAutoSelect(false);
                    clearResults();
                    setCourseYearId(v ? Number(v) : 0);
                  }}
                  options={[
                    { value: "0", label: "All" },
                    ...courseYears.map((r) => ({
                      value: String(
                        numFrom(r, ["fk_course_year_id", "courseYearId"]),
                      ),
                      label: strFrom(r, [
                        "course_year_code",
                        "courseYearCode",
                        "course_year",
                      ]),
                    })),
                  ]}
                  placeholder="Course Year"
                  searchable
                />
              </GlobalFilterField>
            </div>
            <div className="inv-allot-report-filters__fx20">
              <GlobalFilterField
                label="Regulation"
                icon={Layers}
                className="!flex-[3_1_8rem] !min-w-[7rem]"
              >
                <Select
                  value={regulationId ? String(regulationId) : null}
                  onChange={(v) => {
                    setSkipAutoSelect(false);
                    clearResults();
                    setRegulationId(v ? Number(v) : null);
                  }}
                  options={regulations.map((r) => ({
                    value: String(
                      numFrom(r, ["fk_regulation_id", "regulationId"]),
                    ),
                    label: strFrom(r, ["regulation_code", "regulationCode"]),
                  }))}
                  placeholder="Regulation"
                  searchable
                />
              </GlobalFilterField>
            </div>
            <div className="inv-allot-report-filters__fx30">
              <GlobalFilterField
                label="Subject"
                icon={ClipboardList}
                className="!flex-[6_1_18rem] !min-w-[13rem]"
              >
                <Select
                  value={String(subjectId)}
                  onChange={(v) => {
                    setSkipAutoSelect(false);
                    void selectedSubject(v ? Number(v) : 0);
                  }}
                  options={[
                    { value: "0", label: "All" },
                    ...subjects.map((r) => ({
                      value: String(numFrom(r, ["fk_subject_id", "subjectId"])),
                      label: `${strFrom(r, ["subject_name", "subjectName"])} (${strFrom(r, ["subject_code", "subjectCode"])})`,
                    })),
                  ]}
                  placeholder="Subject"
                  searchable
                />
              </GlobalFilterField>
            </div>
          </div>

          <div className="inv-allot-report-filters__row">
            <div className="inv-allot-report-filters__fx33">
              <GlobalFilterField
                label="Evaluators"
                icon={UserRound}
                className="global-filter-field--shrink !min-w-[16rem] !max-w-[28rem] !flex-[0_1_28rem]"
              >
                <Select
                  value={String(evaluatorProfileId)}
                  onChange={(v) => {
                    clearResults();
                    setEvaluatorProfileId(v ? Number(v) : 0);
                  }}
                  options={[
                    { value: "0", label: "All" },
                    ...evaluators.map((r) => ({
                      value: String(
                        numFrom(r, [
                          "pk_exam_evaluator_profile_id",
                          "examEvaluatorProfileId",
                        ]),
                      ),
                      label: `${strFrom(r, ["evaluator_name", "evaluatorName"])} (${strFrom(r, ["user_name", "userName"])})`,
                    })),
                  ]}
                  placeholder="Evaluators"
                  searchable
                />
              </GlobalFilterField>
            </div>
            <div className="flex shrink-0 items-end self-end pb-0.5 inv-allot-report-filters__fx15">
              <label className="flex h-8 items-center gap-2 whitespace-nowrap text-[14px]">
                <Checkbox
                  checked={isReevaluation}
                  onCheckedChange={(v) => {
                    clearResults();
                    setIsReevaluation(v === true);
                  }}
                />
                <span>Is Re-Evaluation</span>
              </label>
            </div>
            <div className="flex shrink-0 items-end self-end pb-0.5 inv-allot-report-filters__fx15">
              <Button
                type="button"
                className="h-8 px-3 text-[12px] w-full"
                onClick={() => void handleGetReport()}
                disabled={loading}
              >
                {loading ? "Loading..." : "Get List"}
              </Button>
            </div>
          </div>
        </div>
      }
      rowData={rows}
      columnDefs={columnDefs}
      resultsVisible={rows.length > 0}
      loading={loading}
      showTable={rows.length > 0}
      pagination
      paginationPageSize={25}
      getRowId={getRowId}
      onExportExcel={handleExport}
      onExportPdf={handlePrint}
      toolbarTrailing={
        <>
          <Button
            type="button"
            size="sm"
            className="h-9 px-3 text-[12px]"
            onClick={handleExport}
          >
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
            Export Excel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9 px-3 text-[12px]"
            onClick={handlePrint}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Report
          </Button>
        </>
      }
      toolbar={{
        ...TOOLBAR,
        excelDocumentTitle: "Lab Remuneration Report",
        excelFileName: "Lab Remuneration Report.xls",
        pdfDocumentTitle: "Lab Remuneration Report",
      }}
    />
  );
}
