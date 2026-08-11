"use client";

/**
 * Biometric Device Log Report —
 * Angular `reports/student-attendance-reports/student-biometric-device-report`
 * (`StudentBiometricDeviceReportComponent`) parity.
 *
 * Devices: `domain/list/EttlDevices`.
 * User search: `getAllRecords/s_get_biometric_users` — fired only after 4+ chars typed.
 * Log data: `getAllRecords/s_get_combined_device_logs`
 *   (`in_user_id`, `in_start_date`, `in_end_date`, `in_device_id`, `is_std_flag`).
 * Columns are dynamic — built from `Object.keys()` of the first result row.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColDef } from "ag-grid-community";
import { format } from "date-fns";
import { FileSpreadsheet, Printer } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { Select, type SelectOption } from "@/common/components/select";
import {
  buildHtmlTable,
  escapeHtml,
  exportHtmlTableAsExcel,
} from "@/common/export-html-table";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useSessionContext } from "@/context/SessionContext";
import { DEFAULT_COLLEGE_LOGO, useCollegeLogo } from "@/hooks/useCollegeLogo";
import { getErrorMessage } from "@/lib/errors";
import { printHtmlInIframe } from "@/lib/print";
import { resolveReportCatalogHref } from "@/lib/report-catalog";
import { toastError, toastInfo } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import {
  fetchBiometricDevices,
  fetchCombinedDeviceLogs,
  searchBiometricUsers,
  type BiometricReportRow,
} from "@/services";
import {
  attendancePrintShell,
  resolveAttendancePrintLogo,
  toPrintLogoUrl,
} from "../_lib/attendance-report-print";

type AnyRow = BiometricReportRow;
type IsForValue = "" | "EMP" | "STD";

const REPORT_TITLE = "Biometric Log Report";

const IS_FOR_OPTIONS: SelectOption[] = [
  { value: "", label: "All" },
  { value: "EMP", label: "Employee" },
  { value: "STD", label: "Student" },
];

const ALL_USER_OPTION: SelectOption = { value: "0", label: "All" };

function num(row: AnyRow | null | undefined, key: string): number {
  if (!row) return 0;
  const n = Number(row[key]);
  return Number.isFinite(n) ? n : 0;
}

function text(row: AnyRow | null | undefined, key: string): string {
  if (!row) return "";
  const v = row[key];
  return v == null ? "" : String(v);
}

export default function BiometricDeviceLogsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSessionContext();
  const sessionCollegeId = user?.collegeId ?? null;
  const collegeName = String(user?.collegeName ?? "");
  const collegeLogo = useCollegeLogo(sessionCollegeId);

  const [devices, setDevices] = useState<AnyRow[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isFor, setIsFor] = useState<IsForValue>("");
  const [userId, setUserId] = useState<string | null>("0");
  const [userOptions, setUserOptions] = useState<SelectOption[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [fDate, setFDate] = useState<Date | null>(() => new Date());
  const [tDate, setTDate] = useState<Date | null>(() => new Date());

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [dynamicColumns, setDynamicColumns] = useState<string[]>([]);
  const [dataDetails, setDataDetails] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [showTable, setShowTable] = useState(false);

  const clearResults = useCallback(() => {
    setRows([]);
    setDynamicColumns([]);
    setShowTable(false);
    setDataDetails("");
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingDevices(true);
    void fetchBiometricDevices()
      .then((list) => {
        if (cancelled) return;
        setDevices(list);
        // Angular: `staffForm.get('deviceId').setValue(this.devices[0]?.deviceId)`
        if (list[0]) setDeviceId(String(num(list[0], "deviceId")));
      })
      .catch((err) => {
        if (!cancelled) toastError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingDevices(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const deviceOptions = useMemo<SelectOption[]>(
    () =>
      devices.map((d) => ({
        value: String(num(d, "deviceId")),
        label: text(d, "devicesName") || String(num(d, "deviceId")),
      })),
    [devices],
  );

  const userSelectOptions = useMemo<SelectOption[]>(
    () => [ALL_USER_OPTION, ...userOptions],
    [userOptions],
  );

  const handleUserSearch = useCallback(
    (term: string) => {
      const q = term.trim();
      if (q.length <= 4) {
        setUserOptions([]);
        return;
      }
      setUserSearchLoading(true);
      void searchBiometricUsers({ searchStr: q, isEmployeeStudent: isFor })
        .then((list) => {
          setUserOptions(
            list.map((r) => ({
              value: String(num(r, "UserID")),
              label: `${text(r, "User_name") || "—"} (${num(r, "UserID")})`,
            })),
          );
        })
        .catch((err) => toastError(getErrorMessage(err)))
        .finally(() => setUserSearchLoading(false));
    },
    [isFor],
  );

  const onDeviceChange = (v: string | null) => {
    setDeviceId(v);
    setIsFor("");
    setUserId("0");
    setUserOptions([]);
    clearResults();
  };

  const onIsForChange = (v: string | null) => {
    setIsFor((v ?? "") as IsForValue);
    clearResults();
  };

  const columnDefs = useMemo<ColDef<AnyRow>[]>(() => {
    const cols: ColDef<AnyRow>[] = [
      {
        headerName: "S.No",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
    ];
    for (const key of dynamicColumns) {
      cols.push({ field: key, headerName: key, minWidth: 150 });
    }
    return cols;
  }, [dynamicColumns]);

  const handleGetList = async () => {
    if (!deviceId) {
      toastInfo("Device is required");
      return;
    }
    if (!fDate) {
      toastInfo("From Date is required");
      return;
    }
    if (!tDate) {
      toastInfo("To Date is required");
      return;
    }

    const details = `${format(fDate, "yyyy-MMM-dd")} - ${format(tDate, "yyyy-MMM-dd")}`;
    setLoadingList(true);
    clearResults();
    setDataDetails(details);
    try {
      const raw = await fetchCombinedDeviceLogs({
        userId: userId ?? "0",
        startDate: format(fDate, "yyyy-MM-dd"),
        endDate: format(tDate, "yyyy-MM-dd"),
        deviceId,
        isFor,
      });
      if (raw.length === 0) {
        toastInfo("No records found.");
        return;
      }
      setDynamicColumns(Object.keys(raw[0] ?? {}));
      setRows(raw);
      setShowTable(true);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setLoadingList(false);
    }
  };

  const excelColumns = useMemo(
    () => [
      { key: "siNo", header: "S.No" },
      ...dynamicColumns.map((c) => ({ key: c, header: c })),
    ],
    [dynamicColumns],
  );

  const exportFlatRows = useMemo(
    () =>
      rows.map((row, i) => ({
        siNo: i + 1,
        ...row,
      })),
    [rows],
  );

  const handleExcelExport = useCallback(() => {
    if (exportFlatRows.length === 0) {
      toastError("No records to export.");
      return;
    }
    const headerHtml = `<div style="text-align:center;margin-bottom:12px;">
      <div style="font-size:14px;font-weight:bold;">${escapeHtml(REPORT_TITLE)}${dataDetails ? ` ( ${escapeHtml(dataDetails)} )` : ""}</div>
    </div>`;
    const tableHtml = buildHtmlTable(
      excelColumns,
      exportFlatRows as Record<string, unknown>[],
    );
    exportHtmlTableAsExcel(`${REPORT_TITLE}.xls`, tableHtml, headerHtml);
  }, [dataDetails, excelColumns, exportFlatRows]);

  const handlePrintReport = useCallback(async () => {
    if (exportFlatRows.length === 0) {
      toastError("No records to print.");
      return;
    }
    const logoSrc = await resolveAttendancePrintLogo(
      null,
      sessionCollegeId ?? 0,
      collegeLogo || DEFAULT_COLLEGE_LOGO,
    );
    const fallbackLogo = toPrintLogoUrl(DEFAULT_COLLEGE_LOGO);
    const tableHtml = buildHtmlTable(
      excelColumns,
      exportFlatRows as Record<string, unknown>[],
    );
    printHtmlInIframe(
      attendancePrintShell({
        title: escapeHtml(REPORT_TITLE),
        logoSrc: escapeHtml(logoSrc),
        fallbackLogo: escapeHtml(fallbackLogo),
        collegeName: escapeHtml(collegeName || "College"),
        dataDetails: dataDetails ? escapeHtml(`( ${dataDetails} )`) : undefined,
        tableHtml,
      }),
    );
  }, [
    collegeLogo,
    collegeName,
    dataDetails,
    excelColumns,
    exportFlatRows,
    sessionCollegeId,
  ]);

  const goBack = () => {
    router.push(resolveReportCatalogHref(searchParams.get("path")));
  };

  return (
    <FilteredListPage<AnyRow>
      title={
        showTable && dataDetails
          ? `${REPORT_TITLE} ( ${dataDetails} )`
          : REPORT_TITLE
      }
      filters={
        <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-12">
          <div className="md:col-span-3">
            <Select
              label="Device"
              required
              value={deviceId}
              onChange={onDeviceChange}
              options={deviceOptions}
              isLoading={loadingDevices}
            />
          </div>
          <div className="md:col-span-3">
            <Select
              label="Is For"
              value={isFor}
              onChange={onIsForChange}
              options={IS_FOR_OPTIONS}
              searchable={false}
            />
          </div>
          <div className="md:col-span-3">
            <Select
              label="User"
              value={userId}
              onChange={(v) => {
                setUserId(v ?? "0");
                clearResults();
              }}
              options={userSelectOptions}
              onSearch={handleUserSearch}
              isLoading={userSearchLoading}
              placeholder="Search by User Name or UserId"
            />
          </div>
          <div className="md:col-span-3" />
          <div className="md:col-span-3">
            <DatePicker
              label="From Date"
              required
              value={fDate}
              onChange={(d) => {
                setFDate(d);
                clearResults();
              }}
              displayFormat="dd/MM/yyyy"
              clearable={false}
            />
          </div>
          <div className="md:col-span-3">
            <DatePicker
              label="To Date"
              required
              value={tDate}
              onChange={(d) => {
                setTDate(d);
                clearResults();
              }}
              displayFormat="dd/MM/yyyy"
              clearable={false}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2 pb-0.5 md:col-span-4">
            <Button
              type="button"
              className="h-9 w-fit px-4"
              disabled={loadingList}
              onClick={() => void handleGetList()}
            >
              {loadingList ? "Loading…" : "Get List"}
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
      rowData={showTable ? rows : []}
      columnDefs={columnDefs}
      loading={loadingList}
      resultsVisible={showTable}
      hideEmptyGrid
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search…",
        exportExcel: false,
        exportPdf: false,
      }}
      toolbarTrailing={
        showTable ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-9 px-3 text-[12px]"
              onClick={handleExcelExport}
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Export Excel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-9 px-3 text-[12px]"
              onClick={() => void handlePrintReport()}
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print Report
            </Button>
          </div>
        ) : undefined
      }
    />
  );
}
