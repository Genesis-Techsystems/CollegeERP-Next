"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  FileText,
  CheckCircle2,
  Clock,
  ArrowLeft,
  AlertTriangle,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { SubjectCard } from "./subject-cards";
import { useAssignedPapers } from "../_lib/queries";
import { STATUS_COLORS } from "../_lib/config";
import type { AnswerPaperRow } from "../_lib/api-types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * Row handed to the dashboard's `onOpen` when the evaluator opens a script.
 * `id` is kept so the existing (mock) workbench `scriptId` display keeps
 * working; `studentAnswerPaperId` + `examEvaluationAssignmentId` are the real
 * ids the workbench data-load will consume once wired.
 */
export type ScriptRow = {
  id: string;
  serial: string;
  marks: number | null;
  checkedOn: string | null;
  studentAnswerPaperId: string | number | null | undefined;
  examEvaluationAssignmentId: string | number | null | undefined;
  status: string | null | undefined;
  /**
   * Angular `prevEvaluatorAnswerPath` — used by workbench when isValidator
   * to call sheetDataWithPath instead of sheetData.
   */
  prevEvaluatorAnswerPath?: string | null;
};

/** Status codes whose rows are terminal — action button stays disabled. */
const CLOSED_STATUS = new Set(["Evaluated", "Reject", "Rejected"]);

function isOpenable(code: string | null | undefined): boolean {
  return !!code && !CLOSED_STATUS.has(code);
}

function isEvaluatedStatus(code: string | null | undefined): boolean {
  const normalized = String(code ?? "")
    .trim()
    .toLowerCase();
  return (
    normalized === "evaluated" ||
    normalized === "finalized" ||
    normalized === "finalised"
  );
}

function isRejectedStatus(code: string | null | undefined): boolean {
  const normalized = String(code ?? "")
    .trim()
    .toLowerCase();
  return normalized === "rejected" || normalized === "reject";
}

function statusChipClasses(code: string | null | undefined): string {
  const normalized = String(code ?? "")
    .trim()
    .toLowerCase();
  if (
    normalized === "evaluated" ||
    normalized === "finalized" ||
    normalized === "finalised"
  ) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (normalized === "assigned") {
    return "bg-blue-100 text-blue-700";
  }
  if (normalized === "inprogress" || normalized === "in progress") {
    return "bg-yellow-100 text-yellow-700";
  }
  if (normalized === "rejected" || normalized === "reject") {
    return "bg-red-100 text-red-700";
  }
  return "bg-muted text-muted-foreground";
}

/** Pick readable text color for a status chip given its background hex. */
function textOn(bg?: string): string | undefined {
  if (!bg) return undefined;
  const hex = bg.replace("#", "");
  if (hex.length < 6) return undefined;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 140 ? "#1f2937" : "#ffffff";
}

function marksNumber(v: string | number | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function AnswerScriptsList({
  onOpen,
  subject,
  subjectName,
  profileId,
  profileDetId,
  isValidator = false,
  onBack,
}: {
  onOpen: (script: ScriptRow) => void;
  /** Legacy prop — still used as a title fallback. */
  subject?: SubjectCard;
  /** Subject name threaded from the dashboard "Check Paper" navigation. */
  subjectName?: string;
  /** examEvaluatorProfileId from "Check Paper". */
  profileId?: string | number;
  /** examEvaluatorProfileDetId from "Check Paper". */
  profileDetId?: string | number;
  /** Angular checkpaperValidator — loads moderation_assignments. */
  isValidator?: boolean;
  onBack?: () => void;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const pid = profileId != null ? String(profileId) : undefined;
  const pdid = profileDetId != null ? String(profileDetId) : undefined;

  const {
    data: papers,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useAssignedPapers(pid, pdid, { isValidator });

  const all: AnswerPaperRow[] = papers ?? [];

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return all;
    return all.filter((p) => {
      const serial = String(p.omrSerialNo ?? "").toLowerCase();
      const script = String(p.studentAnswerPaperId ?? "").toLowerCase();
      return serial.includes(needle) || script.includes(needle);
    });
  }, [all, q]);

  useEffect(() => {
    setPage(1);
  }, [q, pageSize, pid, pdid]);

  // Evaluated = completed evaluation only. Rejected is neither Evaluated nor Pending.
  const done = all.filter((p) =>
    isEvaluatedStatus(p.evaluationStatusCatDetCode),
  ).length;
  const pending = all.filter((p) => {
    const code = p.evaluationStatusCatDetCode;
    if (isEvaluatedStatus(code) || isRejectedStatus(code)) return false;
    return true;
  }).length;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageStart = rows.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, rows.length);

  const displayName = subjectName ?? subject?.name;
  const displayCode = subject?.code
    ? subject.code.replace(/-\d+$/, "")
    : undefined;
  const title = displayName
    ? displayCode
      ? `Subject : ${displayName} (${displayCode})`
      : `Subject : ${displayName}`
    : "Assigned Answer Papers";

  const hasIds = isValidator ? !!pdid : !!pid && !!pdid;

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (safePage <= 3) return [1, 2, 3, 4, totalPages];
    if (safePage >= totalPages - 2) {
      return [1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, safePage - 1, safePage, safePage + 1, totalPages];
  }, [safePage, totalPages]);

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
        <span>Examination Management</span>
        <span>{">"}</span>
        <span>Evaluation Process</span>
        <span>{">"}</span>
        <span>Evaluator Subjects</span>
        <span>{">"}</span>
        <span className="text-foreground">
          {isValidator
            ? "Moderator Assigned Answer Papers"
            : "Evaluator Assigned Answer Papers"}
        </span>
      </nav>

      <div className="rounded-3xl border border-border/70 bg-card/95 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-foreground">
                {title}
              </h2>
              <p className="text-xs text-muted-foreground">
                {all.length} answer scripts assigned
              </p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            {onBack && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBack}
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <div className="flex min-w-[112px] items-center gap-3 rounded-2xl bg-primary/5 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-lg font-bold leading-none text-primary">
                  {done}
                </p>
                <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                  Evaluated
                </p>
              </div>
            </div>
            <div className="flex min-w-[112px] items-center gap-3 rounded-2xl bg-[oklch(0.98_0.02_70)] px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[oklch(0.95_0.05_70)] text-[oklch(0.62_0.17_55)]">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-lg font-bold leading-none text-[oklch(0.62_0.17_55)]">
                  {pending}
                </p>
                <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                  Pending
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
        <div className="border-b border-border/60 px-5 py-4">
          <div className="relative max-w-sm">
            <div className="pointer-events-none absolute left-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-primary/8 text-primary">
              <Search className="h-3.5 w-3.5" />
            </div>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by ID or serial number..."
              className="h-10 rounded-xl border-border/70 bg-background pl-11"
            />
          </div>
        </div>
        <div className="overflow-x-auto px-4 pt-3">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/35 hover:bg-muted/35">
                <TableHead className="w-16 rounded-l-xl">S.No</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>Script ID</TableHead>
                <TableHead>
                  {isValidator ? "Previous Evaluated Marks" : "Evaluator Marks"}
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="rounded-r-xl text-right">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* No ids yet — nothing to fetch. */}
              {!hasIds && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    Select a subject and choose “Check Paper” to view its
                    assigned answer scripts.
                  </TableCell>
                </TableRow>
              )}

              {/* Loading. */}
              {hasIds && isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    Loading assigned answer scripts…
                  </TableCell>
                </TableRow>
              )}

              {/* Error. */}
              {hasIds && !isLoading && isError && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
                      <AlertTriangle className="h-6 w-6 text-destructive" />
                      <span>
                        Couldn’t load answer scripts
                        {error instanceof Error ? ` — ${error.message}` : "."}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => refetch()}
                        disabled={isFetching}
                      >
                        {isFetching ? "Retrying…" : "Retry"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {/* Empty. */}
              {hasIds && !isLoading && !isError && rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    {all.length === 0
                      ? "No answer scripts are assigned for this subject yet."
                      : "No scripts match your search."}
                  </TableCell>
                </TableRow>
              )}

              {/* Data. */}
              {hasIds &&
                !isLoading &&
                !isError &&
                pagedRows.map((p, i) => {
                  const serial =
                    p.omrSerialNo != null ? String(p.omrSerialNo) : "—";
                  const scriptId =
                    p.studentAnswerPaperId != null
                      ? String(p.studentAnswerPaperId)
                      : "—";
                  const marks = marksNumber(
                    isValidator
                      ? (p.prevEvaluatorTotalMarks ?? p.evaluatedTotalMarks)
                      : p.evaluatedTotalMarks,
                  );
                  const code = p.evaluationStatusCatDetCode ?? null;
                  const openable = isOpenable(code);
                  return (
                    <TableRow
                      key={`${scriptId}-${i}`}
                      className="hover:bg-muted/20"
                    >
                      <TableCell>
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-primary/8 px-1.5 text-xs font-semibold text-primary">
                          {pageStart + i}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {serial}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {scriptId}
                      </TableCell>
                      <TableCell>
                        {marks !== null ? (
                          <span className="font-semibold text-primary">
                            {marks}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {code ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                              statusChipClasses(code),
                            )}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {code}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!openable}
                          onClick={() =>
                            onOpen({
                              id: scriptId,
                              serial,
                              marks,
                              checkedOn: p.answerSheetCheckDate ?? null,
                              studentAnswerPaperId: p.studentAnswerPaperId,
                              examEvaluationAssignmentId:
                                p.examEvaluationAssignmentId,
                              status: code,
                              prevEvaluatorAnswerPath:
                                p.prevEvaluatorAnswerPath ??
                                p.evaluatedAnswerPaperPath ??
                                null,
                            })
                          }
                          className={cn(
                            "min-w-20 rounded-lg border-primary/15 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary",
                            !openable &&
                              "border-border bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary",
                              !openable &&
                                "bg-muted-foreground/10 text-muted-foreground",
                            )}
                          >
                            <Eye className="h-3 w-3" />
                          </span>
                          {openable ? "View" : "Evaluated"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-4 border-t border-border/60 px-5 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-md border border-border bg-card px-2 py-1 text-foreground outline-none focus:border-primary"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <span>
              Showing {pageStart} to {pageEnd} of {rows.length} entries
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 rounded-lg p-0"
                disabled={safePage === 1}
                onClick={() => setPage(Math.max(1, safePage - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {pageNumbers.map((n, idx) => {
                const previous = pageNumbers[idx - 1];
                const showEllipsis = previous != null && n - previous > 1;
                return (
                  <div key={n} className="flex items-center gap-1">
                    {showEllipsis ? (
                      <span className="px-1 text-muted-foreground">…</span>
                    ) : null}
                    <Button
                      size="sm"
                      variant={safePage === n ? "default" : "outline"}
                      className="h-8 min-w-8 rounded-lg px-2"
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </Button>
                  </div>
                );
              })}
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 rounded-lg p-0"
                disabled={safePage === totalPages}
                onClick={() => setPage(Math.min(totalPages, safePage + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
