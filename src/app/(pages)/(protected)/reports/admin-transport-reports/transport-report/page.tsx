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
import { PrinterIcon, RefreshCw } from "lucide-react";
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
import { fetchTransportSummary, getFeeMasterCollegeFilters } from "@/services";
import type { TransportSummaryRow } from "@/types/finance";

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
  } as ColDef<TransportSummaryRow>,
  college: {
    headerName: "College Code",
    minWidth: 120,
    flex: 1,
    cellClass: "text-left",
    valueGetter: (p) =>
      String(
        p.data?.college_shortname ??
          p.data?.collegeShortname ??
          p.data?.college_code ??
          "",
      ),
  } as ColDef<TransportSummaryRow>,
  district: {
    field: "district_name",
    headerName: "District Name",
    minWidth: 140,
    flex: 1,
    cellClass: "text-left",
  } as ColDef<TransportSummaryRow>,
  type: {
    field: "Type",
    headerName: "Type",
    minWidth: 160,
    flex: 1.2,
    cellClass: "text-left",
  } as ColDef<TransportSummaryRow>,
  count: {
    field: "Count",
    headerName: "Count",
    minWidth: 100,
    flex: 0.7,
    cellClass: "text-left",
  } as ColDef<TransportSummaryRow>,
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

export default function TransportReportPage() {
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
  const [loadKey, setLoadKey] = useState<string | null>(null);
  const [dataDetails, setDataDetails] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [search, setSearch] = useState("");
  const excelRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const collegeNum = Number(collegeId ?? 0);
  const logoUrl = useCollegeLogo(collegeNum || null);

  const { data: filterBundle, isLoading: loadingFilters } = useQuery({
    queryKey: ["TransportReport", "filters", orgId, employeeId],
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
    queryKey: QK.transportSummary(
      loadKey ? Number(JSON.parse(loadKey).collegeId) : 0,
    ),
    queryFn: () => {
      const p = JSON.parse(loadKey!) as { collegeId: number };
      return fetchTransportSummary(p);
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
          row.district_name ?? "",
          row.Type ?? "",
          row.Count ?? "",
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
    exportHtmlTableAsExcel(excelRef.current, "Transport Report");
  }

  function handlePrint() {
    if (!printRef.current) return;
    printElementInIframe(printRef.current, "Transport Report", {
      extraCss: `
        @page { margin: 1cm; }
        html, body { background: #fff !important; }
        .transport-print { width: 100%; color: #000; }
        .transport-print .collegeName {
          text-align: center !important;
          font-size: 22px !important;
          font-weight: 550 !important;
          margin: 20px 0 -6px !important;
          color: #000 !important;
        }
        .transport-print .title {
          text-align: center !important;
          font-size: 19px !important;
          font-weight: 550 !important;
          margin: 0 !important;
          color: #000 !important;
        }
        .transport-print table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
        }
        .transport-print th {
          background: #C3D9FF !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          padding: 8px 5px;
          border: 1px solid #96aacb;
          text-align: left;
          font-weight: 550;
        }
        .transport-print td {
          padding: 5px 8px;
          border: 1px solid #96aacb;
          text-align: left;
          font-weight: 400;
        }
        .transport-print img.portraitLogo {
          height: 90px;
          width: auto;
          max-width: 140px;
          object-fit: contain;
        }
        .transport-print img.sukLogo {
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
      COL_DEFS.district,
      COL_DEFS.type,
      COL_DEFS.count,
    ],
    [],
  );

  const resultsVisible = loadKey != null && !isFetching && rows.length > 0;
  const pageTitle =
    resultsVisible && dataDetails
      ? `Transport Report - (${dataDetails})`
      : "Transport Report";

  return (
    <FilteredListPage<TransportSummaryRow>
      title={pageTitle}
      className="relative"
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <div className="max-w-[15rem] flex-1">
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
        exportExcel: true,
        exportPdf: false,
        columnPicker: false,
        excelDocumentTitle: "Transport Report",
        excelFileName: "Transport Report.xls",
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
          <h3>Transport Report - ({dataDetails})</h3>
          <table>
            <thead>
              <tr>
                <th style={TH}>S.No.</th>
                <th style={TH}>College Code</th>
                <th style={TH}>District Name</th>
                <th style={TH}>Type</th>
                <th style={TH}>Count</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, i) => (
                <tr key={`excel-${i}`}>
                  <td style={TD}>{i + 1}</td>
                  <td style={TD}>
                    {String(
                      row.college_shortname ??
                        row.collegeShortname ??
                        row.college_code ??
                        "",
                    )}
                  </td>
                  <td style={TD}>{String(row.district_name ?? "")}</td>
                  <td style={TD}>{String(row.Type ?? "")}</td>
                  <td style={TD}>{String(row.Count ?? "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {resultsVisible ? (
        <div className="pointer-events-none absolute -left-[9999px] top-0 w-[900px] bg-white text-black">
          <div
            ref={printRef}
            className="transport-print bg-white p-4 text-black"
          >
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
                <p className="title">Transport Report</p>
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
                  <p className="title">Transport Report</p>
                </div>
              </div>
            )}
            <table>
              <thead>
                <tr>
                  <th>S.No.</th>
                  <th>College Code</th>
                  <th>District Name</th>
                  <th>Type</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={`print-${i}`}>
                    <td>{i + 1}</td>
                    <td>
                      {String(
                        row.college_shortname ??
                          row.collegeShortname ??
                          row.college_code ??
                          "",
                      )}
                    </td>
                    <td>{String(row.district_name ?? "")}</td>
                    <td>{String(row.Type ?? "")}</td>
                    <td>{String(row.Count ?? "")}</td>
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
