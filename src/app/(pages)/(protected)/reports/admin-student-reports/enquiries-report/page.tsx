"use client";

/**
 * Enquirers Report —
 * Angular `reports/admin-student-reports/enquiries-report` parity.
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
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo } from "@/lib/toast";
import { MINIO_URL } from "@/config/constants/api";
import {
  DEFAULT_COLLEGE_LOGO,
  useCollegeLogo,
} from "@/hooks/useCollegeLogo";
import {
  filterColleges,
  pickNum,
  pickText,
  type FilterRow,
} from "@/app/(pages)/(protected)/accounts-and-fees/fee-masters/_lib/fee-master-filters";
import {
  getCollegeById,
  getEnquiryApplicationSummary,
  getFeeMasterCollegeFilters,
} from "@/services";

const LOGO_FILTER_KEYS = [
  "logo_filename",
  "logoFilename",
  "logo",
  "clg_logo",
  "college_logo",
  "logo_path",
  "logoPath",
];

function isDefaultLogoUrl(url: string): boolean {
  return /default_logo\.png/i.test(url);
}

/** Angular: `MINIO + logo_filename` — absolute URL for print iframe. */
function toPrintLogoUrl(path: string | null | undefined): string {
  const raw = String(path ?? "").trim();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const fallback = origin
    ? `${origin}${DEFAULT_COLLEGE_LOGO}`
    : DEFAULT_COLLEGE_LOGO;
  if (!raw) return fallback;
  if (/^(https?:\/\/|data:)/i.test(raw)) return raw;
  if (raw.startsWith("/")) return origin ? `${origin}${raw}` : raw;
  const base = String(MINIO_URL ?? "").replace(/\/$/, "");
  if (base) return `${base}/${raw.replace(/^\/+/, "")}`;
  return fallback;
}

/** Embed logo so print iframe does not depend on MinIO/network timing. */
async function logoToDataUrl(src: string): Promise<string> {
  const abs = toPrintLogoUrl(src);
  if (abs.startsWith("data:")) return abs;
  try {
    const res = await fetch(abs, { mode: "cors", credentials: "omit" });
    if (!res.ok) return abs;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return abs;
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? abs));
      reader.onerror = () => resolve(abs);
      reader.readAsDataURL(blob);
    });
  } catch {
    return abs;
  }
}

async function resolveEnquiryPrintLogo(
  filterRow: FilterRow | null,
  collegeId: number,
  liveLogo: string,
): Promise<string> {
  const fromFilter = pickText(filterRow, LOGO_FILTER_KEYS);
  const fromHook =
    liveLogo && !isDefaultLogoUrl(liveLogo) ? liveLogo : "";
  let fromCollege = "";
  if (collegeId > 0) {
    try {
      const college = await getCollegeById(collegeId);
      fromCollege = college?.logo ? String(college.logo) : "";
    } catch {
      fromCollege = "";
    }
  }

  // Prefer a resolved non-default URL (filter/domain keys need MINIO; hook may already be absolute).
  for (const candidate of [fromCollege, fromFilter, fromHook, liveLogo]) {
    if (!candidate) continue;
    const url = toPrintLogoUrl(candidate);
    if (!isDefaultLogoUrl(url)) return logoToDataUrl(url);
  }
  return logoToDataUrl(DEFAULT_COLLEGE_LOGO);
}

type AnyRow = Record<string, unknown>;

type EnquiryRow = {
  date: string;
  student_name: string;
  gender: string;
  date_of_birth: string;
  father_name: string;
  mother_name: string;
  present_address: string;
};

const EXCEL_COLUMNS: { key: string; header: string }[] = [
  { key: "siNo", header: "SI.No" },
  { key: "date", header: "Date" },
  { key: "student_name", header: "Student Name" },
  { key: "gender", header: "Gender" },
  { key: "date_of_birth", header: "Date of Birth" },
  { key: "father_name", header: "Father's Name" },
  { key: "mother_name", header: "Mother's Name" },
  { key: "present_address", header: "Residential Adress" },
];

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<EnquiryRow>,
  date: {
    field: "date",
    headerName: "Date",
    minWidth: 110,
  } as ColDef<EnquiryRow>,
  studentName: {
    field: "student_name",
    headerName: "Student Name",
    minWidth: 160,
  } as ColDef<EnquiryRow>,
  gender: {
    field: "gender",
    headerName: "Gender",
    minWidth: 100,
  } as ColDef<EnquiryRow>,
  dateOfBirth: {
    field: "date_of_birth",
    headerName: "Date of Birth",
    minWidth: 120,
  } as ColDef<EnquiryRow>,
  fatherName: {
    field: "father_name",
    headerName: "Father's Name",
    minWidth: 140,
  } as ColDef<EnquiryRow>,
  motherName: {
    field: "mother_name",
    headerName: "Mother's Name",
    minWidth: 140,
  } as ColDef<EnquiryRow>,
  presentAddress: {
    field: "present_address",
    headerName: "Residential Adress",
    minWidth: 200,
  } as ColDef<EnquiryRow>,
};

function formatDateCell(value: unknown): string {
  if (value == null || String(value).trim() === "") return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "dd/MM/yyyy");
}

export default function EnquiriesReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const orgId = Number(
    globalThis?.localStorage?.getItem("organizationId") ?? 0,
  );
  const empId = Number(globalThis?.localStorage?.getItem("employeeId") ?? 0);

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<Date | null>(new Date());
  const [toDate, setToDate] = useState<Date | null>(new Date());

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [dataDetails, setDataDetails] = useState("");
  const [printDetails, setPrintDetails] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const collegeLogo = useCollegeLogo(collegeId ? Number(collegeId) : null);

  const clearResults = useCallback(() => {
    setRows([]);
    setShowTable(false);
    setDataDetails("");
    setPrintDetails("");
    setCollegeName("");
  }, []);

  const filtersQuery = useQuery({
    queryKey: QK.studentAdmissionReports.filters(orgId, empId),
    queryFn: () => getFeeMasterCollegeFilters(orgId, empId),
    enabled: orgId > 0 && empId > 0,
  });

  const filtersData = useMemo(
    () => (filtersQuery.data?.filtersData ?? []) as FilterRow[],
    [filtersQuery.data?.filtersData],
  );

  const collegeOptions = useMemo(
    () =>
      filterColleges(filtersData).map((r) => ({
        value: String(pickNum(r, ["fk_college_id", "collegeId"])),
        label: pickText(r, ["college_code", "collegeCode"]),
      })),
    [filtersData],
  );

  const selectedCollegeRow = useMemo(
    () =>
      filterColleges(filtersData).find(
        (r) =>
          String(pickNum(r, ["fk_college_id", "collegeId"])) ===
          String(collegeId ?? ""),
      ) ?? null,
    [filtersData, collegeId],
  );

  useEffect(() => {
    if (collegeId || collegeOptions.length === 0) return;
    setCollegeId(collegeOptions[0].value);
  }, [collegeId, collegeOptions]);

  const displayRows = useMemo<EnquiryRow[]>(
    () =>
      rows.map((row) => ({
        date: formatDateCell(row.date),
        student_name: String(row.student_name ?? ""),
        gender: String(row.gender ?? row.Gender ?? ""),
        date_of_birth: formatDateCell(row.date_of_birth),
        father_name: String(row.father_name ?? ""),
        mother_name: String(row.mother_name ?? ""),
        present_address: String(row.present_address ?? ""),
      })),
    [rows],
  );

  const exportRows = useMemo(
    () =>
      displayRows.map((row, i) => ({
        siNo: i + 1,
        ...row,
      })),
    [displayRows],
  );

  const columnDefs = useMemo<ColDef<EnquiryRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.date,
      COL_DEFS.studentName,
      COL_DEFS.gender,
      COL_DEFS.dateOfBirth,
      COL_DEFS.fatherName,
      COL_DEFS.motherName,
      COL_DEFS.presentAddress,
    ],
    [],
  );

  const handleGetList = async () => {
    const cid = Number(collegeId ?? 0);
    if (!cid) {
      toastInfo("College is required");
      return;
    }
    if (!fromDate || !toDate) {
      toastInfo("From Date and To Date are required");
      return;
    }
    const fromYmd = format(fromDate, "yyyy-MM-dd");
    const toYmd = format(toDate, "yyyy-MM-dd");
    const collegeCode =
      pickText(selectedCollegeRow, ["college_code", "collegeCode"]) ||
      collegeOptions.find((o) => o.value === collegeId)?.label ||
      "";
    const name =
      pickText(selectedCollegeRow, ["college_name", "collegeName"]) ||
      collegeCode;
    // Angular print subtitle: `GIT01 / ( 2026-Jul-31 ) ( 2026-Aug-07 )`
    const printLine = `${collegeCode} / ( ${format(fromDate, "yyyy-MMM-dd")} ) ( ${format(toDate, "yyyy-MMM-dd")} )`;
    const details = `${collegeCode} - ${format(fromDate, "dd/MM/yyyy")} to ${format(toDate, "dd/MM/yyyy")}`;

    setLoadingList(true);
    clearResults();
    setDataDetails(details);
    setPrintDetails(printLine);
    setCollegeName(name);
    try {
      const raw = await getEnquiryApplicationSummary({
        collegeId: cid,
        fromDate: fromYmd,
        toDate: toYmd,
      });
      if (raw.length === 0) {
        toastInfo("No enquirers found.");
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

  const handleExcelExport = () => {
    if (exportRows.length === 0) {
      toastInfo("No records to export.");
      return;
    }
    const headerHtml = `<div style="text-align:center;margin-bottom:12px;">
      <div style="font-size:18px;font-weight:600;">${escapeHtml(collegeName || "College")}</div>
      <div style="font-size:14px;font-weight:550;margin-top:4px;">${escapeHtml(printDetails || dataDetails)}</div>
      <div style="font-size:16px;font-weight:550;margin-top:4px;">Enquirers Report</div>
    </div>`;
    const tableHtml = buildHtmlTable(EXCEL_COLUMNS, exportRows);
    exportHtmlTableAsExcel("Enquirers Report.xls", tableHtml, headerHtml);
  };

  const printReport = async () => {
    if (exportRows.length === 0) {
      toastInfo("No records to print.");
      return;
    }
    const cid = Number(collegeId ?? 0);
    const logoSrc = await resolveEnquiryPrintLogo(
      selectedCollegeRow,
      cid,
      collegeLogo || DEFAULT_COLLEGE_LOGO,
    );
    const fallbackLogo = toPrintLogoUrl(DEFAULT_COLLEGE_LOGO);
    const tableHtml = buildHtmlTable(EXCEL_COLUMNS, exportRows);
    // Angular print-Section: logo left + college name + date line + title
    printHtmlInIframe(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Enquirers Report</title>
<style>
@page{margin:12mm}
body{font-family:Arial,sans-serif;padding:12px;color:#111;margin:0}
.header{display:flex;align-items:flex-start;gap:16px;margin-bottom:16px}
.header img{width:90px;height:auto;max-height:100px;object-fit:contain}
.header-text{flex:1;text-align:center}
.collegeName{font-size:24px;font-weight:600;margin:0 0 6px}
.title-2{font-size:19px;font-weight:550;margin:0 0 6px}
.title{font-size:20px;font-weight:550;margin:0}
table{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px}
th,td{border:1px solid #333;padding:6px 5px}
th{background:#f2f2f2}
</style></head><body>
<div class="header">
  <img src="${escapeHtml(logoSrc)}" alt="College Logo"
    onerror="this.onerror=null;this.src='${escapeHtml(fallbackLogo)}'" />
  <div class="header-text">
    <p class="collegeName">${escapeHtml(collegeName || "College")}</p>
    <p class="title-2">${escapeHtml(printDetails || dataDetails)}</p>
    <p class="title">Enquirers Report</p>
  </div>
</div>
${tableHtml}
</body></html>`);
  };

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  const pageTitle = showTable
    ? `Enquirers Report For : ${dataDetails}`
    : "Enquirers Report";

  return (
    <FilteredListPage<EnquiryRow>
      title={pageTitle}
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full min-w-[10rem] sm:w-[14rem]">
            <Select
              label="College"
              required
              value={collegeId}
              onChange={(v) => {
                setCollegeId(v);
                clearResults();
              }}
              options={collegeOptions}
              placeholder="College"
              isLoading={filtersQuery.isLoading}
            />
          </div>
          <div className="w-full min-w-[10rem] sm:w-[12rem]">
            <DatePicker
              label="From Date"
              value={fromDate}
              onChange={(d) => {
                setFromDate(d);
                clearResults();
              }}
              displayFormat="dd/MM/yyyy"
              maxDate={toDate ?? new Date()}
            />
          </div>
          <div className="w-full min-w-[10rem] sm:w-[12rem]">
            <DatePicker
              label="To Date"
              value={toDate}
              onChange={(d) => {
                setToDate(d);
                clearResults();
              }}
              displayFormat="dd/MM/yyyy"
              maxDate={new Date()}
              minDate={fromDate ?? undefined}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2 pb-0.5">
            <Button
              type="button"
              className="h-9 w-fit px-4"
              disabled={loadingList}
              onClick={() => void handleGetList()}
            >
              {loadingList ? "Loading…" : "Get Enquirers List"}
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
        </div>
      }
      rowData={showTable ? displayRows : []}
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
