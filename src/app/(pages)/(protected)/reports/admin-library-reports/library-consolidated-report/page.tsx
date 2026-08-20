"use client";

/**
 * Library Books / Consolidated Report —
 * Angular `reports/admin-library-reports/library-consolidated-report` parity.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CellStyle, ColDef, ICellRendererParams } from "ag-grid-community";
import { FileSpreadsheet, Printer } from "lucide-react";
import { Select } from "@/common/components/select";
import { escapeHtml, exportHtmlTableAsExcel } from "@/common/export-html-table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { printHtmlInIframe } from "@/lib/print";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastInfo } from "@/lib/toast";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import {
  getCollegeById,
  getLibraryConsolidatedReport,
  listActiveLibraryDetails,
  listLibrariesByCollege,
} from "@/services";
import {
  attendancePrintShell as libraryPrintShell,
  resolveAttendancePrintLogo as resolveLibraryPrintLogo,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";
import type { AnyRow } from "../_lib/library-report-columns";

const REPORT_TITLE = "Library Books Report";
const PRINT_REPORT_TITLE = "Library Books Report";

type ConsolRow = {
  __rowId: string;
  __isTotal?: boolean;
  libraryCode: string;
  category: string;
  totalTitleCount: number;
  totalBooks: number;
  inLibrary: number;
  issuedBooks: number;
  dueBooks: number;
  totalBooksCost: number;
};

function toNum(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Angular consolidated amount — Indian grouping; whole numbers without decimals. */
function formatIndianAmount(value: number): string {
  const neg = value < 0;
  const abs = Math.abs(value);
  const hasFraction = Math.round(abs * 100) % 100 !== 0;
  const [intPart, decPart] = abs.toFixed(2).split(".");
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  const grouped = rest
    ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}`
    : last3;
  const body = hasFraction ? `${grouped}.${decPart}` : grouped;
  return `${neg ? "-" : ""}${body}`;
}

function buildTotals(mapped: ConsolRow[]): ConsolRow {
  return {
    __rowId: "total",
    __isTotal: true,
    libraryCode: "",
    category: "",
    totalTitleCount: mapped.reduce((s, r) => s + r.totalTitleCount, 0),
    totalBooks: mapped.reduce((s, r) => s + r.totalBooks, 0),
    inLibrary: mapped.reduce((s, r) => s + r.inLibrary, 0),
    issuedBooks: mapped.reduce((s, r) => s + r.issuedBooks, 0),
    dueBooks: mapped.reduce((s, r) => s + r.dueBooks, 0),
    totalBooksCost: mapped.reduce((s, r) => s + r.totalBooksCost, 0),
  };
}

function mapRow(row: AnyRow, idx: number): ConsolRow {
  return {
    __rowId: `r-${idx}`,
    libraryCode: String(row.library_code ?? row.libraryCode ?? ""),
    category: String(row.Category ?? row.category ?? ""),
    totalTitleCount: toNum(row.Total_title_count ?? row.totalTitleCount),
    totalBooks: toNum(row.Total_Books ?? row.totalBooks),
    inLibrary: toNum(row.In_Library ?? row.inLibrary),
    issuedBooks: toNum(row.Issued_Books ?? row.issuedBooks),
    dueBooks: toNum(row.Due_Books ?? row.dueBooks),
    totalBooksCost: toNum(row.Total_books_cost ?? row.totalBooksCost),
  };
}

function amountRenderer(p: ICellRendererParams<ConsolRow>) {
  const v = p.data?.totalBooksCost ?? 0;
  return <span>{formatIndianAmount(v)}</span>;
}

const COL_DEFS = {
  siNo: {
    headerName: "S.No",
    // Angular: colspan="3" text-align:right on S.No + Library + Book Department
    colSpan: (p: { data?: ConsolRow }) => (p.data?.__isTotal ? 3 : 1),
    valueGetter: (p: {
      data?: ConsolRow;
      node?: { rowIndex: number | null };
    }) => (p.data?.__isTotal ? "Total" : (p.node?.rowIndex ?? 0) + 1),
    width: 70,
    flex: 0,
    cellStyle: (p: { data?: ConsolRow }): CellStyle | undefined =>
      p.data?.__isTotal ? { textAlign: "right", fontWeight: 600 } : undefined,
  } as ColDef<ConsolRow>,
  libraryCode: {
    field: "libraryCode",
    headerName: "Library",
    minWidth: 110,
  } as ColDef<ConsolRow>,
  category: {
    field: "category",
    headerName: "Book Department",
    minWidth: 140,
  } as ColDef<ConsolRow>,
  totalTitleCount: {
    field: "totalTitleCount",
    headerName: "Titles Count",
    minWidth: 110,
  } as ColDef<ConsolRow>,
  totalBooks: {
    field: "totalBooks",
    headerName: "Total Books",
    minWidth: 110,
  } as ColDef<ConsolRow>,
  inLibrary: {
    field: "inLibrary",
    headerName: "In Library",
    minWidth: 100,
  } as ColDef<ConsolRow>,
  issuedBooks: {
    field: "issuedBooks",
    headerName: "Issued Books",
    minWidth: 110,
  } as ColDef<ConsolRow>,
  dueBooks: {
    field: "dueBooks",
    headerName: "Due Books",
    minWidth: 100,
  } as ColDef<ConsolRow>,
  totalBooksCost: {
    field: "totalBooksCost",
    headerName: "Total Books Amount",
    minWidth: 150,
    cellRenderer: amountRenderer,
  } as ColDef<ConsolRow>,
};

const EXCEL_COLUMNS = [
  { key: "siNo", header: "S.No" },
  { key: "libraryCode", header: "Library" },
  { key: "category", header: "Book Department" },
  { key: "totalTitleCount", header: "Titles Count" },
  { key: "totalBooks", header: "Total Books" },
  { key: "inLibrary", header: "In Library" },
  { key: "issuedBooks", header: "Issued Books" },
  { key: "dueBooks", header: "Due Books" },
  { key: "totalBooksCost", header: "Total Books Amount" },
];

export default function LibraryConsolidatedReportPage() {
  const collegeId = Number(globalThis?.localStorage?.getItem("collegeId") ?? 0);
  const autoLoadKey = useRef<string | null>(null);

  const [libraryId, setLibraryId] = useState<string | null>(null);
  const [rows, setRows] = useState<ConsolRow[]>([]);
  const [collegeName, setCollegeName] = useState("");
  const [dataDetails, setDataDetails] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const librariesQuery = useQuery({
    queryKey: QK.libraryReports.libraries(collegeId),
    queryFn: async () => {
      if (collegeId > 0) {
        const byCollege = await listLibrariesByCollege(collegeId);
        if (byCollege.length > 0) return byCollege;
      }
      return listActiveLibraryDetails();
    },
  });

  const selectedLib = useMemo(
    () =>
      (librariesQuery.data ?? []).find(
        (l) => String(l.libraryId) === String(libraryId),
      ),
    [librariesQuery.data, libraryId],
  );

  const libraryCollegeId = Number(selectedLib?.collegeId ?? collegeId);
  const collegeLogo = useCollegeLogo(
    libraryCollegeId > 0 ? libraryCollegeId : null,
  );

  const clearResults = useCallback(() => {
    setRows([]);
    setShowTable(false);
    setDataDetails("");
    setCollegeName("");
  }, []);

  const libraryOptions = useMemo(
    () => [
      { value: "0", label: "All" },
      ...(librariesQuery.data ?? []).map((lib) => ({
        value: String(lib.libraryId),
        label: String(lib.libraryCode ?? lib.libraryName ?? lib.libraryId),
      })),
    ],
    [librariesQuery.data],
  );

  useEffect(() => {
    if (libraryId || libraryOptions.length <= 1) return;
    // Angular defaults to first real library after options build.
    const firstReal = libraryOptions.find((o) => o.value !== "0");
    setLibraryId(firstReal?.value ?? "0");
  }, [libraryId, libraryOptions]);

  const loadReport = useCallback(
    async (lidStr: string) => {
      const lid = Number(lidStr);
      if (Number.isNaN(lid)) return;

      const libCode =
        lid === 0 ? "All" : String(selectedLib?.libraryCode ?? lidStr);
      const details = libCode;

      let name = "College";
      if (lid !== 0) {
        const cid = Number(selectedLib?.collegeId ?? collegeId);
        name = String(selectedLib?.collegeCode ?? "College");
        try {
          if (cid > 0) {
            const full = await getCollegeById(cid);
            if (full?.collegeName) name = String(full.collegeName);
          }
        } catch {
          /* keep fallback */
        }
      }

      setLoadingList(true);
      clearResults();
      setDataDetails(details);
      setCollegeName(name);
      try {
        const raw = await getLibraryConsolidatedReport(lid);
        if (raw.length === 0) {
          toastInfo("No records found.");
          return;
        }
        const mapped = raw.map(mapRow);
        setRows([...mapped, buildTotals(mapped)]);
        setShowTable(true);
      } catch (err) {
        toastError(getErrorMessage(err));
      } finally {
        setLoadingList(false);
      }
    },
    [clearResults, collegeId, selectedLib],
  );

  useEffect(() => {
    if (!libraryId) return;
    if (librariesQuery.isLoading) return;
    if (libraryId !== "0" && !selectedLib) return;
    const key = libraryId;
    if (autoLoadKey.current === key) return;
    autoLoadKey.current = key;
    void loadReport(key);
  }, [libraryId, librariesQuery.isLoading, loadReport, selectedLib]);

  const columnDefs = useMemo<ColDef<ConsolRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.libraryCode,
      COL_DEFS.category,
      COL_DEFS.totalTitleCount,
      COL_DEFS.totalBooks,
      COL_DEFS.inLibrary,
      COL_DEFS.issuedBooks,
      COL_DEFS.dueBooks,
      COL_DEFS.totalBooksCost,
    ],
    [],
  );

  const exportTableHtml = useMemo(() => {
    const head = EXCEL_COLUMNS.map(
      (c) => `<th>${escapeHtml(c.header)}</th>`,
    ).join("");
    const body = rows
      .map((row, i) => {
        if (row.__isTotal) {
          return `<tr style="background:#f2f2f2;font-weight:600;">
            <td colspan="3" style="text-align:right;">Total</td>
            <td>${row.totalTitleCount}</td>
            <td>${row.totalBooks}</td>
            <td>${row.inLibrary}</td>
            <td>${row.issuedBooks}</td>
            <td>${row.dueBooks}</td>
            <td>${escapeHtml(formatIndianAmount(row.totalBooksCost))}</td>
          </tr>`;
        }
        return `<tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(row.libraryCode)}</td>
          <td>${escapeHtml(row.category)}</td>
          <td>${row.totalTitleCount}</td>
          <td>${row.totalBooks}</td>
          <td>${row.inLibrary}</td>
          <td>${row.issuedBooks}</td>
          <td>${row.dueBooks}</td>
          <td>${escapeHtml(formatIndianAmount(row.totalBooksCost))}</td>
        </tr>`;
      })
      .join("");
    return `<table border="1" cellspacing="0" cellpadding="4"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  }, [rows]);

  const handleExcelExport = () => {
    if (rows.length === 0) {
      toastInfo("No records to export.");
      return;
    }
    const headerHtml = `<div style="margin-bottom:12px;">
      <div style="font-size:18px;font-weight:600;">${escapeHtml(collegeName || "College")}</div>
      ${dataDetails ? `<div style="font-size:14px;font-weight:550;margin-top:4px;">${escapeHtml(dataDetails)}</div>` : ""}
      <div style="font-size:16px;font-weight:550;margin-top:4px;">${escapeHtml(PRINT_REPORT_TITLE)}</div>
    </div>`;
    exportHtmlTableAsExcel(
      "Library Books Report.xls",
      exportTableHtml,
      headerHtml,
    );
  };

  const printReport = async () => {
    if (rows.length === 0) {
      toastInfo("No records to print.");
      return;
    }
    const logoSrc = await resolveLibraryPrintLogo(
      null,
      libraryCollegeId > 0 ? libraryCollegeId : collegeId,
      collegeLogo || DEFAULT_COLLEGE_LOGO,
    );
    const fallbackLogo = toPrintLogoUrl(DEFAULT_COLLEGE_LOGO);
    printHtmlInIframe(
      libraryPrintShell({
        title: escapeHtml(PRINT_REPORT_TITLE),
        logoSrc: escapeHtml(logoSrc),
        fallbackLogo: escapeHtml(fallbackLogo),
        collegeName: escapeHtml(collegeName || "College"),
        dataDetails: dataDetails ? escapeHtml(dataDetails) : undefined,
        tableHtml: exportTableHtml,
      }),
    );
  };

  return (
    <FilteredListPage<ConsolRow>
      title={REPORT_TITLE}
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[10rem] flex-1 basis-[10rem] sm:max-w-[16rem]">
            <Select
              label="Library"
              required
              value={libraryId}
              onChange={(v) => {
                setLibraryId(v);
                autoLoadKey.current = null;
                clearResults();
              }}
              options={libraryOptions}
              placeholder="Library"
              isLoading={librariesQuery.isLoading}
            />
          </div>
        </div>
      }
      rowData={showTable ? rows : []}
      paginationPageSize={10}
      fitColumnsToWidth
      columnDefs={columnDefs}
      getRowStyle={(p) =>
        p.data?.__isTotal
          ? { background: "#f2f2f2", fontWeight: 600 }
          : undefined
      }
      loading={loadingList}
      resultsVisible={showTable}
      hideEmptyGrid
      pagination={true}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportExcel: false,
        exportPdf: false,
        columnPicker: true,
      }}
      toolbarTrailing={
        showTable ? (
          <>
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-[5px] px-3 text-[12px]"
              onClick={handleExcelExport}
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-[5px] px-3 text-[12px]"
              onClick={() => void printReport()}
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
