"use client";

/**
 * Periodical Reports —
 * Angular `reports/admin-library-reports/periodical-reports` parity.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { FileSpreadsheet, Printer } from "lucide-react";
import {
  buildHtmlTable,
  escapeHtml,
  exportHtmlTableAsExcel,
} from "@/common/export-html-table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { printHtmlInIframe } from "@/lib/print";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastInfo } from "@/lib/toast";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import { getCollegeById, getPeriodicalReports } from "@/services";
import {
  attendancePrintShell as libraryPrintShell,
  resolveAttendancePrintLogo as resolveLibraryPrintLogo,
  toPrintLogoUrl,
} from "@/app/(pages)/(protected)/reports/admin-attendance-reports/_lib/attendance-report-print";
import {
  type AnyRow,
  buildDynamicColDefs,
  buildDynamicExcelColumns,
  buildDynamicExcelRows,
} from "../_lib/library-report-columns";

const REPORT_TITLE = "Periodical Reports";
const PRINT_REPORT_TITLE = "Periodical Reports";

export default function PeriodicalReportsPage() {
  const collegeId = Number(globalThis?.localStorage?.getItem("collegeId") ?? 0);
  const collegeLogo = useCollegeLogo(collegeId > 0 ? collegeId : null);
  const loadedRef = useRef(false);

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [collegeName, setCollegeName] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    void (async () => {
      let name = "College";
      try {
        if (collegeId > 0) {
          const full = await getCollegeById(collegeId);
          if (full?.collegeName) name = String(full.collegeName);
        }
      } catch {
        /* keep fallback */
      }
      setCollegeName(name);
      setLoadingList(true);
      try {
        const raw = await getPeriodicalReports();
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
    })();
  }, [collegeId]);

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => buildDynamicColDefs(rows),
    [rows],
  );

  const excelColumns = useMemo(() => buildDynamicExcelColumns(rows), [rows]);

  const exportRows = useMemo(() => buildDynamicExcelRows(rows), [rows]);

  const handleExcelExport = () => {
    if (exportRows.length === 0) {
      toastInfo("No records to export.");
      return;
    }
    const headerHtml = `<div style="margin-bottom:12px;">
      <div style="font-size:18px;font-weight:600;">${escapeHtml(collegeName || "College")}</div>
      <div style="font-size:16px;font-weight:550;margin-top:4px;">${escapeHtml(PRINT_REPORT_TITLE)}</div>
    </div>`;
    exportHtmlTableAsExcel(
      "Periodical Reports.xls",
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
        tableHtml: buildHtmlTable(excelColumns, exportRows),
      }),
    );
  };

  return (
    <FilteredListPage<AnyRow>
      title={REPORT_TITLE}
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
