"use client";

/**
 * Exam Student Registration Report — Angular
 * `exam-reports/exam-registration-student-report`
 *
 * Filters: Course, Academic Year, Exam, Exam Type, Exam Timetable,
 * Course Group, Course Years, Regulation, Subjects, Is Re-Evaluation.
 * Get List → s_get_exam_std_reg_tt_details (exam_std_reg_details).
 *
 * Distinct from admin-exam-reports/exam-student-registration-report
 * (College / Room / Student + exam_student_reg allotment API).
 */

import { useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { format, parseISO } from "date-fns";
import { FilteredListPage } from "@/components/layout";
import { GlobalFilterField } from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { rowIndexGetter } from "@/lib/utils";
import { dedupeBy, num, txt } from "@/common/utils/data-helpers";
import { toastError, toastSuccess } from "@/lib/toast";
import { toast } from "sonner";
import { printHtmlInIframe } from "@/lib/print";
import { exportHtmlTableAsExcel } from "../../_lib/export-html-table";
import {
  getExamRegistrationReportBaseFilters,
  getExamRegistrationReportFeeTypes,
  getExamRegistrationReportRestFilters,
  getExamRegistrationReportSubjects,
  getExamRegistrationReportTimetables,
  getExamStudentRegistrationReportList,
} from "@/services";

type AnyRow = Record<string, unknown>;

const REPORT_TITLE = "Exam Registration Students";

const toastInfo = (msg: string) => toast.info(msg);

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search...",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

const EXPORT_COLS = [
  { key: "si", header: "S.No" },
  { key: "examDate", header: "Exam Date" },
  { key: "subjectType", header: "Subject Type" },
  { key: "subject", header: "Subject" },
  { key: "college", header: "College" },
  { key: "course", header: "Course" },
  { key: "group", header: "Course Group" },
  { key: "year", header: "Course Year" },
  { key: "examType", header: "Exam Type" },
  { key: "hallTicket", header: "Hall Ticket" },
] as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Angular date pipe for Exam option — `MMM d, yyyy`. */
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

function examTypeTags(exam: AnyRow): string[] {
  const tags: string[] = [];
  if (exam.is_internal_exam || exam.isInternalExam) tags.push("(Internal)");
  if (exam.is_regular_exam || exam.isRegularExam) tags.push("(Regular)");
  if (exam.is_supply_exam || exam.isSupplyExam) tags.push("(Supple)");
  return tags;
}

function formatExamLabel(exam: AnyRow): string {
  const name = txt(exam.exam_name) || "Exam";
  const from = parseExamDate(exam.from_date ?? exam.fromDate);
  const to = parseExamDate(exam.to_date ?? exam.toDate);
  const range = from && to ? ` (${from} - ${to})` : "";
  const tags = examTypeTags(exam);
  return `${name}${range}${tags.length ? ` ${tags.join("")}` : ""}`;
}

function examMasterLabelNode(exam: AnyRow) {
  const name = txt(exam.exam_name) || "Exam";
  const from = parseExamDate(exam.from_date ?? exam.fromDate);
  const to = parseExamDate(exam.to_date ?? exam.toDate);
  const range = from && to ? ` (${from} - ${to})` : "";
  const tags = examTypeTags(exam);
  return (
    <>
      {name}
      {range}
      {tags.length ? " " : null}
      {tags.map((t) => (
        <span key={t} style={{ color: "#0014ff", fontWeight: 500 }}>
          {t}
        </span>
      ))}
    </>
  );
}

function examMasterTooltip(exam: AnyRow): string {
  const name = txt(exam.exam_name) || "Exam";
  const from = parseExamDate(exam.from_date ?? exam.fromDate);
  const to = parseExamDate(exam.to_date ?? exam.toDate);
  return from && to ? `${name} (${from} - ${to})` : name;
}

function feeTypeId(row: AnyRow): number {
  return num(row.generalDetailId ?? row.general_detail_id);
}

function feeTypeCode(row: AnyRow): string {
  return txt(row.generalDetailCode ?? row.general_detail_code);
}

function timetableId(row: AnyRow): number {
  return num(row.examTimetableId ?? row.exam_timetable_id);
}

function timetableLabel(row: AnyRow): string {
  const date = txt(row.examDate ?? row.exam_date).slice(0, 10);
  const session = txt(row.examSessionName ?? row.exam_session_name);
  return session ? `${date} (${session})` : date;
}

function toExportRows(rows: AnyRow[]): Record<string, unknown>[] {
  return rows.map((row, i) => ({
    si: i + 1,
    examDate: txt(row.exam_date),
    subjectType: txt(row.subject_type),
    subject: txt(row.subject),
    college: txt(row.college_code),
    course: txt(row.course_name),
    group: txt(row.course_group),
    year: txt(row.course_year),
    examType: txt(row.exam_type),
    hallTicket: txt(row.hallticket_number),
  }));
}

function buildTableHtml(rows: AnyRow[]): string {
  const exportRows = toExportRows(rows);
  const head = EXPORT_COLS.map(
    (c) => `<th class="table-th">${escapeHtml(c.header)}</th>`,
  ).join("");
  const body = exportRows
    .map(
      (row) =>
        `<tr>${EXPORT_COLS.map(
          (c) =>
            `<td class="table-td">${escapeHtml(String(row[c.key] ?? ""))}</td>`,
        ).join("")}</tr>`,
    )
    .join("");
  return `<table class="mar" border="1" cellspacing="0" cellpadding="4">
<thead><tr>${head}</tr></thead>
<tbody>${body}</tbody>
</table>`;
}

/** Angular `selectedData()` — leading ` / ` before each selected filter. */
function buildDataDetails(parts: {
  courseCode: string;
  examYear: string;
  examName: string;
  regulationCode: string;
  subjectCode: string;
}): string {
  let details = "";
  if (parts.courseCode) details += ` / ${parts.courseCode}`;
  if (parts.examYear) details += ` / ${parts.examYear}`;
  if (parts.examName) details += ` / ${parts.examName}`;
  if (parts.regulationCode) details += ` / ${parts.regulationCode}`;
  if (parts.subjectCode) details += ` / ${parts.subjectCode}`;
  return details;
}

function printReport(rows: AnyRow[], dataDetails: string) {
  if (!rows.length) return;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(REPORT_TITLE)}</title>
<style>
@page { size: A4 landscape; margin: 10mm; }
body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #000; }
.collegeName {
  text-align: center;
  font-size: 23px;
  font-weight: 550;
  color: #000;
  margin: 20px 0 -10px;
}
.title {
  text-align: center;
  font-size: 19px;
  font-weight: 550;
  color: #000;
  margin: 5px 0 8px;
}
table.mar { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
th.table-th, td.table-td { border: 1px solid #000; padding: 8px 5px; text-align: left; vertical-align: top; }
th.table-th { background: #c3d9ff; font-weight: 550; }
tr { break-inside: avoid; }
</style></head>
<body>
  <p class="collegeName">${escapeHtml(REPORT_TITLE)}</p>
  ${dataDetails.trim() ? `<p class="title">${escapeHtml(dataDetails)}</p>` : ""}
  ${buildTableHtml(rows)}
</body></html>`;
  printHtmlInIframe(html);
}

export default function ExamRegistrationStudentReportPage() {
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [allFeeTypes, setAllFeeTypes] = useState<AnyRow[]>([]);
  const [examFeeTypes, setExamFeeTypes] = useState<AnyRow[]>([]);
  const [examTimetables, setExamTimetables] = useState<AnyRow[]>([]);
  const [subjects, setSubjects] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [dataDetails, setDataDetails] = useState("");

  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [examtypeCatdetId, setExamtypeCatdetId] = useState("0");
  const [examTimetableId, setExamTimetableId] = useState("0");
  const [courseGroupId, setCourseGroupId] = useState("0");
  const [courseYearId, setCourseYearId] = useState("0");
  const [regulationId, setRegulationId] = useState("0");
  const [subjectId, setSubjectId] = useState("0");
  const [isReevaluation, setIsReevaluation] = useState(false);

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => num(r.fk_course_id)),
    [baseRows],
  );
  const academicYears = useMemo(() => {
    if (!courseId) return [];
    const list = dedupeBy(
      baseRows.filter((r) => num(r.fk_course_id) === Number(courseId)),
      (r) => num(r.fk_academic_year_id),
    );
    return [...list].sort(
      (a, b) =>
        parseInt(txt(b.academic_year), 10) - parseInt(txt(a.academic_year), 10),
    );
  }, [baseRows, courseId]);
  const exams = useMemo(() => {
    if (!courseId || !academicYearId) return [];
    return dedupeBy(
      baseRows.filter(
        (r) =>
          num(r.fk_course_id) === Number(courseId) &&
          num(r.fk_academic_year_id) === Number(academicYearId),
      ),
      (r) => num(r.fk_exam_id),
    );
  }, [baseRows, courseId, academicYearId]);
  const selectedExam = useMemo(
    () => exams.find((e) => num(e.fk_exam_id) === Number(examId)),
    [exams, examId],
  );
  const courseGroups = useMemo(
    () => dedupeBy(restRows, (r) => num(r.fk_course_group_id)),
    [restRows],
  );
  const courseYears = useMemo(() => {
    const groupNum = Number(courseGroupId);
    const filtered =
      groupNum !== 0
        ? restRows.filter((r) => num(r.fk_course_group_id) === groupNum)
        : restRows;
    const list = dedupeBy(filtered, (r) => num(r.fk_course_year_id));
    return [...list].sort(
      (a, b) => num(a.cy_sort_order) - num(b.cy_sort_order),
    );
  }, [restRows, courseGroupId]);
  const regulations = useMemo(
    () => dedupeBy(restRows, (r) => num(r.fk_regulation_id)),
    [restRows],
  );

  function clearResults() {
    setRows([]);
    setDataDetails("");
  }

  useEffect(() => {
    async function loadBase() {
      setLoadingFilters(true);
      try {
        const [list, feeTypes] = await Promise.all([
          getExamRegistrationReportBaseFilters(employeeId),
          getExamRegistrationReportFeeTypes(),
        ]);
        setBaseRows(list);
        setAllFeeTypes(feeTypes);
      } catch (e) {
        toastError(e, "Failed to load filters");
        setBaseRows([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadBase();
  }, [employeeId]);

  useEffect(() => {
    setAcademicYearId("");
    setExamId("");
    setExamtypeCatdetId("0");
    setExamTimetableId("0");
    setCourseGroupId("0");
    setCourseYearId("0");
    setRegulationId("0");
    setSubjectId("0");
    setExamFeeTypes([]);
    setExamTimetables([]);
    setRestRows([]);
    setSubjects([]);
    clearResults();
  }, [courseId]);

  useEffect(() => {
    setExamId("");
    setExamtypeCatdetId("0");
    setExamTimetableId("0");
    setCourseGroupId("0");
    setCourseYearId("0");
    setRegulationId("0");
    setSubjectId("0");
    setExamFeeTypes([]);
    setExamTimetables([]);
    setRestRows([]);
    setSubjects([]);
    clearResults();
  }, [academicYearId]);

  useEffect(() => {
    setExamtypeCatdetId("0");
    setExamTimetableId("0");
    setCourseGroupId("0");
    setCourseYearId("0");
    setRegulationId("0");
    setSubjectId("0");
    setExamTimetables([]);
    setRestRows([]);
    setSubjects([]);
    clearResults();
    if (!examId || !selectedExam) {
      setExamFeeTypes([]);
      return;
    }
    setExamFeeTypes(
      allFeeTypes.filter((t) => {
        const code = feeTypeCode(t);
        if (code === "Regular") return Boolean(selectedExam.is_regular_exam);
        if (code === "Supple") return Boolean(selectedExam.is_supply_exam);
        if (code === "Internal") return Boolean(selectedExam.is_internal_exam);
        return false;
      }),
    );
  }, [examId, selectedExam, allFeeTypes]);

  useEffect(() => {
    async function loadTimetables() {
      setExamTimetableId("0");
      setCourseGroupId("0");
      setCourseYearId("0");
      setRegulationId("0");
      setSubjectId("0");
      setRestRows([]);
      setSubjects([]);
      clearResults();
      if (!examId) {
        setExamTimetables([]);
        return;
      }
      setLoadingFilters(true);
      try {
        setExamTimetables(
          await getExamRegistrationReportTimetables(Number(examId)),
        );
      } catch (e) {
        toastError(e, "Failed to load timetables");
        setExamTimetables([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadTimetables();
  }, [examtypeCatdetId, examId]);

  useEffect(() => {
    async function loadRest() {
      setCourseGroupId("0");
      setCourseYearId("0");
      setRegulationId("0");
      setSubjectId("0");
      setSubjects([]);
      clearResults();
      if (!courseId || !academicYearId || !examId) {
        setRestRows([]);
        return;
      }
      setLoadingFilters(true);
      try {
        setRestRows(
          await getExamRegistrationReportRestFilters({
            courseId: Number(courseId),
            academicYearId: Number(academicYearId),
            examId: Number(examId),
            employeeId,
          }),
        );
      } catch (e) {
        toastError(e, "Failed to load filter details");
        setRestRows([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadRest();
  }, [examTimetableId, courseId, academicYearId, examId, employeeId]);

  useEffect(() => {
    setCourseYearId("0");
    setRegulationId("0");
    setSubjectId("0");
    setSubjects([]);
    clearResults();
  }, [courseGroupId]);

  useEffect(() => {
    setRegulationId("0");
    setSubjectId("0");
    setSubjects([]);
    clearResults();
  }, [courseYearId]);

  useEffect(() => {
    async function loadSubjects() {
      setSubjectId("0");
      clearResults();
      if (!courseId || !academicYearId || !examId) {
        setSubjects([]);
        return;
      }
      setLoadingFilters(true);
      try {
        const list = await getExamRegistrationReportSubjects({
          courseId: Number(courseId),
          academicYearId: Number(academicYearId),
          examId: Number(examId),
          courseGroupId: Number(courseGroupId) || 0,
          courseYearId: Number(courseYearId) || 0,
          regulationId: Number(regulationId) || 0,
          employeeId,
        });
        setSubjects(dedupeBy(list, (r) => num(r.fk_subject_id)));
      } catch (e) {
        toastError(e, "Failed to load subjects");
        setSubjects([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadSubjects();
  }, [
    regulationId,
    courseId,
    academicYearId,
    examId,
    courseGroupId,
    courseYearId,
    employeeId,
  ]);

  async function onGetList() {
    if (!courseId || !academicYearId || !examId) {
      toastInfo("Please Select Required Filters");
      return;
    }
    setLoadingList(true);
    try {
      const courseCode =
        courses.find((c) => num(c.fk_course_id) === Number(courseId))
          ?.course_code ?? "";
      const examYear =
        academicYears.find(
          (y) => num(y.fk_academic_year_id) === Number(academicYearId),
        )?.academic_year ?? "";
      const examName =
        exams.find((e) => num(e.fk_exam_id) === Number(examId))?.exam_name ??
        "";
      const regulationCode =
        Number(regulationId) === 0
          ? ""
          : (regulations.find(
              (r) => num(r.fk_regulation_id) === Number(regulationId),
            )?.regulation_code ?? "");
      const subjectCode =
        Number(subjectId) === 0
          ? ""
          : (subjects.find((s) => num(s.fk_subject_id) === Number(subjectId))
              ?.subject_code ?? "");
      const details = buildDataDetails({
        courseCode: txt(courseCode),
        examYear: txt(examYear),
        examName: txt(examName),
        regulationCode: txt(regulationCode),
        subjectCode: txt(subjectCode),
      });

      const list = await getExamStudentRegistrationReportList({
        examId: Number(examId),
        courseId: Number(courseId),
        courseGroupId: Number(courseGroupId) || 0,
        courseYearId: Number(courseYearId) || 0,
        regulationId: Number(regulationId) || 0,
        subjectId: Number(subjectId) || 0,
        examtypeCatdetId: Number(examtypeCatdetId) || 0,
        examTimetableId: Number(examTimetableId) || 0,
        isReevaluation,
      });
      setRows(list.map((row, i) => ({ ...row, __rid: i })));
      setDataDetails(list.length > 0 ? details : "");
      if (!list.length) toastSuccess("No Records Found.");
    } catch (e) {
      toastError(e, "Failed to load report");
      setRows([]);
      setDataDetails("");
    } finally {
      setLoadingList(false);
    }
  }

  function handleExportExcel() {
    if (!rows.length) {
      toastInfo("No data to export");
      return;
    }
    exportHtmlTableAsExcel(
      REPORT_TITLE,
      buildTableHtml(rows),
      `<strong>${escapeHtml(REPORT_TITLE)}${dataDetails ? ` - ${escapeHtml(dataDetails)}` : ""}</strong>`,
    );
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "S.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        headerName: "Exam Date",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.exam_date),
      },
      {
        headerName: "Subject Type",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.subject_type),
      },
      {
        headerName: "Subject",
        minWidth: 180,
        valueGetter: (p) => txt(p.data?.subject),
      },
      {
        headerName: "College",
        minWidth: 110,
        valueGetter: (p) => txt(p.data?.college_code),
      },
      {
        headerName: "Course",
        minWidth: 140,
        valueGetter: (p) => txt(p.data?.course_name),
      },
      {
        headerName: "Course Group",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.course_group),
      },
      {
        headerName: "Course Year",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.course_year),
      },
      {
        headerName: "Exam Type",
        minWidth: 110,
        valueGetter: (p) => txt(p.data?.exam_type),
      },
      {
        headerName: "Hall Ticket",
        minWidth: 140,
        valueGetter: (p) => txt(p.data?.hallticket_number),
      },
    ],
    [],
  );

  const filters = (
    <div className="inv-allot-report-filters space-y-2">
      <div className="inv-allot-report-filters__row">
        <div className="inv-allot-report-filters__fx20">
          <GlobalFilterField label="Course">
            <Select
              value={courseId || null}
              onChange={(v) => setCourseId(v ?? "")}
              isLoading={loadingFilters}
              options={courses.map((c) => ({
                value: String(num(c.fk_course_id)),
                label: txt(c.course_code),
              }))}
              placeholder="Course"
              searchable
            />
          </GlobalFilterField>
        </div>
        <div className="inv-allot-report-filters__fx20">
          <GlobalFilterField label="Academic Year *">
            <Select
              value={academicYearId || null}
              onChange={(v) => setAcademicYearId(v ?? "")}
              isLoading={loadingFilters}
              options={academicYears.map((y) => ({
                value: String(num(y.fk_academic_year_id)),
                label: txt(y.academic_year),
              }))}
              placeholder="Academic Year"
              searchable
            />
          </GlobalFilterField>
        </div>
        <div className="inv-allot-report-filters__fx60">
          <GlobalFilterField label="Exam">
            <Select
              value={examId || null}
              onChange={(v) => setExamId(v ?? "")}
              isLoading={loadingFilters}
              options={exams.map((e) => ({
                value: String(num(e.fk_exam_id)),
                label: formatExamLabel(e),
                title: examMasterTooltip(e),
                labelNode: examMasterLabelNode(e),
              }))}
              placeholder="Exam"
              searchable
              searchPlaceholder="Search..."
              wrapOptionLabels
            />
          </GlobalFilterField>
        </div>
      </div>
      <div className="inv-allot-report-filters__row">
        <div className="inv-allot-report-filters__fx25">
          <GlobalFilterField label="Exam Type *">
            <Select
              value={examtypeCatdetId || null}
              onChange={(v) => setExamtypeCatdetId(v ?? "0")}
              isLoading={loadingFilters}
              options={[
                { value: "0", label: "All" },
                ...examFeeTypes.map((t) => ({
                  value: String(feeTypeId(t)),
                  label: feeTypeCode(t),
                })),
              ]}
              placeholder="Exam Type"
              searchable
            />
          </GlobalFilterField>
        </div>
        <div className="inv-allot-report-filters__fx25">
          <GlobalFilterField label="Exam Timetable *">
            <Select
              value={examTimetableId || null}
              onChange={(v) => setExamTimetableId(v ?? "0")}
              isLoading={loadingFilters}
              options={[
                { value: "0", label: "All" },
                ...examTimetables.map((t) => ({
                  value: String(timetableId(t)),
                  label: timetableLabel(t),
                })),
              ]}
              placeholder="Exam Timetable"
              searchable
            />
          </GlobalFilterField>
        </div>
        <div className="inv-allot-report-filters__fx25">
          <GlobalFilterField label="Course Group *">
            <Select
              value={courseGroupId || null}
              onChange={(v) => setCourseGroupId(v ?? "0")}
              isLoading={loadingFilters}
              options={[
                { value: "0", label: "All" },
                ...courseGroups.map((g) => ({
                  value: String(num(g.fk_course_group_id)),
                  label: txt(g.group_code),
                })),
              ]}
              placeholder="Course Group"
              searchable
            />
          </GlobalFilterField>
        </div>
        <div className="inv-allot-report-filters__fx25">
          <GlobalFilterField label="Course Years *">
            <Select
              value={courseYearId || null}
              onChange={(v) => setCourseYearId(v ?? "0")}
              isLoading={loadingFilters}
              options={[
                { value: "0", label: "All" },
                ...courseYears.map((y) => ({
                  value: String(num(y.fk_course_year_id)),
                  label: txt(y.course_year_code ?? y.course_year_name),
                })),
              ]}
              placeholder="Course Years"
              searchable
            />
          </GlobalFilterField>
        </div>
      </div>
      <div className="inv-allot-report-filters__row">
        <div className="inv-allot-report-filters__fx15">
          <GlobalFilterField label="Regulation">
            <Select
              value={regulationId || null}
              onChange={(v) => setRegulationId(v ?? "0")}
              isLoading={loadingFilters}
              options={[
                { value: "0", label: "All" },
                ...regulations.map((r) => ({
                  value: String(num(r.fk_regulation_id)),
                  label: txt(r.regulation_code),
                })),
              ]}
              placeholder="Regulation"
              searchable
            />
          </GlobalFilterField>
        </div>
        <div className="inv-allot-report-filters__fx33">
          <GlobalFilterField
            label="Subjects"
            className="min-w-[200px] flex-[2]"
          >
            <Select
              value={subjectId || null}
              onChange={(v) => {
                setSubjectId(v ?? "0");
                clearResults();
              }}
              isLoading={loadingFilters}
              options={[
                { value: "0", label: "All" },
                ...subjects.map((s) => ({
                  value: String(num(s.fk_subject_id)),
                  label: `${txt(s.subject_name)} (${txt(s.subject_code)})`,
                })),
              ]}
              placeholder="Subjects"
              searchable
              searchPlaceholder="Search..."
            />
          </GlobalFilterField>
        </div>
        <div className="inv-allot-report-filters__fx13">
          <GlobalFilterField label="">
            <div className="flex h-[30px] items-center gap-2">
              <Checkbox
                id="reg-std-is-reevaluation"
                checked={isReevaluation}
                onCheckedChange={(v) => {
                  setIsReevaluation(v === true);
                  clearResults();
                }}
              />
              <Label
                htmlFor="reg-std-is-reevaluation"
                className="text-[12px] font-normal"
              >
                Is Re-Evaluation
              </Label>
            </div>
          </GlobalFilterField>
        </div>
        <div className="inv-allot-report-filters__fx13">
          <GlobalFilterField
            label=""
            className="global-filter-field--shrink global-filter-field--action"
          >
            <Button
              type="button"
              onClick={() => void onGetList()}
              disabled={loadingList}
              className="h-[30px] px-3 text-[12px] w-full"
            >
              Get List
            </Button>
          </GlobalFilterField>
        </div>
      </div>
    </div>
  );

  return (
    <FilteredListPage
      title={
        rows.length > 0 ? `${REPORT_TITLE} - ${dataDetails}` : REPORT_TITLE
      }
      filters={filters}
      rowData={rows}
      columnDefs={columnDefs}
      loading={loadingList}
      showTable={rows.length > 0}
      pagination
      toolbar={TOOLBAR}
      toolbarTrailing={
        rows.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={handleExportExcel}
            >
              Export Excel
            </Button>
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={() => printReport(rows, dataDetails)}
            >
              Print Report
            </Button>
          </div>
        ) : null
      }
      getRowId={(p) => String(p.data?.__rid ?? "")}
    />
  );
}
