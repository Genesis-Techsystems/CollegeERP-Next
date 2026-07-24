"use client";

/**
 * Angular parity: user-management page-modal
 * Shared across: pages (module-scoped), only-pages (orphan pages) and
 * add-submodule-pages (submodule-scoped).
 * Fields: pageName, displayName, pageCode, url (required); pageNo (default 0),
 * sortOrder (default '0'), iconName (optional); isActive (default true).
 * `createExtra` / `editExtra` let each caller stamp its own moduleId /
 * subModuleId scope onto the payload without this modal needing to know
 * which page it is embedded in.
 * No print.
 */

import { useEffect } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormModal } from "@/common/components/feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toastError, toastSuccess } from "@/lib/toast";
import { createPage, updatePage, type NavPage } from "@/services";

const schema = z.object({
  pageName: z.string().min(1, "Page Name is required"),
  displayName: z.string().min(1, "Display Name is required"),
  pageCode: z.string().min(1, "Page Code is required"),
  url: z.string().min(1, "URL is required"),
  pageNo: z.string().min(1, "Page No is required"),
  sortOrder: z.string().min(1, "Sort Order is required"),
  iconName: z.string().min(1, "Icon Name is required"),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function getDefaults(edit?: NavPage | null): FormValues {
  return {
    pageName: edit?.pageName ?? "",
    displayName: edit?.displayName ?? "",
    pageCode: edit?.pageCode ?? "",
    url: edit?.url ?? "",
    pageNo: edit?.pageNo != null ? String(edit.pageNo) : "0",
    sortOrder: edit?.sortOrder != null ? String(edit.sortOrder) : "0",
    iconName: edit?.iconName ?? "",
    isActive: edit?.isActive ?? true,
  };
}

export interface PageModalProps {
  open: boolean;
  onClose: () => void;
  editData: NavPage | null;
  onSaved: () => void;
  /** Merged onto the payload when creating a new page (e.g. moduleId scope). */
  createExtra?: Partial<NavPage>;
  /** Merged onto the payload when updating an existing page. */
  editExtra?: Partial<NavPage>;
}

export function PageModal({
  open,
  onClose,
  editData,
  onSaved,
  createExtra,
  editExtra,
}: Readonly<PageModalProps>) {
  const isEditing = editData != null;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: getDefaults(),
  });

  useEffect(() => {
    if (!open) return;
    reset(getDefaults(editData));
  }, [open, editData, reset]);

  async function onSubmit(values: FormValues) {
    const basePayload: Partial<NavPage> = {
      pageName: values.pageName.trim(),
      displayName: values.displayName.trim(),
      pageCode: values.pageCode.trim(),
      url: values.url.trim(),
      pageNo: Number(values.pageNo) || 0,
      sortOrder: values.sortOrder,
      iconName: (values.iconName ?? "").trim(),
      isActive: values.isActive,
      reason: editData?.reason ?? "",
    };

    try {
      if (isEditing && editData?.pageId) {
        const payload: Partial<NavPage> = {
          ...basePayload,
          ...editExtra,
          pageId: editData.pageId,
        };
        await updatePage(editData.pageId, payload);
        toastSuccess("Page updated successfully");
      } else {
        const payload: Partial<NavPage> = { ...basePayload, ...createExtra };
        await createPage(payload);
        toastSuccess("Page created successfully");
      }
      onSaved();
      onClose();
    } catch (e) {
      toastError(e, "Failed to save page");
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Page" : "Add Page"}
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
      isSubmitting={isSubmitting}
      submitLabel="Save"
      cancelLabel="Close"
      size="lg"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pageName">Page Name *</Label>
          <Input id="pageName" {...register("pageName")} />
          {errors.pageName ? (
            <p className="text-xs text-destructive">
              {errors.pageName.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="displayName">Display Name *</Label>
          <Input id="displayName" {...register("displayName")} />
          {errors.displayName ? (
            <p className="text-xs text-destructive">
              {errors.displayName.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pageCode">Page Code *</Label>
          <Input id="pageCode" {...register("pageCode")} />
          {errors.pageCode ? (
            <p className="text-xs text-destructive">
              {errors.pageCode.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="url">URL *</Label>
          <Input id="url" {...register("url")} />
          {errors.url ? (
            <p className="text-xs text-destructive">{errors.url.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pageNo">Page No</Label>
          <Input id="pageNo" type="number" {...register("pageNo")} />
          {errors.pageNo ? (
            <p className="text-xs text-destructive">{errors.pageNo.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sortOrder">Sort Order</Label>
          <Input id="sortOrder" type="number" {...register("sortOrder")} />
          {errors.sortOrder ? (
            <p className="text-xs text-destructive">
              {errors.sortOrder.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="iconName">Icon Name *</Label>
          <Input id="iconName" {...register("iconName")} />
          {errors.iconName ? (
            <p className="text-xs text-destructive">
              {errors.iconName.message}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2 pt-6">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <>
                <Checkbox
                  id="isActive"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Active
                </Label>
              </>
            )}
          />
        </div>
      </div>
    </FormModal>
  );
}
