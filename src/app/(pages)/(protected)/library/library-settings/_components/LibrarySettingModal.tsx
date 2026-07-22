"use client";

import { useEffect, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ActiveStatusField } from "@/common/components/forms";
import { FormModal } from "@/common/components/feedback";
import { Select, type SelectOption } from "@/common/components/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LIBRARY_FIELD_LABEL_CLASS,
  LIBRARY_INPUT_CLASS,
  LIBRARY_MODAL_TITLE_CLASS,
} from "../../_lib/modal-styles";
import { useLibraryOrgLibraryOptions } from "../../_hooks/use-library-org-library";
import {
  createLibrarySetting,
  listLibrarySettingCategories,
  updateLibrarySetting,
} from "@/services";
import type { LibrarySetting } from "@/types/library";
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

const optionalId = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}, z.number().optional());

const schema = z.object({
  organizationId: requiredId("Organization"),
  libraryId: requiredId("Library"),
  settingName: z.string().min(1, "Settings Name is required"),
  value: z.string().min(1, "Value is required"),
  libSettingCatdetId: optionalId,
  isIssue: z.boolean(),
  isFine: z.boolean(),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface LibrarySettingModalProps {
  open: boolean;
  onClose: () => void;
  row: LibrarySetting | null;
  onSaved: () => void;
}

export function LibrarySettingModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<LibrarySettingModalProps>) {
  const isEditing = row != null;
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const {
    register,
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
      settingName: "",
      value: "",
      libSettingCatdetId: undefined,
      isIssue: false,
      isFine: false,
      isActive: true,
      reason: "active",
    },
  });

  const organizationId = watch("organizationId");
  const { organizations, libraries, loadingLibraries } =
    useLibraryOrgLibraryOptions(organizationId, row?.libraryId, open);

  useEffect(() => {
    if (!open) return;
    reset(
      row
        ? {
            organizationId: row.organizationId,
            libraryId: row.libraryId,
            settingName: row.settingName ?? "",
            value: row.value != null ? String(row.value) : "",
            libSettingCatdetId: row.libSettingCatdetId,
            isIssue: row.isIssue ?? false,
            isFine: row.isFine ?? false,
            isActive: row.isActive ?? true,
            reason: row.reason ?? "active",
          }
        : {
            organizationId: undefined,
            libraryId: undefined,
            settingName: "",
            value: "",
            libSettingCatdetId: undefined,
            isIssue: false,
            isFine: false,
            isActive: true,
            reason: "active",
          },
    );
  }, [open, row, reset]);

  useEffect(() => {
    if (!open || !organizationId) {
      setCategories([]);
      return;
    }
    setLoadingCategories(true);
    void listLibrarySettingCategories()
      .then((rows) => {
        setCategories(
          rows.map((item) => ({
            value: String(item.generalDetailId),
            label: String(
              item.generalDetailDisplayName ??
                item.generalDetailCode ??
                item.generalDetailId,
            ),
          })),
        );
      })
      .finally(() => setLoadingCategories(false));
  }, [open, organizationId]);

  async function onSubmit(data: FormValues) {
    const payload = {
      organizationId: data.organizationId,
      libraryId: data.libraryId,
      settingName: data.settingName.trim(),
      value: data.value?.trim() ?? "",
      libSettingCatdetId: data.libSettingCatdetId,
      isIssue: data.isIssue,
      isFine: data.isFine,
      isActive: data.isActive,
      reason: data.isActive ? "active" : data.reason?.trim() || "inactive",
    };
    try {
      if (isEditing && row?.libSettingsId) {
        await updateLibrarySetting(row.libSettingsId, {
          ...payload,
          libSettingsId: row.libSettingsId,
        });
        toastSuccess("Library setting updated");
      } else {
        await createLibrarySetting(payload);
        toastSuccess("Library setting created");
      }
      onSaved();
      onClose();
    } catch (err) {
      toastError(
        err,
        `Failed to ${isEditing ? "update" : "create"} library setting`,
      );
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Library Settings" : "Add Library Settings"}
      titleClassName={LIBRARY_MODAL_TITLE_CLASS}
      showHeaderDivider
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }}
      submitLabel="Save"
      isSubmitting={isSubmitting}
      size="lg"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label="Organization"
          required
          value={organizationId ? String(organizationId) : null}
          onChange={(v) => {
            setValue("organizationId", v ? Number(v) : 0, {
              shouldValidate: true,
            });
            setValue("libraryId", 0);
            setValue("libSettingCatdetId", undefined);
          }}
          options={organizations}
          placeholder="Organization"
          searchable
          error={errors.organizationId?.message}
        />
        <Select
          label="Library"
          required
          value={watch("libraryId") ? String(watch("libraryId")) : null}
          onChange={(v) =>
            setValue("libraryId", v ? Number(v) : 0, { shouldValidate: true })
          }
          options={libraries}
          placeholder="Library"
          searchable
          isLoading={loadingLibraries}
          disabled={!organizationId}
          error={errors.libraryId?.message}
        />

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="settingName" className={LIBRARY_FIELD_LABEL_CLASS}>
            Settings Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="settingName"
            className={LIBRARY_INPUT_CLASS}
            placeholder="Settings Name"
            {...register("settingName")}
          />
          {errors.settingName && (
            <p className="text-xs text-destructive">
              {errors.settingName.message}
            </p>
          )}
        </div>

        <Select
          label="Settings Category"
          value={
            watch("libSettingCatdetId")
              ? String(watch("libSettingCatdetId"))
              : null
          }
          onChange={(v) =>
            setValue("libSettingCatdetId", v ? Number(v) : undefined)
          }
          options={categories}
          placeholder="Settings Category"
          searchable
          clearable
          isLoading={loadingCategories}
          disabled={!organizationId}
        />

        <div className="space-y-1.5">
          <Label htmlFor="value" className={LIBRARY_FIELD_LABEL_CLASS}>
            Value <span className="text-destructive">*</span>
          </Label>
          <Input
            id="value"
            className={LIBRARY_INPUT_CLASS}
            placeholder="Value"
            {...register("value")}
          />
          {errors.value && (
            <p className="text-xs text-destructive">{errors.value.message}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
          <Controller
            name="isIssue"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2 text-[12px]">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                />
                Issue
              </label>
            )}
          />
          <Controller
            name="isFine"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2 text-[12px]">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                />
                Fine
              </label>
            )}
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
