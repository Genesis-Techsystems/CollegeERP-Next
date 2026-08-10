"use client";

import { useMemo } from "react";
import type { ColDef } from "ag-grid-community";
import { FormModal } from "@/common/components/feedback";
import { StatusBadge } from "@/common/components/data-display";
import { DataTable } from "@/common/components/table";
import type { PlacementTraining, TrainingDetail } from "@/types/trainings";
import { rowIndexGetter } from "@/lib/utils";

function tConvert(time?: string | null): string {
  if (!time) return "";
  const match = String(time).match(
    /^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/,
  );
  if (!match) return time;
  const hour = Number(match[1]);
  const mins = match[2];
  const ampm = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 || 12;
  return `${h12}:${mins} ${ampm}`;
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 text-sm py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-primary font-medium">: {value ?? "—"}</span>
    </div>
  );
}

export type ViewTrainingMode = "trainings" | "trainingsD";

/** Extra fields Angular injects onto detail rows for the view modal. */
export type TrainingDetailView = TrainingDetail & {
  trainingTypeCatCode?: string | null;
  empName?: string | null;
  empNumber?: string | null;
};

interface Props {
  open: boolean;
  onClose: () => void;
  mode: ViewTrainingMode;
  training?: PlacementTraining | null;
  detail?: TrainingDetailView | null;
}

export function ViewTrainingDetailsModal({
  open,
  onClose,
  mode,
  training,
  detail,
}: Props) {
  const details = (training?.trainigDetailDTOs ?? []) as TrainingDetail[];

  const columnDefs = useMemo<ColDef<TrainingDetail>[]>(
    () => [
      { headerName: "No.", valueGetter: rowIndexGetter, width: 60, flex: 0 },
      { field: "trainerName", headerName: "Trainer", minWidth: 120, flex: 1 },
      {
        field: "trainingDetailTitle",
        headerName: "Training Detail Title",
        minWidth: 160,
        flex: 2,
      },
      {
        headerName: "Timings",
        minWidth: 140,
        flex: 1,
        valueGetter: (p) =>
          `${tConvert(p.data?.startTime)} - ${tConvert(p.data?.endTime)}`,
      },
      { field: "fkDayIds", headerName: "Days", minWidth: 120, flex: 1 },
      { field: "roomCode", headerName: "Room", minWidth: 90, flex: 0.8 },
      {
        field: "isActive",
        headerName: "Status",
        minWidth: 90,
        flex: 0.8,
        cellRenderer: (p: { data?: TrainingDetail }) => (
          <StatusBadge status={p.data?.isActive ?? false} />
        ),
      },
    ],
    [],
  );

  const title = "View Training Details";

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={title}
      size="xl"
      showSubmitButton={false}
      cancelLabel="Close"
      onSubmit={(e) => e.preventDefault()}
    >
      {mode === "trainings" && training && (
        <div className="space-y-3">
          <div className="rounded border border-border p-3">
            <Field
              label="College"
              value={`${training.collegeCode} / ${training.yearName}`}
            />
            <Field
              label="Training"
              value={
                <>
                  {training.trainingTitle}{" "}
                  {training.trainingTypeCatCode && (
                    <span className="text-muted-foreground">
                      ({training.trainingTypeCatCode})
                    </span>
                  )}
                </>
              }
            />
            <Field label="Trainer" value={training.trainerName} />
            <Field
              label="Incharge"
              value={`${training.empName ?? "—"} (${training.empNumber ?? "—"})`}
            />
            <Field
              label="Date"
              value={`${training.startDate} - ${training.endDate}`}
            />
          </div>
          <DataTable
            title=""
            subtitle=""
            bordered={false}
            rowData={details}
            columnDefs={columnDefs}
            pagination={false}
            toolbar={{ search: true, exportExcel: false, exportPdf: false }}
          />
        </div>
      )}

      {mode === "trainingsD" && detail && (
        <div className="rounded border border-border p-3 space-y-1">
          <Field
            label="College"
            value={`${detail.collegeCode ?? ""} / ${detail.yearName ?? ""}`}
          />
          <Field
            label="Training"
            value={(
              <>
                {detail.paTrainingTitle ?? ""}{" "}
                {detail.trainingTypeCatCode && (
                  <span className="text-muted-foreground">
                    ({detail.trainingTypeCatCode})
                  </span>
                )}
              </>
            )}
          />
          <Field label="Trainer" value={detail.trainerName} />
          <Field
            label="Incharge"
            value={`${detail.empName ?? "—"} (${detail.empNumber ?? "—"})`}
          />
          <Field
            label="Date"
            value={`${detail.paStartDate ?? ""} - ${detail.paEndDate ?? ""}`}
          />
          <h4 className="text-sm font-semibold text-red-600 pt-2">
            Training Details
          </h4>
          <Field label="Training Detail" value={detail.trainingDetailTitle} />
          <Field label="Trainer" value={detail.trainerName} />
          <Field label="Trainer Details" value={detail.trainerDetails} />
          <Field label="No of students" value={detail.noOfStudents} />
          <Field label="Room" value={detail.roomCode} />
          <Field label="Location" value={detail.location} />
          <Field label="Training Days" value={detail.fkDayIds} />
          <Field
            label="Timings"
            value={`${tConvert(detail.startTime)} - ${tConvert(detail.endTime)}`}
          />
          <Field label="Description" value={detail.trainingDetailDesc} />
        </div>
      )}
    </FormModal>
  );
}
