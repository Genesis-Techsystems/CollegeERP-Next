"use client";

import { useEffect } from "react";
import { format } from "date-fns";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DatePicker } from "@/common/components/date-picker";
import { FormModal } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateLibraryMembership } from "@/services";
import type { LibraryMembership } from "@/types/library";
import { toastError, toastSuccess } from "@/lib/toast";
import { useLibraryOrgLibraryOptions } from "../../_hooks/use-library-org-library";
import {
  LIBRARY_INPUT_CLASS,
  LIBRARY_MODAL_TITLE_CLASS,
} from "../../_lib/modal-styles";

const schema = z.object({
  organizationId: z
    .number({ error: "Organization is required" })
    .min(1, "Organization is required"),
  libraryId: z
    .number({ error: "Library is required" })
    .min(1, "Library is required"),
  noOfMaxBooks: z.coerce.number().min(1, "Maximum books is required"),
  memberFromDt: z.date({ error: "From date is required" }),
  memberToDt: z.date({ error: "To date is required" }),
  isFeepaid: z.boolean(),
  isActive: z.boolean(),
  comments: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface EditMembershipModalProps {
  open: boolean;
  row: LibraryMembership | null;
  onClose: () => void;
  onSaved: () => void;
}

export function EditMembershipModal({
  open,
  row,
  onClose,
  onSaved,
}: Readonly<EditMembershipModalProps>) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
  });

  const organizationId = watch("organizationId");
  const { organizations, libraries, loadingLibraries } =
    useLibraryOrgLibraryOptions(organizationId, watch("libraryId"));

  useEffect(() => {
    if (!open || !row) return;
    reset({
      organizationId: Number(row.organizationId ?? 0),
      libraryId: Number(row.libraryId ?? 0),
      noOfMaxBooks: Number(row.noOfMaxBooks ?? 0),
      memberFromDt: row.memberFromDt ? new Date(row.memberFromDt) : new Date(),
      memberToDt: row.memberToDt ? new Date(row.memberToDt) : new Date(),
      isFeepaid: Boolean(row.isFeepaid),
      isActive: row.isActive !== false,
      comments: String(row.comments ?? ""),
    });
  }, [open, reset, row]);

  async function onSubmit(values: FormValues) {
    const id = Number(row?.libMemberId ?? row?.memberShipId ?? 0);
    if (!id) return;
    if (values.memberFromDt > values.memberToDt) {
      toastError("From date should be before or equal to To date.");
      return;
    }
    try {
      await updateLibraryMembership(id, {
        ...values,
        libMemberId: id,
        membertype: row?.membertype,
        memberCode: row?.memberCode ?? row?.membershipNo,
        memberFromDt: format(values.memberFromDt, "yyyy-MM-dd"),
        memberToDt: format(values.memberToDt, "yyyy-MM-dd"),
      });
      toastSuccess("Membership updated successfully");
      onSaved();
      onClose();
    } catch (error) {
      toastError(error, "Failed to update membership");
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={`Edit Membership${row?.memberCode ? ` — ${row.memberCode}` : ""}`}
      titleClassName={LIBRARY_MODAL_TITLE_CLASS}
      showHeaderDivider
      size="lg"
      submitLabel="Save"
      cancelLabel="Cancel"
      isSubmitting={isSubmitting}
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit(onSubmit)();
      }}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Controller
          name="organizationId"
          control={control}
          render={({ field }) => (
            <Select
              label="Organization *"
              value={field.value ? String(field.value) : null}
              onChange={(value) => {
                field.onChange(value ? Number(value) : 0);
                setValue("libraryId", 0);
              }}
              options={organizations}
              placeholder="Select organization"
              error={errors.organizationId?.message}
            />
          )}
        />
        <Controller
          name="libraryId"
          control={control}
          render={({ field }) => (
            <Select
              label="Library *"
              value={field.value ? String(field.value) : null}
              onChange={(value) => field.onChange(value ? Number(value) : 0)}
              options={libraries}
              placeholder="Select library"
              disabled={!organizationId}
              isLoading={loadingLibraries}
              error={errors.libraryId?.message}
            />
          )}
        />
        <div className="space-y-1">
          <Label htmlFor="membershipMaxBooks" className="text-[12px]">
            Max no. of books *
          </Label>
          <Input
            id="membershipMaxBooks"
            type="number"
            min={1}
            className={LIBRARY_INPUT_CLASS}
            placeholder="Enter maximum books"
            {...register("noOfMaxBooks")}
          />
          {errors.noOfMaxBooks ? (
            <p className="text-xs text-destructive">
              {errors.noOfMaxBooks.message}
            </p>
          ) : null}
        </div>
        <div />
        <Controller
          name="memberFromDt"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="From Date"
              required
              value={field.value}
              onChange={field.onChange}
              placeholder="Select from date"
              error={errors.memberFromDt?.message}
            />
          )}
        />
        <Controller
          name="memberToDt"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="To Date"
              required
              value={field.value}
              onChange={field.onChange}
              minDate={watch("memberFromDt")}
              placeholder="Select to date"
              error={errors.memberToDt?.message}
            />
          )}
        />
      </div>
      <div className="flex flex-wrap gap-6">
        <Controller
          name="isFeepaid"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Checkbox
                id="membershipFeePaid"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              <Label htmlFor="membershipFeePaid">Fee Paid</Label>
            </div>
          )}
        />
        <Controller
          name="isActive"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Checkbox
                id="membershipActive"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              <Label htmlFor="membershipActive">Active</Label>
            </div>
          )}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="membershipComments" className="text-[12px]">
          Comments
        </Label>
        <Input
          id="membershipComments"
          className={LIBRARY_INPUT_CLASS}
          placeholder="Enter comments"
          {...register("comments")}
        />
      </div>
    </FormModal>
  );
}
