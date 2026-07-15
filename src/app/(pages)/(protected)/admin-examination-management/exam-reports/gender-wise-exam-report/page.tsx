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
  getGenderWiseExamBaseFilters,
  getGenderWiseExamFeeTypes,
  getGenderWiseExamReport,
  getGenderWiseExamRestFilters,
  type AnyRow,
} from "@/services";

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
  { key: "subject", header: "Subject" },
  { key: "subjectType", header: "Subject Type" },
  { key: "credits", header: "Credits" },
  { key: "appeared", header: "Appeared" },
  { key: "passed", header: "Passed" },
  { key: "percentage", header: "Percentage" },
  { key: "boys", header: "Boys" },
  { key: "girls", header: "Girls" },
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

function toExportRows(rows: AnyRow[]): Record<string, unknown>[] {
  return rows.map((row, i) => ({
    si: i + 1,
    subject: txt(row.SUBJECT),
    subjectType: txt(row.subject_type),
    credits: txt(row.credits),
    appeared: txt(row.Appeared),
    passed: txt(row.Passed),
    percentage: txt(row.Pass_percentage),
    boys: txt(row.boys_passed),
    girls: txt(row.girls_passed),
  }));
}

function printReport(rows: AnyRow[], subtitle: string, examLabel: string) {
  if (!rows.length) return;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Gender Wise Result</title>
<style>
@page { size: A4 landscape; margin: 10mm; }
body { font: 11px/1.4 Arial, sans-serif; color: #000; margin: 0; }
.title, .sub, .exam { text-align: center; margin: 4px 0; }
.title { font-size: 15px; font-weight: bold; }
table { width: 100%; border-collapse: collapse; margin-top: 10px; }
th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; }
th { background: #f2f2f2; }
</style></head>
<body>
  <p class="title">Gender Wise Result</p>
  <p class="exam">${escapeHtml(examLabel)}</p>
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

/**
 * Angular Gender Wise Exam Result (`gender-wise-exam-report`).
 */
export default function GenderWiseExamReportPage() {
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  const [baseRows, setBaseRows] = useState<AnyRow[]>([]);
  const [restRows, setRestRows] = useState<AnyRow[]>([]);
  const [allFeeTypes, setAllFeeTypes] = useState<AnyRow[]>([]);
  const [examFeeTypes, setExamFeeTypes] = useState<AnyRow[]>([]);
  const [rows, setRows] = useState<AnyRow[]>([]);

  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [examTypeCatdetId, setExamTypeCatdetId] = useState("0");
  const [collegeId, setCollegeId] = useState("");
  const [courseGroupId, setCourseGroupId] = useState("0");
  const [courseYearId, setCourseYearId] = useState("0");

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
  const colleges = useMemo(
    () => dedupeBy(restRows, (r) => num(r.fk_college_id)),
    [restRows],
  );
  const courseGroups = useMemo(() => {
    if (!collegeId) return [];
    return dedupeBy(
      restRows.filter((r) => num(r.fk_college_id) === Number(collegeId)),
      (r) => num(r.fk_course_group_id),
    );
  }, [restRows, collegeId]);
  const courseYears = useMemo(() => {
    if (!collegeId) return [];
    const groupNum = Number(courseGroupId);
    const filtered = restRows.filter((r) => {
      if (num(r.fk_college_id) !== Number(collegeId)) return false;
      if (groupNum !== 0 && num(r.fk_course_group_id) !== groupNum) return false;
      return true;
    });
    const list = dedupeBy(filtered, (r) => num(r.fk_course_year_id));
    return [...list].sort(
      (a, b) =>
        num(a.year_order ?? a.cy_sort_order) -
        num(b.year_order ?? b.cy_sort_order),
    );
  }, [restRows, collegeId, courseGroupId]);

  const reportSubtitle = useMemo(() => {
    const parts = [
      txt(
        colleges.find((c) => num(c.fk_college_id) === Number(collegeId))
          ?.college_code,
      ),
      txt(
        courses.find((c) => num(c.fk_course_id) === Number(courseId))
          ?.course_code,
      ),
      Number(courseGroupId)
        ? txt(
            courseGroups.find(
              (g) => num(g.fk_course_group_id) === Number(courseGroupId),
            )?.group_code,
          )
        : "",
      Number(courseYearId)
        ? txt(
            courseYears.find(
              (y) => num(y.fk_course_year_id) === Number(courseYearId),
            )?.course_year_name ??
              courseYears.find(
                (y) => num(y.fk_course_year_id) === Number(courseYearId),
              )?.course_year_code,
          )
        : "",
      txt(rows[0]?.exam_label_name) || txt(selectedExam?.exam_name),
    ].filter(Boolean);
    return parts.join(" / ");
  }, [
    colleges,
    courses,
    courseGroups,
    courseYears,
    rows,
    selectedExam,
    collegeId,
    courseId,
    courseGroupId,
    courseYearId,
  ]);

  function clearResults() {
    setRows([]);
  }

  useEffect(() => {
    async function loadBase() {
      setLoadingFilters(true);
      try {
        const [list, feeTypes] = await Promise.all([
          getGenderWiseExamBaseFilters(employeeId),
          getGenderWiseExamFeeTypes(),
        ]);
        setBaseRows(list);
        setAllFeeTypes(feeTypes);
        const first = dedupeBy(list, (r) => num(r.fk_course_id));
        if (first.length) setCourseId(String(num(first[0].fk_course_id)));
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
    setExamId("");
    setExamTypeCatdetId("0");
    setCollegeId("");
    setCourseGroupId("0");
    setCourseYearId("0");
    setExamFeeTypes([]);
    setRestRows([]);
    clearResults();
    if (!courseId) {
      setAcademicYearId("");
      return;
    }
    const years = dedupeBy(
      baseRows.filter((r) => num(r.fk_course_id) === Number(courseId)),
      (r) => num(r.fk_academic_year_id),
    ).sort(
      (a, b) =>
        parseInt(txt(b.academic_year), 10) - parseInt(txt(a.academic_year), 10),
    );
    setAcademicYearId(
      years.length ? String(num(years[0].fk_academic_year_id)) : "",
    );
  }, [courseId, baseRows]);

  useEffect(() => {
    setExamTypeCatdetId("0");
    setCollegeId("");
    setCourseGroupId("0");
    setCourseYearId("0");
    setExamFeeTypes([]);
    setRestRows([]);
    clearResults();
    if (!courseId || !academicYearId) {
      setExamId("");
      return;
    }
    const list = dedupeBy(
      baseRows.filter(
        (r) =>
          num(r.fk_course_id) === Number(courseId) &&
          num(r.fk_academic_year_id) === Number(academicYearId),
      ),
      (r) => num(r.fk_exam_id),
    );
    setExamId(list.length ? String(num(list[0].fk_exam_id)) : "");
  }, [academicYearId, courseId, baseRows]);

  useEffect(() => {
    setCollegeId("");
    setCourseGroupId("0");
    setCourseYearId("0");
    clearResults();
    if (!examId || !selectedExam) {
      setExamFeeTypes([]);
      setRestRows([]);
      return;
    }
    const types = allFeeTypes.filter((t) => {
      const code = feeTypeCode(t);
      if (code === "Regular") return Boolean(selectedExam.is_regular_exam);
      if (code === "Supple") return Boolean(selectedExam.is_supply_exam);
      if (code === "Internal") return Boolean(selectedExam.is_internal_exam);
      return false;
    });
    setExamFeeTypes(types);
    setExamTypeCatdetId(
      types.length ? String(feeTypeId(types[0])) : "0",
    );

    async function loadRest() {
      setLoadingFilters(true);
      try {
        const list = await getGenderWiseExamRestFilters({
          courseId: Number(courseId),
          academicYearId: Number(academicYearId),
          examId: Number(examId),
          employeeId,
        });
        setRestRows(list);
        const clgs = dedupeBy(list, (r) => num(r.fk_college_id));
        if (clgs.length) {
          setCollegeId(String(num(clgs[0].fk_college_id)));
        }
      } catch (e) {
        toastError(e, "Failed to load colleges");
        setRestRows([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadRest();
  }, [
    examId,
    selectedExam,
    allFeeTypes,
    courseId,
    academicYearId,
    employeeId,
  ]);

  useEffect(() => {
    setCourseYearId("0");
    clearResults();
    if (!collegeId) {
      setCourseGroupId("0");
      return;
    }
    const groups = dedupeBy(
      restRows.filter((r) => num(r.fk_college_id) === Number(collegeId)),
      (r) => num(r.fk_course_group_id),
    );
    setCourseGroupId(
      groups.length ? String(num(groups[0].fk_course_group_id)) : "0",
    );
  }, [collegeId, restRows]);

  useEffect(() => {
    clearResults();
    if (!collegeId) {
      setCourseYearId("0");
      return;
    }
    const groupNum = Number(courseGroupId);
    const filtered = restRows.filter((r) => {
      if (num(r.fk_college_id) !== Number(collegeId)) return false;
      if (groupNum !== 0 && num(r.fk_course_group_id) !== groupNum) return false;
      return true;
    });
    const years = dedupeBy(filtered, (r) => num(r.fk_course_year_id)).sort(
      (a, b) =>
        num(a.year_order ?? a.cy_sort_order) -
        num(b.year_order ?? b.cy_sort_order),
    );
    setCourseYearId(
      years.length ? String(num(years[0].fk_course_year_id)) : "0",
    );
  }, [courseGroupId, collegeId, restRows]);

  async function onGetReport() {
    if (
      !courseId ||
      !academicYearId ||
      !examId ||
      !collegeId ||
      !examTypeCatdetId
    ) {
      toastInfo("Please Select Valid Filters");
      return;
    }
    setLoadingList(true);
    try {
      const list = await getGenderWiseExamReport({
        examId: Number(examId),
        collegeId: Number(collegeId),
        courseId: Number(courseId),
        courseGroupId: Number(courseGroupId) || 0,
        courseYearId: Number(courseYearId) || 0,
        examTypeCatdetId: Number(examTypeCatdetId) || 0,
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
      "Gender Wise Result",
      buildHtmlTable([...EXPORT_COLS], toExportRows(rows)),
      `<strong>Gender Wise Result &nbsp; (${escapeHtml(reportSubtitle)})</strong>`,
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
        headerName: "Subject",
        minWidth: 200,
        valueGetter: (p) => txt(p.data?.SUBJECT),
      },
      {
        headerName: "Subject Type",
        minWidth: 120,
        valueGetter: (p) => txt(p.data?.subject_type),
      },
      {
        headerName: "Credits",
        minWidth: 90,
        valueGetter: (p) => txt(p.data?.credits),
      },
      {
        headerName: "Appeared",
        minWidth: 100,
        valueGetter: (p) => txt(p.data?.Appeared),
      },
      {
        headerName: "Passed",
        minWidth: 90,
        valueGetter: (p) => txt(p.data?.Passed),
      },
      {
        headerName: "Percentage",
        minWidth: 110,
        valueGetter: (p) => txt(p.data?.Pass_percentage),
      },
      {
        headerName: "Boys",
        minWidth: 90,
        valueGetter: (p) => txt(p.data?.boys_passed),
      },
      {
        headerName: "Girls",
        minWidth: 90,
        valueGetter: (p) => txt(p.data?.girls_passed),
      },
    ],
    [],
  );

  const filters = (
    <>
      <GlobalFilterBarRow>
        <GlobalFilterField label="Course *">
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
        <GlobalFilterField label="Exam Year *">
          <Select
            value={academicYearId || null}
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
        <GlobalFilterField
          label="Exam Master *"
          className="min-w-[260px] flex-[2]"
        >
          <Select
            value={examId || null}
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
        <GlobalFilterField label="Exam Type *">
          <Select
            value={examTypeCatdetId || null}
            onChange={(v) => {
              setExamTypeCatdetId(v ?? "0");
              clearResults();
            }}
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
      </GlobalFilterBarRow>
      <GlobalFilterBarRow>
        <GlobalFilterField label="College *">
          <Select
            value={collegeId || null}
            onChange={(v) => setCollegeId(v ?? "")}
            isLoading={loadingFilters}
            options={colleges.map((c) => ({
              value: String(num(c.fk_college_id)),
              label: txt(c.college_code),
            }))}
            placeholder="College"
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
            onChange={(v) => {
              setCourseYearId(v ?? "0");
              clearResults();
            }}
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
        <GlobalFilterField
          label=""
          className="global-filter-field--shrink global-filter-field--action"
        >
          <Button
            type="button"
            onClick={() => void onGetReport()}
            disabled={loadingList}
            className="h-[30px] px-3 text-[12px]"
          >
            Get Report
          </Button>
        </GlobalFilterField>
      </GlobalFilterBarRow>
    </>
  );

  return (
    <FilteredListPage
      title={
        rows.length > 0
          ? `Gender Wise Result — ${reportSubtitle}`
          : "Gender Wise Result"
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
              onClick={() =>
                printReport(
                  rows,
                  reportSubtitle,
                  txt(rows[0]?.exam_label_name) ||
                    formatExamLabel(selectedExam ?? {}),
                )
              }
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
