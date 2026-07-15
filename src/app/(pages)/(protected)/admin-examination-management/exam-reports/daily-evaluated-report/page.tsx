"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format } from "date-fns";
import { FilteredListPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { DatePicker } from "@/common/components/date-picker";
import { FormModal } from "@/common/components/feedback";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { rowIndexGetter } from "@/lib/utils";
import { dedupeBy, num, txt } from "@/common/utils/data-helpers";
import { toastError, toastSuccess } from "@/lib/toast";
import { toast } from "sonner";
import {
  buildHtmlTable,
  exportHtmlTableAsExcel,
} from "../../_lib/export-html-table";
import {
  filterStudentsForEvaluator,
  getDailyEvalBaseFilters,
  getDailyEvalEvaluators,
  getDailyEvalSubjectRows,
  getDailyEvaluatedReport,
  getDailyEvaluatedStudentList,
} from "@/services";
import { useRouter } from "next/navigation";

type AnyRow = Record<string, unknown>;

const toastInfo = (msg: string) => toast.info(msg);

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

function formatExamLabel(exam: AnyRow): string {
  const name = txt(exam.exam_name);
  const from = txt(exam.from_date).slice(0, 10);
  const to = txt(exam.to_date).slice(0, 10);
  const bits: string[] = [];
  if (exam.is_internal_exam) bits.push("Internal");
  if (exam.is_regular_exam) bits.push("Regular");
  if (exam.is_supply_exam) bits.push("Supple");
  const range = from && to ? ` (${from} - ${to})` : "";
  const tags = bits.length ? bits.map((b) => `(${b})`).join("") : "";
  return `${name}${range}${tags}`;
}

function todayYmd(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function printDailyReport(rows: AnyRow[], title = "Daily Evaluated Report") {
  if (!rows.length) return;
  const columns = [
    { key: "si", header: "SI.No" },
    { key: "name", header: "Evaluator Name" },
    { key: "code", header: "Course Code" },
    { key: "email", header: "Evaluator Email" },
    { key: "assigned", header: "Assigned Answer Sheets" },
    { key: "evaluated", header: "Evaluated Answer Sheets" },
  ];
  const data = rows.map((row, i) => ({
    si: i + 1,
    name: txt(row.evaluator_name),
    code: txt(row.subject_code),
    email: txt(row.email),
    assigned: num(row.no_of_students_assigned),
    evaluated: num(row.no_of_evaluations_completed),
  }));
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
@page { size: A4 landscape; margin: 10mm; }
body { font: 11px/1.4 Arial, sans-serif; color: #000; margin: 0; }
.collegeName { text-align: center; font-size: 16px; font-weight: bold; margin: 8px 0 12px; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; }
th { background: #f2f2f2; }
</style></head>
<body><p class="collegeName">${escapeHtml(title)}</p>${buildHtmlTable(columns, data)}</body></html>`;

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

/** Angular printBulk — valuator sheets from evaluatedDuplicateReport + studentsList. */
function printAnswerSheetsReport(
  reports: AnyRow[],
  students: AnyRow[],
  fromDate: string,
  toDate: string,
) {
  const pages = reports
    .filter((r) => num(r.no_of_students_assigned) > 0)
    .map((obj) => {
      const profileId = num(obj.fk_exam_evaluator_profile_id);
      const rows = students
        .filter((s) => num(s.fk_exam_evaluator_profile_id) === profileId)
        .map(
          (s) =>
            `<tr><td>${escapeHtml(txt(s.omr_serial_no))}</td><td>${escapeHtml(txt(s.evaluated_totalmarks))}</td><td></td></tr>`,
        )
        .join("");
      return `
        <div class="page">
          <p class="exam">${escapeHtml(txt(obj.exam_name))}</p>
          <table class="meta">
            <tr>
              <td>Valuator-ID : ${escapeHtml(txt(obj.user_name))}</td>
              <td>Valuator-Name : ${escapeHtml(txt(obj.evaluator_name))}</td>
              <td>Valuated: From (${escapeHtml(fromDate)}) - To (${escapeHtml(toDate)})</td>
            </tr>
            <tr>
              <td>Course Code : ${escapeHtml(txt(obj.subject_code))}</td>
              <td>Course Title : ${escapeHtml(txt(obj.subject_name))}</td>
              <td>Sem : ${escapeHtml(txt(obj.course_year_code))}</td>
            </tr>
          </table>
          <table class="data">
            <thead><tr><th>Script Code</th><th>Marks</th><th>ValType</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="sigs">
            <span>Valuator Signature</span>
            <span>Co-Ordinator Signature</span>
          </div>
        </div>`;
    })
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Answer Sheets Report</title>
<style>
@page { size: A4; margin: 12mm; }
body { font: 12px/1.4 Arial, sans-serif; color: #000; }
.page { page-break-after: always; border: 1px solid #000; padding: 10px; margin-bottom: 8px; }
.page:last-child { page-break-after: auto; }
.exam { text-align: center; font-weight: 700; font-size: 15px; }
.meta, .data { width: 100%; border-collapse: collapse; margin-top: 8px; }
.meta td { padding: 4px; border: 1px solid #000; }
.data th, .data td { border: 1px solid #000; padding: 4px; text-align: center; }
.sigs { display: flex; justify-content: space-between; margin-top: 40px; }
</style></head><body>${pages || "<p>No records</p>"}</body></html>`;

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

export default function DailyEvaluatedReportPage() {
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const router = useRouter();

  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [subjectFilterRows, setSubjectFilterRows] = useState<AnyRow[]>([]);
  const [evaluatorRows, setEvaluatorRows] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [studentsList, setStudentsList] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [regulationId, setRegulationId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [evaluatorProfileId, setEvaluatorProfileId] = useState("");
  const [fromDate, setFromDate] = useState(todayYmd);
  const [toDate, setToDate] = useState(todayYmd);
  const [isReevaluation, setIsReevaluation] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTitle, setSheetTitle] = useState("");
  const [sheetRows, setSheetRows] = useState<AnyRow[]>([]);
  const [sheetSearch, setSheetSearch] = useState("");

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const organizationId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => num(r.fk_course_id)),
    [baseRows],
  );

  const academicYears = useMemo(() => {
    const cid = Number(courseId);
    const list = baseRows.filter((r) => num(r.fk_course_id) === cid);
    const unique = dedupeBy(list, (r) => num(r.fk_academic_year_id));
    return [...unique].sort(
      (a, b) =>
        parseInt(txt(b.academic_year), 10) - parseInt(txt(a.academic_year), 10),
    );
  }, [baseRows, courseId]);

  const exams = useMemo(() => {
    const cid = Number(courseId);
    const ay = Number(academicYearId);
    return dedupeBy(
      baseRows.filter(
        (r) => num(r.fk_course_id) === cid && num(r.fk_academic_year_id) === ay,
      ),
      (r) => num(r.fk_exam_id),
    );
  }, [baseRows, courseId, academicYearId]);

  const regulations = useMemo(
    () => dedupeBy(subjectFilterRows, (r) => num(r.fk_regulation_id)),
    [subjectFilterRows],
  );

  const subjects = useMemo(() => {
    const reg = Number(regulationId);
    const list =
      reg === 0
        ? subjectFilterRows
        : subjectFilterRows.filter((r) => num(r.fk_regulation_id) === reg);
    return dedupeBy(list, (r) => num(r.fk_subject_id));
  }, [subjectFilterRows, regulationId]);

  const evaluators = useMemo(
    () => dedupeBy(evaluatorRows, (r) => num(r.pk_exam_evaluator_profile_id)),
    [evaluatorRows],
  );

  useEffect(() => {
    async function init() {
      setLoadingFilters(true);
      try {
        const list = await getDailyEvalBaseFilters(employeeId);
        setBaseRows(list);
        const first = dedupeBy(list, (r) => num(r.fk_course_id))[0];
        if (first) setCourseId(String(num(first.fk_course_id)));
      } catch (e) {
        toastError(e, "Failed to load filters");
      } finally {
        setLoadingFilters(false);
      }
    }
    void init();
  }, [employeeId]);

  useEffect(() => {
    setAcademicYearId("");
    setExamId("");
    setRegulationId("");
    setSubjectId("");
    setEvaluatorProfileId("");
    setSubjectFilterRows([]);
    setEvaluatorRows([]);
    setRows([]);
    setStudentsList([]);
    if (!courseId || !academicYears.length) return;
    setAcademicYearId(String(num(academicYears[0].fk_academic_year_id)));
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setExamId("");
    setRegulationId("");
    setSubjectId("");
    setEvaluatorProfileId("");
    setSubjectFilterRows([]);
    setEvaluatorRows([]);
    setRows([]);
    setStudentsList([]);
    if (!academicYearId || !exams.length) return;
    setExamId(String(num(exams[0].fk_exam_id)));
  }, [academicYearId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function loadSubjects() {
      setRegulationId("");
      setSubjectId("");
      setEvaluatorProfileId("");
      setEvaluatorRows([]);
      setRows([]);
      setStudentsList([]);
      if (!courseId || !academicYearId || !examId) {
        setSubjectFilterRows([]);
        return;
      }
      setLoadingFilters(true);
      try {
        const list = await getDailyEvalSubjectRows({
          courseId: Number(courseId),
          academicYearId: Number(academicYearId),
          examId: Number(examId),
          employeeId,
        });
        setSubjectFilterRows(list);
        const regs = dedupeBy(list, (r) => num(r.fk_regulation_id));
        if (regs.length) setRegulationId(String(num(regs[0].fk_regulation_id)));
        else setRegulationId("0");
      } catch (e) {
        toastError(e, "Failed to load subjects");
        setSubjectFilterRows([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadSubjects();
  }, [courseId, academicYearId, examId, employeeId]);

  useEffect(() => {
    setSubjectId("");
    setEvaluatorProfileId("");
    setEvaluatorRows([]);
    setRows([]);
    setStudentsList([]);
    if (regulationId === "" || !subjects.length) {
      if (regulationId !== "" && !subjects.length) setSubjectId("0");
      return;
    }
    setSubjectId(String(num(subjects[0].fk_subject_id)));
  }, [regulationId, subjectFilterRows]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function loadEvals() {
      setEvaluatorProfileId("");
      setRows([]);
      setStudentsList([]);
      if (
        !courseId ||
        !academicYearId ||
        !examId ||
        regulationId === "" ||
        subjectId === ""
      ) {
        setEvaluatorRows([]);
        return;
      }
      setLoadingFilters(true);
      try {
        // Angular selectedsubject: courseYearId from form (often empty → 0)
        const list = await getDailyEvalEvaluators({
          organizationId: organizationId || 1,
          examId: Number(examId),
          courseYearId: 0,
          subjectId: Number(subjectId),
          regulationId: Number(regulationId),
          courseId: Number(courseId),
          academicYearId: Number(academicYearId),
          employeeId,
        });
        setEvaluatorRows(list);
        const first = dedupeBy(list, (r) =>
          num(r.pk_exam_evaluator_profile_id),
        )[0];
        if (first) {
          setEvaluatorProfileId(
            String(num(first.pk_exam_evaluator_profile_id)),
          );
        } else {
          setEvaluatorProfileId("0");
        }
      } catch (e) {
        toastError(e, "Failed to load evaluators");
        setEvaluatorRows([]);
        setEvaluatorProfileId("0");
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadEvals();
  }, [
    courseId,
    academicYearId,
    examId,
    regulationId,
    subjectId,
    organizationId,
    employeeId,
  ]);

  function clearResults() {
    setRows([]);
    setStudentsList([]);
  }

  async function onGetList() {
    if (
      !courseId ||
      !academicYearId ||
      !examId ||
      regulationId === "" ||
      subjectId === "" ||
      evaluatorProfileId === "" ||
      !fromDate ||
      !toDate
    ) {
      toastInfo("Please Select Valid Filters");
      return;
    }
    setLoadingList(true);
    setStudentsList([]);
    try {
      // Angular getList → result.data.result[0] → table; then getStudentsList
      const list = await getDailyEvaluatedReport({
        examId: Number(examId),
        subjectId: Number(subjectId),
        evaluatorProfileId: Number(evaluatorProfileId),
        fromDate,
        toDate,
        isReevaluation,
      });
      setRows(list);
      if (!list.length) {
        toastSuccess("No Records Found.");
        return;
      }

      try {
        const students = await getDailyEvaluatedStudentList({
          examId: Number(examId),
          subjectId: Number(subjectId),
          evaluatorProfileId: Number(evaluatorProfileId),
          fromDate,
          toDate,
          isReevaluation,
        });
        setStudentsList(students);
      } catch {
        // Table still shows; drill-down / Print Answer Sheets need students
        setStudentsList([]);
      }
    } catch (e) {
      toastError(e, "Failed to load report");
      setRows([]);
      setStudentsList([]);
    } finally {
      setLoadingList(false);
    }
  }

  function openSheets(row: AnyRow, mode: "assigned" | "completed") {
    const profileId = num(row.fk_exam_evaluator_profile_id);
    const filtered = filterStudentsForEvaluator(studentsList, profileId, mode);
    setSheetTitle(
      `Student Answer Sheets (${txt(row.evaluator_name)}-(${txt(row.user_name)}))`,
    );
    setSheetRows(filtered);
    setSheetSearch("");
    setSheetOpen(true);
  }

  function exportAsExcel() {
    if (!rows.length) {
      toastInfo("No data to export");
      return;
    }
    const columns = [
      { key: "si", header: "SI.No" },
      { key: "name", header: "Evaluator Name" },
      { key: "code", header: "Course Code" },
      { key: "email", header: "Evaluator Email" },
      { key: "assigned", header: "Assigned Answer Sheets" },
      { key: "evaluated", header: "Evaluated Answer Sheets" },
    ];
    const data = rows.map((row, i) => ({
      si: i + 1,
      name: txt(row.evaluator_name),
      code: txt(row.subject_code),
      email: txt(row.email),
      assigned: num(row.no_of_students_assigned),
      evaluated: num(row.no_of_evaluations_completed),
    }));
    exportHtmlTableAsExcel(
      "Daily Evaluated Report",
      buildHtmlTable(columns, data),
      "<strong>Daily Evaluated Report</strong>",
    );
  }

  function onBack() {
    try {
      sessionStorage.removeItem("examVerificationBack");
    } catch {
      /* ignore */
    }
    // Angular goBack() → location.back()
    router.back();
  }

  const filteredSheetRows = useMemo(() => {
    const q = sheetSearch.trim().toLowerCase();
    if (!q) return sheetRows;
    return sheetRows.filter(
      (r) =>
        txt(r.omr_serial_no).toLowerCase().includes(q) ||
        txt(r.evaluated_totalmarks).toLowerCase().includes(q),
    );
  }, [sheetRows, sheetSearch]);

  // Angular columns: evaluator_name, subject_code, email,
  // no_of_students_assigned, no_of_evaluations_completed
  const columnDefs = useMemo(
    (): ColDef<AnyRow>[] => [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        headerName: "Evaluator Name",
        field: "evaluator_name",
        minWidth: 180,
        valueGetter: (p) => txt(p.data?.evaluator_name),
      },
      {
        headerName: "Course Code",
        field: "subject_code",
        minWidth: 110,
        valueGetter: (p) => txt(p.data?.subject_code),
      },
      {
        headerName: "Evaluator Email",
        field: "email",
        minWidth: 180,
        valueGetter: (p) => txt(p.data?.email),
      },
      {
        headerName: "Assigned Answer Sheets",
        field: "no_of_students_assigned",
        minWidth: 160,
        cellRenderer: (p: ICellRendererParams<AnyRow>) => {
          if (!p.data) return null;
          return (
            <button
              type="button"
              className="text-blue-700 font-semibold hover:underline"
              onClick={() => openSheets(p.data!, "assigned")}
            >
              {num(p.data.no_of_students_assigned)}
            </button>
          );
        },
      },
      {
        headerName: "Evaluated Answer Sheets",
        field: "no_of_evaluations_completed",
        minWidth: 170,
        cellRenderer: (p: ICellRendererParams<AnyRow>) => {
          if (!p.data) return null;
          return (
            <button
              type="button"
              className="text-blue-700 font-semibold hover:underline"
              onClick={() => openSheets(p.data!, "completed")}
            >
              {num(p.data.no_of_evaluations_completed)}
            </button>
          );
        },
      },
    ],
    [studentsList],
  );

  const filters = (
    <>
      <GlobalFilterBarRow>
        <GlobalFilterField label="Course *">
          <Select
            options={courses.map((c) => ({
              value: String(num(c.fk_course_id)),
              label: txt(c.course_code),
            }))}
            value={courseId || null}
            onChange={(v) => setCourseId(v ?? "")}
            disabled={loadingFilters}
            placeholder="Course"
          />
        </GlobalFilterField>
        <GlobalFilterField label="Exam Year *">
          <Select
            options={academicYears.map((y) => ({
              value: String(num(y.fk_academic_year_id)),
              label: txt(y.academic_year),
            }))}
            value={academicYearId || null}
            onChange={(v) => setAcademicYearId(v ?? "")}
            disabled={loadingFilters || !courseId}
            placeholder="Exam Year"
          />
        </GlobalFilterField>
        <GlobalFilterField
          label="Exam Master *"
          className="min-w-[280px] flex-[2]"
        >
          <Select
            options={exams.map((e) => ({
              value: String(num(e.fk_exam_id)),
              label: formatExamLabel(e),
            }))}
            value={examId || null}
            onChange={(v) => setExamId(v ?? "")}
            disabled={loadingFilters || !academicYearId}
            placeholder="Exam Master"
            searchable
          />
        </GlobalFilterField>
      </GlobalFilterBarRow>

      <GlobalFilterBarRow>
        <GlobalFilterField label="Regulation *">
          <Select
            options={[
              { value: "0", label: "All" },
              ...regulations.map((r) => ({
                value: String(num(r.fk_regulation_id)),
                label: txt(r.regulation_code),
              })),
            ]}
            value={regulationId || null}
            onChange={(v) => setRegulationId(v ?? "")}
            disabled={loadingFilters || !examId}
            placeholder="Regulation"
          />
        </GlobalFilterField>
        <GlobalFilterField label="Subject *" className="min-w-[240px] flex-[2]">
          <Select
            options={[
              { value: "0", label: "All" },
              ...subjects.map((s) => ({
                value: String(num(s.fk_subject_id)),
                label: `${txt(s.subject_name)} (${txt(s.subject_code)})`,
              })),
            ]}
            value={subjectId || null}
            onChange={(v) => setSubjectId(v ?? "")}
            disabled={loadingFilters || regulationId === ""}
            placeholder="Subject"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Evaluators">
          <Select
            options={[
              { value: "0", label: "All" },
              ...evaluators.map((e) => ({
                value: String(num(e.pk_exam_evaluator_profile_id)),
                label: `${txt(e.evaluator_name)} (${txt(e.user_name)})`,
              })),
            ]}
            value={evaluatorProfileId || null}
            onChange={(v) => {
              setEvaluatorProfileId(v ?? "");
              clearResults();
            }}
            disabled={loadingFilters || subjectId === ""}
            placeholder="Evaluators"
            searchable
          />
        </GlobalFilterField>
      </GlobalFilterBarRow>

      <GlobalFilterBarRow>
        <GlobalFilterField label="From Date">
          <DatePicker
            value={fromDate ? new Date(`${fromDate}T00:00:00`) : null}
            onChange={(d) => {
              setFromDate(d ? format(d, "yyyy-MM-dd") : "");
              clearResults();
            }}
            placeholder="From Date"
            displayFormat="dd/MM/yyyy"
            maxDate={new Date()}
          />
        </GlobalFilterField>
        <GlobalFilterField label="To Date">
          <DatePicker
            value={toDate ? new Date(`${toDate}T00:00:00`) : null}
            onChange={(d) => {
              setToDate(d ? format(d, "yyyy-MM-dd") : "");
              clearResults();
            }}
            placeholder="To Date"
            displayFormat="dd/MM/yyyy"
          />
        </GlobalFilterField>
        <GlobalFilterField label="Is Re-Evaluation">
          <div className="flex h-[30px] items-center gap-2">
            <Checkbox
              id="dailyIsReeval"
              checked={isReevaluation}
              onCheckedChange={(v) => {
                setIsReevaluation(v === true);
                clearResults();
              }}
            />
            <Label htmlFor="dailyIsReeval" className="text-[12px] font-normal">
              Is Re-Evaluation
            </Label>
          </div>
        </GlobalFilterField>
        <GlobalFilterField
          label=""
          className="global-filter-field--shrink global-filter-field--action"
        >
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => void onGetList()}
              disabled={loadingList}
              className="h-[30px] px-3 text-[12px]"
            >
              Get List
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onBack}
              className="h-[30px] px-3 text-[12px] bg-amber-400 text-black hover:bg-amber-500"
            >
              Back
            </Button>
          </div>
        </GlobalFilterField>
      </GlobalFilterBarRow>
    </>
  );

  return (
    <FilteredListPage
      title="Daily Evaluated Report"
      filters={filters}
      rowData={rows}
      columnDefs={columnDefs}
      loading={loadingList}
      pagination
      toolbar={TOOLBAR}
      toolbarTrailing={
        rows.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={exportAsExcel}
            >
              Excel Export
            </Button>
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={() => printDailyReport(rows)}
            >
              Print Report
            </Button>
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={() =>
                printAnswerSheetsReport(rows, studentsList, fromDate, toDate)
              }
            >
              Print Answer Sheets
            </Button>
          </div>
        ) : null
      }
      getRowId={(p) =>
        `${txt(p.data?.fk_exam_evaluator_profile_id)}-${txt(p.data?.subject_code)}-${txt(p.data?.email)}`
      }
    >
      <FormModal
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={sheetTitle}
        onSubmit={(e) => {
          e.preventDefault();
          setSheetOpen(false);
        }}
        submitLabel="Close"
        cancelLabel="Cancel"
        size="lg"
      >
        <div className="space-y-3">
          <Input
            placeholder="Search"
            value={sheetSearch}
            onChange={(e) => setSheetSearch(e.target.value)}
            className="h-8 text-[12px]"
          />
          <div className="max-h-[360px] overflow-auto border rounded-md">
            <table className="w-full text-[12px]">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-left p-2 border-b">S.No</th>
                  <th className="text-left p-2 border-b">Omr Serial No</th>
                  <th className="text-left p-2 border-b">
                    Evaluated Total Marks
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSheetRows.map((s, i) => (
                  <tr key={`${txt(s.omr_serial_no)}-${i}`} className="border-b">
                    <td className="p-2">{i + 1}</td>
                    <td className="p-2">{txt(s.omr_serial_no)}</td>
                    <td className="p-2">{txt(s.evaluated_totalmarks)}</td>
                  </tr>
                ))}
                {!filteredSheetRows.length && (
                  <tr>
                    <td
                      colSpan={3}
                      className="p-3 text-center text-muted-foreground"
                    >
                      No records
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </FormModal>
    </FilteredListPage>
  );
}
