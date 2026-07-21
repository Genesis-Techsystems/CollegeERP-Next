"use client";

import { useEffect, useRef, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { FormModal } from "@/common/components/feedback";
import { ActiveStatusField } from "@/common/components/forms";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GM_CODES } from "@/config/constants/ui";
import {
  TRANSPORT_FIELD_LABEL_CLASS,
  TRANSPORT_INPUT_CLASS,
  TRANSPORT_MODAL_TITLE_CLASS,
} from "../_lib/modal-styles";
import { TransportOrgFields } from "../_components/TransportOrgFields";
import { TransportPassportPhotoField } from "../_components/TransportPassportPhotoField";
import { toApiDate } from "../_lib/format-transport-time";
import {
  TRANSPORT_PHOTO_INVALID_MESSAGE,
  isAllowedTransportPhotoFile,
  uploadTransportPassportPhoto,
} from "../_lib/transport-photo";
import {
  createDriver,
  listGeneralDetailsByCode,
  updateDriver,
} from "@/services";
import type { Driver } from "@/types/transport";
import { toastError, toastSuccess } from "@/lib/toast";

const schema = z.object({
  organizationId: z.coerce.number().min(1, "Organization is required"),
  transportDetailId: z.coerce.number().optional(),
  driverName: z.string().min(1, "Driver name is required"),
  mobileNumber: z.string().min(1, "Mobile number is required"),
  phone: z.string().optional(),
  emailId: z.string().email().optional().or(z.literal("")),
  licenseNumber: z.string().optional(),
  licenseValidUpto: z.date().optional().nullable(),
  dateOfBirth: z.date().optional().nullable(),
  dateOfJoining: z.date().optional().nullable(),
  genderId: z.coerce.number().optional(),
  bloodgroupId: z.coerce.number().optional(),
  maritalStatusId: z.coerce.number().optional(),
  presentAddress: z.string().optional(),
  permanentAddress: z.string().optional(),
  experience: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const FUTURE_MAX_DATE = new Date(new Date().getFullYear() + 50, 11, 31);

function gmOptions(rows: unknown[]) {
  return rows.map((r) => {
    const row = r as {
      generalDetailId?: number;
      generalDetailDisplayName?: string;
    };
    return {
      value: String(row.generalDetailId),
      label: row.generalDetailDisplayName ?? String(row.generalDetailId),
    };
  });
}

interface DriverModalProps {
  open: boolean;
  onClose: () => void;
  row: Driver | null;
  onSaved: () => void;
}

export function DriverModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<DriverModalProps>) {
  const isEditing = row != null;
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
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

  const { data: genders = [] } = useQuery({
    queryKey: ["Transport", "genders"],
    queryFn: () => listGeneralDetailsByCode(GM_CODES.GENDER),
    enabled: open,
  });
  const { data: bloodGroups = [] } = useQuery({
    queryKey: ["Transport", "bloodGroups"],
    queryFn: () => listGeneralDetailsByCode(GM_CODES.BLOOD_GROUP),
    enabled: open,
  });
  const { data: maritalStatuses = [] } = useQuery({
    queryKey: ["Transport", "maritalStatuses"],
    queryFn: () => listGeneralDetailsByCode(GM_CODES.MARITAL_STATUS),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const parseDate = (value: string | null | undefined): Date | null => {
      if (!value) return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    };
    setPhotoError(null);
    if (fileRef.current) fileRef.current.value = "";
    reset(
      row
        ? {
            organizationId: row.organizationId,
            transportDetailId: row.transportDetailId,
            driverName: row.driverName ?? "",
            mobileNumber: row.mobileNumber ?? "",
            phone: row.phone ?? "",
            emailId: row.emailId ?? "",
            licenseNumber: row.licenseNumber ?? "",
            licenseValidUpto: parseDate(row.licenseValidUpto),
            dateOfBirth: parseDate(row.dateOfBirth),
            dateOfJoining: parseDate(row.dateOfJoining),
            genderId: row.genderId,
            bloodgroupId: row.bloodgroupId,
            maritalStatusId: row.maritalStatusId,
            presentAddress: row.presentAddress ?? "",
            permanentAddress: row.permanentAddress ?? "",
            experience: row.experience ?? "",
            isActive: row.isActive ?? true,
            reason: row.reason ?? "active",
          }
        : { isActive: true, reason: "active" },
    );
  }, [open, row, reset]);

  async function onSubmit(data: FormValues) {
    const file = fileRef.current?.files?.[0];
    if (file && !isAllowedTransportPhotoFile(file)) {
      setPhotoError(TRANSPORT_PHOTO_INVALID_MESSAGE);
      return;
    }

    try {
      // Organization-style: validate file in the form, upload when selected, then save path.
      let photoPath = row?.photoPath;
      if (file) {
        photoPath = await uploadTransportPassportPhoto(
          file,
          "transport/drivers",
        );
      }

      const payload = {
        ...data,
        emailId: data.emailId || undefined,
        licenseValidUpto: toApiDate(data.licenseValidUpto ?? undefined),
        dateOfBirth: toApiDate(data.dateOfBirth ?? undefined),
        dateOfJoining: toApiDate(data.dateOfJoining ?? undefined),
        photoPath,
        reason: data.isActive ? "active" : data.reason?.trim() || "inactive",
      };

      if (isEditing && row?.driverId) {
        await updateDriver(row.driverId, payload);
        toastSuccess("Driver updated");
      } else {
        await createDriver(payload);
        toastSuccess("Driver created");
      }
      onSaved();
      onClose();
    } catch (err) {
      toastError(err, `Failed to ${isEditing ? "update" : "create"} driver`);
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Driver" : "Add Driver"}
      titleClassName={TRANSPORT_MODAL_TITLE_CLASS}
      showHeaderDivider
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
      submitLabel="Save"
      cancelLabel="Close"
      isSubmitting={isSubmitting}
      size="xl"
      contentClassName="sm:max-w-3xl"
      formClassName="space-y-3"
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <TransportOrgFields
            control={control}
            organizationId={organizationId}
            orgError={errors.organizationId?.message}
            onOrganizationChange={() =>
              setValue("transportDetailId", undefined)
            }
            transportRequired={false}
          />
          <TransportPassportPhotoField
            fileRef={fileRef}
            error={photoError}
            onErrorChange={setPhotoError}
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>Driver Name *</Label>
            <Input
              className={TRANSPORT_INPUT_CLASS}
              {...register("driverName")}
            />
            {errors.driverName ? (
              <p className="text-xs text-destructive">
                {errors.driverName.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>Mobile *</Label>
            <Input
              className={TRANSPORT_INPUT_CLASS}
              {...register("mobileNumber")}
            />
            {errors.mobileNumber ? (
              <p className="text-xs text-destructive">
                {errors.mobileNumber.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>Phone</Label>
            <Input className={TRANSPORT_INPUT_CLASS} {...register("phone")} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Controller
            name="dateOfBirth"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Date Of Birth"
                value={field.value ?? null}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            name="dateOfJoining"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Date Of Joining"
                value={field.value ?? null}
                onChange={field.onChange}
                maxDate={FUTURE_MAX_DATE}
              />
            )}
          />
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>Experience</Label>
            <Input
              className={TRANSPORT_INPUT_CLASS}
              type="number"
              step="any"
              {...register("experience")}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>License No.</Label>
            <Input
              className={TRANSPORT_INPUT_CLASS}
              {...register("licenseNumber")}
            />
          </div>
          <Controller
            name="licenseValidUpto"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="License Valid Upto"
                value={field.value ?? null}
                onChange={field.onChange}
                maxDate={FUTURE_MAX_DATE}
              />
            )}
          />
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>Email</Label>
            <Input className={TRANSPORT_INPUT_CLASS} {...register("emailId")} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Controller
            name="genderId"
            control={control}
            render={({ field }) => (
              <Select
                label="Gender"
                value={field.value != null ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                options={gmOptions(genders)}
                placeholder="Select"
                searchable
                clearable
              />
            )}
          />
          <Controller
            name="bloodgroupId"
            control={control}
            render={({ field }) => (
              <Select
                label="Blood Group"
                value={field.value != null ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                options={gmOptions(bloodGroups)}
                placeholder="Select"
                searchable
                clearable
              />
            )}
          />
          <Controller
            name="maritalStatusId"
            control={control}
            render={({ field }) => (
              <Select
                label="Marital Status"
                value={field.value != null ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                options={gmOptions(maritalStatuses)}
                placeholder="Select"
                searchable
                clearable
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>
              Present Address
            </Label>
            <Textarea
              className={TRANSPORT_INPUT_CLASS}
              rows={2}
              {...register("presentAddress")}
            />
          </div>
          <div className="space-y-1">
            <Label className={TRANSPORT_FIELD_LABEL_CLASS}>
              Permanent Address
            </Label>
            <Textarea
              className={TRANSPORT_INPUT_CLASS}
              rows={2}
              {...register("permanentAddress")}
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
