"use client";

/**
 * Exam Answer Sheets Report — Angular `exam-answer-sheets-report`.
 * Filters: Course, Exam Year, Exam Master, Exam Timetable (incl. All).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { format, parseISO } from "date-fns";
import { Printer, RefreshCw } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toastError } from "@/lib/toast";
import { toast } from "sonner";
import {
  getExamAnswerSheetsReport,
  getUnivExamFiltersRegSup,
  listExamTimetablesByExam,
  type AnyRow,
} from "@/services";

type Row = AnyRow;

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
  const s = txt(v);
  return !s || s === "null" ? "—" : s;
}

function dedupeBy<T>(rows: T[], keyFn: (r: T) => number): T[] {
  const seen = new Set<number>();
  const out: T[] = [];
  for (const r of rows) {
    const k = keyFn(r);
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

function timetableLabel(r: Row): string {
  const date = txt(r.examDate);
  const session = txt(r.examSessionName);
  return session ? `${date} (${session})` : date || "—";
}

/** Angular displayedColumns metrics */
function rowMetrics(row: Row) {
  const present = num(row.presented_Students ?? row.present);
  const attendance = num(row.attendance_marked);
  const uploaded = num(row.no_oof_answerpaper_uploaded ?? row.scriptsUploaded);
  return {
    present,
    absent: attendance > 0 ? attendance - present : num(row.absent),
    expected: present,
    uploaded,
    notUploaded: present - uploaded,
  };
}

const COL_DEFS: ColDef<Row>[] = [
  {
    headerName: "Sl.No",
    valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
    width: 70,
    flex: 0,
  },
  {
    headerName: "Exam Date",
    minWidth: 110,
    flex: 0,
    valueGetter: (p) => dash(p.data?.exam_date ?? p.data?.examdate),
  },
  {
    headerName: "Faculty",
    minWidth: 100,
    flex: 0,
    valueGetter: (p) => dash(p.data?.college_code ?? p.data?.faculty),
  },
  {
    headerName: "Program",
    minWidth: 120,
    flex: 0,
    valueGetter: (p) => dash(p.data?.course_year_code ?? p.data?.programme),
  },
  {
    headerName: "Branch",
    minWidth: 90,
    flex: 0,
    valueGetter: (p) => dash(p.data?.group_code ?? p.data?.branch),
  },
  {
    headerName: "Course",
    minWidth: 200,
    flex: 1,
    valueGetter: (p) => dash(p.data?.subject_name ?? p.data?.subject),
  },
  {
    headerName: "Registered Students",
    minWidth: 140,
    flex: 0,
    valueGetter: (p) =>
      dash(p.data?.total_students ?? p.data?.registeredstudents),
  },
  {
    headerName: "Present Students",
    minWidth: 130,
    flex: 0,
    valueGetter: (p) => rowMetrics(p.data ?? {}).present,
  },
  {
    headerName: "Absent Students",
    minWidth: 130,
    flex: 0,
    valueGetter: (p) => rowMetrics(p.data ?? {}).absent,
  },
  {
    headerName: "Scripts Expected",
    minWidth: 130,
    flex: 0,
    valueGetter: (p) => rowMetrics(p.data ?? {}).expected,
  },
  {
    headerName: "Scripts Uploaded",
    minWidth: 130,
    flex: 0,
    valueGetter: (p) => rowMetrics(p.data ?? {}).uploaded,
  },
  {
    headerName: "Scripts Not Uploaded",
    minWidth: 150,
    flex: 0,
    valueGetter: (p) => rowMetrics(p.data ?? {}).notUploaded,
  },
];

export default function ExamAnswerSheetsReportPage() {
  const [loading, setLoading] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [employeeId, setEmployeeId] = useState(0);
  const [baseRows, setBaseRows] = useState<Row[]>([]);
  const [timetables, setTimetables] = useState<Row[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [examTimetableId, setExamTimetableId] = useState("0");

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

  const selectedTimetable = useMemo(
    () =>
      timetables.find(
        (t) => num(t.examTimetableId) === Number(examTimetableId),
      ),
    [timetables, examTimetableId],
  );

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
    async function loadTimetables() {
      setExamTimetableId("0");
      setRows([]);
      setHasFetched(false);
      if (!examId) {
        setTimetables([]);
        return;
      }
      setLoadingFilters(true);
      try {
        const list = await listExamTimetablesByExam(Number(examId));
        setTimetables(Array.isArray(list) ? list : []);
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
    if (!courseId || !examId || examTimetableId === "") {
      toast.info("Please Select Valid Filters");
      return;
    }
    setLoading(true);
    setHasFetched(true);
    try {
      const ttId = Number(examTimetableId);
      // Angular: All → examDate '1991-01-01'; else selected timetable date
      const examDate =
        ttId === 0
          ? "1991-01-01"
          : txt(selectedTimetable?.examDate) || "1991-01-01";
      const organizationId = Number(
        globalThis?.localStorage?.getItem("organizationId") ??
          globalThis?.localStorage?.getItem("orgId") ??
          1,
      );
      const list = await getExamAnswerSheetsReport({
        organizationId: organizationId || 1,
        examId: Number(examId),
        examTimetableId: ttId,
        examDate,
      });
      setRows(Array.isArray(list) ? list : []);
      if (!list?.length) toast.info("No Records Found.");
    } catch (e) {
      toastError(e, "Failed to load report");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  const getRowId = useCallback(
    (p: { data?: Row; node?: { rowIndex?: number | null } }) =>
      `row-${p.node?.rowIndex ?? 0}-${txt(p.data?.subject_name)}-${txt(p.data?.exam_date)}-${txt(p.data?.group_code)}`,
    [],
  );

  return (
    <FilteredListPage
      title="Exam Answer Sheets Report"
      filters={
        <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
          <div className="space-y-1 md:col-span-2">
            <Label>Course *</Label>
            <Select
              value={courseId || null}
              onChange={(v) => {
                setCourseId(v ?? "");
                setAcademicYearId("");
                setExamId("");
                setExamTimetableId("0");
              }}
              options={courses.map((r) => ({
                value: String(num(r.fk_course_id)),
                label: txt(r.course_code) || String(num(r.fk_course_id)),
              }))}
              isLoading={loadingFilters}
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Exam Year *</Label>
            <Select
              value={academicYearId || null}
              onChange={(v) => {
                setAcademicYearId(v ?? "");
                setExamId("");
                setExamTimetableId("0");
              }}
              options={academicYears.map((r) => ({
                value: String(num(r.fk_academic_year_id)),
                label:
                  txt(r.academic_year) || String(num(r.fk_academic_year_id)),
              }))}
              disabled={!courseId}
            />
          </div>
          <div className="space-y-1 md:col-span-3">
            <Label>Exam Master *</Label>
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
          </div>
          <div className="space-y-1 md:col-span-3">
            <Label>Exam Timetable *</Label>
            <Select
              value={examTimetableId || null}
              onChange={(v) => {
                setExamTimetableId(v ?? "0");
                setRows([]);
                setHasFetched(false);
              }}
              options={[
                { value: "0", label: "All" },
                ...timetables.map((t) => ({
                  value: String(num(t.examTimetableId)),
                  label: timetableLabel(t),
                })),
              ]}
              searchable
              disabled={!examId}
              isLoading={loadingFilters}
            />
          </div>
          <div className="flex items-end gap-2 md:col-span-2">
            <Button
              type="button"
              className="h-8 text-[12px]"
              onClick={() => void onGetList()}
              disabled={loading}
            >
              Get List
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Reset"
              onClick={() => {
                setRows([]);
                setHasFetched(false);
                setExamTimetableId("0");
                const c = courses[0];
                if (c) setCourseId(String(num(c.fk_course_id)));
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      }
      rowData={hasFetched ? rows : []}
      columnDefs={COL_DEFS}
      loading={loading}
      pagination
      fitColumnsToWidth={false}
      getRowId={getRowId}
      toolbar={{ search: true, searchPlaceholder: "Search…", exportPdf: false }}
      toolbarTrailing={
        hasFetched && rows.length > 0 ? (
          <Button
            type="button"
            size="sm"
            className="h-9 text-[12px]"
            onClick={() => window.print()}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Report
          </Button>
        ) : undefined
      }
    />
  );
}
