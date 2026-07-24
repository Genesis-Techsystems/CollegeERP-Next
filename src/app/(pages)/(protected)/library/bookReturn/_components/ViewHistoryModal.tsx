"use client";

import type { ColDef } from "ag-grid-community";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/common/components/table";
import { rowIndexGetter } from "@/lib/utils";
import type { LibraryRow } from "@/services";

function formatDisplayDate(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const HISTORY_COL_DEFS: ColDef<LibraryRow>[] = [
  { headerName: "SI.No", valueGetter: rowIndexGetter, width: 70, flex: 0 },
  {
    field: "issueFromdate",
    headerName: "Issue Fromdate",
    minWidth: 120,
    valueFormatter: (p) => formatDisplayDate(p.value),
  },
  {
    field: "issueTodate",
    headerName: "Issue Todate",
    minWidth: 120,
    valueFormatter: (p) => formatDisplayDate(p.value),
  },
  {
    field: "issueDuedate",
    headerName: "Returned Date",
    minWidth: 120,
    valueFormatter: (p) => formatDisplayDate(p.value),
  },
  { field: "issuedDays", headerName: "Issued Days", minWidth: 100 },
  { field: "fineAmount", headerName: "LateFee", minWidth: 90 },
  { field: "discountAmount", headerName: "Discount Amt", minWidth: 110 },
  { field: "paidAmount", headerName: "Paid Amt", minWidth: 90 },
];

interface ViewHistoryModalProps {
  open: boolean;
  onClose: () => void;
  row: LibraryRow | null;
}

export function ViewHistoryModal({
  open,
  onClose,
  row,
}: Readonly<ViewHistoryModalProps>) {
  const detail = (row?.bookDetail ?? {}) as LibraryRow;
  const histories = Array.isArray(row?.bookIssuedetailsHistories)
    ? (row!.bookIssuedetailsHistories as LibraryRow[])
    : [];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>View History</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2 text-[13px] sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Library : </span>
              <span className="font-medium text-blue-600">
                {String(row?.libraryCode ?? "—")}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Book : </span>
              <span className="font-medium text-blue-600">
                {String(detail.bookTitle ?? row?.bookTitle ?? "—")}
              </span>
            </p>
          </div>
          <DataTable
            title=""
            bordered={false}
            rowData={histories}
            columnDefs={HISTORY_COL_DEFS}
            pagination={false}
            height="auto"
            toolbar={false}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
