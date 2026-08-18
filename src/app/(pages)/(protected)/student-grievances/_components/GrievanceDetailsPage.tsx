"use client";

/**
 * Angular `student-grievances/grievance-details` → `GrievanceDetailsComponent`.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/hooks/useSession";
import { QK } from "@/lib/query-keys";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createComplaintDetail,
  fetchStudentDetailByUserId,
  getGrievanceById,
} from "@/services";

type AnyRow = Record<string, unknown>;

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function txt(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function formatDate(value: unknown): string {
  if (value == null || value === "") return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "MMMM d, yyyy");
}

/** Angular summary rows: label left, blue value right. */
function SummaryRow({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="grid grid-cols-1 gap-1 px-1 py-0.5 sm:grid-cols-4">
      <p className="m-0 text-[13px] font-medium text-foreground">{label} :</p>
      <p className="m-0 text-[13px] font-medium text-[#0d29ff] sm:col-span-3">
        {value || "—"}
      </p>
    </div>
  );
}

export function GrievanceDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSession();
  const queryClient = useQueryClient();

  const complaintId = positiveId(searchParams.get("complaintId"));
  const [studentId, setStudentId] = useState(0);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationOpen, setConversationOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function resolveStudent() {
      const fromSession = positiveId(user?.studentId);
      if (fromSession) {
        if (!cancelled) setStudentId(fromSession);
        return;
      }
      const userId = positiveId(user?.userId);
      if (!userId) return;
      const detail = await fetchStudentDetailByUserId(userId);
      const id = positiveId(detail?.studentId, detail?.studentDetailId);
      if (!cancelled) setStudentId(id);
    }
    void resolveStudent();
    return () => {
      cancelled = true;
    };
  }, [user?.studentId, user?.userId]);

  const detailQuery = useQuery({
    queryKey: QK.studentGrievances.detail(complaintId),
    queryFn: () => getGrievanceById(complaintId),
    enabled: complaintId > 0,
  });

  const grievance = detailQuery.data;
  const messages = Array.isArray(grievance?.complaintDetailList)
    ? (grievance!.complaintDetailList as AnyRow[])
    : [];

  const departmentLabel = txt(grievance, [
    "deptCode",
    "deptName",
    "departmentName",
    "departmentCode",
    "empDeptName",
  ]);

  const sendMsg = useCallback(async () => {
    if (!message.trim()) {
      toastError("Message is required");
      return;
    }
    if (!complaintId || !studentId || !grievance) return;
    setSending(true);
    try {
      await createComplaintDetail({
        message: message.trim(),
        messageDate: new Date().toISOString(),
        studentId,
        complaintId,
        isActive: true,
        workflowStageId: grievance.workflowStageId,
      });
      toastSuccess("Message sent");
      setMessage("");
      await queryClient.invalidateQueries({
        queryKey: QK.studentGrievances.detail(complaintId),
      });
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }, [message, complaintId, studentId, grievance, queryClient]);

  function messageAuthor(item: AnyRow, fromStudent: boolean): string {
    if (fromStudent) {
      return (
        txt(item, ["stdName", "studentName", "userName"]) ||
        txt(user ?? undefined, ["firstName", "userName", "name"]) ||
        ""
      );
    }
    return txt(item, ["empName"]);
  }

  return (
    <PageContainer>
      <PageHeader title="Grievance Details" />

      {detailQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !grievance ? (
        <p className="text-sm text-muted-foreground">Grievance not found.</p>
      ) : (
        <>
          <div className="rounded-md border border-border bg-card shadow-sm">
            <div className="m-4 rounded-sm border border-[#c3d9ff] bg-white p-3">
              <SummaryRow
                label="Incident"
                value={txt(grievance, ["incident"])}
              />
              <SummaryRow
                label="Incident Description"
                value={txt(grievance, ["incidentDescription"])}
              />
              <SummaryRow
                label="Committee"
                value={txt(grievance, ["committeeName"])}
              />
              <SummaryRow
                label="Grievance Date"
                value={formatDate(grievance.complainDate)}
              />
              <SummaryRow
                label="Workflow Status"
                value={txt(grievance, ["wfCode"])}
              />
              <SummaryRow label="Department" value={departmentLabel} />
            </div>

            <Collapsible
              open={conversationOpen}
              onOpenChange={setConversationOpen}
            >
              <CollapsibleTrigger
                type="button"
                className="flex w-full items-center justify-between border-t border-border/60 px-4 py-2.5 text-left hover:bg-muted/30"
              >
                <span className="flex items-center gap-2 text-[15px] font-medium text-[#0c51a4]">
                  <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Conversation on Grievance
                </span>
                {conversationOpen ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </CollapsibleTrigger>

              <CollapsibleContent className="px-4 pb-4">
                <div className="max-h-72 space-y-3 overflow-y-auto py-2">
                  {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No messages yet.
                    </p>
                  ) : (
                    messages.map((item, idx) => {
                      const fromStudent = item.studentId != null;
                      const author = messageAuthor(item, fromStudent);
                      return (
                        <div key={String(item.complaintDetailId ?? idx)}>
                          <p
                            className={`rounded-md px-3 py-2 text-sm ${
                              fromStudent
                                ? "ml-8 bg-[#e8f4fc] text-slate-800"
                                : "mr-8 bg-slate-100 text-slate-800"
                            }`}
                          >
                            {txt(item, ["message"])}
                          </p>
                          <p className="mt-0.5 text-right text-xs text-slate-400">
                            {formatDate(item.messageDate)}
                            {author ? `, ${author}` : ""}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                <p className="mb-1.5 text-[13px] font-semibold text-[#0c51a4]">
                  Message :
                </p>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type Your Message"
                  rows={4}
                  className="min-h-[100px] resize-y bg-white"
                />
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Angular form-btn: amber Back + navy Save, right-aligned on same row */}
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              className="app-control inline-flex h-9 min-w-[80px] cursor-pointer items-center justify-center rounded-[5px] border-0 bg-[#f0ad4e] px-3 text-[length:var(--app-control-font-size)] font-medium text-black hover:bg-[#ec9c2c] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => router.back()}
              disabled={sending}
            >
              Back
            </button>
            <Button
              type="button"
              size="sm"
              className="h-9 min-w-[80px] !bg-[#0a2e67] !text-white hover:!bg-[#082653]"
              onClick={() => void sendMsg()}
              disabled={sending}
            >
              {sending ? "Saving…" : "Save"}
            </Button>
          </div>
        </>
      )}
    </PageContainer>
  );
}
