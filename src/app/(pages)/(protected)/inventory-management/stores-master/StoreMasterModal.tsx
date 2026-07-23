"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { ActiveStatusField } from "@/common/components/forms";
import {
  MultiSelect,
  Select,
  type SelectOption,
} from "@/common/components/select";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createInvStore,
  listActiveOrganizationsForInventory,
  listCollegesForInvStore,
  searchEmployeesForInvStore,
  updateInvStore,
} from "@/services";
import type { InvStore } from "@/types/inventory";

const schema = z.object({
  organizationId: z.coerce.number().min(1, "Organization is required"),
  collegeIds: z.array(z.string()),
  storeName: z.string().min(1, "Store name is required"),
  storeCode: z.string().min(1, "Store code is required"),
  employeeId: z.coerce.number().min(1, "Employee is required"),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function parseCollegeIds(edit?: InvStore | null): string[] {
  if (!edit?.collegeIds) return [];
  return edit.collegeIds
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && Number.isFinite(Number(s)) && Number(s) > 0);
}

function getDefaults(edit?: InvStore | null): FormValues {
  return {
    organizationId: edit?.organizationId ?? 0,
    collegeIds: parseCollegeIds(edit),
    storeCode: edit?.storeCode ?? "",
    storeName: edit?.storeName ?? "",
    employeeId: edit?.employeeId ?? 0,
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? "active",
  };
}

function employeeLabel(row: Record<string, unknown>): string {
  const name = String(
    row.firstName ?? row.employeeName ?? row.empName ?? "",
  ).trim();
  return name || "—";
}

interface Props {
  open: boolean;
  onClose: () => void;
  editData: InvStore | null;
  onSaved: () => void;
}

export default function StoreMasterModal({
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

  const organizationId = watch("organizationId");
  const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([]);
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);

  /** Angular: listDetailsById(Organization, 'true', 'isActive') */
  const { data: organizations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ["Organizations", "activeForInventory"],
    queryFn: listActiveOrganizationsForInventory,
    enabled: open,
  });

  /** Angular: listDetailsById(College, organizationId, 'Organization.organizationId') */
  const { data: colleges = [], isLoading: collegesLoading } = useQuery({
    queryKey: ["Colleges", "forInvStore", organizationId],
    queryFn: () => listCollegesForInvStore(organizationId),
    enabled: open && organizationId > 0,
  });

  const organizationOptions: SelectOption[] = useMemo(
    () =>
      organizations.map((o) => ({
        value: String(o.organizationId ?? ""),
        label: String(o.orgCode ?? o.orgName ?? o.organizationId ?? ""),
      })),
    [organizations],
  );

  const collegeOptions: SelectOption[] = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
      })),
    [colleges],
  );

  useEffect(() => {
    if (!open) return;
    reset(getDefaults(editData));
    // Seed employee option so edit mode shows the selected employee (Angular enteredStudent + setValue)
    if (editData?.employeeId) {
      setEmployeeOptions([
        {
          value: String(editData.employeeId),
          label: editData.empName?.trim() || String(editData.employeeId),
        },
      ]);
      // Angular also typeaheads by empName when length > 4 to refresh the list
      const empName = editData.empName?.trim() ?? "";
      if (empName.length > 4) {
        void searchEmployeesForInvStore(empName).then((rows) => {
          const opts = rows
            .filter((r) => r.employeeId != null)
            .map((r) => ({
              value: String(r.employeeId),
              label: employeeLabel(r),
            }));
          if (opts.length === 0) return;
          setEmployeeOptions((prev) => {
            const byValue = new Map(opts.map((o) => [o.value, o]));
            for (const p of prev) {
              if (!byValue.has(p.value)) byValue.set(p.value, p);
            }
            return Array.from(byValue.values());
          });
        });
      }
    } else {
      setEmployeeOptions([]);
    }
  }, [open, editData, reset]);

  const onEmployeeSearch = useCallback(async (term: string) => {
    const q = term.trim();
    if (q.length < 4) return;
    setEmployeeSearchLoading(true);
    try {
      const rows = await searchEmployeesForInvStore(q);
      setEmployeeOptions(
        rows
          .filter((r) => r.employeeId != null)
          .map((r) => ({
            value: String(r.employeeId),
            label: employeeLabel(r),
          })),
      );
    } catch (err) {
      toastError(getErrorMessage(err));
      setEmployeeOptions([]);
    } finally {
      setEmployeeSearchLoading(false);
    }
  }, []);

  async function onSubmit(values: FormValues) {
    // Angular submit: join collegeMultiCtrl values as comma-separated collegeIds
    const collegeIds =
      values.collegeIds.length > 0 ? values.collegeIds.join(",") : undefined;

    const payload: Partial<InvStore> = {
      organizationId: values.organizationId,
      storeCode: values.storeCode.trim(),
      storeName: values.storeName.trim(),
      collegeIds,
      employeeId: values.employeeId,
      isActive: values.isActive,
      reason: values.isActive ? "active" : values.reason?.trim() || "inactive",
    };

    try {
      if (editData) {
        // Angular sets details.storeId before updateDetails(..., storeId, 'storeId')
        await updateInvStore(editData.storeId, {
          ...payload,
          storeId: editData.storeId,
        });
        toastSuccess("Store master updated successfully.");
      } else {
        await createInvStore(payload);
        toastSuccess("Store master created successfully.");
      }
      onSaved();
      onClose();
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? "Edit Stores Master" : "Add Stores Master"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 py-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Controller
              name="organizationId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Organization *"
                  value={field.value > 0 ? String(field.value) : null}
                  onChange={(v) => {
                    field.onChange(v ? Number(v) : 0);
                    // Angular reloads colleges on org change; clear prior college selection
                    setValue("collegeIds", []);
                  }}
                  options={organizationOptions}
                  placeholder="Organization"
                  isLoading={orgsLoading}
                  searchable
                  error={errors.organizationId?.message}
                />
              )}
            />
            <Controller
              name="collegeIds"
              control={control}
              render={({ field }) => (
                <MultiSelect
                  label="College"
                  value={field.value ?? []}
                  onChange={field.onChange}
                  options={collegeOptions}
                  placeholder="College"
                  isLoading={collegesLoading}
                  searchable
                  disabled={!organizationId}
                  showSelectAll={false}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-0.5">
              <Label className="text-xs">Store Name *</Label>
              <Input
                className="h-8 text-xs"
                placeholder="Store Name"
                {...register("storeName")}
              />
              {errors.storeName && (
                <p className="text-xs text-red-500">
                  {errors.storeName.message}
                </p>
              )}
            </div>
            <div className="space-y-0.5">
              <Label className="text-xs">Store Code *</Label>
              <Input
                className="h-8 text-xs"
                placeholder="Store Code"
                {...register("storeCode")}
              />
              {errors.storeCode && (
                <p className="text-xs text-red-500">
                  {errors.storeCode.message}
                </p>
              )}
            </div>
          </div>

          <Controller
            name="employeeId"
            control={control}
            render={({ field }) => (
              <Select
                label="Employee *"
                value={field.value > 0 ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : 0)}
                options={employeeOptions}
                placeholder="Employee"
                searchable
                onSearch={(term) => void onEmployeeSearch(term)}
                isLoading={employeeSearchLoading}
                error={errors.employeeId?.message}
              />
            )}
          />

          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch("reason") ?? ""}
                onActiveChange={(active) => {
                  field.onChange(active);
                  if (active) setValue("reason", "active");
                }}
                onReasonChange={(v) => setValue("reason", v)}
                reasonError={errors.reason?.message}
              />
            )}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
