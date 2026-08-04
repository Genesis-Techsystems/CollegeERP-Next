"use client";

/**
 * Angular `college-suggestion-modal` — reply/edit on acknowledged suggestions.
 */

import { useEffect, type ReactNode } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { FormModal } from "@/common/components/feedback";
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
  acknowledgementComments: z.string().optional(),
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
  onClose: () => void;
  isSubmitting?: boolean;
  /** Angular only applies `acknowledgementComments` from the modal result. */
  onSubmit: (acknowledgementComments: string) => Promise<void>;
};

export function CollegeSuggestionReplyModal({
  open,
  row,
  onClose,
  isSubmitting = false,
  onSubmit,
}: Readonly<Props>) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      suggestionDescription: "",
      suggestionSubject: "",
      acknowledgementComments: "",
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
    if (!open || !row) return;
    reset({
      suggestionforCatId: Number(row.suggestionforCatId ?? 0),
      suggestionSubject: String(row.suggestionSubject ?? ""),
      suggestiontypeCatId: Number(row.suggestiontypeCatId ?? 0),
      suggestionDescription: String(row.suggestionDescription ?? ""),
      acknowledgementComments: String(row.acknowledgementComments ?? ""),
    });
  }, [open, row, reset]);

  async function submitForm(values: FormValues) {
    await onSubmit(values.acknowledgementComments ?? "");
  }

  const suggestionDate = row?.createdDt
    ? new Date(String(row.createdDt))
    : new Date();
  const suggestedBy = [row?.userName, row?.userNumber]
    .filter((v) => v != null && String(v).trim() !== "")
    .map(String)
    .join(" · ");

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Suggestion Replay"
      size="lg"
      onSubmit={() => {
        void handleSubmit(submitForm)();
      }}
      isSubmitting={isSubmitting}
      submitLabel="Save"
      cancelLabel="Close"
      formClassName="space-y-2 py-0"
    >
      <div className="space-y-2">
        <div className="grid grid-cols-[minmax(0,1fr)_4fr] gap-2 border-b pb-2 text-sm">
          <span className="text-muted-foreground">Suggested By :</span>
          <span>
            {suggestedBy
              ? `${String(row?.userName ?? "")}${
                  row?.userNumber ? ` (${row.userNumber})` : ""
                }`
              : "—"}
          </span>
        </div>

        <div className="grid gap-x-3 gap-y-2 sm:grid-cols-[1fr_3fr]">
          <div className="space-y-1">
            <Label>Date of Suggestion</Label>
            <DatePicker value={suggestionDate} onChange={() => {}} disabled />
            <StableFieldError />
          </div>
          <div className="space-y-1">
            <RequiredLabel htmlFor="reply-suggestionSubject">
              Suggestion Subject
            </RequiredLabel>
            <Input
              id="reply-suggestionSubject"
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
          <Label htmlFor="reply-suggestionDescription">
            Description of the Suggestion
          </Label>
          <Textarea
            id="reply-suggestionDescription"
            placeholder="Description of the Problem"
            rows={3}
            className="min-h-[4.5rem] resize-y"
            {...register("suggestionDescription")}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="reply-acknowledgementComments">
            Acknowledgement Comments
          </Label>
          <Textarea
            id="reply-acknowledgementComments"
            placeholder="Acknowledgement Comments"
            rows={3}
            className="min-h-[4.5rem] resize-y"
            {...register("acknowledgementComments")}
          />
        </div>
      </div>
    </FormModal>
  );
}
