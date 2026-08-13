"use client";

/**
 * GraceMarks Reports — Angular
 * `examination/exam-reports/exam-gracemarks-reports`
 *
 * Separate from Grace Marks Benefited Students
 * (`grace-marks-benefited-students-report`).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { format, parseISO } from "date-fns";
import { FileSpreadsheet, Printer, RefreshCw } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toastError } from "@/lib/toast";
import { toast } from "sonner";
import { useCollegeLogo } from "@/hooks/useCollegeLogo";
import { GM_CODES } from "@/config/constants/ui";
import { rowIndexGetter } from "@/lib/utils";
import {
  getExamResultProcessingReport,
  getGeneralDetails,
  getUnivExamFiltersRegSup,
  getUnivExamRestInRegExamStd,
  type AnyRow,
} from "@/services";
import { printExamGraceMarksReport } from "../_components/printExamGraceMarksReport";

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
  const tags: string[] = [];
  if (r.is_internal_exam || r.isInternalExam) tags.push("(Internal)");
  if (r.is_regular_exam || r.isRegularExam) tags.push("(Regular)");
  if (r.is_supply_exam || r.isSupplyExam) tags.push("(Supple)");
  return `${name}${range}${tags.length ? ` ${tags.join("")}` : ""}`;
}

/** Angular Total Marks: int_marks + ext_grace_total */
function totalMarks(row: Row | undefined): string {
  if (!row) return "—";
  const total = num(row.int_marks) + num(row.ext_grace_total);
  if (!Number.isFinite(total)) return "—";
  return String(total);
}

function exportHtmlTable(filename: string, title: string, bodyHtml: string) {
  const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Worksheet</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>${title}${bodyHtml}</table></body></html>`;
  const link = document.createElement("a");
  link.download = filename;
  link.href = `data:application/vnd.ms-excel;base64,${window.btoa(unescape(encodeURIComponent(template)))}`;
  link.click();
}

const COL_DEFS = {
  siNo: {
    headerName: "S.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
    cellStyle: { textAlign: "center" },
  } as ColDef<Row>,
  hallticket: {
    headerName: "Hall Ticket No",
    minWidth: 140,
    flex: 0.9,
    valueGetter: (p) =>
      dash(p.data?.hallticket_number ?? p.data?.hallticket_no),
  } as ColDef<Row>,
  semester: {
    headerName: "Semester",
    minWidth: 110,
    flex: 0.7,
    valueGetter: (p) => dash(p.data?.course_year_code ?? p.data?.semester),
  } as ColDef<Row>,
  subject: {
    headerName: "Subject Name",
    minWidth: 180,
    flex: 1.2,
    valueGetter: (p) => dash(p.data?.subject_name ?? p.data?.subject),
  } as ColDef<Row>,
  internal: {
    headerName: "Internal Marks",
    minWidth: 110,
    flex: 0.7,
    valueGetter: (p) => dash(p.data?.int_marks ?? p.data?.internal_marks),
    cellStyle: { textAlign: "center" },
  } as ColDef<Row>,
  external: {
    headerName: "External Marks",
    minWidth: 110,
    flex: 0.7,
    valueGetter: (p) => dash(p.data?.ext_marks ?? p.data?.external_marks),
    cellStyle: { textAlign: "center" },
  } as ColDef<Row>,
  grace: {
    headerName: "Grace Marks",
    minWidth: 100,
    flex: 0.7,
    valueGetter: (p) => dash(p.data?.grace_marks_added ?? p.data?.grace_marks),
    cellStyle: { textAlign: "center" },
  } as ColDef<Row>,
  finalExternal: {
    headerName: "Final External Marks",
    minWidth: 140,
    flex: 0.8,
    valueGetter: (p) =>
      dash(p.data?.ext_grace_total ?? p.data?.final_external_marks),
    cellStyle: { textAlign: "center" },
  } as ColDef<Row>,
  total: {
    headerName: "Total Marks",
    minWidth: 100,
    flex: 0.7,
    valueGetter: (p) => totalMarks(p.data),
    cellStyle: { textAlign: "center" },
  } as ColDef<Row>,
};

export default function ExamGraceMarksReportsPage() {
  const [loading, setLoading] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [employeeId, setEmployeeId] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [baseRows, setBaseRows] = useState<Row[]>([]);
  const [restRows, setRestRows] = useState<Row[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [examFeeTypes, setExamFeeTypes] = useState<Row[]>([]);
  const [courseId, setCourseId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [examId, setExamId] = useState("");
  const [examTypeId, setExamTypeId] = useState("0");
  const [collegeId, setCollegeId] = useState("");
  const [courseGroupId, setCourseGroupId] = useState("");
  const [courseYearId, setCourseYearId] = useState("");
  const [filterSummary, setFilterSummary] = useState("");
  const [examLabel, setExamLabel] = useState("");

  const collegeLogo = useCollegeLogo(collegeId ? Number(collegeId) : null);

  useEffect(() => {
    setEmployeeId(Number(globalThis?.localStorage?.getItem("employeeId") ?? 0));
    try {
      setIsAdmin(
        JSON.parse(globalThis?.localStorage?.getItem("isAdmin") ?? "false") ===
          true,
      );
    } catch {
      setIsAdmin(false);
    }
  }, []);

  function clearResults() {
    setRows([]);
    setHasFetched(false);
    setFilterSummary("");
    setExamLabel("");
  }

  useEffect(() => {
    async function init() {
      if (!employeeId) return;
      setLoadingFilters(true);
      try {
        const filters = await getUnivExamFiltersRegSup(employeeId);
        const list = Array.isArray(filters) ? filters : [];
        const univ = list.filter(
          (r) => !txt(r.flag) || txt(r.flag) === "univ_exam_filters",
        );
        setBaseRows(univ.length ? univ : list);
        const courses = dedupeBy(univ.length ? univ : list, (r) =>
          num(r.fk_course_id),
        );
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
      ).sort(
        (a, b) =>
          Number(String(txt(b.academic_year)).split("-")[0] || 0) -
          Number(String(txt(a.academic_year)).split("-")[0] || 0),
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

  const colleges = useMemo(
    () =>
      dedupeBy(restRows, (r) => num(r.fk_college_id)).sort(
        (a, b) =>
          num(a.clg_sort_order ?? a.sort_order) -
          num(b.clg_sort_order ?? b.sort_order),
      ),
    [restRows],
  );

  const courseGroups = useMemo(() => {
    const source = restRows.filter(
      (r) => !collegeId || num(r.fk_college_id) === Number(collegeId),
    );
    return dedupeBy(source, (r) => num(r.fk_course_group_id));
  }, [restRows, collegeId]);

  const courseYears = useMemo(() => {
    const source = restRows.filter(
      (r) =>
        (!collegeId || num(r.fk_college_id) === Number(collegeId)) &&
        (!courseGroupId ||
          Number(courseGroupId) === 0 ||
          num(r.fk_course_group_id) === Number(courseGroupId)),
    );
    return dedupeBy(source, (r) => num(r.fk_course_year_id)).sort(
      (a, b) =>
        num(a.year_order ?? a.cy_sort_order) -
        num(b.year_order ?? b.cy_sort_order),
    );
  }, [restRows, collegeId, courseGroupId]);

  const examTypeOptions: SelectOption[] = useMemo(
    () => [
      { value: "0", label: "All" },
      ...examFeeTypes.map((r) => ({
        value: String(num(r.generalDetailId ?? r.general_detail_id)),
        label:
          txt(r.generalDetailCode ?? r.general_detail_code) ||
          String(num(r.generalDetailId)),
      })),
    ],
    [examFeeTypes],
  );

  const columnDefs = useMemo<ColDef<Row>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.hallticket,
      COL_DEFS.semester,
      COL_DEFS.subject,
      COL_DEFS.internal,
      COL_DEFS.external,
      COL_DEFS.grace,
      COL_DEFS.finalExternal,
      COL_DEFS.total,
    ],
    [],
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
    async function loadRestAndTypes() {
      if (!courseId || !academicYearId || !examId || !employeeId) {
        setRestRows([]);
        setExamFeeTypes([]);
        setCollegeId("");
        setCourseGroupId("");
        setCourseYearId("");
        setExamTypeId("0");
        return;
      }
      setLoadingFilters(true);
      try {
        const [bundle, feeTypes] = await Promise.all([
          getUnivExamRestInRegExamStd({
            courseId: Number(courseId),
            examId: Number(examId),
            academicYearId: Number(academicYearId),
            employeeId,
            flagType: "REGSUP",
          }),
          getGeneralDetails(GM_CODES.EXAM_FEE_TYPE).catch(() => []),
        ]);
        setRestRows(
          Array.isArray(bundle.restFilters) ? bundle.restFilters : [],
        );

        const examRow =
          baseRows.find(
            (r) =>
              num(r.fk_course_id) === Number(courseId) &&
              num(r.fk_academic_year_id) === Number(academicYearId) &&
              num(r.fk_exam_id) === Number(examId),
          ) ?? null;
        const allowed: Row[] = [];
        for (const ft of feeTypes) {
          const code = txt(ft.generalDetailCode ?? ft.general_detail_code);
          if (examRow?.is_regular_exam && code === "Regular") allowed.push(ft);
          if (examRow?.is_supply_exam && code === "Supple") allowed.push(ft);
          if (examRow?.is_internal_exam && code === "Internal")
            allowed.push(ft);
        }
        setExamFeeTypes(allowed);
        setExamTypeId(
          allowed[0]
            ? String(
                num(allowed[0].generalDetailId ?? allowed[0].general_detail_id),
              )
            : "0",
        );
        setCollegeId("");
        setCourseGroupId("");
        setCourseYearId("");
        clearResults();
      } catch (e) {
        toastError(e, "Failed to load filters");
        setRestRows([]);
        setExamFeeTypes([]);
      } finally {
        setLoadingFilters(false);
      }
    }
    void loadRestAndTypes();
  }, [courseId, academicYearId, examId, employeeId, baseRows]);

  useEffect(() => {
    if (!colleges.length) return;
    if (!colleges.some((r) => num(r.fk_college_id) === Number(collegeId))) {
      setCollegeId(String(num(colleges[0].fk_college_id)));
    }
  }, [colleges, collegeId]);

  useEffect(() => {
    if (!courseGroups.length) return;
    if (
      Number(courseGroupId) !== 0 &&
      !courseGroups.some(
        (r) => num(r.fk_course_group_id) === Number(courseGroupId),
      )
    ) {
      setCourseGroupId(String(num(courseGroups[0].fk_course_group_id)));
      setCourseYearId("");
    } else if (!courseGroupId) {
      setCourseGroupId(String(num(courseGroups[0].fk_course_group_id)));
    }
  }, [courseGroups, courseGroupId]);

  useEffect(() => {
    if (!courseYears.length) return;
    if (
      Number(courseYearId) !== 0 &&
      !courseYears.some(
        (r) => num(r.fk_course_year_id) === Number(courseYearId),
      )
    ) {
      setCourseYearId(String(num(courseYears[0].fk_course_year_id)));
    } else if (!courseYearId) {
      setCourseYearId(String(num(courseYears[0].fk_course_year_id)));
    }
  }, [courseYears, courseYearId]);

  function buildSummary(list: Row[]): string {
    const college = colleges.find(
      (r) => num(r.fk_college_id) === Number(collegeId),
    );
    const course = courses.find(
      (r) => num(r.fk_course_id) === Number(courseId),
    );
    const group = courseGroups.find(
      (r) => num(r.fk_course_group_id) === Number(courseGroupId),
    );
    const year = courseYears.find(
      (r) => num(r.fk_course_year_id) === Number(courseYearId),
    );
    const examName =
      txt(list[0]?.exam_label_name) ||
      txt(exams.find((r) => num(r.fk_exam_id) === Number(examId))?.exam_name);
    return [
      txt(college?.college_code),
      txt(course?.course_code),
      Number(courseGroupId) > 0 ? txt(group?.group_code) : "",
      Number(courseYearId) > 0 ? txt(year?.course_year_code) : "",
      examName,
    ]
      .filter(Boolean)
      .join(" / ");
  }

  async function onGetReport() {
    if (!courseId || !examId || !collegeId) {
      toast.info("Please Select Valid Filters");
      return;
    }
    if (
      !isAdmin &&
      (!courseGroupId ||
        !courseYearId ||
        Number(courseGroupId) === 0 ||
        Number(courseYearId) === 0)
    ) {
      toast.info("Please Select Valid Filters");
      return;
    }
    setLoading(true);
    setHasFetched(true);
    try {
      const list = await getExamResultProcessingReport({
        flag: "exam_gracemark_added_list",
        examId: Number(examId),
        examType: Number(examTypeId || 0),
        collegeId: Number(collegeId),
        courseId: Number(courseId),
        courseGroupId: Number(courseGroupId || 0),
        courseYearId: Number(courseYearId || 0),
      });
      const rowsList = Array.isArray(list) ? list : [];
      setRows(rowsList);
      if (!rowsList.length) {
        toast.info("No Records Found.");
        setFilterSummary("");
        setExamLabel("");
        return;
      }
      setExamLabel(
        txt(rowsList[0]?.exam_label_name) ||
          examMasterLabel(
            exams.find((r) => num(r.fk_exam_id) === Number(examId)) ?? {},
          ),
      );
      setFilterSummary(buildSummary(rowsList));
    } catch (e) {
      toastError(e, "Failed to load report");
      setRows([]);
      setFilterSummary("");
      setExamLabel("");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    clearResults();
    setExamId("");
    setAcademicYearId("");
    setExamTypeId("0");
    setCollegeId("");
    setCourseGroupId("");
    setCourseYearId("");
    setRestRows([]);
    setExamFeeTypes([]);
    const c = courses[0];
    if (c) setCourseId(String(num(c.fk_course_id)));
    else setCourseId("");
  }

  function handleExportExcel() {
    if (!rows.length) return;
    const head =
      "<tr><th>S.No</th><th>Hall Ticket No</th><th>Semester</th><th>Subject Name</th><th>Internal Marks</th><th>External Marks</th><th>Grace Marks</th><th>Final External Marks</th><th>Total Marks</th></tr>";
    const body = rows
      .map(
        (r, i) =>
          `<tr><td>${i + 1}</td><td>${txt(r.hallticket_number)}</td><td>${txt(r.course_year_code)}</td><td>${txt(r.subject_name)}</td><td>${txt(r.int_marks)}</td><td>${txt(r.ext_marks)}</td><td>${txt(r.grace_marks_added)}</td><td>${txt(r.ext_grace_total)}</td><td>${totalMarks(r)}</td></tr>`,
      )
      .join("");
    const title = `<tr style="display:none"><th colspan="9">GraceMarks Report &nbsp; (${filterSummary})</th></tr>`;
    exportHtmlTable("Grace Marks Report.xls", title, `${head}${body}`);
  }

  function handlePrint() {
    if (!rows.length) {
      toast.info("No Records Found.");
      return;
    }
    const college = colleges.find(
      (r) => num(r.fk_college_id) === Number(collegeId),
    );
    const group = courseGroups.find(
      (r) => num(r.fk_course_group_id) === Number(courseGroupId),
    );
    const year = courseYears.find(
      (r) => num(r.fk_course_year_id) === Number(courseYearId),
    );
    printExamGraceMarksReport({
      collegeName: txt(
        college?.college_name ?? college?.collegeName ?? college?.college_code,
      ),
      collegeLogo,
      examLabel,
      courseGroupCode: Number(courseGroupId) > 0 ? txt(group?.group_code) : "",
      courseYearCode:
        Number(courseYearId) > 0 ? txt(year?.course_year_code) : "",
      rows,
    });
  }

  const getRowId = useCallback(
    (p: { data?: Row; node?: { rowIndex?: number | null } }) =>
      `row-${p.node?.rowIndex ?? 0}-${txt(p.data?.hallticket_number)}-${txt(p.data?.subject_name)}-${txt(p.data?.ext_grace_total)}`,
    [],
  );

  const courseGroupOptions: SelectOption[] = useMemo(() => {
    const opts = courseGroups.map((r) => ({
      value: String(num(r.fk_course_group_id)),
      label: txt(r.group_code) || String(num(r.fk_course_group_id)),
    }));
    return isAdmin ? [{ value: "0", label: "All" }, ...opts] : opts;
  }, [courseGroups, isAdmin]);

  const courseYearOptions: SelectOption[] = useMemo(() => {
    const opts = courseYears.map((r) => ({
      value: String(num(r.fk_course_year_id)),
      label: txt(r.course_year_code) || String(num(r.fk_course_year_id)),
    }));
    return isAdmin ? [{ value: "0", label: "All" }, ...opts] : opts;
  }, [courseYears, isAdmin]);

  return (
    <FilteredListPage
      title={
        hasFetched && filterSummary
          ? `GraceMarks Reports - ${filterSummary}`
          : "GraceMarks Reports"
      }
      resultsVisible={hasFetched}
      filters={
        <div className="space-y-2">
          <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
            <div className="space-y-1 md:col-span-2">
              <Label>Course *</Label>
              <Select
                value={courseId || null}
                onChange={(v) => {
                  setCourseId(v ?? "");
                  setAcademicYearId("");
                  setExamId("");
                  clearResults();
                }}
                options={courses.map((r) => ({
                  value: String(num(r.fk_course_id)),
                  label: txt(r.course_code) || String(num(r.fk_course_id)),
                }))}
                isLoading={loadingFilters}
                searchable
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Exam Year *</Label>
              <Select
                value={academicYearId || null}
                onChange={(v) => {
                  setAcademicYearId(v ?? "");
                  setExamId("");
                  clearResults();
                }}
                options={academicYears.map((r) => ({
                  value: String(num(r.fk_academic_year_id)),
                  label:
                    txt(r.academic_year) || String(num(r.fk_academic_year_id)),
                }))}
                disabled={!courseId}
                searchable
              />
            </div>
            <div className="space-y-1 md:col-span-5">
              <Label>Exam *</Label>
              <Select
                value={examId || null}
                onChange={(v) => {
                  setExamId(v ?? "");
                  clearResults();
                }}
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
              <Label>Exam Type *</Label>
              <Select
                value={examTypeId}
                onChange={(v) => {
                  setExamTypeId(v ?? "0");
                  clearResults();
                }}
                options={examTypeOptions}
                disabled={!examId}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
            <div className="space-y-1 md:col-span-2">
              <Label>College *</Label>
              <Select
                value={collegeId || null}
                onChange={(v) => {
                  setCollegeId(v ?? "");
                  setCourseGroupId("");
                  setCourseYearId("");
                  clearResults();
                }}
                options={colleges.map((r) => ({
                  value: String(num(r.fk_college_id)),
                  label: txt(r.college_code) || String(num(r.fk_college_id)),
                }))}
                disabled={!examId}
                searchable
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Course Group *</Label>
              <Select
                value={courseGroupId || null}
                onChange={(v) => {
                  setCourseGroupId(v ?? "");
                  setCourseYearId("");
                  clearResults();
                }}
                options={courseGroupOptions}
                disabled={!collegeId}
                searchable
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Course Year *</Label>
              <Select
                value={courseYearId || null}
                onChange={(v) => {
                  setCourseYearId(v ?? "");
                  clearResults();
                }}
                options={courseYearOptions}
                disabled={!courseGroupId && !isAdmin}
                searchable
              />
            </div>
            <div className="flex items-end gap-2 md:col-span-3">
              <Button
                type="button"
                className="h-8 text-[12px]"
                onClick={() => void onGetReport()}
                disabled={loading || loadingFilters}
              >
                {loading ? "Loading…" : "Get Report"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Reset"
                onClick={handleReset}
                disabled={loading || loadingFilters}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      }
      rowData={hasFetched ? rows : []}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      paginationPageSize={25}
      getRowId={getRowId}
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        exportExcel: false,
        exportPdf: false,
      }}
      toolbarTrailing={
        hasFetched && rows.length > 0 ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 text-[12px]"
              onClick={handleExportExcel}
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 text-[12px]"
              onClick={handlePrint}
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print Report
            </Button>
          </div>
        ) : undefined
      }
    />
  );
}
