"use client";

import { useEffect, useState } from "react";
import { DatePicker } from "@/common/components/date-picker";
import { FormModal } from "@/common/components/feedback";
import { ActiveStatusField, FormField } from "@/common/components/forms";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createSelfAppraisalContribution,
  updateSelfAppraisalContribution,
} from "@/services";

type AnyRow = Record<string, unknown>;

interface Props {
  open: boolean;
  row: AnyRow | null;
  employeeId: number;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY = {
  title: "",
  publishedDate: new Date(),
  issnIsbnScopusNo: "",
  noofCoAuthors: "",
  pagenos: "",
  otherInfo: "",
  isMainAuthor: false,
  isActive: true,
  reason: "active",
};

export function AppraisalContributionModal({
  open,
  row,
  employeeId,
  onClose,
  onSaved,
}: Readonly<Props>) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const isEditing = Number(row?.empContributionId ?? 0) > 0;

  useEffect(() => {
    if (!open) return;
    setForm(
      row
        ? {
            title: String(row.title ?? ""),
            publishedDate: row.publishedDate
              ? new Date(String(row.publishedDate))
              : new Date(),
            issnIsbnScopusNo: String(row.issnIsbnScopusNo ?? ""),
            noofCoAuthors: String(row.noofCoAuthors ?? ""),
            pagenos: String(row.pagenos ?? ""),
            otherInfo: String(row.otherInfo ?? ""),
            isMainAuthor: Boolean(row.isMainAuthor),
            isActive: row.isActive !== false,
            reason: String(row.reason ?? "active"),
          }
        : EMPTY,
    );
  }, [open, row]);

  const set = <K extends keyof typeof EMPTY>(
    key: K,
    value: (typeof EMPTY)[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  async function submit() {
    if (!form.title.trim()) return;
    const payload: AnyRow = {
      ...(row ?? {}),
      ...form,
      title: form.title.trim(),
      employeeId,
      noofCoAuthors: form.noofCoAuthors
        ? Number(form.noofCoAuthors)
        : null,
      reason: form.isActive ? "active" : form.reason.trim() || "inactive",
    };
    setSaving(true);
    try {
      if (isEditing) {
        await updateSelfAppraisalContribution(
          Number(row!.empContributionId),
          payload,
        );
      } else {
        await createSelfAppraisalContribution(payload);
      }
      toastSuccess(
        isEditing ? "Contribution updated." : "Contribution added.",
      );
      onSaved();
      onClose();
    } catch (error) {
      toastError(error, "Failed to save contribution");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Contribution" : "Add Contribution"}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      isSubmitting={saving}
      size="lg"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Title" required className="sm:col-span-2">
          <Input
            value={form.title}
            onChange={(event) => set("title", event.target.value)}
          />
        </FormField>
        <DatePicker
          label="Publish Date"
          value={form.publishedDate}
          onChange={(date) => date && set("publishedDate", date)}
        />
        <FormField label="ISSN/ISBN No./SCOPUS No.">
          <Input
            value={form.issnIsbnScopusNo}
            onChange={(event) =>
              set("issnIsbnScopusNo", event.target.value)
            }
          />
        </FormField>
        <FormField label="No. of Co-Authors">
          <Input
            type="number"
            value={form.noofCoAuthors}
            onChange={(event) => set("noofCoAuthors", event.target.value)}
          />
        </FormField>
        <FormField label="Whether peer reviewed - impact factor and citations">
          <Input
            value={form.pagenos}
            onChange={(event) => set("pagenos", event.target.value)}
          />
        </FormField>
        <FormField
          label="Any other relevant information"
          className="sm:col-span-2"
        >
          <Input
            value={form.otherInfo}
            onChange={(event) => set("otherInfo", event.target.value)}
          />
        </FormField>
        <div className="flex items-center gap-2">
          <Checkbox
            id="is-main-author"
            checked={form.isMainAuthor}
            onCheckedChange={(value) => set("isMainAuthor", value === true)}
          />
          <Label htmlFor="is-main-author">Whether you are the main author</Label>
        </div>
        <div className="sm:col-span-2">
          <ActiveStatusField
            isActive={form.isActive}
            reason={form.reason}
            onActiveChange={(value) => set("isActive", value === true)}
            onReasonChange={(value) => set("reason", value)}
          />
        </div>
      </div>
    </FormModal>
  );
}
