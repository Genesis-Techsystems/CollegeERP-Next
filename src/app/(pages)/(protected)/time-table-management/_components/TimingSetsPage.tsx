"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, PencilIcon, PlusIcon } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useQuery } from "@tanstack/react-query";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { getTimingSetById, listTimingSets } from "@/services";
import { rowIndexGetter } from "@/lib/utils";
import {
  clearTimingSetContext,
  setTimingSetContext,
} from "../_lib/timetable-context";
import { TimingSetStructurePreview } from "./TimingSetStructurePreview";

type TimingSetRow = Record<string, unknown>;

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 80,
    flex: 0,
    sortable: false,
    filter: false,
  } as ColDef<TimingSetRow>,
  name: {
    field: "timingsetName",
    headerName: "Timing Set Name",
    minWidth: 180,
  } as ColDef<TimingSetRow>,
  year: {
    field: "academicYear",
    headerName: "Academic Year",
    minWidth: 120,
  } as ColDef<TimingSetRow>,
  college: {
    field: "collegeCode",
    headerName: "College",
    minWidth: 100,
  } as ColDef<TimingSetRow>,
  actions: {
    headerName: "Actions",
    minWidth: 120,
    width: 120,
    flex: 0,
    sortable: false,
    filter: false,
  } as ColDef<TimingSetRow>,
};

const TIMING_SLOTS_HREF = "/time-table-management/timing-slots";

function makeActionsRenderer(
  router: ReturnType<typeof useRouter>,
  onView: (row: TimingSetRow) => void,
) {
  return (p: ICellRendererParams<TimingSetRow>) => {
    const row = p.data;
    if (!row) return null;
    const timingsetId = Number(row.timingsetId ?? 0);
    return (
      <div className="flex items-center gap-1.5 text-xs">
        {/* Angular: border_color → getTimings (edit / navigate to timing-slots) */}
        <button
          type="button"
          className="app-table-action-edit p-0.5"
          title="Edit"
          onClick={() => {
            setTimingSetContext({
              timingsetId,
              timingsetName: String(row.timingsetName ?? ""),
              collegeId: Number(row.collegeId ?? 0),
              collegeCode: String(row.collegeCode ?? ""),
              academicYearId: Number(row.academicYearId ?? 0),
              academicYear: String(row.academicYear ?? ""),
            });
            router.push(`${TIMING_SLOTS_HREF}?timingsetId=${timingsetId}`);
          }}
        >
          <PencilIcon className="h-4 w-4" />
        </button>
        <span className="text-muted-foreground">|</span>
        {/* Angular: fa-eye → editDialog (view modal) */}
        <button
          type="button"
          className="app-table-action-edit p-0.5"
          title="View"
          onClick={() => onView(row)}
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>
    );
  };
}

export function TimingSetsPage() {
  const router = useRouter();
  const [viewRow, setViewRow] = useState<TimingSetRow | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  const {
    data: rows = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: QK.timetableManagement.timingSets(),
    queryFn: listTimingSets,
  });

  const timingsetId = viewRow ? Number(viewRow.timingsetId ?? 0) : 0;

  const { data: viewDetail, isFetching: loadingView } = useQuery({
    queryKey: QK.timetableManagement.timingSetDetail(timingsetId),
    queryFn: () => getTimingSetById(timingsetId),
    enabled: viewOpen && timingsetId > 0,
  });

  const viewWeekdays = useMemo(() => {
    if (
      !viewDetail?.classWeekdays ||
      !Array.isArray(viewDetail.classWeekdays)
    ) {
      return [];
    }
    return (viewDetail.classWeekdays as Record<string, unknown>[])
      .filter((cw) => cw.isActive !== false)
      .map((cw) => ({
        weekdayName: String(cw.weekdayName ?? cw.name ?? ""),
        classTimings: Array.isArray(cw.classTimings)
          ? (cw.classTimings as Record<string, unknown>[]).filter(
              (t) => t.isActive !== false,
            )
          : [],
      }));
  }, [viewDetail]);

  const columnDefs = useMemo<ColDef<TimingSetRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.name,
      COL_DEFS.year,
      COL_DEFS.college,
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(router, (row) => {
          setViewRow(row);
          setViewOpen(true);
        }),
      },
    ],
    [router],
  );

  const viewTitle = viewRow
    ? `Timings-${String(viewRow.timingsetName ?? "")}(${String(viewRow.collegeCode ?? "")}-${String(viewRow.academicYear ?? "")})`
    : "Timings";

  return (
    <ListPage
      title="Timing Set"
      titleIcon="timelapse"
      notice={
        error ? (
          <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
        ) : null
      }
      rowData={rows}
      columnDefs={columnDefs}
      loading={isFetching}
      pagination
      paginationPageSize={10}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        columnPicker: false,
        exportPdf: false,
        exportExcel: false,
      }}
      toolbarTrailing={
        <Button
          type="button"
          size="sm"
          data-table-primary-action
          onClick={() => {
            clearTimingSetContext();
            router.push(TIMING_SLOTS_HREF);
          }}
        >
          <PlusIcon className="mr-1.5 h-4 w-4" />
          Add Timing Set
        </Button>
      }
    >
      {/* Angular TimingSetModalComponent — GET timingsets/{id}, read-only structure */}
      <Dialog
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) setViewRow(null);
        }}
      >
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="text-base text-primary">
              {viewTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="p-4">
            {loadingView ? (
              <p className="text-sm text-muted-foreground">Loading timings…</p>
            ) : viewWeekdays.length > 0 ? (
              <TimingSetStructurePreview
                classWeekdays={viewWeekdays}
                variant="modal"
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                No timings to show
              </p>
            )}
          </div>
          <DialogFooter className="px-4 pb-4">
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ListPage>
  );
}
