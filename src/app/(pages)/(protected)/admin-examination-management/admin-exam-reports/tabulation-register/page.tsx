"use client";

/**
 * Tabulation Register — Angular `tabulation_register` (non-SUK matrix layout).
 * One row per student; each subject is a colspan-9 group: CIE, SEE, Mod, Grc, 0.5%, Tot, Gr, Gp, Cr.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { FileSpreadsheet, Loader2, Printer, RefreshCw } from "lucide-react";
import { FilteredPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toastError } from "@/lib/toast";
import { toast } from "sonner";
import {
  getTabulationRegisterRows,
  getUnivExamFiltersRegSup,
  getUnivExamRestInRegExamStd,
  getGeneralDetails,
  listStudents,
  type AnyRow,
} from "@/services";
import { GM_CODES } from "@/config/constants/ui";

type Row = AnyRow;

const MARK_KEYS = [
  "internal_marks",
  "external_marks_secured",
  "moderation_marks",
  "grace_marks",
  "lastsem_marks_added",
  "subject_total",
  "grade",
  "grade_points",
  "credits",
] as const;

const MARK_HEADERS = [
  "CIE",
  "SEE",
  "Mod",
  "Grc",
  "0.5%",
  "Tot",
  "Gr",
  "Gp",
  "Cr",
] as const;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function txt(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function dash(v: unknown): string {
  const s = txt(v).trim();
  return !s || s === "null" || s === "undefined" ? "—" : s;
}

function dedupeBy<T>(rows: T[], keyFn: (r: T) => number | string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    const k = String(keyFn(r) ?? "");
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function parseMaybeDate(v: unknown): string {
  const s = txt(v);
  if (!s) return "";
  try {
    if (/^\d{4}-\d{2}-\d{2}/.test(s))
      return format(parseISO(s.slice(0, 10)), "dd MMM, yyyy");
    return format(new Date(s), "dd MMM, yyyy");
  } catch {
    return s;
  }
}

function examMasterLabel(r: Row): string {
  const name = txt(r.exam_name ?? r.examName) || "Exam";
  const from = parseMaybeDate(r.from_date ?? r.fromDate);
  const to = parseMaybeDate(r.to_date ?? r.toDate);
  const range = from && to ? ` (${from} - ${to})` : "";
  return `${name}${range}`;
}

function findMarks(
  subjectList: Row[],
  subjectCode: string,
  markType: string,
): string {
  const subject = subjectList.find(
    (item) => txt(item.subject_code) === subjectCode,
  );
  if (!subject) return "—";
  let v = subject[markType];
  if (
    (v === null || v === undefined || v === "") &&
    markType === "external_marks_secured"
  ) {
    v = subject.external_marks;
  }
  if (
    (v === null || v === undefined || v === "") &&
    markType === "subject_total"
  ) {
    v = subject.total_marks;
  }
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

/** Unique subjects in first-seen order (Angular subjectCodes). */
function collectSubjectCodes(rows: Row[]): string[] {
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const r of rows) {
    const code = txt(r.subject_code);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    codes.push(code);
  }
  return codes;
}

/** Group flat subject rows by hall ticket (Angular mainList). */
function groupByHallticket(rows: Row[]): Row[][] {
  const order: string[] = [];
  const map = new Map<string, Row[]>();
  for (const r of rows) {
    const ht = txt(r.hallticket_number ?? r.hallticket_no);
    if (!ht) continue;
    if (!map.has(ht)) {
      map.set(ht, []);
      order.push(ht);
    }
    map.get(ht)!.push(r);
  }
  return order.map((ht) => map.get(ht)!);
}

function exportTableAsExcel(
  tableEl: HTMLTableElement | null,
  filename: string,
) {
  if (!tableEl) return;
  const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="UTF-8" /></head>
<body>${tableEl.outerHTML}</body>
</html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function printTabulationRegister(
  tableEl: HTMLTableElement | null,
  branchLabel: string,
  detailsLabel: string,
) {
  if (!tableEl) return;

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tabulation Register</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-family: "Times New Roman", Times, serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .report-shell { width: 100%; }
    .report-title {
      margin: 0 0 8px;
      text-align: center;
      font-size: 25px;
      font-weight: 400;
      color: #000;
    }
    .report-meta {
      margin: 0 0 6px;
      text-align: left;
      font-size: 14px;
      color: #000;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 2%;
      font-size: 12px;
    }
    th, td {
      border: 1px solid #000;
      padding: 1px;
      text-align: center;
      vertical-align: middle;
      white-space: nowrap;
    }
    thead th {
      font-weight: 700;
    }
    tbody td:first-child {
      text-align: left;
    }
  </style>
</head>
<body>
  <div class="report-shell">
    <p class="report-title">${escapeHtml("Tabulation Register Report")}</p>
    ${
      branchLabel
        ? `<p class="report-meta">Branch : ${escapeHtml(branchLabel)}</p>`
        : ""
    }
    ${detailsLabel ? `<p class="report-meta">${escapeHtml(detailsLabel)}</p>` : ""}
    ${tableEl.outerHTML}
  </div>
</body>
</html>`;

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  const fdoc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!fdoc || !win) {
    frame.remove();
    return;
  }
  fdoc.open();
  fdoc.write(html);
  fdoc.close();
  win.addEventListener("afterprint", () => frame.remove());
  setTimeout(() => {
    win.focus();
    win.print();
  }, 50);
}

export default function TabulationRegisterPage() {
  const tableRef = useRef<HTMLTableElement>(null);
  const [loading, setLoading] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [searchingStudent, setSearchingStudent] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [employeeId, setEmployeeId] = useState(0);
  const [baseRows, setBaseRows] = useState<Row[]>([]);
  const [restRows, setRestRows] = useState<Row[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [studentOptions, setStudentOptions] = useState<SelectOption[]>([]);
  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [examTypeId, setExamTypeId] = useState("0");
  const [collegeId, setCollegeId] = useState("");
  const [courseGroupId, setCourseGroupId] = useState("");
  const [courseYearId, setCourseYearId] = useState("");
  const [hallticketNo, setHallticketNo] = useState("0");
  const [isReEvaluation, setIsReEvaluation] = useState(false);
  const [examFeeTypes, setExamFeeTypes] = useState<Row[]>([]);

  useEffect(() => {
    setEmployeeId(Number(globalThis?.localStorage?.getItem("employeeId") ?? 0));
  }, []);

  useEffect(() => {
    async function init() {
      if (!employeeId) return;
      setLoadingFilters(true);
      try {
        const filters = await getUnivExamFiltersRegSup(employeeId);
        const list = Array.isArray(filters) ? filters : [];
        setBaseRows(list);
        const courses = dedupeBy(list, (r) => num(r.fk_course_id));
        if (courses[0]) setCourseId(String(num(courses[0].fk_course_id)));
      } catch (e) {
        toastError(e, "Failed to load filters");
      } finally {
        setLoadingFilters(false);
      }
    }
    void init();
  }, [employeeId]);

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => num(r.fk_course_id)),
    [baseRows],
  );
  const academicYears = useMemo(
    () =>
      dedupeBy(
        baseRows.filter((r) => num(r.fk_course_id) === Number(courseId)),
        (r) => num(r.fk_academic_year_id),
      ),
    [baseRows, courseId],
  );
  const exams = useMemo(
    () =>
      dedupeBy(
        baseRows.filter(
          (r) =>
            num(r.fk_course_id) === Number(courseId) &&
            num(r.fk_academic_year_id) === Number(academicYearId),
        ),
        (r) => num(r.fk_exam_id),
      ),
    [baseRows, courseId, academicYearId],
  );
  const colleges = useMemo(
    () => dedupeBy(restRows, (r) => num(r.fk_college_id)),
    [restRows],
  );
  const courseGroups = useMemo(() => {
    const source = restRows.filter(
      (r) => !collegeId || num(r.fk_college_id) === Number(collegeId),
    );
    return dedupeBy(source, (r) => num(r.fk_course_group_id));
  }, [restRows, collegeId]);
  const courseYears = useMemo(() => {
    const source = restRows.filter(
      (r) =>
        (!collegeId || num(r.fk_college_id) === Number(collegeId)) &&
        (!courseGroupId || num(r.fk_course_group_id) === Number(courseGroupId)),
    );
    return dedupeBy(source, (r) => num(r.fk_course_year_id));
  }, [restRows, collegeId, courseGroupId]);

  const examTypeOptions: SelectOption[] = useMemo(
    () => [
      { value: "0", label: "All" },
      ...examFeeTypes.map((r) => ({
        value: String(num(r.generalDetailId ?? r.general_detail_id)),
        label:
          txt(r.generalDetailCode ?? r.general_detail_code) ||
          String(num(r.generalDetailId)),
      })),
    ],
    [examFeeTypes],
  );

  const selectedCourse = useMemo(
    () => courses.find((r) => num(r.fk_course_id) === Number(courseId)),
    [courses, courseId],
  );
  const selectedExam = useMemo(
    () => exams.find((r) => num(r.fk_exam_id) === Number(examId)),
    [exams, examId],
  );
  const selectedCollege = useMemo(
    () => colleges.find((r) => num(r.fk_college_id) === Number(collegeId)),
    [colleges, collegeId],
  );
  const selectedCourseGroup = useMemo(
    () =>
      courseGroups.find(
        (r) => num(r.fk_course_group_id) === Number(courseGroupId),
      ),
    [courseGroups, courseGroupId],
  );
  const selectedCourseYear = useMemo(
    () =>
      courseYears.find(
        (r) => num(r.fk_course_year_id) === Number(courseYearId),
      ),
    [courseYears, courseYearId],
  );

  const printBranchLabel = txt(selectedCourseGroup?.group_code);
  const printDetailsLabel = [
    txt(selectedCollege?.college_code),
    txt(selectedCourse?.course_code),
    txt(selectedCourseGroup?.group_code),
    txt(
      selectedCourseYear?.course_year_name ||
        selectedCourseYear?.course_year_code,
    ),
    txt(selectedExam?.exam_name),
  ]
    .filter(Boolean)
    .join(" / ");

  useEffect(() => {
    if (!courseId || !academicYears.length) return;
    if (
      !academicYears.some(
        (r) => num(r.fk_academic_year_id) === Number(academicYearId),
      )
    ) {
      setAcademicYearId(String(num(academicYears[0].fk_academic_year_id)));
    }
  }, [courseId, academicYears, academicYearId]);

  useEffect(() => {
    if (!academicYearId || !exams.length) return;
    if (!exams.some((r) => num(r.fk_exam_id) === Number(examId))) {
      setExamId(String(num(exams[0].fk_exam_id)));
    }
  }, [academicYearId, exams, examId]);

  useEffect(() => {
    async function loadRest() {
      if (!courseId || !academicYearId || !examId || !employeeId) {
        setRestRows([]);
        setExamFeeTypes([]);
        return;
      }
      setLoadingFilters(true);
      try {
        const [bundle, feeTypes] = await Promise.all([
          getUnivExamRestInRegExamStd({
            courseId: Number(courseId),
            examId: Number(examId),
            academicYearId: Number(academicYearId),
            employeeId,
            flagType: "REGSUP",
          }),
          getGeneralDetails(GM_CODES.EXAM_FEE_TYPE).catch(() => []),
        ]);
        setRestRows(
          Array.isArray(bundle.restFilters) ? bundle.restFilters : [],
        );
        const examRow =
          baseRows.find(
            (r) =>
              num(r.fk_course_id) === Number(courseId) &&
              num(r.fk_academic_year_id) === Number(academicYearId) &&
              num(r.fk_exam_id) === Number(examId),
          ) ?? null;

        setExamFeeTypes(feeTypes);
        setExamTypeId(
          feeTypes[0]
            ? String(
                num(
                  feeTypes[0].generalDetailId ?? feeTypes[0].general_detail_id,
                ),
              )
            : "0",
        );
        setCollegeId("");
        setCourseGroupId("");
        setCourseYearId("");
        setHallticketNo("0");
        setStudentOptions([]);
        setRows([]);
        setHasFetched(false);
      } catch (e) {
        toastError(e, "Failed to load filters");
        setRestRows([]);
        setExamFeeTypes([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadRest();
  }, [courseId, academicYearId, examId, employeeId]);

  useEffect(() => {
    if (!colleges.length) return;
    if (!colleges.some((r) => num(r.fk_college_id) === Number(collegeId))) {
      setCollegeId(String(num(colleges[0].fk_college_id)));
    }
  }, [colleges, collegeId]);

  useEffect(() => {
    if (!courseGroups.length) return;
    if (
      !courseGroups.some(
        (r) => num(r.fk_course_group_id) === Number(courseGroupId),
      )
    ) {
      setCourseGroupId(String(num(courseGroups[0].fk_course_group_id)));
      setCourseYearId("");
    }
  }, [courseGroups, courseGroupId]);

  useEffect(() => {
    if (!courseYears.length) return;
    if (
      !courseYears.some(
        (r) => num(r.fk_course_year_id) === Number(courseYearId),
      )
    ) {
      setCourseYearId(String(num(courseYears[0].fk_course_year_id)));
    }
  }, [courseYears, courseYearId]);

  const subjectCodes = useMemo(() => collectSubjectCodes(rows), [rows]);
  const mainList = useMemo(() => groupByHallticket(rows), [rows]);

  async function onSearchStudent(term: string) {
    const q = term.trim();
    if (q.length < 2) {
      setStudentOptions([]);
      return;
    }
    setSearchingStudent(true);
    try {
      const list = await listStudents(q);
      setStudentOptions(
        (Array.isArray(list) ? list : []).map((r) => {
          const roll = txt(
            r.hallticketNumber ??
              r.rollNumber ??
              r.roll_number ??
              r.hallticketNo,
          );
          const name = txt(r.firstName ?? r.studentName ?? r.student_name);
          return {
            value: roll || String(num(r.studentId)),
            label: name ? `${roll} (${name})` : roll || "Student",
          };
        }),
      );
    } catch {
      setStudentOptions([]);
    } finally {
      setSearchingStudent(false);
    }
  }

  async function onGetReport() {
    if (!courseId || !examId || !collegeId || !courseGroupId || !courseYearId) {
      toast.info("Please Select Valid Filters");
      return;
    }
    setLoading(true);
    setHasFetched(true);
    try {
      const list = await getTabulationRegisterRows({
        examId: Number(examId),
        collegeId: Number(collegeId),
        courseId: Number(courseId),
        courseGroupId: Number(courseGroupId),
        courseYearId: Number(courseYearId),
        hallticketNo: hallticketNo && hallticketNo !== "0" ? hallticketNo : "",
        examType: Number(examTypeId || 0),
        isReEvaluation,
      });
      setRows(Array.isArray(list) ? list : []);
      if (!list?.length) toast.info("No Records Found.");
    } catch (e) {
      toastError(e, "Failed to load tabulation register");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  const studentSelectOptions: SelectOption[] = useMemo(
    () => [
      { value: "0", label: "All" },
      ...studentOptions.filter((o) => o.value && o.value !== "0"),
    ],
    [studentOptions],
  );

  const showMatrix =
    hasFetched && mainList.length > 0 && subjectCodes.length > 0;

  const filters = (
    <>
      <GlobalFilterBarRow>
        <GlobalFilterField label="Course *">
          <Select
            value={courseId || null}
            onChange={(v) => {
              setCourseId(v ?? "");
              setAcademicYearId("");
              setExamId("");
            }}
            options={courses.map((r) => ({
              value: String(num(r.fk_course_id)),
              label: txt(r.course_code) || String(num(r.fk_course_id)),
            }))}
            isLoading={loadingFilters}
          />
        </GlobalFilterField>
        <GlobalFilterField label="Exam Year *">
          <Select
            value={academicYearId || null}
            onChange={(v) => {
              setAcademicYearId(v ?? "");
              setExamId("");
            }}
            options={academicYears.map((r) => ({
              value: String(num(r.fk_academic_year_id)),
              label: txt(r.academic_year) || String(num(r.fk_academic_year_id)),
            }))}
            disabled={!courseId}
          />
        </GlobalFilterField>
        <GlobalFilterField
          label="Exam Master *"
          className="min-w-[280px] flex-[2]"
        >
          <Select
            value={examId || null}
            onChange={(v) => setExamId(v ?? "")}
            options={exams.map((r) => ({
              value: String(num(r.fk_exam_id)),
              label: examMasterLabel(r),
            }))}
            searchable
            wrapOptionLabels
            disabled={!academicYearId}
          />
        </GlobalFilterField>
        <GlobalFilterField label="Exam Type *">
          <Select
            value={examTypeId}
            onChange={(v) => setExamTypeId(v ?? "0")}
            options={examTypeOptions}
          />
        </GlobalFilterField>
      </GlobalFilterBarRow>

      <GlobalFilterBarRow>
        <GlobalFilterField label="College *">
          <Select
            value={collegeId || null}
            onChange={(v) => {
              setCollegeId(v ?? "");
              setCourseGroupId("");
              setCourseYearId("");
            }}
            options={colleges.map((r) => ({
              value: String(num(r.fk_college_id)),
              label: txt(r.college_code) || String(num(r.fk_college_id)),
            }))}
            disabled={!examId}
          />
        </GlobalFilterField>
        <GlobalFilterField label="Course Group *">
          <Select
            value={courseGroupId || null}
            onChange={(v) => {
              setCourseGroupId(v ?? "");
              setCourseYearId("");
            }}
            options={courseGroups.map((r) => ({
              value: String(num(r.fk_course_group_id)),
              label: txt(r.group_code) || String(num(r.fk_course_group_id)),
            }))}
            disabled={!collegeId}
          />
        </GlobalFilterField>
        <GlobalFilterField label="Course Years *">
          <Select
            value={courseYearId || null}
            onChange={(v) => setCourseYearId(v ?? "")}
            options={courseYears.map((r) => ({
              value: String(num(r.fk_course_year_id)),
              label:
                txt(r.course_year_code) || String(num(r.fk_course_year_id)),
            }))}
            disabled={!courseGroupId}
          />
        </GlobalFilterField>
        <GlobalFilterField label="Student" className="min-w-[240px] flex-[1.5]">
          <Select
            value={hallticketNo || "0"}
            onChange={(v) => setHallticketNo(v ?? "0")}
            options={studentSelectOptions}
            searchable
            isLoading={searchingStudent}
            onSearch={(term) => void onSearchStudent(term)}
            placeholder="Search by name or hallticket"
          />
        </GlobalFilterField>
      </GlobalFilterBarRow>

      <GlobalFilterBarRow>
        <GlobalFilterField
          label="Is Re-Evaluation"
          className="global-filter-field--shrink"
        >
          <div className="flex h-[30px] items-center gap-2">
            <Checkbox
              id="tabulation-reeval"
              checked={isReEvaluation}
              onCheckedChange={(v) => setIsReEvaluation(v === true)}
            />
            <Label
              htmlFor="tabulation-reeval"
              className="cursor-pointer text-[12px] font-normal"
            >
              Is Re-Evaluation
            </Label>
          </div>
        </GlobalFilterField>
        <GlobalFilterField
          label=""
          className="global-filter-field--shrink global-filter-field--action"
        >
          <div className="flex items-end gap-2">
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={() => void onGetReport()}
              disabled={loading}
            >
              Get Report
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-[30px] w-[30px]"
              title="Reset"
              onClick={() => {
                setRows([]);
                setHasFetched(false);
                setHallticketNo("0");
                setIsReEvaluation(false);
                setStudentOptions([]);
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </GlobalFilterField>
      </GlobalFilterBarRow>
    </>
  );

  // Angular only renders the results card when there is data — no empty-state panel.
  const body = showMatrix ? (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 text-[12px]"
          onClick={() =>
            exportTableAsExcel(tableRef.current, "Tabulation Register Report")
          }
        >
          <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
          Export Excel
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-9 text-[12px]"
          onClick={() =>
            printTabulationRegister(
              tableRef.current,
              printBranchLabel,
              printDetailsLabel,
            )
          }
        >
          <Printer className="mr-1.5 h-3.5 w-3.5" />
          Print Report
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          {mainList.length} student{mainList.length === 1 ? "" : "s"} ·{" "}
          {subjectCodes.length} subject
          {subjectCodes.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="max-h-[min(70vh,720px)] overflow-auto rounded-md border border-border">
        <table
          ref={tableRef}
          className="w-full min-w-[1400px] text-left text-sm"
        >
          <thead className="bg-muted/50">
            <tr>
              <th
                rowSpan={2}
                className="px-3 py-2 font-semibold whitespace-nowrap"
              >
                Hall Ticket No.
              </th>
              {subjectCodes.map((code) => (
                <th
                  key={`h-${code}`}
                  colSpan={9}
                  className="px-3 py-2 text-center font-semibold whitespace-nowrap"
                >
                  {code}
                </th>
              ))}
              <th
                rowSpan={2}
                className="px-3 py-2 font-semibold whitespace-nowrap"
              >
                Total Marks
              </th>
              <th
                rowSpan={2}
                className="px-3 py-2 font-semibold whitespace-nowrap"
              >
                Total Credits
              </th>
              <th
                rowSpan={2}
                className="px-3 py-2 font-semibold whitespace-nowrap"
              >
                Perc.%
              </th>
              <th
                rowSpan={2}
                className="px-3 py-2 font-semibold whitespace-nowrap"
              >
                Result
              </th>
              <th
                rowSpan={2}
                className="px-3 py-2 font-semibold whitespace-nowrap"
              >
                SGPA
              </th>
              <th
                rowSpan={2}
                className="px-3 py-2 font-semibold whitespace-nowrap"
              >
                CGPA
              </th>
            </tr>
            <tr>
              {subjectCodes.map((code) =>
                MARK_HEADERS.map((h) => (
                  <th
                    key={`${code}-${h}`}
                    className="px-3 py-2 text-center font-semibold whitespace-nowrap"
                  >
                    {h}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {mainList.map((list) => {
              const ht = txt(
                list[0]?.hallticket_number ?? list[0]?.hallticket_no,
              );
              return (
                <tr key={ht} className="border-t">
                  <td className="px-3 py-1.5 whitespace-nowrap">{dash(ht)}</td>
                  {subjectCodes.map((code) =>
                    MARK_KEYS.map((key) => (
                      <td
                        key={`${ht}-${code}-${key}`}
                        className="px-3 py-1.5 text-center whitespace-nowrap"
                      >
                        {findMarks(list, code, key)}
                      </td>
                    )),
                  )}
                  <td className="px-3 py-1.5 text-center whitespace-nowrap">
                    {dash(list[0]?.final_sem_total_marks)}
                  </td>
                  <td className="px-3 py-1.5 text-center whitespace-nowrap">
                    {dash(list[0]?.total_credits)}
                  </td>
                  <td className="px-3 py-1.5 text-center whitespace-nowrap">
                    {dash(list[0]?.final_sem_percentage)}
                  </td>
                  <td className="px-3 py-1.5 text-center whitespace-nowrap">
                    {dash(list[0]?.final_sem_result)}
                  </td>
                  <td className="px-3 py-1.5 text-center whitespace-nowrap">
                    {dash(list[0]?.sgpa)}
                  </td>
                  <td className="px-3 py-1.5 text-center whitespace-nowrap">
                    {dash(list[0]?.cgpa)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  ) : loading ? (
    <div className="flex min-h-[120px] items-center justify-center px-4 py-8 text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </span>
    </div>
  ) : undefined;

  return (
    <FilteredPage
      title="Tabulation Register"
      filters={filters}
      body={body}
      filtersCollapsible={false}
    />
  );
}
