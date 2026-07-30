"use client";

import { useEffect } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormModal } from "@/common/components/feedback";
import { ActiveStatusField } from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createHostelRoom,
  listHostelRoomsByHostel,
  listHostelRoomTypeOptions,
  updateHostelRoom,
} from "@/services";
import type { HostelRoom } from "@/types/hostel";
import { toastError, toastSuccess } from "@/lib/toast";
import { useQuery } from "@tanstack/react-query";
import {
  HOSTEL_FIELD_LABEL_CLASS,
  HOSTEL_INPUT_CLASS,
  HOSTEL_MODAL_TITLE_CLASS,
  HOSTEL_SELECT_CLASS,
} from "../_lib/modal-styles";

function requiredNumber(message: string) {
  return z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined)
        return undefined;
      return value;
    },
    z.coerce.number({
      required_error: message,
      invalid_type_error: message,
    }),
  );
}

const schema = z.object({
  floorName: z.string().min(1, "Floor name is required"),
  floorNo: requiredNumber("Floor no is required").refine(
    (value) => value >= 0,
    {
      message: "Floor no is required",
    },
  ),
  roomNumber: z.string().min(1, "Room number is required"),
  noOfBeds: requiredNumber("No. of beds is required").refine(
    (value) => value >= 1,
    {
      message: "No. of beds is required",
    },
  ),
  roomTypeId: z.coerce.number().min(1, "Room type is required"),
  amount: requiredNumber("Amount is required").refine((value) => value >= 0, {
    message: "Amount is required",
  }),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface RoomModalProps {
  open: boolean;
  onClose: () => void;
  row: HostelRoom | null;
  hostelId: number;
  organizationId: number;
  onSaved: () => void;
}

export function RoomModal({
  open,
  onClose,
  row,
  hostelId,
  organizationId,
  onSaved,
}: Readonly<RoomModalProps>) {
  const isEditing = row != null;
  const {
    register,
    handleSubmit,
    reset,
    clearErrors,
    setError,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { isActive: true, reason: "active" },
  });

  const { data: roomTypes = [] } = useQuery({
    queryKey: ["Hostel", "roomTypes"],
    queryFn: listHostelRoomTypeOptions,
    enabled: open,
  });
  const { data: existingRooms = [], refetch: refetchExistingRooms } = useQuery({
    queryKey: ["Hostel", "rooms", hostelId, "duplicate-check"],
    queryFn: () => listHostelRoomsByHostel(hostelId),
    enabled: open && hostelId > 0,
  });

  const roomTypeOptions = roomTypes.map((r) => ({
    value: String(r.generalDetailId),
    label:
      r.generalDetailDisplayName ??
      r.generalDetailName ??
      r.generalDetailCode ??
      String(r.generalDetailId),
  }));

  useEffect(() => {
    if (!open) return;
    reset(
      row
        ? {
            floorName: row.floorName ?? "",
            floorNo: Number(row.floorNo ?? 0),
            roomNumber: row.roomNumber ?? "",
            noOfBeds: row.noOfBeds ?? 1,
            roomTypeId: row.roomTypeId ?? 0,
            amount: row.amount ?? 0,
            isActive: row.isActive ?? true,
            reason: "active",
          }
        : {
            isActive: true,
            reason: "active",
            noOfBeds: 1,
            floorNo: 0,
            amount: 0,
          },
    );
  }, [open, row, reset]);

  async function onSubmit(data: FormValues) {
    try {
      clearErrors("roomNumber");
      const latestRooms =
        existingRooms.length > 0
          ? existingRooms
          : ((await refetchExistingRooms()).data ?? []);
      const normalizedRoomNumber = data.roomNumber.trim().toLowerCase();
      const duplicateRoom = latestRooms.find((roomItem) => {
        const existingRoomNumber = (roomItem.roomNumber ?? "")
          .trim()
          .toLowerCase();
        if (existingRoomNumber !== normalizedRoomNumber) return false;
        if (row?.hstlRoomId && row.hstlRoomId === roomItem.hstlRoomId)
          return false;
        return true;
      });

      if (duplicateRoom) {
        setError("roomNumber", {
          type: "manual",
          message: "Room number already exists",
        });
        return;
      }

      const payload = {
        ...data,
        roomNumber: data.roomNumber.trim(),
        floorName: data.floorName.trim(),
        hostelId,
        organizationId: row?.organizationId ?? organizationId,
        availableBeds: isEditing
          ? (row?.availableBeds ?? data.noOfBeds)
          : data.noOfBeds,
        allotedBeds: isEditing ? (row?.allotedBeds ?? 0) : 0,
        reason: data.isActive ? "active" : data.reason?.trim() || "inactive",
      };
      if (isEditing && row) {
        await updateHostelRoom(row.hstlRoomId, payload);
        toastSuccess("Room updated");
      } else {
        await createHostelRoom(payload);
        toastSuccess("Room created");
      }
      onSaved();
      onClose();
    } catch (e) {
      toastError(e, isEditing ? "Update failed" : "Create failed");
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Room" : "Add Room"}
      titleClassName={HOSTEL_MODAL_TITLE_CLASS}
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
          <div className="space-y-1">
            <Label className={HOSTEL_FIELD_LABEL_CLASS}>Floor name</Label>
            <Input className={HOSTEL_INPUT_CLASS} {...register("floorName")} />
            {errors.floorName ? (
              <p className="text-xs text-destructive">
                {errors.floorName.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label className={HOSTEL_FIELD_LABEL_CLASS}>Floor no</Label>
            <Input
              type="number"
              className={HOSTEL_INPUT_CLASS}
              {...register("floorNo")}
            />
          </div>
          <div className="space-y-1">
            <Label className={HOSTEL_FIELD_LABEL_CLASS}>Room number</Label>
            <Input className={HOSTEL_INPUT_CLASS} {...register("roomNumber")} />
            {errors.roomNumber ? (
              <p className="text-xs text-destructive">
                {errors.roomNumber.message}
              </p>
            ) : null}
          </div>
          <Controller
            name="roomTypeId"
            control={control}
            render={({ field }) => (
              <Select
                className={HOSTEL_SELECT_CLASS}
                label="Room type"
                required
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : 0)}
                options={roomTypeOptions}
                error={errors.roomTypeId?.message}
              />
            )}
          />
          <div className="space-y-1">
            <Label className={HOSTEL_FIELD_LABEL_CLASS}>No. of beds</Label>
            <Input
              type="number"
              className={HOSTEL_INPUT_CLASS}
              {...register("noOfBeds")}
            />
          </div>
          <div className="space-y-1">
            <Label className={HOSTEL_FIELD_LABEL_CLASS}>Amount</Label>
            <Input
              type="number"
              className={HOSTEL_INPUT_CLASS}
              {...register("amount")}
            />
          </div>
          <div className="md:col-span-2">
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
        </div>
      </div>
    </FormModal>
  );
}
