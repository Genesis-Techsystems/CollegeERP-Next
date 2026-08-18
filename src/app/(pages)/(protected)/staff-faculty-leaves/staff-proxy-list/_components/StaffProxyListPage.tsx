"use client";

/**
 * Staff Proxy List — Angular `staff-faculty-leaves/staff-proxy-list`
 * (`StaffProxyListComponent`).
 *
 * Filter: Proxy Date. HOD → `staffproxiesbyempdept?departmentId=&proxyDate=`.
 * Principal → domain list `StaffProxy` (`college.collegeId` + `proxyDate`).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { DatePicker } from "@/common/components/date-picker";
import { FilteredListPage } from "@/components/layout";
import { useSessionContext } from "@/context/SessionContext";
import { useStaffLoginContext } from "@/hooks/useStaffLoginContext";
import { toastError } from "@/lib/toast";
import { listStaffProxiesForFacultyLeaves, toLeaveYmd } from "@/services";

type ProxyRow = Record<string, unknown>;

const PAGE_TITLE = "Staff Proxy List";

function readStorage(key: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage?.getItem(key) ?? "";
}

function formatProxyDate(value: unknown): string {
  if (value == null || value === "") return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function proxySubjectRenderer(p: ICellRendererParams<ProxyRow>) {
  const row = p.data;
  if (!row) return null;
  return (
    <span>
      {String(row.subjectName ?? "")}{" "}
      <span className="font-medium text-blue-600">
        ({String(row.proxySubjecttypeDisplayName ?? "")})
      </span>
    </span>
  );
}

function assignEmployeeRenderer(p: ICellRendererParams<ProxyRow>) {
  const row = p.data;
  if (!row) return null;
  const empNumber = row.assignedEmpNumber;
  return (
    <span>
      {String(row.assignedFirstName ?? "")}
      {empNumber != null && String(empNumber) !== "" ? (
        <span className="font-medium text-blue-600">
          {" "}
          ({String(empNumber)})
        </span>
      ) : null}
    </span>
  );
}

function proxyEmployeeRenderer(p: ICellRendererParams<ProxyRow>) {
  const row = p.data;
  if (!row) return null;
  const empNumber = row.proxyEmpNumber;
  return (
    <span>
      {String(row.proxyFirstName ?? "")}
      {empNumber != null && String(empNumber) !== "" ? (
        <span className="font-medium text-blue-600">
          {" "}
          ({String(empNumber)})
        </span>
      ) : null}
    </span>
  );
}

function proxyPeriodRenderer(p: ICellRendererParams<ProxyRow>) {
  const row = p.data;
  if (!row) return null;
  return (
    <span>
      {String(row.classTimingName ?? "")}{" "}
      <span className="font-medium text-blue-600">
        ({String(row.startTime ?? "")}-{String(row.endTime ?? "")})
      </span>
    </span>
  );
}

function courseRenderer(p: ICellRendererParams<ProxyRow>) {
  const row = p.data;
  if (!row) return null;
  return [
    row.collegeCode,
    row.courseName,
    row.groupName,
    row.courseYearName,
    row.groupSectionName,
  ]
    .filter((v) => v != null && String(v) !== "")
    .join("/");
}

const COL_DEFS = {
  subjectName: {
    field: "subjectName",
    headerName: "Proxy Subject",
    minWidth: 180,
  } as ColDef<ProxyRow>,
  assignedFirstName: {
    field: "assignedFirstName",
    headerName: "Assign Employee",
    minWidth: 170,
  } as ColDef<ProxyRow>,
  proxyFirstName: {
    field: "proxyFirstName",
    headerName: "Proxy Employee",
    minWidth: 170,
  } as ColDef<ProxyRow>,
  classTimingName: {
    field: "classTimingName",
    headerName: "Proxy Period",
    minWidth: 180,
  } as ColDef<ProxyRow>,
  collegeCode: {
    field: "collegeCode",
    headerName: "Course",
    minWidth: 240,
  } as ColDef<ProxyRow>,
  proxyDate: {
    field: "proxyDate",
    headerName: "Proxy Date",
    minWidth: 130,
    flex: 0,
  } as ColDef<ProxyRow>,
};

export function StaffProxyListPage() {
  const { user, isLoading: sessionLoading } = useSessionContext();
  const { deptId, isHod, isResolving } = useStaffLoginContext(
    user,
    sessionLoading,
  );

  const [proxyDate, setProxyDate] = useState<Date | null>(() => new Date());
  const [rows, setRows] = useState<ProxyRow[]>([]);
  const [loading, setLoading] = useState(false);

  const isPrincipal =
    Boolean(user?.isPrincipal) ||
    readStorage("isPRINCIPAL") === "true" ||
    readStorage("isPrincipal") === "true";
  const collegeId = Number(user?.collegeId ?? readStorage("collegeId") ?? 0);
  const hodFlag =
    isHod || readStorage("isHOD") === "true" || readStorage("isHod") === "true";

  const columnDefs = useMemo<ColDef<ProxyRow>[]>(
    () => [
      { ...COL_DEFS.subjectName, cellRenderer: proxySubjectRenderer },
      { ...COL_DEFS.assignedFirstName, cellRenderer: assignEmployeeRenderer },
      { ...COL_DEFS.proxyFirstName, cellRenderer: proxyEmployeeRenderer },
      { ...COL_DEFS.classTimingName, cellRenderer: proxyPeriodRenderer },
      { ...COL_DEFS.collegeCode, cellRenderer: courseRenderer },
      {
        ...COL_DEFS.proxyDate,
        valueFormatter: (p) => formatProxyDate(p.value),
      },
    ],
    [],
  );

  const loadStaffProxyList = useCallback(async () => {
    const date = toLeaveYmd(proxyDate);
    if (!date) {
      setRows([]);
      return;
    }
    if (isResolving) return;
    setLoading(true);
    try {
      const data = await listStaffProxiesForFacultyLeaves({
        isHod: hodFlag,
        isPrincipal,
        departmentId: 0,
        collegeId,
        proxyDate: date,
      });
      setRows(data);
    } catch (e) {
      setRows([]);
      toastError(e, "Failed to load staff proxy list");
    } finally {
      setLoading(false);
    }
  }, [collegeId, deptId, hodFlag, isPrincipal, isResolving, proxyDate]);

  useEffect(() => {
    void loadStaffProxyList();
  }, [loadStaffProxyList]);

  return (
    <FilteredListPage<ProxyRow>
      title={PAGE_TITLE}
      filters={
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DatePicker
            label="Proxy Date"
            value={proxyDate}
            onChange={setProxyDate}
            placeholder="Proxy Date"
            displayFormat="dd/MM/yyyy"
          />
        </div>
      }
      tableHeader={
        <div className="table-context-header">
          <span
            className="material-icons table-context-header__icon"
            aria-hidden
          >
            school
          </span>
          <strong className="table-context-header__title">{PAGE_TITLE}</strong>
        </div>
      }
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading || isResolving}
      pagination
      paginationPageSize={10}
      toolbar={{ search: true, searchPlaceholder: "Search" }}
    />
  );
}
