"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { PencilIcon } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ActiveStatusField } from "@/common/components/forms";
import { FormModal } from "@/common/components/feedback";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { StatusBadge } from "@/common/components/data-display";
import { Table } from "@/common/components/table";
import type { TableColumn } from "@/common/components/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { GM_CODES } from "@/config/constants/ui";
import { QK } from "@/lib/query-keys";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createAdmissionAllotmentDetail,
  listAdmissionAllotmentDetails,
  listGeneralDetailsByMaster,
  updateAdmissionAllotmentDetail,
} from "@/services";
import type {
  AdmissionAllotmentDetailRow,
  AdmissionAllotmentRow,
} from "@/types/admission";
import type { AdmissionAllotmentModalContext } from "./AdmissionAllotmentModal";

const requiredNumber = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    const n = Number(value);
    return Number.isNaN(n) ? undefined : n;
  },
  z.number({ error: "Required" }),
);

const schema = z.object({
  quotaCatdetId: z.number().min(1, "Quota is required"),
  allocatedSeats: requiredNumber,
  filledSeats: requiredNumber,
  lastdayOfCounselling: z.date({
    error: "Last day of counselling is required",
  }),
  isCounselling: z.boolean(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function detailId(row: AdmissionAllotmentDetailRow): number | undefined {
  return row.univAdmissionAllotmentDetailsId ?? row.univAdmissionAllotmentDetId;
}

function parseCounsellingDate(value?: string): Date {
  if (!value) return new Date();
  try {
    const d = parseISO(String(value).slice(0, 10));
    return Number.isNaN(d.getTime()) ? new Date(value) : d;
  } catch {
    return new Date(value);
  }
}

interface AdmissionAllotmentDetailsModalProps {
  open: boolean;
  onClose: () => void;
  allotment: AdmissionAllotmentRow | null;
  context: AdmissionAllotmentModalContext;
  onSaved: () => void;
}

export function AdmissionAllotmentDetailsModal({
  open,
  onClose,
  allotment,
  context,
  onSaved,
}: Readonly<AdmissionAllotmentDetailsModalProps>) {
  const queryClient = useQueryClient();
  const allotmentId = allotment?.univAdmissionAllotmentId ?? 0;
  const [editingDetailId, setEditingDetailId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      quotaCatdetId: undefined,
      allocatedSeats: undefined,
      filledSeats: undefined,
      lastdayOfCounselling: new Date(),
      isCounselling: true,
      isActive: true,
      reason: "",
    },
  });

  const { data: quotas = [] } = useQuery({
    queryKey: ["Admission", "generalDetails", GM_CODES.QUOTA],
    queryFn: () => listGeneralDetailsByMaster(GM_CODES.QUOTA),
    enabled: open,
  });

  const quotaOptions = useMemo(
    () =>
      quotas.map((q) => ({
        value: String(q.generalDetailId),
        label:
          String(
            q.generalDetailDisplayName ??
              q.generalDetailName ??
              q.generalDetailCode ??
              "",
          ) || String(q.generalDetailId),
      })),
    [quotas],
  );

  const {
    data: detailRows = [],
    isLoading: detailsLoading,
    refetch: refetchDetails,
  } = useQuery({
    queryKey: QK.admission.admissionAllotmentDetails(allotmentId),
    queryFn: () => listAdmissionAllotmentDetails(allotmentId),
    enabled: open && allotmentId > 0,
  });

  function resetForm() {
    setEditingDetailId(null);
    reset({
      quotaCatdetId: undefined,
      allocatedSeats: undefined,
      filledSeats: undefined,
      lastdayOfCounselling: new Date(),
      isCounselling: true,
      isActive: true,
      reason: "",
    });
  }

  useEffect(() => {
    if (!open) return;
    setEditingDetailId(null);
    reset({
      quotaCatdetId: undefined,
      allocatedSeats: undefined,
      filledSeats: undefined,
      lastdayOfCounselling: new Date(),
      isCounselling: true,
      isActive: true,
      reason: "",
    });
  }, [open, allotmentId, reset]);

  function loadForEdit(row: AdmissionAllotmentDetailRow) {
    const id = detailId(row);
    if (!id) return;
    setEditingDetailId(id);
    reset({
      quotaCatdetId: row.quotaCatdetId,
      allocatedSeats: row.allocatedSeats,
      filledSeats: row.filledSeats,
      lastdayOfCounselling: parseCounsellingDate(row.lastdayOfCounselling),
      isCounselling: row.isCounselling ?? true,
      isActive: row.isActive ?? true,
      reason: row.reason ?? "",
    });
  }

  async function onSubmit(data: FormValues) {
    if (!allotmentId) return;
    const payload = {
      collegeId: context.collegeId,
      univAdmissionAllotmentId: allotmentId,
      quotaCatdetId: data.quotaCatdetId,
      allocatedSeats: data.allocatedSeats,
      filledSeats: data.filledSeats,
      lastdayOfCounselling: format(
        data.lastdayOfCounselling,
        "yyyy-MM-dd'T'00:00:00",
      ),
      isCounselling: data.isCounselling,
      isActive: data.isActive,
      reason: data.isActive ? "active" : data.reason?.trim() || "inactive",
    };
    try {
      if (editingDetailId != null) {
        await updateAdmissionAllotmentDetail(editingDetailId, {
          filledSeats: payload.filledSeats,
          lastdayOfCounselling: payload.lastdayOfCounselling,
          quotaCatdetId: payload.quotaCatdetId,
          allocatedSeats: payload.allocatedSeats,
          isCounselling: payload.isCounselling,
          isActive: payload.isActive,
          reason: payload.reason,
        });
        toastSuccess("Allotment details updated");
        resetForm();
        await refetchDetails();
        onSaved();
        void queryClient.invalidateQueries({
          queryKey: QK.admission.admissionAllotmentDetails(allotmentId),
        });
      } else {
        await createAdmissionAllotmentDetail(payload);
        toastSuccess("Allotment details created");
        // Angular closes after create and parent refreshes lists.
        void queryClient.invalidateQueries({
          queryKey: QK.admission.admissionAllotmentDetails(allotmentId),
        });
        onSaved();
        onClose();
      }
    } catch (err) {
      toastError(
        err,
        `Failed to ${editingDetailId != null ? "update" : "create"} allotment details`,
      );
    }
  }

  const titleSuffix =
    context.universityCode && context.collegeCode
      ? ` - ${context.universityCode} / ${context.collegeCode}`
      : "";

  const columns = useMemo<TableColumn<AdmissionAllotmentDetailRow>[]>(
    () => [
      { id: "id", label: "S.No.", width: 8, type: "id" },
      {
        id: "quotaCatdetCode",
        label: "Quota",
        width: 14,
        render: (row) => row.quotaCatdetCode ?? row.quotaCatdetName ?? "—",
      },
      { id: "allocatedSeats", label: "Allocated Seats", width: 14 },
      { id: "filledSeats", label: "Filled Seats", width: 12 },
      {
        id: "lastdayOfCounselling",
        label: "Last Day Of Counselling",
        width: 20,
        render: (row) => {
          if (!row.lastdayOfCounselling) return "—";
          try {
            return format(
              parseCounsellingDate(row.lastdayOfCounselling),
              "MMM d, yyyy",
            );
          } catch {
            return String(row.lastdayOfCounselling);
          }
        },
      },
      {
        id: "isActive",
        label: "Status",
        width: 12,
        render: (row) => <StatusBadge status={row.isActive ?? false} />,
      },
      {
        id: "actions",
        label: "Actions",
        width: 10,
        type: "action",
        render: (row) => (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            aria-label="Edit allotment details"
            onClick={() => loadForEdit(row)}
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <FormModal
      open={open}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title={`Admission Allotment Details${titleSuffix}`}
      titleClassName="text-[15px] font-semibold leading-none text-[#5da394]"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit, () => {
          toastError(new Error("Please fill in all required fields"));
        })();
      }}
      isSubmitting={isSubmitting}
      submitLabel={editingDetailId != null ? "Update" : "Save"}
      size="xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Controller
            name="quotaCatdetId"
            control={control}
            render={({ field }) => (
              <Select
                label="Quota"
                required
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                options={quotaOptions}
                placeholder="Select quota"
                searchable
                error={errors.quotaCatdetId?.message}
              />
            )}
          />
          <div className="space-y-1">
            <Label className="text-[12px]">
              Allocated Seats <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              className="h-9 text-[12px]"
              {...register("allocatedSeats")}
            />
            {errors.allocatedSeats?.message && (
              <p className="text-[11px] text-destructive">
                {errors.allocatedSeats.message}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">
              Filled Seats <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              className="h-9 text-[12px]"
              {...register("filledSeats")}
            />
            {errors.filledSeats?.message && (
              <p className="text-[11px] text-destructive">
                {errors.filledSeats.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Controller
            name="lastdayOfCounselling"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Last Day Of Counselling"
                required
                value={field.value ?? null}
                onChange={(d) => field.onChange(d ?? new Date())}
                error={errors.lastdayOfCounselling?.message}
              />
            )}
          />
          <div className="flex items-center gap-2 pt-6">
            <Controller
              name="isCounselling"
              control={control}
              render={({ field }) => (
                <>
                  <Checkbox
                    id="isCounselling"
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(v === true)}
                  />
                  <Label
                    htmlFor="isCounselling"
                    className="cursor-pointer text-[12px]"
                  >
                    isCounselling
                  </Label>
                </>
              )}
            />
          </div>
          <div className="sm:col-span-1 pt-2">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <ActiveStatusField
                  isActive={field.value}
                  reason={watch("reason") ?? ""}
                  onActiveChange={field.onChange}
                  onReasonChange={(v) => setValue("reason", String(v))}
                  reasonError={errors.reason?.message}
                />
              )}
            />
          </div>
        </div>

        {detailRows.length > 0 && (
          <Table
            rows={detailRows}
            columns={columns}
            loading={detailsLoading}
            pageSize={5}
            density="compact"
            emptyText="No allotment details found."
          />
        )}
      </div>
    </FormModal>
  );
}
