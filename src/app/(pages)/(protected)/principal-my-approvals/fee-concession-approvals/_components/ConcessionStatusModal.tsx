"use client";

import { useEffect, useState } from "react";
import { FormModal } from "@/common/components/feedback";
import { Select, type SelectOption } from "@/common/components/select";
import { Label } from "@/components/ui/label";
import { toastError } from "@/lib/toast";
import { getFeeStudentDataForConcessionApproval } from "@/services";
import type { FeeConcessionApprovalRow } from "@/types/fees-collection";

export type ConcessionStatusResult = {
  concession: "APPROVE" | "REJECT";
  feeStdDataId?: number;
};

interface ConcessionStatusModalProps {
  open: boolean;
  row: FeeConcessionApprovalRow | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (result: ConcessionStatusResult) => void;
}

const STATUS_OPTIONS: SelectOption[] = [
  { value: "APPROVE", label: "Approve" },
  { value: "REJECT", label: "Reject" },
];

/**
 * Angular `ConcessionStatusComponent` — Approve / Reject dialog.
 */
export function ConcessionStatusModal({
  open,
  row,
  saving = false,
  onClose,
  onSave,
}: Readonly<ConcessionStatusModalProps>) {
  const [concession, setConcession] = useState<string>("");
  const [feeStdDataId, setFeeStdDataId] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !row) return;

    setConcession("");
    setFeeStdDataId(undefined);
    setError(null);

    const collegeId = Number(row.collegeId ?? 0);
    const studentId = Number(row.studentId ?? 0);
    const feeStructureId = Number(row.feeStructureId ?? 0);
    if (!collegeId || !studentId || !feeStructureId) return;

    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const data = await getFeeStudentDataForConcessionApproval({
          collegeId,
          studentId,
          feeStructureId,
        });
        if (cancelled) return;
        setFeeStdDataId(
          data?.feeStdDataId != null ? Number(data.feeStdDataId) : undefined,
        );
      } catch (e) {
        if (!cancelled) toastError(e, "Failed to load fee student data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, row]);

  function handleSave() {
    if (!concession) {
      setError("Fee Concession Status is required");
      return;
    }
    setError(null);
    onSave({
      concession: concession as "APPROVE" | "REJECT",
      feeStdDataId,
    });
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Concession Status"
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      submitLabel="Save"
      cancelLabel="Close"
      isSubmitting={loading || saving}
      size="md"
    >
      <div className="space-y-2">
        <Label>
          Fee Concession Status <span className="text-destructive">*</span>
        </Label>
        <Select
          value={concession || null}
          onChange={(v) => {
            setConcession(v ?? "");
            setError(null);
          }}
          options={STATUS_OPTIONS}
          placeholder="Fee Concession Status"
          searchable={false}
          clearable={false}
          disabled={loading || saving}
        />
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
      </div>
    </FormModal>
  );
}
