"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/common/components/table";
import { getAllRecords } from "@/services/crud";
import { rowIndexGetter } from "@/lib/utils";

interface ConflictRow {
  hallticket_number?: string;
  student_name?: string;
  fk_exam_id?: string | number;
  exam_name?: string;
  exam_date?: string;
  subject_name?: string;
}

interface ConflictsResponse {
  result?: ConflictRow[][];
}

interface CheckConflictsModalProps {
  open: boolean;
  onClose: () => void;
  /** Active exam master id used to scope the validation query. */
  examId: number | null;
  /** Active academic year id used to scope the validation query. */
  academicYearId: number | null;
  /** Optional org id; falls back to localStorage organizationId. */
  orgId?: number | null;
}

function resolveOrgId(explicit?: number | null): number {
  if (explicit && explicit > 0) return explicit;
  const fromStorage = Number(
    globalThis.localStorage?.getItem("organizationId") ?? 0,
  );
  return fromStorage || 1;
}

const CONFLICT_COL_DEFS: ColDef<ConflictRow>[] = [
  { headerName: "SI.No", valueGetter: rowIndexGetter, width: 70, flex: 0 },
  { field: "hallticket_number", headerName: "Hall Ticket No.", minWidth: 140 },
  { field: "student_name", headerName: "Student Name", minWidth: 160 },
  {
    headerName: "Exam Name",
    minWidth: 100,
    valueGetter: (p) => String(p.data?.fk_exam_id ?? p.data?.exam_name ?? "—"),
  },
  { field: "exam_date", headerName: "Exam Date", minWidth: 110 },
  { field: "subject_name", headerName: "Subject Name", minWidth: 200, flex: 1 },
];

export default function CheckConflictsModal({
  open,
  onClose,
  examId,
  academicYearId,
  orgId,
}: CheckConflictsModalProps) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ConflictRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open) {
      setRows([]);
      setLoaded(false);
      return;
    }
    let cancelled = false;
    async function fetchConflicts() {
      setLoading(true);
      try {
        const data = await getAllRecords<ConflictsResponse>(
          "s_get_collegeexamdetails_bycode",
          {
            in_flag: "exam_student_timetable_validation",
            in_org_id: resolveOrgId(orgId),
            in_college_id: 0,
            in_academic_year_id: academicYearId ?? 0,
            in_isadmin: 0,
            in_exam_id: examId ?? 0,
            in_timetable_id: 0,
            in_exam_date: "1990-01-01",
            in_subject_id: 0,
            in_loginuser_empid: 0,
            in_loginuser_roleid: 0,
          },
        ).catch(() => ({ result: [] as ConflictRow[][] }));
        if (cancelled) return;
        const first = Array.isArray(data?.result) ? (data.result[0] ?? []) : [];
        setRows(Array.isArray(first) ? first : []);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoaded(true);
        }
      }
    }
    fetchConflicts();
    return () => {
      cancelled = true;
    };
  }, [open, examId, academicYearId, orgId]);

  const columnDefs = useMemo(() => CONFLICT_COL_DEFS, []);

  const hasConflicts = rows.length > 0;
  const noConflictsState = loaded && !loading && !hasConflicts;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle className="text-[hsl(var(--primary))]">
            Check Conflicts
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden px-6 py-4">
          {loading && (
            <div className="py-10 text-center text-[13px] text-muted-foreground">
              Checking conflicts…
            </div>
          )}

          {noConflictsState && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <CheckCircle2
                className="h-10 w-10 text-emerald-600"
                aria-hidden
              />
              <p className="text-[14px] font-semibold text-emerald-700">
                No Conflicts Found!
              </p>
            </div>
          )}

          {hasConflicts && !loading && (
            <DataTable
              rowData={rows}
              columnDefs={columnDefs}
              loading={loading}
              bordered={false}
              height="min(50vh, 420px)"
              pagination={false}
              toolbar={{
                search: true,
                searchPlaceholder: "Search by student / subject / date…",
                exportExcel: false,
                exportPdf: false,
                columnPicker: false,
                columnFilters: false,
              }}
            />
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-6 py-3">
          <Button type="button" variant="outline" onClick={onClose}>
            {noConflictsState ? "Ok" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
