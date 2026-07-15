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
import {
  buildHtmlTable,
  exportHtmlTableAsExcel,
} from "../../_lib/export-html-table";
import {
  getExamRegistrationReportBaseFilters,
  getExamRegistrationReportFeeTypes,
  getExamRegistrationReportRestFilters,
  getExamRegistrationReportSubjects,
  getExamRegistrationReportTimetables,
  getExamStudentRegistrationReportList,
} from "@/services";

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
  { key: "hallticket", header: "Hall Ticket" },
] as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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
    hallticket: txt(row.hallticket_number),
  }));
}

function printReport(rows: AnyRow[], subtitle: string) {
  if (!rows.length) return;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Exam Student Registration Report</title>
<style>
@page { size: A4 landscape; margin: 10mm; }
body { font: 11px/1.4 Arial, sans-serif; color: #000; margin: 0; }
.title, .sub { text-align: center; margin: 4px 0; }
.title { font-size: 15px; font-weight: bold; }
table { width: 100%; border-collapse: collapse; margin-top: 10px; }
th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; }
th { background: #f2f2f2; }
</style></head>
<body>
  <p class="title">Exam Student Registration Report</p>
  <p class="sub">${escapeHtml(subtitle)}</p>
  ${buildHtmlTable([...EXPORT_COLS], toExportRows(rows))}
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

  const reportSubtitle = useMemo(() => {
    const parts = [
      txt(
        courses.find((c) => num(c.fk_course_id) === Number(courseId))
          ?.course_code,
      ),
      txt(
        academicYears.find(
          (y) => num(y.fk_academic_year_id) === Number(academicYearId),
        )?.academic_year,
      ),
      txt(selectedExam?.exam_name),
      Number(regulationId)
        ? txt(
            regulations.find(
              (r) => num(r.fk_regulation_id) === Number(regulationId),
            )?.regulation_code,
          )
        : "",
      Number(subjectId)
        ? txt(
            subjects.find((s) => num(s.fk_subject_id) === Number(subjectId))
              ?.subject_code,
          )
        : "",
    ].filter(Boolean);
    return parts.join(" / ");
  }, [
    courses,
    academicYears,
    selectedExam,
    regulations,
    subjects,
    courseId,
    academicYearId,
    regulationId,
    subjectId,
  ]);

  function clearResults() {
    setRows([]);
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
    async function onExamChange() {
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
      const filtered = allFeeTypes.filter((t) => {
        const code = feeTypeCode(t);
        if (code === "Regular") return Boolean(selectedExam.is_regular_exam);
        if (code === "Supple") return Boolean(selectedExam.is_supply_exam);
        if (code === "Internal") return Boolean(selectedExam.is_internal_exam);
        return false;
      });
      setExamFeeTypes(filtered);
    }
    void onExamChange();
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
      // Angular loads timetables on exam type change (even All=0)
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
      if (!list.length) toastSuccess("No Records Found.");
    } catch (e) {
      toastError(e, "Failed to load report");
      setRows([]);
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
      "Exam Student Registration Report",
      buildHtmlTable([...EXPORT_COLS], toExportRows(rows)),
      `<strong>Exam Student Registration Report - ${escapeHtml(reportSubtitle)}</strong>`,
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
        minWidth: 160,
        valueGetter: (p) => txt(p.data?.subject),
      },
      {
        headerName: "College",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.college_code),
      },
      {
        headerName: "Course",
        minWidth: 140,
        valueGetter: (p) => txt(p.data?.course_name),
      },
      {
        headerName: "Course Group",
        minWidth: 130,
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
    <>
      <GlobalFilterBarRow>
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
        <GlobalFilterField label="Exam" className="min-w-[260px] flex-[2]">
          <Select
            value={examId || null}
            onChange={(v) => setExamId(v ?? "")}
            isLoading={loadingFilters}
            options={exams.map((e) => ({
              value: String(num(e.fk_exam_id)),
              label: formatExamLabel(e),
            }))}
            placeholder="Exam"
            searchable
          />
        </GlobalFilterField>
      </GlobalFilterBarRow>
      <GlobalFilterBarRow>
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
      </GlobalFilterBarRow>
      <GlobalFilterBarRow>
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
        <GlobalFilterField label="Subjects" className="min-w-[200px] flex-[2]">
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
          />
        </GlobalFilterField>
        <GlobalFilterField label="Is Re-Evaluation">
          <div className="flex h-[30px] items-center gap-2">
            <Checkbox
              id="is-reevaluation"
              checked={isReevaluation}
              onCheckedChange={(v) => {
                setIsReevaluation(v === true);
                clearResults();
              }}
            />
            <Label
              htmlFor="is-reevaluation"
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
    <FilteredListPage
      title={
        rows.length > 0
          ? `Exam Student Registration Report - ${reportSubtitle}`
          : "Exam Student Registration Report"
      }
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
              onClick={handleExportExcel}
            >
              Export Excel
            </Button>
            <Button
              type="button"
              className="h-[30px] px-3 text-[12px]"
              onClick={() => printReport(rows, reportSubtitle)}
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
