"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColDef, ValueFormatterParams } from "ag-grid-community";
import { PrinterIcon } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { SearchInput } from "@/common/components/search";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { printElementInIframe } from "@/lib/print";
import { rowIndexGetter } from "@/lib/utils";
import { toastInfo } from "@/lib/toast";
import { useApiQueryToasts } from "@/hooks";
import { useCollegeLogo, DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import {
  filterAcademicYears,
  filterColleges,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  fetchIncomeExpenseSummary,
  getFeeMasterCollegeFilters,
} from "@/services";
import type { IncomeExpenseSummaryRow } from "@/types/finance";

/** Angular screen/excel `currency:'INR'` — ₹ with 2 decimals; null income → "-". */
function inrCurrency(value: unknown): string {
  if (value == null || value === "") return "-";
  const n = Number(value);
  if (Number.isNaN(n)) return "-";
  return n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Angular print table: raw amount (or "-"); no currency pipe. */
function printAmount(value: unknown): string {
  if (value == null || value === "") return "-";
  return String(value);
}

function incomeFormatter(p: ValueFormatterParams<IncomeExpenseSummaryRow>) {
  if (p.data?.TotalIncome == null) return "-";
  return inrCurrency(p.data.TotalIncome);
}

function expenseFormatter(p: ValueFormatterParams<IncomeExpenseSummaryRow>) {
  return inrCurrency(p.data?.TotalExpense);
}

function exportHtmlTableAsExcel(root: HTMLElement, fileName: string) {
  const uri = "data:application/vnd.ms-excel;base64,";
  const template =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>';
  const base64 = (s: string) => window.btoa(unescape(encodeURIComponent(s)));
  const formatTpl = (s: string, c: Record<string, string>) =>
    s.replace(/{(\w+)}/g, (_, p: string) => c[p] ?? "");
  const ctx = { worksheet: "Worksheet", table: root.innerHTML };
  const link = document.createElement("a");
  link.download = `${fileName}.xls`;
  link.href = uri + base64(formatTpl(template, ctx));
  link.click();
}

const COL_DEFS = {
  siNo: {
    headerName: "S.No",
    valueGetter: rowIndexGetter,
    width: 80,
    flex: 0,
    cellClass: "text-left",
  } as ColDef<IncomeExpenseSummaryRow>,
  district: {
    field: "district_name",
    headerName: "District Name",
    minWidth: 140,
    flex: 1,
    cellClass: "text-left",
  } as ColDef<IncomeExpenseSummaryRow>,
  college: {
    field: "college_shortname",
    headerName: "College",
    minWidth: 120,
    flex: 1,
    cellClass: "text-left",
  } as ColDef<IncomeExpenseSummaryRow>,
  year: {
    field: "Year",
    headerName: "Year",
    minWidth: 90,
    flex: 0.6,
    cellClass: "text-left",
  } as ColDef<IncomeExpenseSummaryRow>,
  month: {
    field: "Month",
    headerName: "Month",
    minWidth: 110,
    flex: 0.8,
    cellClass: "text-left",
  } as ColDef<IncomeExpenseSummaryRow>,
  income: {
    field: "TotalIncome",
    headerName: "Total Income",
    minWidth: 140,
    flex: 1,
    cellClass: "text-left",
    valueFormatter: incomeFormatter,
  } as ColDef<IncomeExpenseSummaryRow>,
  expense: {
    field: "TotalExpense",
    headerName: "Total Expenses",
    minWidth: 140,
    flex: 1,
    cellClass: "text-left",
    valueFormatter: expenseFormatter,
  } as ColDef<IncomeExpenseSummaryRow>,
};

const TH: CSSProperties = {
  padding: "8px 5px",
  background: "#C3D9FF",
  fontWeight: 550,
  border: "1px solid #96aacb",
  textAlign: "left",
};

const TD: CSSProperties = {
  padding: "8px",
  textAlign: "left",
  fontWeight: 400,
  border: "1px solid #96aacb",
};

export default function IncomeExpenseReportPage() {
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );

  const [collegeId, setCollegeId] = useState<string | null>(null);
  /** Angular mat-option value = `academic_year` string (form control name academicYearId). */
  const [academicYear, setAcademicYear] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState<string | null>(null);
  const [dataDetails, setDataDetails] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [search, setSearch] = useState("");
  const excelRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const collegeNum = Number(collegeId ?? 0);
  const logoUrl = useCollegeLogo(collegeNum || null);

  const { data: filterBundle, isLoading: loadingFilters } = useQuery({
    queryKey: ["IncomeExpenseReport", "filters", orgId, employeeId],
    queryFn: () => getFeeMasterCollegeFilters(orgId, employeeId),
    enabled: orgId > 0 && employeeId > 0,
  });

  const filtersData = useMemo(
    () => (filterBundle?.filtersData ?? []) as FilterRow[],
    [filterBundle?.filtersData],
  );
  const academicData = useMemo(
    () => (filterBundle?.academicData ?? []) as FilterRow[],
    [filterBundle?.academicData],
  );

  const colleges = useMemo(() => filterColleges(filtersData), [filtersData]);

  const academicYears = useMemo(
    () => filterAcademicYears(academicData, collegeNum || null, filtersData),
    [academicData, collegeNum, filtersData],
  );

  useEffect(() => {
    if (!collegeId && colleges.length > 0) {
      setCollegeId(
        String(pickNum(colleges[0], ["fk_college_id", "collegeId"])),
      );
    }
  }, [colleges, collegeId]);

  useEffect(() => {
    if (!collegeNum) {
      setAcademicYear(null);
      return;
    }
    if (academicYears.length === 0) {
      setAcademicYear(null);
      return;
    }
    const current =
      [...academicYears].sort(
        (a, b) =>
          Number(b.is_curr_ay ?? b.isCurrAy ?? 0) -
          Number(a.is_curr_ay ?? a.isCurrAy ?? 0),
      )[0] ?? academicYears[0];
    const label = pickText(current, ["academic_year", "academicYear"]);
    setAcademicYear(label || null);
  }, [collegeNum, academicYears]);

  const collegeOptions = useMemo(
    () =>
      colleges.map((r) => ({
        value: String(pickNum(r, ["fk_college_id", "collegeId"])),
        label:
          pickText(r, ["college_code", "collegeCode"]) ||
          String(pickNum(r, ["fk_college_id"])),
      })),
    [colleges],
  );

  const ayOptions = useMemo(() => {
    const sorted = [...academicYears].sort(
      (a, b) =>
        Number(pickText(b, ["academic_year"])) -
        Number(pickText(a, ["academic_year"])),
    );
    return sorted.map((r) => {
      const label = pickText(r, ["academic_year", "academicYear"]);
      return { value: label, label: label || "—" };
    });
  }, [academicYears]);

  const {
    data: rows = [],
    isFetching,
    error,
    isSuccess,
    isError,
  } = useQuery({
    queryKey: QK.incomeExpenseSummary(
      loadKey ? Number(JSON.parse(loadKey).collegeId) : 0,
      loadKey ? JSON.parse(loadKey).year : "",
    ),
    queryFn: () => {
      const p = JSON.parse(loadKey!) as {
        collegeId: number;
        year: string;
      };
      return fetchIncomeExpenseSummary(p);
    },
    enabled: loadKey != null,
  });

  const { resetApiToast } = useApiQueryToasts({
    requestKey: loadKey,
    isFetching,
    isSuccess,
    isError,
    error,
    rowCount: rows.length,
  });

  /** Angular `filter:searchText` — used for Excel + print parity. */
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      Object.values(r).some((v) =>
        String(v ?? "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [rows, search]);

  const tableRows = useMemo(
    () =>
      filteredRows.map((row, i) => ({
        ...row,
        __rowKey: [
          row.district_name ?? "",
          row.college_shortname ?? "",
          row.Year ?? "",
          row.Month ?? "",
          row.TotalIncome ?? "",
          row.TotalExpense ?? "",
          i,
        ].join("|"),
      })),
    [filteredRows],
  );

  function handleGetReport() {
    if (!collegeNum) {
      toastInfo("Please select college.");
      return;
    }
    if (!academicYear) {
      toastInfo("Please select academic year.");
      return;
    }
    const collegeRow = colleges.find(
      (r) => pickNum(r, ["fk_college_id", "collegeId"]) === collegeNum,
    );
    const collegeCode =
      pickText(collegeRow, ["college_code", "collegeCode"]) ||
      collegeOptions.find((o) => o.value === collegeId)?.label ||
      "";
    setCollegeName(
      pickText(collegeRow, ["college_name", "collegeName"]) || collegeCode,
    );
    setDataDetails(`${collegeCode}/${academicYear}`);
    setSearch("");
    resetApiToast();
    setLoadKey(JSON.stringify({ collegeId: collegeNum, year: academicYear }));
  }

  function handleExportExcel() {
    if (!excelRef.current) return;
    // Angular: link.download = `${trafoItem}.xls` → "Income & Expense Report.xls"
    exportHtmlTableAsExcel(excelRef.current, "Income & Expense Report");
  }

  function handlePrint() {
    if (!printRef.current) return;
    printElementInIframe(printRef.current, "Income & Expense Report", {
      extraCss: `
        @page { margin: 1cm; }
        html, body { background: #fff !important; }
        .ie-print { width: 100%; color: #000; }
        .ie-print .collegeName {
          text-align: center !important;
          font-size: 22px !important;
          font-weight: 550 !important;
          margin: 20px 0 -6px !important;
          color: #000 !important;
        }
        .ie-print .title {
          text-align: center !important;
          font-size: 19px !important;
          font-weight: 550 !important;
          margin: 0 !important;
          color: #000 !important;
        }
        .ie-print table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
        }
        .ie-print th {
          background: #C3D9FF !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          padding: 8px 5px;
          border: 1px solid #96aacb;
          text-align: left;
          font-weight: 550;
        }
        .ie-print td {
          padding: 5px 8px;
          border: 1px solid #96aacb;
          text-align: left;
          font-weight: 400;
        }
        .ie-print img {
          max-height: 80px;
          max-width: 120px;
          object-fit: contain;
        }
      `,
    });
  }

  const columnDefs = useMemo(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.district,
      COL_DEFS.college,
      COL_DEFS.year,
      COL_DEFS.month,
      COL_DEFS.income,
      COL_DEFS.expense,
    ],
    [],
  );

  // Angular *ngIf="reportData.length > 0"
  const resultsVisible = loadKey != null && !isFetching && rows.length > 0;

  return (
    <FilteredListPage<IncomeExpenseSummaryRow>
      title="Income & Expense Report"
      className="relative"
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={(v) => {
                setCollegeId(v);
                setAcademicYear(null);
                setLoadKey(null);
                setDataDetails("");
              }}
              options={collegeOptions}
              placeholder="College"
              isLoading={loadingFilters}
            />
          </div>
          <div className="min-w-[180px] flex-1">
            <Select
              label="Academic Year"
              required
              value={academicYear}
              onChange={(v) => {
                setAcademicYear(v);
                setLoadKey(null);
                setDataDetails("");
              }}
              options={ayOptions}
              placeholder="Academic Year"
              disabled={!collegeId}
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={isFetching || !collegeId || !academicYear}
            onClick={handleGetReport}
          >
            {isFetching ? "Loading…" : "Get Report"}
          </Button>
        </div>
      }
      filtersFooter={
        resultsVisible && dataDetails ? (
          <p className="text-sm font-semibold text-blue-600">{dataDetails}</p>
        ) : null
      }
      rowData={tableRows}
      columnDefs={columnDefs}
      loading={isFetching}
      resultsVisible={resultsVisible}
      height="auto"
      pagination={false}
      columnFilters={false}
      getRowId={(p) => String(p.data?.__rowKey ?? "")}
      toolbar={{
        // Angular: shared searchText filters screen + Excel; print uses full reportData
        search: false,
        exportExcel: true,
        exportPdf: false,
        columnPicker: false,
        excelDocumentTitle: "Income & Expense Report",
        excelFileName: "Income & Expense Report.xls",
      }}
      toolbarLeading={
        <div className="min-w-[200px] max-w-xs flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search"
          />
        </div>
      }
      onExportExcel={handleExportExcel}
      toolbarTrailing={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="app-data-table-toolbar-btn h-9 px-3 text-[12px]"
          onClick={handlePrint}
          disabled={!resultsVisible}
        >
          <PrinterIcon className="mr-1.5 h-3.5 w-3.5" />
          Print Report
        </Button>
      }
    >
      {/* Angular #excelTable — Export Excel workbook source */}
      {resultsVisible ? (
        <div ref={excelRef} className="hidden" aria-hidden>
          <strong>Income & Expense Report &nbsp; ({dataDetails})</strong>
          <table>
            <thead>
              <tr>
                <th style={TH}>S.No</th>
                <th style={TH}>District Name</th>
                <th style={TH}>College</th>
                <th style={TH}>Year</th>
                <th style={TH}>Month</th>
                <th style={TH}>Total Income</th>
                <th style={TH}>Total Expenses</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, i) => (
                <tr key={`excel-${i}`}>
                  <td style={TD}>{i + 1}</td>
                  <td style={TD}>{String(row.district_name ?? "")}</td>
                  <td style={TD}>{String(row.college_shortname ?? "")}</td>
                  <td style={TD}>{String(row.Year ?? "")}</td>
                  <td style={TD}>{String(row.Month ?? "")}</td>
                  <td style={TD}>
                    {row.TotalIncome == null
                      ? "-"
                      : inrCurrency(row.TotalIncome)}
                  </td>
                  <td style={TD}>{inrCurrency(row.TotalExpense)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Angular print block (outside #printNone): logo + titles + print column order */}
      {resultsVisible ? (
        <div className="pointer-events-none absolute -left-[9999px] top-0 w-[900px] bg-white text-black">
          <div ref={printRef} className="ie-print bg-white p-4 text-black">
            <div className="mb-2 flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl || DEFAULT_COLLEGE_LOGO}
                alt=""
                className="h-20 w-20 shrink-0 object-contain"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!img.src.endsWith("default_logo.png")) {
                    img.src = DEFAULT_COLLEGE_LOGO;
                  }
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="collegeName">{collegeName}</p>
                <p className="title">Income & Expense Report</p>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  {/* Angular print column order differs from screen */}
                  <th>S.No</th>
                  <th>College</th>
                  <th>District Name</th>
                  <th>Year</th>
                  <th>Month</th>
                  <th>Total Income</th>
                  <th>Total Expenses</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={`print-${i}`}>
                    <td>{i + 1}</td>
                    <td>{String(row.college_shortname ?? "")}</td>
                    <td>{String(row.district_name ?? "")}</td>
                    <td>{String(row.Year ?? "")}</td>
                    <td>{String(row.Month ?? "")}</td>
                    <td>{printAmount(row.TotalIncome)}</td>
                    <td>{printAmount(row.TotalExpense)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </FilteredListPage>
  );
}
