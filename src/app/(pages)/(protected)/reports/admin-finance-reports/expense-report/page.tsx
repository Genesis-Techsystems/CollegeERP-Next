"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColDef } from "ag-grid-community";
import { FileSpreadsheet, PrinterIcon, RefreshCw } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { SearchInput } from "@/common/components/search";
import { Select } from "@/common/components/select";
import {
  GlobalFilterBarRow,
  GlobalFilterField,
} from "@/common/components/forms";
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
import { fetchExpenseSummary, getFeeMasterCollegeFilters } from "@/services";
import type { ExpenseSummaryRow } from "@/types/finance";

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
    colId: "siNo",
    headerName: "S.No.",
    valueGetter: rowIndexGetter,
    width: 80,
    flex: 0,
    cellClass: "text-left",
    sortable: false,
    filter: false,
  } as ColDef<ExpenseSummaryRow>,
  college: {
    field: "college_shortname",
    headerName: "College Code",
    minWidth: 120,
    flex: 1,
    cellClass: "text-left",
  } as ColDef<ExpenseSummaryRow>,
  year: {
    field: "Year",
    headerName: "Year",
    minWidth: 90,
    flex: 0.6,
    cellClass: "text-left",
  } as ColDef<ExpenseSummaryRow>,
  month: {
    field: "Month",
    headerName: "Month",
    minWidth: 110,
    flex: 0.8,
    cellClass: "text-left",
  } as ColDef<ExpenseSummaryRow>,
  category: {
    field: "Category",
    headerName: "Category",
    minWidth: 140,
    flex: 1,
    cellClass: "text-left",
  } as ColDef<ExpenseSummaryRow>,
  totalExpense: {
    field: "TotalExpense",
    headerName: "TotalExpense",
    minWidth: 130,
    flex: 1,
    cellClass: "text-left",
  } as ColDef<ExpenseSummaryRow>,
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

export default function ExpenseReportPage() {
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );
  const orgCode =
    typeof window !== "undefined"
      ? window.localStorage.getItem("orgCode")
      : null;

  const [collegeId, setCollegeId] = useState<string | null>(null);
  /** Angular mat-option value = `academic_year` string. */
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
    queryKey: ["ExpenseReport", "filters", orgId, employeeId],
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
    queryKey: QK.expenseSummary(
      loadKey ? Number(JSON.parse(loadKey).collegeId) : 0,
      loadKey ? JSON.parse(loadKey).year : "",
    ),
    queryFn: () => {
      const p = JSON.parse(loadKey!) as {
        collegeId: number;
        year: string;
      };
      return fetchExpenseSummary(p);
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

  /** Angular MatTable `applyFilter` — screen + Excel; print uses full dataSource. */
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
          row.college_shortname ?? "",
          row.Year ?? "",
          row.Month ?? "",
          row.Category ?? "",
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
    // Angular dataDetails = college_name + '/' + academic_year
    const name =
      pickText(collegeRow, ["college_name", "collegeName"]) ||
      collegeOptions.find((o) => o.value === collegeId)?.label ||
      "";
    setCollegeName(name);
    setDataDetails(`${name}/${academicYear}`);
    setSearch("");
    resetApiToast();
    setLoadKey(JSON.stringify({ collegeId: collegeNum, year: academicYear }));
  }

  /** Angular `reset()` — clear college + report. */
  function handleReset() {
    setCollegeId(null);
    setAcademicYear(null);
    setLoadKey(null);
    setDataDetails("");
    setCollegeName("");
    setSearch("");
    resetApiToast();
  }

  function handleExportExcel() {
    if (!excelRef.current) return;
    exportHtmlTableAsExcel(excelRef.current, "Expense Report");
  }

  function handlePrint() {
    if (!printRef.current) return;
    printElementInIframe(printRef.current, "Expense Report", {
      extraCss: `
        @page { margin: 1cm; }
        html, body { background: #fff !important; }
        .expense-print { width: 100%; color: #000; }
        .expense-print .collegeName {
          text-align: center !important;
          font-size: 22px !important;
          font-weight: 550 !important;
          margin: 20px 0 -6px !important;
          color: #000 !important;
        }
        .expense-print .title {
          text-align: center !important;
          font-size: 19px !important;
          font-weight: 550 !important;
          margin: 0 !important;
          color: #000 !important;
        }
        .expense-print table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
        }
        .expense-print th {
          background: #C3D9FF !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          padding: 8px 5px;
          border: 1px solid #96aacb;
          text-align: left;
          font-weight: 550;
        }
        .expense-print td {
          padding: 5px 8px;
          border: 1px solid #96aacb;
          text-align: left;
          font-weight: 400;
        }
        .expense-print img.portraitLogo {
          height: 90px;
          width: auto;
          max-width: 140px;
          object-fit: contain;
        }
        .expense-print img.sukLogo {
          width: 100%;
          max-width: 1200px;
          height: auto;
          object-fit: contain;
        }
      `,
    });
  }

  const columnDefs = useMemo(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.college,
      COL_DEFS.year,
      COL_DEFS.month,
      COL_DEFS.category,
      COL_DEFS.totalExpense,
    ],
    [],
  );

  const resultsVisible = loadKey != null && !isFetching && rows.length > 0;

  return (
    <FilteredListPage<ExpenseSummaryRow>
      title="Expense Report"
      className="relative"
      filters={
        <GlobalFilterBarRow className="!items-end">
          <GlobalFilterField
            label="College"
            className="global-filter-field--shrink w-full max-w-[min(100%,12rem)] sm:w-[20%]"
          >
            <Select
              label=""
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
          </GlobalFilterField>
          <GlobalFilterField
            label="Academic Year"
            className="global-filter-field--shrink w-full max-w-[min(100%,11rem)] sm:w-[18%]"
          >
            <Select
              label=""
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
          </GlobalFilterField>
          <GlobalFilterField
            label=""
            className="global-filter-field--shrink global-filter-field--action"
          >
            <div className="flex items-center gap-2">
              <Button
                type="button"
                className="h-9 w-fit px-4"
                disabled={isFetching || !collegeId || !academicYear}
                onClick={handleGetReport}
              >
                {isFetching ? "Loading…" : "Get Report"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 w-9 shrink-0 px-0"
                title="Reset"
                onClick={handleReset}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </GlobalFilterField>
        </GlobalFilterBarRow>
      }
      tableTitle={
        resultsVisible && dataDetails
          ? `Expense Report - ${dataDetails}`
          : "Expense Report"
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
        search: false,
        exportExcel: false,
        exportPdf: false,
        columnPicker: true,
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
      toolbarTrailing={
        resultsVisible ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-9 px-3 text-[12px]"
              onClick={handleExportExcel}
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Excel Export
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 px-3 text-[12px]"
              onClick={handlePrint}
            >
              <PrinterIcon className="mr-1.5 h-3.5 w-3.5" />
              Print Report
            </Button>
          </div>
        ) : null
      }
    >
      {resultsVisible ? (
        <div ref={excelRef} className="hidden" aria-hidden>
          <h3>Expense Report - ({dataDetails})</h3>
          <table>
            <thead>
              <tr>
                <th style={TH}>S.No.</th>
                <th style={TH}>College Code</th>
                <th style={TH}>Year</th>
                <th style={TH}>Month</th>
                <th style={TH}>Category</th>
                <th style={TH}>TotalExpense</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, i) => (
                <tr key={`excel-${i}`}>
                  <td style={TD}>{i + 1}</td>
                  <td style={TD}>{String(row.college_shortname ?? "")}</td>
                  <td style={TD}>{String(row.Year ?? "")}</td>
                  <td style={TD}>{String(row.Month ?? "")}</td>
                  <td style={TD}>{String(row.Category ?? "")}</td>
                  <td style={TD}>{String(row.TotalExpense ?? "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {resultsVisible ? (
        <div className="pointer-events-none absolute -left-[9999px] top-0 w-[900px] bg-white text-black">
          <div ref={printRef} className="expense-print bg-white p-4 text-black">
            {orgCode === "SUK" ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl || DEFAULT_COLLEGE_LOGO}
                  alt=""
                  className="sukLogo mb-2"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.src.endsWith("default_logo.png")) {
                      img.src = DEFAULT_COLLEGE_LOGO;
                    }
                  }}
                />
                <p className="collegeName">{collegeName}</p>
                <p className="title">Expense Report</p>
              </>
            ) : (
              <div className="mb-2 flex items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl || DEFAULT_COLLEGE_LOGO}
                  alt=""
                  className="portraitLogo shrink-0"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.src.endsWith("default_logo.png")) {
                      img.src = DEFAULT_COLLEGE_LOGO;
                    }
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="collegeName">{collegeName}</p>
                  <p className="title">Expense Report</p>
                </div>
              </div>
            )}
            <table>
              <thead>
                <tr>
                  <th>S.No.</th>
                  <th>College Code</th>
                  <th>Year</th>
                  <th>Month</th>
                  <th>Category</th>
                  <th>Total Expense</th>
                </tr>
              </thead>
              <tbody>
                {/* Angular print uses full dataSource (not search-filtered) */}
                {rows.map((row, i) => (
                  <tr key={`print-${i}`}>
                    <td>{i + 1}</td>
                    <td>{String(row.college_shortname ?? "")}</td>
                    <td>{String(row.Year ?? "")}</td>
                    <td>{String(row.Month ?? "")}</td>
                    <td>{String(row.Category ?? "")}</td>
                    <td>{String(row.TotalExpense ?? "")}</td>
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
