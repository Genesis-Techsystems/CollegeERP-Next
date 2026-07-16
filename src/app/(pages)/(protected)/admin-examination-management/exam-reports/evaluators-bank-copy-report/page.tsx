"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { FilteredPage } from "@/components/layout";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { DataTable } from "@/common/components/table";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { rowIndexGetter } from "@/lib/utils";
import { dedupeBy, num, txt } from "@/common/utils/data-helpers";
import { toastError, toastSuccess } from "@/lib/toast";
import { toast } from "sonner";
import {
  buildHtmlTable,
  exportHtmlTableAsExcel,
} from "../../_lib/export-html-table";
import {
  getBankCopyBaseFilters,
  getBankCopyEvaluators,
  getBankCopyRestAndRegulations,
  getBankCopySubjects,
  getEvaluatorsBankCopyReport,
  groupBankCopyByEvaluatorProfile,
  type AnyRow,
  type BankCopyProfileReport,
} from "@/services/evaluators-bank-copy-report";

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

function payableAmount(total: number): number {
  return total > 500 ? total : 500;
}

/**
 * Angular `printPage()` — prints evaluator bills from `evaluatedReportsByProfile`
 * (hall-ticket-wrapper / page-align / subject-table-refined styles).
 */
function printProfileReports(
  examName: string,
  universityCode: string,
  reports: BankCopyProfileReport[],
) {
  if (!reports.length) return;

  const banner =
    universityCode === "MECS"
      ? `<img src="/images/MECS_BANNER.png" class="college-banner" alt="" onerror="this.style.display='none'" />`
      : universityCode === "MVSR"
        ? `<img src="/images/MVSR_BANNER.png" class="college-banner-2" alt="" onerror="this.style.display='none'" />`
        : "";

  const pages = reports
    .map((report) => {
      // Angular note: Remuneration per script is {{report?.amount}}/-
      const ratePerScript =
        Number(report.amount) ||
        Number(report.subjects?.[0]?.amount) ||
        0;
      const subjectRows = (report.subjects ?? [])
        .map(
          (s, i) =>
            `<tr>
              <td>${i + 1}</td>
              <td>${escapeHtml(s.subject_code)}</td>
              <td>${escapeHtml(s.subject_name)}</td>
              <td>${s.no_of_evaluations_completed}</td>
              <td>${s.amount}</td>
              <td>${s.final_amount}</td>
            </tr>`,
        )
        .join("");

      return `
        <div class="page-align page-break">
          ${banner}
          <div>
            <p class="collegeName">Evaluators Bank Copy Report </p>
            <p class="title">${escapeHtml(examName)} </p>
          </div>
          <div>
            <div class="exam-header">
              <div>Evaluator ID : ${escapeHtml(txt(report.user_name))}</div>
              <div>Name of the Evaluator : ${escapeHtml(txt(report.evaluator_name))}</div>
              <div>Mobile : ${escapeHtml(txt(report.phonenumber))}</div>
              <div>Bank Account Number : ${escapeHtml(txt(report.account_number))}</div>
              <div>Bank Name : ${escapeHtml(txt(report.bank_name))}</div>
              <div>IFSC Code : ${escapeHtml(txt(report.ifsc_code))}</div>
              <div>Branch : ${escapeHtml(txt(report.bank_address))}</div>
              <div>PAN Card : ${escapeHtml(txt(report.pan_card))}</div>
            </div>
            <table class="subject-table-refined">
              <thead>
                <tr>
                  <th>S.NO</th>
                  <th>SUBJECT CODE</th>
                  <th>NAME OF THE SUBJECT</th>
                  <th>NO. OF SCRIPTS EVALUATED</th>
                  <th>RATE FOR SCRIPT</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>${subjectRows}</tbody>
              <tfoot>
                <tr>
                  <td colspan="3" class="grand-total-label"><b>Grand Total</b></td>
                  <td>${report.total_scripts}</td>
                  <td></td>
                  <td class="grand-total-amount">${report.total_final_amount}</td>
                </tr>
              </tfoot>
            </table>
            <div class="exam-header">
              <div> Total Amount Of : ${payableAmount(report.total_final_amount)}/- </div>
              <div class="light-text"> *Note :<br> Remuneration per script is ${ratePerScript}/- and minimum amount to be paid is 500/- </div>
              <div class="coe"> Controller Of Examinations </div>
              <div class="light-text"> This is System generated bill,No signature is required</div>
            </div>
          </div>
        </div>`;
    })
    .join("");

  // Styles mirror Angular evaluators-bank-copy-report.component.scss @media print
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Evaluators Bank Copy Report</title>
<style>
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    color: #000;
    background: #fff;
  }
  .hall-ticket-wrapper {
    font-family: Arial, sans-serif;
    font-size: 12px;
    margin: 0;
    padding: 0;
    color: #000;
    width: 98%;
  }
  .page-align {
    border: 1px solid black;
    padding: 8px;
    font-family: 'Times New Roman', Times, serif;
    box-sizing: border-box;
    width: 100%;
  }
  .page-break {
    page-break-after: always;
    page-break-inside: avoid;
    display: block;
    width: 100%;
    margin-bottom: 8px;
  }
  .page-break:last-child {
    page-break-after: auto;
  }
  .college-banner { width: 100%; height: auto; }
  .college-banner-2 { width: 100%; height: 90px; }
  .collegeName {
    text-align: center;
    font-weight: bold;
    font-size: 16px;
    margin: 18px 0 0;
    color: #000;
  }
  .title {
    font-weight: 500;
    text-align: center;
    font-size: 14px;
    color: #000;
    margin: 4px 0 10px;
  }
  .exam-header {
    font-family: Arial, sans-serif;
    font-size: 14px;
    margin: 10px 0;
    line-height: 1.6;
  }
  .subject-table-refined {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    margin-bottom: 3%;
    font-family: 'Times New Roman', Times, serif;
    font-size: 12px;
  }
  .subject-table-refined th,
  .subject-table-refined td {
    border: 1px solid black;
    padding: 6px;
    text-align: center;
    vertical-align: middle;
  }
  .subject-table-refined th {
    font-weight: bold;
  }
  .subject-table-refined td:nth-child(2),
  .subject-table-refined td:nth-child(3) {
    text-align: left;
    padding-left: 10px;
    padding-right: 10px;
  }
  .grand-total-label { text-align: right !important; }
  .grand-total-amount { text-align: center !important; }
  .light-text {
    font-family: 'Roboto', Arial, sans-serif;
    font-weight: 300;
    margin-top: 5%;
  }
  .coe {
    text-align: right !important;
    margin-top: 5% !important;
  }
</style></head>
<body><div class="hall-ticket-wrapper">${pages}</div></body></html>`;

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function EvaluatorsBankCopyReportPage() {
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [collegeRows, setCollegeRows] = useState<AnyRow[]>([]);
  const [regulationRows, setRegulationRows] = useState<AnyRow[]>([]);
  const [subjectRows, setSubjectRows] = useState<AnyRow[]>([]);
  const [evaluatorRows, setEvaluatorRows] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [courseGroupId, setCourseGroupId] = useState("");
  const [courseYearId, setCourseYearId] = useState("");
  const [regulationId, setRegulationId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [evaluatorProfileId, setEvaluatorProfileId] = useState("");
  const [isReevaluation, setIsReevaluation] = useState(false);

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [profileReports, setProfileReports] = useState<BankCopyProfileReport[]>(
    [],
  );

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
    const list = baseRows.filter(
      (r) =>
        num(r.fk_course_id) === cid && num(r.fk_academic_year_id) === ay,
    );
    return dedupeBy(list, (r) => num(r.fk_exam_id));
  }, [baseRows, courseId, academicYearId]);

  const colleges = useMemo(
    () => dedupeBy(collegeRows, (r) => num(r.fk_college_id)),
    [collegeRows],
  );

  const courseGroups = useMemo(() => {
    const clg = Number(collegeId);
    const list = collegeRows.filter((r) => num(r.fk_college_id) === clg);
    return dedupeBy(list, (r) => num(r.fk_course_group_id));
  }, [collegeRows, collegeId]);

  const courseYears = useMemo(() => {
    const clg = Number(collegeId);
    const cg = Number(courseGroupId);
    const list =
      cg === 0
        ? collegeRows.filter((r) => num(r.fk_college_id) === clg)
        : collegeRows.filter(
            (r) =>
              num(r.fk_college_id) === clg && num(r.fk_course_group_id) === cg,
          );
    return dedupeBy(list, (r) => num(r.fk_course_year_id));
  }, [collegeRows, collegeId, courseGroupId]);

  const regulations = useMemo(
    () => dedupeBy(regulationRows, (r) => num(r.fk_regulation_id)),
    [regulationRows],
  );

  const subjects = useMemo(
    () => dedupeBy(subjectRows, (r) => num(r.fk_subject_id)),
    [subjectRows],
  );

  const evaluators = useMemo(
    () =>
      dedupeBy(evaluatorRows, (r) => num(r.pk_exam_evaluator_profile_id)),
    [evaluatorRows],
  );

  const universityCode = useMemo(() => {
    const row = courses.find((c) => num(c.fk_course_id) === Number(courseId));
    return txt(row?.university_code);
  }, [courses, courseId]);

  const examName = useMemo(() => {
    const row = exams.find((e) => num(e.fk_exam_id) === Number(examId));
    return txt(row?.exam_name);
  }, [exams, examId]);

  // Initial load
  useEffect(() => {
    async function init() {
      setLoadingFilters(true);
      try {
        const list = await getBankCopyBaseFilters(employeeId);
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

  // Course → academic year
  useEffect(() => {
    setAcademicYearId("");
    setExamId("");
    setCollegeId("");
    setCourseGroupId("");
    setCourseYearId("");
    setRegulationId("");
    setSubjectId("");
    setEvaluatorProfileId("");
    setRows([]);
    setProfileReports([]);
    setCollegeRows([]);
    setRegulationRows([]);
    setSubjectRows([]);
    setEvaluatorRows([]);
    if (!courseId || !academicYears.length) return;
    setAcademicYearId(String(num(academicYears[0].fk_academic_year_id)));
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps -- cascade reset

  // AY → exam
  useEffect(() => {
    setExamId("");
    setCollegeId("");
    setCourseGroupId("");
    setCourseYearId("");
    setRegulationId("");
    setSubjectId("");
    setEvaluatorProfileId("");
    setRows([]);
    setProfileReports([]);
    setCollegeRows([]);
    setRegulationRows([]);
    setSubjectRows([]);
    setEvaluatorRows([]);
    if (!academicYearId || !exams.length) return;
    setExamId(String(num(exams[0].fk_exam_id)));
  }, [academicYearId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Exam → colleges / regulations
  useEffect(() => {
    async function loadRest() {
      setCollegeId("");
      setCourseGroupId("");
      setCourseYearId("");
      setRegulationId("");
      setSubjectId("");
      setEvaluatorProfileId("");
      setRows([]);
      setProfileReports([]);
      setSubjectRows([]);
      setEvaluatorRows([]);
      if (!courseId || !academicYearId || !examId) {
        setCollegeRows([]);
        setRegulationRows([]);
        return;
      }
      setLoadingFilters(true);
      try {
        const { colleges: clg, regulations: regs } =
          await getBankCopyRestAndRegulations({
            courseId: Number(courseId),
            academicYearId: Number(academicYearId),
            examId: Number(examId),
            employeeId,
          });
        setCollegeRows(clg);
        setRegulationRows(regs);
        const firstClg = dedupeBy(clg, (r) => num(r.fk_college_id))[0];
        if (firstClg) setCollegeId(String(num(firstClg.fk_college_id)));
      } catch (e) {
        toastError(e, "Failed to load college filters");
        setCollegeRows([]);
        setRegulationRows([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadRest();
  }, [courseId, academicYearId, examId, employeeId]);

  // College → course group
  useEffect(() => {
    setCourseGroupId("");
    setCourseYearId("");
    setRegulationId("");
    setSubjectId("");
    setEvaluatorProfileId("");
    setRows([]);
    setProfileReports([]);
    setSubjectRows([]);
    setEvaluatorRows([]);
    if (!collegeId || !courseGroups.length) return;
    setCourseGroupId(String(num(courseGroups[0].fk_course_group_id)));
  }, [collegeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Group → year
  useEffect(() => {
    setCourseYearId("");
    setRegulationId("");
    setSubjectId("");
    setEvaluatorProfileId("");
    setRows([]);
    setProfileReports([]);
    setSubjectRows([]);
    setEvaluatorRows([]);
    if (courseGroupId === "" || !courseYears.length) return;
    setCourseYearId(String(num(courseYears[0].fk_course_year_id)));
  }, [courseGroupId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Year → regulation
  useEffect(() => {
    setRegulationId("");
    setSubjectId("");
    setEvaluatorProfileId("");
    setRows([]);
    setProfileReports([]);
    setSubjectRows([]);
    setEvaluatorRows([]);
    if (courseYearId === "" || !regulations.length) return;
    setRegulationId(String(num(regulations[0].fk_regulation_id)));
  }, [courseYearId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Regulation → subjects
  useEffect(() => {
    async function loadSubjects() {
      setSubjectId("");
      setEvaluatorProfileId("");
      setRows([]);
      setProfileReports([]);
      setEvaluatorRows([]);
      if (
        !collegeId ||
        !courseId ||
        courseGroupId === "" ||
        courseYearId === "" ||
        !examId ||
        !academicYearId ||
        !regulationId
      ) {
        setSubjectRows([]);
        return;
      }
      setLoadingFilters(true);
      try {
        const list = await getBankCopySubjects({
          collegeId: Number(collegeId),
          courseId: Number(courseId),
          courseGroupId: Number(courseGroupId),
          courseYearId: Number(courseYearId),
          examId: Number(examId),
          academicYearId: Number(academicYearId),
          regulationId: Number(regulationId),
          employeeId,
        });
        setSubjectRows(list);
        const first = dedupeBy(list, (r) => num(r.fk_subject_id))[0];
        if (first) setSubjectId(String(num(first.fk_subject_id)));
        else setSubjectId("0");
      } catch (e) {
        toastError(e, "Failed to load subjects");
        setSubjectRows([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadSubjects();
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

  // Subject → evaluators
  useEffect(() => {
    async function loadEvals() {
      setEvaluatorProfileId("");
      setRows([]);
      setProfileReports([]);
      if (
        !courseId ||
        !academicYearId ||
        !examId ||
        courseYearId === "" ||
        !regulationId ||
        subjectId === ""
      ) {
        setEvaluatorRows([]);
        return;
      }
      setLoadingFilters(true);
      try {
        const list = await getBankCopyEvaluators({
          organizationId: organizationId || 1,
          examId: Number(examId),
          courseYearId: Number(courseYearId),
          subjectId: Number(subjectId),
          regulationId: Number(regulationId),
          courseId: Number(courseId),
          academicYearId: Number(academicYearId),
          employeeId,
        });
        setEvaluatorRows(list);
        const first = dedupeBy(
          list,
          (r) => num(r.pk_exam_evaluator_profile_id),
        )[0];
        if (first)
          setEvaluatorProfileId(
            String(num(first.pk_exam_evaluator_profile_id)),
          );
        else setEvaluatorProfileId("0");
      } catch (e) {
        toastError(e, "Failed to load evaluators");
        setEvaluatorRows([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadEvals();
  }, [
    courseId,
    academicYearId,
    examId,
    courseYearId,
    regulationId,
    subjectId,
    organizationId,
    employeeId,
  ]);

  function clearResults() {
    setRows([]);
    setProfileReports([]);
  }

  async function onGetList() {
    if (
      !courseId ||
      !academicYearId ||
      !examId ||
      !collegeId ||
      courseGroupId === "" ||
      courseYearId === "" ||
      !regulationId ||
      subjectId === "" ||
      evaluatorProfileId === ""
    ) {
      toastInfo("Please Select Required Filters");
      return;
    }
    setLoadingList(true);
    try {
      const list = await getEvaluatorsBankCopyReport({
        examId: Number(examId),
        subjectId: Number(subjectId),
        evaluatorProfileId: Number(evaluatorProfileId),
        isReevaluation,
      });
      setRows(list);
      setProfileReports(groupBankCopyByEvaluatorProfile(list));
      if (!list.length) toastSuccess("No Records Found.");
    } catch (e) {
      toastError(e, "Failed to load report");
      setRows([]);
      setProfileReports([]);
    } finally {
      setLoadingList(false);
    }
  }

  function exportAsExcel() {
    if (!profileReports.length) {
      toastInfo("No data to export");
      return;
    }
    const columns = [
      { key: "examName", header: "Exam Name" },
      { key: "evaluatorName", header: "Evaluator Name" },
      { key: "mobile", header: "Mobile" },
      { key: "bankName", header: "Bank Name" },
      { key: "bankAddress", header: "Bank Address" },
      { key: "accountNumber", header: "Account Number" },
      { key: "ifscCode", header: "IFSC Code" },
      { key: "assignedScripts", header: "Total Scripts Assigned" },
      { key: "totalScripts", header: "Total Evaluations Completed" },
      { key: "totalSubjects", header: "Total Subjects" },
      { key: "amountPerEval", header: "Amount Per Evaluation" },
      { key: "finalAmount", header: "Final Amount" },
    ];
    const data = profileReports.map((report) => ({
      examName: String(report.exam_name || ""),
      evaluatorName: String(report.evaluator_name || ""),
      mobile: String(report.phonenumber || ""),
      bankName: String(report.bank_name || ""),
      bankAddress: String(report.bank_address || ""),
      accountNumber: String(report.account_number || ""),
      ifscCode: String(report.ifsc_code || ""),
      assignedScripts: report.assigned_scripts,
      totalScripts: report.total_scripts,
      totalSubjects: report.subjects?.length || 0,
      amountPerEval: report.amount,
      finalAmount: payableAmount(report.total_final_amount),
    }));
    exportHtmlTableAsExcel(
      "Evaluators_Bank_Copy_Report",
      buildHtmlTable(columns, data),
      "<h3>Evaluators Bank Copy Report</h3>",
    );
  }

  const columnDefs = useMemo(
    (): ColDef<AnyRow>[] => [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 80,
        flex: 0,
      },
      {
        headerName: "Evaluator Name",
        minWidth: 160,
        valueGetter: (p) => txt(p.data?.evaluator_name),
      },
      {
        headerName: "Subject Code",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.subject_code),
      },
      {
        headerName: "Assigned Answer Sheets",
        minWidth: 160,
        valueGetter: (p) => num(p.data?.no_of_students_assigned),
      },
      {
        headerName: "Evaluated Answer Sheets",
        minWidth: 170,
        valueGetter: (p) => num(p.data?.no_of_evaluations_completed),
      },
      {
        headerName: "Amount",
        minWidth: 100,
        valueGetter: (p) => num(p.data?.amount),
      },
      {
        headerName: "Total Amount",
        minWidth: 120,
        valueGetter: (p) => num(p.data?.final_amount),
      },
      {
        headerName: "Account No.",
        minWidth: 140,
        valueGetter: (p) => txt(p.data?.account_number),
      },
      {
        headerName: "IFSC Code",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.ifsc_code),
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
        <GlobalFilterField label="Exam Master *" className="min-w-[280px] flex-[2]">
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
        <GlobalFilterField label="College *">
          <Select
            options={colleges.map((c) => ({
              value: String(num(c.fk_college_id)),
              label: txt(c.college_code),
            }))}
            value={collegeId || null}
            onChange={(v) => setCollegeId(v ?? "")}
            disabled={loadingFilters || !examId}
            placeholder="College"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Course Group *">
          <Select
            options={[
              { value: "0", label: "All" },
              ...courseGroups.map((g) => ({
                value: String(num(g.fk_course_group_id)),
                label: txt(g.group_code),
              })),
            ]}
            value={courseGroupId || null}
            onChange={(v) => setCourseGroupId(v ?? "")}
            disabled={loadingFilters || !collegeId}
            placeholder="Course Group"
          />
        </GlobalFilterField>
        <GlobalFilterField label="Course Years *">
          <Select
            options={[
              { value: "0", label: "All" },
              ...courseYears.map((y) => ({
                value: String(num(y.fk_course_year_id)),
                label: txt(y.course_year_code),
              })),
            ]}
            value={courseYearId || null}
            onChange={(v) => setCourseYearId(v ?? "")}
            disabled={loadingFilters || courseGroupId === ""}
            placeholder="Course Years"
          />
        </GlobalFilterField>
        <GlobalFilterField label="Regulation *">
          <Select
            options={regulations.map((r) => ({
              value: String(num(r.fk_regulation_id)),
              label: txt(r.regulation_code),
            }))}
            value={regulationId || null}
            onChange={(v) => setRegulationId(v ?? "")}
            disabled={loadingFilters || courseYearId === ""}
            placeholder="Regulation"
          />
        </GlobalFilterField>
        <GlobalFilterField label="Subject *">
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
            disabled={loadingFilters || !regulationId}
            placeholder="Subject"
            searchable
          />
        </GlobalFilterField>
      </GlobalFilterBarRow>

      <GlobalFilterBarRow>
        <GlobalFilterField label="Evaluators *" className="min-w-[260px] flex-[2]">
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
        <GlobalFilterField label="Is Re-Evaluation">
          <div className="flex h-[30px] items-center gap-2">
            <Checkbox
              id="isReevaluation"
              checked={isReevaluation}
              onCheckedChange={(v) => {
                setIsReevaluation(v === true);
                clearResults();
              }}
            />
            <Label htmlFor="isReevaluation" className="text-[12px] font-normal">
              Is Re-Evaluation
            </Label>
          </div>
        </GlobalFilterField>
        <GlobalFilterField
          label=""
          className="global-filter-field--shrink global-filter-field--action"
        >
          <Button
            type="button"
            onClick={() => void onGetList()}
            disabled={loadingList}
            className="h-[30px] px-3 text-[12px]"
          >
            Get List
          </Button>
        </GlobalFilterField>
      </GlobalFilterBarRow>
    </>
  );

  return (
    <FilteredPage title="Evaluators Bank Copy Report" filters={filters}>
      {rows.length > 0 && (
        <DataTable
          title="Evaluators Bank Copy Report"
          rowData={rows}
          columnDefs={columnDefs}
          loading={loadingList}
          pagination
          bordered
          toolbar={TOOLBAR}
          toolbarTrailing={
            <div className="flex items-center gap-2">
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
                onClick={() =>
                  printProfileReports(examName, universityCode, profileReports)
                }
              >
                Print Report
              </Button>
            </div>
          }
          getRowId={(p) =>
            String(
              `${txt(p.data?.fk_exam_evaluator_profile_id)}-${txt(p.data?.subject_code)}-${txt(p.data?.account_number)}`,
            )
          }
        />
      )}
    </FilteredPage>
  );
}
