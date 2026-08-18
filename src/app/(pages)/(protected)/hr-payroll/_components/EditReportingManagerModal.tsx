"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { FormModal } from "@/common/components/feedback";
import { DatePicker } from "@/common/components/date-picker";
import { Select, type SelectOption } from "@/common/components/select";
import {
  assignEmployeeReportingManager,
  listActiveDesignationsForHr,
} from "@/services";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";

const schema = z.object({
  empDesignationId: z.number().min(1, "Designation is required"),
  fromDate: z.date({ message: "From date is required" }),
  toDate: z.date({ message: "To date is required" }),
});

type FormValues = z.infer<typeof schema>;

type ReportRow = Record<string, unknown>;

function parseDate(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const d = new Date(String(value ?? ""));
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function txt(row: ReportRow | null, keys: string[]): string {
  if (!row) return "—";
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "—";
}

interface EditReportingManagerModalProps {
  open: boolean;
  onClose: () => void;
  row: ReportRow | null;
  onSaved: () => void;
}

export function EditReportingManagerModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<EditReportingManagerModalProps>) {
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      empDesignationId: undefined,
      fromDate: new Date(),
      toDate: new Date(),
    },
  });

  const fromDate = watch("fromDate");
  const [designationOptions, setDesignationOptions] = useState<SelectOption[]>(
    [],
  );

  useEffect(() => {
    if (!open) return;
    void listActiveDesignationsForHr().then((rows) => {
      setDesignationOptions(
        rows.map((d) => ({
          value: String(d.designationId),
          label: String(d.designationName ?? d.designationId),
        })),
      );
    });
    if (!row) return;
    reset({
      empDesignationId: Number(row.empDesignationId ?? 0) || undefined,
      fromDate: parseDate(row.fromDate),
      toDate: parseDate(row.toDate),
    });
  }, [open, row, reset]);

  useEffect(() => {
    if (fromDate && watch("toDate") && fromDate > watch("toDate")) {
      toastInfo("From date should be less then To date.");
      setValue("toDate", fromDate);
    }
  }, [fromDate, setValue, watch]);

  async function onSubmit(data: FormValues) {
    if (!row) return;
    const payload = {
      ...row,
      empDesignationId: data.empDesignationId,
      // Angular parent: momentWithTime(details.fromDate / toDate)
      fromDate: format(data.fromDate, "yyyy-MM-dd'T'00:00:00"),
      toDate: format(data.toDate, "yyyy-MM-dd'T'00:00:00"),
      isActive: row.isActive !== false,
      reason: String(
        row.reason ?? (row.isActive !== false ? "active" : "inactive"),
      ),
    };
    try {
      await assignEmployeeReportingManager(payload);
      toastSuccess("Reporting manager updated");
      onSaved();
      onClose();
    } catch (err) {
      toastError(err, "Failed to update reporting manager");
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Edit Reporting Manager Details"
      titleClassName="text-[15px] font-semibold leading-none text-primary"
      showHeaderDivider
      size="xl"
      cancelLabel="Close"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
      isSubmitting={isSubmitting}
      submitLabel="Save"
    >
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 rounded-sm border border-[#89c5ff] bg-[#fbfbfb] px-3 py-3">
        <div className="space-y-1 text-[15px] font-medium text-[#616161]">
          <p className="text-[15px] font-medium tracking-tight text-[#9e9e9e]">
            Employee Details
          </p>
          <p>
            Employee :{" "}
            <span className="font-medium text-blue-600">
              {txt(row, ["empName", "employeeName", "firstName"])}
            </span>
          </p>
          <p>
            Employee No :{" "}
            <span className="font-medium text-blue-600">
              {txt(row, ["empNumber"])}
            </span>
          </p>
          <p>
            Designation :{" "}
            <span className="font-medium text-blue-600">
              {txt(row, ["desEmpName", "designationName"])}
            </span>
          </p>
        </div>
        <div className="space-y-1 text-[15px] font-medium text-[#616161]">
          <p className="text-[15px] font-medium tracking-tight text-[#9e9e9e]">
            Reporting Manager Details
          </p>
          <p>
            Employee :{" "}
            <span className="font-medium text-blue-600">
              {txt(row, ["managerEmpName"])}
            </span>
          </p>
          <p>
            Employee No :{" "}
            <span className="font-medium text-blue-600">
              {txt(row, ["managerEmpNumber"])}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <Controller
            name="empDesignationId"
            control={control}
            render={({ field }) => (
              <Select
                label="Employee Designation"
                required
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                options={designationOptions}
                placeholder="Select designation"
                searchable
                error={errors.empDesignationId?.message}
              />
            )}
          />
        </div>
        <Controller
          name="fromDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="From Date"
              required
              value={field.value}
              onChange={(date) => date && field.onChange(date)}
              displayFormat="dd/MM/yyyy"
              error={errors.fromDate?.message}
            />
          )}
        />
        <Controller
          name="toDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="To Date"
              required
              value={field.value}
              onChange={(date) => date && field.onChange(date)}
              minDate={fromDate ?? undefined}
              displayFormat="dd/MM/yyyy"
              error={errors.toDate?.message}
            />
          )}
        />
      </div>
    </FormModal>
  );
}
