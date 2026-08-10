"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Eye, PencilIcon } from "lucide-react";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/common/components/data-display";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { listTrainings } from "@/services/trainings";
import type { PlacementTraining } from "@/types/trainings";
import { rowIndexGetter } from "@/lib/utils";
import AddTrainingModal from "./AddTrainingModal";
import { ViewTrainingDetailsModal } from "./ViewTrainingDetailsModal";

function statusRenderer(p: ICellRendererParams<PlacementTraining>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function inchargeRenderer(p: ICellRendererParams<PlacementTraining>) {
  const row = p.data;
  if (!row) return null;
  return (
    <span>
      {row.empName}
      {row.empNumber != null && (
        <span className="text-muted-foreground ml-1">({row.empNumber})</span>
      )}
    </span>
  );
}

export default function PlacementTrainingsPage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<PlacementTraining | null>(null);
  const [viewData, setViewData] = useState<PlacementTraining | null>(null);

  const {
    data: trainings,
    isLoading,
    invalidate,
  } = useCrudList<PlacementTraining>({
    queryKey: QK.trainings.list(),
    queryFn: listTrainings,
  });

  const columnDefs = useMemo<ColDef<PlacementTraining>[]>(
    () => [
      { headerName: "No.", valueGetter: rowIndexGetter, width: 60, flex: 0 },
      {
        field: "trainingTitle",
        headerName: "Training Title",
        minWidth: 180,
        flex: 2,
      },
      {
        field: "trainingTypeCatDisplayName",
        headerName: "Training Type",
        minWidth: 130,
        flex: 1,
      },
      {
        field: "trainerName",
        headerName: "Trainer Name",
        minWidth: 130,
        flex: 1,
      },
      {
        field: "empName",
        headerName: "Incharge",
        minWidth: 140,
        flex: 1,
        cellRenderer: inchargeRenderer,
      },
      { field: "yearName", headerName: "Year", minWidth: 90, flex: 0.8 },
      { field: "collegeCode", headerName: "College", minWidth: 90, flex: 0.8 },
      { field: "startDate", headerName: "Start Date", minWidth: 110, flex: 1 },
      { field: "endDate", headerName: "EndDate", minWidth: 110, flex: 1 },
      {
        field: "isActive",
        headerName: "Status",
        minWidth: 90,
        flex: 0.8,
        cellRenderer: statusRenderer,
      },
      {
        headerName: "Actions",
        // Angular actions column is ~20% width with stacked link + icons
        minWidth: 160,
        width: 170,
        flex: 0,
        pinned: "right",
        suppressSizeToFit: true,
        cellStyle: { display: "flex", alignItems: "center" },
        cellRenderer: (p: ICellRendererParams<PlacementTraining>) => {
          const row = p.data;
          if (!row) return null;
          return (
            <div className="flex flex-col items-start justify-center leading-tight py-0.5">
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline whitespace-nowrap"
                title="Add / Edit Training Details"
                onClick={() =>
                  router.push(
                    `/trainings/training-detail?collegeId=${row.collegeId}` +
                      `&collegeCode=${encodeURIComponent(row.collegeCode ?? "")}` +
                      `&yearName=${encodeURIComponent(String(row.yearName ?? ""))}` +
                      `&traningId=${row.traningId}` +
                      `&trainingTitle=${encodeURIComponent(row.trainingTitle)}` +
                      `&trainingTypeCatCode=${encodeURIComponent(row.trainingTypeCatCode ?? "")}` +
                      `&empName=${encodeURIComponent(row.empName ?? "")}` +
                      `&empNumber=${encodeURIComponent(row.empNumber ?? "")}`,
                  )
                }
              >
                Training Details
              </button>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-xs">|</span>
                <button
                  type="button"
                  className="inline-flex h-6 w-6 items-center justify-center text-primary"
                  title="Edit"
                  onClick={() => {
                    setEditData(row);
                    setModalOpen(true);
                  }}
                >
                  <PencilIcon className="h-3.5 w-3.5" />
                </button>
                <span className="text-muted-foreground text-xs">|</span>
                <button
                  type="button"
                  className="inline-flex h-6 w-6 items-center justify-center text-muted-foreground hover:text-foreground"
                  title="View Training Details"
                  onClick={() => setViewData(row)}
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        },
      },
    ],
    [router],
  );

  return (
    <ListPage
      title="Trainings"
      rowData={trainings}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      rowHeight={52}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Trainings",
        exportExcel: false,
        exportPdf: false,
      }}
      toolbarTrailing={
        <Button
          size="sm"
          onClick={() => {
            setEditData(null);
            setModalOpen(true);
          }}
        >
          + Add Training
        </Button>
      }
    >
      <AddTrainingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editData={editData}
        onSaved={invalidate}
      />
      <ViewTrainingDetailsModal
        open={viewData != null}
        onClose={() => setViewData(null)}
        mode="trainings"
        training={viewData}
      />
    </ListPage>
  );
}
