"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createTodoListTag,
  listActiveCollegesForTodo,
  searchEmployeesForManagerAssign,
  updateTodoListTag,
} from "@/services";
import type { College } from "@/types/college";
import type { EmpTodoListTag } from "@/types/todo";

type AnyRow = Record<string, unknown>;

function employeeLabel(row: AnyRow): string {
  const num = row.empNumber != null ? String(row.empNumber) : "";
  const name = String(row.firstName ?? row.employeeName ?? "");
  return name ? `${num} (${name})` : num || String(row.employeeId ?? "");
}

const schema = z.object({
  collegeId: z.number().min(1, "College is required"),
  empId: z.number().min(1, "Employee is required"),
  tag: z.string().min(1, "Tag is required"),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface TodoListTagModalProps {
  open: boolean;
  onClose: () => void;
  row: EmpTodoListTag | null;
  collegeId?: number | null;
  colleges?: College[];
  onSaved: () => void;
}

const BTN_NAVY =
  "bg-[#001f3f] text-white hover:bg-[#002a54] disabled:opacity-60";

export default function TodoListTagModal({
  open,
  onClose,
  row,
  collegeId,
  colleges: collegesProp,
  onSaved,
}: Readonly<TodoListTagModalProps>) {
  const isEditing = Boolean(row);
  const [colleges, setColleges] = useState<College[]>(collegesProp ?? []);
  const [employeeOptions, setEmployeeOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      collegeId: undefined,
      empId: undefined,
      tag: "",
      isActive: true,
      reason: "",
    },
  });

  const isActive = watch("isActive");

  useEffect(() => {
    if (collegesProp?.length) {
      setColleges(collegesProp);
      return;
    }
    if (!open) return;
    void listActiveCollegesForTodo()
      .then(setColleges)
      .catch(() => setColleges([]));
  }, [open, collegesProp]);

  useEffect(() => {
    if (row) {
      reset({
        collegeId: row.collegeId,
        empId: row.empId,
        tag: row.tag,
        isActive: row.isActive,
        reason: row.reason ?? "",
      });
      setEmployeeOptions(
        row.empId
          ? [
              {
                value: String(row.empId),
                label:
                  row.employeeName ??
                  row.firstName ??
                  row.empNumber ??
                  String(row.empId),
              },
            ]
          : [],
      );
    } else {
      reset({
        collegeId: collegeId ?? undefined,
        empId: undefined,
        tag: "",
        isActive: true,
        reason: "",
      });
      setEmployeeOptions([]);
    }
    setSubmitError(null);
  }, [row, open, collegeId, reset]);

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: c.collegeCode ?? c.collegeName,
      })),
    [colleges],
  );

  async function onEmployeeSearch(term: string) {
    const q = term.trim();
    if (q.length < 5) {
      setEmployeeOptions([]);
      return;
    }
    setEmployeeSearchLoading(true);
    try {
      const rows = await searchEmployeesForManagerAssign(q);
      setEmployeeOptions(
        rows.map((r) => ({
          value: String((r as AnyRow).employeeId),
          label: employeeLabel(r as AnyRow),
        })),
      );
    } catch {
      setEmployeeOptions([]);
    } finally {
      setEmployeeSearchLoading(false);
    }
  }

  async function onSubmit(data: FormValues) {
    setSubmitError(null);
    try {
      const payload = {
        ...data,
        reason: data.isActive ? data.reason || "active" : data.reason || "",
      };
      if (isEditing) await updateTodoListTag(row!.empTodoListTagId, payload);
      else await createTodoListTag(payload);
      onSaved();
      onClose();
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save TODO tag",
      );
    }
  }

  let submitLabel = "Add List-Tags";
  if (isSubmitting) submitLabel = "Saving...";
  else if (isEditing) submitLabel = "Update";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto sm:max-w-[750px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit TODO Tags" : "Add TODO Tags"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              name="collegeId"
              control={control}
              render={({ field }) => (
                <Select
                  label="College"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(value) =>
                    field.onChange(value ? Number(value) : undefined)
                  }
                  options={collegeOptions}
                  placeholder="College"
                  searchable
                  error={errors.collegeId?.message}
                />
              )}
            />
            <Controller
              name="empId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Invgilator Employee"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(value) =>
                    field.onChange(value ? Number(value) : undefined)
                  }
                  options={employeeOptions}
                  placeholder="Search..."
                  searchable
                  onSearch={onEmployeeSearch}
                  isLoading={employeeSearchLoading}
                  error={errors.empId?.message}
                />
              )}
            />
            <div>
              <Label htmlFor="tag" className="text-[12px] font-medium">
                Tags <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tag"
                className="mt-1.5"
                placeholder="Tags"
                {...register("tag")}
              />
              {errors.tag && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.tag.message}
                </p>
              )}
            </div>
            <div className="flex min-h-[60px] items-end pb-2">
              <label
                className="flex items-center gap-2 text-sm"
                htmlFor="tagIsActive"
              >
                <input
                  id="tagIsActive"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setValue("isActive", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Active
              </label>
            </div>
            {!isActive ? (
              <div className="sm:col-span-2">
                <Label htmlFor="reason" className="text-[12px] font-medium">
                  Reason
                </Label>
                <Input
                  id="reason"
                  className="mt-1.5"
                  placeholder="Reason"
                  {...register("reason")}
                />
              </div>
            ) : null}
          </div>
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <DialogFooter className="gap-2 pt-1 sm:justify-end">
            <Button
              variant="outline"
              type="button"
              onClick={onClose}
              className="border-slate-300 text-[#001f3f]"
            >
              Close
            </Button>
            <Button type="submit" disabled={isSubmitting} className={BTN_NAVY}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
