'use client'

import { useMemo, useState } from "react";
import { Search, FileText, CheckCircle2, Clock, ArrowLeft, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
};

/** Status codes whose rows are terminal — action button stays disabled. */
const CLOSED_STATUS = new Set(["Evaluated", "Reject", "Rejected"]);

function isOpenable(code: string | null | undefined): boolean {
  return !!code && !CLOSED_STATUS.has(code);
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
  onBack?: () => void;
}) {
  const [q, setQ] = useState("");

  const pid = profileId != null ? String(profileId) : undefined;
  const pdid = profileDetId != null ? String(profileDetId) : undefined;

  const {
    data: papers,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useAssignedPapers(pid, pdid);

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

  const done = all.filter((p) => marksNumber(p.evaluatedTotalMarks) !== null).length;
  const pending = all.length - done;

  const displayName = subjectName ?? subject?.name;
  const displayCode = subject?.code ? subject.code.replace(/-\d+$/, "") : undefined;
  const title = displayName
    ? displayCode
      ? `Subject : ${displayName} (${displayCode})`
      : `Subject : ${displayName}`
    : "Assigned Answer Papers";

  const hasIds = !!pid && !!pdid;

  return (
    <div className="space-y-6">
      <nav className="text-sm text-muted-foreground">
        Examination Management
        <span className="mx-2">/</span>
        Evaluation Process
        <span className="mx-2">/</span>
        Evaluator Subjects
        <span className="mx-2 text-foreground">/</span>
        <span className="font-medium text-foreground">Evaluator Assigned Answer Papers</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground">
              {all.length} answer scripts assigned
            </p>
          </div>
        </div>
        {onBack && (
          <Button variant="outline" size="sm" onClick={onBack} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        )}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary">
            <CheckCircle2 className="h-3 w-3" /> {done} evaluated
          </Badge>
          <Badge variant="secondary" className="gap-1 bg-[oklch(0.95_0.06_75)] text-[oklch(0.45_0.15_65)]">
            <Clock className="h-3 w-3" /> {pending} pending
          </Badge>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="flex items-center gap-3 border-b p-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by ID or serial number..."
              className="pl-9"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-16">Sl.No</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead>Script ID</TableHead>
              <TableHead>Evaluator Marks</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* No ids yet — nothing to fetch. */}
            {!hasIds && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  Select a subject and choose “Check Paper” to view its assigned answer scripts.
                </TableCell>
              </TableRow>
            )}

            {/* Loading. */}
            {hasIds && isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
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
                    <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
                      {isFetching ? "Retrying…" : "Retry"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Empty. */}
            {hasIds && !isLoading && !isError && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
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
              rows.map((p, i) => {
                const serial = p.omrSerialNo != null ? String(p.omrSerialNo) : "—";
                const scriptId =
                  p.studentAnswerPaperId != null ? String(p.studentAnswerPaperId) : "—";
                const marks = marksNumber(p.evaluatedTotalMarks);
                const code = p.evaluationStatusCatDetCode ?? null;
                const openable = isOpenable(code);
                const chipBg = code ? STATUS_COLORS[code] : undefined;

                return (
                  <TableRow key={`${scriptId}-${i}`}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-mono text-sm">{serial}</TableCell>
                    <TableCell className="font-mono text-sm">{scriptId}</TableCell>
                    <TableCell>
                      {marks !== null ? (
                        <span className="font-semibold text-primary">{marks}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {code ? (
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={
                            chipBg
                              ? { backgroundColor: chipBg, color: textOn(chipBg) }
                              : undefined
                          }
                        >
                          {code}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={openable ? "default" : "outline"}
                        disabled={!openable}
                        onClick={() =>
                          onOpen({
                            id: scriptId,
                            serial,
                            marks,
                            checkedOn: p.answerSheetCheckDate ?? null,
                            studentAnswerPaperId: p.studentAnswerPaperId,
                            examEvaluationAssignmentId: p.examEvaluationAssignmentId,
                            status: code,
                          })
                        }
                      >
                        {openable ? "Check Answersheet" : "Evaluated"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}