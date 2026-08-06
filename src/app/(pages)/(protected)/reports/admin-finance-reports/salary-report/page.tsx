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
  fetchSchoolWiseSalaries,
  getFeeMasterCollegeFilters,
} from "@/services";
import type { SchoolWiseSalaryRow } from "@/types/finance";

/** Preferred column order for known `s_school_wise_salaries` fields (chart + API). */
const PREFERRED_FIELD_ORDER = [
  "district_name",
  "college_shortname",
  "Year",
  "month",
  "Month",
  "Amount",
] as const;

/** Friendly headers for known API fields. */
const FIELD_HEADERS: Record<string, string> = {
  district_name: "District Name",
  college_shortname: "College",
  Year: "Year",
  month: "Month",
  Month: "Month",
  Amount: "Amount",
};

function humanizeField(key: string): string {
  if (FIELD_HEADERS[key]) return FIELD_HEADERS[key];
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isSkippedField(key: string): boolean {
  if (key.startsWith("__")) return true;
  if (/^pk_/i.test(key)) return true;
  // Use grid S.No (row index); ignore API serial fields so they don't appear last.
  if (
    /^s\.?no$/i.test(key) ||
    /^si\.?no$/i.test(key) ||
    /^sl\.?no$/i.test(key)
  ) {
    return true;
  }
  return false;
}

/** Build display columns from the first API row’s keys (Angular HTML fee columns were wrong). */
function buildSalaryFields(rows: SchoolWiseSalaryRow[]): string[] {
  const keySet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!isSkippedField(key)) keySet.add(key);
    }
  }
  const ordered: string[] = [];
  for (const key of PREFERRED_FIELD_ORDER) {
    if (keySet.has(key)) {
      ordered.push(key);
      keySet.delete(key);
    }
  }
  // Deduplicate month/Month — prefer whichever appeared first in preferred list
  const hasMonth = ordered.includes("month") || ordered.includes("Month");
  if (hasMonth) {
    const monthKeys = ordered.filter((k) => k === "month" || k === "Month");
    if (monthKeys.length > 1) {
      const keep = monthKeys[0]!;
      for (let i = ordered.length - 1; i >= 0; i--) {
        if (
          (ordered[i] === "month" || ordered[i] === "Month") &&
          ordered[i] !== keep
        ) {
          ordered.splice(i, 1);
        }
      }
    }
  }
  const rest = [...keySet].sort((a, b) => a.localeCompare(b));
  return [...ordered, ...rest];
}

function cellDisplay(value: unknown): string {
  if (value == null || value === "") return "";
  return String(value);
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
  textAlign: "left",
  fontWeight: 400,
  border: "1px solid #96aacb",
};

export default function SalaryReportPage() {
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );

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
    queryKey: ["SalaryReport", "filters", orgId, employeeId],
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
    queryKey: QK.schoolWiseSalaries(
      loadKey ? Number(JSON.parse(loadKey).collegeId) : 0,
      loadKey ? JSON.parse(loadKey).year : "",
    ),
    queryFn: () => {
      const p = JSON.parse(loadKey!) as {
        collegeId: number;
        year: string;
      };
      return fetchSchoolWiseSalaries(p);
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

  const dataFields = useMemo(() => buildSalaryFields(rows), [rows]);

  /** Angular `filter:searchText` — screen + Excel. */
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
        __rowKey: `${dataFields.map((f) => row[f] ?? "").join("|")}|${i}`,
      })),
    [filteredRows, dataFields],
  );

  const columnDefs = useMemo<ColDef<SchoolWiseSalaryRow>[]>(() => {
    const valueCols: ColDef<SchoolWiseSalaryRow>[] = dataFields.map(
      (field) => ({
        field,
        headerName: humanizeField(field),
        minWidth: field === "Amount" ? 120 : 110,
        flex: 1,
        cellClass: "text-left",
        valueFormatter: (p: ValueFormatterParams<SchoolWiseSalaryRow>) =>
          cellDisplay(p.data?.[field]),
      }),
    );
    return [
      {
        colId: "siNo",
        headerName: "S.No",
        valueGetter: rowIndexGetter,
        width: 80,
        flex: 0,
        cellClass: "text-left",
        sortable: false,
        filter: false,
      },
      ...valueCols,
    ];
  }, [dataFields]);

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
    exportHtmlTableAsExcel(excelRef.current, "Salary Report");
  }

  function handlePrint() {
    if (!printRef.current) return;
    printElementInIframe(printRef.current, "Salary Report", {
      extraCss: `
        @page { margin: 1cm; }
        html, body { background: #fff !important; }
        .salary-print { width: 100%; color: #000; }
        .salary-print .collegeName {
          text-align: center !important;
          font-size: 22px !important;
          font-weight: 550 !important;
          margin: 20px 0 -6px !important;
          color: #000 !important;
        }
        .salary-print .title {
          text-align: center !important;
          font-size: 19px !important;
          font-weight: 550 !important;
          margin: 0 !important;
          color: #000 !important;
        }
        .salary-print table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
        }
        .salary-print th {
          background: #C3D9FF !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          padding: 8px 5px;
          border: 1px solid #96aacb;
          text-align: left;
          font-weight: 550;
        }
        .salary-print td {
          padding: 5px 8px;
          border: 1px solid #96aacb;
          text-align: left;
          font-weight: 400;
        }
        .salary-print img {
          max-height: 100px;
          max-width: 90%;
          object-fit: contain;
        }
      `,
    });
  }

  const resultsVisible = loadKey != null && !isFetching && rows.length > 0;

  return (
    <FilteredListPage<SchoolWiseSalaryRow>
      title="Salary Report"
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
      pagination={true}
      columnFilters={true}
      getRowId={(p) => String(p.data?.__rowKey ?? "")}
      toolbar={{
        columnPicker: true,
        search: false,
        exportExcel: true,
        exportPdf: false,
        excelDocumentTitle: "Salary Report",
        excelFileName: "Salary Report.xls",
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
          <strong>Salary Report &nbsp; ({dataDetails})</strong>
          <table>
            <thead>
              <tr>
                <th style={TH}>S.No</th>
                {dataFields.map((field) => (
                  <th key={`excel-h-${field}`} style={TH}>
                    {humanizeField(field)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, i) => (
                <tr key={`excel-${i}`}>
                  <td style={TD}>{i + 1}</td>
                  {dataFields.map((field) => (
                    <td key={`excel-${i}-${field}`} style={TD}>
                      {cellDisplay(row[field])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {resultsVisible ? (
        <div className="pointer-events-none absolute -left-[9999px] top-0 w-[900px] bg-white text-black">
          <div ref={printRef} className="salary-print bg-white p-4 text-black">
            <div className="mb-2 flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl || DEFAULT_COLLEGE_LOGO}
                alt=""
                className="h-24 max-w-[90%] shrink-0 object-contain"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!img.src.endsWith("default_logo.png")) {
                    img.src = DEFAULT_COLLEGE_LOGO;
                  }
                }}
              />
            </div>
            <p className="collegeName">{collegeName}</p>
            <p className="title">Salary Report</p>
            <table>
              <thead>
                <tr>
                  <th>S.No</th>
                  {dataFields.map((field) => (
                    <th key={`print-h-${field}`}>{humanizeField(field)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Angular print uses full salaryReport (not search-filtered) */}
                {rows.map((row, i) => (
                  <tr key={`print-${i}`}>
                    <td>{i + 1}</td>
                    {dataFields.map((field) => (
                      <td key={`print-${i}-${field}`}>
                        {cellDisplay(row[field])}
                      </td>
                    ))}
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
