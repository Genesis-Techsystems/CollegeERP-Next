"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { format } from "date-fns";
import { FormModal } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { DatePicker } from "@/common/components/date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { PlacementTraining } from "@/types/trainings";
import type { College } from "@/types/college";
import { listColleges } from "@/services/admin/college";
import { listGeneralDetailsByMaster } from "@/services/examination";
import { searchEmployeesForCompanyMeeting } from "@/services/placements";
import { createTraining, updateTraining } from "@/services/trainings";
import { GM_CODES } from "@/config/constants/ui";

type TrackAudience = "null" | "true" | "false";

type FormValues = {
  collegeId: string | null;
  yearName: string | null;
  trainingTypeCatId: string | null;
  trainingTitle: string;
  employeeId: string | null;
  trainingDescription: string;
  trainerName: string;
  trainerDetails: string;
  discussionPoints: string;
  startDate: Date | null;
  endDate: Date | null;
  isTrackAudience: TrackAudience;
  isActive: boolean;
  reason: string;
};

function buildYearOptions(): { value: string; label: string }[] {
  const current = new Date().getFullYear();
  return Array.from({ length: 10 }, (_, i) => {
    const y = String(current - i);
    return { value: y, label: y };
  });
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toTrackAudience(
  v: boolean | null | undefined | "null" | string,
): TrackAudience {
  // API / Angular may return null, string "null", or booleans
  if (v == null || v === "null" || v === "All") return "null";
  if (v === true || v === "true") return "true";
  return "false";
}

/** Angular mat-option values: `'null'` | true | false — All must stay the string `"null"`. */
function fromTrackAudience(v: TrackAudience): boolean | "null" {
  if (v === "null") return "null";
  return v === "true";
}

function getDefaults(edit?: PlacementTraining | null): FormValues {
  if (edit) {
    return {
      collegeId: String(edit.collegeId),
      yearName: String(edit.yearName),
      trainingTypeCatId:
        edit.trainingTypeCatId != null ? String(edit.trainingTypeCatId) : null,
      trainingTitle: edit.trainingTitle ?? "",
      employeeId: edit.employeeId != null ? String(edit.employeeId) : null,
      trainingDescription: edit.trainingDescription ?? "",
      trainerName: edit.trainerName ?? "",
      trainerDetails: edit.trainerDetails ?? "",
      discussionPoints: edit.discussionPoints ?? "",
      startDate: parseDate(edit.startDate) ?? new Date(),
      endDate: parseDate(edit.endDate) ?? new Date(),
      isTrackAudience: toTrackAudience(edit.isTrackAudience),
      isActive: edit.isActive,
      reason: edit.reason ?? "active",
    };
  }
  return {
    collegeId: null,
    yearName: null,
    trainingTypeCatId: null,
    trainingTitle: "",
    employeeId: null,
    trainingDescription: "",
    trainerName: "",
    trainerDetails: "",
    discussionPoints: "",
    startDate: new Date(),
    endDate: new Date(),
    isTrackAudience: "null",
    isActive: true,
    reason: "active",
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  editData: PlacementTraining | null;
  onSaved: () => void;
}

export default function AddTrainingModal({
  open,
  onClose,
  editData,
  onSaved,
}: Props) {
  const [colleges, setColleges] = useState<College[]>([]);
  const [trainingTypes, setTrainingTypes] = useState<
    Array<{ generalDetailId: number; generalDetailDisplayName: string }>
  >([]);
  const [employees, setEmployees] = useState<
    Array<{ employeeId: number; firstName: string; empNumber?: string | null }>
  >([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: getDefaults(editData),
  });

  const collegeId = watch("collegeId");
  const isActive = watch("isActive");
  const employeeId = watch("employeeId");

  useEffect(() => {
    if (!open) return;
    listColleges().then(setColleges).catch(console.error);
    listGeneralDetailsByMaster(GM_CODES.TRAINING_TYPE)
      .then((rows) =>
        setTrainingTypes(
          (rows as Array<{
            generalDetailId: number;
            generalDetailDisplayName: string;
          }>) ?? [],
        ),
      )
      .catch(console.error);
  }, [open]);

  useEffect(() => {
    reset(getDefaults(editData));
    setSubmitError(null);
    setEmployees([]);
    if (open && editData?.empNumber && editData.collegeId) {
      void searchIncharge(String(editData.empNumber), editData.collegeId);
    }
  }, [open, editData, reset]);

  async function searchIncharge(term: string, college?: number) {
    const cid = college ?? Number(collegeId);
    if (!cid || term.trim().length < 5) {
      setEmployees([]);
      return;
    }
    setLoadingEmployees(true);
    try {
      const rows = await searchEmployeesForCompanyMeeting(cid, term);
      setEmployees(
        rows
          .map((r) => ({
            employeeId: Number(r.employeeId ?? 0),
            firstName: String(r.firstName ?? r.empName ?? r.employeeName ?? ""),
            empNumber: (r.empNumber as string | null | undefined) ?? null,
          }))
          .filter((e) => e.employeeId > 0),
      );
    } catch {
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }

  const employeeOptions = useMemo(() => {
    const opts = employees.map((e) => ({
      value: String(e.employeeId),
      label: e.empNumber ? `${e.firstName} (${e.empNumber})` : e.firstName,
    }));
    // Keep selected edit employee visible even if search not re-run
    if (
      editData?.employeeId &&
      employeeId === String(editData.employeeId) &&
      !opts.some((o) => o.value === String(editData.employeeId))
    ) {
      opts.unshift({
        value: String(editData.employeeId),
        label: editData.empNumber
          ? `${editData.empName ?? "Employee"} (${editData.empNumber})`
          : (editData.empName ?? "Employee"),
      });
    }
    return opts;
  }, [employees, editData, employeeId]);

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    if (
      !values.collegeId ||
      !values.yearName ||
      !values.startDate ||
      !values.endDate
    ) {
      setSubmitError("Please fill required fields");
      return;
    }
    try {
      // Angular closes the dialog with the form object; update also sets traningId on the body.
      const payload: Partial<PlacementTraining> = {
        collegeId: Number(values.collegeId),
        trainingTypeCatId: values.trainingTypeCatId
          ? Number(values.trainingTypeCatId)
          : undefined,
        yearName: values.yearName,
        employeeId: values.employeeId ? Number(values.employeeId) : undefined,
        trainingTitle: values.trainingTitle,
        trainingDescription: values.trainingDescription,
        trainerName: values.trainerName,
        trainerDetails: values.trainerDetails,
        discussionPoints: values.discussionPoints,
        startDate: format(values.startDate, "yyyy-MM-dd"),
        endDate: format(values.endDate, "yyyy-MM-dd"),
        // Must be string `"null"` for All (not JSON null) — Angular `[value]="'null'"`
        isTrackAudience: fromTrackAudience(values.isTrackAudience),
        isActive: values.isActive,
        reason: values.isActive ? values.reason || "active" : values.reason,
      };
      if (editData) {
        payload.traningId = editData.traningId;
        payload.createdDt = editData.createdDt;
        await updateTraining(editData.traningId, payload);
      } else {
        await createTraining(payload);
      }
      onSaved();
      onClose();
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "Failed to save training",
      );
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={editData ? "Edit Training" : "Add Training"}
      size="xl"
      cancelLabel="Close"
      submitLabel="Save"
      isSubmitting={isSubmitting}
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
      formClassName="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
        <div className="sm:col-span-3">
          <Controller
            name="collegeId"
            control={control}
            render={({ field }) => (
              <Select
                label="College"
                value={field.value}
                onChange={(v) => {
                  field.onChange(v);
                  setValue("yearName", null);
                  setValue("employeeId", null);
                  setEmployees([]);
                }}
                options={colleges.map((c) => ({
                  value: String(c.collegeId),
                  label: c.collegeCode || c.collegeName,
                }))}
                placeholder="College"
              />
            )}
          />
        </div>
        <div className="sm:col-span-2">
          <Controller
            name="yearName"
            control={control}
            render={({ field }) => (
              <Select
                label="Year"
                value={field.value}
                onChange={field.onChange}
                options={buildYearOptions()}
                placeholder="Year"
                disabled={!collegeId}
              />
            )}
          />
        </div>
        <div className="sm:col-span-7">
          <Controller
            name="trainingTypeCatId"
            control={control}
            render={({ field }) => (
              <Select
                label="Training Type"
                value={field.value}
                onChange={field.onChange}
                options={trainingTypes.map((t) => ({
                  value: String(t.generalDetailId),
                  label: t.generalDetailDisplayName,
                }))}
                placeholder="Training Type"
              />
            )}
          />
        </div>

        <div className="sm:col-span-6">
          <label className="text-xs font-medium mb-1 block">
            Training Title
          </label>
          <Input {...register("trainingTitle")} placeholder="Training Title" />
        </div>
        <div className="sm:col-span-6">
          <Controller
            name="employeeId"
            control={control}
            render={({ field }) => (
              <Select
                label="Incharge"
                value={field.value}
                onChange={field.onChange}
                options={employeeOptions}
                placeholder="Search by Employee name or Id…"
                searchable
                onSearch={(term) => void searchIncharge(term)}
                isLoading={loadingEmployees}
                disabled={!collegeId}
              />
            )}
          />
        </div>

        <div className="sm:col-span-12">
          <label className="text-xs font-medium mb-1 block">
            Training Description
          </label>
          <Textarea
            {...register("trainingDescription")}
            rows={3}
            placeholder="Training Description"
          />
        </div>

        <div className="sm:col-span-6">
          <label className="text-xs font-medium mb-1 block">Trainer Name</label>
          <Input {...register("trainerName")} placeholder="Trainer Name" />
        </div>
        <div className="sm:col-span-6">
          <label className="text-xs font-medium mb-1 block">
            Trainer Details
          </label>
          <Input
            {...register("trainerDetails")}
            placeholder="Trainer Details"
          />
        </div>

        <div className="sm:col-span-12">
          <label className="text-xs font-medium mb-1 block">
            Discussion Points
          </label>
          <Textarea
            {...register("discussionPoints")}
            rows={2}
            placeholder="Discussion Points"
          />
        </div>

        <div className="sm:col-span-4">
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Start Date"
                value={field.value}
                onChange={field.onChange}
                displayFormat="dd/MM/yyyy"
                clearable={false}
              />
            )}
          />
        </div>
        <div className="sm:col-span-4">
          <Controller
            name="endDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="End Date"
                value={field.value}
                onChange={field.onChange}
                displayFormat="dd/MM/yyyy"
                clearable={false}
              />
            )}
          />
        </div>
        <div className="sm:col-span-4">
          <Controller
            name="isTrackAudience"
            control={control}
            render={({ field }) => (
              <Select
                label="Training To"
                value={field.value}
                onChange={(v) => field.onChange((v ?? "null") as TrackAudience)}
                options={[
                  { value: "null", label: "All" },
                  { value: "true", label: "Student" },
                  { value: "false", label: "Staff" },
                ]}
                placeholder="Training To"
                clearable={false}
              />
            )}
          />
        </div>

        <div className="sm:col-span-4 flex items-end pb-2">
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

        {!isActive && (
          <div className="sm:col-span-4">
            <label className="text-xs font-medium mb-1 block">Reason</label>
            <Input {...register("reason")} placeholder="Reason" />
          </div>
        )}
      </div>

      {submitError && (
        <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">
          {submitError}
        </p>
      )}
    </FormModal>
  );
}
