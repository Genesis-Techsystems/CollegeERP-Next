"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ActiveStatusField } from "@/common/components/forms";
import { FormModal } from "@/common/components/feedback";
import { Select, type SelectOption } from "@/common/components/select";
import { LIBRARY_MODAL_TITLE_CLASS } from "../_lib/modal-styles";
import {
  createLibraryBookCategory,
  listActiveOrganizationsForLibrary,
  listLibraryCategoriesByOrganization,
  listLibraryDetailsByOrganization,
  updateLibraryBookCategory,
} from "@/services";
import type { LibraryBookCategory } from "@/types/library";
import { toastError, toastSuccess } from "@/lib/toast";

function requiredId(label: string) {
  const message = `${label} is required`;
  return z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined)
        return undefined;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    },
    z.number({ error: message }).min(1, message),
  );
}

const schema = z.object({
  organizationId: requiredId("Organization"),
  libraryId: requiredId("Library"),
  libCategoryId: requiredId("Library category"),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface BookDepartmentModalProps {
  open: boolean;
  onClose: () => void;
  row: LibraryBookCategory | null;
  onSaved: () => void;
}

export function BookDepartmentModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<BookDepartmentModalProps>) {
  const isEditing = row != null;
  const [organizations, setOrganizations] = useState<SelectOption[]>([]);
  const [libraries, setLibraries] = useState<SelectOption[]>([]);
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [loadingLibraries, setLoadingLibraries] = useState(false);

  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      organizationId: undefined,
      libraryId: undefined,
      libCategoryId: undefined,
      isActive: true,
      reason: "active",
    },
  });

  const organizationId = watch("organizationId");

  useEffect(() => {
    if (!open) return;
    void listActiveOrganizationsForLibrary()
      .then((rows) => {
        setOrganizations(
          rows.map((organization) => ({
            value: String(organization.organizationId),
            label: String(
              organization.orgCode ??
                organization.orgName ??
                organization.organizationId,
            ),
          })),
        );
      })
      .catch((error) => toastError(error, "Failed to load organizations"));
    reset(
      row
        ? {
            organizationId: row.organizationId,
            libraryId: row.libraryId,
            libCategoryId: row.libCategoryId,
            isActive: row.isActive ?? true,
            reason: row.reason ?? "active",
          }
        : {
            organizationId: undefined,
            libraryId: undefined,
            libCategoryId: undefined,
            isActive: true,
            reason: "active",
          },
    );
  }, [open, row, reset]);

  useEffect(() => {
    if (!open || !organizationId) {
      setLibraries([]);
      setCategories([]);
      return;
    }
    setLoadingLibraries(true);
    void Promise.all([
      listLibraryDetailsByOrganization(organizationId),
      listLibraryCategoriesByOrganization(organizationId),
    ])
      .then(([libraryRows, categoryRows]) => {
        setLibraries(
          libraryRows.map((library) => ({
            value: String(library.libraryId),
            label: String(
              library.libraryCode ?? library.libraryName ?? library.libraryId,
            ),
          })),
        );
        setCategories(
          categoryRows.map((category) => ({
            value: String(category.libCategoryId),
            label: String(category.bookCategoryCode ?? category.libCategoryId),
          })),
        );
      })
      .catch((error) => toastError(error, "Failed to load library options"))
      .finally(() => setLoadingLibraries(false));
  }, [open, organizationId]);

  async function onSubmit(data: FormValues) {
    const payload = {
      ...data,
      reason: data.isActive ? "active" : data.reason?.trim() || "inactive",
      ...(isEditing && row?.bookcatId ? { bookcatId: row.bookcatId } : {}),
    };
    try {
      if (isEditing && row?.bookcatId) {
        await updateLibraryBookCategory(row.bookcatId, payload);
        toastSuccess("Book department updated");
      } else {
        await createLibraryBookCategory(payload);
        toastSuccess("Book department created");
      }
      onSaved();
      onClose();
    } catch (err) {
      toastError(
        err,
        `Failed to ${isEditing ? "update" : "create"} book department`,
      );
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Book Department" : "Add Book Department"}
      titleClassName={LIBRARY_MODAL_TITLE_CLASS}
      showHeaderDivider
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
      submitLabel="Save"
      cancelLabel="Cancel"
      isSubmitting={isSubmitting}
      size="lg"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label="Organization"
          required
          value={organizationId ? String(organizationId) : null}
          onChange={(value) => {
            setValue("organizationId", value ? Number(value) : 0);
            setValue("libraryId", 0);
            setValue("libCategoryId", 0);
          }}
          options={organizations}
          placeholder="Select organization"
          searchable
          error={errors.organizationId?.message}
        />
        <Select
          label="Library"
          required
          value={watch("libraryId") ? String(watch("libraryId")) : null}
          onChange={(value) => setValue("libraryId", value ? Number(value) : 0)}
          options={libraries}
          placeholder="Select library"
          searchable
          isLoading={loadingLibraries}
          disabled={!organizationId}
          error={errors.libraryId?.message}
        />
        <div className="sm:col-span-2">
          <Select
            label="Library Category"
            required
            value={
              watch("libCategoryId") ? String(watch("libCategoryId")) : null
            }
            onChange={(value) =>
              setValue("libCategoryId", value ? Number(value) : 0)
            }
            options={categories}
            placeholder="Select category"
            searchable
            isLoading={loadingLibraries}
            disabled={!organizationId}
            error={errors.libCategoryId?.message}
          />
        </div>
        <div className="sm:col-span-2">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveStatusField
                isActive={field.value}
                reason={watch("reason") ?? ""}
                onActiveChange={field.onChange}
                onReasonChange={(v) => setValue("reason", String(v))}
                reasonError={errors.reason?.message}
              />
            )}
          />
        </div>
      </div>
    </FormModal>
  );
}
