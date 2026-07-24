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

export function CloseGrievanceModal({
  open,
  row,
  onClose,
  isSubmitting,
  onSubmit,
}: Props) {
  const [studentFeedback, setStudentFeedback] = useState("");
  const [studentExperience, setStudentExperience] = useState(0);

  const stagesQuery = useQuery({
    queryKey: [...QK.studentGrievances.all, "closeStages"],
    queryFn: listComplaintWorkflowStages,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setStudentFeedback("");
    setStudentExperience(0);
  }, [open]);

  async function handleSubmit() {
    if (!row) return;
    const stages = stagesQuery.data ?? [];
    const closed = stages.find((s) => s.wfCode === "CLOSED");
    const payload: AnyRow = {
      ...row,
      studentFeedback,
      studentExperience,
      closedEmpId: null,
      workflowStageId: closed?.workflowStageId ?? row.workflowStageId,
    };
    await onSubmit(payload);
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Close Grievance"
      size="md"
      isSubmitting={isSubmitting}
      submitLabel="Save"
      cancelLabel="Close"
      onSubmit={handleSubmit}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-blue-600 font-medium">Rating</Label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`text-2xl ${
                  n <= studentExperience ? "text-amber-500" : "text-slate-300"
                }`}
                onClick={() => setStudentExperience(n)}
                aria-label={`Rate ${n}`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-blue-600 font-medium">Feedback</Label>
          <Textarea
            value={studentFeedback}
            onChange={(e) => setStudentFeedback(e.target.value)}
            placeholder="Type Your Feedback"
            rows={4}
          />
        </div>
      </div>
    </FormModal>
  );
}
