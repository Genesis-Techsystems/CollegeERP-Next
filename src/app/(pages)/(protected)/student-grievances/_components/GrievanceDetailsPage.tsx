"use client";

/**
 * Angular `student-grievances/grievance-details` → `GrievanceDetailsComponent`.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
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

export function GrievanceDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSession();
  const queryClient = useQueryClient();

  const complaintId = positiveId(searchParams.get("complaintId"));
  const [studentId, setStudentId] = useState(0);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

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

  return (
    <PageContainer>
      <PageHeader
        title="Grievance Details"
        action={
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        }
      />

      {detailQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !grievance ? (
        <p className="text-sm text-muted-foreground">Grievance not found.</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border bg-card p-4 space-y-2 text-sm">
            <DetailRow label="Incident" value={txt(grievance, ["incident"])} />
            <DetailRow
              label="Incident Description"
              value={txt(grievance, ["incidentDescription"])}
            />
            <DetailRow
              label="Committee"
              value={txt(grievance, ["committeeName"])}
            />
            <DetailRow
              label="Grievance Date"
              value={formatDate(grievance.complainDate)}
            />
            <DetailRow
              label="Workflow Status"
              value={txt(grievance, ["wfCode"])}
            />
          </div>

          <div className="rounded-md border bg-card p-4 space-y-3">
            <h3 className="font-semibold">Conversation on Grievance</h3>
            <div className="max-h-72 space-y-3 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages yet.</p>
              ) : (
                messages.map((item, idx) => {
                  const fromStudent = item.studentId != null;
                  return (
                    <div key={String(item.complaintDetailId ?? idx)}>
                      <p
                        className={`rounded-md px-3 py-2 text-sm ${
                          fromStudent
                            ? "ml-8 bg-blue-50 text-slate-800"
                            : "mr-8 bg-slate-100 text-slate-800"
                        }`}
                      >
                        {txt(item, ["message"])}
                      </p>
                      <p className="mt-0.5 text-right text-xs text-slate-400">
                        {formatDate(item.messageDate)}
                        {!fromStudent && txt(item, ["empName"])
                          ? `, ${txt(item, ["empName"])}`
                          : ""}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message…"
                rows={2}
                className="flex-1"
              />
              <Button onClick={() => void sendMsg()} disabled={sending}>
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
      <span className="text-muted-foreground">{label} :</span>
      <span className="font-medium text-slate-800">{value || "—"}</span>
    </div>
  );
}
