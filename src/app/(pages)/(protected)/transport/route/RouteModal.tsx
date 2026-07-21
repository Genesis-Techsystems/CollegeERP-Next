"use client";

import { useEffect } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormModal } from "@/common/components/feedback";
import { ActiveStatusField } from "@/common/components/forms";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TRANSPORT_FIELD_LABEL_CLASS,
  TRANSPORT_INPUT_CLASS,
  TRANSPORT_MODAL_TITLE_CLASS,
} from "../_lib/modal-styles";
import { TransportOrgFields } from "../_components/TransportOrgFields";
import { createRoute, updateRoute } from "@/services";
import type { TransportRoute } from "@/types/transport";
import { toastError, toastSuccess } from "@/lib/toast";

const schema = z.object({
  organizationId: z.coerce.number().min(1, "Organization is required"),
  transportDetailId: z.coerce.number().optional(),
  serviceNumber: z.string().min(1, "Service number is required"),
  routeCode: z.string().optional(),
  routePickupPlace: z.string().optional(),
  routeDropPlace: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface RouteModalProps {
  open: boolean;
  onClose: () => void;
  row: TransportRoute | null;
  onSaved: () => void | Promise<void>;
}

export function RouteModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<RouteModalProps>) {
  const isEditing = row != null;
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
    defaultValues: { isActive: true, reason: "active" },
  });

  const organizationId = watch("organizationId");

  useEffect(() => {
    if (!open) return;
    reset(
      row
        ? {
            organizationId: row.organizationId,
            transportDetailId: row.transportDetailId,
            serviceNumber: row.serviceNumber ?? "",
            routeCode: row.routeCode ?? "",
            routePickupPlace: row.routePickupPlace ?? "",
            routeDropPlace: row.routeDropPlace ?? "",
            isActive: row.isActive ?? true,
            reason: row.reason ?? "active",
          }
        : { isActive: true, reason: "active" },
    );
  }, [open, row, reset]);

  async function onSubmit(data: FormValues) {
    const payload = {
      ...data,
      reason: data.isActive ? "active" : data.reason?.trim() || "inactive",
    };
    try {
      if (isEditing && row?.routeId) {
        await updateRoute(row.routeId, payload);
        toastSuccess("Route updated");
      } else {
        await createRoute(payload);
        toastSuccess("Route created");
      }
      await onSaved();
      onClose();
    } catch (err) {
      toastError(err, `Failed to ${isEditing ? "update" : "create"} route`);
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Route" : "Add Route"}
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <TransportOrgFields
            control={control}
            organizationId={organizationId}
            orgError={errors.organizationId?.message}
            onOrganizationChange={() =>
              setValue("transportDetailId", undefined)
            }
            transportRequired={false}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>
              Service Number *
            </Label>
            <Input
              className={TRANSPORT_INPUT_CLASS}
              {...register("serviceNumber")}
            />
            {errors.serviceNumber ? (
              <p className="text-xs text-destructive">
                {errors.serviceNumber.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>Route Code</Label>
            <Input
              className={TRANSPORT_INPUT_CLASS}
              {...register("routeCode")}
            />
          </div>
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>Pickup Place</Label>
            <Input
              className={TRANSPORT_INPUT_CLASS}
              {...register("routePickupPlace")}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>Drop Place</Label>
            <Input
              className={TRANSPORT_INPUT_CLASS}
              {...register("routeDropPlace")}
            />
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
