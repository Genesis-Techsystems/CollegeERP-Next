"use client";

/**
 * Angular parity: user-management/user-logs
 * Filters: from/to Date (placeholders "Date"), Get List
 * API: GET api/auth/authdetails?loginTime=&logoutTime=&size=50
 * Columns: SI.No, User, Login, Logout, User Agent, IP Address
 * Table shown only after a successful Get List with rows (Angular *ngIf length > 0)
 * Date change clears the list. Print/download commented out in Angular — none here.
 * No modals.
 */

import { useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format, isValid, parseISO, startOfDay } from "date-fns";
import { DatePicker } from "@/common/components/date-picker";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";
import { rowIndexGetter } from "@/lib/utils";
import { listUserLogs, type UserLog } from "@/services";

/** Angular `date:'medium'` ≈ `MMM d, yyyy, h:mm:ss a` */
function formatMedium(value: unknown): string {
  if (value == null || value === "") return "";
  try {
    const d =
      typeof value === "string"
        ? parseISO(value)
        : value instanceof Date
          ? value
          : new Date(String(value));
    if (!isValid(d)) return String(value);
    return format(d, "MMM d, yyyy, h:mm:ss a");
  } catch {
    return String(value);
  }
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 76,
    flex: 0,
  } as ColDef<UserLog>,
  userName: {
    field: "userName",
    headerName: "User",
    minWidth: 140,
  } as ColDef<UserLog>,
  loginTime: {
    field: "loginTime",
    headerName: "Login",
    minWidth: 180,
  } as ColDef<UserLog>,
  logoutTime: {
    field: "logoutTime",
    headerName: "Logout",
    minWidth: 180,
  } as ColDef<UserLog>,
  userAgent: {
    field: "userAgent",
    headerName: "User Agent",
    minWidth: 220,
    flex: 1,
  } as ColDef<UserLog>,
  ipAddress: {
    field: "ipAddress",
    headerName: "IP Address",
    minWidth: 130,
  } as ColDef<UserLog>,
};

function emptyLoginRenderer(p: ICellRendererParams<UserLog>) {
  if (p.data?.loginTime == null) return null;
  return formatMedium(p.data.loginTime);
}

function emptyLogoutRenderer(p: ICellRendererParams<UserLog>) {
  if (p.data?.logoutTime == null) return null;
  return formatMedium(p.data.logoutTime);
}

export default function UserLogsPage() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [fromDate, setFromDate] = useState<Date | null>(today);
  const [toDate, setToDate] = useState<Date | null>(today);
  const [rows, setRows] = useState<UserLog[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [loading, setLoading] = useState(false);

  const columnDefs = useMemo<ColDef<UserLog>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.userName,
      { ...COL_DEFS.loginTime, cellRenderer: emptyLoginRenderer },
      { ...COL_DEFS.logoutTime, cellRenderer: emptyLogoutRenderer },
      COL_DEFS.userAgent,
      COL_DEFS.ipAddress,
    ],
    [],
  );

  function clearList() {
    setRows([]);
    setHasFetched(false);
  }

  async function getUserLogs() {
    if (!fromDate || !toDate) {
      toastError("Please select from and to dates");
      return;
    }
    setLoading(true);
    clearList();
    try {
      const result = await listUserLogs(fromDate, toDate);
      if (!result.success) {
        toastError(result.message || "Failed to load user logs");
        return;
      }
      setRows(result.rows);
      setHasFetched(true);
      toastSuccess(result.message || "Success");
    } catch (e) {
      toastError(e, "Failed to load user logs");
    } finally {
      setLoading(false);
    }
  }

  const showTable = hasFetched && rows.length > 0;

  return (
    <FilteredListPage
      title="User Logs"
      filters={
        <div className="flex flex-wrap items-end gap-3">
          <DatePicker
            label="Date"
            placeholder="Date"
            value={fromDate}
            maxDate={today}
            displayFormat="dd/MM/yyyy"
            className="w-[12rem]"
            onChange={(d) => {
              setFromDate(d);
              clearList();
              if (d && toDate && toDate < d) setToDate(d);
            }}
          />
          <DatePicker
            label="Date"
            placeholder="Date"
            value={toDate}
            minDate={fromDate ?? undefined}
            displayFormat="dd/MM/yyyy"
            className="w-[12rem]"
            onChange={(d) => {
              setToDate(d);
              clearList();
            }}
          />
          <Button
            type="button"
            size="sm"
            disabled={loading || !fromDate || !toDate}
            onClick={() => void getUserLogs()}
          >
            {loading ? "Loading…" : "Get List"}
          </Button>
        </div>
      }
      rowData={showTable ? rows : undefined}
      columnDefs={showTable ? columnDefs : undefined}
      loading={loading}
      pagination={showTable}
      toolbar={
        showTable
          ? {
              search: true,
              searchPlaceholder: "Search",
              exportPdf: false,
            }
          : undefined
      }
      body={
        showTable ? undefined : (
          <p className="px-1 py-6 text-sm text-muted-foreground">
            {loading
              ? "Loading user logs…"
              : hasFetched
                ? "No user logs for the selected date range."
                : "Select dates and click Get List to view user logs."}
          </p>
        )
      }
    />
  );
}
