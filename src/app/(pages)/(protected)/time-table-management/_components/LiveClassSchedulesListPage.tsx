"use client";

/**
 * Angular `staff-digital-class-room/live-class-schedule-list`.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { ListPage } from "@/components/layout";
import { DATE_FORMATS } from "@/config/constants";
import { useSessionContext } from "@/context/SessionContext";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { rowIndexGetter } from "@/lib/utils";
import { toastError } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  listEmployeeLiveClassSchedules,
  tConvert,
  type LiveScheduleRow,
} from "@/services";
import { format, isValid, parseISO } from "date-fns";

function readStorage(key: string): string {
  if (typeof globalThis.window === "undefined") return "";
  return globalThis.localStorage.getItem(key) ?? "";
}

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function formatDisplayDate(value: unknown): string {
  if (value == null || value === "") return "";
  const s = String(value).trim();
  const iso = parseISO(s);
  const d = isValid(iso) ? iso : new Date(s);
  if (!isValid(d)) return s;
  return format(d, DATE_FORMATS.DISPLAY);
}

const COL_DEFS = {
  siNo: {
    headerName: "No.",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<LiveScheduleRow>,
  scheduledOnDate: {
    field: "scheduledOnDate",
    headerName: "Schedule Date",
    minWidth: 200,
  } as ColDef<LiveScheduleRow>,
  course: { headerName: "Course", minWidth: 260 } as ColDef<LiveScheduleRow>,
  subject: {
    field: "subjectName",
    headerName: "Subject",
    minWidth: 180,
  } as ColDef<LiveScheduleRow>,
  topic: {
    field: "topic",
    headerName: "Topic",
    minWidth: 160,
  } as ColDef<LiveScheduleRow>,
  agenda: {
    field: "agenda",
    headerName: "Agenda",
    minWidth: 160,
  } as ColDef<LiveScheduleRow>,
};

function scheduleDateRenderer(p: ICellRendererParams<LiveScheduleRow>) {
  const row = p.data;
  if (!row) return null;
  const date = formatDisplayDate(row.scheduledOnDate);
  const from = tConvert(row.fromTime);
  const to = tConvert(row.toTime);
  const time = from || to ? ` (${from}${from && to ? " - " : ""}${to})` : "";
  return (
    <span>
      {date}
      {time ? <span className="text-muted-foreground">{time}</span> : null}
    </span>
  );
}

function courseRenderer(p: ICellRendererParams<LiveScheduleRow>) {
  const row = p.data;
  if (!row) return null;
  const parts = [
    row.collegeCode,
    row.courseName,
    row.courseGroupName,
    row.courseYearName,
  ]
    .filter((v) => v != null && String(v).trim() !== "")
    .join(" / ");
  const section = row.section ? ` - ${row.section}` : "";
  return `${parts}${section}`;
}

export function LiveClassSchedulesListPage() {
  const { user, isLoading: sessionLoading } = useSessionContext();
  const { employeeId: loginEmployeeId, isResolving } = useLoginEmployeeId(
    user,
    sessionLoading,
  );

  const employeeId = positiveId(loginEmployeeId, readStorage("employeeId"));

  const [rows, setRows] = useState<LiveScheduleRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRows = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const data = await listEmployeeLiveClassSchedules({ employeeId });
      setRows(data);
    } catch (e) {
      toastError(getErrorMessage(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (sessionLoading || isResolving) return;
    if (!employeeId) return;
    void loadRows();
  }, [sessionLoading, isResolving, employeeId, loadRows]);

  const columnDefs = useMemo<ColDef<LiveScheduleRow>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.scheduledOnDate, cellRenderer: scheduleDateRenderer },
      { ...COL_DEFS.course, cellRenderer: courseRenderer },
      COL_DEFS.subject,
      COL_DEFS.topic,
      COL_DEFS.agenda,
    ],
    [],
  );

  return (
    <ListPage
      columnDefs={columnDefs}
      rowData={rows}
      loading={sessionLoading || isResolving || loading}
      pagination
      height="auto"
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
      }}
    />
  );
}
