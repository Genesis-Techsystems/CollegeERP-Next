"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BookOpen, Wallet } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { Select, type SelectOption } from "@/common/components/select";
import { utcMidnightIso } from "@/common/generic-functions";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QK } from "@/lib/query-keys";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  getLibraryPeriodicalById,
  listLibraryCurrencyTypes,
  listLibraryRacksByLibrary,
  saveLibraryPeriodical,
} from "@/services";
import type { GeneralDetail } from "@/types/exam-master";
import {
  LIBRARY_FIELD_LABEL_CLASS,
  LIBRARY_INPUT_CLASS,
} from "../_lib/modal-styles";

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
  currencyId: z.string().nullable(),
  billAmount: z.string(),
  purchaseSource: z.string(),
  billNo: z.string(),
  billDate: z.date().nullable(),
});

type FormValues = z.infer<typeof schema>;

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

export default function AddMorePeriodicalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const periodicalId = Number(searchParams.get("periodicalId") ?? 0);
  const [submitting, setSubmitting] = useState(false);

  const { data: periodical, isLoading: loadingPeriodical } = useQuery({
    queryKey: QK.library.periodicalById(periodicalId),
    queryFn: () => getLibraryPeriodicalById(periodicalId),
    enabled: periodicalId > 0,
  });

  const libraryId = Number(periodical?.libraryId ?? 0);

  const { data: racks = [], isLoading: loadingRacks } = useQuery({
    queryKey: ["Library", "racks", libraryId, "add-more-periodicals"],
    queryFn: () => listLibraryRacksByLibrary(libraryId),
    enabled: libraryId > 0,
  });

  const { data: currencies = [] } = useQuery({
    queryKey: ["Library", "currencyTypes"],
    queryFn: listLibraryCurrencyTypes,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
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
      currencyId: null,
      billAmount: "",
      purchaseSource: "",
      billNo: "",
      billDate: new Date(),
    },
  });

  const rackOptions = useMemo<SelectOption[]>(
    () =>
      racks.map((rack) => ({
        value: String(rack.shelveId ?? ""),
        label: rack.shelveCode ?? String(rack.shelveId ?? ""),
      })),
    [racks],
  );

  async function onSubmit(values: FormValues) {
    if (!periodicalId || !periodical) {
      toastError("Periodical not loaded.");
      return;
    }
    setSubmitting(true);
    try {
      const existingDetails = Array.isArray(periodical.periodicalDetails)
        ? [...periodical.periodicalDetails]
        : [];

      // Angular pushes periodicalDetailsForm.value onto existing periodicalDetails
      const detailRow = {
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
        currencyId: values.currencyId ? Number(values.currencyId) : "",
        currencyCatdetId: "",
        billAmount: values.billAmount ? Number(values.billAmount) : "",
        purchaseSource: values.purchaseSource,
        billNo: values.billNo,
        billDate: optionalDateIso(values.billDate),
        periodicalCode: periodical.periodicalCode,
        periodicalName: periodical.periodicalName,
        isActive: true,
        libraryId: periodical.libraryId,
        organizationId: periodical.organizationId,
        periodicalId: periodical.periodicalId,
      };

      const payload = {
        ...periodical,
        periodicalDetails: [...existingDetails, detailRow],
        bookPurchaseDetails: [
          {
            billAmount: values.billAmount ? Number(values.billAmount) : "",
            billDate: optionalDateIso(values.billDate),
            billNo: values.billNo,
            currencyCatdetId: values.currencyId
              ? Number(values.currencyId)
              : "",
            isActive: true,
            noOfPeriodicals: Number(values.noOfPeriodicals),
            periodicalAmount: Number(values.periodicalAmount),
            periodicalCode: periodical.periodicalCode,
            periodicalId: periodical.periodicalId,
            periodicalName: periodical.periodicalName,
            publisherIds: periodical.publisherIds,
            supplierIds: periodical.supplierIds,
            purchaseSource: values.purchaseSource,
          },
        ],
      };

      await saveLibraryPeriodical(payload);
      toastSuccess("Periodical added successfully");
      router.push("/library/periodicals");
    } catch (error) {
      toastError(error, "Could not add periodical");
    } finally {
      setSubmitting(false);
    }
  }

  const inputField = (
    name: keyof FormValues,
    label: string,
    options?: { type?: string; required?: boolean },
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
        placeholder={label}
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
      <div className="app-card space-y-5 p-5">
        <h1 className="inline-flex items-center gap-2 text-[15px] font-semibold text-[hsl(var(--card-title))]">
          <BookOpen className="h-4 w-4" />
          Add New Periodical
        </h1>

        {loadingPeriodical ? (
          <p className="text-sm text-muted-foreground">Loading periodical…</p>
        ) : (
          <div className="grid gap-3 rounded-md border bg-muted/20 p-4 sm:grid-cols-3">
            <p className="text-[13px]">
              <span className="font-medium">Periodical Code :</span>{" "}
              <span className="text-muted-foreground">
                {String(periodical?.periodicalCode ?? "—")}
              </span>
            </p>
            <p className="text-[13px]">
              <span className="font-medium">Periodical :</span>{" "}
              <span className="text-muted-foreground">
                {String(periodical?.periodicalName ?? "—")}
              </span>
            </p>
            <p className="text-[13px]">
              <span className="font-medium">Library :</span>{" "}
              <span className="text-muted-foreground">
                {String(periodical?.libraryCode ?? "—")}
              </span>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {inputField("volume", "Volume", { required: true })}
            {inputField("srNo", "Serial No")}
            {inputField("noOfPages", "No Of Pages")}
            {inputField("issue", "Issue")}
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
              disabled={!libraryId}
              error={errors.shelveId?.message}
            />
            <DatePicker
              label="Received Date"
              value={watch("receivedDate")}
              onChange={(date) => setValue("receivedDate", date)}
              placeholder="Received Date"
            />
            {inputField("receivedBy", "Received By")}
            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <Label className={LIBRARY_FIELD_LABEL_CLASS}>Comments</Label>
              <Textarea
                className="min-h-[72px] text-[12px]"
                placeholder="Comments"
                {...register("comments")}
              />
            </div>
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
                value={watch("currencyId")}
                onChange={(value) => setValue("currencyId", value)}
                options={gdOptions(currencies)}
                placeholder="Currency Types"
                clearable
              />
              {inputField("billAmount", "Invoice Amount", { type: "number" })}
              {inputField("purchaseSource", "Purchase Source")}
              {inputField("billNo", "Receipt No")}
              <DatePicker
                label="Date Of Purchase"
                value={watch("billDate")}
                onChange={(date) => setValue("billDate", date)}
                placeholder="Date Of Purchase"
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

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Back
            </Button>
            <Button type="submit" disabled={submitting || !periodical}>
              {submitting ? "Saving…" : "Submit"}
            </Button>
          </div>
        </form>
      </div>
    </PageContainer>
  );
}
