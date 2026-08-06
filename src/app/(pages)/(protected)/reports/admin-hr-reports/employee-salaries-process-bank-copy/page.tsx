"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PrinterIcon } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { MonthYearPicker } from "@/common/components/date-picker";
import { SearchInput } from "@/common/components/search";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { printElementInIframe } from "@/lib/print";
import { toastInfo } from "@/lib/toast";
import { useApiQueryToasts } from "@/hooks";
import { useCollegeLogo, DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import {
  filterColleges,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  fetchPayrollBankStatement,
  getFeeMasterCollegeFilters,
  type PayrollBankStatementRow,
} from "@/services";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Angular Indian grouping for net pay (e.g. 1,00,007). */
function formatIndianAmount(input: unknown, withSuffix = true): string {
  if (input == null || input === "") return withSuffix ? "-" : "";
  const n = Number(input);
  if (Number.isNaN(n)) return String(input);
  const isNegative = n < 0;
  const abs = Math.abs(n).toString();
  const [intPart, decPart] = abs.split(".");
  let lastThree = intPart!.substring(intPart!.length - 3);
  const otherNumbers = intPart!.substring(0, intPart!.length - 3);
  if (otherNumbers !== "") lastThree = `,${lastThree}`;
  let output = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
  if (decPart) output += `.${decPart}`;
  const signed = `${isNegative ? "-" : ""}${output}`;
  return withSuffix ? `${signed}/-` : signed;
}

function employeeName(row: PayrollBankStatementRow): string {
  return [row.first_name, row.middle_name, row.last_name]
    .filter((p) => p != null && String(p).trim() !== "")
    .join(" ");
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

const TH: CSSProperties = {
  padding: "8px 5px",
  background: "#C3D9FF",
  fontWeight: 550,
  border: "1px solid #96aacb",
  textAlign: "left",
};

const TD: CSSProperties = {
  padding: "8px",
  textAlign: "center",
  fontWeight: 400,
  border: "1px solid #96aacb",
};

type BankCopyRow = PayrollBankStatementRow & {
  __isTotal?: boolean;
};

function nameRenderer(p: ICellRendererParams<BankCopyRow>) {
  if (p.data?.__isTotal) {
    return <span className="font-semibold">Total</span>;
  }
  return employeeName(p.data ?? {});
}

function dashOrText(value: unknown): string {
  if (value == null || value === "") return "-";
  return String(value);
}

export default function EmployeeSalariesProcessBankCopyPage() {
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
  const [period, setPeriod] = useState<Date>(new Date());
  const [loadKey, setLoadKey] = useState<string | null>(null);
  const [dataDetails, setDataDetails] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [search, setSearch] = useState("");
  const excelRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const collegeNum = Number(collegeId ?? 0);
  const logoUrl = useCollegeLogo(collegeNum || null);
  const month = period.getMonth() + 1;
  const year = period.getFullYear();
  const monthName = MONTHS[period.getMonth()]!;

  const { data: filterBundle, isLoading: loadingFilters } = useQuery({
    queryKey: ["PayrollBankStatement", "filters", orgId, employeeId],
    queryFn: () => getFeeMasterCollegeFilters(orgId, employeeId),
    enabled: orgId > 0 && employeeId > 0,
  });

  const filtersData = useMemo(
    () => (filterBundle?.filtersData ?? []) as FilterRow[],
    [filterBundle?.filtersData],
  );
  const colleges = useMemo(() => filterColleges(filtersData), [filtersData]);

  useEffect(() => {
    if (!collegeId && colleges.length > 0) {
      setCollegeId(
        String(pickNum(colleges[0], ["fk_college_id", "collegeId"])),
      );
    }
  }, [colleges, collegeId]);

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

  const {
    data: rows = [],
    isFetching,
    error,
    isSuccess,
    isError,
  } = useQuery({
    queryKey: QK.payrollBankStatement(
      loadKey ? Number(JSON.parse(loadKey).collegeId) : 0,
      loadKey ? Number(JSON.parse(loadKey).month) : 0,
      loadKey ? Number(JSON.parse(loadKey).year) : 0,
    ),
    queryFn: () => {
      const p = JSON.parse(loadKey!) as {
        collegeId: number;
        month: number;
        year: number;
      };
      return fetchPayrollBankStatement(p);
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

  const totalNetAmount = useMemo(
    () =>
      rows.reduce((sum, row) => {
        const n = Number(row.net_pay);
        return sum + (Number.isNaN(n) ? 0 : n);
      }, 0),
    [rows],
  );

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

  const tableRows = useMemo<BankCopyRow[]>(() => {
    if (rows.length === 0) return [];
    const dataRows = filteredRows.map((row, i) => ({
      ...row,
      __rowKey: `${employeeName(row)}|${row.account_number ?? ""}|${i}`,
    }));
    return [
      ...dataRows,
      {
        __rowKey: "__total__",
        __isTotal: true,
        first_name: "Total",
        net_pay: totalNetAmount,
      },
    ];
  }, [filteredRows, rows.length, totalNetAmount]);

  const columnDefs = useMemo<ColDef<BankCopyRow>[]>(
    () => [
      {
        colId: "siNo",
        headerName: "SI.No",
        valueGetter: (p) => {
          if (p.data?.__isTotal) return "";
          // Exclude the Total footer from SI numbering.
          const idx = p.node?.rowIndex ?? 0;
          return idx + 1;
        },
        width: 80,
        flex: 0,
        cellClass: "text-center",
        sortable: false,
      },
      {
        colId: "name",
        headerName: "Name",
        minWidth: 180,
        flex: 1.4,
        cellClass: "text-left",
        cellRenderer: nameRenderer,
        sortable: false,
      },
      {
        field: "designation_name",
        headerName: "Designation",
        minWidth: 140,
        flex: 1,
        cellClass: "text-center",
        valueFormatter: (p) => (p.data?.__isTotal ? "" : dashOrText(p.value)),
        sortable: false,
      },
      {
        field: "account_number",
        headerName: "Bank A/C",
        minWidth: 140,
        flex: 1,
        cellClass: "text-center",
        valueFormatter: (p) => (p.data?.__isTotal ? "" : dashOrText(p.value)),
        sortable: false,
      },
      {
        field: "net_pay",
        headerName: "Net Salary",
        minWidth: 130,
        flex: 1,
        cellClass: "text-center",
        valueFormatter: (p) => formatIndianAmount(p.value),
        cellClassRules: {
          "font-semibold": (p) => Boolean(p.data?.__isTotal),
        },
        sortable: false,
      },
      {
        field: "ifsc_code",
        headerName: "IFSC Code",
        minWidth: 130,
        flex: 1,
        cellClass: "text-center",
        valueFormatter: (p) => (p.data?.__isTotal ? "" : dashOrText(p.value)),
        sortable: false,
      },
    ],
    [],
  );

  function handleGetList() {
    if (!collegeNum) {
      toastInfo("Please select college.");
      return;
    }
    const collegeRow = colleges.find(
      (r) => pickNum(r, ["fk_college_id", "collegeId"]) === collegeNum,
    );
    const code =
      pickText(collegeRow, ["college_code", "collegeCode"]) ||
      collegeOptions.find((o) => o.value === collegeId)?.label ||
      "";
    const name = pickText(collegeRow, ["college_name", "collegeName"]) || code;
    setCollegeName(name);
    setDataDetails(`${code}/${monthName} ${year}`);
    setSearch("");
    resetApiToast();
    setLoadKey(JSON.stringify({ collegeId: collegeNum, month, year }));
  }

  function handleExportExcel() {
    if (!excelRef.current) return;
    exportHtmlTableAsExcel(
      excelRef.current,
      "Employee Salaries Process - Bank Copy",
    );
  }

  function handlePrint() {
    if (!printRef.current) return;
    printElementInIframe(
      printRef.current,
      "Employee Salaries Process - Bank Copy",
      {
        extraCss: `
        @page { margin: 1cm; }
        html, body { background: #fff !important; }
        .bank-print { width: 100%; color: #000; }
        .bank-print .collegeName {
          text-align: left !important;
          font-size: 22px !important;
          font-weight: 550 !important;
          margin: 8px 0 4px !important;
          color: #000 !important;
        }
        .bank-print .title {
          text-align: left !important;
          font-size: 18px !important;
          font-weight: 550 !important;
          margin: 0 0 12px !important;
          color: #000 !important;
        }
        .bank-print table {
          width: 100%;
          border-collapse: collapse;
        }
        .bank-print th, .bank-print td {
          border: 1px solid #96aacb;
          padding: 6px 8px;
          text-align: center;
        }
        .bank-print th {
          background: #C3D9FF !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .bank-print img.portraitLogo {
          height: 90px;
          width: auto;
          max-width: 140px;
          object-fit: contain;
        }
        .bank-print img.sukLogo {
          width: 100%;
          max-width: 1200px;
          height: auto;
        }
        .bank-print .description {
          text-align: left !important;
          margin: 4px 0 0 !important;
          font-size: 13px !important;
        }
      `,
      },
    );
  }

  const resultsVisible = loadKey != null && !isFetching && rows.length > 0;

  return (
    <FilteredListPage<BankCopyRow>
      title="Employee Salaries Process - Bank Copy"
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
                setLoadKey(null);
                setDataDetails("");
              }}
              options={collegeOptions}
              placeholder="College"
              isLoading={loadingFilters}
            />
          </div>
          <div className="min-w-[160px] flex-1">
            <MonthYearPicker
              label="Month and Year"
              value={period}
              onChange={(d) => {
                if (d) {
                  setPeriod(d);
                  setLoadKey(null);
                  setDataDetails("");
                }
              }}
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={isFetching || !collegeId}
            onClick={handleGetList}
          >
            {isFetching ? "Loading…" : "Get List"}
          </Button>
        </div>
      }
      filtersFooter={
        resultsVisible && dataDetails ? (
          <p className="text-sm font-semibold text-blue-600">
            Employee Salaries Process - Bank Copy - {dataDetails}
          </p>
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
        search: false,
        exportExcel: true,
        exportPdf: false,
        columnPicker: false,
        excelDocumentTitle: "Employee Salaries Process - Bank Copy",
        excelFileName: "Employee Salaries Process - Bank Copy.xls",
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
      {resultsVisible ? (
        <div ref={excelRef} className="hidden" aria-hidden>
          <strong>Employee Salaries Process - Bank Copy - {dataDetails}</strong>
          <table>
            <thead>
              <tr>
                <th style={TH}>SI.No</th>
                <th style={TH}>Name</th>
                <th style={TH}>Designation</th>
                <th style={TH}>Bank A/C</th>
                <th style={TH}>Net Salary</th>
                <th style={TH}>IFSC Code</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, i) => (
                <tr key={`excel-${i}`}>
                  <td style={TD}>{i + 1}</td>
                  <td style={{ ...TD, textAlign: "left" }}>
                    {employeeName(row)}
                  </td>
                  <td style={TD}>{dashOrText(row.designation_name)}</td>
                  <td style={TD}>{dashOrText(row.account_number)}</td>
                  <td style={TD}>{formatIndianAmount(row.net_pay)}</td>
                  <td style={TD}>{dashOrText(row.ifsc_code)}</td>
                </tr>
              ))}
              <tr>
                <td style={TD} />
                <td style={{ ...TD, textAlign: "left" }} colSpan={3}>
                  Total
                </td>
                <td style={TD}>{formatIndianAmount(totalNetAmount)}</td>
                <td style={TD} />
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}

      {resultsVisible ? (
        <div className="pointer-events-none absolute -left-[9999px] top-0 w-[900px] bg-white text-black">
          <div ref={printRef} className="bank-print bg-white p-4 text-black">
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
                <p className="title">
                  SALARY FOR THE MONTH OF {monthName} {year}
                </p>
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
                  <p className="title">
                    SALARY FOR THE MONTH OF {monthName} {year}
                  </p>
                </div>
              </div>
            )}
            <table>
              <thead>
                <tr>
                  <th>SI.No</th>
                  <th>Name</th>
                  <th>Designation</th>
                  <th>Bank A/C</th>
                  <th>IFSC Code</th>
                  <th>Net Salary</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={`print-${i}`}>
                    <td>{i + 1}</td>
                    <td style={{ textAlign: "left" }}>{employeeName(row)}</td>
                    <td style={{ textAlign: "left" }}>
                      {row.designation_name != null
                        ? String(row.designation_name)
                        : ""}
                    </td>
                    <td>
                      {row.account_number != null
                        ? String(row.account_number)
                        : ""}
                    </td>
                    <td>
                      {row.ifsc_code != null ? String(row.ifsc_code) : ""}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {row.net_pay != null
                        ? formatIndianAmount(row.net_pay, false)
                        : ""}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td />
                  <td colSpan={4} style={{ textAlign: "left" }}>
                    Total
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {formatIndianAmount(totalNetAmount, false)}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="description mt-4 text-left text-sm">
              **If found any descrepency in the mentioned accounts,
            </p>
            <p className="description text-left text-sm">
              please do the revers the transaction amount to our bank a/c :
            </p>
          </div>
        </div>
      ) : null}
    </FilteredListPage>
  );
}
