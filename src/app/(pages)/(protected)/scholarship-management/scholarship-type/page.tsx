"use client";

import { useMemo, useState } from "react";
import { PencilIcon, PlusIcon } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { EmptyState } from "@/common/components/feedback";
import { StatusBadge } from "@/common/components/data-display";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { getErrorMessage } from "@/lib/errors";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listScholarshipTypes } from "@/services";
import type { ScholarshipType } from "@/types/scholarship";
import { ScholarshipTypeModal } from "./ScholarshipTypeModal";

const COL_DEFS = {
  siNo: {
    headerName: "Sl.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<ScholarshipType>,
  orgCode: {
    headerName: "Organization",
    minWidth: 120,
    flex: 0.8,
  } as ColDef<ScholarshipType>,
  universityCode: {
    headerName: "University",
    minWidth: 120,
    flex: 0.8,
  } as ColDef<ScholarshipType>,
  scholarshipTypeCode: {
    field: "scholarshipTypeCode",
    headerName: "Scholarship Type Code",
    minWidth: 160,
    flex: 1,
  } as ColDef<ScholarshipType>,
  scholarshipTypeDesc: {
    field: "scholarshipTypeDesc",
    headerName: "Scholarship Type Description",
    minWidth: 200,
    flex: 1.2,
  } as ColDef<ScholarshipType>,
  sortOrder: {
    field: "sortOrder",
    headerName: "Sort order",
    minWidth: 100,
    flex: 0.6,
  } as ColDef<ScholarshipType>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 100,
    flex: 0.7,
  } as ColDef<ScholarshipType>,
  actions: {
    headerName: "Actions",
    minWidth: 86,
    width: 86,
    flex: 0,
  } as ColDef<ScholarshipType>,
};

function pickText(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value))
      return String(value);
  }
  return "";
}

function statusRenderer(p: ICellRendererParams<ScholarshipType>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(
  setEditing: (row: ScholarshipType | null) => void,
  setModalOpen: (open: boolean) => void,
) {
  return (p: ICellRendererParams<ScholarshipType>) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-8 w-8 p-0"
      aria-label="Edit scholarship type"
      onClick={() => {
        setEditing(p.data ?? null);
        setModalOpen(true);
      }}
    >
      <PencilIcon className="h-3.5 w-3.5" />
    </Button>
  );
}

export default function ScholarshipTypePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ScholarshipType | null>(null);

  const {
    data: rows,
    isLoading,
    isError,
    error,
    refetch,
    invalidate,
  } = useCrudList({
    queryKey: QK.scholarshipTypes.list(),
    queryFn: listScholarshipTypes,
  });

  const columnDefs = useMemo<ColDef<ScholarshipType>[]>(
    () => [
      COL_DEFS.siNo,
      {
        ...COL_DEFS.orgCode,
        valueGetter: (p) =>
          pickText((p.data ?? {}) as Record<string, unknown>, [
            "orgCode",
            "organizationCode",
            "orgcode",
          ]),
      },
      {
        ...COL_DEFS.universityCode,
        valueGetter: (p) =>
          pickText((p.data ?? {}) as Record<string, unknown>, [
            "universityCode",
            "universitycode",
          ]),
      },
      COL_DEFS.scholarshipTypeCode,
      COL_DEFS.scholarshipTypeDesc,
      COL_DEFS.sortOrder,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(setEditing, setModalOpen),
      },
    ],
    [],
  );

  return (
    <ListPage
      title="Scholarship Type"
      rowData={isError ? [] : (rows ?? [])}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Scholarship Type",
      }}
      toolbarTrailing={
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <PlusIcon className="mr-1.5 h-4 w-4" />
          Add Scholarship Type
        </Button>
      }
      emptyState={
        isError ? (
          <EmptyState
            title="Could not load scholarship types"
            description={getErrorMessage(error)}
            action={{ label: "Retry", onClick: () => void refetch() }}
          />
        ) : undefined
      }
    >
      <ScholarshipTypeModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        row={editing}
        existingRows={rows ?? []}
        onSaved={() => void invalidate()}
      />
    </ListPage>
  );
}
