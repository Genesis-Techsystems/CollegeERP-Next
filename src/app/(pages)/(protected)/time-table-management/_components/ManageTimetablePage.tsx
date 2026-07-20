"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, PencilIcon, PlusIcon } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/common/components/table";
import { StatusBadge } from "@/common/components/data-display";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { listTimetables } from "@/services";
import { rowIndexGetter } from "@/lib/utils";
import { formatDateHeader } from "../_lib/timetable-filters";
import { buildTimetableAllocationQuery } from "../_lib/timetable-query";
import { TimetableFormModal } from "./TimetableFormModal";
import {
  ViewAllocatedTimetableModal,
  type ViewTimetableModalContext,
} from "./ViewAllocatedTimetableModal";

type TimetableRow = Record<string, unknown>;

/** Angular: `{{row.timetableName}} - ({{startDate | date:'MMM d, y'}} - {{endDate | date:'MMM d, y'}})` */
function formatTimetableLabel(row: TimetableRow): string {
  const name = String(row.timetableName ?? "");
  const start = formatDateHeader(row.startDate);
  const end = formatDateHeader(row.endDate);
  if (start && end) return `${name} - (${start} - ${end})`;
  return name;
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<TimetableRow>,
  name: {
    headerName: "Timetable",
    minWidth: 280,
    flex: 1,
    valueGetter: (p) => (p.data ? formatTimetableLabel(p.data) : ""),
  } as ColDef<TimetableRow>,
  year: {
    field: "academicYear",
    headerName: "Academic Year",
    minWidth: 120,
  } as ColDef<TimetableRow>,
  college: {
    field: "collegeCode",
    headerName: "College",
    minWidth: 100,
  } as ColDef<TimetableRow>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0,
  } as ColDef<TimetableRow>,
  actions: {
    headerName: "Actions",
    minWidth: 220,
    flex: 0,
  } as ColDef<TimetableRow>,
};

function statusRenderer(p: ICellRendererParams<TimetableRow>) {
  return <StatusBadge status={p.data?.isActive !== false} />;
}

function makeActionsRenderer(
  router: ReturnType<typeof useRouter>,
  onEdit: (row: TimetableRow) => void,
  onView: (row: TimetableRow) => void,
) {
  return (p: ICellRendererParams<TimetableRow>) => {
    const row = p.data;
    if (!row) return null;
    const hasTimingSet = row.timingsetId != null;
    const q = buildTimetableAllocationQuery(row);
    return (
      <div className="flex flex-wrap items-center gap-1 text-xs">
        {hasTimingSet ? (
          <button
            type="button"
            className="p-0.5 text-blue-700"
            title="View"
            onClick={() => onView(row)}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            className="text-blue-700 font-medium hover:underline"
            onClick={() =>
              router.push(`/time-table-management/timetable-allocation?${q}`)
            }
          >
            Timetable Allocations
          </button>
        )}
        <span className="text-muted-foreground">|</span>
        <button
          type="button"
          className="p-0.5 text-blue-700"
          title="Edit"
          onClick={() => onEdit(row)}
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  };
}

export function ManageTimetablePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TimetableRow | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewContext, setViewContext] =
    useState<ViewTimetableModalContext | null>(null);

  const {
    data: rows = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: QK.timetableManagement.timetables(),
    queryFn: listTimetables,
  });

  const existingNames = useMemo(
    () => rows.map((r) => String(r.timetableName ?? "")),
    [rows],
  );

  const columnDefs = useMemo<ColDef<TimetableRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.name,
      COL_DEFS.year,
      COL_DEFS.college,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(
          router,
          (row) => {
            setEditing(row);
            setModalOpen(true);
          },
          (row) => {
            setViewContext({
              mode: "structure",
              data: {
                timingsetId: Number(row.timingsetId ?? 0),
                collegeId: Number(row.collegeId ?? 0),
                timetableId: Number(row.timetableId ?? 0),
                collegeCode: String(row.collegeCode ?? ""),
                academicYear: String(row.academicYear ?? ""),
                timetableName: String(row.timetableName ?? ""),
                startDate: String(row.startDate ?? ""),
                endDate: String(row.endDate ?? ""),
              },
            });
            setViewModalOpen(true);
          },
        ),
      },
    ],
    [router],
  );

  function invalidate() {
    void queryClient.invalidateQueries({
      queryKey: QK.timetableManagement.timetables(),
    });
  }

  return (
    <PageContainer className="space-y-4">
      {error ? (
        <p className="px-3 pb-2 text-sm text-destructive">
          {getErrorMessage(error)}
        </p>
      ) : null}
      <DataTable
        title="Create Class TimeTable"
        subtitle=""
        rowData={rows}
        columnDefs={columnDefs}
        loading={isFetching}
        pagination
        toolbar={{
          search: true,
          searchPlaceholder: "Search timetables…",
          exportPdf: true,
        }}
        toolbarTrailing={
          <Button
            type="button"
            size="sm"
            className="h-[30px] gap-1 px-3 text-[12px]"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add Timetable
          </Button>
        }
      />

      <TimetableFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        row={editing}
        existingNames={existingNames}
        onSaved={invalidate}
      />

      <ViewAllocatedTimetableModal
        open={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setViewContext(null);
        }}
        context={viewContext}
      />
    </PageContainer>
  );
}
