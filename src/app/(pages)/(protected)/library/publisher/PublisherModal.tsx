"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ActiveStatusField } from "@/common/components/forms";
import { FormModal } from "@/common/components/feedback";
import { Select, type SelectOption } from "@/common/components/select";
import { DatePicker } from "@/common/components/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LIBRARY_MODAL_TITLE_CLASS } from "../_lib/modal-styles";
import {
  createLibraryPublisher,
  listActiveLibraryDetails,
  updateLibraryPublisher,
} from "@/services";
import type { LibraryPublisher } from "@/types/library";
import { toastError, toastSuccess } from "@/lib/toast";

const schema = z.object({
  libraryId: z.coerce.number().min(1, "Library is required"),
  publishername: z.string().min(1, "Publisher name is required"),
  shortName: z.string().min(1, "Short name is required"),
  date: z.date({ message: "Date is required" }),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface PublisherModalProps {
  open: boolean;
  onClose: () => void;
  row: LibraryPublisher | null;
  onSaved: () => void;
}

export function PublisherModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<PublisherModalProps>) {
  const isEditing = row != null;
  const [libraries, setLibraries] = useState<SelectOption[]>([]);

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
      libraryId: undefined,
      publishername: "",
      shortName: "",
      date: new Date(),
      isActive: true,
      reason: "active",
    },
  });

  useEffect(() => {
    if (!open) return;
    void listActiveLibraryDetails().then((rows) => {
      setLibraries(
        rows.map((lib) => ({
          value: String(lib.libraryId),
          label: lib.libraryCode ?? lib.libraryName ?? String(lib.libraryId),
        })),
      );
    });
    reset(
      row
        ? {
            libraryId: row.libraryId,
            publishername: row.publishername ?? "",
            shortName: row.shortName ?? "",
            date: row.date ? new Date(row.date) : new Date(),
            isActive: row.isActive ?? true,
            reason: row.reason ?? "active",
          }
        : {
            libraryId: undefined,
            publishername: "",
            shortName: "",
            date: new Date(),
            isActive: true,
            reason: "active",
          },
    );
  }, [open, row, reset]);

  async function onSubmit(data: FormValues) {
    const payload = {
      ...data,
      date: data.date.toISOString(),
      reason: data.isActive ? "active" : data.reason?.trim() || "inactive",
      ...(isEditing && row?.publisherId
        ? { publisherId: row.publisherId }
        : {}),
    };
    try {
      if (isEditing && row?.publisherId) {
        await updateLibraryPublisher(row.publisherId, payload);
        toastSuccess("Publisher updated");
      } else {
        await createLibraryPublisher(payload);
        toastSuccess("Publisher created");
      }
      onSaved();
      onClose();
    } catch (err) {
      toastError(err, `Failed to ${isEditing ? "update" : "create"} publisher`);
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Publisher" : "Add Publisher"}
      titleClassName={LIBRARY_MODAL_TITLE_CLASS}
      showHeaderDivider
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
      submitLabel="Save"
      cancelLabel="Cancel"
      isSubmitting={isSubmitting}
      size="lg"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Select
            label="Library"
            required
            value={watch("libraryId") ? String(watch("libraryId")) : null}
            onChange={(v) =>
              setValue("libraryId", v ? Number(v) : 0, { shouldValidate: true })
            }
            options={libraries}
            placeholder="Select library"
            searchable
            error={errors.libraryId?.message}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="publishername">Publisher Name *</Label>
          <Input
            id="publishername"
            placeholder="Enter publisher name"
            {...register("publishername")}
          />
          {errors.publishername && (
            <p className="text-xs text-destructive">
              {errors.publishername.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shortName">Short Name *</Label>
          <Input
            id="shortName"
            placeholder="Enter short name"
            {...register("shortName")}
          />
          {errors.shortName && (
            <p className="text-xs text-destructive">
              {errors.shortName.message}
            </p>
          )}
        </div>
        <div>
          <DatePicker
            value={watch("date") ?? null}
            onChange={(v) =>
              setValue("date", v ?? (undefined as unknown as Date), {
                shouldValidate: true,
              })
            }
            label="Date"
            required
            placeholder="Select date"
            error={errors.date?.message}
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
