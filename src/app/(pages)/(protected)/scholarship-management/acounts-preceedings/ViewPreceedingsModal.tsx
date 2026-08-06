"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ClipboardList } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DATE_FORMATS } from "@/config/constants/app";
import { QK } from "@/lib/query-keys";
import { listSchPreceedingsByAccountsPreceedingId } from "@/services";
import type { SchPreceeding } from "@/types/scholarship";

type ProceedingRow = SchPreceeding & {
  academicYear?: string;
  [key: string]: unknown;
};

function formatDt(value: unknown): string {
  if (value == null || value === "") return "—";
  const raw = String(value);
  try {
    const d = raw.includes("T") ? parseISO(raw) : new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return format(d, DATE_FORMATS.DISPLAY);
  } catch {
    return raw;
  }
}

function collegeLabel(row: ProceedingRow): string {
  const code = String(row.collegeCode ?? "").trim();
  const ay = String(row.academicYear ?? "").trim();
  if (code && ay) return `${code} (${ay})`;
  return code || ay || "—";
}

interface ViewPreceedingsModalProps {
  open: boolean;
  onClose: () => void;
  schAccountsPreceedingsId: number;
}

export function ViewPreceedingsModal({
  open,
  onClose,
  schAccountsPreceedingsId,
}: Readonly<ViewPreceedingsModalProps>) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { data: rows = [], isLoading, isFetching } = useQuery({
    queryKey: QK.schAccountsPreceedings.viewPreceedings(
      schAccountsPreceedingsId,
    ),
    queryFn: () =>
      listSchPreceedingsByAccountsPreceedingId(schAccountsPreceedingsId),
    enabled: open && schAccountsPreceedingsId > 0,
  });

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows as ProceedingRow[];
    return (rows as ProceedingRow[]).filter((r) => {
      const hay = [
        r.preceedingNo,
        r.preceedingTitle,
        r.collegeCode,
        r.academicYear,
        r.preceedingAmount,
        r.preceedingDate,
      ]
        .map((v) => String(v ?? "").toLowerCase())
        .join(" ");
      return hay.includes(q);
    });
  }, [rows, search]);

  const handleClose = () => {
    setSearch("");
    onClose();
  };

  /** Angular: close dialog + navigate to view-std-preceedings. */
  const viewStdPreceeding = (row: ProceedingRow) => {
    const id = Number(row.schPreceedingId ?? 0);
    if (!id) return;
    handleClose();
    router.push(
      `/scholarship-management/view-std-preceedings?schPreceedingId=${id}`,
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent
        className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-5xl"
        closeOnOutsideClick={false}
        hasDescription
      >
        <DialogHeader className="shrink-0 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" aria-hidden />
            <DialogTitle>View Preceedings</DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Preceedings linked to this accounts batch
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-2">
          <input
            className="h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {isLoading || isFetching ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="overflow-auto rounded-md border">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="bg-muted/40">
                  <tr className="border-b">
                    <th className="px-2 py-2">Sl.No</th>
                    <th className="px-2 py-2">Preceeding Number</th>
                    <th className="px-2 py-2">Preceeding Title</th>
                    <th className="px-2 py-2">College</th>
                    <th className="px-2 py-2">Amount</th>
                    <th className="px-2 py-2">Date</th>
                    <th className="px-2 py-2">Students</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-2 py-3 text-muted-foreground"
                      >
                        No preceedings found.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r, i) => (
                      <tr
                        key={String(r.schPreceedingId ?? i)}
                        className="border-b border-muted/40"
                      >
                        <td className="px-2 py-1.5 text-center">{i + 1}</td>
                        <td className="px-2 py-1.5">
                          {String(r.preceedingNo ?? "—")}
                        </td>
                        <td className="px-2 py-1.5">
                          {String(r.preceedingTitle ?? "—")}
                        </td>
                        <td className="px-2 py-1.5">{collegeLabel(r)}</td>
                        <td className="px-2 py-1.5">
                          {String(r.preceedingAmount ?? "—")}
                        </td>
                        <td className="px-2 py-1.5">
                          {formatDt(r.preceedingDate)}
                        </td>
                        <td className="px-2 py-1.5">
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 bg-[#00b8ff] px-2 text-[11px] text-white hover:bg-[#00a6e6]"
                            title="View Students"
                            onClick={() => viewStdPreceeding(r)}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border/60 pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 min-w-[5.5rem]"
            onClick={handleClose}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
