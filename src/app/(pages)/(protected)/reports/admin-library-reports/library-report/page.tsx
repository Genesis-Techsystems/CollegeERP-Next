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
import { FileSpreadsheetIcon, PrinterIcon, RefreshCw } from "lucide-react";
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
  filterColleges,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import { fetchLibrarySummary, getFeeMasterCollegeFilters } from "@/services";
import type { LibrarySummaryRow } from "@/types/finance";

/** API may return `Total Books` (spaced) or `TotalBooks`. */
function totalBooksValue(row: LibrarySummaryRow | undefined | null): unknown {
  if (!row) return "";
  const spaced = row["Total Books"];
  if (spaced != null) return spaced;
  return row.TotalBooks ?? "";
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
    colId: "siNo",
    headerName: "S.No.",
    valueGetter: rowIndexGetter,
    width: 80,
    flex: 0,
    cellClass: "text-left",
    sortable: false,
    filter: false,
  } as ColDef<LibrarySummaryRow>,
  college: {
    field: "college_shortname",
    headerName: "College Code",
    minWidth: 120,
    flex: 1,
    cellClass: "text-left",
  } as ColDef<LibrarySummaryRow>,
  year: {
    field: "Year",
    headerName: "Year",
    minWidth: 90,
    flex: 0.6,
    cellClass: "text-left",
  } as ColDef<LibrarySummaryRow>,
  title: {
    field: "Title",
    headerName: "Title",
    minWidth: 160,
    flex: 1.2,
    cellClass: "text-left",
  } as ColDef<LibrarySummaryRow>,
  publisher: {
    field: "Publisher",
    headerName: "Publisher",
    minWidth: 130,
    flex: 1,
    cellClass: "text-left",
  } as ColDef<LibrarySummaryRow>,
  author: {
    field: "Author",
    headerName: "Author",
    minWidth: 130,
    flex: 1,
    cellClass: "text-left",
  } as ColDef<LibrarySummaryRow>,
  totalBooks: {
    colId: "TotalBooks",
    headerName: "TotalBooks",
    minWidth: 110,
    flex: 0.7,
    cellClass: "text-left",
    valueGetter: (p) => totalBooksValue(p.data),
  } as ColDef<LibrarySummaryRow>,
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

export default function LibraryReportPage() {
  const employeeId = Number(
    globalThis?.localStorage?.getItem("employeeId") ?? 0,
  );
  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState<string | null>(null);
  const [dataDetails, setDataDetails] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [search, setSearch] = useState("");
  const excelRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const collegeNum = Number(collegeId ?? 0);
  const logoUrl = useCollegeLogo(collegeNum || null);

  const { data: filterBundle, isLoading: loadingFilters } = useQuery({
    queryKey: ["LibraryReport", "filters", orgId, employeeId],
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
    queryKey: QK.librarySummary(
      loadKey ? Number(JSON.parse(loadKey).collegeId) : 0,
    ),
    queryFn: () => {
      const p = JSON.parse(loadKey!) as { collegeId: number };
      return fetchLibrarySummary(p);
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
          row.Title ?? "",
          row.Publisher ?? "",
          row.Author ?? "",
          totalBooksValue(row),
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
    const collegeRow = colleges.find(
      (r) => pickNum(r, ["fk_college_id", "collegeId"]) === collegeNum,
    );
    const name =
      pickText(collegeRow, ["college_name", "collegeName"]) ||
      collegeOptions.find((o) => o.value === collegeId)?.label ||
      "";
    setCollegeName(name);
    setDataDetails(name);
    setSearch("");
    resetApiToast();
    setLoadKey(JSON.stringify({ collegeId: collegeNum }));
  }

  function handleReset() {
    setCollegeId(null);
    setLoadKey(null);
    setDataDetails("");
    setCollegeName("");
    setSearch("");
    resetApiToast();
  }

  function handleExportExcel() {
    if (!excelRef.current) return;
    exportHtmlTableAsExcel(excelRef.current, "Library Report");
  }

  function handlePrint() {
    if (!printRef.current) return;
    printElementInIframe(printRef.current, "Library Report", {
      extraCss: `
        @page { margin: 1cm; }
        html, body { background: #fff !important; }
        .library-print { width: 100%; color: #000; }
        .library-print .collegeName {
          text-align: center !important;
          font-size: 22px !important;
          font-weight: 550 !important;
          margin: 20px 0 -6px !important;
          color: #000 !important;
        }
        .library-print .title {
          text-align: center !important;
          font-size: 19px !important;
          font-weight: 550 !important;
          margin: 0 !important;
          color: #000 !important;
        }
        .library-print table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
        }
        .library-print th {
          background: #C3D9FF !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          padding: 8px 5px;
          border: 1px solid #96aacb;
          text-align: left;
          font-weight: 550;
        }
        .library-print td {
          padding: 5px 8px;
          border: 1px solid #96aacb;
          text-align: left;
          font-weight: 400;
        }
        .library-print img {
          width: 100%;
          max-width: 120px;
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
      COL_DEFS.title,
      COL_DEFS.publisher,
      COL_DEFS.author,
      COL_DEFS.totalBooks,
    ],
    [],
  );

  const resultsVisible = loadKey != null && !isFetching && rows.length > 0;
  const pageTitle =
    resultsVisible && dataDetails
      ? `Library Report - (${dataDetails})`
      : "Library Report";

  return (
    <FilteredListPage<LibrarySummaryRow>
      title={pageTitle}
      className="relative"
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <div className="max-w-[200px] min-w-[100px] flex-1">
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
          <Button
            type="button"
            size="sm"
            disabled={isFetching || !collegeId}
            onClick={handleGetReport}
          >
            {isFetching ? "Loading…" : "Get Report"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 w-9 shrink-0 px-0"
            title="Reset"
            onClick={handleReset}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
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
        columnPicker: false,
        excelDocumentTitle: "Library Report",
        excelFileName: "Library Report.xls",
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
        resultsVisible ? (
          <>
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-[5px] px-3 text-[12px]"
              onClick={handleExportExcel}
              disabled={!resultsVisible}
            >
              <FileSpreadsheetIcon className="mr-1.5 h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-[5px] px-3 text-[12px]"
              onClick={handlePrint}
              disabled={!resultsVisible}
            >
              <PrinterIcon className="mr-1.5 h-3.5 w-3.5" />
              Print Report
            </Button>
          </>
        ) : null
      }
    >
      {resultsVisible ? (
        <div ref={excelRef} className="hidden" aria-hidden>
          <h3>Library Report - ({dataDetails})</h3>
          <table>
            <thead>
              <tr>
                <th style={TH}>S.No.</th>
                <th style={TH}>College Code</th>
                <th style={TH}>Year</th>
                <th style={TH}>Title</th>
                <th style={TH}>Publisher</th>
                <th style={TH}>Author</th>
                <th style={TH}>TotalBooks</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, i) => (
                <tr key={`excel-${i}`}>
                  <td style={TD}>{i + 1}</td>
                  <td style={TD}>{String(row.college_shortname ?? "")}</td>
                  <td style={TD}>{String(row.Year ?? "")}</td>
                  <td style={TD}>{String(row.Title ?? "")}</td>
                  <td style={TD}>{String(row.Publisher ?? "")}</td>
                  <td style={TD}>{String(row.Author ?? "")}</td>
                  <td style={TD}>{String(totalBooksValue(row))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {resultsVisible ? (
        <div className="pointer-events-none absolute -left-[9999px] top-0 w-[900px] bg-white text-black">
          <div ref={printRef} className="library-print bg-white p-4 text-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl || DEFAULT_COLLEGE_LOGO}
              alt=""
              className="mb-2"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.src.endsWith("default_logo.png")) {
                  img.src = DEFAULT_COLLEGE_LOGO;
                }
              }}
            />
            <p className="collegeName">{collegeName}</p>
            <p className="title">Library Report</p>
            <table>
              <thead>
                <tr>
                  <th>S.No.</th>
                  <th>College Code</th>
                  <th>Year</th>
                  <th>Title</th>
                  <th>Publisher</th>
                  <th>Author</th>
                  <th>TotalBooks</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={`print-${i}`}>
                    <td>{i + 1}</td>
                    <td>{String(row.college_shortname ?? "")}</td>
                    <td>{String(row.Year ?? "")}</td>
                    <td>{String(row.Title ?? "")}</td>
                    <td>{String(row.Publisher ?? "")}</td>
                    <td>{String(row.Author ?? "")}</td>
                    <td>{String(totalBooksValue(row))}</td>
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
