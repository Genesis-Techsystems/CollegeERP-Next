"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { FilteredListPage } from "@/components/layout";
import { GlobalFilterField } from "@/common/components/forms";
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
import { printHtmlInIframe } from "@/lib/print";
import {
  getExamCenterCollegesReportCenters,
  getExamCenterCollegesReportFilters,
  getExamCenterCollegesReportList,
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
  { key: "exam", header: "Exam" },
  { key: "college", header: "college" },
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

/** Angular option value: `obj.univExamcenterId` */
function centerId(row: AnyRow): number {
  return num(
    row.univExamcenterId ??
      row.univExamCenterId ??
      row.univ_examcenter_id ??
      row.univ_exam_center_id,
  );
}

/** Angular option label: `obj.examcenterCode` */
function centerCode(row: AnyRow): string {
  return txt(
    row.examcenterCode ??
      row.examCenterCode ??
      row.examcenter_code ??
      row.ec_code,
  );
}

function centerName(row: AnyRow): string {
  return txt(
    row.examcenterName ??
      row.examCenterName ??
      row.examcenter_name ??
      row.ec_name,
  );
}

function toExportRows(rows: AnyRow[]): Record<string, unknown>[] {
  return rows.map((row, i) => ({
    si: i + 1,
    examcenter: txt(row.examcenterCode ?? row.examcenter_code ?? row.ec_code),
    exam: txt(row.examName ?? row.exam_name),
    college: txt(row.collegeCode ?? row.college_code),
  }));
}

function printReport(rows: AnyRow[], subtitle: string) {
  if (!rows.length) return;
  printHtmlInIframe(`<!doctype html><html><head><meta charset="utf-8"><title>Exam Center Colleges Report</title>
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
  <p class="title">Exam Center Colleges Report</p>
  <p class="sub">${escapeHtml(subtitle)}</p>
  ${buildHtmlTable([...EXPORT_COLS], toExportRows(rows))}
</body></html>`);
}

export default function ExamcenterCollegesReportPage() {
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [academicYears, setAcademicYears] = useState<AnyRow[]>([]);
  const [exams, setExams] = useState<AnyRow[]>([]);
  const [centers, setCenters] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [univExamcenterId, setUnivExamcenterId] = useState("");

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

  const selectedCourse = useMemo(
    () => courses.find((c) => num(c.fk_course_id) === Number(courseId)),
    [courses, courseId],
  );
  const selectedYear = useMemo(
    () =>
      academicYears.find(
        (y) => num(y.fk_academic_year_id) === Number(academicYearId),
      ),
    [academicYears, academicYearId],
  );
  const selectedExam = useMemo(
    () => exams.find((e) => num(e.fk_exam_id) === Number(examId)),
    [exams, examId],
  );
  const selectedCenter = useMemo(
    () => centers.find((c) => centerId(c) === Number(univExamcenterId)),
    [centers, univExamcenterId],
  );

  const centerOptions = useMemo(
    () =>
      centers
        .map((c) => {
          const id = centerId(c);
          const code = centerCode(c);
          const name = centerName(c);
          return {
            value: String(id),
            label: code || name || (id > 0 ? String(id) : ""),
          };
        })
        .filter((o) => Number(o.value) > 0 && o.label),
    [centers],
  );

  const reportSubtitle = useMemo(() => {
    return [
      txt(selectedCourse?.course_code),
      txt(selectedYear?.academic_year),
      txt(selectedExam?.exam_name),
      centerName(selectedCenter ?? {}) || centerCode(selectedCenter ?? {}),
    ]
      .filter(Boolean)
      .join(" / ");
  }, [selectedCourse, selectedYear, selectedExam, selectedCenter]);

  function clearResults() {
    setRows([]);
  }

  /**
   * Angular selectedExam → listDetailsById(UnivExamCenters, isActive)
   * then auto-select first center.
   */
  const selectedExamChange = useCallback(async (nextExamId: string) => {
    setExamId(nextExamId);
    setUnivExamcenterId("");
    setCenters([]);
    clearResults();
    if (!nextExamId || Number(nextExamId) <= 0) return;

    setLoadingCenters(true);
    try {
      const list = await getExamCenterCollegesReportCenters();
      setCenters(list);
      const firstId = list.map(centerId).find((id) => id > 0);
      if (firstId) setUnivExamcenterId(String(firstId));
    } catch (e) {
      toastError(e, "Failed to load exam centers");
      setCenters([]);
    } finally {
      setLoadingCenters(false);
    }
  }, []);

  /**
   * Angular selectedAcademicYear → filter exams (non-internal), auto-pick first,
   * then selectedExam.
   */
  const selectedAcademicYearChange = useCallback(
    async (nextYearId: string, course: string, sourceRows: AnyRow[]) => {
      setAcademicYearId(nextYearId);
      setExamId("");
      setUnivExamcenterId("");
      setExams([]);
      setCenters([]);
      clearResults();
      if (!nextYearId || !course) return;

      const examRows = dedupeBy(
        sourceRows.filter(
          (r) =>
            num(r.fk_course_id) === Number(course) &&
            num(r.fk_academic_year_id) === Number(nextYearId) &&
            !r.is_internal_exam,
        ),
        (r) => num(r.fk_exam_id),
      );
      setExams(examRows);
      if (examRows.length > 0) {
        await selectedExamChange(String(num(examRows[0].fk_exam_id)));
      }
    },
    [selectedExamChange],
  );

  /**
   * Angular selectedCourse → filter academic years, auto-pick first,
   * then selectedAcademicYear.
   */
  const selectedCourseChange = useCallback(
    async (nextCourseId: string, sourceRows: AnyRow[]) => {
      setCourseId(nextCourseId);
      setAcademicYearId("");
      setExamId("");
      setUnivExamcenterId("");
      setAcademicYears([]);
      setExams([]);
      setCenters([]);
      clearResults();
      if (!nextCourseId) return;

      const yearRows = dedupeBy(
        sourceRows.filter((r) => num(r.fk_course_id) === Number(nextCourseId)),
        (r) => num(r.fk_academic_year_id),
      );
      setAcademicYears(yearRows);
      if (yearRows.length > 0) {
        await selectedAcademicYearChange(
          String(num(yearRows[0].fk_academic_year_id)),
          nextCourseId,
          sourceRows,
        );
      }
    },
    [selectedAcademicYearChange],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadBase() {
      setLoadingFilters(true);
      try {
        const list = await getExamCenterCollegesReportFilters({
          organizationId: organizationId || 0,
          employeeId,
        });
        if (cancelled) return;
        setBaseRows(list);
        const first = dedupeBy(list, (r) => num(r.fk_course_id))[0];
        if (first) {
          await selectedCourseChange(String(num(first.fk_course_id)), list);
        }
      } catch (e) {
        if (!cancelled) {
          toastError(e, "Failed to load filters");
          setBaseRows([]);
        }
      } finally {
        if (!cancelled) setLoadingFilters(false);
      }
    }
    void loadBase();
    return () => {
      cancelled = true;
    };
  }, [employeeId, organizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onGetList() {
    if (
      !courseId ||
      !academicYearId ||
      !examId ||
      !univExamcenterId ||
      Number(univExamcenterId) <= 0
    ) {
      toastInfo("Please Select Valid Filters");
      return;
    }
    setLoadingList(true);
    try {
      const list = await getExamCenterCollegesReportList({
        univExamcenterId: Number(univExamcenterId),
        examId: Number(examId),
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
      "Exam Center Colleges Report",
      buildHtmlTable([...EXPORT_COLS], toExportRows(rows)),
      `<strong>Exam Center Colleges Report - ${escapeHtml(reportSubtitle)}</strong>`,
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
          txt(
            p.data?.examcenterCode ??
              p.data?.examcenter_code ??
              p.data?.ec_code,
          ),
      },
      {
        headerName: "Exam",
        minWidth: 220,
        valueGetter: (p) => txt(p.data?.examName ?? p.data?.exam_name),
      },
      {
        headerName: "college",
        minWidth: 140,
        valueGetter: (p) => txt(p.data?.collegeCode ?? p.data?.college_code),
      },
    ],
    [],
  );

  const filters = (
    <>
      <div className="inv-allot-report-filters space-y-2">
        <div className="inv-allot-report-filters__row">
          <div className="inv-allot-report-filters__fx20">
            <GlobalFilterField label="Course *">
              <Select
                value={courseId || null}
                onChange={(v) => {
                  void selectedCourseChange(v ?? "", baseRows);
                }}
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
                onChange={(v) => {
                  void selectedAcademicYearChange(v ?? "", courseId, baseRows);
                }}
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
            <GlobalFilterField label="Exam" className="min-w-[280px] flex-[2]">
              <Select
                value={examId || null}
                onChange={(v) => {
                  void selectedExamChange(v ?? "");
                }}
                isLoading={loadingFilters}
                options={exams.map((e) => ({
                  value: String(num(e.fk_exam_id)),
                  label: formatExamLabel(e),
                }))}
                placeholder="Exam"
                searchable
              />
            </GlobalFilterField>
          </div>
        </div>
        <div className="inv-allot-report-filters__row">
          <div className="inv-allot-report-filters__fx30">
            <GlobalFilterField label="Exam Center *">
              <Select
                value={univExamcenterId || null}
                onChange={(v) => {
                  setUnivExamcenterId(v ?? "");
                  clearResults();
                }}
                isLoading={loadingCenters}
                options={centerOptions}
                placeholder="Exam Center"
                searchable
              />
            </GlobalFilterField>
          </div>
          <div className="inv-allot-report-filters__fx15">
            <GlobalFilterField
              label=""
              className="global-filter-field--shrink global-filter-field--action"
            >
              <Button
                type="button"
                onClick={() => void onGetList()}
                disabled={loadingList || loadingCenters}
                className="h-[30px] px-3 text-[12px] w-full"
              >
                Get List
              </Button>
            </GlobalFilterField>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <FilteredListPage
      title={
        rows.length > 0
          ? `Exam Center Colleges Report - ${reportSubtitle}`
          : "Exam Center Colleges Report"
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
