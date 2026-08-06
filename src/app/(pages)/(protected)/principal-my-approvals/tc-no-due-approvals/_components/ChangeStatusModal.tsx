"use client";

import { useEffect, useMemo, useState } from "react";
import { FormModal } from "@/common/components/feedback";
import { Select, type SelectOption } from "@/common/components/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toastError, toastInfo } from "@/lib/toast";
import {
  listCertificateWorkflowStatuses,
  listFeeCertificateWorkflows,
} from "@/services";
import type { EmpCertificateApprovalRow } from "@/types/tc-no-due";
import type { GeneralDetail } from "@/types/exam-master";

export interface ChangeStatusResult {
  approvalStatusId: number;
  comments: string | null;
}

interface ChangeStatusModalProps {
  open: boolean;
  row: EmpCertificateApprovalRow | null;
  isPrincipal: boolean;
  isVicePrincipal: boolean;
  onClose: () => void;
  onSave: (payload: ChangeStatusResult) => void;
}

export function ChangeStatusModal({
  open,
  row,
  isPrincipal,
  isVicePrincipal,
  onClose,
  onSave,
}: Readonly<ChangeStatusModalProps>) {
  const [statuses, setStatuses] = useState<GeneralDetail[]>([]);
  const [approvalStatusId, setApprovalStatusId] = useState<string>("");
  const [comments, setComments] = useState("");
  const [commentHide, setCommentHide] = useState(false);
  const [aproveStatus, setAproveStatus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const statusOptions: SelectOption[] = useMemo(
    () =>
      statuses.map((s) => ({
        value: String(s.generalDetailId),
        label: String(s.generalDetailDisplayName ?? s.generalDetailName ?? ""),
      })),
    [statuses],
  );

  function selectedStatusType(
    statusId: number | null,
    list: GeneralDetail[],
    currentComments: string | null | undefined,
  ) {
    let hide = false;
    if (isPrincipal || isVicePrincipal) hide = true;
    if (
      statusId != null &&
      list.some(
        (x) =>
          Number(x.generalDetailId) === statusId &&
          x.generalDetailCode === "NODUE",
      )
    ) {
      hide = true;
    }
    if (
      (isPrincipal || isVicePrincipal) &&
      statusId != null &&
      list.some(
        (x) =>
          Number(x.generalDetailId) === statusId &&
          x.generalDetailCode === "REJECTED",
      )
    ) {
      hide = false;
    }
    setCommentHide(hide);

    if (
      statusId != null &&
      list.some(
        (x) =>
          Number(x.generalDetailId) === statusId &&
          x.generalDetailCode === "DUE",
      )
    ) {
      if (currentComments != null && String(currentComments) !== "") {
        setComments(String(currentComments));
      } else {
        setComments("Due Amount: , Remarks: ");
      }
    }
  }

  useEffect(() => {
    if (!open || !row) return;

    const issueId = Number(row.pk_fee_certificate_issue_id ?? 0);
    const currentStatusId =
      Number(row.fk_approval_status_catdet_id ?? 0) || null;
    const detailName = String(row.Detail_Name ?? "");
    const rowComments = row.comments != null ? String(row.comments) : null;

    setApprovalStatusId(currentStatusId != null ? String(currentStatusId) : "");
    if (detailName !== "Due") {
      setComments(rowComments ?? "");
    } else if (rowComments != null) {
      setComments(rowComments);
    } else {
      setComments("Due Amount: , Remarks: ");
    }
    setAproveStatus(false);
    setCommentHide(false);
    setStatuses([]);

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const workflows =
          issueId > 0 ? await listFeeCertificateWorkflows(issueId) : [];
        if (cancelled) return;

        let blocked = false;
        if (isPrincipal || isVicePrincipal) {
          for (const wf of workflows) {
            const dept = String(wf.deptCode ?? "").toUpperCase();
            if (dept !== "PRINCIPAL" && dept !== "VICEPRINCIPAL") {
              const code = String(wf.approvalStatusCode ?? "").toUpperCase();
              if (!code || code === "DUE") {
                blocked = true;
                break;
              }
            }
          }
        }
        setAproveStatus(blocked);

        if (blocked) {
          setStatuses([]);
          return;
        }

        const all = await listCertificateWorkflowStatuses();
        if (cancelled) return;

        const filtered: GeneralDetail[] = [];
        if (isPrincipal || isVicePrincipal) {
          for (const item of all) {
            if (
              item.generalDetailCode === "APPROVED" ||
              item.generalDetailCode === "REJECTED"
            ) {
              filtered.push(item);
            }
          }
        } else {
          for (const item of all) {
            if (
              item.generalDetailCode === "DUE" ||
              item.generalDetailCode === "NODUE"
            ) {
              filtered.push(item);
            }
          }
        }
        setStatuses(filtered);
        if (currentStatusId != null) {
          selectedStatusType(currentStatusId, filtered, rowComments);
        } else if (isPrincipal || isVicePrincipal) {
          setCommentHide(true);
        }
      } catch (e) {
        if (!cancelled) toastError(e, "Unable to load approval statuses");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Angular getData on open only
  }, [open, row, isPrincipal, isVicePrincipal]);

  function handleStatusChange(value: string) {
    setApprovalStatusId(value);
    const id = Number(value) || null;
    selectedStatusType(
      id,
      statuses,
      row?.comments != null ? String(row.comments) : null,
    );
  }

  function handleSubmit() {
    if (aproveStatus) {
      toastInfo(
        "Please take the no due clearance from all the departments first",
      );
      return;
    }
    const statusId = Number(approvalStatusId);
    if (!statusId) {
      toastInfo("Certificate Workflow Status is required");
      return;
    }

    let nextComments: string | null = comments || null;
    const match = statuses.find((x) => Number(x.generalDetailId) === statusId);
    if (match?.generalDetailCode === "NODUE") {
      nextComments = "No Due";
    }

    setSaving(true);
    try {
      onSave({ approvalStatusId: statusId, comments: nextComments });
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Certificate Approval Status"
      submitLabel="Save"
      onSubmit={handleSubmit}
      isSubmitting={saving || loading}
      size="md"
    >
      {aproveStatus ? (
        <p className="text-sm text-muted-foreground py-2">
          Please take the no due clearance from all the departments first
        </p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Certificate Workflow Status</Label>
            <Select
              value={approvalStatusId}
              onChange={(value) => handleStatusChange(value ?? "")}
              options={statusOptions}
              placeholder="Certificate Workflow Status"
              isLoading={loading}
              clearable={false}
            />
          </div>
          {!commentHide ? (
            <div className="space-y-1.5">
              <Label htmlFor="no-due-comments">Comments</Label>
              <Input
                id="no-due-comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Comments"
              />
            </div>
          ) : null}
        </div>
      )}
    </FormModal>
  );
}
