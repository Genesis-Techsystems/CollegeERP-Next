"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormModal } from "@/common/components/feedback";
import { ActiveStatusField } from "@/common/components/forms";
import { Select, type SelectOption } from "@/common/components/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  createScholarshipType,
  listActiveOrganizations,
  listActiveUniversities,
  updateScholarshipType,
} from "@/services";
import type { Organization } from "@/types/organization";
import type { ScholarshipType } from "@/types/scholarship";
import type { University } from "@/types/university";

const schema = z.object({
  organizationId: z.number().min(1, "Organization is required"),
  universityId: z.number().min(1, "University is required"),
  scholarshipTypeCode: z.string().min(1, "Scholarship Type Code is required"),
  scholarshipTypeDesc: z
    .string()
    .min(1, "Scholarship Type Description is required"),
  sortOrder: z.coerce.number().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ScholarshipTypeModalProps {
  open: boolean;
  onClose: () => void;
  row: ScholarshipType | null;
  existingRows: ScholarshipType[];
  onSaved: () => void;
}

function asOptions<T>(
  rows: T[],
  getValue: (row: T) => number,
  getLabel: (row: T) => string,
): SelectOption[] {
  return rows.map((item) => ({
    value: String(getValue(item)),
    label: getLabel(item),
  }));
}

export function ScholarshipTypeModal({
  open,
  onClose,
  row,
  existingRows,
  onSaved,
}: Readonly<ScholarshipTypeModalProps>) {
  const isEditing = row != null;
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);

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
      universityId: undefined,
      scholarshipTypeCode: "",
      scholarshipTypeDesc: "",
      sortOrder: undefined,
      isActive: true,
      reason: "active",
    },
  });

  const organizationOptions = useMemo(
    () =>
      asOptions(
        organizations,
        (r) => r.organizationId,
        (r) => r.orgCode ?? r.orgName,
      ),
    [organizations],
  );
  const universityOptions = useMemo(
    () =>
      asOptions(
        universities,
        (r) => r.universityId,
        (r) => r.universityCode ?? r.universityName,
      ),
    [universities],
  );

  useEffect(() => {
    if (!open) return;
    Promise.all([listActiveOrganizations(), listActiveUniversities()])
      .then(([orgRows, univRows]) => {
        setOrganizations(orgRows);
        setUniversities(univRows);
      })
      .catch(console.error);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (row) {
      reset({
        organizationId: row.organizationId,
        universityId: row.universityId,
        scholarshipTypeCode: row.scholarshipTypeCode ?? "",
        scholarshipTypeDesc: row.scholarshipTypeDesc ?? "",
        sortOrder: row.sortOrder,
        isActive: row.isActive ?? true,
        reason: row.reason ?? "active",
      });
    } else {
      reset({
        organizationId: undefined,
        universityId: undefined,
        scholarshipTypeCode: "",
        scholarshipTypeDesc: "",
        sortOrder: undefined,
        isActive: true,
        reason: "active",
      });
    }
  }, [open, row, reset]);

  async function onSubmit(data: FormValues) {
    // Angular: block create when sortOrder is already assigned.
    if (!isEditing && data.sortOrder != null) {
      const taken = existingRows.some(
        (item) => item.sortOrder === data.sortOrder,
      );
      if (taken) {
        toastInfo("Sortorder Has been assigned");
        return;
      }
    }

    const payload = {
      organizationId: data.organizationId,
      universityId: data.universityId,
      scholarshipTypeCode: data.scholarshipTypeCode.trim(),
      scholarshipTypeDesc: data.scholarshipTypeDesc.trim(),
      sortOrder: data.sortOrder,
      isActive: data.isActive,
      reason: data.isActive ? "active" : data.reason?.trim() || "inactive",
    };

    try {
      if (isEditing && row) {
        await updateScholarshipType(row.scholarshipTypeId, payload);
        toastSuccess("Scholarship type updated");
      } else {
        await createScholarshipType(payload);
        toastSuccess("Scholarship type created");
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
      title={isEditing ? "Edit Scholarship Type" : "Add Scholarship Type"}
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
      submitLabel="Save"
      cancelLabel="Close"
      isSubmitting={isSubmitting}
      size="lg"
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Controller
          name="organizationId"
          control={control}
          render={({ field }) => (
            <Select
              label="Organization"
              required
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={organizationOptions}
              placeholder="Select organization"
              searchable
              error={errors.organizationId?.message}
            />
          )}
        />
        <Controller
          name="universityId"
          control={control}
          render={({ field }) => (
            <Select
              label="University"
              required
              value={field.value ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={universityOptions}
              placeholder="Select university"
              searchable
              error={errors.universityId?.message}
            />
          )}
        />
        <div className="space-y-0.5">
          <Label htmlFor="scholarshipTypeCode">Scholarship Type Code *</Label>
          <Input
            id="scholarshipTypeCode"
            {...register("scholarshipTypeCode")}
          />
          {errors.scholarshipTypeCode && (
            <p className="text-xs text-red-500">
              {errors.scholarshipTypeCode.message}
            </p>
          )}
        </div>
        <div className="space-y-0.5">
          <Label htmlFor="scholarshipTypeDesc">
            Scholarship Type Description *
          </Label>
          <Input
            id="scholarshipTypeDesc"
            {...register("scholarshipTypeDesc")}
          />
          {errors.scholarshipTypeDesc && (
            <p className="text-xs text-red-500">
              {errors.scholarshipTypeDesc.message}
            </p>
          )}
        </div>
        <div className="space-y-0.5">
          <Label htmlFor="sortOrder">Sort Order</Label>
          <Input id="sortOrder" type="number" {...register("sortOrder")} />
          {errors.sortOrder && (
            <p className="text-xs text-red-500">{errors.sortOrder.message}</p>
          )}
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
            onReasonChange={(value) => setValue("reason", value)}
            reasonError={errors.reason?.message}
          />
        )}
      />
    </FormModal>
  );
}
