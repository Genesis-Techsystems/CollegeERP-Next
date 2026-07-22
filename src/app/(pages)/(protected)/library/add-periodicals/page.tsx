"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GraduationCap, Pencil, Wallet } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { Select, type SelectOption } from "@/common/components/select";
import { utcMidnightIso } from "@/common/generic-functions";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toastError, toastSuccess } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  listActiveOrganizationsForLibrary,
  listBookBindTypes,
  listBookCategoriesByLibrary,
  listLanguageCategories,
  listLibraryCurrencyTypes,
  listLibraryDetailsByOrganization,
  listLibraryPublishersByLibrary,
  listLibraryRacksByLibrary,
  listLibrarySuppliersByOrganization,
  listPeriodicalFrequencies,
  listPeriodicalTypes,
  saveLibraryPeriodical,
} from "@/services";
import type { GeneralDetail } from "@/types/exam-master";
import {
  LIBRARY_FIELD_LABEL_CLASS,
  LIBRARY_INPUT_CLASS,
} from "../_lib/modal-styles";

const requiredId = (label: string) => {
  const message = `${label} is required`;
  return z.preprocess(
    (value) => (value === "" || value === null ? undefined : Number(value)),
    z.number({ error: message }).min(1, message),
  );
};

const schema = z.object({
  organizationId: requiredId("Organization"),
  libraryId: requiredId("Library"),
  periodicalName: z.string().trim().min(1, "Periodical name is required"),
  periodicalCode: z.string().trim().min(1, "Periodical code is required"),
  periodicalTypeId: requiredId("Periodical type"),
  periodicalDescription: z.string(),
  periodicalFrequencyId: requiredId("Periodical frequency"),
  periodicalTimeValue: z.string(),
  publisherIds: requiredId("Publisher"),
  bookcatId: requiredId("Book category"),
  languageId: z.string().nullable(),
  lastReceivedDate: z.date().nullable(),
  nextScheduleDate: z.date().nullable(),
  followupTo: z.string(),
  followupComments: z.string(),
  paymentFrequencyId: z.string().nullable(),
  supplierIds: z.string().nullable(),
  bindingTypeId: z.string().nullable(),
  subscriptionEnddate: z.date().nullable(),
  issueNo: z.string(),
  issnNo: z.string(),
  seriesCount: z.string(),
  isSeriesCompleted: z.boolean(),
  volume: z.string().trim().min(1, "Volume is required"),
  srNo: z.string(),
  noOfPages: z.string(),
  issue: z.string(),
  shelveId: z
    .string()
    .nullable()
    .refine((v) => Boolean(v && v.trim()), "Rack is required"),
  receivedDate: z.date().nullable(),
  receivedBy: z.string(),
  comments: z.string(),
  noOfPeriodicals: z
    .string()
    .trim()
    .min(1, "No of periodicals is required")
    .refine((v) => Number(v) > 0, "No of periodicals must be greater than 0"),
  periodicalAmount: z
    .string()
    .trim()
    .min(1, "Periodical amount is required")
    .refine((v) => Number(v) > 0, "Periodical amount must be greater than 0"),
  currencyCatdetId: z.string().nullable(),
  billAmount: z.string(),
  purchaseSource: z.string(),
  billNo: z.string(),
  billDate: z.date().nullable(),
});

type FormValues = z.infer<typeof schema>;

const STEP1_FIELDS = [
  "organizationId",
  "libraryId",
  "periodicalName",
  "periodicalCode",
  "periodicalTypeId",
  "periodicalFrequencyId",
  "publisherIds",
  "bookcatId",
] as const satisfies ReadonlyArray<keyof FormValues>;

const STEP2_FIELDS = [
  "volume",
  "shelveId",
  "noOfPeriodicals",
  "periodicalAmount",
] as const satisfies ReadonlyArray<keyof FormValues>;

const STEPS = [
  { id: 1, label: "Periodical Info" },
  { id: 2, label: "Periodical Details" },
] as const;

function gdOptions(rows: GeneralDetail[]): SelectOption[] {
  return rows.map((row) => ({
    value: String(row.generalDetailId ?? ""),
    label: String(
      row.generalDetailDisplayName ??
        row.generalDetailCode ??
        row.generalDetailId ??
        "",
    ),
  }));
}

function optionalDateIso(date: Date | null | undefined): string {
  return date ? utcMidnightIso(date) : "";
}

/** Angular-style mat-horizontal-stepper (display-only). */
function PeriodicalStepper({ step }: { step: 1 | 2 }) {
  const stepIdx = step - 1;
  const progressPct = stepIdx === 0 ? 50 : 100;

  return (
    <div className="relative border-b border-slate-200 bg-sky-50/60">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-slate-200/80">
        <div
          className="h-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <ol className="flex items-stretch gap-0 overflow-x-auto px-2 pb-3 pt-4">
        {STEPS.map((s, i) => {
          const done = i < stepIdx;
          const active = i === stepIdx;
          const upcoming = i > stepIdx;
          return (
            <li key={s.id} className="flex min-w-[8rem] flex-1 items-start">
              <div
                className={cn(
                  "flex w-full flex-col items-center gap-1.5 rounded-md px-1 py-2",
                  active && "bg-sky-100/90",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold",
                    done || active
                      ? "bg-primary text-primary-foreground"
                      : "border-2 border-primary bg-background text-primary",
                  )}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? (
                    <Pencil className="h-3.5 w-3.5" strokeWidth={2.25} />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={cn(
                    "text-center text-[11px] leading-tight",
                    upcoming && "text-muted-foreground",
                    active && "font-semibold text-foreground",
                    done && "font-medium text-foreground",
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 ? (
                <div
                  className={cn(
                    "mt-[1.35rem] h-px w-3 shrink-0 self-start sm:w-8",
                    i < stepIdx ? "bg-primary" : "bg-slate-300",
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function AddPeriodicalsPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  const {
    register,
    watch,
    setValue,
    trigger,
    clearErrors,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: {
      periodicalDescription: "",
      periodicalTimeValue: "",
      languageId: null,
      lastReceivedDate: new Date(),
      nextScheduleDate: new Date(),
      followupTo: "",
      followupComments: "",
      paymentFrequencyId: null,
      supplierIds: null,
      bindingTypeId: null,
      subscriptionEnddate: new Date(),
      issueNo: "",
      issnNo: "",
      seriesCount: "",
      isSeriesCompleted: false,
      volume: "",
      srNo: "",
      noOfPages: "",
      issue: "",
      shelveId: null,
      receivedDate: new Date(),
      receivedBy: "",
      comments: "",
      noOfPeriodicals: "",
      periodicalAmount: "",
      currencyCatdetId: null,
      billAmount: "",
      purchaseSource: "",
      billNo: "",
      billDate: new Date(),
    },
  });

  const organizationId = Number(watch("organizationId") ?? 0);
  const libraryId = Number(watch("libraryId") ?? 0);

  const { data: organizations = [] } = useQuery({
    queryKey: ["Library", "organizations", "active"],
    queryFn: listActiveOrganizationsForLibrary,
  });
  const { data: libraries = [] } = useQuery({
    queryKey: ["Library", "librariesByOrg", organizationId],
    queryFn: () => listLibraryDetailsByOrganization(organizationId),
    enabled: organizationId > 0,
  });
  const { data: periodicalTypes = [] } = useQuery({
    queryKey: ["Library", "periodicalTypes"],
    queryFn: listPeriodicalTypes,
  });
  const { data: periodicalFreq = [] } = useQuery({
    queryKey: ["Library", "periodicalFrequencies"],
    queryFn: listPeriodicalFrequencies,
  });
  const { data: languages = [] } = useQuery({
    queryKey: ["Library", "languages"],
    queryFn: listLanguageCategories,
  });
  const { data: bindTypes = [] } = useQuery({
    queryKey: ["Library", "bookBindTypes"],
    queryFn: listBookBindTypes,
  });
  const { data: currencies = [] } = useQuery({
    queryKey: ["Library", "currencyTypes"],
    queryFn: listLibraryCurrencyTypes,
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["Library", "suppliersByOrg", organizationId],
    queryFn: () => listLibrarySuppliersByOrganization(organizationId),
    enabled: organizationId > 0,
  });
  const { data: publishers = [] } = useQuery({
    queryKey: ["Library", "publishers", libraryId],
    queryFn: () => listLibraryPublishersByLibrary(libraryId),
    enabled: libraryId > 0,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["Library", "bookCategoriesByLibrary", libraryId],
    queryFn: () => listBookCategoriesByLibrary(libraryId),
    enabled: libraryId > 0,
  });
  const { data: racks = [] } = useQuery({
    queryKey: ["Library", "racks", libraryId],
    queryFn: () => listLibraryRacksByLibrary(libraryId),
    enabled: libraryId > 0,
  });

  const orgOptions = useMemo<SelectOption[]>(
    () =>
      organizations.map((row) => ({
        value: String(row.organizationId ?? ""),
        label: String(row.orgCode ?? row.organizationId ?? ""),
      })),
    [organizations],
  );
  const libraryOptions = useMemo<SelectOption[]>(
    () =>
      libraries.map((row) => ({
        value: String(row.libraryId ?? ""),
        label:
          row.libraryCode ?? row.libraryName ?? String(row.libraryId ?? ""),
      })),
    [libraries],
  );
  const publisherOptions = useMemo<SelectOption[]>(
    () =>
      publishers.map((row) => ({
        value: String(row.publisherId ?? ""),
        label: row.publishername ?? String(row.publisherId ?? ""),
      })),
    [publishers],
  );
  const supplierOptions = useMemo<SelectOption[]>(
    () =>
      suppliers.map((row) => ({
        value: String(row.supplierId ?? ""),
        label: String(
          row.suppliercode ?? row.suppliername ?? row.supplierId ?? "",
        ),
      })),
    [suppliers],
  );
  const categoryOptions = useMemo<SelectOption[]>(
    () =>
      categories.map((row) => ({
        value: String(row.bookcatId ?? ""),
        label:
          row.bookCategoryCode ??
          row.bookCategoryName ??
          String(row.bookcatId ?? ""),
      })),
    [categories],
  );
  const rackOptions = useMemo<SelectOption[]>(
    () =>
      racks.map((row) => ({
        value: String(row.shelveId ?? ""),
        label: row.shelveCode ?? String(row.shelveId ?? ""),
      })),
    [racks],
  );

  async function goNext() {
    // Only validate step 1; never surface step 2 errors here
    clearErrors([...STEP2_FIELDS]);
    const valid = await trigger([...STEP1_FIELDS], { shouldFocus: true });
    if (valid) {
      clearErrors([...STEP2_FIELDS]);
      setStep(2);
    }
  }

  function goBackToStep1() {
    clearErrors([...STEP2_FIELDS]);
    setStep(1);
  }

  async function savePeriodical(values: FormValues) {
    const payload = {
      organizationId: values.organizationId,
      libraryId: values.libraryId,
      periodicalName: values.periodicalName,
      periodicalCode: values.periodicalCode,
      periodicalTypeId: values.periodicalTypeId,
      periodicalDescription: values.periodicalDescription,
      periodicalFrequencyId: values.periodicalFrequencyId,
      periodicalTimeValue: values.periodicalTimeValue,
      publisherIds: values.publisherIds,
      bookcatId: values.bookcatId,
      languageId: values.languageId ? Number(values.languageId) : "",
      lastReceivedDate: optionalDateIso(values.lastReceivedDate),
      nextScheduleDate: optionalDateIso(values.nextScheduleDate),
      followupTo: values.followupTo,
      followupComments: values.followupComments,
      paymentFrequencyId: values.paymentFrequencyId
        ? Number(values.paymentFrequencyId)
        : "",
      supplierIds: values.supplierIds ? Number(values.supplierIds) : "",
      bindingTypeId: values.bindingTypeId ? Number(values.bindingTypeId) : "",
      subscriptionEnddate: optionalDateIso(values.subscriptionEnddate),
      issueNo: values.issueNo,
      issnNo: values.issnNo,
      seriesCount: values.seriesCount,
      isSeriesCompleted: values.isSeriesCompleted,
      isActive: true,
      periodicalDetails: [
        {
          volume: values.volume,
          srNo: values.srNo,
          noOfPages: values.noOfPages,
          issue: values.issue,
          shelveId: values.shelveId ? Number(values.shelveId) : "",
          receivedDate: optionalDateIso(values.receivedDate),
          receivedBy: values.receivedBy,
          comments: values.comments,
          noOfPeriodicals: Number(values.noOfPeriodicals),
          periodicalAmount: Number(values.periodicalAmount),
          currencyCatdetId: values.currencyCatdetId
            ? Number(values.currencyCatdetId)
            : "",
          billAmount: values.billAmount ? Number(values.billAmount) : "",
          purchaseSource: values.purchaseSource,
          billNo: values.billNo,
          billDate: optionalDateIso(values.billDate),
          isActive: true,
          libraryId: values.libraryId,
          organizationId: values.organizationId,
          periodicalName: values.periodicalName,
        },
      ],
      periodicalsPurchaseDetails: [
        {
          billAmount: values.billAmount ? Number(values.billAmount) : "",
          billDate: optionalDateIso(values.billDate),
          noOfPeriodicals: Number(values.noOfPeriodicals),
          billNo: values.billNo,
          isActive: true,
          currencyCatdetId: values.currencyCatdetId
            ? Number(values.currencyCatdetId)
            : "",
          dateOfPurchase: optionalDateIso(values.billDate),
          periodicalAmount: Number(values.periodicalAmount),
          periodicalCode: values.periodicalCode,
          periodicalName: values.periodicalName,
          purchaseSource: values.purchaseSource,
          supplierIds: values.supplierIds ? Number(values.supplierIds) : "",
        },
      ],
    };

    try {
      await saveLibraryPeriodical(payload);
      toastSuccess("Periodical added successfully");
      router.push("/library/periodicals");
    } catch (error) {
      toastError(error, "Could not add periodical");
    }
  }

  async function handleStep2Submit() {
    // Only validate step 2 on Submit
    clearErrors([...STEP1_FIELDS]);
    const valid = await trigger([...STEP2_FIELDS], { shouldFocus: true });
    if (!valid) return;
    await savePeriodical(getValues());
  }

  const inputField = (
    name: keyof FormValues,
    label: string,
    options?: { type?: string; placeholder?: string; required?: boolean },
  ) => (
    <div className="space-y-1">
      <Label className={LIBRARY_FIELD_LABEL_CLASS}>
        {label}
        {options?.required ? (
          <span className="text-destructive"> *</span>
        ) : null}
      </Label>
      <Input
        type={options?.type}
        className={LIBRARY_INPUT_CLASS}
        placeholder={options?.placeholder ?? label}
        {...register(name)}
      />
      {errors[name]?.message ? (
        <p className="text-xs text-destructive">
          {String(errors[name]?.message)}
        </p>
      ) : null}
    </div>
  );

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <PeriodicalStepper step={step} />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 2) void handleStep2Submit();
          }}
          className="space-y-5 p-5"
        >
          <div className="flex items-center gap-2 border-b pb-3">
            {step === 1 ? (
              <Pencil className="h-4 w-4 text-primary" />
            ) : (
              <GraduationCap className="h-4 w-4 text-primary" />
            )}
            <h1 className="text-[15px] font-semibold text-[hsl(var(--card-title))]">
              {step === 1 ? "Periodical Info" : "Periodical Details"}
            </h1>
          </div>

          {step === 1 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Select
                label="Organization"
                required
                value={organizationId ? String(organizationId) : null}
                onChange={(value) => {
                  setValue("organizationId", value ? Number(value) : 0, {
                    shouldValidate: false,
                  });
                  clearErrors("organizationId");
                  setValue("libraryId", 0, { shouldValidate: false });
                  setValue("supplierIds", null, { shouldValidate: false });
                  setValue("publisherIds", 0, { shouldValidate: false });
                  setValue("bookcatId", 0, { shouldValidate: false });
                }}
                options={orgOptions}
                placeholder="Organization"
                error={errors.organizationId?.message}
              />
              <Select
                label="Library"
                required
                value={libraryId ? String(libraryId) : null}
                onChange={(value) => {
                  setValue("libraryId", value ? Number(value) : 0, {
                    shouldValidate: false,
                  });
                  clearErrors("libraryId");
                  setValue("publisherIds", 0, { shouldValidate: false });
                  setValue("bookcatId", 0, { shouldValidate: false });
                  setValue("shelveId", null, { shouldValidate: false });
                }}
                options={libraryOptions}
                placeholder="Library"
                disabled={!organizationId}
                error={errors.libraryId?.message}
              />
              {inputField("periodicalName", "Periodical Name", {
                required: true,
              })}
              {inputField("periodicalCode", "Periodical Code", {
                required: true,
              })}
              <Select
                label="Periodical Type"
                required
                value={
                  watch("periodicalTypeId")
                    ? String(watch("periodicalTypeId"))
                    : null
                }
                onChange={(value) => {
                  setValue("periodicalTypeId", value ? Number(value) : 0, {
                    shouldValidate: false,
                  });
                  clearErrors("periodicalTypeId");
                }}
                options={gdOptions(periodicalTypes)}
                placeholder="Periodical Type"
                error={errors.periodicalTypeId?.message}
              />
              {inputField("periodicalDescription", "Periodical Description")}
              <Select
                label="Periodical Frequency"
                required
                value={
                  watch("periodicalFrequencyId")
                    ? String(watch("periodicalFrequencyId"))
                    : null
                }
                onChange={(value) => {
                  setValue("periodicalFrequencyId", value ? Number(value) : 0, {
                    shouldValidate: false,
                  });
                  clearErrors("periodicalFrequencyId");
                }}
                options={gdOptions(periodicalFreq)}
                placeholder="Periodical Frequency"
                error={errors.periodicalFrequencyId?.message}
              />
              {inputField("periodicalTimeValue", "Periodical Time Value")}
              <Select
                label="Publisher"
                required
                value={
                  watch("publisherIds") ? String(watch("publisherIds")) : null
                }
                onChange={(value) => {
                  setValue("publisherIds", value ? Number(value) : 0, {
                    shouldValidate: false,
                  });
                  clearErrors("publisherIds");
                }}
                options={publisherOptions}
                placeholder="Publisher"
                disabled={!libraryId}
                error={errors.publisherIds?.message}
              />
              <Select
                label="Library Supplier"
                value={watch("supplierIds")}
                onChange={(value) =>
                  setValue("supplierIds", value, { shouldValidate: false })
                }
                options={supplierOptions}
                placeholder="Library Supplier"
                disabled={!organizationId}
                clearable
              />
              <Select
                label="Book Category"
                required
                value={watch("bookcatId") ? String(watch("bookcatId")) : null}
                onChange={(value) => {
                  setValue("bookcatId", value ? Number(value) : 0, {
                    shouldValidate: false,
                  });
                  clearErrors("bookcatId");
                }}
                options={categoryOptions}
                placeholder="Book Category"
                disabled={!libraryId}
                error={errors.bookcatId?.message}
              />
              <Select
                label="Language"
                value={watch("languageId")}
                onChange={(value) =>
                  setValue("languageId", value, { shouldValidate: false })
                }
                options={gdOptions(languages)}
                placeholder="Language"
                clearable
              />
              <DatePicker
                label="Last Received Date"
                value={watch("lastReceivedDate")}
                onChange={(date) =>
                  setValue("lastReceivedDate", date, { shouldValidate: false })
                }
              />
              <DatePicker
                label="Next Schedule Date"
                value={watch("nextScheduleDate")}
                onChange={(date) =>
                  setValue("nextScheduleDate", date, { shouldValidate: false })
                }
              />
              {inputField("followupTo", "Followup To")}
              {inputField("followupComments", "Followup Comments")}
              <Select
                label="Payment Frequency"
                value={watch("paymentFrequencyId")}
                onChange={(value) =>
                  setValue("paymentFrequencyId", value, {
                    shouldValidate: false,
                  })
                }
                options={gdOptions(periodicalFreq)}
                placeholder="Payment Frequency"
                clearable
              />
              <Select
                label="Bind Type"
                value={watch("bindingTypeId")}
                onChange={(value) =>
                  setValue("bindingTypeId", value, { shouldValidate: false })
                }
                options={gdOptions(bindTypes)}
                placeholder="Bind Type"
                clearable
              />
              {inputField("issueNo", "Issue No", { type: "number" })}
              {inputField("issnNo", "ISSN No", { type: "number" })}
              <DatePicker
                label="Subscription End Date"
                value={watch("subscriptionEnddate")}
                onChange={(date) =>
                  setValue("subscriptionEnddate", date, {
                    shouldValidate: false,
                  })
                }
              />
              {inputField("seriesCount", "Series Count", { type: "number" })}
              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  id="isSeriesCompleted"
                  checked={watch("isSeriesCompleted")}
                  onCheckedChange={(checked) =>
                    setValue("isSeriesCompleted", checked === true, {
                      shouldValidate: false,
                    })
                  }
                />
                <Label htmlFor="isSeriesCompleted" className="font-normal">
                  Series Completed
                </Label>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {inputField("volume", "Volume", { required: true })}
                {inputField("srNo", "Serial No")}
                {inputField("noOfPages", "No Of Pages")}
                {inputField("issue", "Issue")}
                <Select
                  label="Rack"
                  required
                  value={watch("shelveId")}
                  onChange={(value) => {
                    setValue("shelveId", value, { shouldValidate: false });
                    clearErrors("shelveId");
                  }}
                  options={rackOptions}
                  placeholder="Rack"
                  disabled={!libraryId}
                  error={errors.shelveId?.message}
                />
                <DatePicker
                  label="Received Date"
                  value={watch("receivedDate")}
                  onChange={(date) =>
                    setValue("receivedDate", date, { shouldValidate: false })
                  }
                />
                {inputField("receivedBy", "Received By")}
                {inputField("comments", "Comments")}
              </div>
              <div className="space-y-4 border-t pt-4">
                <h2 className="inline-flex items-center gap-2 text-[14px] font-semibold text-[hsl(var(--card-title))]">
                  <Wallet className="h-4 w-4" />
                  Periodical Purchase Details
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {inputField("noOfPeriodicals", "No Of Periodical", {
                    type: "number",
                    required: true,
                  })}
                  {inputField("periodicalAmount", "Periodical Amount", {
                    type: "number",
                    required: true,
                  })}
                  <Select
                    label="Currency Types"
                    value={watch("currencyCatdetId")}
                    onChange={(value) =>
                      setValue("currencyCatdetId", value, {
                        shouldValidate: false,
                      })
                    }
                    options={gdOptions(currencies)}
                    placeholder="Currency Types"
                    clearable
                  />
                  {inputField("billAmount", "Invoice Amount", {
                    type: "number",
                  })}
                  {inputField("purchaseSource", "Purchase Source")}
                  {inputField("billNo", "Receipt No")}
                  <DatePicker
                    label="Date Of Purchase"
                    value={watch("billDate")}
                    onChange={(date) =>
                      setValue("billDate", date, { shouldValidate: false })
                    }
                  />
                  <div className="space-y-1">
                    <Label className={LIBRARY_FIELD_LABEL_CLASS}>
                      Receipt File
                    </Label>
                    <Input
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      className={LIBRARY_INPUT_CLASS}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t pt-4">
            {step === 1 ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/library/periodicals")}
                >
                  Back
                </Button>
                <Button type="button" onClick={() => void goNext()}>
                  Next
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={goBackToStep1}>
                  Back
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving…" : "Submit"}
                </Button>
              </>
            )}
          </div>
        </form>
      </div>
    </PageContainer>
  );
}
