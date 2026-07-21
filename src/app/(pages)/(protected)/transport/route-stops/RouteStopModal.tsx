"use client";

import { useEffect } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { FormModal } from "@/common/components/feedback";
import { ActiveStatusField } from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GM_CODES } from "@/config/constants/ui";
import { QK } from "@/lib/query-keys";
import {
  TRANSPORT_FIELD_LABEL_CLASS,
  TRANSPORT_INPUT_CLASS,
  TRANSPORT_MODAL_TITLE_CLASS,
} from "../_lib/modal-styles";
import { TransportOrgFields } from "../_components/TransportOrgFields";
import { toApiTime } from "../_lib/format-transport-time";
import {
  createRouteStop,
  listDistanceFeesByTransportAndFrequency,
  listGeneralDetailsByCode,
  updateRouteStop,
} from "@/services";
import type { DistanceFee, RouteStop, TransportRoute } from "@/types/transport";
import { toastError, toastSuccess } from "@/lib/toast";

const schema = z.object({
  organizationId: z.coerce.number().min(1, "Organization is required"),
  transportDetailId: z.coerce.number().min(1, "Transport is required"),
  feeFrequencyId: z.coerce.number().min(1, "Fee frequency is required"),
  stopName: z.string().min(1, "Stop name is required"),
  pickTime: z.string().min(1, "Pick time is required"),
  dropTime: z.string().min(1, "Drop time is required"),
  distanceFeeId: z.coerce.number().min(1, "Distance from college is required"),
  distanceFromSchoolKm: z.coerce.number().optional(),
  amount: z.coerce.number().min(0, "Amount is required"),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface RouteStopModalProps {
  open: boolean;
  onClose: () => void;
  row: RouteStop | null;
  routeId: number;
  parentRoute?: TransportRoute | null;
  onSaved: () => void;
}

function applyDistanceFee(
  fee: DistanceFee | undefined,
  setValue: (name: keyof FormValues, value: number | undefined) => void,
) {
  if (!fee) return;
  setValue("distanceFromSchoolKm", fee.toKm);
  setValue("amount", fee.amount ?? 0);
}

export function RouteStopModal({
  open,
  onClose,
  row,
  routeId,
  parentRoute,
  onSaved,
}: Readonly<RouteStopModalProps>) {
  const isEditing = row != null;
  const amountLocked = isEditing && row?.amount != null;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    resetField,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      isActive: true,
      reason: "active",
      pickTime: "09:00",
      dropTime: "09:00",
    },
  });

  const organizationId = watch("organizationId");
  const transportDetailId = watch("transportDetailId");
  const feeFrequencyId = watch("feeFrequencyId");
  const distanceFeeId = watch("distanceFeeId");

  const { data: feeFrequencies = [] } = useQuery({
    queryKey: ["Transport", "paymentTypeFreq"],
    queryFn: async () => {
      const [pmt, periodical] = await Promise.all([
        listGeneralDetailsByCode(GM_CODES.PAYMENT_TYPE_FREQ),
        listGeneralDetailsByCode(GM_CODES.PERIODICAL_FREQ),
      ]);
      const byId = new Map<number, (typeof pmt)[number]>();
      for (const row of [...pmt, ...periodical]) {
        const id = (row as { generalDetailId?: number }).generalDetailId;
        if (id != null) byId.set(id, row);
      }
      return [...byId.values()];
    },
    enabled: open,
  });

  const { data: distanceFees = [], isLoading: loadingDistanceFees } = useQuery({
    queryKey: QK.transport.distanceFeesByTransport(
      transportDetailId ?? 0,
      feeFrequencyId ?? 0,
    ),
    queryFn: () =>
      listDistanceFeesByTransportAndFrequency(
        transportDetailId!,
        feeFrequencyId!,
      ),
    enabled: open && (transportDetailId ?? 0) > 0 && (feeFrequencyId ?? 0) > 0,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      row
        ? {
            organizationId: row.organizationId,
            transportDetailId: row.transportDetailId,
            feeFrequencyId: row.feeFrequencyId,
            stopName: row.stopName ?? "",
            pickTime: row.pickTime?.slice(0, 5) ?? "09:00",
            dropTime: row.dropTime?.slice(0, 5) ?? "09:00",
            distanceFeeId: row.distanceFeeId,
            distanceFromSchoolKm: row.distanceFromSchoolKm,
            amount: row.amount ?? 0,
            isActive: row.isActive ?? true,
            reason: row.reason ?? "active",
          }
        : {
            isActive: true,
            reason: "active",
            pickTime: "09:00",
            dropTime: "09:00",
          },
    );
  }, [open, row, reset]);

  // Pre-fill org/transport from parent route on add (Angular parity)
  useEffect(() => {
    if (!open || isEditing || !parentRoute) return;
    if (parentRoute.organizationId && !organizationId) {
      setValue("organizationId", parentRoute.organizationId);
    }
    if (parentRoute.transportDetailId && !transportDetailId) {
      setValue("transportDetailId", parentRoute.transportDetailId);
    }
  }, [
    open,
    isEditing,
    parentRoute,
    organizationId,
    transportDetailId,
    setValue,
  ]);

  // On edit, resolve distanceFeeId by matching toKm when the band list loads
  useEffect(() => {
    if (!open || !isEditing || !row || distanceFees.length === 0) return;
    if (distanceFeeId) {
      applyDistanceFee(
        distanceFees.find((d) => d.distanceFeeId === distanceFeeId),
        setValue,
      );
      return;
    }
    const matched = distanceFees.find(
      (d) => d.toKm === row.distanceFromSchoolKm,
    );
    if (matched?.distanceFeeId != null) {
      setValue("distanceFeeId", matched.distanceFeeId);
      applyDistanceFee(matched, setValue);
    }
  }, [open, isEditing, row, distanceFees, distanceFeeId, setValue]);

  // Drop stale band when org/transport/frequency cascade no longer includes it
  useEffect(() => {
    if (!open || !distanceFeeId) return;
    if (loadingDistanceFees) return;
    if (!transportDetailId || !feeFrequencyId) return;
    if (distanceFees.some((d) => d.distanceFeeId === distanceFeeId)) return;
    resetField("distanceFeeId");
    resetField("amount");
    resetField("distanceFromSchoolKm");
  }, [
    open,
    distanceFeeId,
    loadingDistanceFees,
    transportDetailId,
    feeFrequencyId,
    distanceFees,
    resetField,
  ]);

  async function onSubmit(data: FormValues) {
    const payload = {
      organizationId: data.organizationId,
      transportDetailId: data.transportDetailId,
      feeFrequencyId: data.feeFrequencyId,
      stopName: data.stopName,
      distanceFeeId: data.distanceFeeId,
      distanceFromSchoolKm: data.distanceFromSchoolKm,
      amount: data.amount,
      pickTime: toApiTime(data.pickTime),
      dropTime: toApiTime(data.dropTime),
      routeId,
      isActive: data.isActive,
      reason: data.isActive ? "active" : data.reason?.trim() || "inactive",
    };
    try {
      if (isEditing && row?.routeStopId) {
        await updateRouteStop(row.routeStopId, payload);
        toastSuccess("Route stop updated");
      } else {
        await createRouteStop(payload);
        toastSuccess("Route stop created");
      }
      onSaved();
      onClose();
    } catch (err) {
      toastError(
        err,
        `Failed to ${isEditing ? "update" : "create"} route stop`,
      );
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Route Stop" : "Add Route Stop"}
      titleClassName={TRANSPORT_MODAL_TITLE_CLASS}
      showHeaderDivider
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
      submitLabel="Save"
      cancelLabel="Close"
      isSubmitting={isSubmitting}
      size="lg"
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <TransportOrgFields
            control={control}
            organizationId={organizationId}
            orgError={errors.organizationId?.message}
            transportError={errors.transportDetailId?.message}
            onOrganizationChange={() => {
              resetField("transportDetailId");
              resetField("distanceFeeId");
              resetField("amount");
              resetField("distanceFromSchoolKm");
            }}
          />
          <Controller
            name="feeFrequencyId"
            control={control}
            render={({ field }) => (
              <Select
                label="Fee Frequency *"
                value={field.value != null ? String(field.value) : null}
                onChange={(v) => {
                  field.onChange(v ? Number(v) : undefined);
                  resetField("distanceFeeId");
                  resetField("amount");
                  resetField("distanceFromSchoolKm");
                }}
                options={feeFrequencies.map((f) => {
                  const r = f as {
                    generalDetailId?: number;
                    generalDetailDisplayName?: string;
                  };
                  return {
                    value: String(r.generalDetailId),
                    label:
                      r.generalDetailDisplayName ?? String(r.generalDetailId),
                  };
                })}
                placeholder="Select"
                searchable
                clearable
                error={errors.feeFrequencyId?.message}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>Stop Name *</Label>
            <Input
              className={TRANSPORT_INPUT_CLASS}
              {...register("stopName")}
            />
            {errors.stopName ? (
              <p className="text-xs text-destructive">
                {errors.stopName.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>Pick Time *</Label>
            <Input
              type="time"
              className={TRANSPORT_INPUT_CLASS}
              {...register("pickTime")}
            />
            {errors.pickTime ? (
              <p className="text-xs text-destructive">
                {errors.pickTime.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>Drop Time *</Label>
            <Input
              type="time"
              className={TRANSPORT_INPUT_CLASS}
              {...register("dropTime")}
            />
            {errors.dropTime ? (
              <p className="text-xs text-destructive">
                {errors.dropTime.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Controller
            name="distanceFeeId"
            control={control}
            render={({ field }) => (
              <Select
                label="Distance From College *"
                value={field.value != null ? String(field.value) : null}
                onChange={(v) => {
                  const id = v ? Number(v) : undefined;
                  field.onChange(id);
                  applyDistanceFee(
                    distanceFees.find((d) => d.distanceFeeId === id),
                    setValue,
                  );
                }}
                options={distanceFees
                  .filter((d) => d.distanceFeeId != null)
                  .map((d) => ({
                    value: String(d.distanceFeeId),
                    label: `(${d.fromKm ?? 0}-${d.toKm ?? 0})KMS`,
                  }))}
                placeholder={
                  !transportDetailId || !feeFrequencyId
                    ? "Select transport & frequency first"
                    : distanceFees.length === 0
                      ? "No distance bands for this transport & frequency"
                      : "Select distance band"
                }
                searchable
                isLoading={loadingDistanceFees}
                disabled={!transportDetailId || !feeFrequencyId}
                error={errors.distanceFeeId?.message}
              />
            )}
          />
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>Amount *</Label>
            <Input
              type="number"
              className={TRANSPORT_INPUT_CLASS}
              readOnly={amountLocked}
              {...register("amount")}
            />
            {errors.amount ? (
              <p className="text-xs text-destructive">
                {errors.amount.message}
              </p>
            ) : null}
          </div>
        </div>

        <Controller
          name="isActive"
          control={control}
          render={({ field }) => (
            <ActiveStatusField
              isActive={field.value}
              reason={watch("reason") ?? ""}
              onActiveChange={field.onChange}
              onReasonChange={(v) => setValue("reason", v)}
            />
          )}
        />
      </div>
    </FormModal>
  );
}
