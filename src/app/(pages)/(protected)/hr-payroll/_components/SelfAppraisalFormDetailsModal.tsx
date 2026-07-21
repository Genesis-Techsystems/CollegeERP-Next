"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Trash2Icon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ActiveStatusField } from "@/common/components/forms";
import { FormModal } from "@/common/components/feedback";
import { StatusBadge } from "@/common/components/data-display";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  prepareSelfAppraisalFormDetailsPayload,
  saveSelfAppraisalFormDetails,
} from "@/services";
import { toastError, toastSuccess } from "@/lib/toast";

const detailSchema = z.object({
  title: z.string().min(1, "Title is required"),
  serialNumber: z.string().optional(),
  subSerialNumber: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type DetailFormValues = z.infer<typeof detailSchema>;

type FormRow = Record<string, unknown>;
type DetailRow = Record<string, unknown>;

function formatDisplayDate(value: unknown): string {
  if (value == null || value === "") return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "dd MMM, yyyy");
}

function appraisalDetails(row: FormRow): DetailRow[] {
  const candidates = [
    row.empSelfappraisalFormDetailDTOS,
    row.empSelfAppraisalFormDetailDTOS,
    row.empSelfappraisalFormDetailsDTOs,
  ];
  const match = candidates.find(Array.isArray);
  return Array.isArray(match) ? (match as DetailRow[]) : [];
}

interface SelfAppraisalFormDetailsModalProps {
  open: boolean;
  onClose: () => void;
  formRow: FormRow | null;
  collegeId: number;
  onSaved: () => void;
}

export function SelfAppraisalFormDetailsModal({
  open,
  onClose,
  formRow,
  collegeId,
  onSaved,
}: Readonly<SelfAppraisalFormDetailsModalProps>) {
  const [details, setDetails] = useState<DetailRow[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<DetailFormValues>({
    resolver: zodResolver(detailSchema),
    defaultValues: {
      title: "",
      serialNumber: "",
      subSerialNumber: "",
      isActive: true,
      reason: "active",
    },
  });

  useEffect(() => {
    if (!open || !formRow) return;
    setDetails(appraisalDetails(formRow));
    reset({
      title: String(formRow.title ?? ""),
      serialNumber: "",
      subSerialNumber: "",
      isActive: true,
      reason: "active",
    });
  }, [open, formRow, reset]);

  const summary = useMemo(() => {
    if (!formRow) return null;
    return {
      collegeCode: String(formRow.collegeCode ?? ""),
      title: String(formRow.title ?? ""),
      startDate: formatDisplayDate(formRow.startDate),
      endDate: formatDisplayDate(formRow.endDate),
    };
  }, [formRow]);

  function addDetailLine(data: DetailFormValues) {
    setDetails((prev) => [
      ...prev,
      {
        title: data.title.trim(),
        serialNumber: data.serialNumber?.trim() || undefined,
        subSerialNumber: data.subSerialNumber?.trim() || undefined,
        isActive: data.isActive,
      },
    ]);
    reset({
      title: String(formRow?.title ?? ""),
      serialNumber: "",
      subSerialNumber: "",
      isActive: true,
      reason: "active",
    });
  }

  function removeDetailLine(visibleIndex: number) {
    setDetails((prev) => {
      const visible = prev.filter((d) => d.isActive !== false);
      const item = visible[visibleIndex];
      if (!item) return prev;
      return prev.map((d) => (d === item ? { ...d, isActive: false } : d));
    });
  }

  const visibleDetails = useMemo(
    () => details.filter((d) => d.isActive !== false),
    [details],
  );

  async function saveAll() {
    if (!formRow || details.length === 0) {
      onClose();
      return;
    }
    const payloadRow = {
      ...formRow,
      collegeId: Number(formRow.collegeId ?? collegeId),
    };
    const payload = prepareSelfAppraisalFormDetailsPayload(payloadRow, details);
    // Angular closes the dialog first; the parent then performs the POST.
    onClose();
    try {
      await saveSelfAppraisalFormDetails(payload);
      toastSuccess("Form details saved");
      onSaved();
    } catch (err) {
      toastError(err, "Failed to save form details");
    }
  }

  if (!formRow) return null;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Edit Appraisal Form Details"
      titleClassName="text-[15px] font-semibold leading-none text-primary"
      onSubmit={(e) => {
        e.preventDefault();
        void saveAll();
      }}
      submitLabel="Save"
      isSubmitting={isSubmitting}
      size="xl"
    >
      <div className="flex flex-col gap-3 text-[12px]">
        {summary ? (
          <div className="rounded border border-border/60 bg-muted/30 px-3 py-2 space-y-1">
            <p>
              <span className="text-muted-foreground">College: </span>
              <span className="font-medium text-[hsl(var(--primary))]">
                {summary.collegeCode}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Appraisal Title: </span>
              <span>{summary.title}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Start Date: </span>
              <span>{summary.startDate}</span>
            </p>
            <p>
              <span className="text-muted-foreground">End Date: </span>
              <span>{summary.endDate}</span>
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 items-end">
          <div className="sm:col-span-3 space-y-1">
            <Label className="text-[12px]">Serial Number</Label>
            <Input
              placeholder="Enter serial number"
              className="h-9 text-[12px]"
              {...register("serialNumber")}
            />
          </div>
          <div className="sm:col-span-3 space-y-1">
            <Label className="text-[12px]">Sub Serial Number</Label>
            <Input
              placeholder="Enter sub serial number"
              className="h-9 text-[12px]"
              {...register("subSerialNumber")}
            />
          </div>
          <div className="sm:col-span-4 space-y-1">
            <Label className="text-[12px]">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="Enter appraisal detail title"
              className="h-9 text-[12px]"
              {...register("title")}
            />
            {errors.title ? (
              <p className="text-[11px] text-destructive">
                {errors.title.message}
              </p>
            ) : null}
          </div>
          <div className="sm:col-span-2 flex flex-col gap-2">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <ActiveStatusField
                  isActive={field.value}
                  reason={watch("reason") ?? ""}
                  onActiveChange={(v) => field.onChange(v === true)}
                  onReasonChange={(v) => setValue("reason", v)}
                />
              )}
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="sm:col-span-12 w-fit"
            onClick={() => void handleSubmit(addDetailLine)()}
          >
            Add
          </Button>
        </div>

        {visibleDetails.length > 0 ? (
          <div className="max-h-[215px] overflow-auto scrollbar-hidden rounded border">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-muted/80">
                <tr className="border-b text-left">
                  <th className="px-2 py-1.5 font-medium">Title</th>
                  <th className="px-2 py-1.5 font-medium">Serial Number</th>
                  <th className="px-2 py-1.5 font-medium">Sub Serial Number</th>
                  <th className="px-2 py-1.5 font-medium">Status</th>
                  <th className="px-2 py-1.5 font-medium w-16">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleDetails.map((row, index) => (
                  <tr
                    key={`${String(row.title)}-${index}`}
                    className="border-b last:border-0"
                  >
                    <td className="px-2 py-1.5">{String(row.title ?? "")}</td>
                    <td className="px-2 py-1.5">
                      {String(row.serialNumber ?? "")}
                    </td>
                    <td className="px-2 py-1.5">
                      {String(row.subSerialNumber ?? "")}
                    </td>
                    <td className="px-2 py-1.5">
                      <StatusBadge status={row.isActive !== false} />
                    </td>
                    <td className="px-2 py-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeDetailLine(index)}
                      >
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </FormModal>
  );
}
