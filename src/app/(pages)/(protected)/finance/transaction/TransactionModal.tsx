"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DatePicker } from "@/common/components/date-picker";
import { Select, type SelectOption } from "@/common/components/select";
import { toastError, toastSuccess } from "@/lib/toast";
import { QK } from "@/lib/query-keys";
import {
  createFinTransaction,
  getFinanceEntityFilters,
  listIncomeExpenseTypes,
  updateFinTransaction,
  uploadFinTransactionVoucher,
} from "@/services";
import type { FinTransaction } from "@/types/finance";
import {
  distinctFinanceColleges,
  filterFinanceAccountTypes,
  filterFinanceEntities,
  filterFinanceYears,
} from "../_lib/finance-filters";
import { useFinanceSessionIds } from "../_lib/use-finance-session-ids";

const MAX_FILE_BYTES = 24 * 1024 * 1024;

const requiredId = (message: string) =>
  z
    .any()
    .transform((v) => {
      if (v === "" || v == null) return 0;
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    })
    .refine((n) => n > 0, { message });

const schema = z.object({
  vouchertypeCatdetId: requiredId("Transaction type is required"),
  collegeId: requiredId("College is required"),
  accountEntityId: requiredId("Entity is required"),
  financialYearId: requiredId("Financial year is required"),
  accountTypeId: requiredId("Account type is required"),
  transactionNumber: z.string().optional(),
  title: z.string().trim().min(1, "Transaction title is required"),
  amount: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().optional(),
  ),
  transactionDate: z.date({ message: "Date is required" }),
  description: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function parseTxnDate(raw?: string): Date {
  if (!raw) return new Date();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getDefaults(
  edit?: FinTransaction | null,
  defaultTypeId?: number,
): FormValues {
  return {
    vouchertypeCatdetId: num(edit?.vouchertypeCatdetId) || defaultTypeId || 0,
    collegeId: num(edit?.collegeId),
    accountEntityId: num(edit?.accountEntityId),
    financialYearId: num(edit?.financialYearId),
    accountTypeId: num(edit?.accountTypeId),
    transactionNumber: edit?.transactionNumber ?? "",
    title: edit?.title ?? "",
    amount:
      edit?.amount != null && edit.amount !== ("" as unknown)
        ? Number(edit.amount)
        : undefined,
    transactionDate: parseTxnDate(edit?.transactionDate),
    description: edit?.description ?? "",
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? "active",
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  editData: FinTransaction | null;
  onSaved: () => void;
}

export default function TransactionModal({
  open,
  onClose,
  editData,
  onSaved,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const { organizationId, employeeId, contextReady } = useFinanceSessionIds();

  const { data: incomeExpenseTypes = [] } = useQuery({
    queryKey: QK.finIncomeExpenseTypes.list(),
    queryFn: listIncomeExpenseTypes,
    enabled: open,
  });

  const { data: finRows = [], isLoading: filtersLoading } = useQuery({
    queryKey: QK.finEntityFilters(organizationId, employeeId),
    queryFn: () => getFinanceEntityFilters(organizationId, employeeId),
    enabled: open && contextReady,
  });

  const defaultTypeId = incomeExpenseTypes[0]?.generalDetailId;

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
    defaultValues: getDefaults(null, defaultTypeId),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const collegeId = watch("collegeId");
  const accountEntityId = watch("accountEntityId");
  const financialYearId = watch("financialYearId");
  const vouchertypeCatdetId = watch("vouchertypeCatdetId");

  const colleges = useMemo(() => distinctFinanceColleges(finRows), [finRows]);
  const entities = useMemo(
    () => filterFinanceEntities(finRows, collegeId),
    [finRows, collegeId],
  );
  const years = useMemo(
    () => filterFinanceYears(finRows, collegeId, accountEntityId),
    [finRows, collegeId, accountEntityId],
  );
  const accountTypes = useMemo(
    () =>
      filterFinanceAccountTypes(
        finRows,
        collegeId,
        accountEntityId,
        financialYearId,
      ),
    [finRows, collegeId, accountEntityId, financialYearId],
  );

  const collegeOptions = useMemo<SelectOption[]>(
    () =>
      colleges.map((c) => ({
        value: String(c.fk_college_id),
        label: String(c.college_code ?? c.fk_college_id),
      })),
    [colleges],
  );

  const entityOptions = useMemo<SelectOption[]>(
    () =>
      entities.map((e) => ({
        value: String(e.pk_acc_entity_id),
        label: String(e.entity_code ?? e.pk_acc_entity_id),
      })),
    [entities],
  );

  const yearOptions = useMemo<SelectOption[]>(
    () =>
      years.map((y) => ({
        value: String(y.pk_financial_year_id),
        label: String(y.financial_year ?? y.pk_financial_year_id),
      })),
    [years],
  );

  const accountTypeOptions = useMemo<SelectOption[]>(
    () =>
      accountTypes.map((t) => ({
        value: String(t.pk_account_type_id),
        label: String(t.accounttype_name ?? t.pk_account_type_id),
      })),
    [accountTypes],
  );

  useEffect(() => {
    if (!open) return;
    reset(getDefaults(editData, defaultTypeId));
    setFileError(null);
    setSelectedFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }, [open, editData, defaultTypeId, reset]);

  // Add mode defaults — Angular selects first college / entity / year / account type
  useEffect(() => {
    if (!open || editData || colleges.length === 0) return;
    const first = colleges[0];
    if (first.fk_college_id) setValue("collegeId", Number(first.fk_college_id));
  }, [open, editData, colleges, setValue]);

  useEffect(() => {
    if (!open || editData || entities.length === 0 || !collegeId) return;
    setValue("accountEntityId", Number(entities[0].pk_acc_entity_id));
  }, [open, editData, entities, collegeId, setValue]);

  useEffect(() => {
    if (!open || editData || years.length === 0 || !accountEntityId) return;
    setValue("financialYearId", Number(years[0].pk_financial_year_id));
  }, [open, editData, years, accountEntityId, setValue]);

  useEffect(() => {
    if (!open || editData || accountTypes.length === 0 || !financialYearId)
      return;
    setValue("accountTypeId", Number(accountTypes[0].pk_account_type_id));
  }, [open, editData, accountTypes, financialYearId, setValue]);

  useEffect(() => {
    if (!open || editData || !defaultTypeId || vouchertypeCatdetId) return;
    setValue("vouchertypeCatdetId", defaultTypeId);
  }, [open, editData, defaultTypeId, vouchertypeCatdetId, setValue]);

  // Edit mode — Angular re-applies saved IDs after cascade lists are built
  useEffect(() => {
    if (!open || !editData || finRows.length === 0) return;
    const cId = num(editData.collegeId);
    const eId = num(editData.accountEntityId);
    const yId = num(editData.financialYearId);
    const aId = num(editData.accountTypeId);
    const tId = num(editData.vouchertypeCatdetId);
    if (cId) setValue("collegeId", cId);
    if (eId) setValue("accountEntityId", eId);
    if (yId) setValue("financialYearId", yId);
    if (aId) setValue("accountTypeId", aId);
    if (tId) setValue("vouchertypeCatdetId", tId);
    if (editData.title != null) setValue("title", editData.title);
    if (editData.transactionNumber != null)
      setValue("transactionNumber", editData.transactionNumber);
    if (editData.amount != null) setValue("amount", Number(editData.amount));
    if (editData.description != null)
      setValue("description", editData.description);
    if (editData.transactionDate)
      setValue("transactionDate", parseTxnDate(editData.transactionDate));
  }, [open, editData, finRows, setValue]);

  async function onSubmit(values: FormValues) {
    setFileError(null);
    const file = selectedFile;
    if (file && file.size > MAX_FILE_BYTES) {
      setFileError("File size is greater than 24MB");
      return;
    }

    const payload: Partial<FinTransaction> = {
      collegeId: values.collegeId,
      accountEntityId: values.accountEntityId,
      financialYearId: values.financialYearId,
      accountTypeId: values.accountTypeId,
      vouchertypeCatdetId: values.vouchertypeCatdetId,
      transactionNumber: values.transactionNumber?.trim() || undefined,
      title: values.title.trim(),
      amount: values.amount,
      transactionDate: format(values.transactionDate, "yyyy-MM-dd"),
      description: values.description?.trim(),
      isActive: values.isActive,
      reason: values.isActive ? "active" : values.reason?.trim() || "inactive",
    };

    try {
      let saved: FinTransaction;
      if (editData) {
        // Angular editDialog: details.finTransactionId = data.finTransactionId
        saved = await updateFinTransaction(editData.finTransactionId, {
          ...payload,
          finTransactionId: editData.finTransactionId,
        });
        toastSuccess("Transaction updated successfully");
      } else {
        saved = await createFinTransaction(payload);
        toastSuccess("Transaction created successfully");
      }

      const txnId = saved.finTransactionId ?? editData?.finTransactionId;
      if (file && txnId) {
        await uploadFinTransactionVoucher(txnId, file);
      }

      onSaved();
      onClose();
    } catch (err) {
      toastError(
        err,
        editData ? "Update transaction failed" : "Create transaction failed",
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="flex sm:max-w-4xl max-h-none flex-col gap-3 overflow-hidden">
        <DialogHeader className="min-h-12 shrink-0">
          <DialogTitle className="text-[hsl(var(--primary))]">
            {editData ? "Edit Transaction" : "Add Transaction"}
          </DialogTitle>
        </DialogHeader>
        <form
          id="fin-transaction-form"
          onSubmit={handleSubmit(onSubmit)}
          className="overflow-visible"
        >
          <Controller
            name="vouchertypeCatdetId"
            control={control}
            render={({ field }) => (
              <RadioGroup
                className="mb-2 flex flex-wrap gap-x-6 gap-y-1"
                value={field.value ? String(field.value) : ""}
                onValueChange={(v) => field.onChange(Number(v))}
              >
                {incomeExpenseTypes.map((t) => (
                  <label
                    key={t.generalDetailId}
                    className="flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <RadioGroupItem value={String(t.generalDetailId)} />
                    {t.generalDetailDisplayName ??
                      t.generalDetailName ??
                      t.generalDetailCode}
                  </label>
                ))}
              </RadioGroup>
            )}
          />
          {errors.vouchertypeCatdetId && (
            <p className="mb-1 text-xs text-red-500">
              {errors.vouchertypeCatdetId.message}
            </p>
          )}

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <Controller
              name="collegeId"
              control={control}
              render={({ field }) => (
                <Select
                  className="gap-0.5 [&_label]:text-xs"
                  label="College"
                  required
                  value={field.value > 0 ? String(field.value) : ""}
                  onChange={(v) => {
                    field.onChange(v ? Number(v) : 0);
                    setValue("accountEntityId", 0);
                    setValue("financialYearId", 0);
                    setValue("accountTypeId", 0);
                  }}
                  options={collegeOptions}
                  placeholder="Enter College"
                  isLoading={filtersLoading}
                  searchable
                  error={errors.collegeId?.message}
                />
              )}
            />

            <Controller
              name="accountEntityId"
              control={control}
              render={({ field }) => (
                <Select
                  className="gap-0.5 [&_label]:text-xs"
                  label="Entity Type"
                  required
                  value={field.value > 0 ? String(field.value) : ""}
                  onChange={(v) => {
                    field.onChange(v ? Number(v) : 0);
                    setValue("financialYearId", 0);
                    setValue("accountTypeId", 0);
                  }}
                  options={entityOptions}
                  placeholder="Enter Entity Type"
                  disabled={!collegeId}
                  searchable
                  error={errors.accountEntityId?.message}
                />
              )}
            />

            <Controller
              name="financialYearId"
              control={control}
              render={({ field }) => (
                <Select
                  className="gap-0.5 [&_label]:text-xs"
                  label="Financial Year"
                  required
                  value={field.value > 0 ? String(field.value) : ""}
                  onChange={(v) => {
                    field.onChange(v ? Number(v) : 0);
                    setValue("accountTypeId", 0);
                  }}
                  options={yearOptions}
                  placeholder="Enter Financial Year"
                  disabled={!accountEntityId}
                  searchable
                  error={errors.financialYearId?.message}
                />
              )}
            />

            <div className="col-span-2">
              <Controller
                name="accountTypeId"
                control={control}
                render={({ field }) => (
                  <Select
                    className="gap-0.5 [&_label]:text-xs"
                    label="Account Type"
                    required
                    value={field.value > 0 ? String(field.value) : ""}
                    onChange={(v) => field.onChange(v ? Number(v) : 0)}
                    options={accountTypeOptions}
                    placeholder="Enter Account Type"
                    disabled={!financialYearId}
                    searchable
                    error={errors.accountTypeId?.message}
                  />
                )}
              />
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Voucher Number</Label>
              <Input
                className="h-8 text-xs"
                placeholder="Enter Voucher Number"
                {...register("transactionNumber")}
              />
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Transaction Title *</Label>
              <Input
                className="h-8 text-xs"
                placeholder="Enter Transaction Title"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-xs text-red-500">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Amount</Label>
              <Input
                type="number"
                step="any"
                className="h-8 text-xs"
                placeholder="Enter Amount"
                {...register("amount")}
              />
            </div>

            <div className="space-y-0.5">
              <Controller
                name="transactionDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Date *"
                    value={field.value}
                    onChange={field.onChange}
                    maxDate={new Date()}
                    clearable={false}
                    className="[&_button]:h-8 [&_button]:text-xs"
                  />
                )}
              />
              {errors.transactionDate && (
                <p className="text-xs text-red-500">
                  {errors.transactionDate.message}
                </p>
              )}
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Description</Label>
              <Textarea
                rows={2}
                className="min-h-0 h-14 resize-none text-xs py-1.5"
                placeholder="Enter Description"
                {...register("description")}
              />
            </div>

            <div className="col-span-2 space-y-1">
              {/* Angular: “Voucher Doc” label + Choose File + filename + green size hint */}
              <div className="flex flex-wrap items-center text-sm">
                {/* <span className="mr-4 shrink-0 font-medium text-foreground">Voucher Doc</span> */}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf,.doc"
                  className="sr-only"
                  onChange={(e) => {
                    const next = e.target.files?.[0] ?? null;
                    setSelectedFile(next);
                    setFileError(null);
                    if (next && next.size > MAX_FILE_BYTES) {
                      setFileError("File size is greater than 24MB");
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-8 cursor-pointer bg-[hsl(var(--primary))] px-3 text-xs text-primary-foreground hover:bg-[hsl(var(--primary))]/90"
                  onClick={() => fileRef.current?.click()}
                >
                  Choose File
                </Button>
                <span className="ml-2 truncate text-xs text-muted-foreground">
                  {selectedFile?.name ?? "No file chosen"}
                </span>
                {editData?.voucherUrl ? (
                  <a
                    href={editData.voucherUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-3 cursor-pointer text-xs font-medium text-blue-600 underline"
                  >
                    View
                  </a>
                ) : null}
              </div>
              <p
                className={`text-xs font-semibold ${fileError ? "text-red-500" : "text-green-600"}`}
              >
                {fileError ?? "File size should not greater than 24MB"}
              </p>
            </div>
          </div>
        </form>
        <DialogFooter className="mt-0 shrink-0 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="fin-transaction-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
