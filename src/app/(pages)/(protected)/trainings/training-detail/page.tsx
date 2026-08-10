"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { ChevronDown, Eye, PencilIcon, Plus } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, MultiSelect } from "@/common/components/select";
import { StatusBadge } from "@/common/components/data-display";
import {
  createTrainingDetail,
  listTrainingDetailsByCollegeAndTraining,
  updateTrainingDetail,
} from "@/services/trainings";
import { listRooms } from "@/services/admin/room";
import type { TrainingDetail } from "@/types/trainings";
import type { Room } from "@/types/room";
import { rowIndexGetter } from "@/lib/utils";
import { ViewTrainingDetailsModal } from "../training/ViewTrainingDetailsModal";

/** Angular weekDaysList — full day names joined into fkDayIds. */
const WEEK_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type FormValues = {
  trainingDetailTitle: string;
  trainingDetailDesc: string;
  trainerName: string;
  trainerDetails: string;
  isRecurring: boolean;
  fkDayIds: string[];
  startTime: string;
  endTime: string;
  noOfStudents: string;
  roomId: string | null;
  location: string;
  isActive: boolean;
  reason: string;
};

function emptyForm(): FormValues {
  return {
    trainingDetailTitle: "",
    trainingDetailDesc: "",
    trainerName: "",
    trainerDetails: "",
    isRecurring: false,
    fkDayIds: [],
    startTime: "09:00",
    endTime: "10:00",
    noOfStudents: "",
    roomId: null,
    location: "",
    isActive: true,
    reason: "active",
  };
}

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

function toHms(time: string): string {
  if (!time) return "";
  // HTML time is HH:mm — Angular convert_to_24h returns H:m:00
  const [h, m] = time.split(":");
  return `${Number(h)}:${Number(m)}:00`;
}

function TrainingDetailContent() {
  const router = useRouter();
  const params = useSearchParams();

  const collegeId = Number(params.get("collegeId") ?? 0);
  const collegeCode = params.get("collegeCode") ?? "";
  const yearName = params.get("yearName") ?? "";
  const paTraningId = Number(
    params.get("traningId") ?? params.get("paTraningId") ?? 0,
  );
  const trainingTitle = params.get("trainingTitle") ?? "";
  const trainingTypeCatCode = params.get("trainingTypeCatCode") ?? "";
  const empName = params.get("empName") ?? "";
  const empNumber = params.get("empNumber") ?? "";

  const [rooms, setRooms] = useState<Room[]>([]);
  const [details, setDetails] = useState<TrainingDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(true);
  const [editRow, setEditRow] = useState<TrainingDetail | null>(null);
  const [viewRow, setViewRow] = useState<TrainingDetail | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormValues>({ defaultValues: emptyForm() });

  const isRecurring = watch("isRecurring");
  const isActive = watch("isActive");

  const loadDetails = useCallback(async () => {
    if (!collegeId || !paTraningId) {
      setDetails([]);
      return;
    }
    setLoading(true);
    try {
      // Angular: College.collegeId==X.and.Training.traningId==Y
      const rows = await listTrainingDetailsByCollegeAndTraining(
        collegeId,
        paTraningId,
      );
      setDetails(rows);
    } catch {
      setDetails([]);
    } finally {
      setLoading(false);
    }
  }, [collegeId, paTraningId]);

  useEffect(() => {
    listRooms()
      .then((rows) => setRooms(rows.filter((r) => r.isActive !== false)))
      .catch(console.error);
  }, []);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  function clearForm() {
    setEditRow(null);
    reset(emptyForm());
    setSubmitError(null);
  }

  function loadEdit(row: TrainingDetail) {
    setEditRow(row);
    setFormOpen(true);
    reset({
      trainingDetailTitle: row.trainingDetailTitle ?? "",
      trainingDetailDesc: row.trainingDetailDesc ?? "",
      trainerName: row.trainerName ?? "",
      trainerDetails: row.trainerDetails ?? "",
      isRecurring: !!row.isRecurring,
      fkDayIds: row.fkDayIds ? row.fkDayIds.split(",").filter(Boolean) : [],
      startTime: row.startTime?.slice(0, 5) ?? "09:00",
      endTime: row.endTime?.slice(0, 5) ?? "10:00",
      noOfStudents: row.noOfStudents != null ? String(row.noOfStudents) : "",
      roomId: row.roomId != null ? String(row.roomId) : null,
      location: row.location ?? "",
      isActive: row.isActive,
      reason: row.reason ?? "active",
    });
  }

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    if (!values.trainingDetailTitle.trim() || !values.trainerName.trim()) {
      setSubmitError("Training Detail and Trainer Name are required");
      return;
    }
    try {
      const payload: Partial<TrainingDetail> = {
        trainingDetailTitle: values.trainingDetailTitle,
        trainingDetailDesc: values.trainingDetailDesc,
        trainerName: values.trainerName,
        trainerDetails: values.trainerDetails,
        isRecurring: values.isRecurring,
        fkDayIds:
          values.isRecurring && values.fkDayIds.length
            ? values.fkDayIds.join(",")
            : null,
        startTime: toHms(values.startTime),
        endTime: toHms(values.endTime),
        noOfStudents: values.noOfStudents
          ? Number(values.noOfStudents)
          : undefined,
        roomId: values.roomId ? Number(values.roomId) : undefined,
        location: values.location,
        isActive: values.isActive,
        reason: values.isActive ? values.reason || "active" : values.reason,
        collegeId,
        paTraningId,
      };
      if (editRow) {
        payload.traningDetId = editRow.traningDetId;
        payload.createdDt = editRow.createdDt;
        await updateTrainingDetail(editRow.traningDetId, payload);
      } else {
        await createTrainingDetail(payload);
      }
      clearForm();
      await loadDetails();
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "Failed to save training detail",
      );
    }
  }

  const columnDefs = useMemo<ColDef<TrainingDetail>[]>(
    () => [
      { headerName: "No.", valueGetter: rowIndexGetter, width: 60, flex: 0 },
      { field: "trainerName", headerName: "Trainer", minWidth: 130, flex: 1 },
      {
        field: "trainingDetailTitle",
        headerName: "Training Detail Title",
        minWidth: 180,
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
        cellRenderer: (p: ICellRendererParams<TrainingDetail>) => (
          <StatusBadge status={p.data?.isActive ?? false} />
        ),
      },
      {
        headerName: "Actions",
        width: 100,
        flex: 0,
        pinned: "right",
        cellRenderer: (p: ICellRendererParams<TrainingDetail>) => {
          const row = p.data;
          if (!row) return null;
          return (
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center text-primary"
                title="Edit"
                onClick={() => loadEdit(row)}
              >
                <PencilIcon className="h-3.5 w-3.5" />
              </button>
              <span className="text-muted-foreground text-xs">|</span>
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground"
                title="View Training Details"
                onClick={() => setViewRow(row)}
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        },
      },
    ],
    [],
  );

  // Angular: Training Details <small>(collegeCode/yearName/trainingTitle)</small>
  const contextLabel = [collegeCode, yearName, trainingTitle]
    .filter(Boolean)
    .join("/");
  const pageTitle = contextLabel
    ? `Training Details (${contextLabel})`
    : "Training Details";

  const addForm = (
    <div className="w-full">
      <button
        type="button"
        className="mb-3 flex w-full items-center justify-between text-left"
        onClick={() => setFormOpen((o) => !o)}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4 text-primary" />
          {editRow ? "Edit Training Details" : "Add Training Details"}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${formOpen ? "rotate-180" : ""}`}
        />
      </button>

      {formOpen && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <label className="mb-1 block text-xs font-medium">
                Training Detail <span className="text-red-500">*</span>
              </label>
              <Input
                {...register("trainingDetailTitle")}
                placeholder="Training Detail"
              />
            </div>
            <div className="lg:col-span-3">
              <label className="mb-1 block text-xs font-medium">
                Training Detail Description
              </label>
              <Input
                {...register("trainingDetailDesc")}
                placeholder="Training Detail Description"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-medium">
                Trainer Name <span className="text-red-500">*</span>
              </label>
              <Input {...register("trainerName")} placeholder="Trainer Name" />
            </div>
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-medium">
                Trainer Details
              </label>
              <Input
                {...register("trainerDetails")}
                placeholder="Trainer Details"
              />
            </div>
            <div className="lg:col-span-2 flex items-end pb-2">
              <Controller
                name="isRecurring"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    Recurring
                  </label>
                )}
              />
            </div>

            {isRecurring && (
              <div className="lg:col-span-4">
                <Controller
                  name="fkDayIds"
                  control={control}
                  render={({ field }) => (
                    <MultiSelect
                      label="Week Day"
                      value={field.value}
                      onChange={field.onChange}
                      options={WEEK_DAYS.map((d) => ({ value: d, label: d }))}
                      placeholder="Select week days"
                    />
                  )}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 items-end">
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-medium text-primary">
                From Time
              </label>
              <Input type="time" {...register("startTime")} />
            </div>
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-medium text-primary">
                To Time
              </label>
              <Input type="time" {...register("endTime")} />
            </div>
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-medium">
                No of Students
              </label>
              <Input
                type="number"
                {...register("noOfStudents")}
                placeholder="No of Students"
              />
            </div>
            <div className="lg:col-span-2">
              <Controller
                name="roomId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Room"
                    value={field.value}
                    onChange={field.onChange}
                    options={rooms.map((r) => ({
                      value: String(r.roomId),
                      label: r.roomName,
                    }))}
                    placeholder="Room"
                  />
                )}
              />
            </div>
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-medium">Location</label>
              <Input {...register("location")} placeholder="Location" />
            </div>
            <div className="lg:col-span-1 flex items-end pb-2">
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(v) => {
                        const active = v === true;
                        field.onChange(active);
                        if (active) setValue("reason", "active");
                      }}
                    />
                    Active
                  </label>
                )}
              />
            </div>
            <div className="lg:col-span-1 flex items-end">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save Details"}
              </Button>
            </div>
          </div>

          {!isActive && (
            <div className="max-w-xs">
              <label className="mb-1 block text-xs font-medium">Reason</label>
              <Input {...register("reason")} placeholder="Reason" />
            </div>
          )}

          {submitError && (
            <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">
              {submitError}
            </p>
          )}

          {editRow && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearForm}
            >
              Cancel Edit
            </Button>
          )}
        </form>
      )}
    </div>
  );

  return (
    <>
      <FilteredListPage
        title={pageTitle}
        filters={addForm}
        filtersCollapsible={false}
        rowData={details}
        columnDefs={columnDefs}
        loading={loading}
        pagination
        toolbar={{
          search: true,
          searchPlaceholder: "Search",
          exportExcel: false,
          exportPdf: false,
        }}
        toolbarTrailing={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(
                `/trainings/training?yearName=${encodeURIComponent(yearName)}` +
                  `&collegeId=${collegeId}&paTraningId=${paTraningId}`,
              )
            }
          >
            Back
          </Button>
        }
      >
        <ViewTrainingDetailsModal
          open={viewRow != null}
          onClose={() => setViewRow(null)}
          mode="trainingsD"
          detail={
            viewRow
              ? {
                  ...viewRow,
                  yearName,
                  collegeCode,
                  paTrainingTitle: trainingTitle || viewRow.paTrainingTitle,
                  trainingTypeCatCode,
                  empName,
                  empNumber,
                  paStartDate: viewRow.paStartDate,
                  paEndDate: viewRow.paEndDate,
                }
              : null
          }
        />
      </FilteredListPage>
    </>
  );
}

export default function TrainingDetailPage() {
  return (
    <Suspense>
      <TrainingDetailContent />
    </Suspense>
  );
}
