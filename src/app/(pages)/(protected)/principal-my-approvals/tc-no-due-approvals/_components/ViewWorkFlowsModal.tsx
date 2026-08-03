"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FormModal } from "@/common/components/feedback";
import { QK } from "@/lib/query-keys";
import { listFeeCertificateWorkflows } from "@/services";
import type { EmpCertificateApprovalRow } from "@/types/tc-no-due";
import { orderNoDueWorkflows } from "@/app/(pages)/(protected)/student-requests/no-due-certificate/_components/no-due-workflow-utils";

interface ViewWorkFlowsModalProps {
  open: boolean;
  onClose: () => void;
  row: EmpCertificateApprovalRow | null;
}

function formatDate(value: unknown): string {
  if (!value) return "---";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "dd MMM, yyyy");
}

function statusLabel(displayName: string | null | undefined): string {
  if (!displayName) return "Pending";
  return displayName;
}

function statusClass(displayName: string | null | undefined): string {
  const name = String(displayName ?? "").toLowerCase();
  if (name === "due" || name === "rejected") {
    return "font-medium text-red-700";
  }
  if (name === "no due" || name === "approved") {
    return "font-medium text-emerald-700";
  }
  return "font-medium text-amber-700";
}

/**
 * Angular `ViewWorkFlowsComponent` — department clearance table for a request.
 */
export function ViewWorkFlowsModal({
  open,
  onClose,
  row,
}: Readonly<ViewWorkFlowsModalProps>) {
  const issueId = Number(row?.pk_fee_certificate_issue_id ?? 0);

  const { data: fetched = [], isLoading } = useQuery({
    queryKey: QK.tcNoDue.workflows(issueId),
    queryFn: () => listFeeCertificateWorkflows(issueId),
    enabled: open && issueId > 0,
  });

  const workflows = useMemo(() => orderNoDueWorkflows(fetched), [fetched]);

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Certificate Work Flows"
      submitLabel="Close"
      showCancelButton={false}
      onSubmit={() => onClose()}
      size="xl"
    >
      {row ? (
        <div className="mb-4 space-y-1.5 rounded-md border px-3 py-3 text-sm">
          <DetailLine
            label="Student"
            value={`${row.student_name ?? ""} (${row.roll_number ?? ""})`}
            accent
          />
          <DetailLine
            label="Course"
            value={String(row.academic_details ?? "")}
            accent
          />
          <DetailLine
            label="Batch"
            value={String(row.batch_name ?? "")}
            accent
          />
          <DetailLine
            label="Mobile"
            value={String(row.student_mobile ?? "")}
            accent
          />
          <DetailLine
            label="Certificate"
            value={String(row.certificate_name ?? "")}
            accent
          />
          <DetailLine label="Reason" value={String(row.reason ?? "")} />
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-3 py-2 text-left font-medium">SI.No.</th>
              <th className="px-3 py-2 text-left font-medium">Department</th>
              <th className="px-3 py-2 text-left font-medium">In-Charge</th>
              <th className="px-3 py-2 text-left font-medium">Mobile Number</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium">Approved On</th>
              <th className="px-3 py-2 text-left font-medium">Comments</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && workflows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  Loading…
                </td>
              </tr>
            ) : workflows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  No workflow steps found.
                </td>
              </tr>
            ) : (
              workflows.map((wf, i) => {
                const showComments =
                  wf.comments != null &&
                  String(wf.approvalStatusDisplayName ?? "") !== "No Due";
                return (
                  <tr
                    key={
                      wf.feeCertificateWorkflowId ??
                      `${wf.deptCode ?? "dept"}-${i}`
                    }
                    className="border-b last:border-0"
                  >
                    <td className="px-3 py-2 text-center">{i + 1}</td>
                    <td className="px-3 py-2">{wf.deptName}</td>
                    <td className="px-3 py-2">
                      {[wf.titleCode, wf.firstName].filter(Boolean).join(" ")}
                    </td>
                    <td className="px-3 py-2">{wf.employeeMobile ?? "—"}</td>
                    <td
                      className={`px-3 py-2 ${statusClass(wf.approvalStatusDisplayName)}`}
                    >
                      {statusLabel(wf.approvalStatusDisplayName)}
                    </td>
                    <td className="px-3 py-2">
                      {wf.updatedDt != null ? formatDate(wf.updatedDt) : "---"}
                    </td>
                    <td className="px-3 py-2">
                      {showComments ? wf.comments : "--"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </FormModal>
  );
}

function DetailLine({
  label,
  value,
  accent,
}: Readonly<{ label: string; value: string; accent?: boolean }>) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2">
      <span className="text-muted-foreground">{label} :</span>
      <span className={accent ? "font-medium text-blue-700" : undefined}>
        {value || "—"}
      </span>
    </div>
  );
}
