"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Trash2Icon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormModal } from "@/common/components/feedback";
import { FormField } from "@/common/components/forms";
import { StatusBadge } from "@/common/components/data-display";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
    control,
    formState: { errors, isSubmitting },
  } = useForm<DetailFormValues>({
    resolver: zodResolver(detailSchema),
    defaultValues: {
      title: "",
      serialNumber: "",
      subSerialNumber: "",
      isActive: true,
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
      showHeaderDivider
      size="xl"
      cancelLabel="Close"
      submitLabel="Save"
      isSubmitting={isSubmitting}
      onSubmit={(e) => {
        e.preventDefault();
        void saveAll();
      }}
    >
      <div className="flex flex-col gap-4 text-[12px]">
        {summary ? (
          <div className="rounded-sm border-2 border-[#89c5ff] bg-[#fbfbfb] px-3 py-2.5 text-[15px] font-medium text-black">
            <div className="grid grid-cols-[145px_1fr] gap-y-2">
              <span>College</span>
              <span>
                : <span className="text-blue-600">{summary.collegeCode}</span>
              </span>

              <span>Appraisal Title</span>
              <span>
                : <span className="text-blue-600">{summary.title}</span>
              </span>

              <span>Start Date</span>
              <span>
                : <span className="text-blue-600">{summary.startDate}</span>
              </span>

              <span>End Date</span>
              <span>
                : <span className="text-blue-600">{summary.endDate}</span>
              </span>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Serial Number">
            <Input
              placeholder="Enter serial number"
              className="h-9"
              {...register("serialNumber")}
            />
          </FormField>
          <FormField label="Sub Serial Number">
            <Input
              placeholder="Enter sub serial number"
              className="h-9"
              {...register("subSerialNumber")}
            />
          </FormField>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <FormField
            label="Title"
            required
            className="min-w-0 flex-1"
            error={errors.title?.message}
          >
            <Input
              placeholder="Enter appraisal detail title"
              className="h-9"
              {...register("title")}
            />
          </FormField>
          <div className="flex h-9 shrink-0 items-center gap-4">
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="appraisal-detail-active"
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(v === true)}
                  />
                  <Label
                    htmlFor="appraisal-detail-active"
                    className="cursor-pointer text-[12px] font-medium text-black/54"
                  >
                    Active
                  </Label>
                </div>
              )}
            />
            <Button
              type="button"
              size="sm"
              className="h-9 min-w-[5.5rem] bg-[#042956] text-white hover:bg-[#031f42]"
              onClick={() => void handleSubmit(addDetailLine)()}
            >
              Add
            </Button>
          </div>
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
