"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Clock,
  Eye,
  FileText,
  Files,
  Info,
  ListChecks,
  Loader2,
  Maximize,
  Palette,
  Save,
  Send,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAnswerSheetPdf,
  useEvaluationData,
  useEvalPdfStartEndSetting,
  useMarksIntervalSetting,
  useQpOrModelAnswerPdf,
  useSavePdfWithMaskingSetting,
  useUfmReasons,
  fetchNextAssignablePaper,
  type PaperModalType,
  type SavedMark,
} from "../_lib/queries";
import { useSessionContext } from "@/context/SessionContext";
import type { EvalQuestion } from "../_lib/api-types";
import { EVAL_STATUS } from "../_lib/config";
import {
  saveEvaluationPages,
  markEvaluationStarted,
  notAnsweredItem,
  deleteQuestionMarks,
  rejectEvaluation,
  ufmEvaluation,
  finalizeAndUpload,
  saveEvaluationDraft,
  assignNextEvalForProfile,
  type EvaluationPageItem,
} from "../_lib/eval-mutations";
import { Select } from "@/common/components/select";
import type { ScriptRow } from "./answer-scripts-list";

type Q = {
  id: string;
  qno: string | number | null | undefined;
  /** Backend pk_questionpaper_marks_id — required for the annotation-save payload. */
  questionPaperMarksId: string | number | null | undefined;
  question: string;
  level: string;
  max: number;
  marks: number | null;
  notAnswered?: boolean;
  /** Angular no_action_yet === 1 → eligible for NA modal. */
  noActionYet?: number;
  /** Angular is_consider — false when 0 (not counted in total). */
  isConsider?: boolean;
};

type Annotation = {
  id: string;
  qid: string;
  mark: number;
  /** Pixel offset from the paper wrapper’s top-left (screen overlay). */
  x: number;
  y: number;
  /** Page the mark was placed on (for scroll / reopen). */
  page?: number | null;
  /** Canvas-pixel coords persisted via mbtn_x_axis / mbtn_y_axis. */
  canvasX?: number;
  canvasY?: number;
  isConsider?: boolean;
};

type MarkColors = { solid: string; fg: string; soft: string; text: string };

const PDF_CANVAS_CLASS =
  "mx-auto mb-6 block w-full max-w-full rounded-md border bg-white shadow-sm";

/** Keep PDF canvases fluid after bitmap resize (setting width/height clears CSS layout). */
function applyPdfCanvasLayout(canvas: HTMLCanvasElement) {
  canvas.className = PDF_CANVAS_CLASS;
  canvas.style.width = "100%";
  canvas.style.height = "auto";
  canvas.style.maxWidth = "100%";
  canvas.style.display = "block";
}

/** Map a backend EvalQuestion into the workbench's local marking model. */
function toLocalQuestion(x: EvalQuestion, idx: number): Q {
  const id = String(x.qvalue ?? x.qno ?? idx + 1);
  const max = Number(x.questionMarks) || 0;
  const isNotAnswered = !!x.isNotAnswered;
  const marks = isNotAnswered
    ? null
    : x.hasMark
      ? Number(x.answeredMarks) || 0
      : null;
  return {
    id,
    qno: x.qno,
    questionPaperMarksId: x.questionPaperMarksId,
    question: x.question ?? "",
    level: x.level1No != null ? String(x.level1No) : "",
    max,
    marks,
    notAnswered: isNotAnswered,
    noActionYet: Number(x.noActionYet) === 1 ? 1 : 0,
    isConsider: x.isConsider !== false,
  };
}

/** Angular mark colors: considering = light green, not considering = gray. */
const MARK_COLOR_CONSIDER: MarkColors = {
  solid: "#22c55e",
  fg: "#ffffff",
  soft: "#dcfce7",
  text: "#14532d",
};
const MARK_COLOR_NOT_CONSIDER: MarkColors = {
  solid: "#9CA3AF",
  fg: "#ffffff",
  soft: "#e5e7eb",
  text: "#374151",
};
/** Moderator (isValidator) considering marks — blue. */
const MARK_COLOR_VALIDATOR: MarkColors = {
  solid: "#2563eb",
  fg: "#ffffff",
  soft: "#dbeafe",
  text: "#1e3a8a",
};

/**
 * Angular drawAnnotationMarkRender color priority:
 *   1) is_consider === 0  → gray (always, even when isValidator)
 *   2) isValidator        → blue
 *   3) else               → green
 *
 * Treat 0 / "0" / false as not considering — do not use `!== false`
 * (Number 0 would wrongly become considering under strict inequality).
 */
function isMarkConsidering(isConsider: unknown): boolean {
  if (isConsider === false || isConsider === 0 || isConsider === "0")
    return false;
  return true;
}

function markColorsFor(isConsider: unknown, isValidator = false): MarkColors {
  if (!isMarkConsidering(isConsider)) return MARK_COLOR_NOT_CONSIDER;
  if (isValidator) return MARK_COLOR_VALIDATOR;
  return MARK_COLOR_CONSIDER;
}

/** Left-rail question button — orange while selected; status colors when not. */
function questionButtonClass(
  q: Q,
  isActive: boolean,
  isValidator = false,
): string {
  const base =
    "rounded-[5px] border border-white/25 px-1.5 py-1.5 text-[12px] font-bold text-white shadow-[0_2px_3px_rgba(0,0,0,0.25)] transition-all";

  // Selected question — solid orange background (always while active).
  if (isActive) {
    return cn(
      base,
      "border-2 border-[#2E7D32] !bg-[#FFB74D] text-white shadow-[0_2px_4px_rgba(0,0,0,0.3)] hover:!bg-[#FFA726]",
    );
  }
  if (q.notAnswered) {
    return cn(base, "bg-rose-500 hover:bg-rose-600");
  }
  if (q.marks !== null) {
    if (!isMarkConsidering(q.isConsider)) {
      return cn(base, "bg-slate-400 hover:bg-slate-500");
    }
    if (isValidator) {
      return cn(base, "bg-sky-600 hover:bg-sky-700");
    }
    // Considering (marks added) — teal.
    return cn(base, "bg-[#2a9d8f] hover:bg-[#21867a]");
  }
  return cn(base, "bg-[#2a9d8f] hover:bg-[#21867a]");
}

function formatElapsed(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hours, minutes, secs]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

function marksFor(max: number, intervalValue: string) {
  const interval = Number.parseFloat(intervalValue);
  const out: number[] = [];
  const seen = new Set<number>();
  const push = (v: number) => {
    const n = Number(v.toFixed(1));
    if (seen.has(n)) return;
    seen.add(n);
    out.push(n);
  };

  // Angular questionWiseMarksFormat parity: push each integer and optional interval offset.
  if (Number.isFinite(interval) && interval > 0) {
    for (let i = 0; i <= max; i++) {
      push(i);
      if (i + interval <= max) push(i + interval);
    }
    return out;
  }

  const step = max <= 5 ? 0.5 : 1;
  for (let v = 0; v <= max + 1e-9; v += step) push(v);
  return out;
}

type PdfStatus = "idle" | "loading" | "ready" | "error" | "empty";

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Draw on-paper mark exactly like Angular ExamDigit:
 * red qid + square cyan badge + green ✓ glyph.
 */
function drawMarkBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  qid: string,
  mark: string,
  colors: MarkColors,
  opts?: { fontScale?: number },
) {
  const fontScale = opts?.fontScale ?? 1;
  const fs = Math.max(26, Math.round((ctx.canvas.width / 22) * fontScale));
  const badge = Math.max(24, Math.round(fs * 1.05));
  const gap = Math.max(3, Math.round(fs * 0.12));
  const checkFs = Math.max(22, Math.round(badge * 1.15));

  ctx.save();
  ctx.font = `bold ${fs}px Arial, Helvetica, sans-serif`;
  const qidW = ctx.measureText(qid).width;
  const markFont = Math.max(14, Math.round(badge * 0.55));
  ctx.font = `bold ${markFont}px Arial, Helvetica, sans-serif`;
  const markW = ctx.measureText(mark).width;
  const markBoxW = Math.max(badge, Math.ceil(markW + badge * 0.4));
  // Single-digit / short marks stay square; longer values (e.g. 0.5) grow width.
  const markBoxH = String(mark).length <= 1 ? markBoxW : badge;

  const considering = colors.solid !== MARK_COLOR_NOT_CONSIDER.solid;
  const isValidatorColor = colors.solid === MARK_COLOR_VALIDATOR.solid;
  const showCheckIcon = considering;
  const checkW = showCheckIcon ? checkFs * 0.85 : 0;

  const boxW = qidW + gap + markBoxW + (showCheckIcon ? gap + checkW : 0);
  const boxH = Math.max(markBoxH, fs, checkFs);
  const bx = Math.max(6, Math.min(x - boxW / 2, ctx.canvas.width - boxW - 6));
  const by = Math.max(6, Math.min(y - boxH / 2, ctx.canvas.height - boxH - 6));
  const midY = by + boxH / 2;

  // 1) Red question id
  ctx.font = `bold ${fs}px Arial, Helvetica, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = "#e53935";
  ctx.fillText(qid, bx, midY);

  // 2) Square mark badge — cyan fill + thin dark border (Angular exact)
  const mbx = bx + qidW + gap;
  const mby = midY - markBoxH / 2;
  const badgeFill = !considering
    ? MARK_COLOR_NOT_CONSIDER.solid
    : isValidatorColor
      ? MARK_COLOR_VALIDATOR.solid
      : "#00C2FF";
  const badgeBorder = !considering
    ? "#4b5563"
    : isValidatorColor
      ? "#1e3a8a"
      : "#333333";
  const radius = 4;
  ctx.fillStyle = badgeFill;
  roundRectPath(ctx, mbx, mby, markBoxW, markBoxH, radius);
  ctx.fill();
  ctx.strokeStyle = badgeBorder;
  ctx.lineWidth = 1.25;
  roundRectPath(
    ctx,
    mbx + 0.6,
    mby + 0.6,
    markBoxW - 1.2,
    markBoxH - 1.2,
    radius,
  );
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${markFont}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(mark, mbx + markBoxW / 2, midY + 0.5);

  // 3) Green ✓ glyph (Angular) — only when considering; red ✕ if mark is 0
  if (showCheckIcon) {
    const markNum = Number(mark);
    const ok = Number.isFinite(markNum) ? markNum > 0 : mark !== "0";
    const cx = mbx + markBoxW + gap;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${checkFs}px Arial, Helvetica, sans-serif`;
    if (ok) {
      ctx.fillStyle = isValidatorColor ? MARK_COLOR_VALIDATOR.solid : "#4caf50";
      ctx.fillText("\u2713", cx, midY);
    } else {
      ctx.fillStyle = "#ef4444";
      ctx.fillText("\u2715", cx, midY);
    }
  }

  ctx.restore();
}

/** Larger mark chrome when baking the finish/submit PDF images. */
const FINISH_MARK_FONT_SCALE = 1.6;

/** Workbench root is z-[200] (above AppShell); dialogs must stack above it. */
const WORKBENCH_DIALOG_Z = "z-[220]";

/** Export JPEG quality — Angular embeds into 300×400 pages; full canvases are overkill. */
const FINISH_JPEG_QUALITY = 0.72;
/** Max export width (~2× draw size). Keeps marks readable without huge encode/upload cost. */
const FINISH_EXPORT_MAX_W = 600;

/**
 * Angular evaluation.component.ts page render scale:
 *   isValidator → 3.5 (evaluated PDF pages are small 300×400)
 *   evaluator   → 0.5 (raw answer scans are large)
 * Same display width (CSS 100%) + these scales keep both roles looking comparable.
 */
function workbenchPdfScale(isValidator: boolean): number {
  return isValidator ? 3.5 : 0.5;
}

function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality = FINISH_JPEG_QUALITY,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) =>
        b ? resolve(b) : reject(new Error("Could not encode page image")),
      "image/jpeg",
      quality,
    );
  });
}

/** Shrink a canvas for finish PDF export (pdf-lib only draws at 280×365). */
function downscaleCanvas(
  src: HTMLCanvasElement,
  maxW: number,
): HTMLCanvasElement {
  const scale = Math.min(1, maxW / Math.max(1, src.width));
  if (scale >= 0.999) return src;
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(src.width * scale));
  out.height = Math.max(1, Math.round(src.height * scale));
  const ctx = out.getContext("2d");
  if (!ctx) return src;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "medium";
  ctx.drawImage(src, 0, 0, out.width, out.height);
  return out;
}

/**
 * Build finish-PDF page images quickly.
 * Export ONLY canvas / saved-mark badges (left-side drawn marks) — never HTML
 * overlays. Prefer a fresh PDF render + larger mark font so the submitted file
 * stays readable after downscale.
 *
 * Angular `savePdfWithMasking`:
 *   `"1"` → only UI-visible (non-masked) pages
 *   `"0"` → every PDF page (masked pages rendered off-screen from the source PDF)
 */
async function buildFinishPageBlobs(args: {
  canvases: HTMLCanvasElement[];
  pdfDoc: { numPages: number; getPage: (n: number) => Promise<any> } | null;
  savedMarks: SavedMark[];
  isValidator?: boolean;
  /** Angular savePdfWithMasking — `"0"` = include all pages (no masking on export). */
  savePdfWithMasking?: string;
  onProgress?: (done: number, total: number) => void;
}): Promise<Blob[]> {
  const {
    canvases,
    pdfDoc,
    savedMarks,
    isValidator = false,
    savePdfWithMasking = "1",
    onProgress,
  } = args;
  const renderScale = workbenchPdfScale(isValidator);
  const byPage = new Map<number, HTMLCanvasElement>();
  for (const c of canvases) {
    const p = Number(c.dataset.page);
    if (Number.isFinite(p) && p > 0) byPage.set(p, c);
  }

  // Masking on → only pages present in the UI (hidden pages were never slotted).
  // Masking off → 1..numPages so EVALPDFSTARTEND / MODLPDFSTARTEND pages are included.
  const includeAllPages = String(savePdfWithMasking) === "0";
  const pageNumbers: number[] =
    includeAllPages && pdfDoc
      ? Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1)
      : [...byPage.keys()].sort((a, b) => a - b);

  const blobs: Blob[] = [];

  for (let i = 0; i < pageNumbers.length; i++) {
    const pageNum = pageNumbers[i];
    onProgress?.(i + 1, pageNumbers.length);
    const src = byPage.get(pageNum);

    if (pdfDoc) {
      // Always re-render for finish: image-only marks at a larger export font.
      const page = await pdfDoc.getPage(pageNum);
      const vp = page.getViewport({ scale: renderScale });
      const off = document.createElement("canvas");
      off.width = vp.width;
      off.height = vp.height;
      const ctx = off.getContext("2d");
      if (!ctx) continue;
      await page.render({ canvas: off, canvasContext: ctx, viewport: vp })
        .promise;
      for (const m of savedMarks) {
        if (Number(m.page) !== pageNum) continue;
        drawMarkBadge(
          ctx,
          Number(m.x),
          Number(m.y),
          String(m.qid),
          String(m.mark),
          markColorsFor(m.isConsider, isValidator),
          { fontScale: FINISH_MARK_FONT_SCALE },
        );
      }
      blobs.push(
        await canvasToJpegBlob(downscaleCanvas(off, FINISH_EXPORT_MAX_W)),
      );
    } else if (src?.dataset.rendered === "1") {
      // Fallback when the PDF doc is gone — canvas already has image marks only.
      blobs.push(
        await canvasToJpegBlob(downscaleCanvas(src, FINISH_EXPORT_MAX_W)),
      );
    } else if (src) {
      blobs.push(
        await canvasToJpegBlob(downscaleCanvas(src, FINISH_EXPORT_MAX_W)),
      );
    }

    await new Promise<void>((r) => setTimeout(r, 0));
  }

  return blobs;
}

export function EvaluationWorkbench({
  onBack,
  onFinishNext,
  scriptId = "ESE25CS301-0004",
  studentAnswerPaperId,
  examEvaluationAssignmentId,
  subjectName,
  profileId,
  profileDetId,
  isValidator = false,
  prevEvaluatorAnswerPath,
}: {
  onBack?: () => void;
  /** Angular finishNext — open the next Assigned/InProgress script in-place. */
  onFinishNext?: (script: ScriptRow) => void;
  scriptId?: string;
  studentAnswerPaperId?: string | number | null;
  examEvaluationAssignmentId?: string | number | null;
  subjectName?: string;
  profileId?: string | number | null;
  profileDetId?: string | number | null;
  /** Angular isValidator — load PDF via sheetDataWithPath(prevEvaluatorAnswerPath). */
  isValidator?: boolean;
  /** Angular prevEvaluatorAnswerPath query param. */
  prevEvaluatorAnswerPath?: string | null;
} = {}) {
  const { user } = useSessionContext();
  const queryClient = useQueryClient();
  // Real subject + script identity for the header (graceful fallbacks).
  const headerScriptId =
    studentAnswerPaperId != null && studentAnswerPaperId !== ""
      ? String(studentAnswerPaperId)
      : scriptId;
  const headerSubject = subjectName?.trim() || "—";
  const evaluatorName =
    user?.userName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    "Evaluator";

  // ---- Real answer-sheet PDF (base64) --------------------------------------
  // Angular getPdfPath(): validator → sheetDataWithPath?path=… ; else sheetData?id=…
  const { data: pdfBase64, isLoading: pdfLoading } = useAnswerSheetPdf(
    studentAnswerPaperId ?? undefined,
    {
      isValidator,
      answerPaperPath: prevEvaluatorAnswerPath,
    },
  );

  // Angular getPdfPath validator branch: empty base64 → "No evaluation paper to load" + goBack.
  useEffect(() => {
    if (!isValidator) return;
    const path = String(prevEvaluatorAnswerPath ?? "").trim();
    if (!path) {
      toast.error("No evaluation paper to load");
      onBack?.();
    }
  }, [isValidator, prevEvaluatorAnswerPath, onBack]);

  useEffect(() => {
    if (!isValidator || pdfLoading) return;
    if (pdfBase64 === "") {
      toast.error("No evaluation paper to load");
      onBack?.();
    }
  }, [isValidator, pdfLoading, pdfBase64, onBack]);

  const canLoadEvaluationData = !pdfLoading && !!pdfBase64;
  const {
    data: evalData,
    isLoading: questionsLoading,
    isError: questionsError,
    refetch: refetchEvalData,
  } = useEvaluationData(
    examEvaluationAssignmentId ?? undefined,
    canLoadEvaluationData,
  );
  const qpTotalMarks = evalData?.qpTotalMarks ?? 0;
  const assignmentStatusId =
    evalData?.assignment?.fk_evaluationstatus_catdet_id;

  // True while a placed annotation is being persisted + reloaded.
  const [savingMark, setSavingMark] = useState(false);
  // Fire the "evaluation started" stamp only once per opened script.
  const startStampedRef = useRef(false);
  useEffect(() => {
    startStampedRef.current = false;
    timerSeededRef.current = false;
    setElapsedTime(0);
  }, [studentAnswerPaperId, examEvaluationAssignmentId]);

  useEffect(() => {
    const sec = evalData?.assignment?.evaluationtime_sec;
    if (timerSeededRef.current || sec == null) return;
    const n = Number(sec);
    if (Number.isFinite(n) && n >= 0) {
      setElapsedTime(n);
      timerSeededRef.current = true;
    }
  }, [evalData?.assignment?.evaluationtime_sec]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [studentAnswerPaperId, examEvaluationAssignmentId]);

  // ---- MarksIntervals + EVALPDFSTARTEND + savePdfWithMasking + UFMREASON ----
  const { data: marksIntervalValue = "0" } = useMarksIntervalSetting();
  const { data: maskSettingValue, isFetched: maskSettingFetched } =
    useEvalPdfStartEndSetting(isValidator);
  // Angular default '1'; "0" → finish PDF includes masked pages too.
  const { data: savePdfWithMasking = "1" } = useSavePdfWithMaskingSetting();
  const { data: ufmReasons = [], isLoading: ufmReasonsLoading } =
    useUfmReasons();
  // settingValue e.g. "1,2" → hide PDF pages 1 and 2 (Angular hidePagesList).
  const hidePages = useMemo(() => {
    const set = new Set<number>();
    if (!maskSettingValue) return set;
    for (const part of String(maskSettingValue).split(",")) {
      const n = Number(part.trim());
      if (Number.isFinite(n) && n > 0) set.add(n);
    }
    return set;
  }, [maskSettingValue]);
  const hidePagesKey = useMemo(
    () => [...hidePages].sort((a, b) => a - b).join(","),
    [hidePages],
  );

  const [questions, setQuestions] = useState<Q[]>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const [pendingMark, setPendingMark] = useState<number | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [actionDialog, setActionDialog] = useState<null | "reject" | "ufm">(
    null,
  );
  const [reason, setReason] = useState("");
  const [selectedReasonId, setSelectedReasonId] = useState<string | null>(null);
  const [paperModal, setPaperModal] = useState<PaperModalType | null>(null);
  const [paperZoom, setPaperZoom] = useState(1);
  const [naOpen, setNaOpen] = useState(false);
  const [pagesOpen, setPagesOpen] = useState(false);
  const [pagesThumbsLoading, setPagesThumbsLoading] = useState(false);
  const [pageThumbnails, setPageThumbnails] = useState<
    { page: number; src: string | null }[]
  >([]);
  const [naSelected, setNaSelected] = useState<Set<string>>(new Set());
  const [resetNaTarget, setResetNaTarget] = useState<{
    qid: string;
    questionPaperMarksId: string | number;
  } | null>(null);
  const [submitDialog, setSubmitDialog] = useState<
    null | "incomplete" | "confirm"
  >(null);
  const [annotationsOpen, setAnnotationsOpen] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerSeededRef = useRef(false);
  const [theme, setTheme] = useState<"green" | "blue">(() => {
    if (typeof window === "undefined") return "blue";
    // Moderator (isValidator) always uses blue mark chrome.
    if (isValidator) return "blue";
    return (localStorage.getItem("app-theme") as "green" | "blue") || "blue";
  });

  useEffect(() => {
    if (isValidator) setTheme("blue");
  }, [isValidator]);

  // Seed/refresh the local marking model whenever real questions arrive or the
  // script changes. Annotations reset with each new script.
  // Rebuild the marking model from server data whenever questions arrive or a
  // save triggers a reload — marks come back authoritative from the backend.
  useEffect(() => {
    const rows = evalData?.questions ?? [];
    setQuestions(rows.map(toLocalQuestion));
  }, [evalData]);

  // Keep floating pills in sync when the server flips is_consider (e.g. 1.b → 0
  // after placing a better option like 1.c). Canvas badges already repaint via savedMarks.
  useEffect(() => {
    if (questions.length === 0) return;
    setAnnotations((prev) => {
      if (prev.length === 0) return prev;
      let changed = false;
      const next = prev.map((a) => {
        const q = questions.find((x) => x.id === a.qid);
        if (!q) return a;
        const considering = isMarkConsidering(q.isConsider);
        if (a.isConsider === considering) return a;
        changed = true;
        return { ...a, isConsider: considering };
      });
      return changed ? next : prev;
    });
  }, [questions]);

  // Full reset only when a different script is opened (not on every refetch, so a
  // just-placed annotation and the active question survive the post-save reload).
  useEffect(() => {
    setActiveIdx(null);
    setAnnotations([]);
    setPendingMark(null);
    pdfRenderedRef.current = false; // new script → allow a fresh render
  }, [studentAnswerPaperId, examEvaluationAssignmentId]);

  // ---- pdfjs rendering (client-only, SSR-safe) -----------------------------
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  // Tracked in state (via a callback ref) so the render effect re-runs the moment
  // the container attaches. Needed because the answer-sheet PDF can be cached and
  // available before the paper subtree mounts (behind the questions-loading gate);
  // without this the effect would fire once with no container and never re-run.
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const setCanvasContainer = useCallback((node: HTMLDivElement | null) => {
    canvasContainerRef.current = node;
    setContainerEl(node);
  }, []);
  // The scanned-paper wrapper — annotation badges are positioned relative to it,
  // so Finish uses it to map badge % coords onto each page canvas when baking.
  const paperRef = useRef<HTMLDivElement | null>(null);
  // Previously-saved marks, kept in a ref so the render loop can draw them onto
  // each page canvas without re-rendering the PDF on every data refetch.
  const savedMarksRef = useRef<SavedMark[]>([]);
  const isValidatorRef = useRef(isValidator);
  isValidatorRef.current = isValidator;
  const savePdfWithMaskingRef = useRef(savePdfWithMasking);
  savePdfWithMaskingRef.current = savePdfWithMasking;
  useEffect(() => {
    savedMarksRef.current = evalData?.savedMarks ?? [];
  }, [evalData]);
  // Hidden pages via ref too, so the render effect can stay off its dep list.
  const hidePagesRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    hidePagesRef.current = hidePages;
  }, [hidePages]);
  // Loaded pdfjs document + a per-page render fn, so pages render lazily (on scroll)
  // and Finish can force-render any not-yet-visible pages before composing.
  const pdfDocRef = useRef<any>(null);
  const pdfWorkerRef = useRef<any>(null);
  const renderSlotRef = useRef<
    ((c: HTMLCanvasElement) => Promise<void>) | null
  >(null);
  // Set once the current script's pages are rendered; blocks spurious effect
  // re-runs (React re-mounts / transient query states) from wiping the pages.
  const pdfRenderedRef = useRef(false);
  /** Bumps so overlapping delete/effect repaints don't leave canvases half-sized. */
  const repaintGenRef = useRef(0);
  // Free the pdf doc + worker when the workbench actually unmounts.
  useEffect(() => {
    return () => {
      try {
        pdfDocRef.current?.destroy();
      } catch {
        /* ignore */
      }
      try {
        pdfWorkerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      pdfDocRef.current = null;
      pdfWorkerRef.current = null;
    };
  }, []);
  // Flips true once the proc data has loaded → drives the initial render to
  // include saved marks even if the PDF finished first.
  const evalDataReady = !questionsLoading && !!evalData;
  const [pdfStatus, setPdfStatus] = useState<PdfStatus>("idle");
  const [pdfNumPages, setPdfNumPages] = useState(0);
  const [pdfErrorMsg, setPdfErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const container = canvasContainerRef.current;
    if (!container) return;
    // Wait for EVALPDFSTARTEND so hidden pages (e.g. "1,2") are known before slots.
    if (!maskSettingFetched) {
      setPdfStatus("loading");
      return;
    }
    // Already rendered for this script → ignore spurious re-runs so we never wipe
    // the pages that are already on screen (the root cause of "stuck loading").
    if (pdfRenderedRef.current && container.querySelector("canvas")) return;
    container.innerHTML = "";
    // Reached only on a real (re)render — free the previous document + worker so
    // the pdfjs worker doesn't degrade across opens.
    try {
      pdfDocRef.current?.destroy();
    } catch {
      /* ignore */
    }
    try {
      pdfWorkerRef.current?.destroy();
    } catch {
      /* ignore */
    }
    pdfDocRef.current = null;
    pdfWorkerRef.current = null;
    renderSlotRef.current = null;
    setPdfNumPages(0);
    setPdfErrorMsg(null);

    // Derive state from the query result itself (undefined = still fetching, "" =
    // no paper) so pdfLoading toggling can't re-run this effect and wipe the pages.
    if (pdfBase64 === undefined) {
      setPdfStatus("loading");
      return;
    }
    if (!pdfBase64) {
      setPdfStatus("empty");
      return;
    }
    setPdfStatus("loading");
    pdfRenderedRef.current = false;
    let observer: IntersectionObserver | null = null;
    let loadingTask: any = null;
    let worker: any = null;
    const renderTasks = new Set<any>();

    (async () => {
      try {
        // Client-only: dynamic import keeps pdfjs out of the SSR bundle.
        const pdfjs = await import("pdfjs-dist");
        // Next/webpack emits the worker asset and returns its URL (Vite `?url` parity).
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        // base64 → Uint8Array (strip data: prefix + whitespace).
        const clean = pdfBase64
          .replace(/^data:[^,]*base64,/, "")
          .replace(/\s/g, "");
        const bytes = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));

        // Dedicated worker per document so a large/heavy PDF can't jam the shared
        // worker and stall the next paper you open.
        worker = new pdfjs.PDFWorker();
        pdfWorkerRef.current = worker;
        loadingTask = pdfjs.getDocument({ data: bytes, worker });
        const doc = await loadingTask.promise;
        if (cancelled) {
          try {
            doc.destroy();
          } catch {
            /* ignore */
          }
          return;
        }
        pdfDocRef.current = doc;
        const hidden = hidePagesRef.current;
        const pdfScale = workbenchPdfScale(isValidatorRef.current);

        // Placeholder dimensions from the first visible page (scanned pages are
        // uniform), so page slots reserve the right space before they render.
        let firstVisible = 1;
        for (let p = 1; p <= doc.numPages; p++)
          if (!hidden.has(p)) {
            firstVisible = p;
            break;
          }
        const p1 = await doc.getPage(firstVisible);
        const vp1 = p1.getViewport({ scale: pdfScale });
        if (cancelled) return;

        // Render a single page slot on demand at Angular role scale so saved-mark
        // coordinates stay valid, then draw its saved marks.
        const renderSlot = async (canvas: HTMLCanvasElement) => {
          if (cancelled || !pdfDocRef.current) return;
          if (
            canvas.dataset.rendered === "1" ||
            canvas.dataset.rendering === "1"
          )
            return;
          canvas.dataset.rendering = "1";
          const p = Number(canvas.dataset.page);
          try {
            const page = await pdfDocRef.current.getPage(p);
            if (cancelled) return;
            const scale = workbenchPdfScale(isValidatorRef.current);
            const vp = page.getViewport({ scale });
            canvas.width = vp.width;
            canvas.height = vp.height;
            canvas.dataset.pdfScale = String(scale);
            // Bitmap resize clears CSS sizing — restore fluid layout immediately.
            applyPdfCanvasLayout(canvas);
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            const task = page.render({
              canvas,
              canvasContext: ctx,
              viewport: vp,
            });
            renderTasks.add(task);
            try {
              await task.promise;
            } finally {
              renderTasks.delete(task);
            }
            if (cancelled) return;
            // On-screen marks use HTML overlays (Angular-style red/blue/check).
            // Canvas badges are baked only when finishing the PDF.
            applyPdfCanvasLayout(canvas);
            canvas.dataset.rendered = "1";
          } catch {
            // RenderingCancelledException on navigate-away — safe to ignore.
          } finally {
            canvas.dataset.rendering = "0";
          }
        };
        renderSlotRef.current = renderSlot;

        // Render pages as they approach the viewport (pre-render 1.5 screens ahead).
        observer = new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              if (e.isIntersecting)
                void renderSlot(e.target as HTMLCanvasElement);
            }
          },
          { root: null, rootMargin: "1500px 0px" },
        );

        // Create lightweight page slots (blank canvases) up front — fast — and let
        // the observer fill them in on demand.
        let visibleCount = 0;
        for (let p = 1; p <= doc.numPages; p++) {
          if (cancelled) return;
          if (hidden.has(p)) continue;
          visibleCount++;
          const canvas = document.createElement("canvas");
          canvas.width = vp1.width;
          canvas.height = vp1.height;
          applyPdfCanvasLayout(canvas);
          canvas.dataset.page = String(p);
          canvas.dataset.rendered = "0";
          container.appendChild(canvas);
          observer.observe(canvas);
        }
        setPdfNumPages(visibleCount);
        setPdfStatus("ready");
        pdfRenderedRef.current = true; // lock in this render against spurious re-runs
      } catch (err) {
        if (cancelled) return;
        setPdfStatus("error");
        setPdfErrorMsg(
          err instanceof Error ? err.message : "Failed to render PDF",
        );
      }
    })();

    return () => {
      // Only stop in-flight work here. The doc/worker are freed at the next real
      // (re)render and on unmount — NOT on spurious re-runs — so kept pages survive.
      cancelled = true;
      observer?.disconnect();
      renderTasks.forEach((t) => {
        try {
          t.cancel();
        } catch {
          /* ignore */
        }
      });
      void loadingTask;
      void worker;
    };
    // Re-run when the PDF data changes OR the container element attaches OR the
    // EVALPDFSTARTEND hide-page list settles. The container dep matters when the
    // sheet is cached and available before the paper subtree mounts (behind the
    // questions-loading gate). pdfLoading is intentionally NOT a dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfBase64, containerEl, maskSettingFetched, hidePagesKey, isValidator]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    // Private attribute — must NOT be `data-theme`, which the app-wide brand
    // theme system owns. Writing green/blue there overwrote the host palette
    // (and leaked via localStorage into other pages).
    document.documentElement.setAttribute("data-eval-theme", theme);
    localStorage.setItem("app-theme", theme);
    return () => document.documentElement.removeAttribute("data-eval-theme");
  }, [theme]);

  useEffect(() => {
    if (paperModal) setPaperZoom(1);
  }, [paperModal]);

  useEffect(() => {
    if (naOpen) setNaSelected(new Set());
  }, [naOpen]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.classList.add("eval-workbench-open");

    // F11-style: fullscreen the document (not only the workbench div).
    const enterFs = () => {
      if (document.fullscreenElement) return;
      const target = document.documentElement;
      const req =
        target.requestFullscreen?.bind(target) ??
        (
          target as HTMLElement & {
            webkitRequestFullscreen?: () => Promise<void> | void;
          }
        ).webkitRequestFullscreen?.bind(target);
      void req?.()?.catch?.(() => undefined);
    };
    enterFs();
    const t = window.setTimeout(enterFs, 50);

    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.classList.remove("eval-workbench-open");
      if (document.fullscreenElement) {
        const exit =
          document.exitFullscreen?.bind(document) ??
          (
            document as Document & {
              webkitExitFullscreen?: () => Promise<void> | void;
            }
          ).webkitExitFullscreen?.bind(document);
        void exit?.()?.catch?.(() => undefined);
      }
    };
  }, []);

  const active = activeIdx != null ? questions[activeIdx] : undefined;
  // Grand total is the server-authoritative value (applies best-of/capping so it
  // never exceeds the max) — mirrors Angular's questionMarksList[0].calculated_total_marks.
  // Fall back to the local sum only before the first server total arrives.
  const serverTotal = Number(evalData?.questions?.[0]?.calculated_total_marks);
  const total =
    Number.isFinite(serverTotal) && serverTotal > 0
      ? serverTotal
      : questions.reduce((s, q) => s + (q.marks ?? 0), 0);
  const totalMax = questions.reduce((s, q) => s + q.max, 0);
  const done = questions.filter(
    (q) => q.marks !== null || q.notAnswered,
  ).length;
  const left = questions.length - done;
  // Denominator comes from the real question paper total; fall back to the sum
  // of per-question maxima if the backend total is unavailable.
  const displayTotalMax = qpTotalMarks || totalMax;

  /** Group questions by PART / level for Angular-style left rail. */
  const questionsByLevel = useMemo(() => {
    const map = new Map<string, { q: Q; i: number }[]>();
    questions.forEach((q, i) => {
      const key = String(q.level ?? "").trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ q, i });
    });
    return Array.from(map.entries());
  }, [questions]);

  // "Annotated on script" list = marks already saved on the paper (server) plus any
  // this-session placements not yet reflected in the saved set.
  const scriptAnnotations = useMemo(() => {
    const saved = (evalData?.savedMarks ?? []).map((m, i) => ({
      id: `saved-${m.page}-${m.qid}-${i}`,
      qid: String(m.qid),
      mark: m.mark as string | number,
      page: Number(m.page),
      domId: null as string | null,
    }));
    const savedQids = new Set(saved.map((s) => s.qid));
    const local = annotations
      .filter((a) => !savedQids.has(a.qid))
      .map((a) => ({
        id: a.id,
        qid: a.qid,
        mark: a.mark as string | number,
        page: a.page ?? null,
        domId: `annot-${a.id}` as string | null,
      }));
    return [...saved, ...local];
  }, [evalData, annotations]);

  const setMark = (m: number) => {
    if (!active) {
      toast.error("Select a question first.");
      return;
    }
    setPendingMark(m);
  };

  const handlePaperClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (pendingMark === null || !active || savingMark) return;
    if (
      examEvaluationAssignmentId == null ||
      examEvaluationAssignmentId === ""
    ) {
      toast.error("Missing assignment id — cannot save this mark.");
      return;
    }
    const markValue = pendingMark;
    const assignId = examEvaluationAssignmentId;
    const prevMarks = active.marks;
    const considering = isMarkConsidering(active.isConsider);

    // Which rendered page canvas was clicked, and the X/Y within it (canvas pixels).
    let pageNumber = 1;
    let xInCanvas = 120;
    let yInCanvas = 0;
    const container = canvasContainerRef.current;
    if (container) {
      const canvases = Array.from(
        container.querySelectorAll("canvas"),
      ) as HTMLCanvasElement[];
      for (let i = 0; i < canvases.length; i++) {
        const c = canvases[i];
        const r = c.getBoundingClientRect();
        if (e.clientY >= r.top && e.clientY <= r.bottom) {
          // Use the real (unmasked) page number tagged on the canvas.
          pageNumber = Number(c.dataset.page) || i + 1;
          // Intrinsic canvas-pixel coords so reopen / finish PDF land on the click.
          xInCanvas = (e.clientX - r.left) * (c.width / (r.width || 1));
          yInCanvas = (e.clientY - r.top) * (c.height / (r.height || 1));
          break;
        }
      }
    }

    const markX = Math.round(Math.max(20, xInCanvas));
    const markY = Math.round(Math.max(20, yInCanvas));

    // Optimistic on-paper overlay at click (second-image style). Do NOT also
    // paint a canvas badge here — that caused the duplicate mark.
    const rect = e.currentTarget.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const yPx = e.clientY - rect.top;
    const optimisticId = `${Date.now()}`;
    setAnnotations((prev) => [
      ...prev.filter((a) => a.qid !== active.id),
      {
        id: optimisticId,
        qid: active.id,
        mark: markValue,
        x: xPx,
        y: yPx,
        page: pageNumber,
        canvasX: markX,
        canvasY: markY,
        isConsider: considering,
      },
    ]);
    const placedQid = active.id;
    setQuestions((prev) =>
      prev.map((q, i) => (i === activeIdx ? { ...q, marks: markValue } : q)),
    );
    // Clear active (orange) once marks are placed — show status color instead.
    setActiveIdx(null);
    setPendingMark(null);

    // Persist click coords (same as marking-content / Angular marksBtn) so draft
    // reopen places the overlay where the evaluator clicked — not fixed 60/120.
    const considerFlag = considering ? 1 : 0;
    const common = {
      isActive: true,
      questionPaperMarksId: active.questionPaperMarksId ?? "",
      examEvaluationAssignmentId: assignId,
      studentAnswerPaper: null,
      studentEvaluationPagePath: null,
      isBlankPage: false,
      isViewed: true,
      isNotAnswered: false,
      comments: null,
      pageNumber,
      is_consider: considerFlag,
    } as const;
    const items: EvaluationPageItem[] = [
      {
        ...common,
        iconId: active.qno ?? 0,
        iconValue: active.id,
        iconType: "questionBtn",
        x_Axis: Math.max(20, markX - 60),
        y_Axis: markY,
        marks: 0,
      },
      {
        ...common,
        iconId: markValue,
        iconValue: markValue,
        iconType: "marksBtn",
        x_Axis: markX,
        y_Axis: markY,
        marks: markValue,
      },
    ];

    setSavingMark(true);
    try {
      // Replace NA / existing marks (Angular trash then remake):
      // 1) delete_question → 2) draftmarks GET (refresh list) → 3) addExamStudentEvaluationPagesList
      if (
        (prevMarks != null || active.notAnswered) &&
        active.questionPaperMarksId != null
      ) {
        await deleteQuestionMarks(assignId, active.questionPaperMarksId);
        const refreshed = await refetchEvalData();
        const rows = refreshed.data?.questions ?? [];
        // Refresh list from draftmarks GET, then keep the in-flight mark optimistic.
        setQuestions(
          rows
            .map(toLocalQuestion)
            .map((q) =>
              q.id === active.id
                ? { ...q, marks: markValue, notAnswered: false, noActionYet: 0 }
                : q,
            ),
        );
        savedMarksRef.current = refreshed.data?.savedMarks ?? [];
      }
      const res = await saveEvaluationPages(items);
      if (!res?.success) throw new Error(res?.message || "Save failed");
      // Stamp evaluation-started once for a New/Assigned paper.
      if (
        !startStampedRef.current &&
        (assignmentStatusId === EVAL_STATUS.NewPaper ||
          assignmentStatusId === EVAL_STATUS.Assigned)
      ) {
        startStampedRef.current = true;
        try {
          await markEvaluationStarted(assignId);
        } catch {
          /* best-effort: start-date stamp is non-fatal */
        }
      }
      // Reload so server-recomputed marks + total flow back in.
      // Keep the on-paper HTML overlay; finish PDF bakes canvas marks into images.
      const afterSave = await refetchEvalData();
      const afterRows = afterSave.data?.questions ?? [];
      setQuestions(afterRows.map(toLocalQuestion));
      savedMarksRef.current = afterSave.data?.savedMarks ?? [];
    } catch (err) {
      // Roll back the optimistic badge/mark.
      setAnnotations((prev) => prev.filter((a) => a.id !== optimisticId));
      setQuestions((prev) =>
        prev.map((q) => (q.id === placedQid ? { ...q, marks: prevMarks } : q)),
      );
      toast.error(
        err instanceof Error ? err.message : "Could not save the mark.",
      );
    } finally {
      setSavingMark(false);
    }
  };

  const assignment = evalData?.assignment;
  // Angular openModal(questionPaperId, 'QP'|'ANS') — always pk_exam_questionpaper_id
  // (same id for question paper and model answer; never studentAnswerPaperId).
  const questionPaperId =
    assignment?.pk_exam_questionpaper_id ??
    (
      assignment as
        | { pkExamQuestionpaperId?: string | number }
        | null
        | undefined
    )?.pkExamQuestionpaperId ??
    null;
  const {
    data: paperPdfBase64,
    isLoading: paperPdfLoading,
    isError: paperPdfError,
  } = useQpOrModelAnswerPdf(questionPaperId, paperModal);
  const paperPdfCanvasRef = useRef<HTMLDivElement | null>(null);

  // Render QP / model-answer PDF whenever the dialog opens with data.
  useEffect(() => {
    if (!paperModal) return;
    let cancelled = false;
    const container = paperPdfCanvasRef.current;
    if (!container || !paperPdfBase64) return;
    container.innerHTML = "";
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        const clean = paperPdfBase64
          .replace(/^data:[^,]*base64,/, "")
          .replace(/\s/g, "");
        const binary = atob(clean);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const doc = await pdfjs.getDocument({ data: bytes }).promise;
        if (cancelled) return;
        for (let p = 1; p <= doc.numPages; p++) {
          if (cancelled) return;
          const page = await doc.getPage(p);
          const viewport = page.getViewport({ scale: 1.4 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className =
            "mx-auto mb-4 w-full max-w-full rounded border shadow-sm";
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          container.appendChild(canvas);
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        }
      } catch {
        /* render failure handled by the empty/error UI */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paperModal, paperPdfBase64]);

  // Angular viewPages — thumbnail gallery of every answer-script page.
  // Main PDF pages are lazy; capture rendered canvases when available, otherwise
  // paint a small off-screen thumbnail from the PDF so every page is shown.
  const openViewPages = async () => {
    const container = canvasContainerRef.current;
    const doc = pdfDocRef.current;
    if (!container) {
      toast.error("Answer paper is not loaded yet.");
      return;
    }
    const canvases = (
      Array.from(container.querySelectorAll("canvas")) as HTMLCanvasElement[]
    )
      .filter((c) => Number(c.dataset.page) > 0)
      .sort((a, b) => Number(a.dataset.page) - Number(b.dataset.page));
    if (canvases.length === 0) {
      toast.error("No pages to view yet.");
      return;
    }

    setPagesOpen(true);
    setPagesThumbsLoading(true);
    setPageThumbnails(
      canvases.map((c) => ({ page: Number(c.dataset.page), src: null })),
    );

    const thumbs: { page: number; src: string | null }[] = [];
    try {
      for (const canvas of canvases) {
        const page = Number(canvas.dataset.page);
        let src: string | null = null;

        if (canvas.dataset.rendered === "1") {
          try {
            src = canvas.toDataURL("image/jpeg", 0.55);
          } catch {
            src = null;
          }
        }

        if (!src && doc) {
          try {
            const pdfPage = await doc.getPage(page);
            const vp = pdfPage.getViewport({ scale: 0.45 });
            const off = document.createElement("canvas");
            off.width = vp.width;
            off.height = vp.height;
            const ctx = off.getContext("2d");
            if (ctx) {
              await pdfPage.render({
                canvas: off,
                canvasContext: ctx,
                viewport: vp,
              }).promise;
              // Scale saved-mark coords (stored at workbench role scale) onto this thumb.
              const markScale =
                0.45 / workbenchPdfScale(isValidatorRef.current);
              for (const m of savedMarksRef.current) {
                if (Number(m.page) !== page) continue;
                drawMarkBadge(
                  ctx,
                  Number(m.x) * markScale,
                  Number(m.y) * markScale,
                  String(m.qid),
                  String(m.mark),
                  markColorsFor(m.isConsider, isValidatorRef.current),
                );
              }
              src = off.toDataURL("image/jpeg", 0.55);
            }
          } catch {
            src = null;
          }
        }

        thumbs.push({ page, src });
        setPageThumbnails([
          ...thumbs,
          ...canvases.slice(thumbs.length).map((c) => ({
            page: Number(c.dataset.page),
            src: null as string | null,
          })),
        ]);
      }
      setPageThumbnails(thumbs);
    } finally {
      setPagesThumbsLoading(false);
    }
  };

  const jumpToPage = (page: number) => {
    setPagesOpen(false);
    const target = canvasContainerRef.current?.querySelector(
      `canvas[data-page="${page}"]`,
    ) as HTMLElement | null;
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    // Ensure lazy pages paint if the observer hasn't rendered them yet.
    if (target && renderSlotRef.current) {
      void renderSlotRef.current(target as HTMLCanvasElement);
    }
  };

  const openPaperModal = (type: PaperModalType) => {
    if (questionPaperId == null || questionPaperId === "") {
      toast.error("Question paper id is missing for this assignment.");
      return;
    }
    setPaperModal(type);
  };

  const qpMarksIdFor = (qid: string) =>
    questions.find((q) => q.id === qid)?.questionPaperMarksId ?? null;

  const isAssignmentLocked =
    Number(assignmentStatusId) === EVAL_STATUS.Evaluated ||
    Number(assignmentStatusId) === EVAL_STATUS.Rejected ||
    Number(assignmentStatusId) === EVAL_STATUS.Approved ||
    Number(assignmentStatusId) === EVAL_STATUS.Finalized;

  /** Re-render already-drawn PDF pages so deleted marks leave the canvas (Angular removeAnnotation). */
  const repaintRenderedPages = async () => {
    const container = canvasContainerRef.current;
    const doc = pdfDocRef.current;
    if (!container || !doc) return;
    const gen = ++repaintGenRef.current;
    const canvases = Array.from(
      container.querySelectorAll("canvas"),
    ) as HTMLCanvasElement[];
    for (const canvas of canvases) {
      if (gen !== repaintGenRef.current) return;
      if (canvas.dataset.rendered !== "1") continue;
      const p = Number(canvas.dataset.page);
      if (!Number.isFinite(p)) continue;
      try {
        // Lock layout size BEFORE bitmap resize — assigning canvas.width resets
        // intrinsic size and was shrinking the answer paper after mark delete.
        const layoutW = canvas.getBoundingClientRect().width;
        applyPdfCanvasLayout(canvas);
        if (layoutW > 0) {
          canvas.style.width = `${layoutW}px`;
        }

        const page = await doc.getPage(p);
        if (gen !== repaintGenRef.current) return;
        const scale = workbenchPdfScale(isValidatorRef.current);
        const vp = page.getViewport({ scale });
        const nextW = Math.floor(vp.width);
        const nextH = Math.floor(vp.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        if (canvas.width !== nextW || canvas.height !== nextH) {
          canvas.width = nextW;
          canvas.height = nextH;
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        canvas.dataset.pdfScale = String(scale);

        await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;
        if (gen !== repaintGenRef.current) return;
        // Screen view uses HTML overlays only — do not re-bake canvas badges here.
        applyPdfCanvasLayout(canvas);
      } catch {
        /* ignore cancelled / mid-unmount renders */
      }
    }
  };

  // When is_consider / saved marks refresh, update overlay consider flags.
  // Canvas pages stay clean on screen — badges are HTML only until finish PDF.
  useEffect(() => {
    if (pdfStatus !== "ready") return;
    if (!pdfRenderedRef.current) return;
    // Soft clear: re-render pages without baked badges if a prior session left any.
    void repaintRenderedPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evalData?.savedMarks, pdfStatus]);

  // Seed / refresh on-paper HTML overlays from saved marks (reopen after draft).
  // Positions come from mbtn_x_axis / mbtn_y_axis (click coords we persist).
  useEffect(() => {
    if (pdfStatus !== "ready") return;
    const marks = evalData?.savedMarks ?? [];
    if (marks.length === 0) return;

    let cancelled = false;
    const syncFromSaved = () => {
      if (cancelled) return;
      const paper = paperRef.current;
      const container = canvasContainerRef.current;
      if (!paper || !container) return;

      setAnnotations((prev) => {
        const savedQids = new Set(marks.map((m) => String(m.qid)));
        // Keep only in-flight placements not yet returned by the server.
        const optimistic = prev.filter(
          (a) => !savedQids.has(a.qid) && !String(a.id).startsWith("saved-"),
        );
        const pr = paper.getBoundingClientRect();
        const fromSaved: Annotation[] = [];
        for (let i = 0; i < marks.length; i++) {
          const m = marks[i];
          const qid = String(m.qid);
          const canvasX = Number(m.x) || 0;
          const canvasY = Number(m.y) || 0;
          const page = Number(m.page);
          const canvas = container.querySelector(
            `canvas[data-page="${page}"]`,
          ) as HTMLCanvasElement | null;

          let x = canvasX;
          let y = canvasY;
          if (canvas && canvas.width > 0) {
            const cr = canvas.getBoundingClientRect();
            if (cr.height >= 2) {
              x = cr.left - pr.left + (canvasX / canvas.width) * cr.width;
              y = cr.top - pr.top + (canvasY / canvas.height) * cr.height;
            } else {
              // Page slot not laid out yet — keep prior overlay coords if any.
              const prevMatch = prev.find((a) => a.qid === qid);
              if (prevMatch) {
                fromSaved.push({
                  ...prevMatch,
                  mark: Number(m.mark),
                  page,
                  canvasX,
                  canvasY,
                  isConsider: m.isConsider,
                });
                continue;
              }
            }
          }

          fromSaved.push({
            id: `saved-${page}-${qid}-${i}`,
            qid,
            mark: Number(m.mark),
            x,
            y,
            page,
            canvasX,
            canvasY,
            isConsider: m.isConsider,
          });
        }
        return [...fromSaved, ...optimistic];
      });
    };

    syncFromSaved();
    const t1 = window.setTimeout(syncFromSaved, 200);
    const t2 = window.setTimeout(syncFromSaved, 800);
    return () => {
      cancelled = true;
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [evalData?.savedMarks, pdfStatus, containerEl, pdfNumPages]);

  /**
   * Delete marks for one question (Angular removeSelect / NA reset):
   * 1) s_pop_exam_questionpaper_details?in_flag=delete_question&…
   * 2) on success only → s_get_examquestionpaper_details draftmarks reload
   * 3) repaint PDF pages so baked badges clear
   * No other APIs.
   */
  const deleteMarksAndRefresh = async (
    questionPaperMarksId: string | number,
    qid?: string,
  ) => {
    if (
      examEvaluationAssignmentId == null ||
      examEvaluationAssignmentId === ""
    ) {
      toast.error("Missing assignment id.");
      return;
    }
    if (isAssignmentLocked) {
      toast.error("This paper is locked — marks cannot be deleted.");
      return;
    }
    setSavingMark(true);
    try {
      await deleteQuestionMarks(
        examEvaluationAssignmentId,
        questionPaperMarksId,
      );
      // Only reload draftmarks — refresh questions / marks / NA from this response.
      const refreshed = await refetchEvalData();
      const rows = refreshed.data?.questions ?? [];
      setQuestions(rows.map(toLocalQuestion));
      savedMarksRef.current = refreshed.data?.savedMarks ?? [];
      if (qid) {
        setAnnotations((prev) => prev.filter((a) => a.qid !== qid));
        setPendingMark(null);
      }
      // Canvas clear comes from the savedMarks effect → repaintRenderedPages
      // (avoid a second overlapping repaint that can shrink page width).
      toast.success("Marks removed");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not remove the marks.",
      );
    } finally {
      setSavingMark(false);
    }
  };

  // Angular removeSelect — trash deletes marks for the currently selected question.
  const removeSelect = async () => {
    if (!active || savingMark || isAssignmentLocked) return;
    if (active.marks === null && !active.notAnswered) {
      toast.error("No marks to delete for this question.");
      return;
    }
    if (active.questionPaperMarksId == null) {
      toast.error("Missing question marks id.");
      return;
    }
    await deleteMarksAndRefresh(active.questionPaperMarksId, active.id);
  };

  // Delete a placed annotation → remove its saved marks on the backend, then reload.
  const removeAnnotation = async (id: string) => {
    const annotation = annotations.find((a) => a.id === id);
    if (!annotation) return;
    const qpMarksId = qpMarksIdFor(annotation.qid);
    if (qpMarksId == null) {
      toast.error("Missing question marks id.");
      return;
    }
    await deleteMarksAndRefresh(qpMarksId, annotation.qid);
  };

  const toggleNaSelection = (marksId: string | number) => {
    const key = String(marksId);
    setNaSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const naCandidates = useMemo(
    () => questions.filter((q) => Number(q.noActionYet) === 1),
    [questions],
  );

  const naAllSelected =
    naCandidates.length > 0 &&
    naCandidates.every(
      (q) =>
        q.questionPaperMarksId != null &&
        naSelected.has(String(q.questionPaperMarksId)),
    );

  const toggleNaSelectAll = () => {
    if (naAllSelected) {
      setNaSelected(new Set());
      return;
    }
    setNaSelected(
      new Set(
        naCandidates
          .map((q) =>
            q.questionPaperMarksId != null
              ? String(q.questionPaperMarksId)
              : null,
          )
          .filter((k): k is string => k != null),
      ),
    );
  };

  // Persist selected questions as "not answered", then reload.
  const markNotAnswered = async () => {
    if (naSelected.size === 0) {
      toast.error("Please select at least one question");
      return;
    }
    if (examEvaluationAssignmentId == null) {
      toast.error("Missing assignment id.");
      return;
    }
    // Key by questionPaperMarksId (Angular) — never by display code (qvalue),
    // which can collide across OR/sub-questions.
    const items: EvaluationPageItem[] = questions
      .filter(
        (q) =>
          q.questionPaperMarksId != null &&
          naSelected.has(String(q.questionPaperMarksId)),
      )
      .map((q) =>
        notAnsweredItem(q.questionPaperMarksId!, examEvaluationAssignmentId),
      );
    setNaOpen(false);
    setSavingMark(true);
    try {
      const res = await saveEvaluationPages(items);
      if (!res?.success) throw new Error(res?.message || "Save failed");
      await refetchEvalData();
      toast.success(`${items.length} question(s) marked as not answered`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save not-answered.",
      );
    } finally {
      setSavingMark(false);
    }
  };

  // Marks persist per-annotation already; Save & Exit records the paper as InProgress
  // (draft) so the assigned-papers list reflects it, then refreshes that list.
  const handleSaveDraft = async () => {
    if (savingMark) return;
    setSavingMark(true);
    try {
      if (examEvaluationAssignmentId != null) {
        await saveEvaluationDraft(examEvaluationAssignmentId, elapsedTime);
      }
      await queryClient.invalidateQueries({ queryKey: ["assignedPapers"] });
      await queryClient.invalidateQueries({ queryKey: ["evaluatorSubjects"] });
      toast.success("Draft saved — marked in progress.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save the draft.",
      );
    } finally {
      setSavingMark(false);
      onBack?.();
    }
  };

  const clearNotAnswered = (q: Q) => {
    if (q.questionPaperMarksId == null) {
      toast.error("Missing question marks id.");
      return;
    }
    // Confirm dialog → then delete_question + draftmarks reload only.
    setResetNaTarget({
      qid: q.id,
      questionPaperMarksId: q.questionPaperMarksId,
    });
  };

  const confirmResetNa = async () => {
    const target = resetNaTarget;
    setResetNaTarget(null);
    if (!target) return;
    await deleteMarksAndRefresh(target.questionPaperMarksId, target.qid);
  };

  const openAction = (kind: "reject" | "ufm") => {
    setReason("");
    setSelectedReasonId(null);
    setActionDialog(kind);
  };

  const reasonSelectOptions = useMemo(
    () =>
      ufmReasons
        .map((item) => {
          const value = String(
            item.generalDetailId ??
              (item as { general_detail_id?: string | number })
                .general_detail_id ??
              "",
          ).trim();
          const label = String(
            item.generalDetailCode ??
              (item as { generalDetailDisplayName?: string })
                .generalDetailDisplayName ??
              (item as { general_detail_code?: string }).general_detail_code ??
              "",
          ).trim();
          if (!value) return null;
          return { value, label: label || value };
        })
        .filter((o): o is { value: string; label: string } => o != null),
    [ufmReasons],
  );

  const unevaluated = questions.filter(
    (q) => q.marks === null && !q.notAnswered,
  );
  const isComplete = unevaluated.length === 0;

  const handleSubmitClick = () => {
    if (!isComplete) {
      setSubmitDialog("incomplete");
      return;
    }
    setSubmitDialog("confirm");
  };

  // Finish: compose page images → upload PDF → finalize marks.
  // finish → list; finishNext → next paper (Angular).
  const confirmSubmit = async (mode: "finish" | "finishNext" = "finish") => {
    setSubmitDialog(null);
    if (examEvaluationAssignmentId == null) {
      toast.error("Missing assignment id.");
      return;
    }
    setSavingMark(true);
    const toastId = toast.loading("Preparing pages…");
    try {
      const container = canvasContainerRef.current;
      const canvases = container
        ? (Array.from(
            container.querySelectorAll("canvas"),
          ) as HTMLCanvasElement[])
        : [];
      if (canvases.length === 0) throw new Error("Answer sheet not ready yet");

      // Fast export: downscale painted pages; off-screen at role workbench scale for the rest.
      // Do NOT force-render every lazy page at full workbench scale (that delayed the upload).
      // Bake larger canvas badges into page images for the finish PDF only.
      // On-screen marks stay as HTML overlays (no duplicate left-side draw).
      await repaintRenderedPages();
      const pageBlobs = await buildFinishPageBlobs({
        canvases,
        pdfDoc: pdfDocRef.current,
        savedMarks: savedMarksRef.current,
        isValidator: isValidatorRef.current,
        savePdfWithMasking: savePdfWithMaskingRef.current,
        onProgress: (done, total) => {
          toast.loading(`Preparing pages… ${done}/${total}`, { id: toastId });
        },
      });
      if (pageBlobs.length === 0) throw new Error("No pages to submit");

      toast.loading("Uploading evaluated PDF…", { id: toastId });
      const path = String(assignment?.studentanswer_path ?? "");
      const fileName =
        path.split(/[\\/]/).pop() || `${headerScriptId || "evaluated"}.pdf`;
      const res = await finalizeAndUpload(
        examEvaluationAssignmentId,
        fileName,
        pageBlobs,
      );
      if (!res?.success) throw new Error(res?.message || "Finalize failed");

      void queryClient.invalidateQueries({ queryKey: ["assignedPapers"] });

      if (mode === "finishNext") {
        toast.loading("Loading next paper…", { id: toastId });
        const nextScript = await resolveNextScript();
        if (nextScript && onFinishNext) {
          toast.success("Evaluated & next evaluation starts", { id: toastId });
          onFinishNext(nextScript);
          return;
        }
        toast.success("Evaluated — no more papers available", { id: toastId });
        onBack?.();
        return;
      }

      toast.success("Evaluated!", { id: toastId });
      onBack?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not submit the evaluation.",
        { id: toastId },
      );
    } finally {
      setSavingMark(false);
    }
  };

  /** Angular answerPaper + assignNext fallback for Finish & Next. */
  const resolveNextScript = async (): Promise<ScriptRow | null> => {
    if (
      profileId == null ||
      profileId === "" ||
      profileDetId == null ||
      profileDetId === ""
    ) {
      return null;
    }
    const toScript = (
      row: Awaited<ReturnType<typeof fetchNextAssignablePaper>>,
    ): ScriptRow | null => {
      if (!row) return null;
      const serial = String(row.omrSerialNo ?? row.studentAnswerPaperId ?? "");
      return {
        id: serial || String(row.examEvaluationAssignmentId ?? ""),
        serial,
        marks:
          row.evaluatedTotalMarks != null && row.evaluatedTotalMarks !== ""
            ? Number(row.evaluatedTotalMarks)
            : null,
        checkedOn:
          row.answerSheetCheckDate != null
            ? String(row.answerSheetCheckDate)
            : null,
        studentAnswerPaperId: row.studentAnswerPaperId,
        examEvaluationAssignmentId: row.examEvaluationAssignmentId,
        status: row.evaluationStatusCatDetCode,
      };
    };

    let next = await fetchNextAssignablePaper(
      profileId,
      profileDetId,
      studentAnswerPaperId,
    );
    if (next) return toScript(next);

    // No queue left — try assign_next_eval then re-fetch (Angular assignNext).
    const assigned = await assignNextEvalForProfile(profileDetId, {
      isValidator,
    });
    if (!assigned.ok) return null;
    next = await fetchNextAssignablePaper(
      profileId,
      profileDetId,
      studentAnswerPaperId,
    );
    return toScript(next);
  };

  // Reject / UFM: Angular rejectSubmit / ufmSubmit — dropdown mandatory; free text optional.
  const confirmAction = async () => {
    if (!selectedReasonId) {
      toast.error("Please select reason");
      return;
    }
    if (examEvaluationAssignmentId == null) {
      toast.error("Missing assignment id.");
      return;
    }
    const kind = actionDialog;
    setActionDialog(null);
    setSavingMark(true);
    const args = {
      examEvaluationAssignmentId,
      omrSerialNo: assignment?.omr_serial_no ?? null,
      evaluationTime: elapsedTime,
      evaluatedTotalMarks: total,
      evaluationStartDate:
        (assignment?.evaluation_startdate as string | null | undefined) ?? null,
      evaluationEndDate:
        (assignment?.evaluation_enddate as string | null | undefined) ?? null,
      reason: reason.trim(),
      ufmReasonCatDetId: Number(selectedReasonId),
    };
    try {
      const res =
        kind === "reject"
          ? await rejectEvaluation(args)
          : await ufmEvaluation(args);
      if (!res?.success) throw new Error(res?.message || "Action failed");
      toast.success(
        kind === "reject" ? "Evaluation rejected" : "Marked as UFM",
      );
      setReason("");
      setSelectedReasonId(null);
      onBack?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save the decision.",
      );
    } finally {
      setSavingMark(false);
    }
  };

  // Shared full-screen shell for pre-data states (loading / error / empty).
  if (questionsLoading || questionsError || questions.length === 0) {
    return (
      <div
        data-eval-workbench
        className="fixed inset-0 z-[200] flex h-dvh w-screen max-w-none flex-col bg-[#f3f4f6]"
      >
        <div className="flex items-center justify-between gap-6 bg-eval-header px-6 py-3 text-eval-header-foreground">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center p-10">
          {questionsLoading ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <div className="text-sm font-medium">Loading evaluation…</div>
            </div>
          ) : questionsError ? (
            <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
              <Info className="h-8 w-8 text-destructive" />
              <div className="text-sm font-medium text-foreground">
                Couldn’t load the question paper for this script.
              </div>
              <Button variant="outline" size="sm" onClick={onBack}>
                Go back
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
              <FileText className="h-8 w-8" />
              <div className="text-sm font-medium text-foreground">
                No questions found for this assignment.
              </div>
              <Button variant="outline" size="sm" onClick={onBack}>
                Go back
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      data-eval-workbench
      className="fixed inset-0 z-[200] flex h-dvh w-screen max-w-none flex-col bg-[#f3f4f6]"
    >
      {/* Full-width dark top bar — ExamDigit deep navy (not the host brand) */}
      <div className="flex items-center justify-between gap-6 bg-eval-header px-6 py-3 text-eval-header-foreground">
        <div className="flex items-center gap-6 text-sm">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 font-medium hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="hidden items-center gap-2 md:flex">
            <span className="text-white/70">Subject :</span>
            <span className="font-semibold">{headerSubject}</span>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-1 rounded-md bg-white/10 p-0.5">
            <Palette className="ml-1.5 h-3.5 w-3.5 opacity-80" />
            <button
              onClick={() => setTheme("green")}
              className={cn(
                "flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium",
                theme === "green"
                  ? "bg-white text-foreground"
                  : "text-white/80 hover:bg-white/10",
              )}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: "oklch(0.5 0.11 160)" }}
              />
              Green
            </button>
            <button
              onClick={() => setTheme("blue")}
              className={cn(
                "flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium",
                theme === "blue"
                  ? "bg-white text-foreground"
                  : "text-white/80 hover:bg-white/10",
              )}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: "oklch(0.42 0.14 255)" }}
              />
              Blue
            </button>
          </div>
          <div>
            <span className="text-white/70">Evaluator:</span>{" "}
            <span className="font-semibold">{evaluatorName}</span>
          </div>
          <div className="flex items-center gap-1.5 font-semibold">
            <Clock className="h-4 w-4" /> {formatElapsed(elapsedTime)}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left rail — Angular Questions + Marks panels */}
        <aside className="flex w-[300px] shrink-0 flex-col border-r bg-[#f3f4f6]">
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-hidden p-2">
            {/* Questions column */}
            <div className="flex min-h-0 flex-col overflow-hidden bg-white shadow-sm">
              <div className="shrink-0 bg-[#085c68] px-2 py-2 text-center text-[13px] font-semibold text-white">
                Questions
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
                {questionsByLevel.map(([level, items]) => (
                  <div key={level || "ungrouped"} className="space-y-1">
                    {level ? (
                      <div className="px-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0f766e]">
                        PART {level}
                      </div>
                    ) : null}
                    <div className="grid grid-cols-2 content-start gap-1.5">
                      {items.map(({ q, i }) => (
                        <button
                          key={String(q.questionPaperMarksId ?? `${q.id}-${i}`)}
                          type="button"
                          onClick={() => {
                            setActiveIdx(i);
                            setPendingMark(null);
                          }}
                          title={
                            q.notAnswered
                              ? "Not answered"
                              : q.marks !== null
                                ? q.isConsider === false
                                  ? "Not considering (excluded from total)"
                                  : "Considering (included in total)"
                                : undefined
                          }
                          className={questionButtonClass(
                            q,
                            i === activeIdx,
                            isValidator,
                          )}
                        >
                          {String(q.id).replace(/\./g, " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Marks column */}
            <div className="flex min-h-0 flex-col overflow-hidden bg-white shadow-sm">
              <div className="shrink-0 bg-[#085c68] px-2 py-2 text-center text-[13px] font-semibold text-white">
                Marks
              </div>
              <div className="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-hidden p-2">
                <button
                  type="button"
                  onClick={() => setNaOpen(true)}
                  disabled={savingMark || isAssignmentLocked}
                  className="w-full shrink-0 rounded-full bg-[#6eb99a] py-1.5 text-center text-sm font-bold text-white shadow-sm hover:bg-[#5aa887] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  NA
                </button>
                <div className="grid min-h-0 w-full flex-1 grid-cols-2 content-start justify-items-center gap-2 overflow-auto">
                  {!active ? (
                    <p className="col-span-2 px-1 py-4 text-center text-[11px] leading-snug text-muted-foreground">
                      Select a question to award marks
                    </p>
                  ) : (
                    marksFor(active.max, marksIntervalValue).map((m, mi) => {
                      // Green (second-image); orange while picking; ring when saved.
                      const isPicking = pendingMark === m;
                      const isSaved =
                        pendingMark === null && active.marks === m;
                      return (
                        <button
                          key={`${m}-${mi}`}
                          type="button"
                          onClick={() => setMark(m)}
                          disabled={savingMark || isAssignmentLocked}
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-all disabled:cursor-not-allowed disabled:opacity-50",
                            isPicking
                              ? "border-2 border-[#2E7D32] bg-[#FFB74D]"
                              : isSaved
                                ? "bg-[#6eb99a] ring-2 ring-[#9dd4b8] ring-offset-1"
                                : "bg-[#6eb99a] hover:bg-[#5aa887]",
                          )}
                        >
                          {m}
                        </button>
                      );
                    })
                  )}
                </div>
                <div className="grid w-full shrink-0 grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={openViewPages}
                    disabled={pdfStatus !== "ready"}
                    title="View pages"
                    className="inline-flex h-9 w-9 items-center justify-center justify-self-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeSelect()}
                    disabled={
                      savingMark ||
                      isAssignmentLocked ||
                      !active ||
                      (active.marks === null && !active.notAnswered)
                    }
                    title="Delete marks for selected question"
                    className="inline-flex h-9 w-9 items-center justify-center justify-self-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="mx-2 mb-2 space-y-1.5 rounded-lg border border-dashed border-teal-400/50 bg-teal-50 px-2.5 py-1.5 text-left text-[11px] leading-snug text-muted-foreground">
            <div>
              <span className="font-semibold text-teal-800">Tip:</span> pick a
              mark, then click the script to place it.
            </div>
            <div className="flex flex-wrap gap-2 pt-0.5">
              <span className="inline-flex items-center gap-1 rounded border border-emerald-500 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-900">
                Considering
              </span>
              <span className="inline-flex items-center gap-1 rounded border border-slate-400 bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-800">
                Not considering
              </span>
              <span className="inline-flex items-center gap-1 rounded border border-rose-400 bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-800">
                NA
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t bg-white p-3">
            <Button
              onClick={() => openAction("reject")}
              className="rounded-lg font-semibold text-white shadow-sm"
              style={{ backgroundColor: "oklch(0.55 0.09 15)" }}
            >
              Reject
            </Button>
            <Button
              onClick={() => openAction("ufm")}
              className="rounded-lg font-semibold text-white shadow-sm"
              style={{ backgroundColor: "oklch(0.65 0.09 95)" }}
            >
              UFM
            </Button>
          </div>
        </aside>

        {/* Center */}
        <section className="flex min-w-0 flex-1 flex-col">
          {/* Question section — full-width card with QP/ANS icons inside (Angular) */}
          <div className="border-b bg-[#f8fafc] px-4 py-3">
            <div
              className="flex w-full items-start gap-3 rounded border border-[#9aa3af] px-3 py-2.5 shadow-[0_2px_4px_rgba(0,0,0,0.12)]"
              style={{
                background: "linear-gradient(180deg, #f7f7f7 0%, #e4e7eb 100%)",
              }}
            >
              <div className="min-w-0 flex-1 max-h-24 overflow-auto whitespace-pre-wrap break-words text-[13px] font-medium leading-snug text-slate-900">
                {active
                  ? `${active.id})${active.question ? ` ${active.question}` : ""}`
                  : "Select a question from the left panel"}
              </div>
              <div className="flex shrink-0 items-center gap-2 self-start">
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-white shadow-md hover:bg-violet-700"
                  onClick={() => openPaperModal("QP")}
                  title="Question Paper"
                  aria-label="Question Paper"
                >
                  <Files className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-white shadow-md hover:bg-violet-700"
                  onClick={() => openPaperModal("ANS")}
                  title="Answer Paper / Sample Answer"
                  aria-label="Answer Paper"
                >
                  <FileText className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Scanned paper */}
          <div className="flex-1 overflow-auto bg-muted/40 p-6">
            <div
              ref={paperRef}
              onClick={handlePaperClick}
              className={cn(
                "relative mx-auto w-full max-w-3xl rounded-xl border bg-card p-10 shadow-sm",
                pendingMark !== null && "cursor-crosshair",
              )}
            >
              {/* Loading / error / empty states for the real PDF. */}
              {(pdfStatus === "loading" || pdfStatus === "idle") && (
                <div className="mt-8 flex flex-col items-center gap-3 py-16 text-muted-foreground">
                  <Loader2 className="h-7 w-7 animate-spin" />
                  <div className="text-sm font-medium">
                    Loading answer paper…
                  </div>
                </div>
              )}
              {pdfStatus === "empty" && (
                <div className="mt-8 flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
                  <FileText className="h-7 w-7" />
                  <div className="text-sm font-medium text-foreground">
                    No answer paper to load
                  </div>
                </div>
              )}
              {pdfStatus === "error" && (
                <div className="mt-8 flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
                  <Info className="h-7 w-7 text-destructive" />
                  <div className="text-sm font-medium text-foreground">
                    Couldn’t render the answer paper.
                  </div>
                  {pdfErrorMsg && <div className="text-xs">{pdfErrorMsg}</div>}
                </div>
              )}

              {/* pdfjs renders one stacked <canvas> per page; marks show as HTML overlays. */}
              <div
                ref={setCanvasContainer}
                className={cn("mt-8 w-full", pdfStatus !== "ready" && "hidden")}
              />
              {annotations.map((a) => {
                // Live is_consider from questions (e.g. 1.b → 0 after placing 1.c).
                const q = questions.find((x) => x.id === a.qid);
                const considerRaw = q != null ? q.isConsider : a.isConsider;
                const considering = isMarkConsidering(considerRaw);
                const markNum = Number(a.mark);
                const markOk = Number.isFinite(markNum)
                  ? markNum > 0
                  : a.mark !== 0;
                const showCheck = considering && markOk;
                // is_consider=0 → gray; validator → blue; else Angular cyan square.
                const badgeClass = !considering
                  ? "border-[#4b5563] bg-[#9CA3AF]"
                  : isValidator
                    ? "border-[#1e3a8a] bg-[#2563eb]"
                    : "border-[#333333] bg-[#00C2FF]";
                const tickClass = isValidator
                  ? "text-[#2563eb]"
                  : "text-[#4caf50]";
                const markStr = String(a.mark);
                const badgeH = 28;
                const badgeW = Math.max(badgeH, 12 + markStr.length * 10);
                return (
                  <div
                    key={a.id}
                    id={`annot-${a.id}`}
                    className="group pointer-events-auto absolute z-50 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 select-none"
                    style={{
                      left: a.x,
                      top: a.y,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Angular: bold red qid */}
                    <span
                      className="whitespace-nowrap font-bold leading-none text-[#e53935]"
                      style={{
                        fontFamily: "Arial, Helvetica, sans-serif",
                        fontSize: 26,
                      }}
                    >
                      {a.qid}
                    </span>
                    {/* Angular: square cyan + thin dark border */}
                    <span
                      className={cn(
                        "box-border inline-flex shrink-0 items-center justify-center border font-bold text-white",
                        "rounded-[4px]",
                        badgeClass,
                      )}
                      style={{
                        width: badgeW,
                        height: badgeH,
                        fontFamily: "Arial, Helvetica, sans-serif",
                        fontSize: markStr.length > 2 ? 13 : 16,
                        lineHeight: 1,
                      }}
                    >
                      {a.mark}
                    </span>
                    {/* Angular: Unicode ✓ — skip when is_consider=0 */}
                    {considering ? (
                      <span
                        className={cn(
                          "font-bold leading-none",
                          showCheck ? tickClass : "text-[#ef4444]",
                        )}
                        style={{
                          fontFamily: "Arial, Helvetica, sans-serif",
                          fontSize: 32,
                          marginLeft: 2,
                        }}
                        aria-hidden
                      >
                        {showCheck ? "\u2713" : "\u2715"}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void removeAnnotation(a.id)}
                      disabled={savingMark || isAssignmentLocked}
                      className="ml-0.5 inline-flex rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 shadow transition-opacity hover:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Remove marks"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
            {pendingMark !== null && active && (
              <div className="mx-auto mt-3 max-w-3xl text-center text-xs text-muted-foreground">
                Click on the answer script to place{" "}
                <span className="font-semibold text-foreground">
                  {active.id} = {pendingMark}
                </span>
                .{" "}
                <button
                  onClick={() => setPendingMark(null)}
                  className="underline hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Right rail */}
        <aside className="flex w-[260px] shrink-0 flex-col border-l bg-card">
          <Card className="mx-4 mt-3 mb-2 border-0 bg-eval-header shadow-sm">
            <CardContent className="p-2.5 text-center text-white">
              <div className="text-xs font-semibold leading-tight">
                Calculate Total Score:
              </div>
              <div className="mt-0.5 flex items-baseline justify-center gap-0.5">
                <span className="text-4xl font-bold leading-none">{total}</span>
                <span className="text-lg font-semibold text-white/80">
                  /{displayTotalMax}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-2 px-4">
            <Button
              onClick={handleSaveDraft}
              className="gap-1.5 bg-[oklch(0.72_0.16_55)] text-white hover:bg-[oklch(0.66_0.16_55)]"
            >
              <Save className="h-4 w-4" /> Save Draft
            </Button>
            <Button
              className="gap-1.5 bg-eval-header text-eval-header-foreground hover:bg-eval-header/90"
              onClick={handleSubmitClick}
            >
              <Send className="h-4 w-4" /> Submit
            </Button>
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-auto px-2">
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="bg-[#e3eafd] px-2 py-2.5 text-left text-[11px] font-bold text-[#1e3a5f]">
                    Questions
                  </th>
                  <th className="bg-[#e3eafd] px-2 py-2.5 text-center text-[11px] font-bold text-[#1e3a5f]">
                    Marks
                  </th>
                  <th className="bg-[#e3eafd] px-2 py-2.5 text-center text-[11px] font-bold text-[#1e3a5f]">
                    Max
                  </th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q, i) => {
                  const isActive = i === activeIdx;
                  const notConsidering =
                    q.marks != null &&
                    !q.notAnswered &&
                    !isMarkConsidering(q.isConsider);
                  const rowBg = notConsidering
                    ? isActive
                      ? "#d1d5db"
                      : "#e5e7eb"
                    : isActive
                      ? "#e8effc"
                      : i % 2 === 1
                        ? "#f5f8ff"
                        : "#ffffff";
                  return (
                    <tr
                      key={String(q.questionPaperMarksId ?? `${q.id}-${i}`)}
                      onClick={() => {
                        setActiveIdx(i);
                        setPendingMark(null);
                      }}
                      className="cursor-pointer"
                      style={{ backgroundColor: rowBg }}
                    >
                      <td
                        className="border-b border-[#e8edf5] px-2 py-2 text-left text-[12px] font-bold text-[#1e3a5f]"
                        style={{ backgroundColor: rowBg }}
                      >
                        {q.id}
                      </td>
                      <td
                        className="border-b border-[#e8edf5] px-2 py-2 text-center text-[12px]"
                        style={{ backgroundColor: rowBg }}
                      >
                        {q.notAnswered ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearNotAnswered(q);
                            }}
                            disabled={savingMark || isAssignmentLocked}
                            className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-destructive hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Click to change (reset not-answered)"
                          >
                            NA
                            <X className="h-3 w-3" />
                          </button>
                        ) : q.marks != null ? (
                          <span
                            className={cn(
                              "font-bold",
                              isMarkConsidering(q.isConsider)
                                ? "text-[#5476e0]"
                                : "text-[#9CA3AF]",
                            )}
                            title={
                              isMarkConsidering(q.isConsider)
                                ? undefined
                                : "Not considering (excluded from total)"
                            }
                          >
                            {q.marks}
                          </span>
                        ) : (
                          <span className="font-medium text-[#b0b8c8]">-</span>
                        )}
                      </td>
                      <td
                        className="border-b border-[#e8edf5] px-2 py-2 text-center text-[12px] font-normal text-[#8e9aaf]"
                        style={{ backgroundColor: rowBg }}
                      >
                        {q.max}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Collapsible
            open={annotationsOpen}
            onOpenChange={setAnnotationsOpen}
            className="border-t border-[#e8edf5] px-3 py-3"
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg bg-[#d6e4fb] px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#1e3a5f]">
                    Annotated on script
                  </span>
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2b59c3] px-1.5 text-[10px] font-bold leading-none text-white">
                    {scriptAnnotations.length}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-[#1e3a5f] transition-transform",
                    annotationsOpen && "rotate-180",
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              {scriptAnnotations.length === 0 ? (
                <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                  No annotations yet. Pick a mark and click on the script.
                </div>
              ) : (
                <ul className="max-h-40 space-y-1 overflow-auto pr-1">
                  {scriptAnnotations.map((a) => (
                    <li key={a.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const qi = questions.findIndex((q) => q.id === a.qid);
                          if (qi !== -1) {
                            setActiveIdx(qi);
                            setPendingMark(null);
                          }
                          const target = a.domId
                            ? document.getElementById(a.domId)
                            : a.page != null
                              ? (canvasContainerRef.current?.querySelector(
                                  `canvas[data-page="${a.page}"]`,
                                ) as HTMLElement | null)
                              : null;
                          target?.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                        }}
                        className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md border bg-card px-2.5 py-1.5 text-left text-xs hover:bg-accent"
                      >
                        <span className="font-medium text-foreground">
                          {a.qid}
                        </span>
                        <span className="rounded bg-[#5476e0]/15 px-2 py-0.5 font-semibold text-[#5476e0]">
                          {a.mark}
                        </span>
                      </button>
                      <button
                        type="button"
                        title="Delete marks"
                        disabled={savingMark || isAssignmentLocked}
                        onClick={() => {
                          const qpMarksId = qpMarksIdFor(a.qid);
                          if (qpMarksId == null) {
                            toast.error("Missing question marks id.");
                            return;
                          }
                          void deleteMarksAndRefresh(qpMarksId, a.qid);
                        }}
                        className="inline-flex shrink-0 rounded-md border border-destructive/30 bg-destructive/10 p-1.5 text-destructive hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CollapsibleContent>
          </Collapsible>

          <div className="grid grid-cols-3 gap-2 border-t border-[#e8edf5] bg-white px-3 py-3 text-center text-xs">
            <div>
              <div className="mb-1 text-[11px] text-[#8e9aaf]">Total</div>
              <div className="rounded-md border border-[#9bb6e8] bg-white px-2 py-1.5 text-sm font-bold text-[#5476e0]">
                {questions.length}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[11px] text-[#8e9aaf]">Done</div>
              <div className="rounded-md border border-[#d1d5db] bg-[#f5f8ff] px-2 py-1.5 text-sm font-bold text-[#1e3a5f]">
                {done}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[11px] text-[#8e9aaf]">Left</div>
              <div className="rounded-md border border-[#f5c78a] bg-[#fff7ed] px-2 py-1.5 text-sm font-bold text-[#f59e0b]">
                {left}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <Dialog
        open={actionDialog !== null}
        onOpenChange={(o) => !o && setActionDialog(null)}
      >
        <DialogContent
          className={WORKBENCH_DIALOG_Z}
          overlayClassName={WORKBENCH_DIALOG_Z}
          hasDescription
        >
          <DialogHeader className="flex-col items-center justify-center gap-1 py-4 text-center sm:items-center">
            <DialogTitle className="text-center text-2xl leading-tight">
              {actionDialog === "reject"
                ? "Are you sure to reject Evaluation?"
                : "Are you sure you want to mark as UFM?"}
            </DialogTitle>
            <DialogDescription className="text-center text-sm">
              You won&apos;t be able to revert this!
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Select
              value={selectedReasonId}
              onChange={(v) => {
                setSelectedReasonId(v);
                if (!v) setReason("");
              }}
              options={reasonSelectOptions}
              placeholder="Select reason"
              searchable={false}
              isLoading={ufmReasonsLoading}
              required
              contentClassName="z-[230]"
            />
            {/* Angular: free-text reason input is hidden until a dropdown reason is chosen */}
            {selectedReasonId ? (
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason..."
                rows={3}
              />
            ) : null}
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={confirmAction}
              disabled={!selectedReasonId || savingMark}
            >
              {actionDialog === "reject" ? "Reject" : "UFM"}
            </Button>
            <Button variant="secondary" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={paperModal !== null}
        onOpenChange={(o) => !o && setPaperModal(null)}
      >
        <DialogContent
          className={cn(
            WORKBENCH_DIALOG_Z,
            "max-h-[90vh] max-w-5xl overflow-hidden p-0",
          )}
          overlayClassName={WORKBENCH_DIALOG_Z}
          closeOnOutsideClick
          closeOnEscape
          hideClose
        >
          <DialogHeader className="flex-col items-stretch gap-1 border-b !px-6 !py-4">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-base">
                {paperModal === "ANS"
                  ? "Sample Answer Sheet"
                  : "Question Paper"}
              </DialogTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPaperZoom((z) => Math.max(0.5, z - 0.1))}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center text-xs font-medium">
                  {Math.round(paperZoom * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPaperZoom((z) => Math.min(3, z + 0.1))}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Fit to page"
                  onClick={() => setPaperZoom(1)}
                >
                  <Maximize className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Close"
                  onClick={() => setPaperModal(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <DialogDescription className="text-xs">
              View only — downloading is disabled.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[75vh] overflow-auto bg-muted/40 p-6">
            {paperPdfLoading && (
              <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
                <Loader2 className="h-7 w-7 animate-spin" />
                <div className="text-sm">
                  Loading{" "}
                  {paperModal === "ANS"
                    ? "sample answer sheet"
                    : "question paper"}
                  …
                </div>
              </div>
            )}
            {!paperPdfLoading && (paperPdfError || !paperPdfBase64) && (
              <div className="flex flex-col items-center gap-2 py-20 text-center text-muted-foreground">
                <Info className="h-7 w-7 text-destructive" />
                <div className="text-sm font-medium text-foreground">
                  {paperModal === "ANS"
                    ? "Sample answer sheet not available."
                    : "Question paper not available."}
                </div>
              </div>
            )}
            <div
              ref={paperPdfCanvasRef}
              className={cn(
                "mx-auto max-w-3xl transition-transform duration-200",
                (paperPdfLoading || paperPdfError || !paperPdfBase64) &&
                  "hidden",
              )}
              style={{
                transform: `scale(${paperZoom})`,
                transformOrigin: "top center",
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={pagesOpen} onOpenChange={(o) => !o && setPagesOpen(false)}>
        <DialogContent
          className={cn(
            WORKBENCH_DIALOG_Z,
            "max-h-[90vh] max-w-4xl overflow-hidden p-0",
          )}
          overlayClassName={WORKBENCH_DIALOG_Z}
          closeOnOutsideClick
          closeOnEscape
          hasDescription
        >
          <DialogHeader className="flex-col items-start justify-center gap-1 py-4 text-left">
            <DialogTitle className="text-base leading-none">
              View Pages
            </DialogTitle>
            <DialogDescription className="text-xs leading-snug">
              Click a page thumbnail to jump to it on the answer script.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[75vh] overflow-auto bg-muted/40 p-4">
            {pagesThumbsLoading && pageThumbnails.every((t) => !t.src) ? (
              <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                <Loader2 className="h-7 w-7 animate-spin" />
                <div className="text-sm font-medium">
                  Loading page thumbnails…
                </div>
              </div>
            ) : pageThumbnails.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                No pages available.
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-3">
                {pageThumbnails.map((t) => (
                  <button
                    key={t.page}
                    type="button"
                    onClick={() => jumpToPage(t.page)}
                    className="group w-[150px] overflow-hidden rounded-md border bg-card shadow-sm transition hover:scale-[1.03] hover:border-primary"
                    title={`Go to page ${t.page}`}
                  >
                    {t.src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.src}
                        alt={`Page ${t.page}`}
                        className="h-auto w-full object-contain"
                      />
                    ) : (
                      <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 bg-muted text-xs text-muted-foreground">
                        {pagesThumbsLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        Page {t.page}
                      </div>
                    )}
                    <div className="border-t bg-primary/10 px-2 py-1 text-center text-[11px] font-semibold text-primary">
                      Page {t.page}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={naOpen} onOpenChange={(o) => !o && setNaOpen(false)}>
        <DialogContent
          className={cn(
            WORKBENCH_DIALOG_Z,
            "max-h-[85vh] max-w-2xl overflow-hidden p-0",
          )}
          overlayClassName={WORKBENCH_DIALOG_Z}
        >
          <DialogHeader className="flex-col items-start gap-1 border-b px-6 py-4 text-left">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              <DialogTitle className="text-base leading-none">
                List of Not Viewed Questions
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs leading-snug">
              Select questions that were not answered and mark them as not
              answered.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto px-6 py-4">
            {(() => {
              if (naCandidates.length === 0) {
                return (
                  <div className="rounded-md border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                    All Questions are marked
                  </div>
                );
              }
              return (
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={naAllSelected}
                      onChange={toggleNaSelectAll}
                    />
                    Select All
                    <span className="text-xs font-normal text-muted-foreground">
                      ({naSelected.size}/{naCandidates.length})
                    </span>
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {naCandidates.map((q, i) => {
                      const marksKey = String(
                        q.questionPaperMarksId ?? `${q.id}-na-${i}`,
                      );
                      return (
                        <label
                          key={marksKey}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                            naSelected.has(marksKey)
                              ? "border-primary bg-primary/10"
                              : "border-border hover:bg-accent",
                          )}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={naSelected.has(marksKey)}
                            onChange={() => {
                              if (q.questionPaperMarksId == null) return;
                              toggleNaSelection(q.questionPaperMarksId);
                            }}
                          />
                          <span className="font-medium">{q.id}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
          <DialogFooter className="border-t px-6 py-4 sm:justify-end">
            <Button variant="secondary" onClick={() => setNaOpen(false)}>
              Close
            </Button>
            <Button
              onClick={markNotAnswered}
              disabled={naSelected.size === 0}
              className="gap-1.5"
              style={{
                backgroundColor: "oklch(0.55 0.18 285)",
                color: "white",
              }}
            >
              Not Answered
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resetNaTarget !== null}
        onOpenChange={(o) => !o && setResetNaTarget(null)}
      >
        <DialogContent
          className={cn(WORKBENCH_DIALOG_Z, "max-w-md")}
          overlayClassName={WORKBENCH_DIALOG_Z}
        >
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              Reset Not Answered?
            </DialogTitle>
            <DialogDescription className="text-center">
              This will clear the{" "}
              <span className="font-semibold text-foreground">
                {resetNaTarget?.qid}
              </span>{" "}
              not-answered status and let you mark it again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button variant="secondary" onClick={() => setResetNaTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmResetNa}
              className="gap-1.5"
              style={{
                backgroundColor: "oklch(0.55 0.18 285)",
                color: "white",
              }}
            >
              <X className="h-4 w-4" /> Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={submitDialog !== null}
        onOpenChange={(o) => !o && setSubmitDialog(null)}
      >
        <DialogContent
          className={cn(WORKBENCH_DIALOG_Z, "max-w-md")}
          overlayClassName={WORKBENCH_DIALOG_Z}
          hasDescription
        >
          {submitDialog === "incomplete" ? (
            <>
              <DialogHeader className="flex-col items-center gap-3 py-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[oklch(0.85_0.08_220)]">
                  <Info className="h-8 w-8 text-[oklch(0.55_0.12_220)]" />
                </div>
                <DialogTitle className="text-center text-xl leading-tight">
                  Please evaluate following question(s)
                </DialogTitle>
              </DialogHeader>
              <div className="py-2 text-center text-base font-medium text-foreground">
                {unevaluated.map((q) => q.id).join(", ")}
              </div>
              <DialogFooter className="sm:justify-center">
                <Button onClick={() => setSubmitDialog(null)}>OK</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader className="flex-col items-center gap-2 py-4 text-center sm:items-center">
                <DialogTitle className="text-center text-xl leading-tight">
                  Are you sure to Complete Evaluation?
                </DialogTitle>
                <DialogDescription className="text-center text-sm">
                  You are about to submit marks{" "}
                  <span className="font-semibold text-foreground">
                    {total}/{displayTotalMax}
                  </span>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-center">
                <Button
                  variant="secondary"
                  onClick={() => setSubmitDialog(null)}
                  disabled={savingMark}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void confirmSubmit("finishNext")}
                  disabled={savingMark}
                  className="gap-1.5"
                >
                  Finish &amp; Next
                </Button>
                <Button
                  onClick={() => void confirmSubmit("finish")}
                  disabled={savingMark}
                  className="gap-1.5"
                >
                  <Send className="h-4 w-4" /> Finish
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
