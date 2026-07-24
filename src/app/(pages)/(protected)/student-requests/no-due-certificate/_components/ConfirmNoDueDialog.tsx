"use client";

import { useEffect, useState } from "react";
import { FormModal } from "@/common/components/feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ConfirmNoDueDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
  /** Angular MAT_DIALOG_DATA label — defaults to "No Due". */
  certificateLabel?: string;
  /** Angular Id Card: hide reason field and submit defaultReason. */
  hideReasonField?: boolean;
  /** Pre-filled / hidden reason (Angular Id Card uses "idcard"). */
  defaultReason?: string;
}

/**
 * Angular `ConfirmNodueComponent` — confirm apply + required reason.
 * Optional props support Id Card (hidden reason, label "Id Card") without
 * changing the default No Due UI.
 */
export function ConfirmNoDueDialog({
  open,
  onClose,
  onConfirm,
  loading = false,
  certificateLabel = "No Due",
  hideReasonField = false,
  defaultReason = "",
}: Readonly<ConfirmNoDueDialogProps>) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) {
      setReason("");
      return;
    }
    if (hideReasonField && defaultReason) {
      setReason(defaultReason);
    }
  }, [open, hideReasonField, defaultReason]);

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Confirmation"
      description={`Are you sure, you want to apply for '${certificateLabel}'?`}
      submitLabel="Save"
      cancelLabel="Close"
      isSubmitting={loading}
      onSubmit={() => {
        const trimmed = (hideReasonField ? defaultReason || reason : reason).trim();
        if (!hideReasonField && !trimmed) return;
        onConfirm(trimmed || "idcard");
      }}
    >
      {!hideReasonField ? (
        <div className="space-y-1.5">
          <Label htmlFor="no-due-reason">
            Reason <span className="text-destructive">*</span>
          </Label>
          <Input
            id="no-due-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason"
            required
            disabled={loading}
            aria-required
          />
          {!reason.trim() ? (
            <p className="text-xs text-muted-foreground">Reason is required.</p>
          ) : null}
        </div>
      ) : null}
    </FormModal>
  );
}
