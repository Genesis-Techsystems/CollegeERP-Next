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
import { format } from "date-fns";
import { PrinterIcon } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { DatePicker } from "@/common/components/date-picker";
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
  fetchOnlinePaymentsComparative,
  listActiveCollegesForGeneralSettings,
  type OnlinePaymentsComparativeRow,
} from "@/services";

const SETTLEMENT_OPTIONS = [
  { value: "0", label: "All" },
  { value: "Settled", label: "Settled" },
  { value: "Not Settled", label: "Not Settled" },
  { value: "Pending Settlement", label: "Pending Settlement" },
];

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

function orderStatusLabel(status: unknown): string {
  return status === "SUC" ? "SUCCESS" : "REJECTED";
}

function settlementStatusLabel(status: unknown): string {
  const s = String(status ?? "");
  if (s === "Not Settled") return "NOT SETTLED";
  if (s === "Pending Settlement") return "PENDING SETTLEMENT";
  if (s === "Settled") return "SETTLED";
  return s;
}

function formatTransDate(value: unknown): string {
  if (value == null || value === "") return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "MMM d, yyyy");
}

function orderStatusRenderer(
  p: ICellRendererParams<OnlinePaymentsComparativeRow>,
) {
  return orderStatusLabel(p.data?.order_status);
}

function settlementRenderer(
  p: ICellRendererParams<OnlinePaymentsComparativeRow>,
) {
  return settlementStatusLabel(p.data?.Settlement_Status);
}

export default function OnlinePaymentsComparativeReportPage() {
  const orgCode =
    typeof window !== "undefined"
      ? window.localStorage.getItem("orgCode")
      : null;

  const [fromDate, setFromDate] = useState<Date | null>(new Date());
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [collegeId, setCollegeId] = useState<string>("0");
  const [statusId, setStatusId] = useState<string>("0");
  const [loadKey, setLoadKey] = useState<string | null>(null);
  const [dataDetails, setDataDetails] = useState("");
  const [search, setSearch] = useState("");
  const excelRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const collegeNum = Number(collegeId);
  const logoUrl = useCollegeLogo(collegeNum > 0 ? collegeNum : null);

  const { data: colleges = [], isLoading: loadingColleges } = useQuery({
    queryKey: ["OnlinePaymentsComparative", "colleges"],
    queryFn: () => listActiveCollegesForGeneralSettings(),
  });

  const collegeOptions = useMemo(
    () => [
      { value: "0", label: "All" },
      ...colleges.map((c) => ({
        value: String(c.collegeId),
        label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
      })),
    ],
    [colleges],
  );

  const {
    data: rows = [],
    isFetching,
    error,
    isSuccess,
    isError,
  } = useQuery({
    queryKey: QK.onlinePaymentsComparative(loadKey ?? ""),
    queryFn: () => {
      const p = JSON.parse(loadKey!) as {
        collegeId: number;
        settlementStatus: string;
        fromDate: string;
        toDate: string;
      };
      return fetchOnlinePaymentsComparative(p);
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
        __rowKey: `${row.tracking_id ?? ""}|${row.hallticket_number ?? ""}|${i}`,
      })),
    [filteredRows],
  );

  const columnDefs = useMemo<ColDef<OnlinePaymentsComparativeRow>[]>(
    () => [
      {
        colId: "siNo",
        headerName: "SI.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        field: "college_code",
        headerName: "College",
        minWidth: 100,
      },
      {
        field: "student_name",
        headerName: "Student Name",
        minWidth: 140,
      },
      {
        field: "hallticket_number",
        headerName: "Hallticket Number",
        minWidth: 130,
      },
      {
        field: "payment_gateway_type",
        headerName: "Payment Gateway Type",
        minWidth: 140,
      },
      { field: "bank_ref_no", headerName: "Bank Ref No", minWidth: 120 },
      { field: "tracking_id", headerName: "Transaction Id", minWidth: 130 },
      { field: "payment_mode", headerName: "Payment Mode", minWidth: 110 },
      { field: "card_name", headerName: "Card Name", minWidth: 110 },
      { field: "amount", headerName: "Amount", minWidth: 100 },
      {
        colId: "trans_date",
        headerName: "Transaction Date",
        minWidth: 130,
        valueGetter: (p) => formatTransDate(p.data?.trans_date),
      },
      {
        colId: "order_status",
        headerName: "Transaction Status",
        minWidth: 130,
        cellRenderer: orderStatusRenderer,
      },
      {
        field: "settled_amount",
        headerName: "Settled Amount",
        minWidth: 120,
      },
      {
        field: "settlementdate",
        headerName: "Settlement Date",
        minWidth: 120,
      },
      {
        colId: "Settlement_Status",
        headerName: "Settlement Status",
        minWidth: 140,
        cellRenderer: settlementRenderer,
      },
    ],
    [],
  );

  function handleGetList() {
    if (!fromDate || !toDate) {
      toastInfo("Please select from and to dates.");
      return;
    }
    if (fromDate.getTime() > toDate.getTime()) {
      setToDate(fromDate);
    }
    const from = format(fromDate, "yyyy-MM-dd");
    const to = format(
      fromDate.getTime() > (toDate?.getTime() ?? 0) ? fromDate : toDate,
      "yyyy-MM-dd",
    );
    const collegeLabel =
      collegeNum === 0
        ? "All"
        : collegeOptions.find((o) => o.value === collegeId)?.label || "All";
    const statusLabel =
      statusId === "0"
        ? "All"
        : SETTLEMENT_OPTIONS.find((o) => o.value === statusId)?.label || "All";
    setDataDetails(`${from}-${to} / ${collegeLabel} / ${statusLabel}`);
    setSearch("");
    resetApiToast();
    setLoadKey(
      JSON.stringify({
        collegeId: collegeNum,
        settlementStatus: statusId === "0" ? "" : statusId,
        fromDate: from,
        toDate: to,
      }),
    );
  }

  function handleExportExcel() {
    if (!excelRef.current) return;
    exportHtmlTableAsExcel(
      excelRef.current,
      " Online Payments Comparative Report",
    );
  }

  function handlePrint() {
    if (!printRef.current) return;
    printElementInIframe(
      printRef.current,
      "Online Payments Comparative Report",
      {
        extraCss: `
        @page { margin: 0.8cm; size: landscape; }
        html, body { background: #fff !important; }
        .cmp-print { width: 100%; color: #000; }
        .cmp-print .title, .cmp-print .title-2 {
          text-align: left !important;
          font-weight: 550 !important;
          margin: 2px 0 !important;
        }
        .cmp-print .title-3 { font-size: 12px; margin-top: 6px; }
        .cmp-print table { width: 100%; border-collapse: collapse; }
        .cmp-print th, .cmp-print td {
          border: 1px solid #96aacb; padding: 4px 6px; font-size: 10px;
        }
        .cmp-print th {
          background: #C3D9FF !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .cmp-print img.portraitLogo {
          height: 80px; width: auto; max-width: 120px; object-fit: contain;
        }
      `,
      },
    );
  }

  const resultsVisible = loadKey != null && !isFetching && rows.length > 0;

  useEffect(() => {
    if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
      setToDate(fromDate);
    }
  }, [fromDate, toDate]);

  return (
    <FilteredListPage<OnlinePaymentsComparativeRow>
      title="Online Payments Comparative Report"
      className="relative"
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[150px] flex-1">
            <DatePicker
              label="From Date"
              value={fromDate}
              onChange={(d) => {
                setFromDate(d);
                setLoadKey(null);
                setDataDetails("");
              }}
              maxDate={toDate ?? undefined}
            />
          </div>
          <div className="min-w-[150px] flex-1">
            <DatePicker
              label="To Date"
              value={toDate}
              onChange={(d) => {
                setToDate(d);
                setLoadKey(null);
                setDataDetails("");
              }}
              minDate={fromDate ?? undefined}
            />
          </div>
          <div className="min-w-[160px] flex-1">
            <Select
              label="College"
              value={collegeId}
              onChange={(v) => {
                setCollegeId(v ?? "0");
                setLoadKey(null);
                setDataDetails("");
              }}
              options={collegeOptions}
              placeholder="College"
              isLoading={loadingColleges}
            />
          </div>
          <div className="min-w-[160px] flex-1">
            <Select
              label="Settlement Status"
              value={statusId}
              onChange={(v) => {
                setStatusId(v ?? "0");
                setLoadKey(null);
                setDataDetails("");
              }}
              options={SETTLEMENT_OPTIONS}
              placeholder="Settlement Status"
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={isFetching || !fromDate || !toDate}
            onClick={handleGetList}
          >
            {isFetching ? "Loading…" : "Get List"}
          </Button>
        </div>
      }
      filtersFooter={
        resultsVisible && dataDetails ? (
          <p className="text-sm font-semibold text-blue-600">
            Online Payments Comparative Report-{dataDetails}
          </p>
        ) : null
      }
      rowData={tableRows}
      columnDefs={columnDefs}
      loading={isFetching}
      resultsVisible={resultsVisible}
      height="auto"
      pagination
      columnFilters={false}
      getRowId={(p) => String(p.data?.__rowKey ?? "")}
      toolbar={{
        search: false,
        exportExcel: true,
        exportPdf: false,
        columnPicker: false,
        excelDocumentTitle: "Online Payments Comparative Report",
        excelFileName: "Online Payments Comparative Report.xls",
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
          <h3>Online Payments Comparative Report - {dataDetails}</h3>
          <table>
            <thead>
              <tr>
                <th style={TH}>SI.No</th>
                <th style={TH}>College</th>
                <th style={TH}>Student Name</th>
                <th style={TH}>Hallticket Number</th>
                <th style={TH}>Payment Gateway Type</th>
                <th style={TH}>Bank Ref No</th>
                <th style={TH}>Transaction Id</th>
                <th style={TH}>Payment Mode</th>
                <th style={TH}>Card Name</th>
                <th style={TH}>Amount</th>
                <th style={TH}>Transaction Date</th>
                <th style={TH}>Transaction Status</th>
                <th style={TH}>Settled Amount</th>
                <th style={TH}>Settlement Date</th>
                <th style={TH}>Settlement Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, i) => (
                <tr key={`excel-${i}`}>
                  <td style={TD}>{i + 1}</td>
                  <td style={TD}>{String(row.college_code ?? "")}</td>
                  <td style={TD}>{String(row.student_name ?? "")}</td>
                  <td style={TD}>{String(row.hallticket_number ?? "")}</td>
                  <td style={TD}>{String(row.payment_gateway_type ?? "")}</td>
                  <td style={TD}>{String(row.bank_ref_no ?? "")}</td>
                  <td style={TD}>{String(row.tracking_id ?? "")}</td>
                  <td style={TD}>{String(row.payment_mode ?? "")}</td>
                  <td style={TD}>{String(row.card_name ?? "")}</td>
                  <td style={TD}>{String(row.amount ?? "")}</td>
                  <td style={TD}>{formatTransDate(row.trans_date)}</td>
                  <td style={TD}>{orderStatusLabel(row.order_status)}</td>
                  <td style={TD}>{String(row.settled_amount ?? "")}</td>
                  <td style={TD}>{String(row.settlementdate ?? "")}</td>
                  <td style={TD}>
                    {settlementStatusLabel(row.Settlement_Status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {resultsVisible ? (
        <div className="pointer-events-none absolute -left-[9999px] top-0 w-[1200px] bg-white text-black">
          <div ref={printRef} className="cmp-print bg-white p-4 text-black">
            {orgCode !== "SUK" ? (
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
                <div>
                  <p className="title">{dataDetails}</p>
                  <p className="title-2">Online Payments Comparative Report</p>
                  <p className="title-3">
                    * You have to upload Settlement Report(.xls) which is
                    received from Bank or Payment Gateway Team to get updated
                    Comparative Report
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl || DEFAULT_COLLEGE_LOGO}
                  alt=""
                  className="mb-2 max-w-full"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.src.endsWith("default_logo.png")) {
                      img.src = DEFAULT_COLLEGE_LOGO;
                    }
                  }}
                />
                <p className="title">Online Payments Comparative Report</p>
                <p className="title-2">{dataDetails}</p>
                <p className="title-3">
                  * You have to upload Settlement Report(.xls) which is received
                  from Bank or Payment Gateway Team to get updated Comparative
                  Report
                </p>
              </>
            )}
            <table>
              <thead>
                <tr>
                  <th>SI.No</th>
                  <th>College</th>
                  <th>Student Name</th>
                  <th>Hallticket Number</th>
                  <th>Payment Gateway Type</th>
                  <th>Bank Ref No</th>
                  <th>Transaction Id</th>
                  <th>Payment Mode</th>
                  <th>Card Name</th>
                  <th>Amount</th>
                  <th>Transaction Date</th>
                  <th>Transaction Status</th>
                  <th>Settled Amount</th>
                  <th>Settlement Date</th>
                  <th>Settlement Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, i) => (
                  <tr key={`print-${i}`}>
                    <td>{i + 1}</td>
                    <td>{String(row.college_code ?? "")}</td>
                    <td>{String(row.student_name ?? "")}</td>
                    <td>{String(row.hallticket_number ?? "")}</td>
                    <td>{String(row.payment_gateway_type ?? "")}</td>
                    <td>{String(row.bank_ref_no ?? "")}</td>
                    <td>{String(row.tracking_id ?? "")}</td>
                    <td>{String(row.payment_mode ?? "")}</td>
                    <td>{String(row.card_name ?? "")}</td>
                    <td>{String(row.amount ?? "")}</td>
                    <td>{formatTransDate(row.trans_date)}</td>
                    <td>{orderStatusLabel(row.order_status)}</td>
                    <td>{String(row.settled_amount ?? "")}</td>
                    <td>{formatTransDate(row.settlementdate)}</td>
                    <td>{String(row.Settlement_Status ?? "")}</td>
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
