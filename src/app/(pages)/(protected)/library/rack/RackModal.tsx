"use client";

import { useEffect } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ActiveStatusField } from "@/common/components/forms";
import { FormModal } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LIBRARY_FIELD_LABEL_CLASS,
  LIBRARY_INPUT_CLASS,
  LIBRARY_MODAL_TITLE_CLASS,
} from "../_lib/modal-styles";
import { useLibraryOrgLibraryOptions } from "../_hooks/use-library-org-library";
import { createLibraryRack, updateLibraryRack } from "@/services";
import type { LibraryRack } from "@/types/library";
import { toastError, toastSuccess } from "@/lib/toast";

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

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}, z.number().optional());

const schema = z.object({
  organizationId: requiredId("Organization"),
  libraryId: requiredId("Library"),
  shelveName: z.string().min(1, "Shelf Name is required"),
  shelveCode: z.string().min(1, "Shelf Code is required"),
  noOfRows: optionalNumber,
  noOfColumns: optionalNumber,
  blockCapacity: optionalNumber,
  totalCapacity: optionalNumber,
  location: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface RackModalProps {
  open: boolean;
  onClose: () => void;
  row: LibraryRack | null;
  onSaved: () => void;
}

export function RackModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<RackModalProps>) {
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
    defaultValues: {
      organizationId: undefined,
      libraryId: undefined,
      shelveName: "",
      shelveCode: "",
      noOfRows: undefined,
      noOfColumns: undefined,
      blockCapacity: undefined,
      totalCapacity: undefined,
      location: "",
      isActive: true,
      reason: "active",
    },
  });

  const organizationId = watch("organizationId");
  const { organizations, libraries, loadingLibraries } =
    useLibraryOrgLibraryOptions(organizationId, row?.libraryId, open);

  useEffect(() => {
    if (!open) return;
    reset(
      row
        ? {
            organizationId: row.organizationId,
            libraryId: row.libraryId,
            shelveName: row.shelveName ?? "",
            shelveCode: row.shelveCode ?? "",
            noOfRows: row.noOfRows,
            noOfColumns: row.noOfColumns,
            blockCapacity: row.blockCapacity,
            totalCapacity: row.totalCapacity,
            location: row.location ?? "",
            isActive: row.isActive ?? true,
            reason: row.reason ?? "active",
          }
        : {
            organizationId: undefined,
            libraryId: undefined,
            shelveName: "",
            shelveCode: "",
            noOfRows: undefined,
            noOfColumns: undefined,
            blockCapacity: undefined,
            totalCapacity: undefined,
            location: "",
            isActive: true,
            reason: "active",
          },
    );
  }, [open, row, reset]);

  async function onSubmit(data: FormValues) {
    const payload = {
      ...data,
      location: data.location?.trim() ?? "",
      reason: data.isActive ? "active" : data.reason?.trim() || "inactive",
      ...(isEditing && row?.shelveId ? { shelveId: row.shelveId } : {}),
    };
    try {
      if (isEditing && row?.shelveId) {
        await updateLibraryRack(row.shelveId, payload);
        toastSuccess("Rack updated");
      } else {
        await createLibraryRack(payload);
        toastSuccess("Rack created");
      }
      onSaved();
      onClose();
    } catch (err) {
      toastError(err, `Failed to ${isEditing ? "update" : "create"} rack`);
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Rack" : "Add Rack"}
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
      {/* Angular layout: Org | Library | Shelf Name | Shelf Code | Block Cap | Total Cap | Rows | Columns | Location */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-12">
        <div className="md:col-span-6">
          <Select
            label="Organization"
            required
            value={organizationId ? String(organizationId) : null}
            onChange={(v) => {
              setValue("organizationId", v ? Number(v) : 0, {
                shouldValidate: true,
              });
              setValue("libraryId", 0);
            }}
            options={organizations}
            placeholder="Organization"
            searchable
            error={errors.organizationId?.message}
          />
        </div>
        <div className="md:col-span-6">
          <Select
            label="Library"
            required
            value={watch("libraryId") ? String(watch("libraryId")) : null}
            onChange={(v) =>
              setValue("libraryId", v ? Number(v) : 0, { shouldValidate: true })
            }
            options={libraries}
            placeholder="Library"
            searchable
            isLoading={loadingLibraries}
            disabled={!organizationId}
            error={errors.libraryId?.message}
          />
        </div>

        <div className="space-y-1.5 md:col-span-3">
          <Label htmlFor="shelveName" className={LIBRARY_FIELD_LABEL_CLASS}>
            Shelf Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="shelveName"
            className={LIBRARY_INPUT_CLASS}
            placeholder="Shelf Name"
            {...register("shelveName")}
          />
          {errors.shelveName && (
            <p className="text-xs text-destructive">
              {errors.shelveName.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5 md:col-span-3">
          <Label htmlFor="shelveCode" className={LIBRARY_FIELD_LABEL_CLASS}>
            Shelf Code <span className="text-destructive">*</span>
          </Label>
          <Input
            id="shelveCode"
            className={LIBRARY_INPUT_CLASS}
            placeholder="Shelf Code"
            {...register("shelveCode")}
          />
          {errors.shelveCode && (
            <p className="text-xs text-destructive">
              {errors.shelveCode.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5 md:col-span-3">
          <Label htmlFor="blockCapacity" className={LIBRARY_FIELD_LABEL_CLASS}>
            Block Capacity
          </Label>
          <Input
            id="blockCapacity"
            className={LIBRARY_INPUT_CLASS}
            placeholder="Block Capacity"
            {...register("blockCapacity")}
          />
        </div>
        <div className="space-y-1.5 md:col-span-3">
          <Label htmlFor="totalCapacity" className={LIBRARY_FIELD_LABEL_CLASS}>
            Total Capacity
          </Label>
          <Input
            id="totalCapacity"
            className={LIBRARY_INPUT_CLASS}
            placeholder="Total Capacity"
            {...register("totalCapacity")}
          />
        </div>

        <div className="space-y-1.5 md:col-span-4">
          <Label htmlFor="noOfRows" className={LIBRARY_FIELD_LABEL_CLASS}>
            No Of Rows
          </Label>
          <Input
            id="noOfRows"
            type="number"
            className={LIBRARY_INPUT_CLASS}
            placeholder="No Of Rows"
            {...register("noOfRows")}
          />
        </div>
        <div className="space-y-1.5 md:col-span-4">
          <Label htmlFor="noOfColumns" className={LIBRARY_FIELD_LABEL_CLASS}>
            No Of Columns
          </Label>
          <Input
            id="noOfColumns"
            type="number"
            className={LIBRARY_INPUT_CLASS}
            placeholder="No Of Columns"
            {...register("noOfColumns")}
          />
        </div>
        <div className="space-y-1.5 md:col-span-4">
          <Label htmlFor="location" className={LIBRARY_FIELD_LABEL_CLASS}>
            Location
          </Label>
          <Input
            id="location"
            className={LIBRARY_INPUT_CLASS}
            placeholder="Location"
            {...register("location")}
          />
        </div>

        <div className="md:col-span-12">
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
