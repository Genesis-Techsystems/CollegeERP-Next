"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DatePicker } from "@/common/components/date-picker";
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
import { Textarea } from "@/components/ui/textarea";
import {
  listActiveCollegesForTodo,
  listTodoActivityLookup,
  listTodoTagsLookup,
  searchEmployeesForTodo,
} from "@/services";
import type { College } from "@/types/college";
import type {
  EmpActivityListItem,
  EmpTodoListItem,
  EmpTodoListTag,
} from "@/types/todo";

/** Angular hardcodes these defaults on `add-todo-list.component.ts` — replicated as-is. */
const DEFAULT_REPEAT_CATDET_ID = 601;
const DEFAULT_PRIORITY_CATDET_ID = 613;
/** Angular `submit()` always sets `todoTime = '11:00:00'` (ignores timepicker). */
const ANGULAR_TODO_TIME = "11:00:00";

type AnyRow = Record<string, unknown>;

function employeeLabel(row: AnyRow): string {
  const num = row.empNumber != null ? String(row.empNumber) : "";
  const name = String(row.firstName ?? row.employeeName ?? "");
  return name ? `${num} (${name})` : num || String(row.employeeId ?? "");
}

function asDateInputValue(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(value: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const TIME_OPTIONS = [
  { value: "09:00", label: "9:00 AM" },
  { value: "09:30", label: "9:30 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "10:30", label: "10:30 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "11:30", label: "11:30 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "12:30", label: "12:30 PM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "15:00", label: "3:00 PM" },
  { value: "16:00", label: "4:00 PM" },
  { value: "17:00", label: "5:00 PM" },
];

const schema = z.object({
  collegeId: z.number().min(1, "College is required"),
  empId: z.number().min(1, "Employee is required"),
  activityListId: z.number().min(1, "Activity is required"),
  parentTodoListId: z
    .union([z.number(), z.string()])
    .refine(
      (v) => v !== "" && v != null && String(v).trim() !== "",
      "Parent Tag is required",
    ),
  title: z.string().min(1, "Title is required"),
  notes: z.string().min(1, "Notes are required"),
  url: z.string().optional(),
  todoDate: z.string().min(1, "Start Date is required"),
  /** UI-only; Angular ignores and hardcodes `11:00:00` on submit. */
  displayTime: z.string().optional(),
  empToDOListTagIds: z.number().min(1, "Tag List is required"),
  repeatCatdetId: z.number(),
  isFlaged: z.boolean(),
  endRepeatDate: z.string().optional(),
  priorityCatdetId: z.number(),
  isCompleted: z.boolean(),
  isActive: z.boolean(),
  reason: z.union([z.string(), z.boolean()]).optional(),
});

export type TodoFormValues = z.infer<typeof schema> & {
  todoTime: string;
};

type FormValues = z.infer<typeof schema>;

interface TodoListModalProps {
  open: boolean;
  onClose: () => void;
  row: EmpTodoListItem | null;
  collegeId: number | null;
  colleges?: College[];
  defaultDate?: Date;
  onSubmit: (data: TodoFormValues) => Promise<void>;
}

const BTN_NAVY =
  "bg-[#001f3f] text-white hover:bg-[#002a54] disabled:opacity-60";

export default function TodoListModal({
  open,
  onClose,
  row,
  collegeId,
  colleges: collegesProp,
  defaultDate,
  onSubmit,
}: Readonly<TodoListModalProps>) {
  const isEditing = Boolean(row);
  const [colleges, setColleges] = useState<College[]>(collegesProp ?? []);
  const [activities, setActivities] = useState<EmpActivityListItem[]>([]);
  const [tags, setTags] = useState<EmpTodoListTag[]>([]);
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
      activityListId: undefined,
      parentTodoListId: "",
      title: "",
      notes: "",
      url: "",
      todoDate: "",
      displayTime: "09:00",
      empToDOListTagIds: undefined,
      repeatCatdetId: DEFAULT_REPEAT_CATDET_ID,
      isFlaged: true,
      endRepeatDate: "",
      priorityCatdetId: DEFAULT_PRIORITY_CATDET_ID,
      isCompleted: false,
      isActive: true,
      reason: true,
    },
  });

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
    if (!open) return;
    Promise.all([listTodoActivityLookup(), listTodoTagsLookup()])
      .then(([activityRows, tagRows]) => {
        setActivities(activityRows);
        setTags(tagRows);
      })
      .catch(console.error);
  }, [open]);

  useEffect(() => {
    if (row) {
      reset({
        collegeId: row.collegeId,
        empId: row.empId,
        activityListId: row.activityListId ?? undefined,
        parentTodoListId: row.parentTodoListId ?? "",
        title: row.title,
        notes: row.notes ?? "",
        url: row.url ?? "",
        todoDate: asDateInputValue(row.todoDate),
        displayTime: "09:00",
        empToDOListTagIds: row.empToDOListTagIds ?? undefined,
        repeatCatdetId: row.repeatCatdetId ?? DEFAULT_REPEAT_CATDET_ID,
        isFlaged: row.isFlaged ?? true,
        endRepeatDate: asDateInputValue(row.endRepeatDate),
        priorityCatdetId: row.priorityCatdetId ?? DEFAULT_PRIORITY_CATDET_ID,
        isCompleted: row.isCompleted ?? false,
        isActive: row.isActive ?? true,
        reason: row.reason ?? true,
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
        activityListId: undefined,
        parentTodoListId: "",
        title: "",
        notes: "",
        url: "",
        todoDate: asDateInputValue(defaultDate ?? new Date()),
        displayTime: "09:00",
        empToDOListTagIds: undefined,
        repeatCatdetId: DEFAULT_REPEAT_CATDET_ID,
        isFlaged: true,
        endRepeatDate: "",
        priorityCatdetId: DEFAULT_PRIORITY_CATDET_ID,
        isCompleted: false,
        isActive: true,
        reason: true,
      });
      setEmployeeOptions([]);
    }
    setSubmitError(null);
  }, [row, open, collegeId, defaultDate, reset]);

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId),
        label: c.collegeCode ?? c.collegeName,
      })),
    [colleges],
  );
  const activityOptions = useMemo(
    () =>
      activities.map((a) => ({
        value: String(a.empActivityListId),
        label: a.listName,
      })),
    [activities],
  );
  const tagOptions = useMemo(
    () =>
      tags.map((t) => ({ value: String(t.empTodoListTagId), label: t.tag })),
    [tags],
  );

  const onEmployeeSearch = useCallback(async (term: string) => {
    const q = term.trim();
    // Angular `enteredEmployee`: only hits employeesearch when length > 4.
    if (q.length <= 4) return;
    setEmployeeSearchLoading(true);
    try {
      const rows = await searchEmployeesForTodo(q);
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
  }, []);

  async function handleFormSubmit(data: FormValues) {
    setSubmitError(null);
    try {
      const parentRaw = data.parentTodoListId;
      const parentTodoListId =
        typeof parentRaw === "number"
          ? parentRaw
          : Number.isFinite(Number(parentRaw))
            ? Number(parentRaw)
            : parentRaw;

      const payload: TodoFormValues = {
        ...data,
        parentTodoListId,
        todoTime: ANGULAR_TODO_TIME,
      };
      await onSubmit(payload);
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save TODO",
      );
    }
  }

  let submitLabel = "Add Schedular";
  if (isSubmitting) submitLabel = "Saving...";
  else if (isEditing) submitLabel = "Update";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Event" : "Add TODO"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="space-y-4 pt-2"
        >
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

            <Controller
              name="activityListId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Activity"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(value) =>
                    field.onChange(value ? Number(value) : undefined)
                  }
                  options={activityOptions}
                  placeholder="Activity"
                  searchable
                  clearable
                  error={errors.activityListId?.message}
                />
              )}
            />
            <Controller
              name="empToDOListTagIds"
              control={control}
              render={({ field }) => (
                <Select
                  label="Tag List"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(value) =>
                    field.onChange(value ? Number(value) : undefined)
                  }
                  options={tagOptions}
                  placeholder="Tag List"
                  searchable
                  clearable
                  error={errors.empToDOListTagIds?.message}
                />
              )}
            />

            <div>
              <Label
                htmlFor="parentTodoListId"
                className="text-[12px] font-medium"
              >
                Parent Tag <span className="text-destructive">*</span>
              </Label>
              <Input
                id="parentTodoListId"
                className="mt-1.5"
                placeholder="Parent Tag"
                {...register("parentTodoListId")}
              />
              {errors.parentTodoListId && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.parentTodoListId.message}
                </p>
              )}
            </div>
            <div className="hidden sm:block" aria-hidden />

            <div>
              <Label htmlFor="notes" className="text-[12px] font-medium">
                Notes <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="notes"
                className="mt-1.5"
                placeholder="Notes"
                rows={3}
                {...register("notes")}
              />
              {errors.notes && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.notes.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="title" className="text-[12px] font-medium">
                Title <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="title"
                className="mt-1.5"
                placeholder="Title"
                rows={3}
                {...register("title")}
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.title.message}
                </p>
              )}
            </div>

            <Controller
              name="todoDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="Start Date"
                  required
                  value={parseYmd(field.value)}
                  onChange={(d) => field.onChange(d ? asDateInputValue(d) : "")}
                  placeholder="Start Date"
                  displayFormat="dd/MM/yyyy"
                  error={errors.todoDate?.message}
                />
              )}
            />
            <div>
              <Label htmlFor="url" className="text-[12px] font-medium">
                Url
              </Label>
              <Input
                id="url"
                className="mt-1.5"
                placeholder="Url"
                {...register("url")}
              />
            </div>

            <Controller
              name="displayTime"
              control={control}
              render={({ field }) => (
                <Select
                  label="Time Picker"
                  value={field.value ?? "09:00"}
                  onChange={(value) => field.onChange(value ?? "09:00")}
                  options={TIME_OPTIONS}
                  searchable={false}
                  clearable={false}
                />
              )}
            />
            <div className="flex min-h-[60px] items-end pb-2">
              <label
                className="flex items-center gap-2 text-sm"
                htmlFor="isActive"
              >
                <input
                  id="isActive"
                  type="checkbox"
                  checked={watch("isActive")}
                  onChange={(e) => setValue("isActive", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Active
              </label>
            </div>
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
