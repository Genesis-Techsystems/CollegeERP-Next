"use client";

/**
 * Total Books Reports —
 * Angular `reports/admin-library-reports/total-books-report` parity.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
import { FileSpreadsheet, Printer } from "lucide-react";
import { formatDate } from "@/common/generic-functions";
import { Select } from "@/common/components/select";
import {
  buildHtmlTable,
  escapeHtml,
  exportHtmlTableAsExcel,
} from "@/common/export-html-table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { printHtmlInIframe } from "@/lib/print";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo } from "@/lib/toast";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import {
  getTotalBooksReport,
  listActiveCollegesForLibraryReports,
  listActiveLibraryDetails,
  listBookCategoriesByLibrary,
} from "@/services";
import {
  attendancePrintShell as libraryPrintShell,
  resolveAttendancePrintLogo as resolveLibraryPrintLogo,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";
import type { AnyRow } from "../_lib/library-report-columns";

const REPORT_TITLE = "Total Books Reports";
const PRINT_REPORT_TITLE = "Total Books Reports";

type TotalBookRow = {
  titleName: string;
  accessionNo: string;
  author: string;
  publisher: string;
  department: string;
  edition: string;
  year: string;
  purchaseReceiptNo: string;
  dateOfPurchase: string;
  bookAmount: string;
};

const COL_DEFS = {
  siNo: {
    headerName: "S.No.",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<TotalBookRow>,
  titleName: {
    field: "titleName",
    headerName: "Title",
    minWidth: 180,
  } as ColDef<TotalBookRow>,
  accessionNo: {
    field: "accessionNo",
    headerName: "Accession No.",
    minWidth: 120,
  } as ColDef<TotalBookRow>,
  author: {
    field: "author",
    headerName: "Author",
    minWidth: 130,
  } as ColDef<TotalBookRow>,
  publisher: {
    field: "publisher",
    headerName: "Publisher",
    minWidth: 130,
  } as ColDef<TotalBookRow>,
  department: {
    field: "department",
    headerName: "Department",
    minWidth: 120,
  } as ColDef<TotalBookRow>,
  edition: {
    field: "edition",
    headerName: "Edition",
    minWidth: 90,
  } as ColDef<TotalBookRow>,
  year: {
    field: "year",
    headerName: "Year",
    minWidth: 80,
  } as ColDef<TotalBookRow>,
  purchaseReceiptNo: {
    field: "purchaseReceiptNo",
    headerName: "Bill No",
    minWidth: 110,
  } as ColDef<TotalBookRow>,
  dateOfPurchase: {
    field: "dateOfPurchase",
    headerName: "Bill Date",
    minWidth: 110,
  } as ColDef<TotalBookRow>,
  bookAmount: {
    field: "bookAmount",
    headerName: "Price",
    minWidth: 90,
  } as ColDef<TotalBookRow>,
};

const EXCEL_COLUMNS = [
  { key: "siNo", header: "S.No" },
  { key: "titleName", header: "Title" },
  { key: "accessionNo", header: "Accession No." },
  { key: "author", header: "Author" },
  { key: "publisher", header: "Publisher" },
  { key: "department", header: "Department" },
  { key: "edition", header: "Edition" },
  { key: "year", header: "Year" },
  { key: "purchaseReceiptNo", header: "Bill No" },
  { key: "dateOfPurchase", header: "Bill Date" },
  { key: "bookAmount", header: "Price" },
];

function mapRow(row: AnyRow): TotalBookRow {
  const rawDate = row.dateOfPurchase ?? row.DateOfPurchase ?? row.billDate;
  const dateStr =
    rawDate == null || String(rawDate).trim() === ""
      ? ""
      : formatDate(String(rawDate)) || String(rawDate);
  return {
    titleName: String(row.titleName ?? row.Title_Name ?? row.Title ?? ""),
    accessionNo: String(
      row.accessionNo ?? row.accessionno ?? row.Accession_No ?? "",
    ),
    author: String(row.author ?? row.Author ?? ""),
    publisher: String(row.publisher ?? row.Publisher ?? ""),
    department: String(row.department ?? row.Department ?? ""),
    edition: String(row.edition ?? row.Edition ?? ""),
    year: String(row.year ?? row.Year ?? ""),
    purchaseReceiptNo: String(
      row.purchaseReceiptNo ?? row.PurchaseReceiptNo ?? row.billNo ?? "",
    ),
    dateOfPurchase: dateStr,
    bookAmount: String(row.bookAmount ?? row.BookAmount ?? row.price ?? ""),
  };
}

export default function TotalBooksReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const collegeId = Number(globalThis?.localStorage?.getItem("collegeId") ?? 0);

  const [libraryId, setLibraryId] = useState<string | null>(null);
  const [bookcatId, setBookcatId] = useState<string | null>(null);
  const [rows, setRows] = useState<TotalBookRow[]>([]);
  const [collegeName, setCollegeName] = useState("");
  const [dataDetails, setDataDetails] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);

  // Angular lists every active library, not just the logged-in college's.
  const librariesQuery = useQuery({
    queryKey: QK.libraryReports.activeLibraries(),
    queryFn: listActiveLibraryDetails,
  });

  const collegesQuery = useQuery({
    queryKey: QK.libraryReports.colleges(),
    queryFn: listActiveCollegesForLibraryReports,
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
    () =>
      (librariesQuery.data ?? []).map((lib) => ({
        value: String(lib.libraryId),
        label: String(lib.libraryCode ?? lib.libraryName ?? lib.libraryId),
      })),
    [librariesQuery.data],
  );

  useEffect(() => {
    if (libraryId || libraryOptions.length === 0) return;
    setLibraryId(libraryOptions[0]!.value);
  }, [libraryId, libraryOptions]);

  const categoriesQuery = useQuery({
    queryKey: QK.libraryReports.bookCategories(Number(libraryId ?? 0)),
    queryFn: () => listBookCategoriesByLibrary(Number(libraryId)),
    enabled: Number(libraryId ?? 0) > 0,
  });

  const categoryOptions = useMemo(
    () =>
      (categoriesQuery.data ?? []).map((c) => ({
        value: String(c.bookcatId),
        label: String(c.bookCategoryCode ?? c.bookCategoryName ?? c.bookcatId),
      })),
    [categoriesQuery.data],
  );

  useEffect(() => {
    if (categoryOptions.length === 0) {
      setBookcatId(null);
      return;
    }
    const stillValid = categoryOptions.some((o) => o.value === bookcatId);
    if (!stillValid) setBookcatId(categoryOptions[0]!.value);
  }, [categoryOptions, bookcatId]);

  const columnDefs = useMemo<ColDef<TotalBookRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.titleName,
      COL_DEFS.accessionNo,
      COL_DEFS.author,
      COL_DEFS.publisher,
      COL_DEFS.department,
      COL_DEFS.edition,
      COL_DEFS.year,
      COL_DEFS.purchaseReceiptNo,
      COL_DEFS.dateOfPurchase,
      COL_DEFS.bookAmount,
    ],
    [],
  );

  const exportRows = useMemo(
    () => rows.map((row, i) => ({ siNo: i + 1, ...row })),
    [rows],
  );

  const handleGetList = async () => {
    const lid = Number(libraryId ?? 0);
    const bid = Number(bookcatId ?? 0);
    if (!lid) {
      toastInfo("Library is required");
      return;
    }
    if (!bid) {
      toastInfo("Book Department is required");
      return;
    }

    const libCode = String(selectedLib?.libraryCode ?? "");
    const cat = (categoriesQuery.data ?? []).find(
      (c) => String(c.bookcatId) === String(bid),
    );
    const catCode = String(cat?.bookCategoryCode ?? "");
    const details = [libCode, catCode].filter(Boolean).join(" / ");

    const cid = Number(selectedLib?.collegeId ?? collegeId);
    const college = (collegesQuery.data ?? []).find(
      (c) => Number(c.collegeId ?? 0) === cid,
    );
    const name = String(
      college?.collegeName ?? selectedLib?.collegeCode ?? "College",
    );

    setLoadingList(true);
    clearResults();
    setDataDetails(details);
    setCollegeName(name);
    try {
      const raw = await getTotalBooksReport(bid);
      if (raw.length === 0) {
        toastInfo("No records found.");
        return;
      }
      setRows(raw.map(mapRow));
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
      "Total Books Reports.xls",
      buildHtmlTable(EXCEL_COLUMNS, exportRows),
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
      libraryCollegeId,
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
        tableHtml: buildHtmlTable(EXCEL_COLUMNS, exportRows),
      }),
    );
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  return (
    <FilteredListPage<TotalBookRow>
      title={
        showTable && dataDetails
          ? `${REPORT_TITLE} - ( ${dataDetails} )`
          : REPORT_TITLE
      }
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-2 lg:min-w-[420px]">
            <Select
              label="Library"
              required
              value={libraryId}
              onChange={(v) => {
                setLibraryId(v);
                setBookcatId(null);
                clearResults();
              }}
              options={libraryOptions}
              placeholder="Library"
              isLoading={librariesQuery.isLoading}
            />
            <Select
              label="Book Department"
              required
              value={bookcatId}
              onChange={(v) => {
                setBookcatId(v);
                clearResults();
              }}
              options={categoryOptions}
              placeholder="Book Department"
              disabled={!libraryId}
              isLoading={categoriesQuery.isLoading}
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
