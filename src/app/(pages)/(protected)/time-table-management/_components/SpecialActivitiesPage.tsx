"use client";

/**
 * Angular `staff-special-activities/special-activities` list.
 * domainList SpecialActivity by College.collegeId + employeeDetail.employeeId.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, isValid, parseISO } from "date-fns";
import { Eye, Pencil, Plus } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { DATE_FORMATS, SPECIAL_ACTIVITY_API } from "@/config/constants";
import { useSessionContext } from "@/context/SessionContext";
import { useLoginEmployeeId } from "@/hooks/useLoginEmployeeId";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo } from "@/lib/toast";
import { buildQuery, domainList, tConvert } from "@/services";
import { ViewSpecialActivityModal } from "./ViewSpecialActivityModal";

type AnyRow = Record<string, unknown>;

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

function txt(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function formatDisplayDate(value: unknown): string {
  if (value == null || value === "") return "";
  const s = String(value).trim();
  const iso = parseISO(s);
  const d = isValid(iso) ? iso : new Date(s);
  if (!isValid(d)) return "";
  return format(d, DATE_FORMATS.DISPLAY);
}

function makeActionsRenderer(
  onEdit: (row: AnyRow) => void,
  onView: (row: AnyRow) => void,
) {
  return (p: ICellRendererParams<AnyRow>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          aria-label="Edit"
          onClick={() => onEdit(row)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label="View"
          onClick={() => onView(row)}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<AnyRow>,
  activity: {
    field: "specialActivityName",
    headerName: "Activity",
    minWidth: 140,
    valueGetter: (p) => txt(p.data, ["specialActivityName"]),
  } as ColDef<AnyRow>,
  description: {
    field: "specialActivityDescription",
    headerName: "Description",
    minWidth: 180,
    flex: 1,
    valueGetter: (p) => txt(p.data, ["specialActivityDescription"]),
  } as ColDef<AnyRow>,
  subject: {
    field: "subjectName",
    headerName: "Subject",
    minWidth: 160,
    valueGetter: (p) => txt(p.data, ["subjectName"]),
  } as ColDef<AnyRow>,
  date: {
    field: "fromDate",
    headerName: "Date",
    minWidth: 120,
    valueGetter: (p) => formatDisplayDate(p.data?.fromDate),
  } as ColDef<AnyRow>,
  timing: {
    headerName: "Timing",
    minWidth: 150,
    valueGetter: (p) => {
      const from = tConvert(p.data?.fromTime);
      const to = tConvert(p.data?.toTime);
      if (!from && !to) return "";
      return `${from} - ${to}`;
    },
  } as ColDef<AnyRow>,
  actions: {
    headerName: "Actions",
    minWidth: 110,
    width: 110,
    flex: 0,
    sortable: false,
    filter: false,
  } as ColDef<AnyRow>,
};

export function SpecialActivitiesPage() {
  const router = useRouter();
  const { user, isLoading: sessionLoading } = useSessionContext();
  const { employeeId: loginEmployeeId, isResolving } = useLoginEmployeeId(
    user,
    sessionLoading,
  );

  const collegeId = positiveId(user?.collegeId, readStorage("collegeId"));
  const employeeId = positiveId(loginEmployeeId, readStorage("employeeId"));

  const [rows, setRows] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewRow, setViewRow] = useState<AnyRow | null>(null);

  const loadList = useCallback(async () => {
    if (!collegeId || !employeeId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Angular: College.collegeId + employeeDetail.employeeId, order spclActivityId DESC
      const query = buildQuery(
        {
          "College.collegeId": collegeId,
          "employeeDetail.employeeId": employeeId,
        },
        { field: "spclActivityId", direction: "DESC" },
      );
      const list = await domainList<AnyRow>(SPECIAL_ACTIVITY_API.CRUD, query);
      const data = Array.isArray(list) ? list : [];
      setRows(data);
      if (data.length === 0) toastInfo("No Record(s) found.");
    } catch (e) {
      toastError(e, "Failed to load special activities");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [collegeId, employeeId]);

  useEffect(() => {
    if (sessionLoading || isResolving) return;
    void loadList();
  }, [sessionLoading, isResolving, loadList]);

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.activity,
      COL_DEFS.description,
      COL_DEFS.subject,
      COL_DEFS.date,
      COL_DEFS.timing,
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(
          (row) => {
            const id = Number(row.spclActivityId ?? 0);
            router.push(
              `/time-table-management/special-activities/add-activity?spclActivityId=${id}`,
            );
          },
          (row) => setViewRow(row),
        ),
      },
    ],
    [router],
  );

  return (
    <>
      <ListPage
        title="Special Activities"
        columnDefs={columnDefs}
        rowData={rows}
        loading={sessionLoading || isResolving || loading}
        pagination
        height="auto"
        toolbar={{
          search: true,
          searchPlaceholder: "Search",
        }}
        toolbarTrailing={
          <Button
            onClick={() =>
              router.push(
                "/time-table-management/special-activities/add-activity",
              )
            }
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Activity
          </Button>
        }
      />
      <ViewSpecialActivityModal
        open={viewRow != null}
        row={viewRow}
        onClose={() => setViewRow(null)}
      />
    </>
  );
}
