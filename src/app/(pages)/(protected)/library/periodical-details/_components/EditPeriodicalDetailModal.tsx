"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { ActiveStatusField } from "@/common/components/forms";
import { FormModal } from "@/common/components/feedback";
import { DatePicker } from "@/common/components/date-picker";
import { Select, type SelectOption } from "@/common/components/select";
import { utcMidnightIso } from "@/common/generic-functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  listLibraryRacksByLibrary,
  updatePeriodicalDetail,
  type LibraryRow,
} from "@/services";
import {
  LIBRARY_FIELD_LABEL_CLASS,
  LIBRARY_INPUT_CLASS,
  LIBRARY_MODAL_TITLE_CLASS,
} from "../../_lib/modal-styles";

const schema = z.object({
  volume: z.string().trim().min(1, "Volume is required"),
  srNo: z.string(),
  noOfPages: z.string(),
  issue: z.string(),
  shelveId: z
    .string()
    .nullable()
    .refine((v) => Boolean(v && String(v).trim()), "Rack is required"),
  receivedDate: z.date().nullable(),
  receivedBy: z.string(),
  comments: z.string(),
  isActive: z.boolean(),
  reason: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface EditPeriodicalDetailModalProps {
  open: boolean;
  onClose: () => void;
  row: LibraryRow | null;
  onSaved: () => void;
}

export function EditPeriodicalDetailModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<EditPeriodicalDetailModalProps>) {
  const libraryId = Number(row?.libraryId ?? 0);
  const periodicalDetId = Number(row?.periodicalDetId ?? 0);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      volume: "",
      srNo: "",
      noOfPages: "",
      issue: "",
      shelveId: null,
      receivedDate: null,
      receivedBy: "",
      comments: "",
      isActive: true,
      reason: "active",
    },
  });

  const { data: racks = [], isLoading: loadingRacks } = useQuery({
    queryKey: ["Library", "racks", libraryId, "edit-periodical-detail"],
    queryFn: () => listLibraryRacksByLibrary(libraryId),
    enabled: open && libraryId > 0,
  });

  const rackOptions = useMemo<SelectOption[]>(
    () =>
      racks.map((rack) => ({
        value: String(rack.shelveId ?? ""),
        label: rack.shelveCode ?? String(rack.shelveId ?? ""),
      })),
    [racks],
  );

  useEffect(() => {
    if (!open || !row) return;
    const receivedRaw = row.receivedDate;
    const receivedDate =
      receivedRaw != null && String(receivedRaw).trim()
        ? new Date(String(receivedRaw))
        : null;
    reset({
      volume: row.volume != null ? String(row.volume) : "",
      srNo: row.srNo != null ? String(row.srNo) : "",
      noOfPages: row.noOfPages != null ? String(row.noOfPages) : "",
      issue: row.issue != null ? String(row.issue) : "",
      shelveId: row.shelveId != null ? String(row.shelveId) : null,
      receivedDate:
        receivedDate && !Number.isNaN(receivedDate.getTime())
          ? receivedDate
          : null,
      receivedBy: row.receivedBy != null ? String(row.receivedBy) : "",
      comments: row.comments != null ? String(row.comments) : "",
      isActive: row.isActive !== false,
      reason: String(row.reason ?? (row.isActive === false ? "" : "active")),
    });
  }, [open, row, reset]);

  async function onSubmit(values: FormValues) {
    if (!periodicalDetId) return;
    const payload = {
      volume: values.volume,
      srNo: values.srNo,
      noOfPages: values.noOfPages,
      issue: values.issue,
      shelveId: values.shelveId ? Number(values.shelveId) : "",
      receivedDate: values.receivedDate
        ? utcMidnightIso(values.receivedDate)
        : "",
      receivedBy: values.receivedBy,
      comments: values.comments,
      isActive: values.isActive,
      reason: values.reason,
      periodicalDetId,
      organizationId: row?.organizationId,
      periodicalId: row?.periodicalId,
      libraryId: row?.libraryId,
    };
    try {
      await updatePeriodicalDetail(periodicalDetId, payload);
      toastSuccess("Periodical details updated");
      onSaved();
      onClose();
    } catch (error) {
      toastError(error, "Failed to update periodical details");
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Edit Periodical Details"
      titleClassName={LIBRARY_MODAL_TITLE_CLASS}
      showHeaderDivider
      size="xl"
      cancelLabel="Close"
      submitLabel="Save"
      isSubmitting={isSubmitting}
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>
            Volume <span className="text-destructive">*</span>
          </Label>
          <Input
            className={LIBRARY_INPUT_CLASS}
            placeholder="Volume"
            {...register("volume")}
          />
          {errors.volume && (
            <p className="text-xs text-destructive">{errors.volume.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>Serial No</Label>
          <Input
            className={LIBRARY_INPUT_CLASS}
            placeholder="Serial No"
            {...register("srNo")}
          />
        </div>
        <div className="space-y-1">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>No Of Pages</Label>
          <Input
            className={LIBRARY_INPUT_CLASS}
            placeholder="No Of Pages"
            {...register("noOfPages")}
          />
        </div>
        <div className="space-y-1">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>Issue</Label>
          <Input
            className={LIBRARY_INPUT_CLASS}
            placeholder="Issue"
            {...register("issue")}
          />
        </div>
        <Select
          label="Rack"
          required
          value={watch("shelveId")}
          onChange={(value) =>
            setValue("shelveId", value, { shouldValidate: true })
          }
          options={rackOptions}
          placeholder="Rack"
          isLoading={loadingRacks}
          error={errors.shelveId?.message}
        />
        <Controller
          name="receivedDate"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Received Date"
              value={field.value}
              onChange={field.onChange}
              placeholder="Received Date"
            />
          )}
        />
        <div className="space-y-1">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>Received By</Label>
          <Input
            className={LIBRARY_INPUT_CLASS}
            placeholder="Received By"
            {...register("receivedBy")}
          />
        </div>
        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>Comments</Label>
          <Textarea
            className="min-h-[72px] text-[12px]"
            placeholder="Comments"
            {...register("comments")}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch("reason")}
                onActiveChange={(checked) => {
                  const active = checked === true;
                  field.onChange(active);
                  if (active) setValue("reason", "active");
                  else setValue("reason", "");
                }}
                onReasonChange={(value) => setValue("reason", value)}
              />
            )}
          />
        </div>
      </div>
    </FormModal>
  );
}
