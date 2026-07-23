"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { FormModal } from "@/common/components/feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActiveStatusField } from "@/common/components/forms";
import { DatePicker } from "@/common/components/date-picker";
import { Select, type SelectOption } from "@/common/components/select";
import { toDateOnlyISO } from "@/common/generic-functions";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createInvSupplier,
  listActiveOrganizationsForInventory,
  listCitiesForInvSupplier,
  listDistrictsForInvSupplier,
  listStatesForInvSupplier,
  updateInvSupplier,
} from "@/services";
import type { InvSupplier } from "@/types/inventory";

/** Angular CONSTANTS.patterns */
const PHONE_RE = /^[6-9][0-9]{9}$/;
const EMAIL_RE = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+.[a-zA-Z0-9-.]+$/;

const optionalPhone = z
  .string()
  .optional()
  .refine((v) => !v || PHONE_RE.test(v), { message: "Enter 10 digit number" });

const optionalEmail = z
  .string()
  .optional()
  .refine((v) => !v || EMAIL_RE.test(v), { message: "Enter a valid email" });

const schema = z.object({
  organizationId: z.coerce.number().min(1, "Organization is required"),
  supplierName: z.string().min(1, "Supplier Name is required"),
  offaddline1: z.string().min(1, "Address Line 1 is required"),
  offaddline2: z.string().optional(),
  stateId: z.coerce.number().min(1, "State is required"),
  districtId: z.coerce.number().min(1, "District is required"),
  cityId: z.coerce.number().min(1, "City is required"),
  officePincode: z.string().min(1, "Office Pin Code is required"),
  officeEmail: z
    .string()
    .min(1, "Office Email is required")
    .refine((v) => EMAIL_RE.test(v), { message: "Enter a valid email" }),
  officeFax: z.string().min(1, "Fax is required"),
  officeWebsite: z.string().optional(),
  contact1Name: z.string().optional(),
  contact1Phone: optionalPhone,
  contact1Email: optionalEmail,
  contact2Name: z.string().optional(),
  contact2Phone: optionalPhone,
  contact2Email: optionalEmail,
  cstno: z.string().min(1, "CST No is required"),
  gstno: z.string().min(1, "GST No is required"),
  startdate: z.string().min(1, "Start Date is required"),
  enddate: z.string().min(1, "End Date is required"),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function todayYmd(): string {
  return toDateOnlyISO(new Date());
}

function toYmd(value?: string | null): string {
  if (!value) return todayYmd();
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return todayYmd();
  return toDateOnlyISO(d);
}

function getDefaults(edit?: InvSupplier | null): FormValues {
  return {
    organizationId: edit?.organizationId ?? 0,
    supplierName: edit?.supplierName ?? "",
    offaddline1: edit?.offaddline1 ?? "",
    offaddline2: edit?.offaddline2 ?? "",
    stateId: edit?.stateId ?? 0,
    districtId: edit?.districtId ?? 0,
    cityId: edit?.cityId ?? 0,
    officePincode: edit?.officePincode ?? "",
    officeEmail: edit?.officeEmail ?? "",
    officeFax: edit?.officeFax ?? "",
    officeWebsite: edit?.officeWebsite ?? "",
    contact1Name: edit?.contact1Name ?? "",
    contact1Phone: edit?.contact1Phone ?? "",
    contact1Email: edit?.contact1Email ?? "",
    contact2Name: edit?.contact2Name ?? "",
    contact2Phone: edit?.contact2Phone ?? "",
    contact2Email: edit?.contact2Email ?? "",
    cstno: edit?.cstno ?? "",
    gstno: edit?.gstno ?? "",
    startdate: edit ? toYmd(edit.startdate) : todayYmd(),
    enddate: edit ? toYmd(edit.enddate) : todayYmd(),
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? "active",
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  editData: InvSupplier | null;
  onSaved: () => void;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[11px] leading-tight text-red-500">{message}</p>;
}

export default function SupplierMasterModal({
  open,
  onClose,
  editData,
  onSaved,
}: Props) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: getDefaults(),
  });

  const stateId = watch("stateId");
  const districtId = watch("districtId");

  const { data: organizations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ["Organizations", "activeForInventory"],
    queryFn: listActiveOrganizationsForInventory,
    enabled: open,
  });

  const { data: states = [], isLoading: statesLoading } = useQuery({
    queryKey: ["State", "forInvSupplier"],
    queryFn: listStatesForInvSupplier,
    enabled: open,
  });

  const { data: districts = [], isLoading: districtsLoading } = useQuery({
    queryKey: ["District", "forInvSupplier", stateId],
    queryFn: () => listDistrictsForInvSupplier(stateId),
    enabled: open && stateId > 0,
  });

  const { data: cities = [], isLoading: citiesLoading } = useQuery({
    queryKey: ["City", "forInvSupplier", districtId],
    queryFn: () => listCitiesForInvSupplier(districtId),
    enabled: open && districtId > 0,
  });

  const organizationOptions: SelectOption[] = useMemo(
    () =>
      organizations.map((o) => ({
        value: String(o.organizationId ?? ""),
        label: String(o.orgCode ?? o.orgName ?? o.organizationId ?? ""),
      })),
    [organizations],
  );

  const stateOptions: SelectOption[] = useMemo(
    () =>
      states.map((s) => ({
        value: String(s.stateId ?? ""),
        label: String(s.stateName ?? s.stateId ?? ""),
      })),
    [states],
  );

  const districtOptions: SelectOption[] = useMemo(
    () =>
      districts.map((d) => ({
        value: String(d.districtId ?? ""),
        label: String(d.districtName ?? d.districtId ?? ""),
      })),
    [districts],
  );

  const cityOptions: SelectOption[] = useMemo(
    () =>
      cities.map((c) => ({
        value: String(c.cityId ?? ""),
        label: String(c.cityName ?? c.cityId ?? ""),
      })),
    [cities],
  );

  useEffect(() => {
    if (!open) return;
    reset(getDefaults(editData));
  }, [open, editData, reset]);

  async function onSubmit(values: FormValues) {
    const payload: Partial<InvSupplier> = {
      organizationId: values.organizationId,
      supplierName: values.supplierName.trim(),
      offaddline1: values.offaddline1.trim(),
      offaddline2: values.offaddline2?.trim() || undefined,
      stateId: values.stateId,
      districtId: values.districtId,
      cityId: values.cityId,
      officePincode: values.officePincode.trim(),
      officeEmail: values.officeEmail.trim(),
      officeFax: values.officeFax.trim(),
      officeWebsite: values.officeWebsite?.trim() || undefined,
      contact1Name: values.contact1Name?.trim() || undefined,
      contact1Phone: values.contact1Phone?.trim() || undefined,
      contact1Email: values.contact1Email?.trim() || undefined,
      contact2Name: values.contact2Name?.trim() || undefined,
      contact2Phone: values.contact2Phone?.trim() || undefined,
      contact2Email: values.contact2Email?.trim() || undefined,
      cstno: values.cstno.trim(),
      gstno: values.gstno.trim(),
      startdate: toYmd(values.startdate),
      enddate: toYmd(values.enddate),
      isActive: values.isActive,
      reason: values.isActive ? "active" : values.reason?.trim() || "inactive",
    };

    try {
      if (editData) {
        await updateInvSupplier(editData.supplierId, {
          ...payload,
          supplierId: editData.supplierId,
        });
        toastSuccess("Supplier master updated successfully.");
      } else {
        await createInvSupplier(payload);
        toastSuccess("Supplier master created successfully.");
      }
      onSaved();
      onClose();
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={editData ? "Edit Supplier Master" : "Add Supplier Master"}
      titleClassName="text-[hsl(var(--primary))] text-base font-semibold"
      size="xl"
      isSubmitting={isSubmitting}
      submitLabel="Save"
      cancelLabel="Cancel"
      formClassName="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
    >
      <div className="grid grid-cols-1 gap-x-2.5 gap-y-1.5 sm:grid-cols-4">
        <Controller
          name="organizationId"
          control={control}
          render={({ field }) => (
            <Select
              label="Organization *"
              value={field.value > 0 ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : 0)}
              options={organizationOptions}
              placeholder="Organization"
              isLoading={orgsLoading}
              searchable
              error={errors.organizationId?.message}
            />
          )}
        />
        <div className="space-y-0.5 sm:col-span-3">
          <Label className="text-xs">Supplier Name *</Label>
          <Input
            className="h-8 text-xs"
            placeholder="Supplier Name"
            {...register("supplierName")}
          />
          <FieldError message={errors.supplierName?.message} />
        </div>

        <div className="space-y-0.5 sm:col-span-2">
          <Label className="text-xs">Address Line 1 *</Label>
          <Input
            className="h-8 text-xs"
            placeholder="Address Line 1"
            {...register("offaddline1")}
          />
          <FieldError message={errors.offaddline1?.message} />
        </div>
        <div className="space-y-0.5 sm:col-span-2">
          <Label className="text-xs">Address Line 2</Label>
          <Input
            className="h-8 text-xs"
            placeholder="Address Line 2"
            {...register("offaddline2")}
          />
        </div>

        <Controller
          name="stateId"
          control={control}
          render={({ field }) => (
            <Select
              label="State *"
              value={field.value > 0 ? String(field.value) : null}
              onChange={(v) => {
                field.onChange(v ? Number(v) : 0);
                setValue("districtId", 0);
                setValue("cityId", 0);
              }}
              options={stateOptions}
              placeholder="State"
              isLoading={statesLoading}
              searchable
              error={errors.stateId?.message}
            />
          )}
        />
        <Controller
          name="districtId"
          control={control}
          render={({ field }) => (
            <Select
              label="District *"
              value={field.value > 0 ? String(field.value) : null}
              onChange={(v) => {
                field.onChange(v ? Number(v) : 0);
                setValue("cityId", 0);
              }}
              options={districtOptions}
              placeholder="District"
              isLoading={districtsLoading}
              searchable
              disabled={!stateId}
              error={errors.districtId?.message}
            />
          )}
        />
        <Controller
          name="cityId"
          control={control}
          render={({ field }) => (
            <Select
              label="City *"
              value={field.value > 0 ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : 0)}
              options={cityOptions}
              placeholder="City"
              isLoading={citiesLoading}
              searchable
              disabled={!districtId}
              error={errors.cityId?.message}
            />
          )}
        />
        <div className="space-y-0.5">
          <Label className="text-xs">Office Pin Code *</Label>
          <Input
            className="h-8 text-xs"
            placeholder="Office Pin Code"
            {...register("officePincode")}
          />
          <FieldError message={errors.officePincode?.message} />
        </div>

        <div className="space-y-0.5">
          <Label className="text-xs">Office Email *</Label>
          <Input
            type="email"
            className="h-8 text-xs"
            placeholder="Office Email"
            {...register("officeEmail")}
          />
          <FieldError message={errors.officeEmail?.message} />
        </div>
        <div className="space-y-0.5">
          <Label className="text-xs">Fax *</Label>
          <Input
            className="h-8 text-xs"
            placeholder="Fax"
            {...register("officeFax")}
          />
          <FieldError message={errors.officeFax?.message} />
        </div>
        <div className="space-y-0.5 sm:col-span-2">
          <Label className="text-xs">Website</Label>
          <Input
            className="h-8 text-xs"
            placeholder="Website"
            {...register("officeWebsite")}
          />
        </div>

        <div className="space-y-0.5">
          <Label className="text-xs">Contact Name 1</Label>
          <Input
            className="h-8 text-xs"
            placeholder="Contact Name 1"
            {...register("contact1Name")}
          />
        </div>
        <div className="space-y-0.5">
          <Label className="text-xs">Phone Number</Label>
          <Input
            className="h-8 text-xs"
            placeholder="Phone Number"
            {...register("contact1Phone")}
          />
          <FieldError message={errors.contact1Phone?.message} />
        </div>
        <div className="space-y-0.5 sm:col-span-2">
          <Label className="text-xs">Email1</Label>
          <Input
            type="email"
            className="h-8 text-xs"
            placeholder="Email1"
            {...register("contact1Email")}
          />
          <FieldError message={errors.contact1Email?.message} />
        </div>

        <div className="space-y-0.5">
          <Label className="text-xs">Contact Name 2</Label>
          <Input
            className="h-8 text-xs"
            placeholder="Contact Name 2"
            {...register("contact2Name")}
          />
        </div>
        <div className="space-y-0.5">
          <Label className="text-xs">Phone Number</Label>
          <Input
            className="h-8 text-xs"
            placeholder="Phone Number"
            {...register("contact2Phone")}
          />
          <FieldError message={errors.contact2Phone?.message} />
        </div>
        <div className="space-y-0.5 sm:col-span-2">
          <Label className="text-xs">Email2</Label>
          <Input
            type="email"
            className="h-8 text-xs"
            placeholder="Email2"
            {...register("contact2Email")}
          />
          <FieldError message={errors.contact2Email?.message} />
        </div>

        <div className="space-y-0.5">
          <Label className="text-xs">CST No *</Label>
          <Input
            className="h-8 text-xs"
            placeholder="CST No"
            {...register("cstno")}
          />
          <FieldError message={errors.cstno?.message} />
        </div>
        <div className="space-y-0.5">
          <Label className="text-xs">GST No *</Label>
          <Input
            className="h-8 text-xs"
            placeholder="GST No"
            {...register("gstno")}
          />
          <FieldError message={errors.gstno?.message} />
        </div>
        <Controller
          name="startdate"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Start Date *"
              placeholder="Start Date"
              value={field.value ? new Date(`${field.value}T00:00:00`) : null}
              onChange={(d) => field.onChange(d ? toDateOnlyISO(d) : "")}
              error={errors.startdate?.message}
            />
          )}
        />
        <Controller
          name="enddate"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="End Date *"
              placeholder="End Date"
              value={field.value ? new Date(`${field.value}T00:00:00`) : null}
              onChange={(d) => field.onChange(d ? toDateOnlyISO(d) : "")}
              error={errors.enddate?.message}
            />
          )}
        />
      </div>

      <Controller
        name="isActive"
        control={control}
        render={({ field }) => (
          <ActiveStatusField
            isActive={field.value}
            reason={watch("reason") ?? ""}
            onActiveChange={(active) => {
              field.onChange(active);
              if (active) setValue("reason", "active");
            }}
            onReasonChange={(v) => setValue("reason", v)}
            reasonError={errors.reason?.message}
          />
        )}
      />
    </FormModal>
  );
}
