"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ActiveStatusField } from "@/common/components/forms";
import { FormModal } from "@/common/components/feedback";
import { Select, type SelectOption } from "@/common/components/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LIBRARY_MODAL_TITLE_CLASS } from "../_lib/modal-styles";
import {
  createLibrarySupplier,
  listOrganizations,
  updateLibrarySupplier,
} from "@/services";
import type { LibrarySupplier } from "@/types/library";
import { toastError, toastSuccess } from "@/lib/toast";

const requiredOrganizationId = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  },
  z
    .number({ error: "Organization is required" })
    .min(1, "Organization is required"),
);

const schema = z.object({
  organizationId: requiredOrganizationId,
  suppliername: z.string().min(1, "Supplier name is required"),
  suppliercode: z.string().min(1, "Supplier code is required"),
  contactPersonName: z.string().optional(),
  address: z.string().optional(),
  phoneNo: z
    .union([
      z.literal(""),
      z.string().regex(/^[6-9][0-9]{9}$/, "Enter 10 digit number"),
    ])
    .optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface SupplierModalProps {
  open: boolean;
  onClose: () => void;
  row: LibrarySupplier | null;
  onSaved: () => void;
}

export function SupplierModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<SupplierModalProps>) {
  const isEditing = row != null;
  const [organizations, setOrganizations] = useState<SelectOption[]>([]);

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
      suppliername: "",
      suppliercode: "",
      contactPersonName: "",
      address: "",
      phoneNo: "",
      isActive: true,
      reason: "active",
    },
  });

  useEffect(() => {
    if (!open) return;
    void listOrganizations().then((rows) => {
      setOrganizations(
        rows.map((o) => ({
          value: String(o.organizationId),
          label: o.orgCode ?? o.orgName ?? String(o.organizationId),
        })),
      );
    });
    reset(
      row
        ? {
            organizationId: row.organizationId,
            suppliername: row.suppliername ?? "",
            suppliercode: row.suppliercode ?? "",
            contactPersonName: row.contactPersonName ?? "",
            address: row.address ?? "",
            phoneNo: row.phoneNo ?? "",
            isActive: row.isActive ?? true,
            reason: row.reason ?? "active",
          }
        : {
            organizationId: undefined,
            suppliername: "",
            suppliercode: "",
            contactPersonName: "",
            address: "",
            phoneNo: "",
            isActive: true,
            reason: "active",
          },
    );
  }, [open, row, reset]);

  async function onSubmit(data: FormValues) {
    const payload = {
      ...data,
      reason: data.isActive ? "active" : data.reason?.trim() || "inactive",
      ...(isEditing && row?.supplierId ? { supplierId: row.supplierId } : {}),
    };
    try {
      if (isEditing && row?.supplierId) {
        await updateLibrarySupplier(row.supplierId, payload);
        toastSuccess("Supplier updated");
      } else {
        await createLibrarySupplier(payload);
        toastSuccess("Supplier created");
      }
      onSaved();
      onClose();
    } catch (err) {
      toastError(err, `Failed to ${isEditing ? "update" : "create"} supplier`);
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Supplier Details" : "Add Supplier Details"}
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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <Select
            label="Organization"
            required
            value={
              watch("organizationId") ? String(watch("organizationId")) : null
            }
            onChange={(v) => setValue("organizationId", v ? Number(v) : 0)}
            options={organizations}
            placeholder="Select organization"
            searchable
            error={errors.organizationId?.message}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="suppliername">Supplier Name *</Label>
          <Input
            id="suppliername"
            placeholder="Enter supplier name"
            {...register("suppliername")}
          />
          {errors.suppliername && (
            <p className="text-xs text-destructive">
              {errors.suppliername.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="suppliercode">Supplier Code *</Label>
          <Input
            id="suppliercode"
            placeholder="Enter supplier code"
            {...register("suppliercode")}
          />
          {errors.suppliercode && (
            <p className="text-xs text-destructive">
              {errors.suppliercode.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contactPersonName">Contact Person</Label>
          <Input
            id="contactPersonName"
            placeholder="Enter contact person name"
            {...register("contactPersonName")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            placeholder="Enter address"
            {...register("address")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phoneNo">Phone Number</Label>
          <Input
            id="phoneNo"
            type="number"
            placeholder="Enter phone number"
            {...register("phoneNo")}
          />
          {errors.phoneNo ? (
            <p className="text-xs text-destructive">{errors.phoneNo.message}</p>
          ) : null}
        </div>
        <div className="md:col-span-3">
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
