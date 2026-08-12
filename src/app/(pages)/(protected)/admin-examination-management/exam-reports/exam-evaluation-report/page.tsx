"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { rowIndexGetter } from "@/lib/utils";
import { dedupeBy, num, txt } from "@/common/utils/data-helpers";
import { toastError, toastSuccess } from "@/lib/toast";
import { toast } from "sonner";
import { useCollegeLogo } from "@/hooks/useCollegeLogo";
import {
  buildHtmlTable,
  exportHtmlTableAsExcel,
} from "../../_lib/export-html-table";
import {
  getEvalReportBaseFilters,
  getEvalReportEvaluators,
  getEvalReportSubjectRows,
  getExamEvaluationDetailReport,
  type AnyRow,
} from "@/services";
import { useRouter } from "next/navigation";

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Angular printPage() — portrait report with logo + compact table. */
function printEvaluationReport(rows: AnyRow[], logoUrl: string) {
  if (!rows.length) return;
  const rowHtml = rows
    .map((row, i) => {
      const assigned = num(row.evaluator_subject_evaluation_cnt);
      const done = num(row.evaluator_subject_evaluation_completed_cnt);
      const due = assigned - done;

      return `<tr>
        <td class="text-center">${i + 1}</td>
        <td class="text-center">${escapeHtml(txt(row.course_year_code))}</td>
        <td>${escapeHtml(txt(row.subject_code))}</td>
        <td>${escapeHtml(txt(row.subject_name))}</td>
        <td class="num">${num(row.total_uploaded)}</td>
        <td class="num">${num(row.total_evaluation_assgn_cnt)}</td>
        <td class="num">${num(row.total_unassigned)}</td>
        <td class="num">${num(row.total_subject_evaluation_completed_cnt)}</td>
        <td>${escapeHtml(txt(row.evaluator_type))}</td>
        <td>${escapeHtml(txt(row.evaluator_name))}</td>
        <td>${escapeHtml(txt(row.email))}</td>
        <td>${escapeHtml(txt(row.mobile_number))}</td>
        <td class="num">${assigned}</td>
        <td class="num">${done}</td>
        <td class="num">${due}</td>
      </tr>`;
    })
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Exam Evaluation Report</title>
<style>
@page { size: A4 portrait; margin: 10mm; }
* { box-sizing: border-box; }
body {
  margin: 0;
  color: #000;
  font-family: Arial, sans-serif;
  font-size: 7px;
  line-height: 1.25;
}
.report-shell {
  width: 100%;
}
.report-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.logo-wrap {
  width: 68px;
  min-width: 68px;
  text-align: center;
}
.logo {
  max-width: 60px;
  max-height: 60px;
  object-fit: contain;
}
.title-wrap {
  flex: 1;
  text-align: center;
  padding-right: 68px;
}
.collegeName {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
}
table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
th, td {
  border: 1px solid #000;
  padding: 3px 4px;
  vertical-align: middle;
  word-break: break-word;
}
th {
  background: #f2f2f2;
  font-size: 7px;
  font-weight: 700;
  text-align: center;
}
td {
  font-size: 6.8px;
}
.text-center {
  text-align: center;
}
.num {
  color: #1d4ed8;
  font-weight: 700;
  text-align: center;
}
</style></head>
<body>
  <div class="report-shell">
    <div class="report-header">
      <div class="logo-wrap">
        <img src="${escapeHtml(logoUrl)}" class="logo" alt="College Logo" />
      </div>
      <div class="title-wrap">
        <p class="collegeName">Exam Evaluation Report</p>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 5%;">SI.No</th>
          <th style="width: 8%;">Semester</th>
          <th style="width: 9%;">Subject Code</th>
          <th style="width: 15%;">Subject Name</th>
          <th style="width: 7%;">Total Papers</th>
          <th style="width: 7%;">Assigned</th>
          <th style="width: 7%;">Not Assigned</th>
          <th style="width: 7%;">Completed</th>
          <th style="width: 9%;">Evaluator Type</th>
          <th style="width: 9%;">Name</th>
          <th style="width: 11%;">Email</th>
          <th style="width: 8%;">Mobile</th>
          <th style="width: 6%;">A</th>
          <th style="width: 6%;">C</th>
          <th style="width: 6%;">Due</th>
        </tr>
      </thead>
      <tbody>${rowHtml}</tbody>
    </table>
  </div>
</body></html>`;

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

export default function ExamEvaluationReportPage() {
  const router = useRouter();
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const collegeLogo = useCollegeLogo(null);
  const [showBack, setShowBack] = useState(false);

  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [subjectFilterRows, setSubjectFilterRows] = useState<AnyRow[]>([]);
  const [evaluatorRows, setEvaluatorRows] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [regulationId, setRegulationId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [evaluatorProfileId, setEvaluatorProfileId] = useState("");
  const [isReevaluation, setIsReevaluation] = useState(false);

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );

  useEffect(() => {
    try {
      setShowBack(sessionStorage.getItem("examVerificationBack") === "back");
    } catch {
      setShowBack(false);
    }
  }, []);

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
    const list = baseRows.filter(
      (r) => num(r.fk_course_id) === cid && num(r.fk_academic_year_id) === ay,
    );
    return dedupeBy(list, (r) => num(r.fk_exam_id));
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
    () => dedupeBy(evaluatorRows, (r) => num(r.fk_exam_evaluator_profile_id)),
    [evaluatorRows],
  );

  useEffect(() => {
    async function init() {
      setLoadingFilters(true);
      try {
        const list = await getEvalReportBaseFilters(employeeId);
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

  // Course → AY
  useEffect(() => {
    setAcademicYearId("");
    setExamId("");
    setRegulationId("");
    setSubjectId("");
    setEvaluatorProfileId("");
    setSubjectFilterRows([]);
    setEvaluatorRows([]);
    setRows([]);
    if (!courseId || !academicYears.length) return;
    setAcademicYearId(String(num(academicYears[0].fk_academic_year_id)));
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  // AY → Exam
  useEffect(() => {
    setExamId("");
    setRegulationId("");
    setSubjectId("");
    setEvaluatorProfileId("");
    setSubjectFilterRows([]);
    setEvaluatorRows([]);
    setRows([]);
    if (!academicYearId || !exams.length) return;
    setExamId(String(num(exams[0].fk_exam_id)));
  }, [academicYearId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Exam → regulations / subjects
  useEffect(() => {
    async function loadSubjects() {
      setRegulationId("");
      setSubjectId("");
      setEvaluatorProfileId("");
      setEvaluatorRows([]);
      setRows([]);
      if (!courseId || !academicYearId || !examId) {
        setSubjectFilterRows([]);
        return;
      }
      setLoadingFilters(true);
      try {
        const list = await getEvalReportSubjectRows({
          courseId: Number(courseId),
          academicYearId: Number(academicYearId),
          examId: Number(examId),
          employeeId,
        });
        setSubjectFilterRows(list);
        const regs = dedupeBy(list, (r) => num(r.fk_regulation_id));
        if (regs.length) {
          setRegulationId(String(num(regs[0].fk_regulation_id)));
        } else {
          setRegulationId("0");
        }
      } catch (e) {
        toastError(e, "Failed to load subjects");
        setSubjectFilterRows([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadSubjects();
  }, [courseId, academicYearId, examId, employeeId]);

  // Regulation → subject auto-select
  useEffect(() => {
    setSubjectId("");
    setEvaluatorProfileId("");
    setEvaluatorRows([]);
    setRows([]);
    if (regulationId === "" || !subjects.length) {
      if (regulationId !== "" && !subjects.length) setSubjectId("0");
      return;
    }
    setSubjectId(String(num(subjects[0].fk_subject_id)));
  }, [regulationId, subjectFilterRows]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subject → evaluators
  useEffect(() => {
    async function loadEvals() {
      setEvaluatorProfileId("");
      setRows([]);
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
        const list = await getEvalReportEvaluators({
          courseId: Number(courseId),
          academicYearId: Number(academicYearId),
          examId: Number(examId),
          regulationId: Number(regulationId),
          subjectId: Number(subjectId),
          employeeId,
        });
        setEvaluatorRows(list);
        const first = dedupeBy(list, (r) =>
          num(r.fk_exam_evaluator_profile_id),
        )[0];
        // Angular selectedsubject: default to first evaluator when list has rows
        if (first) {
          setEvaluatorProfileId(
            String(num(first.fk_exam_evaluator_profile_id)),
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
  }, [courseId, academicYearId, examId, regulationId, subjectId, employeeId]);

  function clearResults() {
    setRows([]);
  }

  function onBack() {
    try {
      sessionStorage.removeItem("examVerificationBack");
    } catch {
      /* ignore */
    }
    router.back();
  }

  async function onGetList() {
    if (
      !courseId ||
      !academicYearId ||
      !examId ||
      regulationId === "" ||
      subjectId === "" ||
      evaluatorProfileId === ""
    ) {
      toastInfo("Please Select Valid Filters");
      return;
    }
    setLoadingList(true);
    try {
      const list = await getExamEvaluationDetailReport({
        courseId: Number(courseId),
        examId: Number(examId),
        regulationId: Number(regulationId),
        subjectId: Number(subjectId),
        evaluatorProfileId: Number(evaluatorProfileId),
        isReevaluation,
      });
      setRows(list);
      if (!list.length) toastSuccess("No Records Found");
    } catch (e) {
      toastError(e, "Failed to load report");
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }

  function exportAsExcel() {
    if (!rows.length) {
      toastInfo("No data to export");
      return;
    }
    const columns = [
      { key: "si", header: "SI.No" },
      { key: "semester", header: "Semester" },
      { key: "subjectCode", header: "Subject Code" },
      { key: "subjectName", header: "Subject Name" },
      { key: "totalPapers", header: "Total Papers" },
      { key: "assigned", header: "Assigned" },
      { key: "notAssigned", header: "Not Assigned" },
      { key: "completed", header: "Completed" },
      { key: "evaluatorType", header: "Evaluator Type" },
      { key: "name", header: "Name" },
      { key: "email", header: "Email" },
      { key: "mobile", header: "Mobile" },
      { key: "evalAssigned", header: "Assigned" },
      { key: "evalCompleted", header: "Completed" },
      { key: "due", header: "Due" },
    ];
    const data = rows.map((row, i) => {
      const assigned = num(row.evaluator_subject_evaluation_cnt);
      const done = num(row.evaluator_subject_evaluation_completed_cnt);
      return {
        si: i + 1,
        semester: txt(row.course_year_code),
        subjectCode: txt(row.subject_code),
        subjectName: txt(row.subject_name),
        totalPapers: num(row.total_uploaded),
        assigned: num(row.total_evaluation_assgn_cnt),
        notAssigned: num(row.total_unassigned),
        completed: num(row.total_subject_evaluation_completed_cnt),
        evaluatorType: txt(row.evaluator_type),
        name: txt(row.evaluator_name),
        email: txt(row.email),
        mobile: txt(row.mobile_number),
        evalAssigned: assigned,
        evalCompleted: done,
        due: assigned - done,
      };
    });
    exportHtmlTableAsExcel(
      "Exam Evaluation Report",
      buildHtmlTable(columns, data),
      `<strong>${escapeHtml("Exam Evaluation Report")}</strong>`,
    );
  }

  const columnDefs = useMemo(
    (): ColDef<AnyRow>[] => [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        headerName: "Semester",
        minWidth: 100,
        valueGetter: (p) => txt(p.data?.course_year_code),
      },
      {
        headerName: "Subject Code",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.subject_code),
      },
      {
        headerName: "Subject Name",
        minWidth: 180,
        valueGetter: (p) => txt(p.data?.subject_name),
      },
      {
        headerName: "Total Papers",
        minWidth: 110,
        valueGetter: (p) => num(p.data?.total_uploaded),
      },
      {
        headerName: "Assigned",
        minWidth: 100,
        valueGetter: (p) => num(p.data?.total_evaluation_assgn_cnt),
      },
      {
        headerName: "Not Assigned",
        minWidth: 110,
        valueGetter: (p) => num(p.data?.total_unassigned),
      },
      {
        headerName: "Completed",
        minWidth: 100,
        valueGetter: (p) => num(p.data?.total_subject_evaluation_completed_cnt),
      },
      {
        headerName: "Evaluator Type",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.evaluator_type),
      },
      {
        headerName: "Name",
        minWidth: 160,
        valueGetter: (p) => txt(p.data?.evaluator_name),
      },
      {
        headerName: "Email",
        minWidth: 160,
        valueGetter: (p) => txt(p.data?.email),
      },
      {
        headerName: "Mobile",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.mobile_number),
      },
      {
        headerName: "Assigned",
        minWidth: 100,
        valueGetter: (p) => num(p.data?.evaluator_subject_evaluation_cnt),
      },
      {
        headerName: "Completed",
        minWidth: 100,
        valueGetter: (p) =>
          num(p.data?.evaluator_subject_evaluation_completed_cnt),
      },
      {
        headerName: "Due",
        minWidth: 80,
        valueGetter: (p) =>
          num(p.data?.evaluator_subject_evaluation_cnt) -
          num(p.data?.evaluator_subject_evaluation_completed_cnt),
      },
    ],
    [],
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
        <GlobalFilterField label="Evaluators" className="min-w-[200px]">
          <Select
            options={[
              { value: "0", label: "All" },
              ...evaluators.map((e) => ({
                value: String(num(e.fk_exam_evaluator_profile_id)),
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
        <GlobalFilterField label="Is Re-Evaluation">
          <div className="flex h-[30px] items-center gap-2">
            <Checkbox
              id="evalIsReevaluation"
              checked={isReevaluation}
              onCheckedChange={(v) => {
                setIsReevaluation(v === true);
                clearResults();
              }}
            />
            <Label
              htmlFor="evalIsReevaluation"
              className="text-[12px] font-normal"
            >
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
          </div>
        </GlobalFilterField>
      </GlobalFilterBarRow>
    </>
  );

  return (
    <FilteredListPage
      title="Exam Evaluation Report"
      filters={filters}
      showTable={rows.length > 0}
      rowData={rows}
      columnDefs={columnDefs}
      loading={loadingList}
      pagination
      toolbar={TOOLBAR}
      toolbarTrailing={
        rows.length > 0 ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={exportAsExcel}
            >
              Export Excel
            </Button>
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={() => printEvaluationReport(rows, collegeLogo)}
            >
              Print Report
            </Button>
          </div>
        ) : null
      }
      getRowId={(p) =>
        `${txt(p.data?.fk_exam_evaluator_profile_id)}-${txt(p.data?.fk_subject_id)}-${txt(p.data?.subject_code)}-${txt(p.data?.email)}`
      }
    />
  );
}
