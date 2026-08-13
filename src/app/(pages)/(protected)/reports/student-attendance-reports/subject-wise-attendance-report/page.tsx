"use client";

/**
 * Subject Wise Attendance Report —
 * Angular `reports/student-attendance-reports/subject-wise-attendance-report` parity.
 * Get Attendance: `getAllRecords/s_rep_tt_std_subwise_attendance`
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { FileSpreadsheet, Printer } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { Select, type SelectOption } from "@/common/components/select";
import {
  buildHtmlTable,
  exportHtmlTableAsExcel,
} from "@/common/export-html-table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCollegeLogo, DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import { getErrorMessage } from "@/lib/errors";
import { printHtmlInIframe } from "@/lib/print";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { toastError, toastInfo } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  fetchAttendanceSubjectFilterRows,
  fetchSubjectWiseAttendanceReport,
  getCollegeById,
} from "@/services";
import {
  useAttendanceReportFilters,
  formatYmd,
  formatDateHeader,
  buildBannerHtml,
  escapeHtml,
} from "../_lib/useAttendanceReportFilters";

type AnyRow = Record<string, unknown>;

const REPORT_TITLE = "Subject Wise Attendance Report";

function dateFieldKey(date: string): string {
  return `d_${date}`;
}

function pickText(row: AnyRow, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function pickNum(row: AnyRow, keys: string[]): number {
  for (const k of keys) {
    const n = Number(row[k]);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function studentCellRenderer(p: ICellRendererParams<AnyRow>) {
  const name = String(p.data?.firstName ?? "");
  const mobile = String(p.data?.Father_Mobile_No ?? "");
  if (!mobile) return name;
  return (
    <span>
      {name} (<span className="text-blue-600">{mobile}</span>)
    </span>
  );
}

function pivotSubjectWiseRows(raw: AnyRow[]): {
  dateKeys: string[];
  gridRows: AnyRow[];
  faculty: string;
} {
  const dateKeys: string[] = [];
  const byRoll = new Map<
    string,
    {
      rollNumber: string;
      Academic_details: string;
      firstName: string;
      Father_Mobile_No: string;
      cells: Record<string, string>;
      present: number;
      total: number;
    }
  >();

  for (const row of raw) {
    const classDate = String(row.class_date ?? "");
    if (classDate && !dateKeys.includes(classDate)) {
      dateKeys.push(classDate);
    }

    let pRaw = row.P;
    let cRaw = row.C;
    let tpc: string;
    if (pRaw === "-") pRaw = 0;
    if (cRaw === "-") {
      cRaw = 0;
      tpc = "-";
    } else {
      tpc = `${pRaw}/${cRaw}`;
    }
    const p = Number(pRaw) || 0;
    const c = Number(cRaw) || 0;

    const roll = String(row.roll_number ?? "");
    let student = byRoll.get(roll);
    if (!student) {
      student = {
        rollNumber: roll,
        Academic_details: String(row.Academic_details ?? ""),
        firstName: String(row.Student_name ?? ""),
        Father_Mobile_No: String(row.Father_Mobile_No ?? ""),
        cells: {},
        present: 0,
        total: 0,
      };
      byRoll.set(roll, student);
    }

    if (classDate) {
      student.cells[dateFieldKey(classDate)] = tpc;
    }
    student.present += p;
    student.total += c;
  }

  const gridRows: AnyRow[] = Array.from(byRoll.values()).map((s) => {
    const cells: Record<string, string> = {};
    for (const date of dateKeys) {
      const key = dateFieldKey(date);
      cells[key] = s.cells[key] ?? "-";
    }
    return {
      rollNumber: s.rollNumber,
      Academic_details: s.Academic_details,
      firstName: s.firstName,
      Father_Mobile_No: s.Father_Mobile_No,
      studentDisplay: `${s.firstName}${s.Father_Mobile_No ? ` (${s.Father_Mobile_No})` : ""}`,
      present: s.present,
      total: s.total,
      totalDisplay: `${s.present}/${s.total}`,
      percentage:
        s.total > 0 ? ((s.present / s.total) * 100).toFixed(2) : "0.00",
      ...cells,
    };
  });

  const faculty = pickText(raw[0] ?? {}, ["Faculty", "faculty"]);
  return { dateKeys, gridRows, faculty };
}

export default function SubjectWiseAttendanceReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgCode =
    typeof globalThis.localStorage !== "undefined"
      ? String(globalThis.localStorage.getItem("orgCode") ?? "")
      : "";

  const [fromDate, setFromDate] = useState<Date | null>(() => new Date());
  const [toDate, setToDate] = useState<Date | null>(() => new Date());
  const [subjectId, setSubjectId] = useState("");
  const [minPer, setMinPer] = useState(0);
  const [maxPer, setMaxPer] = useState(100);
  const [subjectOptions, setSubjectOptions] = useState<SelectOption[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const [dateKeys, setDateKeys] = useState<string[]>([]);
  const [gridRows, setGridRows] = useState<AnyRow[]>([]);
  const [dataDetails, setDataDetails] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const clearResults = useCallback(() => {
    setDateKeys([]);
    setGridRows([]);
    setShowTable(false);
    setDataDetails("");
    setCollegeName("");
  }, []);

  const f = useAttendanceReportFilters({
    defaultSectionZero: true,
    onClearResults: clearResults,
  });

  const collegeNum = Number(f.collegeId || 0) || null;
  const collegeLogo = useCollegeLogo(collegeNum);

  // Load subjects when cascade is ready (Angular selectedSection)
  useEffect(() => {
    setSubjectId("");
    setSubjectOptions([]);
    const cid = Number(f.collegeId || 0);
    const ay = Number(f.academicYearId || 0);
    const cr = Number(f.courseId || 0);
    const g = Number(f.courseGroupId || 0);
    const y = Number(f.courseYearId || 0);
    if (!cid || !ay || !cr || !g || !y) return;

    let cancelled = false;
    setLoadingSubjects(true);
    void fetchAttendanceSubjectFilterRows({
      collegeId: cid,
      courseId: cr,
      courseGroupId: g,
      courseYearId: y,
      groupSectionId: Number(f.sectionId || 0),
      academicYearId: ay,
    })
      .then((rows) => {
        if (cancelled) return;
        const seen = new Set<number>();
        const opts: SelectOption[] = [];
        for (const row of rows) {
          const id = pickNum(row, ["fk_subject_id", "subjectId"]);
          if (!id || seen.has(id)) continue;
          seen.add(id);
          const code = pickText(row, ["subject_code", "subjectCode"]);
          const name = pickText(row, ["subject_name", "subjectName"]);
          // Angular: "Subject Name (SUBJECTCODE)"
          const label =
            name && code ? `${name} (${code})` : name || code || String(id);
          opts.push({ value: String(id), label });
        }
        setSubjectOptions(opts);
      })
      .catch((err) => {
        if (!cancelled) toastError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingSubjects(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    f.collegeId,
    f.academicYearId,
    f.courseId,
    f.courseGroupId,
    f.courseYearId,
    f.sectionId,
  ]);

  const onFromChange = (d: Date | null) => {
    setFromDate(d);
    clearResults();
    if (d && toDate && toDate.getTime() < d.getTime()) {
      setToDate(d);
    }
  };

  const onToChange = (d: Date | null) => {
    if (d && fromDate && d.getTime() < fromDate.getTime()) {
      setToDate(fromDate);
    } else {
      setToDate(d);
    }
    clearResults();
  };

  const columnDefs = useMemo<ColDef<AnyRow>[]>(() => {
    const dateCols: ColDef<AnyRow>[] = dateKeys.map((date) => {
      const field = dateFieldKey(date);
      return {
        field,
        headerName: formatDateHeader(date),
        minWidth: 100,
        flex: 0,
        cellStyle: { textAlign: "center" },
        valueGetter: (p) => {
          const v = p.data?.[field];
          return v == null || v === "" ? "-" : String(v);
        },
      };
    });

    return [
      {
        headerName: "S.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        field: "Academic_details",
        headerName: "Academic Details",
        minWidth: 200,
      },
      {
        field: "rollNumber",
        headerName: "Roll No.",
        minWidth: 110,
      },
      {
        field: "studentDisplay",
        headerName: "Student",
        minWidth: 180,
        cellRenderer: studentCellRenderer,
      },
      ...dateCols,
      {
        field: "totalDisplay",
        headerName: "Total",
        minWidth: 90,
        flex: 0,
        cellStyle: { textAlign: "center" },
      },
      {
        field: "percentage",
        headerName: "Percentage(%)",
        minWidth: 120,
        flex: 0,
        cellStyle: { textAlign: "center" },
      },
    ];
  }, [dateKeys]);

  const excelColumns = useMemo(() => {
    const cols: { key: string; header: string }[] = [
      { key: "siNo", header: "S.No" },
      { key: "Academic_details", header: "Academic Details" },
      { key: "rollNumber", header: "Roll No." },
      { key: "studentDisplay", header: "Student" },
    ];
    for (const date of dateKeys) {
      cols.push({
        key: dateFieldKey(date),
        header: formatDateHeader(date),
      });
    }
    cols.push(
      { key: "totalDisplay", header: "Total" },
      { key: "percentage", header: "Percentage(%)" },
    );
    return cols;
  }, [dateKeys]);

  const exportFlatRows = useMemo(
    () =>
      gridRows.map((row, i) => {
        const flat: Record<string, unknown> = {
          siNo: i + 1,
          Academic_details: String(row.Academic_details ?? ""),
          rollNumber: String(row.rollNumber ?? ""),
          studentDisplay: String(row.studentDisplay ?? ""),
          totalDisplay: String(row.totalDisplay ?? ""),
          percentage: String(row.percentage ?? ""),
        };
        for (const date of dateKeys) {
          const field = dateFieldKey(date);
          flat[field] = String(row[field] ?? "-");
        }
        return flat;
      }),
    [dateKeys, gridRows],
  );

  const handleGetAttendance = async () => {
    const cid = Number(f.collegeId || 0);
    if (!cid) {
      toastInfo("College is required");
      return;
    }
    if (!f.academicYearId) {
      toastInfo("Academic Year is required");
      return;
    }
    if (!f.courseId || !f.courseGroupId || !f.courseYearId) {
      toastInfo("Course, Course Group and Course Year are required");
      return;
    }
    if (!subjectId) {
      toastInfo("Subject is required");
      return;
    }
    if (!fromDate || !toDate) {
      toastInfo("From Date and To Date are required");
      return;
    }
    const min = Number(minPer);
    const max = Number(maxPer);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
      toastError("Min % cannot be greater than Max %");
      return;
    }

    setLoadingList(true);
    clearResults();
    const subjectLabel =
      subjectOptions.find((o) => o.value === subjectId)?.label ?? "";
    const from = formatYmd(fromDate);
    const to = formatYmd(toDate);
    try {
      const [raw, college] = await Promise.all([
        fetchSubjectWiseAttendanceReport({
          collegeId: cid,
          courseYearId: Number(f.courseYearId),
          courseGroupId: Number(f.courseGroupId),
          academicYearId: Number(f.academicYearId),
          sectionId: Number(f.sectionId || 0),
          fromDate: from,
          toDate: to,
          subjectId: Number(subjectId),
          fromPercentage: min,
          toPercentage: max,
        }),
        getCollegeById(cid).catch(() => null),
      ]);
      setCollegeName(
        String(
          college?.collegeName ??
            f.collegeOptions.find((o) => o.value === f.collegeId)?.label ??
            "",
        ),
      );
      if (raw.length === 0) {
        toastInfo("No attendance records found.");
        setShowTable(false);
        return;
      }
      const pivoted = pivotSubjectWiseRows(raw);
      const details = f.buildDataDetails(
        [subjectLabel, from, to, pivoted.faculty, `${min}-${max}`].filter(
          Boolean,
        ),
      );
      setDataDetails(details);
      setDateKeys(pivoted.dateKeys);
      setGridRows(pivoted.gridRows);
      setShowTable(true);
    } catch (err) {
      toastError(getErrorMessage(err));
      setShowTable(false);
    } finally {
      setLoadingList(false);
    }
  };

  const handleExcelExport = useCallback(() => {
    if (exportFlatRows.length === 0) {
      toastError("No records to export.");
      return;
    }
    const headerHtml = `<div style="text-align:center;margin-bottom:12px;">
      <div style="font-size:14px;font-weight:bold;">${escapeHtml(REPORT_TITLE)}${dataDetails ? ` - ${escapeHtml(dataDetails)}` : ""}</div>
    </div>`;
    exportHtmlTableAsExcel(
      `${REPORT_TITLE}.xls`,
      buildHtmlTable(excelColumns, exportFlatRows),
      headerHtml,
    );
  }, [dataDetails, excelColumns, exportFlatRows]);

  const handlePrintReport = useCallback(() => {
    if (exportFlatRows.length === 0) {
      toastError("No records to print.");
      return;
    }
    const logoSrc = collegeLogo || DEFAULT_COLLEGE_LOGO;
    const headerHtml = buildBannerHtml({
      logoSrc,
      collegeName,
      dataDetails,
      reportTitle: REPORT_TITLE,
      orgCode,
    });
    printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${REPORT_TITLE}</title>
<style>
body{font-family:Arial,sans-serif;padding:16px;color:#111}
table{width:100%;border-collapse:collapse;font-size:10px}
th,td{border:1px solid #333;padding:3px 5px}
th{background:#e8f0fe;text-align:center}
</style></head><body>
${headerHtml}
${buildHtmlTable(excelColumns, exportFlatRows)}
</body></html>`);
  }, [
    collegeLogo,
    collegeName,
    dataDetails,
    excelColumns,
    exportFlatRows,
    orgCode,
  ]);

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  const pageTitle = showTable
    ? dataDetails
      ? `${REPORT_TITLE} - ${dataDetails}`
      : REPORT_TITLE
    : REPORT_TITLE;

  return (
    <FilteredListPage
      title={pageTitle}
      filters={
        <div className="space-y-3">
          {/* Row 1: College → Section */}
          <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Select
              label="College"
              required
              value={f.collegeId || null}
              onChange={f.onCollegeChange}
              options={f.collegeOptions}
              placeholder="College"
              isLoading={f.loadingFilters}
            />
            <Select
              label="Academic Year"
              required
              value={f.academicYearId || null}
              onChange={f.onAyChange}
              options={f.ayOptions}
              placeholder="Academic Year"
            />
            <Select
              label="Course"
              required
              value={f.courseId || null}
              onChange={f.onCourseChange}
              options={f.courseOptions}
              placeholder="Course"
              disabled={!f.collegeId}
            />
            <Select
              label="Course Group"
              required
              value={f.courseGroupId || null}
              onChange={f.onGroupChange}
              options={f.groupOptions}
              placeholder="Course Group"
              disabled={!f.courseId}
            />
            <Select
              label="Course Year"
              required
              value={f.courseYearId || null}
              onChange={f.onYearChange}
              options={f.yearOptions}
              placeholder="Course Year"
              disabled={!f.courseGroupId}
            />
            <Select
              label="Section"
              required
              value={f.sectionId || "0"}
              onChange={f.onSectionChange}
              options={f.sectionOptionsWithAll}
              placeholder="Section"
              disabled={!f.courseYearId}
            />
          </div>

          {/* Row 2: Subject (wide) + From/To dates */}
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-5">
            <div className="sm:col-span-3">
              <Select
                label="Subject"
                required
                searchable
                value={subjectId || null}
                onChange={(v) => {
                  setSubjectId(v ?? "");
                  clearResults();
                }}
                options={subjectOptions}
                placeholder="Subject"
                isLoading={loadingSubjects}
                disabled={!f.courseYearId}
              />
            </div>
            <div className="sm:col-span-1">
              <DatePicker
                label="From Date"
                value={fromDate}
                onChange={onFromChange}
                displayFormat="dd-MM-yyyy"
                clearable={false}
              />
            </div>
            <div className="sm:col-span-1">
              <DatePicker
                label="To Date"
                value={toDate}
                onChange={onToChange}
                displayFormat="dd-MM-yyyy"
                minDate={fromDate ?? undefined}
                clearable={false}
              />
            </div>
          </div>

          {/* Row 3: Min/Max % + actions */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-[5.5rem]">
              <Label className="mb-1.5 block text-[12px] font-medium">
                Min %
              </Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={minPer}
                onChange={(e) => {
                  setMinPer(Number(e.target.value));
                  clearResults();
                }}
                className="h-9"
              />
            </div>
            <div className="w-[5.5rem]">
              <Label className="mb-1.5 block text-[12px] font-medium">
                Max %
              </Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={maxPer}
                onChange={(e) => {
                  setMaxPer(Number(e.target.value));
                  clearResults();
                }}
                className="h-9"
              />
            </div>
            <div className="flex shrink-0 items-center gap-2 pb-0.5">
              <Button
                type="button"
                className="h-9 w-fit px-4"
                disabled={loadingList}
                onClick={() => void handleGetAttendance()}
              >
                {loadingList ? "Loading…" : "Get Attendance"}
              </Button>
              <Button
                type="button"
                className="h-9 min-w-20 !border-0 !bg-[#ffcf46] px-4 !text-black shadow-sm hover:!bg-[#e5b535]"
                onClick={goBack}
              >
                Back
              </Button>
            </div>
          </div>
        </div>
      }
      showTable={showTable}
      rowData={showTable ? gridRows : []}
      columnDefs={columnDefs}
      loading={loadingList}
      pagination
      resultsVisible={showTable}
      hideEmptyGrid
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportExcel: false,
        exportPdf: false,
      }}
      toolbarTrailing={
        showTable ? (
          <div className="flex items-center gap-2">
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
          </div>
        ) : undefined
      }
    />
  );
}
