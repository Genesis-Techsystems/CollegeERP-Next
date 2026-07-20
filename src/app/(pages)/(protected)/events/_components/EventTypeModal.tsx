"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ActiveStatusField } from "@/common/components/forms";
import { FormModal } from "@/common/components/feedback";
import { Select, type SelectOption } from "@/common/components/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EVENTS_FIELD_LABEL_CLASS,
  EVENTS_INPUT_CLASS,
  EVENTS_MODAL_TITLE_CLASS,
} from "../_lib/modal-styles";
import {
  createEventType,
  eventTypeDuplicate,
  listActiveCollegesForDepartments,
  updateEventType,
  type EventTypeRow,
} from "@/services";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";

const schema = z.object({
  collegeId: z.number().min(1, "College is required"),
  eventTypeName: z.string().min(1, "Event type name is required"),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type EventTypeModalProps = {
  open: boolean;
  onClose: () => void;
  row: EventTypeRow | null;
  existingRows: EventTypeRow[];
  onSaved: () => void;
};

function resolveCollegeId(row: EventTypeRow | null): number | undefined {
  if (!row) return undefined;
  const nested = row as EventTypeRow & {
    college?: { collegeId?: number };
    College?: { collegeId?: number };
  };
  const n = Number(
    row.collegeId ??
      nested.college?.collegeId ??
      nested.College?.collegeId ??
      0,
  );
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function EventTypeModal({
  open,
  onClose,
  row,
  existingRows,
  onSaved,
}: Readonly<EventTypeModalProps>) {
  const isEditing = row != null;
  const [colleges, setColleges] = useState<SelectOption[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      collegeId: undefined,
      eventTypeName: "",
      isActive: true,
      reason: "active",
    },
  });

  useEffect(() => {
    if (!open) return;
    void listActiveCollegesForDepartments().then((list) => {
      setColleges(
        list.map((c) => ({
          value: String(c.collegeId),
          label: c.collegeCode ?? c.collegeName ?? String(c.collegeId),
        })),
      );
    });
    reset(
      row
        ? {
            collegeId: resolveCollegeId(row),
            eventTypeName: String(row.eventTypeName ?? ""),
            isActive: row.isActive !== false,
            reason: String(row.reason ?? "active"),
          }
        : {
            collegeId: undefined,
            eventTypeName: "",
            isActive: true,
            reason: "active",
          },
    );
  }, [open, row, reset]);

  async function onSubmit(values: FormValues) {
    if (
      eventTypeDuplicate(
        existingRows,
        values.collegeId,
        values.eventTypeName,
        row?.eventTypeId,
      )
    ) {
      toastError("Event type name already exists for this college.");
      return;
    }
    const payload: EventTypeRow = {
      collegeId: values.collegeId,
      eventTypeName: values.eventTypeName.trim(),
      isActive: values.isActive,
      reason: values.isActive ? "active" : values.reason?.trim() || "inactive",
    };
    try {
      if (isEditing && row?.eventTypeId) {
        await updateEventType(Number(row.eventTypeId), payload);
        toastSuccess("Event type updated");
      } else {
        await createEventType(payload);
        toastSuccess("Event type created");
      }
      onSaved();
      onClose();
    } catch (e) {
      toastError(getErrorMessage(e));
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Event Type" : "Add Event Type"}
      titleClassName={EVENTS_MODAL_TITLE_CLASS}
      showHeaderDivider
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
      submitLabel={isEditing ? "Update" : "Save"}
      cancelLabel="Cancel"
      isSubmitting={isSubmitting}
      size="lg"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Controller
          name="collegeId"
          control={control}
          render={({ field }) => (
            <Select
              label="College *"
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={colleges}
              searchable
              disabled={isEditing}
              error={errors.collegeId?.message}
            />
          )}
        />
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="eventTypeName" className={EVENTS_FIELD_LABEL_CLASS}>
            Event Type Name *
          </Label>
          <Input
            id="eventTypeName"
            className={EVENTS_INPUT_CLASS}
            {...register("eventTypeName")}
          />
          {errors.eventTypeName ? (
            <p className="text-xs text-destructive">
              {errors.eventTypeName.message}
            </p>
          ) : null}
        </div>
        <div className="sm:col-span-2">
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
    </FormModal>
  );
}
