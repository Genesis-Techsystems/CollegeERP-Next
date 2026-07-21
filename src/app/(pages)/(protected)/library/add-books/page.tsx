"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BookOpen, Receipt } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import {
  MultiSelect,
  Select,
  type SelectOption,
} from "@/common/components/select";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createLibraryBook,
  getLibraryBookSetting,
  listActiveLibraryDetails,
  listBookBindTypes,
  listBookCategoriesByLibrary,
  listBookRegistrationTypes,
  listLanguageCategories,
  listLibraryAuthorsByLibrary,
  listLibraryCurrencyTypes,
  listLibraryPublishersByLibrary,
  listLibraryRacksByLibrary,
  listReturnBookConditions,
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

const requiredNumberText = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((value) => Number(value) > 0, `${label} must be greater than 0`);

const schema = z.object({
  libraryId: requiredId("Library"),
  title: z.string().trim().min(1, "Book title is required"),
  publisherIds: z.array(z.string()),
  authorIds: z.array(z.string()),
  bookcatId: requiredId("Department"),
  languageId: requiredId("Language"),
  noOfPages: z.string(),
  libraryRefPrefix: z.string(),
  tags: z.string(),
  customTags: z.string(),
  isbn: z.string(),
  year: z.string(),
  edition: z.string(),
  vol: z.string(),
  bindingTypeId: z.string().nullable(),
  subjectHeadings: z.string(),
  callNumber: z.string(),
  bookregTypeId: requiredId("Book registration type"),
  valueLstAccNo: z.string(),
  noofcopies: requiredNumberText("No of copies"),
  bookAmount: requiredNumberText("Each book cost"),
  currencyId: requiredId("Currency type"),
  amount: requiredNumberText("Total amount"),
  purchaseSource: z.string(),
  purchaseReceiptNo: z.string(),
  dateOfPurchase: z.date().nullable(),
});

type FormValues = z.infer<typeof schema>;

function generalDetailOptions(rows: GeneralDetail[]): SelectOption[] {
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

export default function AddBooksPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [bookTypeSettingId, setBookTypeSettingId] = useState<number>();
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      publisherIds: [],
      authorIds: [],
      noOfPages: "",
      libraryRefPrefix: "",
      tags: "",
      customTags: "",
      isbn: "",
      year: "",
      edition: "",
      vol: "",
      bindingTypeId: null,
      subjectHeadings: "",
      callNumber: "",
      valueLstAccNo: "",
      noofcopies: "",
      bookAmount: "",
      amount: "",
      purchaseSource: "",
      purchaseReceiptNo: "",
      dateOfPurchase: null,
    },
  });

  const libraryId = Number(watch("libraryId") ?? 0);
  const bookregTypeId = Number(watch("bookregTypeId") ?? 0);

  const { data: libraries = [] } = useQuery({
    queryKey: ["Library", "libraryDetails", "active"],
    queryFn: listActiveLibraryDetails,
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
  const { data: registrationTypes = [] } = useQuery({
    queryKey: ["Library", "bookRegTypes", libraryId],
    queryFn: listBookRegistrationTypes,
    enabled: libraryId > 0,
  });
  const { data: authors = [] } = useQuery({
    queryKey: ["Library", "authors", libraryId, "active"],
    queryFn: () => listLibraryAuthorsByLibrary(libraryId),
    enabled: libraryId > 0,
  });
  const { data: publishers = [] } = useQuery({
    queryKey: ["Library", "publishers", libraryId, "active"],
    queryFn: () => listLibraryPublishersByLibrary(libraryId),
    enabled: libraryId > 0,
  });
  const { data: departments = [] } = useQuery({
    queryKey: ["Library", "bookCategoriesByLibrary", libraryId],
    queryFn: () => listBookCategoriesByLibrary(libraryId),
    enabled: libraryId > 0,
  });

  useQuery({
    queryKey: ["Library", "racks", libraryId, "active"],
    queryFn: () => listLibraryRacksByLibrary(libraryId),
    enabled: libraryId > 0,
  });
  useQuery({
    queryKey: ["Library", "returnBookConditions"],
    queryFn: listReturnBookConditions,
    enabled: libraryId > 0,
  });

  const libraryOptions = useMemo<SelectOption[]>(
    () =>
      libraries.map((row) => ({
        value: String(row.libraryId ?? ""),
        label:
          row.libraryCode ?? row.libraryName ?? String(row.libraryId ?? ""),
      })),
    [libraries],
  );
  const departmentOptions = useMemo<SelectOption[]>(
    () =>
      departments.map((row) => ({
        value: String(row.bookcatId ?? ""),
        label:
          row.bookCategoryCode ??
          row.bookCategoryName ??
          String(row.bookcatId ?? ""),
      })),
    [departments],
  );
  const authorOptions = useMemo<SelectOption[]>(
    () =>
      authors.map((row) => ({
        value: String(row.authorId ?? ""),
        label: [row.firstName, row.lastName].filter(Boolean).join(" "),
      })),
    [authors],
  );
  const publisherOptions = useMemo<SelectOption[]>(
    () =>
      publishers.map((row) => ({
        value: String(row.publisherId ?? ""),
        label: row.publishername ?? String(row.publisherId ?? ""),
      })),
    [publishers],
  );

  useEffect(() => {
    if (!bookregTypeId || !libraryId) {
      setValue("valueLstAccNo", "");
      setBookTypeSettingId(undefined);
      return;
    }
    const selected = registrationTypes.find(
      (row) => Number(row.generalDetailId) === bookregTypeId,
    );
    const code = selected?.generalDetailCode;
    if (!code) return;
    void getLibraryBookSetting(String(code), libraryId)
      .then((setting) => {
        setValue("valueLstAccNo", String(setting?.value ?? ""));
        setBookTypeSettingId(
          Number(setting?.libSettingCatdetId ?? 0) || undefined,
        );
      })
      .catch((error) => toastError(error, "Could not load accession setting"));
  }, [bookregTypeId, libraryId, registrationTypes, setValue]);

  async function goNext() {
    const valid = await trigger([
      "libraryId",
      "title",
      "bookcatId",
      "languageId",
    ]);
    if (valid) setStep(2);
  }

  async function onSubmit(values: FormValues) {
    const copies = Number(values.noofcopies);
    const eachBookCost = Number(values.bookAmount);
    const totalAmount = Number(values.amount);
    const payload = {
      libraryId: values.libraryId,
      title: values.title,
      languageId: values.languageId,
      bindingTypeId: values.bindingTypeId ? Number(values.bindingTypeId) : null,
      libraryRefPrefix: values.libraryRefPrefix,
      tags: values.tags,
      customTags: values.customTags,
      vol: values.vol,
      noOfPages: values.noOfPages ? Number(values.noOfPages) : null,
      year: values.year ? Number(values.year) : null,
      isbn: values.isbn,
      edition: values.edition,
      bookcatId: values.bookcatId,
      subjectHeadings: values.subjectHeadings,
      callNumber: values.callNumber,
      publisherIds: values.publisherIds.join(","),
      authorIds: values.authorIds.join(","),
      issuedCopies: 0,
      availableCopies: copies,
      noofcopies: copies,
      isActive: true,
      reason: 0,
      bookDetail: [
        {
          noofcopies: copies,
          bookregTypeId: bookTypeSettingId,
          bookAmount: eachBookCost,
          currencyId: values.currencyId,
          amount: totalAmount,
          purchaseSource: values.purchaseSource,
          purchaseReceiptNo: values.purchaseReceiptNo,
          dateOfPurchase: values.dateOfPurchase,
          availabilityStatus: 1,
          bookTitle: values.title,
          bookVol: values.vol,
          isActive: true,
          libraryId: values.libraryId,
        },
      ],
      bookPurchaseDetails: [
        {
          amount: totalAmount,
          bookAmount: eachBookCost,
          currencyId: values.currencyId,
          dateOfPurchase: values.dateOfPurchase,
          isActive: true,
          noOfBooks: copies,
          purchaseReceiptNo: values.purchaseReceiptNo,
          purchaseSource: values.purchaseSource,
        },
      ],
    };

    try {
      await createLibraryBook(payload);
      if (receiptFile) {
        // Angular selects this file but does not upload it in addBooksList().
      }
      toastSuccess("Book added successfully");
      router.push("/library/books");
    } catch (error) {
      toastError(error, "Could not add book");
    }
  }

  const inputField = (
    name: keyof FormValues,
    label: string,
    options?: { type?: string; placeholder?: string },
  ) => (
    <div className="space-y-1">
      <Label className={LIBRARY_FIELD_LABEL_CLASS}>{label}</Label>
      <Input
        type={options?.type}
        className={LIBRARY_INPUT_CLASS}
        placeholder={options?.placeholder ?? `Enter ${label.toLowerCase()}`}
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
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: step === 1 ? "50%" : "100%" }}
          />
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-5">
          <div className="flex items-center justify-between border-b pb-3">
            <h1 className="inline-flex items-center gap-2 text-[15px] font-semibold text-[hsl(var(--card-title))]">
              {step === 1 ? (
                <BookOpen className="h-4 w-4" />
              ) : (
                <Receipt className="h-4 w-4" />
              )}
              {step === 1 ? "Book Info" : "Book Details"}
            </h1>
            <span className="text-xs text-muted-foreground">
              Step {step} of 2
            </span>
          </div>

          {step === 1 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Select
                label="Library"
                required
                value={libraryId ? String(libraryId) : null}
                onChange={(value) => {
                  setValue("libraryId", value ? Number(value) : 0, {
                    shouldValidate: true,
                  });
                  setValue("bookcatId", 0);
                  setValue("authorIds", []);
                  setValue("publisherIds", []);
                }}
                options={libraryOptions}
                placeholder="Select library"
                error={errors.libraryId?.message}
              />
              <div className="sm:col-span-2">
                <Label className={LIBRARY_FIELD_LABEL_CLASS}>
                  Book Title *
                </Label>
                <Input
                  className={LIBRARY_INPUT_CLASS}
                  placeholder="Enter book title"
                  {...register("title")}
                />
                {errors.title && (
                  <p className="text-xs text-destructive">
                    {errors.title.message}
                  </p>
                )}
              </div>
              <MultiSelect
                label="Publisher"
                value={watch("publisherIds")}
                onChange={(value) => setValue("publisherIds", value)}
                options={publisherOptions}
                placeholder="Select publisher"
              />
              <MultiSelect
                label="Author"
                value={watch("authorIds")}
                onChange={(value) => setValue("authorIds", value)}
                options={authorOptions}
                placeholder="Select author"
              />
              <Select
                label="Department Name"
                required
                value={watch("bookcatId") ? String(watch("bookcatId")) : null}
                onChange={(value) =>
                  setValue("bookcatId", value ? Number(value) : 0, {
                    shouldValidate: true,
                  })
                }
                options={departmentOptions}
                placeholder="Select department"
                disabled={!libraryId}
                error={errors.bookcatId?.message}
              />
              <Select
                label="Language"
                required
                value={watch("languageId") ? String(watch("languageId")) : null}
                onChange={(value) =>
                  setValue("languageId", value ? Number(value) : 0, {
                    shouldValidate: true,
                  })
                }
                options={generalDetailOptions(languages)}
                placeholder="Select language"
                error={errors.languageId?.message}
              />
              {inputField("noOfPages", "No of pages", { type: "number" })}
              {inputField("libraryRefPrefix", "Library Reference Prefix")}
              {inputField("tags", "Tags")}
              {inputField("customTags", "Custom Tags")}
              {inputField("isbn", "ISBN")}
              {inputField("year", "Year", { type: "number" })}
              {inputField("edition", "Edition")}
              {inputField("vol", "Volume")}
              <Select
                label="Bind Type"
                value={watch("bindingTypeId")}
                onChange={(value) => setValue("bindingTypeId", value)}
                options={generalDetailOptions(bindTypes)}
                placeholder="Select bind type"
                clearable
              />
              {inputField("subjectHeadings", "Subject Headings")}
              {inputField("callNumber", "Call Number")}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Select
                  label="Book Registration Type"
                  required
                  value={bookregTypeId ? String(bookregTypeId) : null}
                  onChange={(value) =>
                    setValue("bookregTypeId", value ? Number(value) : 0, {
                      shouldValidate: true,
                    })
                  }
                  options={generalDetailOptions(registrationTypes)}
                  placeholder="Select registration type"
                  error={errors.bookregTypeId?.message}
                />
                <div className="space-y-1">
                  <Label className={LIBRARY_FIELD_LABEL_CLASS}>
                    Last Accession Number
                  </Label>
                  <Input
                    className={LIBRARY_INPUT_CLASS}
                    {...register("valueLstAccNo")}
                    disabled
                  />
                </div>
                {inputField("noofcopies", "No of Copies", { type: "number" })}
                {inputField("bookAmount", "Each Book Cost", { type: "number" })}
              </div>
              <div className="space-y-4 border-t pt-4">
                <h2 className="text-[14px] font-semibold text-[hsl(var(--card-title))]">
                  Book Purchase Details
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Select
                    label="Currency Types"
                    required
                    value={
                      watch("currencyId") ? String(watch("currencyId")) : null
                    }
                    onChange={(value) =>
                      setValue("currencyId", value ? Number(value) : 0, {
                        shouldValidate: true,
                      })
                    }
                    options={generalDetailOptions(currencies)}
                    placeholder="Select currency"
                    error={errors.currencyId?.message}
                  />
                  {inputField("amount", "Total Amount", { type: "number" })}
                  {inputField("purchaseSource", "Purchase Source")}
                  {inputField("purchaseReceiptNo", "Receipt No")}
                  <DatePicker
                    label="Date Of Purchase"
                    value={watch("dateOfPurchase")}
                    onChange={(date) => setValue("dateOfPurchase", date)}
                    placeholder="Select purchase date"
                  />
                  <div className="space-y-1">
                    <Label className={LIBRARY_FIELD_LABEL_CLASS}>
                      Receipt File
                    </Label>
                    <Input
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      className={LIBRARY_INPUT_CLASS}
                      onChange={(event) =>
                        setReceiptFile(event.target.files?.[0] ?? null)
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => (step === 1 ? router.back() : setStep(1))}
            >
              Back
            </Button>
            {step === 1 ? (
              <Button type="button" onClick={() => void goNext()}>
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
                Submit
              </Button>
            )}
          </div>
        </form>
      </div>
    </PageContainer>
  );
}
