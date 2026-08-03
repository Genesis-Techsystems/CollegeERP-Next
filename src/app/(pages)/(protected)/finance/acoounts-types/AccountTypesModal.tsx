"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, type SelectOption } from "@/common/components/select";
import { toastError, toastSuccess } from "@/lib/toast";
import { QK } from "@/lib/query-keys";
import {
  createFinAccountType,
  listAccountEntitiesByCollege,
  listCollegesActive,
  listFinAccountTypesByCollege,
  listFinMajorAccountTypes,
  updateFinAccountType,
} from "@/services";
import type { FinAccountType } from "@/types/finance";

const schema = z.object({
  collegeId: z.coerce.number().min(1, "College is required"),
  accountEntityId: z.coerce.number().min(1, "Account entity is required"),
  accounttypeCode: z.string().min(1, "Account type code is required"),
  accounttypeName: z.string().min(1, "Account type name is required"),
  parentAccountTypeId: z.coerce.number().optional(),
  majorAccountTypeId: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z
      .number({ error: "Major account is required" })
      .min(1, "Major account is required"),
  ),
  isGroupAccount: z.boolean(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function getDefaults(edit?: FinAccountType | null): FormValues {
  return {
    collegeId: edit?.collegeId ?? 0,
    accountEntityId: edit?.accountEntityId ?? 0,
    accounttypeCode: edit?.accounttypeCode ?? "",
    accounttypeName: edit?.accounttypeName ?? "",
    parentAccountTypeId: edit?.parentAccountTypeId ?? undefined,
    majorAccountTypeId: edit?.majorAccountTypeId ?? 0,
    isGroupAccount: edit?.isGroupAccount ?? true,
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? "active",
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  editData: FinAccountType | null;
  onSaved: () => void;
}

export default function AccountTypesModal({
  open,
  onClose,
  editData,
  onSaved,
}: Props) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: getDefaults(),
  });

  const collegeId = watch("collegeId");
  const isActive = watch("isActive");

  const { data: colleges = [], isLoading: collegesLoading } = useQuery({
    queryKey: ["College", "active"],
    queryFn: listCollegesActive,
    enabled: open,
  });

  const { data: entities = [], isLoading: entitiesLoading } = useQuery({
    queryKey: QK.finAccountEntities.byCollege(collegeId),
    queryFn: () => listAccountEntitiesByCollege(collegeId),
    enabled: open && collegeId > 0,
  });

  const { data: parentTypes = [], isLoading: parentsLoading } = useQuery({
    queryKey: QK.finAccountTypes.byCollege(collegeId),
    queryFn: () => listFinAccountTypesByCollege(collegeId),
    enabled: open && collegeId > 0,
  });

  const { data: majorTypes = [], isLoading: majorLoading } = useQuery({
    queryKey: QK.finMajorAccountTypes.list(),
    queryFn: listFinMajorAccountTypes,
    enabled: open,
  });

  const collegeOptions = useMemo<SelectOption[]>(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
      })),
    [colleges],
  );

  const entityOptions = useMemo<SelectOption[]>(
    () =>
      entities.map((e) => ({
        value: String(e.accountEntityId),
        label: String(e.entityCode ?? e.entityName ?? e.accountEntityId),
      })),
    [entities],
  );

  const parentOptions = useMemo<SelectOption[]>(
    () =>
      parentTypes
        .filter((t) => t.accountTypeId !== editData?.accountTypeId)
        .map((t) => ({
          value: String(t.accountTypeId),
          label: String(t.accounttypeCode),
        })),
    [parentTypes, editData?.accountTypeId],
  );

  const majorOptions = useMemo<SelectOption[]>(
    () =>
      majorTypes.map((m) => ({
        value: String(m.generalDetailId),
        label: String(
          m.generalDetailDisplayName ??
            m.generalDetailName ??
            m.generalDetailCode ??
            m.generalDetailId,
        ),
      })),
    [majorTypes],
  );

  useEffect(() => {
    reset(getDefaults(editData));
  }, [open, editData, reset]);

  async function onSubmit(values: FormValues) {
    const payload: Partial<FinAccountType> = {
      collegeId: values.collegeId,
      accountEntityId: values.accountEntityId,
      accounttypeCode: values.accounttypeCode.trim(),
      accounttypeName: values.accounttypeName.trim(),
      parentAccountTypeId: values.parentAccountTypeId || null,
      majorAccountTypeId: values.majorAccountTypeId,
      isGroupAccount: values.isGroupAccount,
      isActive: values.isActive,
      reason: values.isActive ? "active" : values.reason?.trim() || "inactive",
    };
    try {
      if (editData) {
        // Angular editDialog: details.accountTypeId = data.accountTypeId before updateDetails
        await updateFinAccountType(editData.accountTypeId, {
          ...payload,
          accountTypeId: editData.accountTypeId,
        });
        toastSuccess("Account type updated successfully");
      } else {
        await createFinAccountType(payload);
        toastSuccess("Account type created successfully");
      }
      onSaved();
      onClose();
    } catch (err) {
      toastError(
        err,
        editData ? "Update account type failed" : "Create account type failed",
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl overflow-visible">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? "Edit Account Types" : "Add Account Types"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="py-1">
          {/* Angular order: Name, Code, Major | College, Entity, Parent | checkboxes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2">
            <div className="space-y-0.5">
              <Label className="text-xs">Account Type Name *</Label>
              <Input
                className="h-8 text-xs"
                placeholder="Enter Account Type Name"
                {...register("accounttypeName")}
              />
              {errors.accounttypeName && (
                <p className="text-xs text-red-500">
                  {errors.accounttypeName.message}
                </p>
              )}
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Account Type Code *</Label>
              <Input
                className="h-8 text-xs"
                placeholder="Enter Account Type Code"
                {...register("accounttypeCode")}
              />
              {errors.accounttypeCode && (
                <p className="text-xs text-red-500">
                  {errors.accounttypeCode.message}
                </p>
              )}
            </div>

            <div className="space-y-0.5">
              <Controller
                name="majorAccountTypeId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Major Account *"
                    value={field.value ? String(field.value) : ""}
                    onChange={(v) => field.onChange(Number(v))}
                    options={majorOptions}
                    placeholder="Enter Major Account"
                    isLoading={majorLoading}
                    searchable
                  />
                )}
              />
              {errors.majorAccountTypeId && (
                <p className="text-xs text-red-500">
                  {errors.majorAccountTypeId.message}
                </p>
              )}
            </div>

            <div className="space-y-0.5">
              <Controller
                name="collegeId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="College *"
                    value={field.value ? String(field.value) : ""}
                    onChange={(v) => {
                      field.onChange(Number(v));
                      setValue("accountEntityId", 0);
                      setValue("parentAccountTypeId", undefined);
                    }}
                    options={collegeOptions}
                    placeholder="Enter College"
                    isLoading={collegesLoading}
                    searchable
                  />
                )}
              />
              {errors.collegeId && (
                <p className="text-xs text-red-500">
                  {errors.collegeId.message}
                </p>
              )}
            </div>

            <div className="space-y-0.5">
              <Controller
                name="accountEntityId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Entity *"
                    value={field.value ? String(field.value) : ""}
                    onChange={(v) => field.onChange(Number(v))}
                    options={entityOptions}
                    placeholder="Enter Entity"
                    isLoading={entitiesLoading}
                    disabled={!collegeId}
                    searchable
                  />
                )}
              />
              {errors.accountEntityId && (
                <p className="text-xs text-red-500">
                  {errors.accountEntityId.message}
                </p>
              )}
            </div>

            <div className="space-y-0.5">
              <Controller
                name="parentAccountTypeId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Parent Account"
                    value={field.value ? String(field.value) : ""}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={parentOptions}
                    placeholder="Enter Parent Account"
                    isLoading={parentsLoading}
                    disabled={!collegeId}
                    clearable
                    searchable
                  />
                )}
              />
            </div>

            <div className="col-span-1 sm:col-span-3 flex flex-wrap items-center gap-x-8 gap-y-2 pt-2">
              <Controller
                name="isGroupAccount"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(v === true)}
                    />
                    Group account
                  </label>
                )}
              />
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      id="isActive"
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(v === true)}
                    />
                    Is Active
                  </label>
                )}
              />
            </div>

            {!isActive && (
              <div className="col-span-1 sm:col-span-3 space-y-0.5">
                <Label className="text-xs">Reason</Label>
                <Input
                  className="h-8 text-xs"
                  placeholder="Enter Reason"
                  {...register("reason")}
                />
                {errors.reason && (
                  <p className="text-xs text-red-500">
                    {errors.reason.message}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : editData ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
