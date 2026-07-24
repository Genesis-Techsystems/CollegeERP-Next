"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FormModal } from "@/common/components/feedback";
import { QK } from "@/lib/query-keys";
import { listFeeCertificateWorkflows } from "@/services";
import type {
  FeeCertificateIssueRow,
  FeeCertificateWorkflowRow,
} from "@/types/tc-no-due";
import { orderNoDueWorkflows } from "./no-due-workflow-utils";

interface ViewCertificateFlowsDialogProps {
  open: boolean;
  onClose: () => void;
  issue: FeeCertificateIssueRow | null;
}

function formatDate(value: unknown): string {
  if (!value) return "---";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "dd MMM, yyyy");
}

function statusLabel(row: FeeCertificateWorkflowRow): string {
  if (!row.approvalStatusDisplayName) return "Pending";
  return row.approvalStatusDisplayName;
}

function statusClass(row: FeeCertificateWorkflowRow): string {
  const code = String(row.approvalStatusCode ?? "").toUpperCase();
  const name = String(row.approvalStatusDisplayName ?? "").toLowerCase();
  if (
    code === "DUE" ||
    code === "REJECTED" ||
    name === "due" ||
    name === "rejected"
  ) {
    return "font-medium text-red-700";
  }
  if (
    code === "NODUE" ||
    code === "APPROVED" ||
    name === "no due" ||
    name === "approved"
  ) {
    return "font-medium text-emerald-700";
  }
  return "font-medium text-amber-700";
}

/**
 * Angular `ViewCertificateFlowsComponent` — ordered department workflows.
 * Prefers nested `feeCertificateWorkflows` on the issue; falls back to domain list.
 */
export function ViewCertificateFlowsDialog({
  open,
  onClose,
  issue,
}: Readonly<ViewCertificateFlowsDialogProps>) {
  const issueId = Number(issue?.feeCertificateIssueId ?? 0);
  const nested = issue?.feeCertificateWorkflows;

  const { data: fetched = [], isLoading } = useQuery({
    queryKey: QK.tcNoDue.workflows(issueId),
    queryFn: () => listFeeCertificateWorkflows(issueId),
    enabled: open && issueId > 0 && (!nested || nested.length === 0),
  });

  const source =
    nested && nested.length > 0
      ? nested
      : (fetched as FeeCertificateWorkflowRow[]);
  const rows = orderNoDueWorkflows(source);

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
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-3 py-2 text-left font-medium">SI.No.</th>
              <th className="px-3 py-2 text-left font-medium">Department</th>
              <th className="px-3 py-2 text-left font-medium">In-Charge</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium">Approved On</th>
              <th className="px-3 py-2 text-left font-medium">Comments</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  No workflow steps found.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => {
                const showComments =
                  row.comments != null &&
                  String(row.approvalStatusDisplayName ?? "") !== "No Due";
                return (
                  <tr
                    key={
                      row.feeCertificateWorkflowId ??
                      `${row.deptCode ?? "dept"}-${i}`
                    }
                    className="border-b last:border-0"
                  >
                    <td className="px-3 py-2 text-center">{i + 1}</td>
                    <td className="px-3 py-2">
                      {row.deptName}
                      {row.courseGroupId != null ? " Dept Head" : ""}
                    </td>
                    <td className="px-3 py-2">
                      {[row.titleCode, row.firstName].filter(Boolean).join(" ")}
                    </td>
                    <td className={`px-3 py-2 ${statusClass(row)}`}>
                      {statusLabel(row)}
                    </td>
                    <td className="px-3 py-2">
                      {row.approvalStatusCode != null
                        ? formatDate(row.updatedDt)
                        : "---"}
                    </td>
                    <td className="px-3 py-2">
                      {showComments ? row.comments : "--"}
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
