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
import { rowIndexGetter } from "@/lib/utils";
import { dedupeBy, num, txt } from "@/common/utils/data-helpers";
import { toastError, toastSuccess } from "@/lib/toast";
import { toast } from "sonner";
import {
  buildHtmlTable,
  exportHtmlTableAsExcel,
} from "../../_lib/export-html-table";
import {
  getExamCenterStudentsReportCenters,
  getExamCenterStudentsReportFilters,
  getExamCenterStudentsReportList,
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
  { key: "si", header: "SI.No" },
  { key: "examcenter", header: "Exam Center" },
  { key: "collegeCode", header: "College Code" },
  { key: "exam", header: "Exam" },
  { key: "subject", header: "Subject Code" },
  { key: "student", header: "Student" },
] as const;

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

function courseIdOf(row: AnyRow): number {
  return num(row.fk_course_ids ?? row.fk_course_id);
}

function academicYearIdOf(row: AnyRow): number {
  return num(row.pk_academic_year_id ?? row.fk_academic_year_id);
}

function examIdOf(row: AnyRow): number {
  return num(row.pk_exam_id ?? row.fk_exam_id);
}

function centerId(row: AnyRow): number {
  return num(row.univExamcenterId ?? row.univ_examcenter_id);
}

function subjectLabel(row: AnyRow): string {
  const name = txt(row.subject_name);
  const code = txt(row.subject_code);
  if (name && code) return `${name} (${code})`;
  return name || code;
}

function toExportRows(rows: AnyRow[]): Record<string, unknown>[] {
  return rows.map((row, i) => ({
    si: i + 1,
    examcenter: txt(row.examcenterCode ?? row.examcenter_code),
    collegeCode: txt(row.collegeCode ?? row.college_code),
    exam: txt(row.examName ?? row.exam_name),
    subject: txt(row.subjectCode ?? row.subject_code),
    student: txt(row.hallticketNumber ?? row.hallticket_number),
  }));
}

function printReport(rows: AnyRow[], subtitle: string) {
  if (!rows.length) return;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Exam Center Students Report</title>
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
  <p class="title">Exam Center Students Report</p>
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

export default function ExamcenterStudentsReportPage() {
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [centers, setCenters] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [univExamcenterId, setUnivExamcenterId] = useState("");

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const organizationId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );

  const courses = useMemo(
    () => dedupeBy(baseRows, (r) => courseIdOf(r)),
    [baseRows],
  );
  const academicYears = useMemo(() => {
    if (!courseId) return [];
    return dedupeBy(
      baseRows.filter((r) => courseIdOf(r) === Number(courseId)),
      (r) => academicYearIdOf(r),
    );
  }, [baseRows, courseId]);
  const exams = useMemo(() => {
    if (!courseId || !academicYearId) return [];
    return dedupeBy(
      baseRows.filter(
        (r) =>
          courseIdOf(r) === Number(courseId) &&
          academicYearIdOf(r) === Number(academicYearId) &&
          !r.is_internal_exam,
      ),
      (r) => examIdOf(r),
    );
  }, [baseRows, courseId, academicYearId]);
  const subjects = useMemo(() => {
    if (!courseId || !academicYearId || !examId) return [];
    return dedupeBy(
      baseRows.filter(
        (r) =>
          courseIdOf(r) === Number(courseId) &&
          academicYearIdOf(r) === Number(academicYearId) &&
          examIdOf(r) === Number(examId),
      ),
      (r) => num(r.fk_subject_id),
    );
  }, [baseRows, courseId, academicYearId, examId]);

  const selectedCourse = useMemo(
    () => courses.find((c) => courseIdOf(c) === Number(courseId)),
    [courses, courseId],
  );
  const selectedYear = useMemo(
    () =>
      academicYears.find((y) => academicYearIdOf(y) === Number(academicYearId)),
    [academicYears, academicYearId],
  );
  const selectedExam = useMemo(
    () => exams.find((e) => examIdOf(e) === Number(examId)),
    [exams, examId],
  );
  const selectedSubject = useMemo(
    () => subjects.find((s) => num(s.fk_subject_id) === Number(subjectId)),
    [subjects, subjectId],
  );
  const selectedCenter = useMemo(
    () => centers.find((c) => centerId(c) === Number(univExamcenterId)),
    [centers, univExamcenterId],
  );

  const reportSubtitle = useMemo(() => {
    return [
      txt(selectedCourse?.course_code),
      txt(selectedYear?.academic_year),
      txt(selectedExam?.exam_name),
      txt(selectedSubject?.subject_code),
      txt(
        selectedCenter?.examcenterName ??
          selectedCenter?.examcenter_name ??
          selectedCenter?.ec_name,
      ),
    ]
      .filter(Boolean)
      .join(" / ");
  }, [
    selectedCourse,
    selectedYear,
    selectedExam,
    selectedSubject,
    selectedCenter,
  ]);

  function clearResults() {
    setRows([]);
  }

  useEffect(() => {
    async function loadBase() {
      setLoadingFilters(true);
      try {
        const list = await getExamCenterStudentsReportFilters({
          organizationId: organizationId || 0,
          employeeId,
        });
        setBaseRows(list);
        const first = dedupeBy(list, (r) => courseIdOf(r))[0];
        if (first) setCourseId(String(courseIdOf(first)));
      } catch (e) {
        toastError(e, "Failed to load filters");
        setBaseRows([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadBase();
  }, [employeeId, organizationId]);

  useEffect(() => {
    setAcademicYearId("");
    setExamId("");
    setSubjectId("");
    setUnivExamcenterId("");
    setCenters([]);
    clearResults();
    if (!courseId || !academicYears.length) return;
    setAcademicYearId(String(academicYearIdOf(academicYears[0])));
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setExamId("");
    setSubjectId("");
    setUnivExamcenterId("");
    setCenters([]);
    clearResults();
    if (!academicYearId || !exams.length) return;
    setExamId(String(examIdOf(exams[0])));
  }, [academicYearId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSubjectId("");
    setUnivExamcenterId("");
    setCenters([]);
    clearResults();
    if (!examId || !subjects.length) return;
    setSubjectId(String(num(subjects[0].fk_subject_id)));
  }, [examId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function loadCenters() {
      setUnivExamcenterId("");
      clearResults();
      if (!subjectId) {
        setCenters([]);
        return;
      }
      setLoadingFilters(true);
      try {
        const list = await getExamCenterStudentsReportCenters();
        setCenters(list);
        // Angular does not auto-select exam center (commented out)
      } catch (e) {
        toastError(e, "Failed to load exam centers");
        setCenters([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadCenters();
  }, [subjectId]);

  async function onGetList() {
    if (
      !courseId ||
      !academicYearId ||
      !examId ||
      !subjectId ||
      !univExamcenterId
    ) {
      toastInfo("Please Select Valid Filters");
      return;
    }
    setLoadingList(true);
    try {
      const list = await getExamCenterStudentsReportList({
        univExamcenterId: Number(univExamcenterId),
        examId: Number(examId),
        subjectId: Number(subjectId),
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
      "Exam Center Students Report",
      buildHtmlTable([...EXPORT_COLS], toExportRows(rows)),
      `<strong>Exam Center Students Report - ${escapeHtml(reportSubtitle)}</strong>`,
    );
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        headerName: "Exam Center",
        minWidth: 140,
        valueGetter: (p) =>
          txt(p.data?.examcenterCode ?? p.data?.examcenter_code),
      },
      {
        headerName: "College Code",
        minWidth: 130,
        valueGetter: (p) => txt(p.data?.collegeCode ?? p.data?.college_code),
      },
      {
        headerName: "Exam",
        minWidth: 200,
        valueGetter: (p) => txt(p.data?.examName ?? p.data?.exam_name),
      },
      {
        headerName: "Subject Code",
        minWidth: 130,
        valueGetter: (p) => txt(p.data?.subjectCode ?? p.data?.subject_code),
      },
      {
        headerName: "Student",
        minWidth: 150,
        valueGetter: (p) =>
          txt(p.data?.hallticketNumber ?? p.data?.hallticket_number),
      },
    ],
    [],
  );

  const filters = (
    <>
      <GlobalFilterBarRow>
        <GlobalFilterField label="Course *">
          <Select
            value={courseId || undefined}
            onChange={(v) => setCourseId(v ?? "")}
            isLoading={loadingFilters}
            options={courses.map((c) => ({
              value: String(courseIdOf(c)),
              label: txt(c.course_code),
            }))}
            placeholder="Course"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Academic Year *">
          <Select
            value={academicYearId || undefined}
            onChange={(v) => setAcademicYearId(v ?? "")}
            isLoading={loadingFilters}
            options={academicYears.map((y) => ({
              value: String(academicYearIdOf(y)),
              label: txt(y.academic_year),
            }))}
            placeholder="Academic Year"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Exam" className="min-w-[260px] flex-[2]">
          <Select
            value={examId || undefined}
            onChange={(v) => setExamId(v ?? "")}
            isLoading={loadingFilters}
            options={exams.map((e) => ({
              value: String(examIdOf(e)),
              label: formatExamLabel(e),
            }))}
            placeholder="Exam"
            searchable
          />
        </GlobalFilterField>
        <GlobalFilterField label="Subjects" className="min-w-[200px] flex-[2]">
          <Select
            value={subjectId || undefined}
            onChange={(v) => setSubjectId(v ?? "")}
            isLoading={loadingFilters}
            options={subjects.map((s) => ({
              value: String(num(s.fk_subject_id)),
              label: subjectLabel(s),
            }))}
            placeholder="Subjects"
            searchable
          />
        </GlobalFilterField>
      </GlobalFilterBarRow>
      <GlobalFilterBarRow>
        <GlobalFilterField label="Exam Center *">
          <Select
            value={univExamcenterId || undefined}
            onChange={(v) => {
              setUnivExamcenterId(v ?? "");
              clearResults();
            }}
            isLoading={loadingFilters}
            options={centers.map((c) => ({
              value: String(centerId(c)),
              label: txt(c.examcenterCode ?? c.examcenter_code ?? c.ec_code),
            }))}
            placeholder="Exam Center"
            searchable
          />
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
          ? `Exam Center Students - ${reportSubtitle}`
          : "Exam Center Students Filter"
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
