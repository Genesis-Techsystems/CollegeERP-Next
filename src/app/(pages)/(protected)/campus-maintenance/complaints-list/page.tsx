"use client";

import { useCallback, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ColDef, GridApi, ICellRendererParams } from "ag-grid-community";
import { format } from "date-fns";
import { FileSpreadsheet, Printer } from "lucide-react";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { useSession } from "@/hooks/useSession";
import { useCollegeLogo, DEFAULT_COLLEGE_LOGO } from "@/hooks/useCollegeLogo";
import { QK } from "@/lib/query-keys";
import { printHtmlInIframe } from "@/lib/print";
import {
  buildHtmlTable,
  escapeHtml,
  exportHtmlTableAsExcel,
} from "@/common/export-html-table";
import { toastInfo } from "@/lib/toast";
import { listCampusIssues } from "@/services/campus-maintenance";
import type { CampusIssue } from "@/types/campus-maintenance";
import { rowIndexGetter } from "@/lib/utils";
import ComplaintOverviewModal from "./ComplaintOverviewModal";

const REPORT_TITLE = "Complaint List";

/** Angular shows the workflow status code, falling back to its display name. */
function statusText(issue: CampusIssue | undefined): string {
  if (!issue) return "";
  return String(
    issue.aprvrejstatusCatCode ??
      issue.aprvrejstatusCatDisplayName ??
      issue.wfCode ??
      issue.wfName ??
      "",
  ).trim();
}

function serviceTypeText(issue: CampusIssue | undefined): string {
  if (!issue) return "";
  return String(
    issue.issueCategoryDisplayName ?? issue.issueCategoryCatCode ?? "",
  ).trim();
}

function raisedEmployeeText(issue: CampusIssue | undefined): string {
  if (!issue) return "";
  const name = String(issue.raisedEmpName ?? "").trim();
  const number = String(issue.raisedEmpNumber ?? "").trim();
  if (name && number) return `${name} - (${number})`;
  return name || number;
}

function dateText(value: unknown): string {
  if (value == null || value === "") return "-";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "MMM d, yyyy");
}

/** Angular print/export date format (dd/MM/yyyy). */
function reportDateText(value: unknown): string {
  if (value == null || value === "") return "-";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "dd/MM/yyyy");
}

function dash(value: string): string {
  return value.trim() === "" ? "-" : value;
}

// ─── Column shape ─────────────────────────────────────────────────────────────

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<CampusIssue>,
  issueTitle: {
    field: "issueTitle",
    headerName: "Complaint Title",
    minWidth: 200,
    flex: 2,
  } as ColDef<CampusIssue>,
  priority: {
    field: "issuepriorityCatDisplayName",
    headerName: "Priority",
    minWidth: 100,
    flex: 0.8,
  } as ColDef<CampusIssue>,
  date: {
    headerName: "Complaint Date",
    minWidth: 130,
    flex: 1,
    valueGetter: (p) => dateText(p.data?.issueLogDate),
  } as ColDef<CampusIssue>,
  raisedBy: {
    headerName: "Raised Employee",
    minWidth: 170,
    flex: 1.4,
    valueGetter: (p) => raisedEmployeeText(p.data),
  } as ColDef<CampusIssue>,
  expectedOn: {
    headerName: "Expected Resolve Date",
    minWidth: 150,
    flex: 1.1,
    valueGetter: (p) => dateText(p.data?.expectedResolvedOn),
  } as ColDef<CampusIssue>,
  status: {
    headerName: "Status",
    minWidth: 120,
    flex: 0.9,
    valueGetter: (p) => statusText(p.data),
  } as ColDef<CampusIssue>,
  actions: {
    headerName: "Actions",
    minWidth: 90,
    flex: 0,
    width: 90,
    sortable: false,
    filter: false,
  } as ColDef<CampusIssue>,
};

// ─── Report columns (Angular print / Excel layout) ────────────────────────────

const REPORT_COLUMNS: {
  key: string;
  header: string;
  value: (issue: CampusIssue, index: number) => string;
  html?: (issue: CampusIssue) => string;
}[] = [
  { key: "siNo", header: "S.No", value: (_issue, index) => String(index + 1) },
  {
    key: "issueTitle",
    header: "Complaint Title",
    value: (i) => dash(String(i.issueTitle ?? "")),
  },
  {
    key: "serviceType",
    header: "Service Type",
    value: (i) => dash(serviceTypeText(i)),
  },
  {
    key: "issueDescription",
    header: "Complaint Desc",
    value: (i) => dash(String(i.issueDescription ?? "")),
  },
  {
    key: "priority",
    header: "Priority",
    value: (i) => dash(String(i.issuepriorityCatDisplayName ?? "")),
  },
  {
    key: "complaintDate",
    header: "Complaint Date",
    value: (i) => reportDateText(i.issueLogDate),
  },
  {
    key: "raisedEmployee",
    header: "Raised Employee",
    value: (i) => dash(raisedEmployeeText(i)),
    html: (i) => {
      const name = String(i.raisedEmpName ?? "").trim();
      const number = String(i.raisedEmpNumber ?? "").trim();
      if (!name && !number) return "-";
      return `${escapeHtml(name)}${
        number
          ? `<br/><span style="color:#0c51a4">(${escapeHtml(number)})</span>`
          : ""
      }`;
    },
  },
  {
    key: "expectedDate",
    header: "Expected Date",
    value: (i) => reportDateText(i.expectedResolvedOn),
  },
  { key: "status", header: "Status", value: (i) => dash(statusText(i)) },
];

// ─── Renderers ────────────────────────────────────────────────────────────────

function statusRenderer(p: ICellRendererParams<CampusIssue>) {
  const text = statusText(p.data);
  if (!text) return null;
  return (
    <span className="rounded bg-[#ffe9a8] px-2 py-0.5 text-[11px] font-semibold uppercase text-[#7a5a00]">
      {text}
    </span>
  );
}

function raisedEmployeeRenderer(p: ICellRendererParams<CampusIssue>) {
  const name = String(p.data?.raisedEmpName ?? "").trim();
  const number = String(p.data?.raisedEmpNumber ?? "").trim();
  if (!name && !number) return null;
  return (
    <span>
      {name}
      {number ? (
        <>
          {name ? " - " : ""}
          <span className="text-[#0c51a4]">({number})</span>
        </>
      ) : null}
    </span>
  );
}

function makeActionsRenderer(
  onEdit: (issue: CampusIssue) => void,
  onView: (issue: CampusIssue) => void,
) {
  return (p: ICellRendererParams<CampusIssue>) => {
    const issue = p.data;
    if (!issue) return null;
    const isClosed = issue.aprvrejstatusCatCode === "CLOSED";
    return (
      <Button
        size="sm"
        variant="link"
        className="h-auto p-0 text-[12px] text-[#0c51a4]"
        onClick={() => (isClosed ? onView(issue) : onEdit(issue))}
      >
        View
      </Button>
    );
  };
}

// ─── Print (Angular `fa-print` → logo + college banner + report table) ────────

function printComplaintsReport(
  rows: CampusIssue[],
  collegeName: string,
  logoSrc: string,
) {
  const head = REPORT_COLUMNS.map(
    (c) => `<th>${escapeHtml(c.header)}</th>`,
  ).join("");
  const body = rows
    .map(
      (row, index) =>
        `<tr>${REPORT_COLUMNS.map(
          (c) =>
            `<td>${c.html ? c.html(row) : escapeHtml(c.value(row, index))}</td>`,
        ).join("")}</tr>`,
    )
    .join("");

  printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(REPORT_TITLE)}</title>
<style>
@page { size: A4 portrait; margin: 10mm; }
body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 8px; }
.banner { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.banner img { height: 44px; width: auto; object-fit: contain; }
.banner-text { flex: 1; text-align: center; color: #1a56a0; }
.banner-text .college { font-size: 13px; font-weight: 700; }
.banner-text .report { font-size: 12px; font-weight: 700; }
table { width: 100%; border-collapse: collapse; font-size: 8px; }
th, td { border: 1px solid #333; padding: 3px 4px; text-align: left; vertical-align: top; word-break: break-word; }
th { background: #fff; font-weight: 700; text-align: center; }
tr { break-inside: avoid; }
</style></head><body>
<div class="banner">
  <img src="${escapeHtml(logoSrc)}" alt="" />
  <div class="banner-text">
    <div class="college">${escapeHtml(collegeName)}</div>
    <div class="report">(${escapeHtml(REPORT_TITLE)} )</div>
  </div>
</div>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body></html>`);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComplaintsListPage() {
  const router = useRouter();
  const { user } = useSession();
  const collegeName = String(user?.collegeName ?? "");
  const collegeLogo = useCollegeLogo(user?.collegeId ?? null);
  const [overviewIssue, setOverviewIssue] = useState<CampusIssue | null>(null);
  const gridApiRef = useRef<GridApi<CampusIssue> | null>(null);

  const {
    data: issues,
    isLoading,
    invalidate,
  } = useCrudList<CampusIssue>({
    queryKey: QK.campusIssues.list(),
    queryFn: listCampusIssues,
  });

  /** Rows the grid currently shows (search / sort applied), like Angular. */
  const visibleRows = useCallback(() => {
    const api = gridApiRef.current;
    if (!api) return issues;
    const rows: CampusIssue[] = [];
    api.forEachNodeAfterFilterAndSort((node) => {
      if (node.data) rows.push(node.data);
    });
    return rows.length > 0 ? rows : issues;
  }, [issues]);

  const handlePrint = useCallback(() => {
    const rows = visibleRows();
    if (rows.length === 0) {
      toastInfo("No records to print.");
      return;
    }
    printComplaintsReport(
      rows,
      collegeName,
      collegeLogo || DEFAULT_COLLEGE_LOGO,
    );
  }, [visibleRows, collegeName, collegeLogo]);

  const handleExcel = useCallback(() => {
    const rows = visibleRows();
    if (rows.length === 0) {
      toastInfo("No records to export.");
      return;
    }
    const flatRows = rows.map((row, index) =>
      Object.fromEntries(
        REPORT_COLUMNS.map((c) => [c.key, c.value(row, index)]),
      ),
    );
    const headerHtml = `<div style="text-align:center;margin-bottom:12px;">
      <div style="font-size:14px;font-weight:bold;">${escapeHtml(collegeName)}</div>
      <div style="font-size:13px;font-weight:bold;">(${escapeHtml(REPORT_TITLE)} )</div>
    </div>`;
    const tableHtml = buildHtmlTable(
      REPORT_COLUMNS.map((c) => ({ key: c.key, header: c.header })),
      flatRows,
    );
    exportHtmlTableAsExcel(`${REPORT_TITLE}.xls`, tableHtml, headerHtml);
  }, [visibleRows, collegeName]);

  const columnDefs = useMemo<ColDef<CampusIssue>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.issueTitle,
      COL_DEFS.priority,
      COL_DEFS.date,
      { ...COL_DEFS.raisedBy, cellRenderer: raisedEmployeeRenderer },
      COL_DEFS.expectedOn,
      { ...COL_DEFS.status, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(
          (issue) =>
            router.push(
              `/campus-maintenance/add-complaints?id=${issue.managementIssueId}`,
            ),
          setOverviewIssue,
        ),
      },
    ],
    [router],
  );

  return (
    <ListPage
      title="Complaints List"
      rowData={issues}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      onGridApiReady={(api) => {
        gridApiRef.current = api;
      }}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportExcel: false,
        exportPdf: false,
      }}
      toolbarTrailing={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-9 px-3 text-[12px]"
            onClick={handleExcel}
          >
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
            Export Excel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9 px-3 text-[12px]"
            onClick={handlePrint}
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print Report
          </Button>
        </div>
      }
    >
      <ComplaintOverviewModal
        open={overviewIssue !== null}
        onClose={() => setOverviewIssue(null)}
        issue={overviewIssue}
        onSaved={invalidate}
      />
    </ListPage>
  );
}
