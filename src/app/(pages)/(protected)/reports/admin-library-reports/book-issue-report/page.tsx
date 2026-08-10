"use client";

/**
 * Day Wise Book Issues —
 * Angular `reports/admin-library-reports/book-issue-report` parity.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
import { format } from "date-fns";
import { Printer } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
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
import { toastError, toastInfo } from "@/lib/toast";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import {
  getCollegeById,
  getDayWiseBookIssueReport,
  listActiveLibraryDetails,
  listBookCategoriesByLibrary,
  listLibrariesByCollege,
} from "@/services";
import {
  attendancePrintShell as libraryPrintShell,
  resolveAttendancePrintLogo as resolveLibraryPrintLogo,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";
import {
  buildDynamicColDefs,
  buildDynamicExcelColumns,
  buildDynamicExcelRows,
  type AnyRow,
} from "../_lib/library-report-columns";

const PRINT_REPORT_TITLE = "Book Issue Report";

export default function BookIssueReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const collegeId = Number(
    globalThis?.localStorage?.getItem("collegeId") ?? 0,
  );

  const [libraryId, setLibraryId] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string>("0");
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [collegeName, setCollegeName] = useState("");
  const [dataDetails, setDataDetails] = useState("");
  const [dateLabel, setDateLabel] = useState("");
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

  useEffect(() => {
    const today = new Date();
    setFromDate((p) => p ?? today);
    setToDate((p) => p ?? today);
  }, []);

  const clearResults = useCallback(() => {
    setRows([]);
    setShowTable(false);
    setDataDetails("");
    setDateLabel("");
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
    setDepartmentId("0");
  }, [libraryId, libraryOptions]);

  const categoriesQuery = useQuery({
    queryKey: QK.libraryReports.bookCategories(Number(libraryId ?? 0)),
    queryFn: () => listBookCategoriesByLibrary(Number(libraryId)),
    enabled: Number(libraryId ?? 0) > 0,
  });

  const departmentOptions = useMemo(
    () => [
      { value: "0", label: "All" },
      ...(categoriesQuery.data ?? []).map((c) => ({
        value: String(c.bookcatId),
        label: String(c.bookCategoryCode ?? c.bookCategoryName ?? c.bookcatId),
      })),
    ],
    [categoriesQuery.data],
  );

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => buildDynamicColDefs(rows),
    [rows],
  );
  const excelColumns = useMemo(() => buildDynamicExcelColumns(rows), [rows]);
  const exportRows = useMemo(() => buildDynamicExcelRows(rows), [rows]);

  const handleGetList = async () => {
    const lid = Number(libraryId ?? 0);
    if (!lid) {
      toastInfo("Library is required");
      return;
    }
    if (!fromDate || !toDate) {
      toastInfo("From Date and To Date are required");
      return;
    }

    const code = String(selectedLib?.collegeCode ?? "");
    const cid = Number(selectedLib?.collegeId ?? collegeId);
    let name = code || "College";
    try {
      if (cid > 0) {
        const full = await getCollegeById(cid);
        if (full?.collegeName) name = String(full.collegeName);
      }
    } catch {
      /* keep fallback */
    }

    const f = format(fromDate, "yyyy-MM-dd");
    const t = format(toDate, "yyyy-MM-dd");

    setLoadingList(true);
    clearResults();
    setDataDetails(code);
    setDateLabel(`(${f})  -  (${t})`);
    setCollegeName(name);
    try {
      const raw = await getDayWiseBookIssueReport({
        fromDate: f,
        toDate: t,
        libraryId: lid,
        bookcatId: Number(departmentId || 0),
      });
      if (raw.length === 0) {
        toastInfo("No records found.");
        return;
      }
      setRows(raw);
      setShowTable(true);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setLoadingList(false);
    }
  };

  const subtitle = [dataDetails, dateLabel].filter(Boolean).join(" - ");

  const handleExcelExport = () => {
    if (exportRows.length === 0) {
      toastInfo("No records to export.");
      return;
    }
    const headerHtml = `<div style="margin-bottom:12px;">
      <div style="font-size:18px;font-weight:600;">${escapeHtml(collegeName || "College")}</div>
      ${subtitle ? `<div style="font-size:14px;font-weight:550;margin-top:4px;">${escapeHtml(subtitle)}</div>` : ""}
      <div style="font-size:16px;font-weight:550;margin-top:4px;">${escapeHtml(PRINT_REPORT_TITLE)}</div>
    </div>`;
    exportHtmlTableAsExcel(
      "Book Issue Report.xls",
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
        dataDetails: subtitle ? escapeHtml(subtitle) : undefined,
        tableHtml: buildHtmlTable(excelColumns, exportRows),
      }),
    );
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  return (
    <FilteredListPage<AnyRow>
      title={PRINT_REPORT_TITLE}
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-4 lg:min-w-[720px]">
            <Select
              label="Library"
              required
              value={libraryId}
              onChange={(v) => {
                setLibraryId(v);
                setDepartmentId("0");
                clearResults();
              }}
              options={libraryOptions}
              placeholder="Library"
              isLoading={librariesQuery.isLoading}
            />
            <Select
              label="Department"
              required
              value={departmentId}
              onChange={(v) => {
                setDepartmentId(v ?? "0");
                clearResults();
              }}
              options={departmentOptions}
              placeholder="Department"
              disabled={!libraryId}
              isLoading={categoriesQuery.isLoading}
            />
            <DatePicker
              label="From Date"
              value={fromDate}
              onChange={(d) => {
                setFromDate(d);
                if (d && toDate && toDate < d) setToDate(d);
                clearResults();
              }}
              displayFormat="dd/MM/yyyy"
              clearable={false}
              placeholder="From Date"
              maxDate={toDate ?? undefined}
            />
            <DatePicker
              label="To Date"
              value={toDate}
              onChange={(d) => {
                setToDate(d);
                clearResults();
              }}
              displayFormat="dd/MM/yyyy"
              clearable={false}
              placeholder="To Date"
              minDate={fromDate ?? undefined}
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
        exportExcel: true,
        exportPdf: false,
      }}
      onExportExcel={handleExcelExport}
      toolbarTrailing={
        showTable ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 px-3 text-[12px]"
            onClick={() => void printReport()}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Report
          </Button>
        ) : null
      }
    />
  );
}
