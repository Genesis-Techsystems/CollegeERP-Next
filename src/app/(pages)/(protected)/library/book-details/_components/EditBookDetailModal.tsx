"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { ActiveStatusField } from "@/common/components/forms";
import { FormModal } from "@/common/components/feedback";
import { Select, type SelectOption } from "@/common/components/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  checkLibraryAccessionNumber,
  listBookRegistrationTypes,
  listLibraryRacksByLibrary,
  listReturnBookConditions,
  updateLibraryBookDetail,
  type LibraryRow,
} from "@/services";
import {
  LIBRARY_FIELD_LABEL_CLASS,
  LIBRARY_INPUT_CLASS,
  LIBRARY_MODAL_TITLE_CLASS,
} from "../../_lib/modal-styles";

const schema = z.object({
  accessionno: z.string(),
  bookregTypeId: z.coerce.number().min(1, "Book registration type is required"),
  libraryRefNumber: z.string().optional(),
  shelveId: z.string().optional(),
  bookPosition: z.string().optional(),
  bookAmount: z.coerce.number().min(0, "Book amount is required"),
  bookconditionId: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string(),
});

type FormValues = z.infer<typeof schema>;

function toSelectOptions(rows: {
  generalDetailId?: number;
  generalDetailDisplayName?: string;
}[]): SelectOption[] {
  return rows.map((r) => ({
    value: String(r.generalDetailId ?? ""),
    label: String(r.generalDetailDisplayName ?? r.generalDetailId ?? ""),
  }));
}

interface EditBookDetailModalProps {
  open: boolean;
  onClose: () => void;
  row: LibraryRow | null;
  onSaved: () => void;
}

export function EditBookDetailModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<EditBookDetailModalProps>) {
  const libraryId = Number(row?.libraryId ?? 0);
  const bookDetailsId = Number(row?.bookDetailsId ?? row?.bookDetailId ?? 0);
  const bookId = Number(row?.bookId ?? 0);

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
      accessionno: "",
      bookregTypeId: undefined,
      libraryRefNumber: "",
      shelveId: "",
      bookPosition: "",
      bookAmount: 0,
      bookconditionId: "",
      isActive: true,
      reason: "active",
    },
  });

  const { data: regTypes = [] } = useQuery({
    queryKey: ["Library", "bookRegTypes", "edit-book-detail"],
    queryFn: listBookRegistrationTypes,
    enabled: open,
  });

  const { data: bookConditions = [] } = useQuery({
    queryKey: ["Library", "returnBookConditions", "edit-book-detail"],
    queryFn: listReturnBookConditions,
    enabled: open,
  });

  const { data: racks = [], isLoading: loadingRacks } = useQuery({
    queryKey: ["Library", "racks", libraryId, "edit-book-detail"],
    queryFn: () => listLibraryRacksByLibrary(libraryId),
    enabled: open && libraryId > 0,
  });

  const regTypeOptions = useMemo(() => toSelectOptions(regTypes), [regTypes]);
  const conditionOptions = useMemo(
    () => toSelectOptions(bookConditions),
    [bookConditions],
  );
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
    reset({
      accessionno: String(row.accessionno ?? ""),
      bookregTypeId: Number(row.bookregTypeId ?? 0) || undefined,
      libraryRefNumber: String(row.libraryRefNumber ?? ""),
      shelveId: row.shelveId != null ? String(row.shelveId) : "",
      bookPosition: String(row.bookPosition ?? ""),
      bookAmount: Number(row.bookAmount ?? 0),
      bookconditionId:
        row.bookconditionId != null ? String(row.bookconditionId) : "",
      isActive: row.isActive !== false,
      reason: String(row.reason ?? (row.isActive === false ? "" : "active")),
    });
  }, [open, row, reset]);

  async function onSubmit(values: FormValues) {
    if (!bookDetailsId || !bookId || !libraryId) return;
    const originalAccession = String(row?.accessionno ?? "");
    const payload = {
      bookDetailsId,
      bookId,
      libraryId,
      accessionno: values.accessionno,
      bookregTypeId: values.bookregTypeId,
      libraryRefNumber: values.libraryRefNumber?.trim() ?? "",
      shelveId: values.shelveId ? Number(values.shelveId) : "",
      bookPosition: values.bookPosition?.trim() ?? "",
      bookAmount: values.bookAmount,
      bookconditionId: values.bookconditionId
        ? Number(values.bookconditionId)
        : "",
      availabilityStatus: Number(row?.availabilityStatus ?? 1),
      isActive: values.isActive,
      reason: values.reason,
      bookbarCode: String(row?.bookbarCode ?? row?.bookBarcode ?? ""),
    };

    try {
      if (
        values.accessionno.trim() &&
        values.accessionno.trim() !== originalAccession
      ) {
        await checkLibraryAccessionNumber(values.accessionno.trim(), libraryId);
      }
      await updateLibraryBookDetail(payload);
      toastSuccess("Book details updated");
      onSaved();
      onClose();
    } catch (error) {
      toastError(error, "Failed to update book details");
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Edit Book Details"
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>Accession No</Label>
          <Input
            className={LIBRARY_INPUT_CLASS}
            placeholder="Accession No"
            readOnly
            {...register("accessionno")}
          />
        </div>

        <div className="space-y-1.5">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>
            Book Registration Type <span className="text-destructive">*</span>
          </Label>
          <Select
            value={
              watch("bookregTypeId") ? String(watch("bookregTypeId")) : ""
            }
            onChange={(v) => setValue("bookregTypeId", Number(v))}
            options={regTypeOptions}
            placeholder="Book Registration Type"
            searchable
          />
          {errors.bookregTypeId && (
            <p className="text-xs text-destructive">
              {errors.bookregTypeId.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>
            Library Reference Number
          </Label>
          <Input
            className={LIBRARY_INPUT_CLASS}
            placeholder="Library Reference Number"
            {...register("libraryRefNumber")}
          />
        </div>

        <div className="space-y-1.5">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>Rack</Label>
          <Select
            value={watch("shelveId") ?? ""}
            onChange={(v) => setValue("shelveId", v ?? "")}
            options={rackOptions}
            placeholder="Rack"
            searchable
            clearable
            isLoading={loadingRacks}
          />
        </div>

        <div className="space-y-1.5">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>Book Position</Label>
          <Input
            className={LIBRARY_INPUT_CLASS}
            placeholder="Book Position"
            {...register("bookPosition")}
          />
        </div>

        <div className="space-y-1.5">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>
            Book Amount <span className="text-destructive">*</span>
          </Label>
          <Input
            className={LIBRARY_INPUT_CLASS}
            type="number"
            placeholder="Book Amount"
            {...register("bookAmount")}
          />
          {errors.bookAmount && (
            <p className="text-xs text-destructive">
              {errors.bookAmount.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className={LIBRARY_FIELD_LABEL_CLASS}>Book Condition</Label>
          <Select
            value={watch("bookconditionId") ?? ""}
            onChange={(v) => setValue("bookconditionId", v ?? "")}
            options={conditionOptions}
            placeholder="Book Condition"
            searchable
            clearable
          />
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch("reason")}
                onActiveChange={(v) => {
                  const active = Boolean(v);
                  field.onChange(active);
                  setValue("reason", active ? "active" : "");
                }}
                onReasonChange={(v) => setValue("reason", v)}
                reasonError={errors.reason?.message}
              />
            )}
          />
        </div>
      </div>
    </FormModal>
  );
}
