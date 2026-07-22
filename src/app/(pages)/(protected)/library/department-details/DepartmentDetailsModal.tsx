"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormModal } from "@/common/components/feedback";
import { Select, type SelectOption } from "@/common/components/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LIBRARY_FIELD_LABEL_CLASS,
  LIBRARY_INPUT_CLASS,
  LIBRARY_MODAL_TITLE_CLASS,
} from "../_lib/modal-styles";
import {
  createLibraryCategory,
  listActiveOrganizationsForLibrary,
  updateLibraryCategory,
} from "@/services";
import type { LibraryCategory } from "@/types/library";
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

const schema = z.object({
  orgId: requiredId("Organization"),
  bookCategoryName: z.string().min(1, "Book Department Name is required"),
  bookCategoryCode: z.string().min(1, "Book Department Code is required"),
  deptNo: z.string().optional(),
  inBarcode: z.boolean(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface DepartmentDetailsModalProps {
  open: boolean;
  onClose: () => void;
  row: LibraryCategory | null;
  onSaved: () => void;
}

export function DepartmentDetailsModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<DepartmentDetailsModalProps>) {
  const isEditing = row != null;
  const [organizations, setOrganizations] = useState<SelectOption[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      orgId: undefined,
      bookCategoryName: "",
      bookCategoryCode: "",
      deptNo: "",
      inBarcode: false,
      isActive: true,
      reason: "active",
    },
  });

  useEffect(() => {
    if (!open) return;
    void listActiveOrganizationsForLibrary()
      .then((rows) => {
        setOrganizations(
          rows.map((organization) => ({
            value: String(organization.organizationId),
            label: String(
              organization.orgCode ??
                organization.orgName ??
                organization.organizationId,
            ),
          })),
        );
      })
      .catch((error) => toastError(error, "Failed to load organizations"));

    reset(
      row
        ? {
            orgId: row.orgId,
            bookCategoryName: row.bookCategoryName ?? "",
            bookCategoryCode: row.bookCategoryCode ?? "",
            deptNo: row.deptNo ?? "",
            inBarcode: Boolean(row.inBarcode),
            isActive: row.isActive ?? true,
            reason: row.reason ?? "active",
          }
        : {
            orgId: undefined,
            bookCategoryName: "",
            bookCategoryCode: "",
            deptNo: "",
            inBarcode: false,
            isActive: true,
            reason: "active",
          },
    );
  }, [open, row, reset]);

  async function onSubmit(data: FormValues) {
    // Angular closes the dialog with form.value as-is
    const payload = {
      orgId: data.orgId,
      bookCategoryName: data.bookCategoryName,
      bookCategoryCode: data.bookCategoryCode,
      deptNo: data.deptNo ?? "",
      inBarcode: data.inBarcode,
      isActive: data.isActive,
      reason: data.isActive ? data.reason || "active" : (data.reason ?? ""),
    };
    try {
      if (isEditing && row?.libCategoryId) {
        // Angular: details.libCategoryId = data.libCategoryId before updateDetails
        await updateLibraryCategory(row.libCategoryId, {
          ...payload,
          libCategoryId: row.libCategoryId,
        });
        toastSuccess("Department details updated");
      } else {
        await createLibraryCategory(payload);
        toastSuccess("Department details created");
      }
      onSaved();
      onClose();
    } catch (err) {
      toastError(
        err,
        `Failed to ${isEditing ? "update" : "create"} department details`,
      );
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Department Details" : "Add Department Details"}
      titleClassName={LIBRARY_MODAL_TITLE_CLASS}
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
        <Controller
          name="orgId"
          control={control}
          render={({ field }) => (
            <Select
              label="Organization *"
              value={field.value != null ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={organizations}
              placeholder="Select organization"
              searchable
              error={errors.orgId?.message}
            />
          )}
        />

        <div className="space-y-1.5">
          <Label
            htmlFor="bookCategoryName"
            className={LIBRARY_FIELD_LABEL_CLASS}
          >
            Book Department Name *
          </Label>
          <Input
            id="bookCategoryName"
            className={LIBRARY_INPUT_CLASS}
            {...register("bookCategoryName")}
          />
          {errors.bookCategoryName && (
            <p className="text-xs text-destructive">
              {errors.bookCategoryName.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="bookCategoryCode"
            className={LIBRARY_FIELD_LABEL_CLASS}
          >
            Book Department Code *
          </Label>
          <Input
            id="bookCategoryCode"
            className={LIBRARY_INPUT_CLASS}
            {...register("bookCategoryCode")}
          />
          {errors.bookCategoryCode && (
            <p className="text-xs text-destructive">
              {errors.bookCategoryCode.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="deptNo" className={LIBRARY_FIELD_LABEL_CLASS}>
            Dept No
          </Label>
          <Input
            id="deptNo"
            className={LIBRARY_INPUT_CLASS}
            {...register("deptNo")}
          />
        </div>

        <Controller
          name="inBarcode"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-2 self-end pb-1">
              <Checkbox
                id="inBarcode"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
              <Label htmlFor="inBarcode" className={LIBRARY_FIELD_LABEL_CLASS}>
                In Barcode
              </Label>
            </div>
          )}
        />

        <div className="sm:col-span-2 space-y-3">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="deptIsActive"
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                />
                <Label
                  htmlFor="deptIsActive"
                  className={LIBRARY_FIELD_LABEL_CLASS}
                >
                  Active
                </Label>
              </div>
            )}
          />
          {!watch("isActive") ? (
            <div className="max-w-md space-y-1.5">
              <Label htmlFor="deptReason" className={LIBRARY_FIELD_LABEL_CLASS}>
                Reason
              </Label>
              <Input
                id="deptReason"
                className={LIBRARY_INPUT_CLASS}
                {...register("reason")}
              />
            </div>
          ) : null}
        </div>
      </div>
    </FormModal>
  );
}
