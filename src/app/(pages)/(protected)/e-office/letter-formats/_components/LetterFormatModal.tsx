"use client";

import { useEffect, useState } from "react";
import { FormModal } from "@/common/components/feedback";
import { RichTextEditor } from "@/common/components/rich-text-editor";
import { ActiveStatusField } from "@/common/components/forms";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { OfficeLetterFormatRow } from "@/types/e-office";

export type LetterFormatModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (payload: OfficeLetterFormatRow) => Promise<void>;
  organizationId: number;
  collegeId: number;
  initial?: OfficeLetterFormatRow | null;
  isSubmitting?: boolean;
};

type ContentKind = "html" | "message" | "email";

function detectContentKind(row?: OfficeLetterFormatRow | null): ContentKind {
  if (!row) return "html";
  if (row.messageContent) return "message";
  if (row.emailContent) return "email";
  return "html";
}

function editorValue(
  row: OfficeLetterFormatRow | null | undefined,
  kind: ContentKind,
): string {
  if (!row) return "";
  if (kind === "message") return row.messageContent ?? "";
  if (kind === "email") return row.emailContent ?? "";
  return row.htmlContent ?? "";
}

export function LetterFormatModal({
  open,
  onClose,
  onSave,
  organizationId,
  collegeId,
  initial,
  isSubmitting,
}: LetterFormatModalProps) {
  const isEdit = Boolean(initial?.officeLetterFormatsId);
  const [formatCode, setFormatCode] = useState("");
  const [formatDescription, setFormatDescription] = useState("");
  const [contentKind, setContentKind] = useState<ContentKind>("html");
  const [editorHtml, setEditorHtml] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [reason, setReason] = useState("active");
  const [errors, setErrors] = useState<{
    formatCode?: string;
    formatDescription?: string;
  }>({});

  useEffect(() => {
    if (!open) return;
    setFormatCode(initial?.formatCode ?? "");
    setFormatDescription(initial?.formatDescription ?? "");
    const kind = detectContentKind(initial);
    setContentKind(kind);
    setEditorHtml(editorValue(initial, kind));
    setIsActive(initial?.isActive ?? true);
    setReason(initial?.reason ?? "active");
    setErrors({});
  }, [open, initial]);

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const next: { formatCode?: string; formatDescription?: string } = {};
    if (!formatCode.trim()) next.formatCode = "Format Code is required";
    if (!formatDescription.trim()) {
      next.formatDescription = "Format Description is required";
    }
    setErrors(next);
    if (next.formatCode || next.formatDescription) return;

    const payload: OfficeLetterFormatRow = {
      organizationId,
      collegeId,
      formatCode: formatCode.trim(),
      formatDescription: formatDescription.trim(),
      htmlContent: contentKind === "html" ? editorHtml : "",
      messageContent: contentKind === "message" ? editorHtml : "",
      emailContent: contentKind === "email" ? editorHtml : "",
      isActive,
      reason: isActive ? "active" : reason,
      officeLetterFormatsId: initial?.officeLetterFormatsId,
    };
    await onSave(payload);
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Format" : "Add Format"}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel="Save"
      cancelLabel="Cancel"
      size="xl"
      titleClassName="text-[15px] font-semibold leading-none text-[#5da394]"
      contentClassName="sm:max-w-6xl max-h-[min(42rem,92vh)] overflow-hidden flex flex-col gap-0"
      formClassName="space-y-3 overflow-hidden py-1"
      showHeaderDivider
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="formatCode" className="text-[12px]">
            Format Code <span className="text-destructive">*</span>
          </Label>
          <Input
            id="formatCode"
            className="h-9 text-[12px]"
            value={formatCode}
            onChange={(ev) => {
              setFormatCode(ev.target.value);
              if (errors.formatCode) {
                setErrors((prev) => ({ ...prev, formatCode: undefined }));
              }
            }}
            placeholder="Enter Format Code"
          />
          {errors.formatCode ? (
            <p className="text-xs text-destructive">{errors.formatCode}</p>
          ) : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor="formatDescription" className="text-[12px]">
            Format Description <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="formatDescription"
            className="min-h-[72px] resize-y text-[12px]"
            rows={3}
            value={formatDescription}
            onChange={(ev) => {
              setFormatDescription(ev.target.value);
              if (errors.formatDescription) {
                setErrors((prev) => ({
                  ...prev,
                  formatDescription: undefined,
                }));
              }
            }}
            placeholder="Enter Format Description"
          />
          {errors.formatDescription ? (
            <p className="text-xs text-destructive">
              {errors.formatDescription}
            </p>
          ) : null}
        </div>
      </div>

      <RadioGroup
        value={contentKind}
        onValueChange={(v) => setContentKind(v as ContentKind)}
        className="flex flex-wrap gap-4"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="html" id="content-html" />
          <Label
            htmlFor="content-html"
            className="cursor-pointer text-[12px] font-normal"
          >
            HTML CONTENT
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="message" id="content-message" />
          <Label
            htmlFor="content-message"
            className="cursor-pointer text-[12px] font-normal"
          >
            MESSAGE CONTENT
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="email" id="content-email" />
          <Label
            htmlFor="content-email"
            className="cursor-pointer text-[12px] font-normal"
          >
            EMAIL CONTENT
          </Label>
        </div>
      </RadioGroup>

      <div className="space-y-1">
        <RichTextEditor
          value={editorHtml}
          onChange={setEditorHtml}
          minHeight={160}
          className="[&_.ProseMirror]:min-h-[160px] [&_.ProseMirror]:max-h-[220px] [&_.ProseMirror]:overflow-y-auto"
        />
        <p className="text-[11px] text-amber-600">Maximum word limit 350.</p>
      </div>

      <ActiveStatusField
        isActive={isActive}
        onActiveChange={(v) => setIsActive(v === true)}
        reason={reason}
        onReasonChange={setReason}
      />
    </FormModal>
  );
}
