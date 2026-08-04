"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { DatePicker } from "@/common/components/date-picker";
import { FormModal } from "@/common/components/feedback";
import { Select, MultiSelect } from "@/common/components/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listBanks, listNullPreceedings } from "@/services";

const schema = z
  .object({
    collegeId: z.coerce.number().min(1),
    schPreceedingList: z.array(z.string()).min(1, "Preceedings is required"),
    bankId: z.coerce.number().min(1, "Bank is required"),
    title: z.string().min(1, "Cheque Title is required"),
    chequeNo: z.string().min(1, "Cheque No is required"),
    chequeDate: z.date().nullable().optional(),
    comments: z.string().optional(),
    isHandOvertoAcc: z.boolean(),
    isActive: z.boolean(),
    reason: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.isActive && !values.reason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "Reason is required when inactive",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

export type AccountPreceedingModalResult = {
  collegeId: number;
  bankId: number;
  title: string;
  chequeNo: string;
  chequeDate?: string | null;
  comments?: string;
  isHandOvertoAcc: boolean;
  isActive: boolean;
  reason?: string;
  schPreceedingList: number[];
  schPreceedingIds: string;
};

function toDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIso(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString();
}

interface AccountPreceedingModalProps {
  open: boolean;
  onClose: () => void;
  collegeId: number;
  collegeCode?: string;
  onSubmit: (payload: AccountPreceedingModalResult) => Promise<void>;
}

export function AccountPreceedingModal({
  open,
  onClose,
  collegeId,
  collegeCode,
  onSubmit,
}: Readonly<AccountPreceedingModalProps>) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      collegeId,
      schPreceedingList: [],
      bankId: 0,
      title: "",
      chequeNo: "",
      chequeDate: new Date(),
      comments: "",
      isHandOvertoAcc: false,
      isActive: true,
      reason: "",
    },
  });

  const isActive = useWatch({ control, name: "isActive" });

  const { data: banks = [], isLoading: loadingBanks } = useQuery({
    queryKey: ["Bank", "list", "account-preceeding-modal"],
    queryFn: listBanks,
    enabled: open,
  });

  const { data: preceedings = [], isLoading: loadingPreceedings } = useQuery({
    queryKey: ["SchPreceeding", "null", collegeId],
    queryFn: () => listNullPreceedings(collegeId),
    enabled: open && collegeId > 0,
  });

  const bankOptions = useMemo(
    () =>
      banks
        .filter((b) => !collegeId || Number(b.collegeId) === collegeId)
        .filter((b) => b.isActive !== false)
        .map((b) => ({
          value: String(b.bankId),
          label: b.bankName || b.bankCode || String(b.bankId),
        })),
    [banks, collegeId],
  );

  const preceedingOptions = useMemo(
    () =>
      preceedings
        .map((p) => ({
          value: String(p.schPreceedingId),
          label:
            p.preceedingTitle || p.preceedingNo || String(p.schPreceedingId),
        }))
        .filter((o) => o.value !== "0" && o.value !== "undefined"),
    [preceedings],
  );

  useEffect(() => {
    if (!open) return;
    reset({
      collegeId,
      schPreceedingList: [],
      bankId: 0,
      title: "",
      chequeNo: "",
      chequeDate: new Date(),
      comments: "",
      isHandOvertoAcc: false,
      isActive: true,
      reason: "",
    });
  }, [open, collegeId, reset]);

  const submitForm = async (values: FormValues) => {
    const ids = values.schPreceedingList
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0);
    await onSubmit({
      collegeId: values.collegeId,
      bankId: values.bankId,
      title: values.title.trim(),
      chequeNo: values.chequeNo.trim(),
      chequeDate: toIso(values.chequeDate ?? toDate(new Date())),
      comments: values.comments?.trim() || undefined,
      isHandOvertoAcc: values.isHandOvertoAcc,
      isActive: values.isActive,
      reason: values.isActive ? undefined : values.reason?.trim() || undefined,
      schPreceedingList: ids,
      schPreceedingIds: ids.join(","),
    });
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Account Preceedings"
      description={collegeCode ? `College : ${collegeCode}` : undefined}
      size="lg"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(submitForm)();
      }}
      isSubmitting={isSubmitting}
      submitLabel="Save"
      cancelLabel="Close"
    >
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1.5 sm:col-span-3">
          <Controller
            name="schPreceedingList"
            control={control}
            render={({ field }) => (
              <MultiSelect
                label="Preceedings"
                required
                value={field.value}
                onChange={field.onChange}
                options={preceedingOptions}
                placeholder="Select preceedings"
                isLoading={loadingPreceedings}
                searchable
                error={errors.schPreceedingList?.message}
              />
            )}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-1">
          <Controller
            name="bankId"
            control={control}
            render={({ field }) => (
              <Select
                label="Bank"
                required
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : 0)}
                options={bankOptions}
                placeholder="Select bank"
                isLoading={loadingBanks}
                searchable
                error={errors.bankId?.message}
              />
            )}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="chequeTitle">
            Cheque Title <span className="text-destructive">*</span>
          </Label>
          <Input id="chequeTitle" {...register("title")} />
          {errors.title ? (
            <p className="text-xs text-destructive">{errors.title.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5 sm:col-span-1">
          <Label htmlFor="chequeNo">
            Cheque No <span className="text-destructive">*</span>
          </Label>
          <Input id="chequeNo" {...register("chequeNo")} />
          {errors.chequeNo ? (
            <p className="text-xs text-destructive">
              {errors.chequeNo.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5 sm:col-span-1">
          <Label>Cheque Date</Label>
          <Controller
            name="chequeDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                value={field.value ?? null}
                onChange={(d) => field.onChange(d ?? null)}
              />
            )}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-4">
          <Label htmlFor="comments">Comments</Label>
          <Input id="comments" {...register("comments")} />
        </div>

        <div className="flex items-center gap-2 pt-1 sm:col-span-1">
          <Controller
            name="isHandOvertoAcc"
            control={control}
            render={({ field }) => (
              <>
                <Checkbox
                  id="isHandOvertoAcc"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
                <Label htmlFor="isHandOvertoAcc" className="cursor-pointer">
                  Hand Over To Account
                </Label>
              </>
            )}
          />
        </div>
        <div className="flex items-center gap-2 pt-1 sm:col-span-1">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <>
                <Checkbox
                  id="accIsActive"
                  checked={field.value}
                  onCheckedChange={(v) => {
                    const next = v === true;
                    field.onChange(next);
                    if (next) setValue("reason", "");
                  }}
                />
                <Label htmlFor="accIsActive" className="cursor-pointer">
                  Active
                </Label>
              </>
            )}
          />
        </div>
        {!isActive ? (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" {...register("reason")} />
            {errors.reason ? (
              <p className="text-xs text-destructive">
                {errors.reason.message}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </FormModal>
  );
}
