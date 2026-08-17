"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PencilIcon } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Select } from "@/common/components/select";
import { StatusBadge } from "@/common/components/data-display";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import {
  listTrainingsByCollegeAndYear,
  listTrainingDetailsByCollegeAndTraining,
  listTrainingSessions,
} from "@/services/trainings";
import { listColleges } from "@/services/admin/college";
import type {
  PlacementTraining,
  TrainingDetail,
  TrainingSession,
} from "@/types/trainings";
import type { College } from "@/types/college";
import { rowIndexGetter } from "@/lib/utils";
import AddTrainingSessionModal from "./AddTrainingSessionModal";

function buildYearOptions(): { value: string; label: string }[] {
  const current = new Date().getFullYear();
  return Array.from({ length: 10 }, (_, i) => {
    const y = String(current - i);
    return { value: y, label: y };
  });
}

function statusRenderer(p: ICellRendererParams<TrainingSession>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function TrainingSessionsContent() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [trainings, setTrainings] = useState<PlacementTraining[]>([]);
  const [trainingDetails, setTrainingDetails] = useState<TrainingDetail[]>([]);
  const [loadingTrainings, setLoadingTrainings] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [yearName, setYearName] = useState<string | null>(null);
  const [traningId, setTraningId] = useState<string | null>(null);
  const [traningDetId, setTraningDetId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<TrainingSession | null>(null);

  const filtersReady = Boolean(
    collegeId && yearName && traningId && traningDetId,
  );
  const selectedTraining = trainings.find(
    (t) => String(t.traningId) === traningId,
  );

  const {
    data: sessions,
    isLoading,
    invalidate,
  } = useCrudList<TrainingSession>({
    queryKey: QK.trainingSessions.byDetail(Number(traningDetId)),
    queryFn: () => listTrainingSessions(Number(traningDetId)),
    enabled: filtersReady,
  });

  useEffect(() => {
    listColleges().then(setColleges).catch(console.error);
  }, []);

  useEffect(() => {
    if (!collegeId || !yearName) {
      setTrainings([]);
      setTraningId(null);
      setTraningDetId(null);
      return;
    }
    setLoadingTrainings(true);
    listTrainingsByCollegeAndYear(Number(collegeId), yearName)
      .then(setTrainings)
      .catch(() => setTrainings([]))
      .finally(() => setLoadingTrainings(false));
  }, [collegeId, yearName]);

  useEffect(() => {
    if (!collegeId || !traningId) {
      setTrainingDetails([]);
      setTraningDetId(null);
      return;
    }
    setLoadingDetails(true);
    listTrainingDetailsByCollegeAndTraining(
      Number(collegeId),
      Number(traningId),
    )
      .then(setTrainingDetails)
      .catch(() => setTrainingDetails([]))
      .finally(() => setLoadingDetails(false));
  }, [collegeId, traningId]);

  const rows = filtersReady ? sessions : [];

  const columnDefs = useMemo<ColDef<TrainingSession>[]>(
    () => [
      { headerName: "No.", valueGetter: rowIndexGetter, width: 60, flex: 0 },
      {
        field: "trainerName",
        headerName: "Trainer Name",
        minWidth: 130,
        flex: 1,
      },
      {
        field: "sessionDate",
        headerName: "Session Date",
        minWidth: 110,
        flex: 1,
      },
      {
        headerName: "Time",
        minWidth: 140,
        flex: 1,
        valueGetter: (p) => {
          const from = p.data?.fromTime ?? "";
          const to = p.data?.toTime ?? "";
          return from || to ? `${from}${from && to ? " – " : ""}${to}` : "";
        },
      },
      {
        field: "noOfAttendees",
        headerName: "No Of Attendees",
        minWidth: 110,
        flex: 0.8,
      },
      {
        field: "inchargeEmpName",
        headerName: "Incharge Name",
        minWidth: 130,
        flex: 1,
      },
      { field: "collegeCode", headerName: "College", minWidth: 90, flex: 0.8 },
      {
        ...{ field: "isActive", headerName: "Status", minWidth: 90, flex: 0.8 },
        cellRenderer: statusRenderer,
      },
      {
        headerName: "Actions",
        width: 80,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<TrainingSession>) => {
          const row = p.data;
          if (!row) return null;
          return (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => {
                setEditData(row);
                setModalOpen(true);
              }}
            >
              <PencilIcon className="h-3.5 w-3.5" />
            </Button>
          );
        },
      },
    ],
    [],
  );

  return (
    <FilteredListPage
      title="Training Sessions"
      filters={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="College *"
            value={collegeId}
            onChange={(v) => {
              setCollegeId(v);
              setYearName(null);
              setTraningId(null);
              setTraningDetId(null);
            }}
            options={colleges.map((c) => ({
              value: String(c.collegeId),
              label: c.collegeCode || c.collegeName,
            }))}
            placeholder="Select college"
          />
          <Select
            label="Year *"
            value={yearName}
            onChange={(v) => {
              setYearName(v);
              setTraningId(null);
              setTraningDetId(null);
            }}
            options={buildYearOptions()}
            placeholder="Select year"
            disabled={!collegeId}
          />
          <Select
            label="Training *"
            value={traningId}
            onChange={(v) => {
              setTraningId(v);
              setTraningDetId(null);
            }}
            options={trainings.map((t) => ({
              value: String(t.traningId),
              label: t.trainingTitle,
            }))}
            placeholder="Select training"
            disabled={!collegeId || !yearName}
            isLoading={loadingTrainings}
          />
          <Select
            label="Training Details *"
            value={traningDetId}
            onChange={setTraningDetId}
            options={trainingDetails.map((d) => ({
              value: String(d.traningDetId),
              label: d.trainingDetailTitle,
            }))}
            placeholder="Select detail"
            disabled={!traningId}
            isLoading={loadingDetails}
          />
        </div>
      }
      rowData={rows}
      columnDefs={columnDefs}
      loading={isLoading}
      showTable={rows.length > 0}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search sessions…",
        pdfDocumentTitle: "Training Sessions",
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
          + Add Session
        </Button>
      }
      filtersFooter={
        filtersReady && rows.length === 0 ? (
          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              onClick={() => {
                setEditData(null);
                setModalOpen(true);
              }}
            >
              + Add Session
            </Button>
          </div>
        ) : undefined
      }
    >
      <AddTrainingSessionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editData={editData}
        traningDetId={Number(traningDetId)}
        collegeId={Number(collegeId)}
        startDate={selectedTraining?.startDate}
        endDate={selectedTraining?.endDate}
        onSaved={invalidate}
      />
    </FilteredListPage>
  );
}

export default function TrainingSessionsPage() {
  return (
    <Suspense>
      <TrainingSessionsContent />
    </Suspense>
  );
}
