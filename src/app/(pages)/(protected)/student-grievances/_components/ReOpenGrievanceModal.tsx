"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FormModal } from "@/common/components/feedback";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QK } from "@/lib/query-keys";
import { listComplaintWorkflowStages } from "@/services";

type AnyRow = Record<string, unknown>;

type Props = {
  open: boolean;
  row: AnyRow | null;
  onClose: () => void;
  isSubmitting?: boolean;
  onSubmit: (payload: AnyRow) => void | Promise<void>;
};

export function ReOpenGrievanceModal({
  open,
  row,
  onClose,
  isSubmitting,
  onSubmit,
}: Props) {
  const [causOfDissatisfaction, setCausOfDissatisfaction] = useState("");

  const stagesQuery = useQuery({
    queryKey: [...QK.studentGrievances.all, "reopenStages"],
    queryFn: listComplaintWorkflowStages,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setCausOfDissatisfaction("");
  }, [open]);

  async function handleSubmit() {
    if (!row) return;
    const stages = stagesQuery.data ?? [];
    const openStage = stages.find((s) => s.wfCode === "OPEN");
    const payload: AnyRow = {
      ...row,
      causOfDissatisfaction,
      isAlreadyReported: true,
      closedEmpId: null,
      workflowStageId: openStage?.workflowStageId ?? row.workflowStageId,
    };
    await onSubmit(payload);
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="ReOpen Grievance"
      size="md"
      isSubmitting={isSubmitting}
      submitLabel="Save"
      cancelLabel="Close"
      onSubmit={handleSubmit}
    >
      <div className="space-y-1.5">
        <Label className="font-medium text-blue-600">
          Cause of Dissatisfaction and Description of Appeal
        </Label>
        <Textarea
          value={causOfDissatisfaction}
          onChange={(e) => setCausOfDissatisfaction(e.target.value)}
          placeholder="Type Your Comments"
          rows={4}
        />
      </div>
    </FormModal>
  );
}
