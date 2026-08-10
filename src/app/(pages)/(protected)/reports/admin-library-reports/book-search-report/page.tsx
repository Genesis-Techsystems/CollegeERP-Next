"use client";

/**
 * Book Search Report —
 * Angular `reports/admin-library-reports/book-search-report` parity.
 */

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { FileSpreadsheet, Printer } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display";
import { Select } from "@/common/components/select";
import {
  buildHtmlTable,
  escapeHtml,
  exportHtmlTableAsExcel,
} from "@/common/export-html-table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { printHtmlInIframe } from "@/lib/print";
import { getErrorMessage } from "@/lib/errors";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo } from "@/lib/toast";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import { getBookDetailSearchReport, getCollegeById } from "@/services";
import {
  attendancePrintShell as libraryPrintShell,
  resolveAttendancePrintLogo as resolveLibraryPrintLogo,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";
import type { AnyRow } from "../_lib/library-report-columns";

const REPORT_TITLE = "Book Search Report";
const PRINT_REPORT_TITLE = "Book Search Report";

const SEARCH_TYPE_OPTIONS = [
  { value: "CATEGORY", label: "DEPARTMENT" },
  { value: "AUTHOR", label: "AUTHOR" },
  { value: "TITLE", label: "TITLE" },
  { value: "PUBLISHER", label: "PUBLISHER" },
  { value: "WORD", label: "WORD" },
  { value: "PERIODICAL", label: "PERIODICAL" },
  { value: "ACCESSIONNO", label: "ACCESSIONNO" },
];

type SearchRow = {
  accessionNo: string;
  title: string;
  author: string;
  publisher: string;
  libraryCode: string;
  statusLabel: string;
  statusAvailable: boolean | null;
};

function statusRenderer(p: ICellRendererParams<SearchRow>) {
  if (p.data?.statusAvailable == null) return null;
  return (
    <StatusBadge
      status={p.data.statusAvailable ? "active" : "inactive"}
      label={p.data.statusLabel}
    />
  );
}

function mapStandardRow(row: AnyRow): SearchRow {
  const copies = String(row.availableCopies ?? "");
  const available = copies !== "0";
  return {
    accessionNo: String(row.accessionno ?? row.accessionNo ?? ""),
    title: String(row.title ?? ""),
    author: String(row.authorShortName ?? row.author ?? ""),
    publisher: String(row.publisherShortName ?? row.publisher ?? ""),
    libraryCode: String(row.libraryCode ?? ""),
    statusLabel: available ? "Available" : "Not Available",
    statusAvailable: available,
  };
}

function mapPeriodicalRow(row: AnyRow): SearchRow {
  return {
    accessionNo: "",
    title: String(row.periodicalName ?? row.title ?? ""),
    author: "",
    publisher: String(row.publisher ?? ""),
    libraryCode: String(row.libraryCode ?? ""),
    statusLabel: "",
    statusAvailable: null,
  };
}

function mapAccessionRow(row: AnyRow): SearchRow {
  const status = String(row.availabilityStatus ?? "");
  const available = status === "1";
  return {
    accessionNo: String(row.accessionno ?? row.accessionNo ?? ""),
    title: String(row.bookTitle ?? row.title ?? ""),
    author: String(row.authors ?? row.author ?? ""),
    publisher: String(row.publishers ?? row.publisher ?? ""),
    libraryCode: String(row.libraryCode ?? ""),
    statusLabel: available ? "Available" : "Not Available",
    statusAvailable: available,
  };
}

export default function BookSearchReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const collegeId = Number(globalThis?.localStorage?.getItem("collegeId") ?? 0);
  const collegeLogo = useCollegeLogo(collegeId > 0 ? collegeId : null);

  const [searchText, setSearchText] = useState("");
  const [searchType, setSearchType] = useState<string | null>("TITLE");
  const [rows, setRows] = useState<SearchRow[]>([]);
  const [collegeName, setCollegeName] = useState("");
  const [dataDetails, setDataDetails] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [activeType, setActiveType] = useState("TITLE");

  const clearResults = useCallback(() => {
    setRows([]);
    setShowTable(false);
    setDataDetails("");
    setCollegeName("");
  }, []);

  const isPeriodical = activeType === "PERIODICAL";

  const columnDefs = useMemo<ColDef<SearchRow>[]>(() => {
    if (isPeriodical) {
      return [
        {
          headerName: "SI.No",
          valueGetter: rowIndexGetter,
          width: 70,
          flex: 0,
        },
        { field: "title", headerName: "Book Title", minWidth: 200 },
        { field: "publisher", headerName: "Publisher", minWidth: 160 },
      ];
    }
    return [
      {
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      { field: "accessionNo", headerName: "Accession No", minWidth: 120 },
      { field: "title", headerName: "Book Title", minWidth: 180 },
      { field: "author", headerName: "Author", minWidth: 130 },
      { field: "publisher", headerName: "Publisher", minWidth: 130 },
      { field: "libraryCode", headerName: "Library", minWidth: 110 },
      {
        field: "statusLabel",
        headerName: "Status",
        minWidth: 120,
        cellRenderer: statusRenderer,
      },
    ];
  }, [isPeriodical]);

  const excelColumns = useMemo(() => {
    if (isPeriodical) {
      return [
        { key: "siNo", header: "SI.No" },
        { key: "title", header: "Book Title" },
        { key: "publisher", header: "Publisher" },
      ];
    }
    return [
      { key: "siNo", header: "SI.No" },
      { key: "accessionNo", header: "Accession No" },
      { key: "title", header: "Book Title" },
      { key: "author", header: "Author" },
      { key: "publisher", header: "Publisher" },
      { key: "libraryCode", header: "Library" },
      { key: "statusLabel", header: "Status" },
    ];
  }, [isPeriodical]);

  const exportRows = useMemo(
    () =>
      rows.map((row, i) => ({
        siNo: i + 1,
        accessionNo: row.accessionNo,
        title: row.title,
        author: row.author,
        publisher: row.publisher,
        libraryCode: row.libraryCode,
        statusLabel: row.statusLabel,
      })),
    [rows],
  );

  const handleGetList = async () => {
    const q = searchText.trim();
    const filter = String(searchType ?? "");
    if (!q) {
      toastInfo("Search is required");
      return;
    }
    if (!filter) {
      toastInfo("Search Type is required");
      return;
    }

    let name = "College";
    try {
      if (collegeId > 0) {
        const full = await getCollegeById(collegeId);
        if (full?.collegeName) name = String(full.collegeName);
      }
    } catch {
      /* keep fallback */
    }

    const typeLabel =
      SEARCH_TYPE_OPTIONS.find((o) => o.value === filter)?.label ?? filter;
    const details = `${typeLabel} / ${q}`;

    setLoadingList(true);
    clearResults();
    setDataDetails(details);
    setCollegeName(name);
    setActiveType(filter);
    try {
      const raw = await getBookDetailSearchReport({ q, filter });
      if (raw.length === 0) {
        toastInfo("No records found.");
        return;
      }
      const mapped =
        filter === "PERIODICAL"
          ? raw.map(mapPeriodicalRow)
          : filter === "ACCESSIONNO"
            ? raw.map(mapAccessionRow)
            : raw.map(mapStandardRow);
      setRows(mapped);
      setShowTable(true);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setLoadingList(false);
    }
  };

  const handleExcelExport = () => {
    if (exportRows.length === 0) {
      toastInfo("No records to export.");
      return;
    }
    const headerHtml = `<div style="margin-bottom:12px;">
      <div style="font-size:18px;font-weight:600;">${escapeHtml(collegeName || "College")}</div>
      ${dataDetails ? `<div style="font-size:14px;font-weight:550;margin-top:4px;">${escapeHtml(dataDetails)}</div>` : ""}
      <div style="font-size:16px;font-weight:550;margin-top:4px;">${escapeHtml(PRINT_REPORT_TITLE)}</div>
    </div>`;
    exportHtmlTableAsExcel(
      "Book Search Report.xls",
      buildHtmlTable(excelColumns, exportRows),
      headerHtml,
    );
  };

  const printReport = async () => {
    if (exportRows.length === 0) {
      toastInfo("No records to print.");
      return;
    }
    const logoSrc = await resolveLibraryPrintLogo(
      null,
      collegeId,
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
        tableHtml: buildHtmlTable(excelColumns, exportRows),
      }),
    );
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  return (
    <FilteredListPage<SearchRow>
      title={
        showTable && dataDetails
          ? `${REPORT_TITLE} - ( ${dataDetails} )`
          : REPORT_TITLE
      }
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1 basis-[12rem] sm:max-w-[20rem]">
            <Label className="mb-1.5 block text-[12px] font-medium text-foreground">
              Search <span className="text-destructive">*</span>
            </Label>
            <Input
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                clearResults();
              }}
              placeholder={
                searchType === "WORD"
                  ? "Search With Title,Publisher,Author"
                  : "Search"
              }
              className="h-9"
            />
          </div>
          <div className="min-w-[10rem] flex-1 basis-[10rem] sm:max-w-[14rem]">
            <Select
              label="Search Type"
              required
              value={searchType}
              onChange={(v) => {
                setSearchType(v);
                clearResults();
              }}
              options={SEARCH_TYPE_OPTIONS}
              placeholder="Search Type"
            />
          </div>
          <Button
            type="button"
            className="h-9 w-fit px-4"
            disabled={loadingList}
            onClick={() => void handleGetList()}
          >
            {loadingList ? "Loading…" : "Get List"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-9 w-fit px-4"
            onClick={goBack}
          >
            Back
          </Button>
        </div>
      }
      rowData={showTable ? rows : []}
      columnDefs={columnDefs}
      loading={loadingList}
      resultsVisible={showTable}
      hideEmptyGrid
      pagination
      paginationPageSize={25}
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
              data-table-primary-action
              className="h-9 px-3 text-[12px]"
              onClick={handleExcelExport}
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button
              type="button"
              size="sm"
              data-table-primary-action
              className="h-9 px-3 text-[12px]"
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
