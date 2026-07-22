"use client";

import { useEffect } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DatePicker } from "@/common/components/date-picker";
import { ActiveStatusField } from "@/common/components/forms";
import { FormModal } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toDateOnlyISO } from "@/common/generic-functions";
import { createReservedBook, listBookPriorityTypes } from "@/services";
import { toastError, toastSuccess } from "@/lib/toast";
import { useQuery } from "@tanstack/react-query";

function requiredId(label: string) {
  const message = `${label} is required`;
  return z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined)
        return undefined;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    },
    z.number({ error: message }).min(1, message),
  );
}

const schema = z.object({
  priorityCatdetId: requiredId("Book Priority"),
  reservedOn: z.date({ error: "Reserved Date is required" }),
  comments: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface BookReservedModalProps {
  open: boolean;
  onClose: () => void;
  organizationId: number;
  libraryId: number;
  bookId: number;
  libMemberId: number;
  onSaved: () => void;
}

export function BookReservedModal({
  open,
  onClose,
  organizationId,
  libraryId,
  bookId,
  libMemberId,
  onSaved,
}: Readonly<BookReservedModalProps>) {
  const { data: priorities = [] } = useQuery({
    queryKey: ["Library", "bookPriorityTypes"],
    queryFn: listBookPriorityTypes,
    enabled: open,
  });

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
      priorityCatdetId: undefined,
      reservedOn: new Date(),
      comments: "",
      isActive: true,
      reason: "active",
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      priorityCatdetId: undefined,
      reservedOn: new Date(),
      comments: "",
      isActive: true,
      reason: "active",
    });
  }, [open, reset]);

  async function onSubmit(data: FormValues) {
    try {
      await createReservedBook({
        organizationId,
        libraryId,
        bookId,
        libMemberId,
        priorityCatdetId: data.priorityCatdetId,
        reservedOn: toDateOnlyISO(data.reservedOn),
        comments: data.comments?.trim() ?? "",
        isActive: data.isActive,
        reason: data.isActive ? "active" : data.reason?.trim() || "inactive",
      });
      toastSuccess("Book reserved");
      onSaved();
      onClose();
    } catch (err) {
      toastError(err, "Failed to reserve book");
    }
  }

  const priorityOptions = priorities.map((p) => ({
    value: String(p.generalDetailId ?? ""),
    label: String(
      p.generalDetailDisplayName ??
        p.generalDetailCode ??
        p.generalDetailId ??
        "",
    ),
  }));

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Book Reserved"
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Select
            label="Book Priority"
            required
            value={
              watch("priorityCatdetId")
                ? String(watch("priorityCatdetId"))
                : null
            }
            onChange={(v) =>
              setValue("priorityCatdetId", v ? Number(v) : 0, {
                shouldValidate: true,
              })
            }
            options={priorityOptions}
            placeholder="Book Priority"
            searchable
            error={errors.priorityCatdetId?.message}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Reserved Date</Label>
          <Controller
            name="reservedOn"
            control={control}
            render={({ field }) => (
              <DatePicker
                value={field.value}
                onChange={field.onChange}
                placeholder="Reserved Date"
              />
            )}
          />
          {errors.reservedOn && (
            <p className="text-xs text-destructive">
              {errors.reservedOn.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="comments">Comments</Label>
          <Textarea
            id="comments"
            placeholder="Comments"
            {...register("comments")}
          />
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
