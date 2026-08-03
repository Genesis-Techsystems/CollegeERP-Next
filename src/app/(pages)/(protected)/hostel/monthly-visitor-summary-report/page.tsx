"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { ColDef } from "ag-grid-community";
import { format } from "date-fns";
import { FileSpreadsheet, Printer } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
import { Select, type SelectOption } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MINIO_URL } from "@/config/constants/api";
import { getErrorMessage } from "@/lib/errors";
import { printHtmlInIframe } from "@/lib/print";
import { toastError } from "@/lib/toast";
import { cn, rowIndexGetter } from "@/lib/utils";
import {
  getVisitorsSummaryReport,
  listActiveHostelsForVisitorReport,
  toHostelApiDate,
} from "@/services";

type ReportRow = Record<string, unknown>;
type ReportMode = "summary" | "detailed";

const TOOLBAR = {
  search: true,
  searchPlaceholder: "Search",
  columnPicker: false,
  exportPdf: false,
  exportExcel: false,
  columnFilters: false,
} as const;

const COL_DEFS = {
  siNo: {
    headerName: "S.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<ReportRow>,
  hostel: {
    field: "hostel_name",
    headerName: "Hostel",
    minWidth: 180,
  } as ColDef<ReportRow>,
  parentVisits: {
    field: "ParentVisits",
    headerName: "Parent Visitors",
    minWidth: 140,
  } as ColDef<ReportRow>,
  otherVisits: {
    field: "OthersVisits",
    headerName: "Other Visitors",
    minWidth: 140,
  } as ColDef<ReportRow>,
  studentName: {
    field: "student_name",
    headerName: "Student Name",
    minWidth: 140,
  } as ColDef<ReportRow>,
  visitorName: {
    field: "visitor_name",
    headerName: "Visitor Name",
    minWidth: 140,
  } as ColDef<ReportRow>,
  relation: {
    field: "relation",
    headerName: "Visitor Relation",
    minWidth: 140,
  } as ColDef<ReportRow>,
  visitedDate: {
    field: "Visited_Date",
    headerName: "Visited Date",
    minWidth: 120,
    valueFormatter: (params) => displayVisitedDate(params.value),
  } as ColDef<ReportRow>,
};

const EXCEL_HEADER_STYLE = {
  background: "#C3D9FF",
  fontWeight: "bold",
  textAlign: "left" as const,
  padding: "0 5px",
};

const EXCEL_CELL_STYLE = {
  fontWeight: 500,
  textAlign: "left" as const,
  padding: "8px",
};

function applicationDate(): Date {
  if (typeof window === "undefined") return new Date();
  const raw = String(localStorage.getItem("presentDate") ?? "").trim();
  const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return new Date();
  const date = new Date(
    Number(match[3]),
    Number(match[2]) - 1,
    Number(match[1]),
  );
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function displayVisitedDate(value: unknown): string {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "—" : format(date, "dd-MM-yyyy");
}

function reportLogoUrl(value: unknown): string {
  const path = String(value ?? "").trim();
  if (!path || /^https?:\/\//i.test(path)) return path;
  return `${MINIO_URL}${path.replace(/^\/+/, "")}`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Angular #print-Section / #excelTable HTML table body. */
function buildReportTableHtml(rows: ReportRow[], mode: ReportMode): string {
  const head =
    mode === "summary"
      ? `<tr>
          <th>S.No</th>
          <th>Hostel</th>
          <th>Parent Visitors</th>
          <th>Other Visitors</th>
        </tr>`
      : `<tr>
          <th>S.No</th>
          <th>Hostel</th>
          <th>Student Name</th>
          <th>Visitor Name</th>
          <th>Visitor Relation</th>
          <th>Visited Date</th>
        </tr>`;

  const body = rows
    .map((row, index) =>
      mode === "summary"
        ? `<tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(row.hostel_name)}</td>
            <td>${escapeHtml(row.ParentVisits)}</td>
            <td>${escapeHtml(row.OthersVisits)}</td>
          </tr>`
        : `<tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(row.hostel_name)}</td>
            <td>${escapeHtml(row.student_name)}</td>
            <td>${escapeHtml(row.visitor_name)}</td>
            <td>${escapeHtml(row.relation)}</td>
            <td>${escapeHtml(displayVisitedDate(row.Visited_Date))}</td>
          </tr>`,
    )
    .join("");

  return `<table class="mar">
    <thead>${head}</thead>
    <tbody>${body}</tbody>
  </table>`;
}

function ExcelExportTable({
  rows,
  mode,
  tableRef,
}: {
  rows: ReportRow[];
  mode: ReportMode;
  tableRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={tableRef} className="sr-only" aria-hidden>
      <div style={{ display: "none" }}>
        <h3 style={{ fontWeight: "bold" }}>Monthly Visitor Summary Report</h3>
      </div>
      <table
        className="w-full border-separate border-spacing-px text-sm"
        style={{ borderSpacing: "1px" }}
      >
        <thead>
          <tr>
            <th className="p-2 text-left" style={EXCEL_HEADER_STYLE}>
              S.No
            </th>
            <th className="p-2 text-left" style={EXCEL_HEADER_STYLE}>
              Hostel
            </th>
            {mode === "summary" ? (
              <>
                <th className="p-2 text-left" style={EXCEL_HEADER_STYLE}>
                  Parent Visitors
                </th>
                <th className="p-2 text-left" style={EXCEL_HEADER_STYLE}>
                  Other Visitors
                </th>
              </>
            ) : (
              <>
                <th className="p-2 text-left" style={EXCEL_HEADER_STYLE}>
                  Student Name
                </th>
                <th className="p-2 text-left" style={EXCEL_HEADER_STYLE}>
                  Visitor Name
                </th>
                <th className="p-2 text-left" style={EXCEL_HEADER_STYLE}>
                  Visitor Relation
                </th>
                <th className="p-2 text-left" style={EXCEL_HEADER_STYLE}>
                  Visited Date
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${String(row.hostel_name)}-${index}`}>
              <td className="p-2" style={EXCEL_CELL_STYLE}>
                {index + 1}
              </td>
              <td className="p-2" style={EXCEL_CELL_STYLE}>
                {String(row.hostel_name ?? "")}
              </td>
              {mode === "summary" ? (
                <>
                  <td className="p-2" style={EXCEL_CELL_STYLE}>
                    {String(row.ParentVisits ?? "")}
                  </td>
                  <td className="p-2" style={EXCEL_CELL_STYLE}>
                    {String(row.OthersVisits ?? "")}
                  </td>
                </>
              ) : (
                <>
                  <td className="p-2" style={EXCEL_CELL_STYLE}>
                    {String(row.student_name ?? "")}
                  </td>
                  <td className="p-2" style={EXCEL_CELL_STYLE}>
                    {String(row.visitor_name ?? "")}
                  </td>
                  <td className="p-2" style={EXCEL_CELL_STYLE}>
                    {String(row.relation ?? "")}
                  </td>
                  <td className="p-2" style={EXCEL_CELL_STYLE}>
                    {displayVisitedDate(row.Visited_Date)}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MonthlyVisitorSummaryReportPage() {
  const tableRef = useRef<HTMLDivElement>(null);
  const [hostelId, setHostelId] = useState<string | null>(null);
  const [hostels, setHostels] = useState<SelectOption[]>([]);
  const [loadingHostels, setLoadingHostels] = useState(true);
  const [fromDate, setFromDate] = useState<Date | null>(new Date());
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ReportMode>("summary");
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    const date = applicationDate();
    setFromDate(date);
    setToDate(date);
    setLoadingHostels(true);
    void listActiveHostelsForVisitorReport()
      .then((items) =>
        setHostels(
          items.map((hostel) => ({
            value: String(hostel.hostelId),
            label: String(hostel.hostelName ?? hostel.hostelId),
          })),
        ),
      )
      .catch((loadError) => toastError(loadError, "Failed to load hostels"))
      .finally(() => setLoadingHostels(false));
  }, []);

  const columnDefs = useMemo<ColDef<ReportRow>[]>(
    () =>
      mode === "summary"
        ? [
            COL_DEFS.siNo,
            COL_DEFS.hostel,
            COL_DEFS.parentVisits,
            COL_DEFS.otherVisits,
          ]
        : [
            COL_DEFS.siNo,
            COL_DEFS.hostel,
            COL_DEFS.studentName,
            COL_DEFS.visitorName,
            COL_DEFS.relation,
            COL_DEFS.visitedDate,
          ],
    [mode],
  );

  const getList = async () => {
    const hostelNum = Number(hostelId ?? 0);
    const from = toHostelApiDate(fromDate);
    const to = toHostelApiDate(toDate);
    if (!hostelNum || !from || !to) return;
    setLoading(true);
    setError(null);
    try {
      setRows(
        await getVisitorsSummaryReport({
          hostelId: hostelNum,
          fromDate: from,
          toDate: to,
        }),
      );
    } catch (loadError) {
      setRows([]);
      setError(getErrorMessage(loadError));
      toastError(loadError, "Failed to load visitor report");
    } finally {
      setLoading(false);
    }
  };

  /** Angular exportAsExcel() — HTML table → .xls via Excel XML + base64. */
  const exportExcel = () => {
    if (!tableRef.current) return;
    const uri = "data:application/vnd.ms-excel;base64,";
    const template = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>`;
    const base64 = (s: string) => window.btoa(unescape(encodeURIComponent(s)));
    const formatTpl = (s: string, c: Record<string, string>) =>
      s.replace(/{(\w+)}/g, (_, p: string) => c[p] ?? "");
    const link = document.createElement("a");
    link.download = "Monthly Visitors Summary  Report.xls";
    link.href =
      uri +
      base64(
        formatTpl(template, {
          worksheet: "Worksheet",
          table: tableRef.current.innerHTML,
        }),
      );
    link.click();
  };

  /** Angular PrintData() — iframe print avoids AppShell blank PDF. */
  const printReport = () => {
    if (rows.length === 0) return;
    const first = rows[0];
    const logo = reportLogoUrl(first?.logo_path);
    const collegeName = String(first?.college_name ?? "");
    const orgCode =
      typeof window !== "undefined"
        ? window.localStorage.getItem("orgCode")
        : null;

    const logoBlock =
      orgCode === "SUK"
        ? `<div style="display:flex;align-items:center;gap:16px;margin-bottom:12px">
            ${logo ? `<img src="${escapeHtml(logo)}" alt="" style="height:80px;object-fit:contain" />` : ""}
            <div>
              <p class="collegeName">${escapeHtml(collegeName)}</p>
              <p class="title-2">Monthly Visitor Summary Report</p>
            </div>
          </div>`
        : `<div style="text-align:center;margin-bottom:12px">
            ${logo ? `<img src="${escapeHtml(logo)}" alt="" style="max-width:100%;max-height:120px;object-fit:contain" />` : ""}
            <p class="collegeName">${escapeHtml(collegeName)}</p>
            <p class="title-2">Monthly Visitor Summary Report</p>
          </div>`;

    printHtmlInIframe(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Monthly Visitor Summary Report</title>
<style>
  body{font-family:Arial,sans-serif;color:#111;padding:16px;margin:0;background:#fff}
  .collegeName{text-align:center;font-size:22px;font-weight:600;text-transform:uppercase;margin:8px 0}
  .title-2{text-align:center;font-size:18px;font-weight:500;margin:6px 0 14px}
  table.mar{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
  table.mar th,table.mar td{border:1px solid #777;padding:8px;text-align:left}
  table.mar th{background:#C3D9FF;font-weight:600}
  @page{margin:10mm}
  @media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}
</style>
</head>
<body>
  ${logoBlock}
  ${buildReportTableHtml(rows, mode)}
</body>
</html>`);
  };

  const hasRows = rows.length > 0;

  return (
    <FilteredListPage
      className="monthly-visitor-summary-report"
      title="Monthly Visitor Summary Report"
      notice={
        error ? <p className="px-1 text-sm text-destructive">{error}</p> : null
      }
      filters={
        <GlobalFilterBarRow>
          <GlobalFilterField label="Hostel *">
            <Select
              value={hostelId}
              onChange={(value) => {
                setHostelId(value);
                setRows([]);
              }}
              options={hostels}
              isLoading={loadingHostels}
              searchable={false}
              clearable={false}
              placeholder="Select hostel"
            />
          </GlobalFilterField>
          <GlobalFilterField label="From Date">
            <DatePicker
              value={fromDate}
              onChange={(date) => {
                setFromDate(date);
                if (date && toDate && date.getTime() > toDate.getTime()) {
                  setToDate(date);
                }
              }}
              maxDate={today}
              clearable={false}
            />
          </GlobalFilterField>
          <GlobalFilterField label="To Date">
            <DatePicker
              value={toDate}
              onChange={(date) => {
                setToDate(date);
                setRows([]);
              }}
              minDate={fromDate ?? undefined}
              maxDate={today}
              clearable={false}
            />
          </GlobalFilterField>
          <GlobalFilterField label={"\u00a0"}>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                className="h-9"
                onClick={() => void getList()}
              >
                {loading ? "Loading…" : "Get List"}
              </Button>
            </div>
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      rowData={hasRows ? rows : []}
      columnDefs={hasRows ? columnDefs : []}
      loading={loading}
      pagination
      height="auto"
      toolbar={hasRows ? TOOLBAR : false}
      toolbarTrailing={
        hasRows ? (
          <div className="flex flex-wrap items-center gap-4">
            <RadioGroup
              value={mode}
              onValueChange={(value) => setMode(value as ReportMode)}
              className="flex flex-wrap items-center gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem
                  value="summary"
                  id="visitor-summary-report"
                  className="h-4 w-4 shrink-0 border-muted-foreground/60 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
                <Label
                  htmlFor="visitor-summary-report"
                  className={cn(
                    "cursor-pointer text-[12px]",
                    mode === "summary"
                      ? "font-semibold text-foreground"
                      : "font-normal text-muted-foreground",
                  )}
                >
                  Summary Report
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem
                  value="detailed"
                  id="visitor-detailed-report"
                  className="h-4 w-4 shrink-0 border-muted-foreground/60 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                />
                <Label
                  htmlFor="visitor-detailed-report"
                  className={cn(
                    "cursor-pointer text-[12px]",
                    mode === "detailed"
                      ? "font-semibold text-foreground"
                      : "font-normal text-muted-foreground",
                  )}
                >
                  Detailed Report
                </Label>
              </div>
            </RadioGroup>
            <Button type="button" size="sm" onClick={exportExcel}>
              <FileSpreadsheet className="mr-1.5 h-4 w-4" />
              Export Excel
            </Button>
            <Button type="button" size="sm" onClick={printReport}>
              <Printer className="mr-1.5 h-4 w-4" />
              Print Report
            </Button>
          </div>
        ) : null
      }
      getRowId={(params) =>
        `${String(params.data?.hostel_name ?? "")}-${String(params.data?.visitor_name ?? params.data?.student_name ?? "")}-${String(params.data?.Visited_Date ?? "")}`
      }
    >
      {hasRows ? (
        <ExcelExportTable rows={rows} mode={mode} tableRef={tableRef} />
      ) : null}
    </FilteredListPage>
  );
}
