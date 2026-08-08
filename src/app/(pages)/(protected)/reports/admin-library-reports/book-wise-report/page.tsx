"use client";

/**
 * Book Wise Count —
 * Angular `reports/admin-library-reports/book-wise-report` parity.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
import { FileSpreadsheet, Printer } from "lucide-react";
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
  getBookWiseCountReport,
  getCollegeById,
  listActiveLibraryDetails,
  listBookCategoriesByLibrary,
  listLibrariesByCollege,
} from "@/services";
import {
  attendancePrintShell as libraryPrintShell,
  resolveAttendancePrintLogo as resolveLibraryPrintLogo,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";
import type { AnyRow } from "../_lib/library-report-columns";

const REPORT_TITLE = "Book Wise Count";
const PRINT_REPORT_TITLE = "Book Wise Count";

type BookWiseRow = {
  titleName: string;
  count: string;
};

const COL_DEFS = {
  siNo: {
    headerName: "S.No.",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<BookWiseRow>,
  titleName: {
    field: "titleName",
    headerName: "Title",
    minWidth: 220,
  } as ColDef<BookWiseRow>,
  count: {
    field: "count",
    headerName: "Count",
    minWidth: 100,
  } as ColDef<BookWiseRow>,
};

const EXCEL_COLUMNS = [
  { key: "siNo", header: "S.No" },
  { key: "titleName", header: "Title" },
  { key: "count", header: "Count" },
];

function mapRow(row: AnyRow): BookWiseRow {
  return {
    titleName: String(row.titleName ?? row.Title_Name ?? row.Title ?? ""),
    count: String(row.count ?? row.Count ?? ""),
  };
}

export default function BookWiseReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const collegeId = Number(globalThis?.localStorage?.getItem("collegeId") ?? 0);

  const [libraryId, setLibraryId] = useState<string | null>(null);
  const [bookcatId, setBookcatId] = useState<string | null>(null);
  const [rows, setRows] = useState<BookWiseRow[]>([]);
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

  const columnDefs = useMemo<ColDef<BookWiseRow>[]>(
    () => [COL_DEFS.siNo, COL_DEFS.titleName, COL_DEFS.count],
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
    let name = String(selectedLib?.collegeCode ?? "College");
    try {
      if (cid > 0) {
        const full = await getCollegeById(cid);
        if (full?.collegeName) name = String(full.collegeName);
      }
    } catch {
      /* keep fallback */
    }

    setLoadingList(true);
    clearResults();
    setDataDetails(details);
    setCollegeName(name);
    try {
      const raw = await getBookWiseCountReport(bid);
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
      "Book Wise Count.xls",
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
    <FilteredListPage<BookWiseRow>
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
