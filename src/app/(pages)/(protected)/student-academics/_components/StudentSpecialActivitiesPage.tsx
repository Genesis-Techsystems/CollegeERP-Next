"use client";

/**
 * Angular `student-academics/special-activities` → `SpecialActivitiesComponent`.
 * List by groupSectionId via spclActivityAttendance (Angular listByIds).
 * Reuses fetchDetails / fetchStudentDetail (no new APIs or services).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { StatusBadge } from "@/common/components/data-display";
import { ListPage } from "@/components/layout";
import { DATE_FORMATS, SPECIAL_ACTIVITY_API } from "@/config/constants";
import { useSession } from "@/hooks/useSession";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  fetchDetails,
  fetchStudentDetail,
  fetchStudentDetailByUserId,
} from "@/services";

type AnyRow = Record<string, unknown>;

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function readStorage(key: string): string {
  if (typeof globalThis.window === "undefined") return "";
  return globalThis.localStorage.getItem(key) ?? "";
}

function txt(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function num(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const key of keys) {
    const v = row[key];
    if (v != null && v !== "" && Number.isFinite(Number(v))) return Number(v);
  }
  return 0;
}

function asRows(data: unknown): AnyRow[] {
  if (data == null || data === "") return [];
  if (Array.isArray(data)) return data as AnyRow[];
  if (data && typeof data === "object" && "resultList" in data) {
    const list = (data as { resultList?: unknown }).resultList;
    if (list == null || list === "") return [];
    if (Array.isArray(list)) return list as AnyRow[];
    return [list as AnyRow];
  }
  if (typeof data === "object") return [data as AnyRow];
  return [];
}

function activityDetail(row: AnyRow | null | undefined): AnyRow {
  const d = row?.specialActivity;
  return d && typeof d === "object" ? (d as AnyRow) : {};
}

function parseDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const s = String(value).trim();
  if (!s) return null;
  const iso = parseISO(s);
  if (isValid(iso)) return iso;
  const d = new Date(s);
  return isValid(d) ? d : null;
}

function formatDisplayDate(value: unknown): string {
  const d = parseDate(value);
  if (!d) return "—";
  return format(d, DATE_FORMATS.DISPLAY);
}

/** Angular `tConvert` — 24h → 12h. */
function tConvert(time: unknown): string {
  if (time == null || time === "") return "";
  const match = String(time).match(/^([01]\d|2[0-3])(:)([0-5]\d)(:[0-5]\d)?$/);
  if (!match) return String(time);
  const hours = Number(match[1]);
  const suffix = hours < 12 ? "AM" : "PM";
  const h12 = hours % 12 || 12;
  return `${h12}${match[2]}${match[3]} ${suffix}`;
}

function scheduleStatusVariant(
  code: string,
): "active" | "pending" | "inactive" {
  const upper = code.toUpperCase();
  if (upper === "COMPLETED") return "active";
  if (upper === "SCHEDULED") return "pending";
  if (upper === "CANCEL" || upper === "CANCELLED") return "inactive";
  return "pending";
}

function activityNameRenderer(p: ICellRendererParams<AnyRow>) {
  const row = p.data;
  if (!row) return "—";
  const name = txt(row, ["specialActivityName"]) || "—";
  const code = txt(activityDetail(row), ["spclactityCatdetCode"]);
  return (
    <span>
      {name}
      {code ? (
        <span className="ml-1 text-muted-foreground">({code})</span>
      ) : null}
    </span>
  );
}

function subjectRenderer(p: ICellRendererParams<AnyRow>) {
  const detail = activityDetail(p.data);
  const name = txt(detail, ["subjectName"]) || "—";
  const code = txt(detail, ["subjectCode"]);
  return (
    <span>
      {name}
      {code ? (
        <span className="ml-1 text-muted-foreground">( {code} )</span>
      ) : null}
    </span>
  );
}

function statusRenderer(p: ICellRendererParams<AnyRow>) {
  const code = txt(activityDetail(p.data), ["schedulestatusCatdetCode"]);
  if (!code) return "—";
  return (
    <StatusBadge status={scheduleStatusVariant(code)} label={code} />
  );
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  specialActivityName: {
    field: "specialActivityName",
    headerName: "Activity",
    minWidth: 180,
  } as ColDef<AnyRow>,
  firstName: {
    headerName: "Faculty",
    minWidth: 140,
    valueGetter: (p) =>
      txt(activityDetail(p.data), ["firstName"]) || "—",
  } as ColDef<AnyRow>,
  subjectName: {
    headerName: "Subject",
    minWidth: 180,
  } as ColDef<AnyRow>,
  fromTime: {
    headerName: "Timing",
    minWidth: 160,
    valueGetter: (p) => {
      const detail = activityDetail(p.data);
      const from = tConvert(detail.fromTime);
      const to = tConvert(detail.toTime);
      if (!from && !to) return "—";
      return `${from} - ${to}`;
    },
  } as ColDef<AnyRow>,
  fromDate: {
    headerName: "Date",
    minWidth: 120,
    valueGetter: (p) =>
      formatDisplayDate(activityDetail(p.data).fromDate),
  } as ColDef<AnyRow>,
  specialActivityDescription: {
    field: "specialActivityDescription",
    headerName: "Description",
    minWidth: 200,
    valueGetter: (p) =>
      txt(p.data, ["specialActivityDescription"]) || "—",
  } as ColDef<AnyRow>,
  schedulestatusCatdetCode: {
    headerName: "Activity Status",
    minWidth: 140,
    flex: 0,
  } as ColDef<AnyRow>,
};

export function StudentSpecialActivitiesPage() {
  const { user, isLoading: sessionLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AnyRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Angular: localStorage.groupSectionId → listByIds(spclActivityAttendance, groupSectionId)
      const storageStudentId = positiveId(readStorage("studentId"));
      const sessionStudentId = positiveId(user?.studentId);
      const studentId = sessionStudentId || storageStudentId;

      let detail: AnyRow | null = null;
      if (studentId) {
        detail = (await fetchStudentDetail(studentId)) as AnyRow | null;
      }
      if (!detail && user?.userId) {
        detail = (await fetchStudentDetailByUserId(
          user.userId,
        )) as AnyRow | null;
      }

      const groupSectionId =
        num(detail, [
          "groupSectionId",
          "fk_group_section_id",
          "sectionId",
        ]) || positiveId(readStorage("groupSectionId"));

      if (!groupSectionId) {
        setRows([]);
        toastInfo("Student section not available.");
        return;
      }

      const data = await fetchDetails<unknown>(
        SPECIAL_ACTIVITY_API.ATTENDANCE_POST,
        { groupSectionId },
      );
      const list = asRows(data);
      setRows(list);
      if (list.length === 0) {
        toastSuccess("No special activities found.");
      }
    } catch (e) {
      toastError(e, "Failed to load special activities");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (sessionLoading) return;
    void load();
  }, [sessionLoading, load]);

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.siNo,
      { ...COL_DEFS.specialActivityName, cellRenderer: activityNameRenderer },
      COL_DEFS.firstName,
      { ...COL_DEFS.subjectName, cellRenderer: subjectRenderer },
      COL_DEFS.fromTime,
      COL_DEFS.fromDate,
      COL_DEFS.specialActivityDescription,
      {
        ...COL_DEFS.schedulestatusCatdetCode,
        cellRenderer: statusRenderer,
      },
    ],
    [],
  );

  return (
    <ListPage
      title="Special Activities"
      columnDefs={columnDefs}
      rowData={rows}
      loading={sessionLoading || loading}
      height="auto"
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
      }}
    />
  );
}
