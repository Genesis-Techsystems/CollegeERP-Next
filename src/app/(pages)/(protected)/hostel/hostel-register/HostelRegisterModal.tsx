"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { FormModal } from "@/common/components/feedback";
import { ActiveStatusField, TimePicker } from "@/common/components/forms";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createHostelRegister,
  listRelationOptions,
  searchHostelRoomAllocations,
  updateHostelRegister,
} from "@/services";
import type {
  HostelRegister,
  HostelRoomAllocationSearchRow,
} from "@/types/hostel";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  HOSTEL_FIELD_LABEL_CLASS,
  HOSTEL_INPUT_CLASS,
  HOSTEL_MODAL_TITLE_CLASS,
  HOSTEL_SELECT_CLASS,
} from "../_lib/modal-styles";

const phoneSchema = z
  .string()
  .min(1, "Mobile number is required")
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");

const schema = z.object({
  hstlRoomAllotId: z.coerce.number().optional(),
  attendeesName: z.string().min(1, "Attendee name is required"),
  relationCatdetId: z.coerce.number().min(1, "Relation is required"),
  mobileNumber: phoneSchema,
  outingDate: z.date({ message: "Outing date is required" }),
  outingTime: z.string().min(1, "Outing time is required"),
  inDate: z.date({ message: "In date is required" }),
  inTime: z.string().min(1, "In time is required"),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function hostelerLabel(row: HostelRoomAllocationSearchRow): string {
  const name = row.stdFirstName ?? row.empFirstName ?? "Hosteler";
  const id = row.rollNumber ?? row.empNumber;
  return id ? `${name} (${id})` : name;
}

function parseApiDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseApiTime(value?: string): string {
  if (!value) return "09:00:00";
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "09:00:00";
  return `${match[1].padStart(2, "0")}:${match[2]}:00`;
}

function timeInMinutes(time: string): number {
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
}

function toAngularTime(time: string): string {
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  return match ? `${Number(match[1])}:${Number(match[2])}:00` : time;
}

function currentApplicationDate(): Date {
  const raw = String(localStorage.getItem("presentDate") ?? "").trim();
  const match = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return new Date();
  const date = new Date(
    Number(match[3]),
    Number(match[2]) - 1,
    Number(match[1]),
  );
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

interface HostelRegisterModalProps {
  open: boolean;
  onClose: () => void;
  hostelId: number;
  organizationId: string;
  row: HostelRegister | null;
  onSaved: () => void;
}

export function HostelRegisterModal({
  open,
  onClose,
  hostelId,
  organizationId,
  row,
  onSaved,
}: Readonly<HostelRegisterModalProps>) {
  const isEditing = row != null;
  const [hostelers, setHostelers] = useState<HostelRoomAllocationSearchRow[]>(
    [],
  );
  const [searchingHostelers, setSearchingHostelers] = useState(false);

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
      isActive: true,
      reason: "active",
      outingTime: "09:00:00",
      inTime: "10:00:00",
      outingDate: new Date(),
      inDate: new Date(),
    },
  });

  const { data: relations = [], error: relationError } = useQuery({
    queryKey: ["Hostel", "relations"],
    queryFn: listRelationOptions,
    enabled: open,
  });

  useEffect(() => {
    if (relationError) toastError(relationError, "Failed to load relations");
  }, [relationError]);

  const relationOptions = useMemo(
    () =>
      relations.map((r) => ({
        value: String(r.generalDetailId),
        label: String(
          r.generalDetailDisplayName ??
            r.generalDetailCode ??
            r.generalDetailId,
        ),
      })),
    [relations],
  );

  const hostelerOptions = useMemo(
    () =>
      hostelers.map((h) => ({
        value: String(h.hstlRoomAllotId),
        label: hostelerLabel(h),
      })),
    [hostelers],
  );

  const onHostelerSearch = useCallback(
    async (term: string) => {
      if (term.length < 5) {
        setHostelers([]);
        return;
      }
      setSearchingHostelers(true);
      try {
        const rows = await searchHostelRoomAllocations(hostelId, term);
        setHostelers(rows);
      } catch (error) {
        setHostelers([]);
        toastError(error, "Failed to search hostelers");
      } finally {
        setSearchingHostelers(false);
      }
    },
    [hostelId],
  );

  useEffect(() => {
    if (!open) return;
    const today = currentApplicationDate();
    reset(
      row
        ? {
            attendeesName: row.attendeesName ?? "",
            relationCatdetId: row.relationCatdetId ?? 0,
            mobileNumber: String(row.mobileNumber ?? ""),
            outingDate: parseApiDate(row.inDate) ?? today,
            inDate: parseApiDate(row.outDate) ?? today,
            outingTime: parseApiTime(row.inTime),
            inTime: parseApiTime(row.outTime),
            isActive: row.isActive ?? true,
            reason: row.reason ?? "active",
          }
        : {
            isActive: true,
            reason: "active",
            outingTime: "09:00:00",
            inTime: "10:00:00",
            outingDate: today,
            inDate: today,
          },
    );
    setHostelers([]);
  }, [open, row, reset]);

  async function onSubmit(data: FormValues) {
    if (!isEditing && !data.hstlRoomAllotId) {
      toastError(new Error("Select a hosteler"), "Hosteler is required");
      return;
    }

    if (timeInMinutes(data.inTime) <= timeInMinutes(data.outingTime)) {
      toastError(
        new Error("In time must be after outing time"),
        "Invalid times",
      );
      return;
    }

    const selected = hostelers.find(
      (h) => h.hstlRoomAllotId === data.hstlRoomAllotId,
    );
    const payload: Partial<HostelRegister> = {
      attendeesName: data.attendeesName,
      relationCatdetId: data.relationCatdetId,
      mobileNumber: Number(data.mobileNumber),
      inDate: data.outingDate.toISOString(),
      outDate: data.inDate.toISOString(),
      inTime: toAngularTime(data.outingTime),
      outTime: toAngularTime(data.inTime),
      isActive: data.isActive,
      reason: data.reason ?? null,
      hostelId,
    };

    if (!isEditing && selected) {
      payload.studentId = null;
      payload.employeeId = null;
      if (selected.rollNumber) {
        payload.studentId = selected.studentId ?? null;
      } else {
        payload.employeeId = selected.employeeId ?? null;
      }
      payload.hstlRoomAllotId = selected.hstlRoomAllotId;
    }

    // Angular closes the dialog before persistence starts.
    onClose();
    try {
      if (isEditing && row) {
        await updateHostelRegister(row.hstlRegisterId, {
          ...payload,
          hstlRegisterId: row.hstlRegisterId,
          studentId: row.studentId,
          employeeId: row.employeeId,
          organizationId: row.organizationId,
        });
        toastSuccess("Outing pass updated");
      } else {
        await createHostelRegister({
          ...payload,
          organizationId,
        });
        toastSuccess("Outing pass issued");
      }
      onSaved();
    } catch (e) {
      toastError(
        e,
        isEditing ? "Update failed" : "Could not issue outing pass",
      );
    }
  }

  const hostelerName =
    row?.stdFirstName ?? row?.empFirstName ?? (row ? "Hosteler" : "");

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Issuesing Outing Pass" : "Issuesing Outing Pass"}
      titleClassName={HOSTEL_MODAL_TITLE_CLASS}
      size="xl"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
      isSubmitting={isSubmitting}
      submitLabel="Save"
    >
      {isEditing ? (
        <p className="mb-3 text-[12px] text-muted-foreground">
          Hosteller name:{" "}
          <span className="font-medium text-foreground">{hostelerName}</span>
        </p>
      ) : (
        <Controller
          name="hstlRoomAllotId"
          control={control}
          render={({ field }) => (
            <Select
              label="Hosteler"
              required
              className={`mb-3 ${HOSTEL_SELECT_CLASS}`}
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={hostelerOptions}
              searchable
              onSearch={(term) => void onHostelerSearch(term)}
              isLoading={searchingHostelers}
              placeholder="Search by name (min 5 characters)"
              error={errors.hstlRoomAllotId?.message}
            />
          )}
        />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className={HOSTEL_FIELD_LABEL_CLASS}>Attendees name</Label>
          <Input
            className={HOSTEL_INPUT_CLASS}
            {...register("attendeesName")}
          />
          {errors.attendeesName ? (
            <p className="text-[11px] text-destructive">
              {errors.attendeesName.message}
            </p>
          ) : null}
        </div>

        <Controller
          name="relationCatdetId"
          control={control}
          render={({ field }) => (
            <Select
              label="Relation"
              required
              className={HOSTEL_SELECT_CLASS}
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : 0)}
              options={relationOptions}
              searchable
              error={errors.relationCatdetId?.message}
            />
          )}
        />

        <div className="space-y-1">
          <Label className={HOSTEL_FIELD_LABEL_CLASS}>Mobile number</Label>
          <Input
            className={HOSTEL_INPUT_CLASS}
            type="tel"
            maxLength={10}
            {...register("mobileNumber")}
          />
          {errors.mobileNumber ? (
            <p className="text-[11px] text-destructive">
              {errors.mobileNumber.message}
            </p>
          ) : null}
        </div>

        <Controller
          name="outingDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              label={isEditing ? "In date" : "Outing date"}
              value={field.value ?? null}
              onChange={(d) => field.onChange(d ?? new Date())}
              className={HOSTEL_SELECT_CLASS}
            />
          )}
        />

        <Controller
          name="outingTime"
          control={control}
          render={({ field }) => (
            <TimePicker
              label="Outing time"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />

        <Controller
          name="inDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              label={isEditing ? "Out date" : "In date"}
              value={field.value ?? null}
              onChange={(d) => field.onChange(d ?? new Date())}
              className={HOSTEL_SELECT_CLASS}
            />
          )}
        />

        <Controller
          name="inTime"
          control={control}
          render={({ field }) => (
            <TimePicker
              label="In time"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      <div className="mt-3">
        <ActiveStatusField
          isActive={watch("isActive")}
          reason={watch("reason") ?? ""}
          onActiveChange={(v) => setValue("isActive", v === true)}
          onReasonChange={(v) => setValue("reason", v)}
        />
      </div>
    </FormModal>
  );
}
