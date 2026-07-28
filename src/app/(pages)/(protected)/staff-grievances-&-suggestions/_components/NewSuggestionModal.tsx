"use client";

import { useEffect, type ReactNode } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FormModal } from "@/common/components/feedback";
import { ActiveStatusField } from "@/common/components/forms";
import { DatePicker } from "@/common/components/date-picker";
import { Select } from "@/common/components/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GM_CODES } from "@/config/constants";
import { QK } from "@/lib/query-keys";
import { listGeneralDetailsByCode } from "@/services";

type AnyRow = Record<string, unknown>;

const schema = z.object({
  suggestionforCatId: z.coerce.number().min(1, "Suggestion For is required"),
  suggestionSubject: z.string().trim().min(1, "Suggestion Subject is required"),
  suggestiontypeCatId: z.coerce.number().min(1, "Suggestion Type is required"),
  suggestionDescription: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function pickId(row: AnyRow): number {
  const n = Number(row.generalDetailId ?? row.generalDetailid ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function pickLabel(row: AnyRow, preferCode = false): string {
  if (preferCode) {
    return String(row.generalDetailCode ?? row.generalDetailcode ?? "").trim();
  }
  return String(
    row.generalDetailDisplayName ??
      row.generalDetaildisplayName ??
      row.generalDetailCode ??
      "",
  ).trim();
}

/** Reserved error line so validation messages do not shift fields. */
function StableFieldError({ message }: { message?: string }) {
  return (
    <p className="min-h-4 text-[11px] leading-4 text-destructive" role="alert">
      {message ?? "\u00a0"}
    </p>
  );
}

function RequiredLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <Label htmlFor={htmlFor}>
      {children}
      <span className="text-destructive ml-0.5">*</span>
    </Label>
  );
}

type Props = {
  open: boolean;
  row: AnyRow | null;
  userId: number;
  onClose: () => void;
  isSubmitting?: boolean;
  onSubmit: (payload: AnyRow) => Promise<void>;
};

export function NewSuggestionModal({
  open,
  row,
  userId,
  onClose,
  isSubmitting = false,
  onSubmit,
}: Readonly<Props>) {
  const isEditing = row != null;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      isActive: true,
      reason: "active",
      suggestionDescription: "",
      suggestionSubject: "",
    },
  });

  const { data: suggestionsFor = [] } = useQuery({
    queryKey: [...QK.staffSuggestions.lookup(), "for"],
    queryFn: () => listGeneralDetailsByCode(GM_CODES.SUGGESTION_FOR),
    enabled: open,
  });

  const { data: suggestionsTypes = [] } = useQuery({
    queryKey: [...QK.staffSuggestions.lookup(), "type"],
    queryFn: () => listGeneralDetailsByCode(GM_CODES.SUGGESTION_TYPE),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    if (row) {
      reset({
        suggestionforCatId: Number(row.suggestionforCatId ?? 0),
        suggestionSubject: String(row.suggestionSubject ?? ""),
        suggestiontypeCatId: Number(row.suggestiontypeCatId ?? 0),
        suggestionDescription: String(row.suggestionDescription ?? ""),
        isActive: row.isActive !== false,
        reason: String(row.reason ?? "active"),
      });
    } else {
      reset({
        suggestionforCatId: 0,
        suggestionSubject: "",
        suggestiontypeCatId: 0,
        suggestionDescription: "",
        isActive: true,
        reason: "active",
      });
    }
  }, [open, row, reset]);

  async function submitForm(values: FormValues) {
    const payload: AnyRow = {
      ...values,
      ackDate: new Date().toISOString(),
      isAcknowledged: row?.isAcknowledged ?? false,
      userId,
    };
    if (isEditing) {
      payload.suggestionId = row?.suggestionId;
    }
    await onSubmit(payload);
  }

  const ackDate = row?.ackDate ? new Date(String(row.ackDate)) : new Date();

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Suggestion" : "Add Suggestion"}
      size="lg"
      onSubmit={() => {
        void handleSubmit(submitForm)();
      }}
      isSubmitting={isSubmitting}
      submitLabel="Save"
      cancelLabel="Cancel"
      formClassName="space-y-2 py-0"
    >
      <div className="space-y-2">
        <div className="grid gap-x-3 gap-y-2 sm:grid-cols-[1fr_3fr]">
          <div className="space-y-1">
            <Label>Date of Acknowledgement</Label>
            <DatePicker value={ackDate} onChange={() => {}} disabled />
            <StableFieldError />
          </div>
          <div className="space-y-1">
            <RequiredLabel htmlFor="suggestionSubject">
              Suggestion Subject
            </RequiredLabel>
            <Input
              id="suggestionSubject"
              placeholder="Suggestion Subject"
              aria-invalid={Boolean(errors.suggestionSubject)}
              {...register("suggestionSubject")}
            />
            <StableFieldError message={errors.suggestionSubject?.message} />
          </div>
        </div>

        <div className="grid gap-x-3 gap-y-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Controller
              name="suggestionforCatId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Suggestion For"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(Number(v ?? 0))}
                  options={suggestionsFor.map((r) => ({
                    value: String(pickId(r)),
                    label: pickLabel(r),
                  }))}
                  placeholder="Select suggestion for"
                  searchable={false}
                />
              )}
            />
            <StableFieldError message={errors.suggestionforCatId?.message} />
          </div>

          <div className="space-y-1">
            <Controller
              name="suggestiontypeCatId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Suggestion Type"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(Number(v ?? 0))}
                  options={suggestionsTypes.map((r) => ({
                    value: String(pickId(r)),
                    label: pickLabel(r, true),
                  }))}
                  placeholder="Select suggestion type"
                  searchable={false}
                />
              )}
            />
            <StableFieldError message={errors.suggestiontypeCatId?.message} />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="suggestionDescription">
            Description of the Suggestion
          </Label>
          <Textarea
            id="suggestionDescription"
            placeholder="Description of the Problem"
            rows={3}
            className="min-h-[4.5rem] resize-y"
            {...register("suggestionDescription")}
          />
        </div>

        <div className="-mt-0.5">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch("reason") ?? ""}
                onActiveChange={(v) => {
                  const active = v === true;
                  field.onChange(active);
                  if (active) setValue("reason", "active");
                }}
                onReasonChange={(v) => setValue("reason", v)}
              />
            )}
          />
        </div>
      </div>
    </FormModal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_3fr] gap-2 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span>{value || "—"}</span>
    </div>
  );
}

type DetailsProps = {
  open: boolean;
  row: AnyRow | null;
  onClose: () => void;
};

export function SuggestionDetailsModal({
  open,
  row,
  onClose,
}: Readonly<DetailsProps>) {
  function formatDate(value: unknown): string {
    if (value == null || value === "") return "—";
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) return String(value);
    return format(d, "MMM d, yyyy");
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Suggestion Details"
      size="lg"
      onSubmit={onClose}
      submitLabel="Close"
      showCancelButton={false}
    >
      <div className="rounded-md border px-3">
        <DetailRow label="Suggestion Date" value={formatDate(row?.createdDt)} />
        <DetailRow
          label="Suggestion"
          value={String(row?.suggestionSubject ?? "")}
        />
        <DetailRow
          label="Suggestion For"
          value={String(row?.suggestionforCatDisplayName ?? "")}
        />
        <DetailRow
          label="Suggestion Type"
          value={String(row?.suggestiontypeCatDisplayName ?? "")}
        />
        <DetailRow
          label="Suggestion Description"
          value={String(row?.suggestionDescription ?? "")}
        />
        <DetailRow
          label="Acknowledgement Comments"
          value={String(row?.acknowledgementComments ?? "")}
        />
      </div>
    </FormModal>
  );
}
