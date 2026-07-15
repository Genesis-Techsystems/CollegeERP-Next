"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  getAnswerSheetsBaseFilters,
  getExamAnswerSheetsReport,
  listExamTimetablesByExam,
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
  { key: "examDate", header: "Exam Date" },
  { key: "faculty", header: "Faculty" },
  { key: "programme", header: "Program" },
  { key: "branch", header: "Branch" },
  { key: "subject", header: "Course" },
  { key: "registered", header: "Registered Students" },
  { key: "present", header: "Present Students" },
  { key: "absent", header: "Absent Students" },
  { key: "expected", header: "Scripts Expected" },
  { key: "uploaded", header: "Scripts Uploaded" },
  { key: "notUploaded", header: "Scripts Not Uploaded" },
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

function formatTimetableLabel(tt: AnyRow): string {
  const date = txt(tt.examDate);
  const session = txt(tt.examSessionName);
  return session ? `${date} (${session})` : date;
}

function rowMetrics(row: AnyRow) {
  const present = num(row.presented_Students);
  const attendance = num(row.attendance_marked);
  const uploaded = num(row.no_oof_answerpaper_uploaded);
  return {
    present,
    absent: attendance - present,
    expected: present,
    uploaded,
    notUploaded: present - uploaded,
  };
}

function toExportRows(rows: AnyRow[]): Record<string, unknown>[] {
  return rows.map((row, i) => {
    const m = rowMetrics(row);
    return {
      si: i + 1,
      examDate: txt(row.exam_date),
      faculty: txt(row.college_code),
      programme: txt(row.course_year_code),
      branch: txt(row.group_code),
      subject: txt(row.subject_name),
      registered: num(row.total_students),
      present: m.present,
      absent: m.absent,
      expected: m.expected,
      uploaded: m.uploaded,
      notUploaded: m.notUploaded,
    };
  });
}

function printAnswerSheetsReport(rows: AnyRow[], subtitle: string) {
  if (!rows.length) return;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Exam Answer Sheets Report</title>
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
  <p class="title">Exam Answer Sheets Report</p>
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

export default function ExamAnswerSheetsReportPage() {
  const router = useRouter();
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [showBack, setShowBack] = useState(false);

  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [timetables, setTimetables] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [examTimetableId, setExamTimetableId] = useState("");

  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const organizationId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
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
    if (!courseId) return [];
    return dedupeBy(
      baseRows.filter((r) => num(r.fk_course_id) === Number(courseId)),
      (r) => num(r.fk_academic_year_id),
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
  const selectedTimetable = useMemo(
    () =>
      timetables.find(
        (t) => num(t.examTimetableId) === Number(examTimetableId),
      ),
    [timetables, examTimetableId],
  );

  const reportSubtitle = useMemo(() => {
    const parts = [txt(selectedExam?.exam_name)].filter(Boolean);
    if (Number(examTimetableId) > 0) {
      parts.push(txt(selectedTimetable?.examDate));
    } else if (examTimetableId === "0") {
      parts.push("All");
    }
    return parts.join(" / ");
  }, [selectedExam, selectedTimetable, examTimetableId]);

  function clearResults() {
    setRows([]);
  }

  useEffect(() => {
    async function loadBase() {
      setLoadingFilters(true);
      try {
        const list = await getAnswerSheetsBaseFilters(employeeId);
        setBaseRows(list);
        const first = dedupeBy(list, (r) => num(r.fk_course_id))[0];
        if (first) setCourseId(String(num(first.fk_course_id)));
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
    setExamTimetableId("");
    setTimetables([]);
    clearResults();
    if (!courseId || !academicYears.length) return;
    setAcademicYearId(String(num(academicYears[0].fk_academic_year_id)));
  }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setExamId("");
    setExamTimetableId("");
    setTimetables([]);
    clearResults();
    if (!academicYearId || !exams.length) return;
    setExamId(String(num(exams[0].fk_exam_id)));
  }, [academicYearId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function loadTimetables() {
      setExamTimetableId("");
      clearResults();
      if (!examId) {
        setTimetables([]);
        return;
      }
      setLoadingFilters(true);
      try {
        const list = await listExamTimetablesByExam(Number(examId));
        setTimetables(list);
        setExamTimetableId("0"); // Angular "All"
      } catch (e) {
        toastError(e, "Failed to load exam timetables");
        setTimetables([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadTimetables();
  }, [examId]);

  async function onGetList() {
    if (!courseId || !academicYearId || !examId || examTimetableId === "") {
      toastInfo("Please Select Valid Filters");
      return;
    }
    setLoadingList(true);
    try {
      const ttId = Number(examTimetableId);
      const examDate =
        ttId === 0
          ? "1991-01-01"
          : txt(selectedTimetable?.examDate) || "1991-01-01";
      const list = await getExamAnswerSheetsReport({
        organizationId: organizationId || 1,
        examId: Number(examId),
        examTimetableId: ttId,
        examDate,
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

  function onBack() {
    try {
      sessionStorage.removeItem("examVerificationBack");
    } catch {
      /* ignore */
    }
    router.back();
  }

  function handleExportExcel() {
    if (!rows.length) {
      toastInfo("No data to export");
      return;
    }
    exportHtmlTableAsExcel(
      "Exam Answer Sheets Report",
      buildHtmlTable([...EXPORT_COLS], toExportRows(rows)),
      `<strong>Exam Answer Sheets Report - ${escapeHtml(reportSubtitle)}</strong>`,
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
        headerName: "Exam Date",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.exam_date),
      },
      {
        headerName: "Faculty",
        minWidth: 110,
        valueGetter: (p) => txt(p.data?.college_code),
      },
      {
        headerName: "Program",
        minWidth: 100,
        valueGetter: (p) => txt(p.data?.course_year_code),
      },
      {
        headerName: "Branch",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.group_code),
      },
      {
        headerName: "Course",
        minWidth: 180,
        valueGetter: (p) => txt(p.data?.subject_name),
      },
      {
        headerName: "Registered Students",
        minWidth: 140,
        valueGetter: (p) => num(p.data?.total_students),
      },
      {
        headerName: "Present Students",
        minWidth: 130,
        valueGetter: (p) => num(p.data?.presented_Students),
      },
      {
        headerName: "Absent Students",
        minWidth: 130,
        valueGetter: (p) => {
          const m = rowMetrics(p.data ?? {});
          return m.absent;
        },
      },
      {
        headerName: "Scripts Expected",
        minWidth: 130,
        valueGetter: (p) => num(p.data?.presented_Students),
      },
      {
        headerName: "Scripts Uploaded",
        minWidth: 130,
        valueGetter: (p) => num(p.data?.no_oof_answerpaper_uploaded),
      },
      {
        headerName: "Scripts Not Uploaded",
        minWidth: 150,
        valueGetter: (p) => {
          const m = rowMetrics(p.data ?? {});
          return m.notUploaded;
        },
      },
    ],
    [],
  );

  const filters = (
    <GlobalFilterBarRow>
      <GlobalFilterField label="Course *">
        <Select
          value={courseId || undefined}
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
      <GlobalFilterField label="Exam Year *">
        <Select
          value={academicYearId || undefined}
          onChange={(v) => setAcademicYearId(v ?? "")}
          isLoading={loadingFilters}
          options={academicYears.map((y) => ({
            value: String(num(y.fk_academic_year_id)),
            label: txt(y.academic_year),
          }))}
          placeholder="Exam Year"
          searchable
        />
      </GlobalFilterField>
      <GlobalFilterField label="Exam Master *" className="min-w-[280px] flex-[2]">
        <Select
          value={examId || undefined}
          onChange={(v) => setExamId(v ?? "")}
          isLoading={loadingFilters}
          options={exams.map((e) => ({
            value: String(num(e.fk_exam_id)),
            label: formatExamLabel(e),
          }))}
          placeholder="Exam Master"
          searchable
        />
      </GlobalFilterField>
      <GlobalFilterField label="Exam Timetable *">
        <Select
          value={examTimetableId || undefined}
          onChange={(v) => {
            setExamTimetableId(v ?? "");
            clearResults();
          }}
          isLoading={loadingFilters}
          options={[
            { value: "0", label: "All" },
            ...timetables.map((t) => ({
              value: String(num(t.examTimetableId)),
              label: formatTimetableLabel(t),
            })),
          ]}
          placeholder="Exam Timetable"
          searchable
        />
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
          {showBack && (
            <Button
              type="button"
              variant="secondary"
              onClick={onBack}
              className="h-[30px] px-3 text-[12px] bg-amber-400 hover:bg-amber-500 text-black"
            >
              Back
            </Button>
          )}
        </div>
      </GlobalFilterField>
    </GlobalFilterBarRow>
  );

  return (
    <FilteredListPage
      title={
        rows.length > 0
          ? `Exam Answer Sheets Report - ${reportSubtitle}`
          : "Exam Answer Sheets Report"
      }
      filters={filters}
      rowData={rows}
      columnDefs={columnDefs}
      loading={loadingList}
      pagination
      fitColumnsToWidth={false}
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
              onClick={() => printAnswerSheetsReport(rows, reportSubtitle)}
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
