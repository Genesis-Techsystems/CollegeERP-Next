"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormModal } from "@/common/components/feedback";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  createHostelDiscount,
  listActiveHostelRoomsForDetails,
  listHostelsByOrganization,
  toHostelApiDate,
  updateHostelDiscount,
} from "@/services";
import { toastError, toastSuccess } from "@/lib/toast";
import type { HostelDiscount } from "@/types/hostel";
import {
  HOSTEL_FIELD_LABEL_CLASS,
  HOSTEL_INPUT_CLASS,
  HOSTEL_MODAL_TITLE_CLASS,
  HOSTEL_SELECT_CLASS,
} from "../_lib/modal-styles";

const schema = z
  .object({
    hostelId: z.coerce.number().min(1, "Hostel is required"),
    hstlRoomId: z.coerce.number().min(1, "Hostel room is required"),
    hstlDiscountName: z.string().trim().min(1, "Discount name is required"),
    discountType: z.enum(["P", "A"]),
    discountValue: z.coerce.number().min(0, "Discount value is required"),
    validFrom: z.date().nullable(),
    validTo: z.date().nullable(),
    isActive: z.boolean(),
  })
  .refine(
    ({ validFrom, validTo }) => !validFrom || !validTo || validTo >= validFrom,
    {
      path: ["validTo"],
      message: "To date should be greater than or equal to from date",
    },
  );

type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = {
  hostelId: 0,
  hstlRoomId: 0,
  hstlDiscountName: "",
  discountType: "P",
  discountValue: 0,
  validFrom: new Date(),
  validTo: new Date(),
  isActive: true,
};

interface HostelDiscountModalProps {
  open: boolean;
  onClose: () => void;
  row: HostelDiscount | null;
  onSaved: () => void;
}

function monthDifference(from: Date | null, to: Date | null) {
  if (!from || !to || to < from) return "";
  return String(
    (to.getFullYear() - from.getFullYear()) * 12 +
      to.getMonth() -
      from.getMonth(),
  );
}

export function HostelDiscountModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<HostelDiscountModalProps>) {
  const isEditing = row != null;
  const [organizationId, setOrganizationId] = useState(0);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: DEFAULT_VALUES,
  });

  const hostelId = watch("hostelId");
  const validFrom = watch("validFrom");
  const validTo = watch("validTo");
  const discountType = watch("discountType");

  const { data: hostels = [], isLoading: hostelsLoading } = useQuery({
    queryKey: ["Hostel", "discountHostels", organizationId],
    queryFn: () => listHostelsByOrganization(organizationId),
    enabled: open && organizationId > 0,
  });

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ["Hostel", "discountRooms", hostelId],
    queryFn: () => listActiveHostelRoomsForDetails(hostelId),
    enabled: open && hostelId > 0,
  });

  useEffect(() => {
    if (!open) return;
    setOrganizationId(
      Number(
        row?.organizationId ?? localStorage.getItem("organizationId") ?? 0,
      ),
    );
    reset(
      row
        ? {
            hostelId: row.hostelId ?? 0,
            hstlRoomId: row.hstlRoomId ?? 0,
            hstlDiscountName: row.hstlDiscountName ?? "",
            discountType: row.discountType === "A" ? "A" : "P",
            discountValue: row.discountValue ?? 0,
            validFrom: row.validFrom ? new Date(row.validFrom) : new Date(),
            validTo: row.validTo ? new Date(row.validTo) : new Date(),
            isActive: row.isActive ?? true,
          }
        : DEFAULT_VALUES,
    );
  }, [open, reset, row]);

  async function onSubmit(data: FormValues) {
    try {
      const payload = {
        organizationId,
        hostelId: data.hostelId,
        hstlRoomId: data.hstlRoomId,
        hstlDiscountName: data.hstlDiscountName,
        discountType: data.discountType,
        discountValue: data.discountValue,
        validFrom: toHostelApiDate(data.validFrom),
        validTo: toHostelApiDate(data.validTo),
        noofmonths: Number(monthDifference(data.validFrom, data.validTo) || 0),
        isActive: data.isActive,
      };

      if (isEditing && row) {
        await updateHostelDiscount(row.hstlDiscountId, payload);
        toastSuccess("Hostel discount updated");
      } else {
        await createHostelDiscount(payload);
        toastSuccess("Hostel discount created");
      }
      onSaved();
      onClose();
    } catch (error) {
      toastError(error, isEditing ? "Update failed" : "Create failed");
    }
  }

  const hostelOptions = hostels
    .filter((hostel) => hostel.isActive !== false)
    .map((hostel) => ({
      value: String(hostel.hostelId),
      label: hostel.hostelCode || hostel.hostelName,
    }));
  const roomOptions = rooms
    .filter((room) => room.isActive !== false)
    .map((room) => ({
      value: String(room.hstlRoomId),
      label: room.roomNumber ?? String(room.hstlRoomId),
    }));

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Hostel Discount" : "Add Hostel Discount"}
      titleClassName={HOSTEL_MODAL_TITLE_CLASS}
      showHeaderDivider
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit(onSubmit)();
      }}
      submitLabel="Save"
      cancelLabel="Close"
      isSubmitting={isSubmitting}
      size="lg"
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Controller
          name="hostelId"
          control={control}
          render={({ field }) => (
            <Select
              className={HOSTEL_SELECT_CLASS}
              label="Hostel"
              required
              value={field.value ? String(field.value) : null}
              onChange={(value) => {
                field.onChange(value ? Number(value) : 0);
                setValue("hstlRoomId", 0);
              }}
              options={hostelOptions}
              isLoading={hostelsLoading}
              error={errors.hostelId?.message}
            />
          )}
        />
        <Controller
          name="hstlRoomId"
          control={control}
          render={({ field }) => (
            <Select
              className={HOSTEL_SELECT_CLASS}
              label="Hostel Room"
              required
              value={field.value ? String(field.value) : null}
              onChange={(value) => field.onChange(value ? Number(value) : 0)}
              options={roomOptions}
              isLoading={roomsLoading}
              disabled={!hostelId}
              error={errors.hstlRoomId?.message}
            />
          )}
        />
        <div className="md:col-span-3">
          <Label
            htmlFor="hostel-discount-name"
            className={HOSTEL_FIELD_LABEL_CLASS}
          >
            Discount Name <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="hstlDiscountName"
            control={control}
            render={({ field }) => (
              <Input
                id="hostel-discount-name"
                className={HOSTEL_INPUT_CLASS}
                {...field}
              />
            )}
          />
          {errors.hstlDiscountName && (
            <p className="mt-1 text-[11px] text-destructive">
              {errors.hstlDiscountName.message}
            </p>
          )}
        </div>

        <Controller
          name="validFrom"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Valid From"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          name="validTo"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Valid To"
              value={field.value}
              onChange={field.onChange}
              minDate={validFrom ?? undefined}
              error={errors.validTo?.message}
            />
          )}
        />
        <div>
          <Label
            htmlFor="hostel-discount-months"
            className={HOSTEL_FIELD_LABEL_CLASS}
          >
            No Of Months
          </Label>
          <Input
            id="hostel-discount-months"
            className={HOSTEL_INPUT_CLASS}
            value={monthDifference(validFrom, validTo)}
            disabled
            readOnly
          />
        </div>

        <Controller
          name="discountType"
          control={control}
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              className="flex h-9 items-center gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem id="discount-percentage" value="P" />
                <Label
                  htmlFor="discount-percentage"
                  className={HOSTEL_FIELD_LABEL_CLASS}
                >
                  Percentage
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="discount-amount" value="A" />
                <Label
                  htmlFor="discount-amount"
                  className={HOSTEL_FIELD_LABEL_CLASS}
                >
                  Amount
                </Label>
              </div>
            </RadioGroup>
          )}
        />
        <div>
          <Label
            htmlFor="hostel-discount-value"
            className={HOSTEL_FIELD_LABEL_CLASS}
          >
            {discountType === "P" ? "Percentage" : "Amount"}{" "}
            <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="discountValue"
            control={control}
            render={({ field }) => (
              <Input
                id="hostel-discount-value"
                type="number"
                className={HOSTEL_INPUT_CLASS}
                value={field.value}
                onChange={(event) => field.onChange(event.target.value)}
              />
            )}
          />
          {errors.discountValue && (
            <p className="mt-1 text-[11px] text-destructive">
              {errors.discountValue.message}
            </p>
          )}
        </div>
        <Controller
          name="isActive"
          control={control}
          render={({ field }) => (
            <div className="flex h-9 items-center gap-2">
              <Checkbox
                id="hostel-discount-active"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
              <Label
                htmlFor="hostel-discount-active"
                className={HOSTEL_FIELD_LABEL_CLASS}
              >
                Active
              </Label>
            </div>
          )}
        />
      </div>
    </FormModal>
  );
}
