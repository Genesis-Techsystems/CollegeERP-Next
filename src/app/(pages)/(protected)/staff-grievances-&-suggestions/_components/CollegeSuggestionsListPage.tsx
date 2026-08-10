"use client";

/**
 * Angular `staff-grievance/collge-suggestions-list` → `CollgeSuggestionsListComponent`.
 */

import { useCallback, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format } from "date-fns";
import { BookOpen, Pencil } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ListPage } from "@/components/layout";
import { ConfirmDialog } from "@/common/components/feedback";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  listCollegeSuggestionsByOrganization,
  updateCollegeSuggestion,
} from "@/services";
import { CollegeSuggestionReplyModal } from "./CollegeSuggestionReplyModal";

type AnyRow = Record<string, unknown>;

function positiveId(...candidates: unknown[]): number {
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function formatDate(value: unknown): string {
  if (value == null || value === "") return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, "MMM d, yyyy");
}

/** Angular AcknowledgeConfirmation closes with string `'true'`. */
function isAcknowledged(row: AnyRow | null | undefined): boolean {
  const v = row?.isAcknowledged;
  return v === true || v === "true" || v === 1 || v === "1";
}

function suggestedByLabel(row: AnyRow | null | undefined): string {
  const name = String(row?.userName ?? "").trim();
  const num = String(row?.userNumber ?? "").trim();
  if (!name && !num) return "—";
  return num ? `${name} (${num})` : name;
}

/** Angular `collge-suggestions/.../acknowledge-confirmation` detail row. */
function AckDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(7rem,1fr)_3fr] gap-x-2 gap-y-0.5 px-2 py-1.5 text-sm">
      <span className="font-medium text-foreground">{label} :</span>
      <span className="min-w-0 break-words text-[#0d29ff]">{value || "—"}</span>
    </div>
  );
}

export function CollegeSuggestionsListPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: sessionLoading } = useSession();
  const organizationId = positiveId(user?.organizationId);
  const employeeId = positiveId(user?.employeeId);

  const [ackRow, setAckRow] = useState<AnyRow | null>(null);
  const [replyRow, setReplyRow] = useState<AnyRow | null>(null);
  const [saving, setSaving] = useState(false);

  const ready = organizationId > 0 && !sessionLoading;

  const listQuery = useQuery({
    queryKey: QK.staffSuggestions.byOrganization(organizationId),
    queryFn: () => listCollegeSuggestionsByOrganization(organizationId),
    enabled: ready,
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: QK.staffSuggestions.byOrganization(organizationId),
    });
  }, [queryClient, organizationId]);

  const handleAcknowledge = useCallback(async () => {
    if (!ackRow) return;
    const suggestionId = positiveId(ackRow.suggestionId);
    if (!suggestionId) {
      toastError(null, "Missing suggestion id");
      return;
    }
    setSaving(true);
    try {
      // Angular: employeeId + isAcknowledged = 'true' from AcknowledgeConfirmation
      await updateCollegeSuggestion(suggestionId, {
        ...ackRow,
        employeeId,
        isAcknowledged: "true",
      });
      toastSuccess("Suggestion acknowledged successfully.");
      setAckRow(null);
      invalidate();
    } catch (err) {
      toastError(err, "Failed to acknowledge suggestion");
    } finally {
      setSaving(false);
    }
  }, [ackRow, employeeId, invalidate]);

  const handleReplySave = useCallback(
    async (acknowledgementComments: string) => {
      if (!replyRow) return;
      const suggestionId = positiveId(replyRow.suggestionId);
      if (!suggestionId) {
        toastError(null, "Missing suggestion id");
        return;
      }
      setSaving(true);
      try {
        // Angular only copies acknowledgementComments onto the row before update
        await updateCollegeSuggestion(suggestionId, {
          ...replyRow,
          acknowledgementComments,
        });
        toastSuccess("Suggestion updated successfully.");
        setReplyRow(null);
        invalidate();
      } catch (err) {
        toastError(err, "Failed to update suggestion");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [replyRow, invalidate],
  );

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "No.",
        valueGetter: rowIndexGetter,
        width: 70,
        flex: 0,
      },
      {
        field: "suggestionSubject",
        headerName: "Suggestion",
        minWidth: 160,
        flex: 1.2,
      },
      {
        field: "suggestiontypeCatCode",
        headerName: "Suggestion Type",
        minWidth: 130,
        flex: 1,
      },
      {
        field: "suggestionforCatCode",
        headerName: "Suggestion For",
        minWidth: 130,
        flex: 1,
      },
      {
        headerName: "Suggested By",
        minWidth: 160,
        flex: 1.2,
        valueGetter: (p) => {
          const name = String(p.data?.userName ?? "").trim();
          const num = String(p.data?.userNumber ?? "").trim();
          if (!name && !num) return "—";
          return num ? `${name} (${num})` : name;
        },
      },
      {
        headerName: "Suggestion Date",
        minWidth: 130,
        flex: 1,
        valueGetter: (p) => formatDate(p.data?.createdDt),
      },
      {
        headerName: "Actions",
        width: 130,
        flex: 0,
        sortable: false,
        filter: false,
        cellRenderer: (p: ICellRendererParams<AnyRow>) => {
          const row = p.data;
          if (!row) return null;
          if (!isAcknowledged(row)) {
            return (
              <Button
                size="sm"
                variant="link"
                className="h-7 px-1 text-xs"
                onClick={() => setAckRow(row)}
              >
                Acknowledge
              </Button>
            );
          }
          return (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => setReplyRow(row)}
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          );
        },
      },
    ],
    [],
  );

  return (
    <ListPage
      title="Suggestions List"
      rowData={listQuery.data ?? []}
      columnDefs={columnDefs}
      loading={!ready || listQuery.isLoading}
      pagination
      paginationPageSize={5}
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        exportExcel: false,
        exportPdf: false,
      }}
    >
      <ConfirmDialog
        open={ackRow !== null}
        title="Confirmation"
        headerIcon={<BookOpen className="h-4 w-4 text-[#042956]" />}
        confirmLabel="Ok"
        cancelLabel="Close"
        confirmVariant="default"
        contentClassName="sm:max-w-[800px]"
        onConfirm={() => {
          void handleAcknowledge();
        }}
        onCancel={() => setAckRow(null)}
        isLoading={saving}
      >
        {/* Angular collge-suggestions acknowledge-confirmation details box */}
        <div className="rounded-md border border-[#c3d9ff] px-1 py-1">
          <AckDetailRow
            label="Suggestion"
            value={String(ackRow?.suggestionSubject ?? "")}
          />
          <AckDetailRow
            label="Suggestion Type"
            value={String(ackRow?.suggestiontypeCatCode ?? "")}
          />
          <AckDetailRow
            label="Suggestion For"
            value={String(ackRow?.suggestionforCatCode ?? "")}
          />
          <AckDetailRow label="Suggested By" value={suggestedByLabel(ackRow)} />
          <AckDetailRow
            label="Suggestion Date"
            value={formatDate(ackRow?.createdDt)}
          />
          <AckDetailRow
            label="Description"
            value={String(ackRow?.suggestionDescription ?? "")}
          />
        </div>
        <p className="text-sm text-foreground">
          Sure, you want to Acknowledge ?
        </p>
      </ConfirmDialog>

      <CollegeSuggestionReplyModal
        open={replyRow !== null}
        row={replyRow}
        onClose={() => setReplyRow(null)}
        isSubmitting={saving}
        onSubmit={handleReplySave}
      />
    </ListPage>
  );
}
