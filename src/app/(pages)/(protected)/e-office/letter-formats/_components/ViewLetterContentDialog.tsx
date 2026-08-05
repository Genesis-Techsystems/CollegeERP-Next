"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { OfficeLetterFormatRow } from "@/types/e-office";

/**
 * Mirrors Fuse `htmlToPlaintext` pipe used by Angular letter-format view-content.
 * Strips real tags + &nbsp; only — does not decode &lt;/&gt; (Angular keeps those visible).
 */
function angularHtmlToPlaintext(value: string): string {
  if (!value) return "";
  return value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");
}

/** Angular view-content: email → html → message. */
function resolveEditorText(row: OfficeLetterFormatRow | null): string {
  if (!row) return "";
  if (row.emailContent != null && row.emailContent !== "")
    return row.emailContent;
  if (row.htmlContent != null && row.htmlContent !== "") return row.htmlContent;
  if (row.messageContent != null && row.messageContent !== "")
    return row.messageContent;
  return "";
}

export function ViewLetterContentDialog({
  open,
  onClose,
  row,
  orgCode,
  collegeCode,
}: {
  open: boolean;
  onClose: () => void;
  row: OfficeLetterFormatRow | null;
  orgCode?: string;
  collegeCode?: string;
}) {
  const plain = angularHtmlToPlaintext(resolveEditorText(row));
  const context =
    orgCode || collegeCode
      ? ` (${[orgCode, collegeCode].filter(Boolean).join(" / ")})`
      : "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>View Format{context}</DialogTitle>
        </DialogHeader>
        <div className="px-1 py-2">
          <p className="break-words text-sm leading-relaxed text-foreground">
            {plain || "No content"}
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
