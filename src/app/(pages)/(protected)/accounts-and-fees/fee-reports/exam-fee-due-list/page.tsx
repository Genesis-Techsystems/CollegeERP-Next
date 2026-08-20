"use client";

/**
 * Angular `accounts-and-fees/fee-reports/exam-fee-due-list`
 * Exam Registration Due List / Exam Fee Due List.
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
import { format } from "date-fns";
import { FileSpreadsheet, Printer, RotateCcw } from "lucide-react";
import { Select } from "@/common/components/select";
import {
  buildHtmlTable,
  escapeHtml,
  exportHtmlTableAsExcel,
} from "@/common/export-html-table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useCollegeLogo, DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import { printHtmlInIframe } from "@/lib/print";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastSuccess } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  dedupeBy,
  getExamRegistrationFeeDueList,
  getExamTimetableFilterRows,
} from "@/services";

type AnyRow = Record<string, unknown>;

function pickNum(row: AnyRow | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const k of keys) {
    const v = Number(row[k] ?? 0);
    if (Number.isFinite(v) && v !== 0) return v;
  }
  for (const k of keys) {
    const v = Number(row[k] ?? 0);
    if (Number.isFinite(v)) return v;
  }
  return 0;
}

function pickText(row: AnyRow | undefined, keys: string[]): string {
  if (!row) return "";
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function formatExamLabel(exam: AnyRow): string {
  const name = pickText(exam, ["exam_name", "examName"]) || "—";
  const from = exam.from_date ?? exam.fromDate;
  const to = exam.to_date ?? exam.toDate;
  let range = "";
  if (from || to) {
    const f = from ? format(new Date(String(from)), "MMM d, yyyy") : "";
    const t = to ? format(new Date(String(to)), "MMM d, yyyy") : "";
    range = f && t ? ` (${f} - ${t})` : f || t ? ` (${f || t})` : "";
  }
  const tags: string[] = [];
  if (exam.is_internal_exam || exam.isInternalExam) tags.push("(Internal)");
  if (exam.is_regular_exam || exam.isRegularExam) tags.push("(Regular)");
  if (exam.is_supply_exam || exam.isSupplyExam) tags.push("(Supple)");
  return `${name}${range}${tags.length ? ` ${tags.join(" ")}` : ""}`;
}

const COL_DEFS = {
  siNo: {
    headerName: "S.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  hallticket: {
    field: "hallticket_number",
    headerName: "Hall Ticket No",
    minWidth: 140,
  } as ColDef<AnyRow>,
  student: {
    headerName: "Student Name",
    minWidth: 180,
    valueGetter: (p) =>
      `${String(p.data?.first_name ?? "")}${String(p.data?.last_name ?? "")}`,
  } as ColDef<AnyRow>,
  courseGroup: {
    field: "course_group",
    headerName: "Course Group",
    minWidth: 120,
  } as ColDef<AnyRow>,
  courseYear: {
    field: "course_year",
    headerName: "Course Year",
    minWidth: 110,
    cellClass: "text-center",
  } as ColDef<AnyRow>,
  regFee: {
    field: "reg_fee",
    headerName: "Reg Fee",
    minWidth: 100,
    cellClass: "text-center",
  } as ColDef<AnyRow>,
};

const EXCEL_COLUMNS = [
  { key: "siNo", header: "S.No" },
  { key: "hallticket_number", header: "Hall Ticket No" },
  { key: "studentName", header: "Student Name" },
  { key: "course_group", header: "Course Group" },
  { key: "course_year", header: "Course Year" },
  { key: "reg_fee", header: "Reg Fee" },
] as const;

export default function ExamFeeDueListPage() {
  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [examId, setExamId] = useState<string | null>(null);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [listLoaded, setListLoaded] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [dataDetails, setDataDetails] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [examName, setExamName] = useState("");
  const orgCode = String(
    globalThis?.localStorage?.getItem("orgCode") ?? "",
  ).toUpperCase();

  const collegeLogo = useCollegeLogo(
    collegeId && collegeId !== "0" ? Number(collegeId) : null,
  );

  const filtersQuery = useQuery({
    queryKey: QK.feesCollection.examFeeDueList.filters(orgId, employeeId),
    queryFn: () =>
      getExamTimetableFilterRows({
        organizationId: orgId,
        employeeId,
      }),
    enabled: orgId > 0 && employeeId > 0,
  });

  const filterRows = useMemo(
    () => (filtersQuery.data ?? []) as AnyRow[],
    [filtersQuery.data],
  );

  const clearResults = () => {
    setRows([]);
    setListLoaded(false);
    setDataDetails("");
    setCollegeName("");
    setExamName("");
  };

  const collegeOptions = useMemo(() => {
    const colleges = dedupeBy(filterRows, (r) =>
      pickNum(r, ["fk_college_id", "collegeId"]),
    ).sort(
      (a, b) =>
        pickNum(a, ["clg_sort_order", "clgSortOrder"]) -
        pickNum(b, ["clg_sort_order", "clgSortOrder"]),
    );
    return colleges.map((c) => ({
      value: String(pickNum(c, ["fk_college_id", "collegeId"])),
      label:
        pickText(c, ["college_code", "collegeCode", "college_name"]) || "—",
    }));
  }, [filterRows]);

  const courseOptions = useMemo(() => {
    if (!collegeId) return [];
    const cid = Number(collegeId);
    const filtered = filterRows.filter(
      (r) => pickNum(r, ["fk_college_id", "collegeId"]) === cid,
    );
    return dedupeBy(filtered, (r) =>
      pickNum(r, ["fk_course_id", "courseId"]),
    ).map((c) => ({
      value: String(pickNum(c, ["fk_course_id", "courseId"])),
      label: pickText(c, ["course_code", "courseCode", "course_name"]) || "—",
    }));
  }, [filterRows, collegeId]);

  const examOptions = useMemo(() => {
    if (!collegeId || !courseId) return [];
    const cid = Number(collegeId);
    const crid = Number(courseId);
    const filtered = filterRows.filter(
      (r) =>
        pickNum(r, ["fk_college_id", "collegeId"]) === cid &&
        pickNum(r, ["fk_course_id", "courseId"]) === crid &&
        !r.is_internal_exam &&
        !r.isInternalExam,
    );
    return dedupeBy(filtered, (r) => pickNum(r, ["fk_exam_id", "examId"])).map(
      (e) => ({
        value: String(pickNum(e, ["fk_exam_id", "examId"])),
        label: formatExamLabel(e),
      }),
    );
  }, [filterRows, collegeId, courseId]);

  useEffect(() => {
    if (collegeId || collegeOptions.length === 0) return;
    setCollegeId(collegeOptions[0]?.value ?? null);
  }, [collegeId, collegeOptions]);

  useEffect(() => {
    if (!collegeId) return;
    setCourseId(null);
    setExamId(null);
    clearResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collegeId]);

  useEffect(() => {
    if (!collegeId || courseId || courseOptions.length === 0) return;
    setCourseId(courseOptions[0]?.value ?? null);
  }, [collegeId, courseId, courseOptions]);

  useEffect(() => {
    if (!courseId) return;
    setExamId(null);
    clearResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useEffect(() => {
    if (!courseId || examId || examOptions.length === 0) return;
    setExamId(examOptions[0]?.value ?? null);
  }, [courseId, examId, examOptions]);

  const reset = () => {
    setCourseId("");
    setExamId("");
    clearResults();
  };

  async function handleGetReport() {
    if (!collegeId || !courseId || !examId || examId === "0") {
      toastError("Please select College, Course and Exam.");
      return;
    }

    const college = filterRows.find(
      (r) => String(pickNum(r, ["fk_college_id", "collegeId"])) === collegeId,
    );
    const course = courseOptions.find((o) => o.value === courseId);
    const exam = examOptions.find((o) => o.value === examId);
    const collegeCode = pickText(college, ["college_code", "collegeCode"]);
    const clgName =
      pickText(college, ["college_name", "collegeName"]) || collegeCode;
    const examLabel =
      pickText(
        filterRows.find(
          (r) => String(pickNum(r, ["fk_exam_id", "examId"])) === examId,
        ),
        ["exam_name", "examName"],
      ) ||
      exam?.label ||
      "";
    const details = [collegeCode, course?.label, examLabel]
      .filter(Boolean)
      .join(" / ");

    setLoadingList(true);
    setListLoaded(true);
    try {
      const list = await getExamRegistrationFeeDueList(Number(examId));
      setRows(list);
      setDataDetails(details);
      setCollegeName(clgName);
      setExamName(examLabel);
      if (list.length === 0) toastSuccess("No records found.");
    } catch (e) {
      setRows([]);
      toastError(getErrorMessage(e) || "Failed to load exam fee due list");
    } finally {
      setLoadingList(false);
    }
  }

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.hallticket,
      COL_DEFS.student,
      COL_DEFS.courseGroup,
      COL_DEFS.courseYear,
      COL_DEFS.regFee,
    ],
    [],
  );

  const exportFlatRows = useMemo(
    () =>
      rows.map((row, i) => ({
        siNo: i + 1,
        hallticket_number: String(row.hallticket_number ?? ""),
        studentName: `${String(row.first_name ?? "")}${String(row.last_name ?? "")}`,
        course_group: String(row.course_group ?? ""),
        course_year: String(row.course_year ?? ""),
        reg_fee: row.reg_fee ?? "",
      })),
    [rows],
  );

  const handleExcelExport = () => {
    if (exportFlatRows.length === 0) {
      toastError("No records to export.");
      return;
    }
    const title = "Exam Registration Fee Report";
    const headerHtml = `<div style="font-weight:bold;margin-bottom:8px;">
      Exam Registration Due List${dataDetails ? ` &nbsp; (${escapeHtml(dataDetails)})` : ""}
    </div>`;
    const tableHtml = buildHtmlTable(
      EXCEL_COLUMNS.map((c) => ({ key: c.key, header: c.header })),
      exportFlatRows as Record<string, unknown>[],
    );
    exportHtmlTableAsExcel(`${title}.xls`, tableHtml, headerHtml);
  };

  const handlePrintReport = () => {
    if (exportFlatRows.length === 0) {
      toastError("No records to print.");
      return;
    }
    const logoSrc = collegeLogo || DEFAULT_COLLEGE_LOGO;
    const reportTitle =
      orgCode === "SUK" ? "Exam Fee Due Report" : "Exam Registration Due List";
    const tableHtml = buildHtmlTable(
      EXCEL_COLUMNS.map((c) => ({ key: c.key, header: c.header })),
      exportFlatRows as Record<string, unknown>[],
    );
    const headerHtml =
      orgCode === "SUK"
        ? `<div style="text-align:center;margin-bottom:12px;">
        <img src="${escapeHtml(logoSrc)}" alt="" style="height:100px;max-width:90%;object-fit:contain;" />
        <p style="font-size:16px;font-weight:700;margin:8px 0 4px;">${escapeHtml(collegeName)}</p>
        <p style="font-size:13px;margin:2px 0;">${escapeHtml(examName)}</p>
        <p style="font-size:13px;font-weight:600;margin:2px 0;">${reportTitle}</p>
      </div>`
        : `<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">
        <img src="${escapeHtml(logoSrc)}" alt="" style="height:72px;width:auto;object-fit:contain;" />
        <div>
          <p style="font-size:16px;font-weight:700;margin:0 0 4px;text-align:left;">${escapeHtml(collegeName)}</p>
          <p style="font-size:13px;margin:2px 0;text-align:left;">${escapeHtml(examName)}</p>
          <p style="font-size:13px;font-weight:600;margin:2px 0;text-align:left;">${reportTitle}</p>
        </div>
      </div>`;

    printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(reportTitle)}</title>
<style>
body{font-family:Arial,sans-serif;padding:16px;color:#111}
table{width:100%;border-collapse:collapse;font-size:11px}
th,td{border:1px solid #333;padding:3px 5px}
th{background:#e8f0fe;text-align:center}
td:nth-child(1),td:nth-child(5),td:nth-child(6){text-align:center}
td:nth-child(2),td:nth-child(3),td:nth-child(4){text-align:left}
</style></head><body>
${headerHtml}
${tableHtml}
</body></html>`);
  };

  const showTable = listLoaded && rows.length > 0;
  const pageTitle = showTable
    ? `Exam Fee Due List${dataDetails ? ` — ${dataDetails}` : ""}`
    : "Exam Registration Due List";

  return (
    <FilteredListPage
      title={pageTitle}
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[140px] flex-1 sm:max-w-[180px]">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={(v) => setCollegeId(v)}
              options={collegeOptions}
              placeholder="College"
              isLoading={filtersQuery.isLoading}
            />
          </div>
          <div className="min-w-[140px] flex-1 sm:max-w-[180px]">
            <Select
              label="Course"
              required
              value={courseId}
              onChange={(v) => setCourseId(v)}
              options={courseOptions}
              placeholder="Course"
              disabled={!collegeId}
            />
          </div>
          <div className="min-w-[240px] flex-[2] sm:max-w-none">
            <Select
              label="Exam"
              required
              value={examId}
              onChange={(v) => setExamId(v)}
              options={examOptions}
              placeholder="Exam"
              searchable
              disabled={!courseId}
            />
          </div>
          <Button
            type="button"
            className="h-9 w-fit px-4"
            disabled={loadingList}
            onClick={() => void handleGetReport()}
          >
            {loadingList ? "Loading…" : "Get Report"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            title="Reset"
            onClick={reset}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      }
      rowData={showTable ? rows : []}
      columnDefs={columnDefs}
      loading={loadingList || filtersQuery.isLoading}
      resultsVisible={showTable}
      hideEmptyGrid
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportExcel: false,
        exportPdf: false,
      }}
      toolbarTrailing={
        showTable ? (
          <>
            <Button
              type="button"
              size="sm"
              className="h-9 px-3 text-[12px]"
              onClick={handleExcelExport}
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 px-3 text-[12px]"
              onClick={handlePrintReport}
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print Report
            </Button>
          </>
        ) : null
      }
    />
  );
}
