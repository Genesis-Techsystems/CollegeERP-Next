'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronDown, Clock, FileText, Files, Info, ListChecks, Loader2, Maximize, Palette, Save, Send, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAnswerSheetPdf,
  useEvaluationData,
  useEvalPdfStartEndSetting,
  useQuestionPaperPdf,
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
  type EvaluationPageItem,
} from "../_lib/eval-mutations";

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
};

type Annotation = {
  id: string;
  qid: string;
  mark: number;
  x: number; // percent
  y: number; // percent
};

/** Map a backend EvalQuestion into the workbench's local marking model. */
function toLocalQuestion(x: EvalQuestion, idx: number): Q {
  const id = String(x.qvalue ?? x.qno ?? idx + 1);
  const max = Number(x.questionMarks) || 0;
  const isNotAnswered = !!x.isNotAnswered;
  // Seed local marks from the backend evaluated marks so the workbench opens
  // reflecting real state; a zero/unset evaluated mark shows as "not yet marked"
  // so the annotation flow stays demonstrable. (Local/in-memory only this pass.)
  const marks = isNotAnswered ? 0 : x.answeredMarks > 0 ? x.answeredMarks : null;
  return {
    id,
    qno: x.qno,
    questionPaperMarksId: x.questionPaperMarksId,
    question: x.question ?? "",
    level: x.level1No != null ? String(x.level1No) : "",
    max,
    marks,
    notAnswered: isNotAnswered,
  };
}

function marksFor(max: number) {
  const step = max <= 5 ? 0.5 : 1;
  const out: number[] = [];
  for (let v = 0; v <= max + 1e-9; v += step) out.push(Number(v.toFixed(1)));
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

type MarkColors = { solid: string; fg: string; soft: string; text: string };

/** Resolve the current theme's mark colors to canvas-usable strings. */
function getMarkColors(): MarkColors {
  const fallback: MarkColors = {
    solid: "#0f766e",
    fg: "#ffffff",
    soft: "#cfe9e4",
    text: "#1f2937",
  };
  if (typeof document === "undefined") return fallback;
  const read = (name: string) => {
    const probe = document.createElement("span");
    probe.style.color = `var(${name})`;
    probe.style.display = "none";
    document.body.appendChild(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return c;
  };
  try {
    return {
      solid: read("--mark") || fallback.solid,
      fg: read("--mark-foreground") || fallback.fg,
      soft: read("--mark-soft") || fallback.soft,
      text: read("--foreground") || fallback.text,
    };
  } catch {
    return fallback;
  }
}

/**
 * Draw a badge matching the live interactive one: a soft rounded pill holding the
 * question code + a solid mark-colored box with the mark value. Centered on (x, y).
 */
function drawMarkBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  qid: string,
  mark: string,
  colors: MarkColors,
) {
  const fs = Math.max(18, Math.round(ctx.canvas.width / 36));
  ctx.save();
  ctx.font = `bold ${fs}px Arial, sans-serif`;
  const qidW = ctx.measureText(qid).width;
  const markW = ctx.measureText(mark).width;
  const gap = fs * 0.45;
  const markPadX = fs * 0.5;
  const markBoxW = markW + markPadX * 2;
  const markBoxH = fs * 1.55;
  const padX = fs * 0.6;
  const padY = fs * 0.42;
  const boxW = padX * 2 + qidW + gap + markBoxW;
  const boxH = markBoxH + padY * 2;
  const bx = Math.max(6, Math.min(x - boxW / 2, ctx.canvas.width - boxW - 6));
  const by = Math.max(6, Math.min(y - boxH / 2, ctx.canvas.height - boxH - 6));
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  // Soft outer pill.
  ctx.fillStyle = colors.soft;
  roundRectPath(ctx, bx, by, boxW, boxH, boxH / 2);
  ctx.fill();
  // Question code.
  ctx.fillStyle = colors.text;
  ctx.fillText(qid, bx + padX, by + boxH / 2 + 1);
  // Solid mark box + value.
  const mbx = bx + padX + qidW + gap;
  const mby = by + (boxH - markBoxH) / 2;
  ctx.fillStyle = colors.solid;
  roundRectPath(ctx, mbx, mby, markBoxW, markBoxH, markBoxH / 2);
  ctx.fill();
  ctx.fillStyle = colors.fg;
  ctx.fillText(mark, mbx + markPadX, by + boxH / 2 + 1);
  ctx.restore();
}

/**
 * Compose each rendered page canvas into a JPEG with the mark badges baked in.
 * Badges are positioned as % of `paperEl`; we map them onto the page canvas each
 * badge falls on (by client Y) and draw them in the canvas's intrinsic pixel space.
 */
function composeBakedJpegs(
  paperEl: HTMLElement,
  canvases: HTMLCanvasElement[],
  annotations: Annotation[],
): string[] {
  const paperRect = paperEl.getBoundingClientRect();
  const colors = getMarkColors();
  return canvases.map((src) => {
    const temp = document.createElement("canvas");
    temp.width = src.width;
    temp.height = src.height;
    const ctx = temp.getContext("2d");
    if (!ctx) return src.toDataURL("image/jpeg", 0.85);
    ctx.drawImage(src, 0, 0);
    const rect = src.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return temp.toDataURL("image/jpeg", 0.85);
    const scaleX = src.width / rect.width;
    const scaleY = src.height / rect.height;
    for (const a of annotations) {
      const clientX = paperRect.left + (a.x / 100) * paperRect.width;
      const clientY = paperRect.top + (a.y / 100) * paperRect.height;
      if (clientY < rect.top || clientY > rect.bottom) continue; // not this page
      const ix = (clientX - rect.left) * scaleX;
      const iy = (clientY - rect.top) * scaleY;
      drawMarkBadge(ctx, ix, iy, String(a.qid), String(a.mark), colors);
    }
    return temp.toDataURL("image/jpeg", 0.85);
  });
}

export function EvaluationWorkbench({
  onBack,
  scriptId = "ESE25CS301-0004",
  studentAnswerPaperId,
  examEvaluationAssignmentId,
  subjectName,
}: {
  onBack?: () => void;
  scriptId?: string;
  studentAnswerPaperId?: string | number | null;
  examEvaluationAssignmentId?: string | number | null;
  subjectName?: string;
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

  // ---- Real question/marks data (read-only) --------------------------------
  const {
    data: evalData,
    isLoading: questionsLoading,
    isError: questionsError,
    refetch: refetchEvalData,
  } = useEvaluationData(examEvaluationAssignmentId ?? undefined);
  const qpTotalMarks = evalData?.qpTotalMarks ?? 0;
  const assignmentStatusId = evalData?.assignment?.fk_evaluationstatus_catdet_id;

  // True while a placed annotation is being persisted + reloaded.
  const [savingMark, setSavingMark] = useState(false);
  // Fire the "evaluation started" stamp only once per opened script.
  const startStampedRef = useRef(false);
  useEffect(() => {
    startStampedRef.current = false;
  }, [studentAnswerPaperId, examEvaluationAssignmentId]);

  // ---- Real answer-sheet PDF (base64) --------------------------------------
  const { data: pdfBase64, isLoading: pdfLoading } = useAnswerSheetPdf(
    studentAnswerPaperId ?? undefined,
  );

  // ---- Page masking (EVALPDFSTARTEND config) -------------------------------
  // settingValue is a comma-separated list of page numbers to hide from the
  // evaluator (e.g. "1,2" masks the cover/identity pages). Ported from Angular
  // hidePagesList = settingValue.split(',').map(Number).
  const { data: maskSettingValue } = useEvalPdfStartEndSetting();
  const hidePages = useMemo(() => {
    const set = new Set<number>();
    if (maskSettingValue) {
      for (const part of String(maskSettingValue).split(",")) {
        const n = Number(part.trim());
        if (Number.isFinite(n) && n > 0) set.add(n);
      }
    }
    return set;
  }, [maskSettingValue]);

  const [questions, setQuestions] = useState<Q[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  const [pendingMark, setPendingMark] = useState<number | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [actionDialog, setActionDialog] = useState<null | "reject" | "ufm">(null);
  const [reason, setReason] = useState("");
  const [paperOpen, setPaperOpen] = useState(false);
  const [paperZoom, setPaperZoom] = useState(1);
  const [naOpen, setNaOpen] = useState(false);
  const [naSelected, setNaSelected] = useState<Set<string>>(new Set());
  const [resetNaId, setResetNaId] = useState<string | null>(null);
  const [submitDialog, setSubmitDialog] = useState<null | "incomplete" | "confirm">(null);
  const [annotationsOpen, setAnnotationsOpen] = useState(false);
  const [theme, setTheme] = useState<"green" | "blue">(() => {
    if (typeof window === "undefined") return "blue";
    return (localStorage.getItem("app-theme") as "green" | "blue") || "blue";
  });

  // Seed/refresh the local marking model whenever real questions arrive or the
  // script changes. Annotations reset with each new script.
  // Rebuild the marking model from server data whenever questions arrive or a
  // save triggers a reload — marks come back authoritative from the backend.
  useEffect(() => {
    const rows = evalData?.questions ?? [];
    setQuestions(rows.map(toLocalQuestion));
  }, [evalData]);

  // Full reset only when a different script is opened (not on every refetch, so a
  // just-placed annotation and the active question survive the post-save reload).
  useEffect(() => {
    setActiveIdx(0);
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
  const renderSlotRef = useRef<((c: HTMLCanvasElement) => Promise<void>) | null>(null);
  // Set once the current script's pages are rendered; blocks spurious effect
  // re-runs (React re-mounts / transient query states) from wiping the pages.
  const pdfRenderedRef = useRef(false);
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
        const clean = pdfBase64.replace(/^data:[^,]*base64,/, "").replace(/\s/g, "");
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

        // Placeholder dimensions from the first visible page (scanned pages are
        // uniform), so page slots reserve the right space before they render.
        let firstVisible = 1;
        for (let p = 1; p <= doc.numPages; p++)
          if (!hidden.has(p)) { firstVisible = p; break; }
        const p1 = await doc.getPage(firstVisible);
        const vp1 = p1.getViewport({ scale: 1.5 });
        if (cancelled) return;

        // Render a single page slot on demand (kept at scale 1.5 so saved-mark
        // coordinates stay valid), then draw its saved marks.
        const renderSlot = async (canvas: HTMLCanvasElement) => {
          if (cancelled || !pdfDocRef.current) return;
          if (canvas.dataset.rendered === "1" || canvas.dataset.rendering === "1") return;
          canvas.dataset.rendering = "1";
          const p = Number(canvas.dataset.page);
          try {
            const page = await pdfDocRef.current.getPage(p);
            if (cancelled) return;
            const vp = page.getViewport({ scale: 1.5 });
            canvas.width = vp.width;
            canvas.height = vp.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            const task = page.render({ canvas, canvasContext: ctx, viewport: vp });
            renderTasks.add(task);
            try {
              await task.promise;
            } finally {
              renderTasks.delete(task);
            }
            if (cancelled) return;
            const colors = getMarkColors();
            for (const m of savedMarksRef.current) {
              if (Number(m.page) !== p) continue;
              drawMarkBadge(ctx, m.x, m.y, String(m.qid), String(m.mark), colors);
            }
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
              if (e.isIntersecting) void renderSlot(e.target as HTMLCanvasElement);
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
          canvas.className =
            "mx-auto mb-6 w-full max-w-full rounded-md border bg-white shadow-sm";
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
        setPdfErrorMsg(err instanceof Error ? err.message : "Failed to render PDF");
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
    // Re-run when the PDF data changes OR the container element attaches. The
    // container dep matters when the sheet is cached and available before the paper
    // subtree mounts (behind the questions-loading gate) — otherwise the one early
    // run finds no container and never fires again ("stuck loading"). pdfLoading is
    // intentionally NOT a dep: it would re-run + wipe rendered pages on fetch toggles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfBase64, containerEl]);

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
    if (paperOpen) setPaperZoom(1);
  }, [paperOpen]);

  useEffect(() => {
    if (naOpen) setNaSelected(new Set());
  }, [naOpen]);


  const active = questions[activeIdx];
  // Grand total is the server-authoritative value (applies best-of/capping so it
  // never exceeds the max) — mirrors Angular's questionMarksList[0].calculated_total_marks.
  // Fall back to the local sum only before the first server total arrives.
  const serverTotal = Number(evalData?.questions?.[0]?.calculated_total_marks);
  const total =
    Number.isFinite(serverTotal) && serverTotal > 0
      ? serverTotal
      : questions.reduce((s, q) => s + (q.marks ?? 0), 0);
  const totalMax = questions.reduce((s, q) => s + q.max, 0);
  const done = questions.filter((q) => q.marks !== null).length;
  const left = questions.length - done;
  // Denominator comes from the real question paper total; fall back to the sum
  // of per-question maxima if the backend total is unavailable.
  const displayTotalMax = qpTotalMarks || totalMax;

  // "Annotated on script" list = marks already saved on the paper (server) plus any
  // this-session placements not yet reflected in the saved set.
  const scriptAnnotations = useMemo(() => {
    const saved = (evalData?.savedMarks ?? []).map((m) => ({
      id: `saved-${m.page}-${m.qid}`,
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
        page: null as number | null,
        domId: `annot-${a.id}`,
      }));
    return [...saved, ...local];
  }, [evalData, annotations]);

  const setMark = (m: number) => {
    setPendingMark(m);
  };

  const handlePaperClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (pendingMark === null || !active || savingMark) return;
    if (examEvaluationAssignmentId == null || examEvaluationAssignmentId === "") {
      toast.error("Missing assignment id — cannot save this mark.");
      return;
    }
    const markValue = pendingMark;
    const assignId = examEvaluationAssignmentId;
    const prevMarks = active.marks;

    // Which rendered page canvas was clicked, and the Y within it.
    let pageNumber = 1;
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
          // Store intrinsic canvas-pixel Y (scale-independent) so the mark redraws
          // at the right height when the paper is reopened / composed.
          yInCanvas = (e.clientY - r.top) * (c.height / (r.height || 1));
          break;
        }
      }
    }

    // Optimistic local badge (percent over the scroll container) + local mark.
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    const optimisticId = `${Date.now()}`;
    setAnnotations((prev) => [
      ...prev.filter((a) => a.qid !== active.id),
      { id: optimisticId, qid: active.id, mark: markValue, x: xPct, y: yPct },
    ]);
    setQuestions((prev) =>
      prev.map((q, i) => (i === activeIdx ? { ...q, marks: markValue } : q)),
    );
    setPendingMark(null);

    // Backend payload — questionBtn + marksBtn, coordinate rules per Angular.
    const qY = Math.max(50, yInCanvas);
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
    } as const;
    const items: EvaluationPageItem[] = [
      { ...common, iconId: active.qno ?? 0, iconValue: active.id, iconType: "questionBtn", x_Axis: 60, y_Axis: qY, marks: 0 },
      { ...common, iconId: markValue, iconValue: markValue, iconType: "marksBtn", x_Axis: 120, y_Axis: qY - 40, marks: markValue },
    ];

    setSavingMark(true);
    try {
      // Replace semantics: if this question was already marked (or NA), clear its
      // prior record first so re-marking doesn't create duplicate annotation rows.
      if (
        (prevMarks != null || active.notAnswered) &&
        active.questionPaperMarksId != null
      ) {
        try {
          await deleteQuestionMarks(assignId, active.questionPaperMarksId);
        } catch {
          /* best-effort — proceed to save the new mark regardless */
        }
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
      await refetchEvalData();
    } catch (err) {
      // Roll back the optimistic badge/mark.
      setAnnotations((prev) => prev.filter((a) => a.id !== optimisticId));
      setQuestions((prev) =>
        prev.map((q, i) => (i === activeIdx ? { ...q, marks: prevMarks } : q)),
      );
      toast.error(err instanceof Error ? err.message : "Could not save the mark.");
    } finally {
      setSavingMark(false);
    }
  };

  const assignment = evalData?.assignment;
  // Real question paper (fetched only when the dialog is open).
  const questionPaperId = (assignment as any)?.pk_exam_questionpaper_id;
  const {
    data: qpBase64,
    isLoading: qpLoading,
    isError: qpError,
  } = useQuestionPaperPdf(questionPaperId, paperOpen);
  const qpCanvasRef = useRef<HTMLDivElement | null>(null);

  // Render the question-paper PDF (client-only) whenever the dialog opens with data.
  useEffect(() => {
    if (!paperOpen) return;
    let cancelled = false;
    const container = qpCanvasRef.current;
    if (!container || !qpBase64) return;
    container.innerHTML = "";
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        // Next/webpack emits the worker asset and returns its URL (Vite `?url` parity).
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        const clean = qpBase64.replace(/^data:[^,]*base64,/, "").replace(/\s/g, "");
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
          canvas.className = "mx-auto mb-4 w-full max-w-full rounded border shadow-sm";
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
  }, [paperOpen, qpBase64]);

  const qpMarksIdFor = (qid: string) =>
    questions.find((q) => q.id === qid)?.questionPaperMarksId ?? null;

  // Delete a placed annotation → remove its saved marks on the backend, then reload.
  const removeAnnotation = async (id: string) => {
    const annotation = annotations.find((a) => a.id === id);
    setAnnotations((prev) => prev.filter((a) => a.id !== id)); // optimistic
    if (!annotation || examEvaluationAssignmentId == null) return;
    const qpMarksId = qpMarksIdFor(annotation.qid);
    if (qpMarksId == null) return;
    try {
      const res = await deleteQuestionMarks(examEvaluationAssignmentId, qpMarksId);
      if (!res?.success) throw new Error(res?.message || "Delete failed");
      await refetchEvalData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove the mark.");
      await refetchEvalData();
    }
  };

  const toggleNaSelection = (id: string) => {
    setNaSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
    const items: EvaluationPageItem[] = questions
      .filter((q) => naSelected.has(q.id) && q.questionPaperMarksId != null)
      .map((q) => notAnsweredItem(q.questionPaperMarksId!, examEvaluationAssignmentId));
    setNaOpen(false);
    setSavingMark(true);
    try {
      const res = await saveEvaluationPages(items);
      if (!res?.success) throw new Error(res?.message || "Save failed");
      await refetchEvalData();
      toast.success(`${items.length} question(s) marked as not answered`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save not-answered.");
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
        await saveEvaluationDraft(examEvaluationAssignmentId);
      }
      await queryClient.invalidateQueries({ queryKey: ["assignedPapers"] });
      await queryClient.invalidateQueries({ queryKey: ["evaluatorSubjects"] });
      toast.success("Draft saved — marked in progress.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the draft.");
    } finally {
      setSavingMark(false);
      onBack?.();
    }
  };

  const clearNotAnswered = (id: string) => {
    setResetNaId(id);
  };

  // Reset a not-answered question → delete its record so it can be re-marked.
  const confirmResetNa = async () => {
    const qid = resetNaId;
    setResetNaId(null);
    if (!qid || examEvaluationAssignmentId == null) return;
    const qpMarksId = qpMarksIdFor(qid);
    if (qpMarksId == null) return;
    setSavingMark(true);
    try {
      const res = await deleteQuestionMarks(examEvaluationAssignmentId, qpMarksId);
      if (!res?.success) throw new Error(res?.message || "Reset failed");
      await refetchEvalData();
      toast.success("Question reset — you can now mark it normally");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset the question.");
    } finally {
      setSavingMark(false);
    }
  };

  const openAction = (kind: "reject" | "ufm") => {
    setReason("");
    setActionDialog(kind);
  };

  const unevaluated = questions.filter((q) => q.marks === null && !q.notAnswered);
  const isComplete = unevaluated.length === 0;

  const handleSubmitClick = () => {
    if (!isComplete) {
      setSubmitDialog("incomplete");
      return;
    }
    setSubmitDialog("confirm");
  };

  // Finish: compose the annotated page canvases into a PDF, upload it, finalize
  // the marks (IRREVERSIBLE), then return to the script list.
  const confirmSubmit = async () => {
    setSubmitDialog(null);
    if (examEvaluationAssignmentId == null) {
      toast.error("Missing assignment id.");
      return;
    }
    setSavingMark(true);
    const toastId = toast.loading("Finalizing evaluation…");
    try {
      const container = canvasContainerRef.current;
      const canvases = container
        ? (Array.from(container.querySelectorAll("canvas")) as HTMLCanvasElement[])
        : [];
      if (canvases.length === 0) throw new Error("Answer sheet not ready yet");
      // Pages render lazily on scroll — force-render any not-yet-rendered page so
      // the composed PDF includes every page.
      if (renderSlotRef.current) {
        for (const c of canvases) {
          if (c.dataset.rendered !== "1") await renderSlotRef.current(c);
        }
      }
      // Bake the mark badges onto each page before composing the PDF.
      const jpegs = paperRef.current
        ? composeBakedJpegs(paperRef.current, canvases, annotations)
        : canvases.map((c) => c.toDataURL("image/jpeg", 0.85));
      const path = String(assignment?.studentanswer_path ?? "");
      const fileName =
        path.split(/[\\/]/).pop() || `${headerScriptId || "evaluated"}.pdf`;
      const res = await finalizeAndUpload(examEvaluationAssignmentId, fileName, jpegs);
      if (!res?.success) throw new Error(res?.message || "Finalize failed");
      toast.success(`Evaluation submitted — total ${total}/${displayTotalMax}`, {
        id: toastId,
      });
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

  // Reject / UFM: persist the decision, then return to the script list.
  const confirmAction = async () => {
    if (!reason.trim()) {
      toast.error("Please enter a reason");
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
      evaluatedTotalMarks: total,
      evaluationStartDate:
        (assignment?.evaluation_startdate as string | null | undefined) ?? null,
      reason: reason.trim(),
    };
    try {
      const res =
        kind === "reject" ? await rejectEvaluation(args) : await ufmEvaluation(args);
      if (!res?.success) throw new Error(res?.message || "Action failed");
      toast.success(kind === "reject" ? "Evaluation rejected" : "Marked as UFM");
      setReason("");
      onBack?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the decision.");
    } finally {
      setSavingMark(false);
    }
  };

  // Shared full-screen shell for pre-data states (loading / error / empty).
  if (questionsLoading || questionsError || !active) {
    return (
      <div className="flex h-screen flex-col bg-muted/30">
        <div className="flex items-center justify-between gap-6 bg-eval-header px-6 py-3 text-eval-header-foreground">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="text-sm">
            <span className="text-white/70">ID :</span>{" "}
            <span className="font-mono font-semibold">{headerScriptId}</span>
          </div>
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
    <div className="flex h-screen flex-col bg-muted/30">
      {/* Full-width dark top bar — ExamDigit deep navy (not the host brand) */}
      <div
        className="flex items-center justify-between gap-6 bg-eval-header px-6 py-3 text-eval-header-foreground"
      >
        <div className="flex items-center gap-6 text-sm">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 font-medium hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <span className="text-white/70">ID :</span>
            <span className="font-mono font-semibold">{headerScriptId}</span>
          </div>
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
                theme === "green" ? "bg-white text-foreground" : "text-white/80 hover:bg-white/10",
              )}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "oklch(0.5 0.11 160)" }} />
              Green
            </button>
            <button
              onClick={() => setTheme("blue")}
              className={cn(
                "flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium",
                theme === "blue" ? "bg-white text-foreground" : "text-white/80 hover:bg-white/10",
              )}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "oklch(0.42 0.14 255)" }} />
              Blue
            </button>
          </div>
          <div>
            <span className="text-white/70">Evaluator:</span>{" "}
            <span className="font-semibold">{evaluatorName}</span>
          </div>
          <div className="flex items-center gap-1.5 font-semibold">
            <Clock className="h-4 w-4" /> 95:27
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* Left rail */}
      <aside className="flex w-[280px] shrink-0 flex-col border-r bg-card">
        <div className="flex items-center justify-between border-b bg-primary/30 px-4 py-3">
          <div className="flex-1 text-center text-sm font-semibold text-primary">
            Questions
          </div>
          <div className="flex-1 text-center text-sm font-semibold text-primary">
            Marks
          </div>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-hidden p-3">
          <div
            className={cn(
              "grid content-start gap-1.5 overflow-auto",
              questions.length > 10 ? "grid-cols-2" : "grid-cols-1",
            )}
          >
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setActiveIdx(i)}
                className={cn(
                  "rounded-md border px-2 py-1 text-[13px] font-medium transition-colors",
                  i === activeIdx
                    ? "border-primary bg-primary text-primary-foreground"
                    : q.marks !== null || q.notAnswered
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-card hover:bg-accent",
                )}
              >
                {q.id}
              </button>
            ))}
          </div>
          <div className="flex flex-col items-stretch gap-2 overflow-auto">
            <button
              onClick={() => setNaOpen(true)}
              className="rounded-full border bg-card py-1.5 text-center text-sm font-semibold text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground"
            >
              NA
            </button>
            <div className="grid grid-cols-2 gap-2">
              {marksFor(active.max).map((m) => {
                const isSelected = active.marks === m || pendingMark === m;
                return (
                  <button
                    key={m}
                    onClick={() => setMark(m)}
                    className={cn(
                      "flex h-10 items-center justify-center rounded-full text-sm font-semibold transition-all",
                      isSelected
                        ? "bg-mark text-mark-foreground shadow-md ring-2 ring-mark/30"
                        : "bg-mark/10 text-mark hover:bg-mark/20",
                    )}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mx-3 mb-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-2.5 py-1.5 text-left text-[11px] leading-snug text-muted-foreground">
          <span className="font-semibold text-primary">Tip:</span> pick a mark, then click the script to place it.
        </div>
        <div className="grid grid-cols-2 gap-2 border-t p-3">
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
        {/* Question section */}
        <div className="flex items-start justify-between gap-4 border-b bg-card px-6 py-4">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {active.level ? `PART ${active.level}` : "Question"}
            </div>
            <div className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap break-words text-sm font-semibold leading-snug text-foreground">
              {active.id}){active.question ? ` ${active.question}` : ""}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Max Marks: {active.max}
            </Badge>
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5 bg-primary/10 text-primary hover:bg-primary/20"
              onClick={() => setPaperOpen(true)}
            >
              <Files className="h-4 w-4" /> Question Paper
            </Button>

            <Button
              variant="secondary"
              size="icon"
              className="bg-primary/10 text-primary hover:bg-primary/20"
              aria-label="View answer sheet"
            >
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scanned paper */}
        <div className="flex-1 overflow-auto bg-muted/40 p-6">
          <div
            ref={paperRef}
            onClick={handlePaperClick}
            className={cn(
              "relative mx-auto max-w-3xl rounded-xl border bg-card p-10 shadow-sm",
              pendingMark !== null && "cursor-crosshair",
            )}
          >

            {/* Loading / error / empty states for the real PDF. */}
            {(pdfStatus === "loading" || pdfStatus === "idle") && (
              <div className="mt-8 flex flex-col items-center gap-3 py-16 text-muted-foreground">
                <Loader2 className="h-7 w-7 animate-spin" />
                <div className="text-sm font-medium">Loading answer paper…</div>
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

            {/* pdfjs renders one stacked <canvas> per page into this container. */}
            <div
              ref={setCanvasContainer}
              className={cn("mt-8", pdfStatus !== "ready" && "hidden")}
            />
            {annotations.map((a) => (
              <div
                key={a.id}
                id={`annot-${a.id}`}
                className="group pointer-events-auto absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-2xl border border-mark/20 bg-mark-soft/80 px-4 py-2 backdrop-blur-md ring-4 ring-mark/10"
                style={{
                  left: `${a.x}%`,
                  top: `${a.y}%`,
                  boxShadow: "0 8px 30px color-mix(in oklab, var(--mark) 12%, transparent)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-base font-semibold text-foreground">{a.qid}</span>
                <span
                  className="flex min-w-[2.5rem] items-center justify-center rounded-xl border border-mark/30 bg-mark px-3 py-1.5 text-base font-bold text-mark-foreground"
                  style={{
                    boxShadow: "0 4px 12px color-mix(in oklab, var(--mark) 30%, transparent), inset 0 -2px 0 rgba(0,0,0,0.1)",
                  }}
                >
                  {a.mark}
                </span>
                <Check className="h-6 w-6 text-mark" />
                <button
                  onClick={() => removeAnnotation(a.id)}
                  className="hidden rounded-full bg-destructive p-1.5 text-destructive-foreground hover:opacity-80 group-hover:inline-flex"
                  title="Remove"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          {pendingMark !== null && (
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
        <Card className="m-4 border-0 bg-eval-header shadow-sm">
          <CardContent className="p-5 text-center text-white">
            <div className="text-sm font-semibold">Calculate Total Score:</div>
            <div className="mt-2 flex items-baseline justify-center gap-1">
              <span className="text-6xl font-bold">{total}</span>
              <span className="text-2xl font-semibold text-white/80">/{displayTotalMax}</span>
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

        <div className="mt-4 flex-1 overflow-auto px-2">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary/30 hover:bg-primary/30">
                <TableHead className="text-xs font-bold text-primary">Questions</TableHead>
                <TableHead className="text-right text-xs font-bold text-primary">Marks</TableHead>
                <TableHead className="text-right text-xs font-bold text-primary">Max</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.map((q, i) => (
                <TableRow
                  key={q.id}
                  className={cn(
                    "cursor-pointer",
                    (q.marks !== null || q.notAnswered) && "bg-primary/10",
                    i === activeIdx && "ring-1 ring-primary/30 ring-inset",
                  )}
                  onClick={() => setActiveIdx(i)}
                >
                  <TableCell className="font-medium">{q.id}</TableCell>
                  <TableCell className="text-right font-mono">
                    {q.notAnswered ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearNotAnswered(q.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-destructive hover:bg-destructive/20"
                        title="Click to change (reset not-answered)"
                      >
                        NA
                        <X className="h-3 w-3" />
                      </button>
                    ) : (
                      q.marks ?? "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {q.max}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Collapsible
          open={annotationsOpen}
          onOpenChange={setAnnotationsOpen}
          className="border-t px-4 py-3"
        >
          <CollapsibleTrigger asChild>
            <button className="flex w-full items-center justify-between rounded-md bg-primary/30 px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="text-xs font-bold text-primary">Annotated on script</div>
                <Badge variant="secondary" className="text-[10px]">{scriptAnnotations.length}</Badge>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
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
                  <li key={a.id}>
                    <button
                      onClick={() => {
                        const qi = questions.findIndex((q) => q.id === a.qid);
                        if (qi !== -1) setActiveIdx(qi);
                        const target = a.domId
                          ? document.getElementById(a.domId)
                          : a.page != null
                            ? (canvasContainerRef.current?.querySelector(
                                `canvas[data-page="${a.page}"]`,
                              ) as HTMLElement | null)
                            : null;
                        target?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded-md border bg-card px-2.5 py-1.5 text-left text-xs hover:bg-accent"
                    >
                      <span className="font-medium text-foreground">{a.qid}</span>
                      <span className="rounded bg-primary/15 px-2 py-0.5 font-mono font-semibold text-primary">
                        {a.mark}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CollapsibleContent>
        </Collapsible>

        <div className="grid grid-cols-3 gap-2 border-t bg-muted/30 px-4 py-3 text-center text-xs">
          <div>
            <div className="text-muted-foreground">Total</div>
            <Badge className="mt-1 bg-primary text-primary-foreground">
              {questions.length}
            </Badge>
          </div>
          <div>
            <div className="text-muted-foreground">Done</div>
            <Badge className="mt-1 bg-primary/15 text-primary">{done}</Badge>
          </div>
          <div>
            <div className="text-muted-foreground">Left</div>
            <Badge className="mt-1 bg-[oklch(0.78_0.16_55)]/20 text-[oklch(0.5_0.16_55)]">
              {left}
            </Badge>
          </div>
        </div>
      </aside>
      </div>

      <Dialog open={actionDialog !== null} onOpenChange={(o) => !o && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">
              {actionDialog === "reject"
                ? "Are you sure to reject Evaluation?"
                : "Are you sure to mark as UFM?"}
            </DialogTitle>
            <DialogDescription className="text-center">
              You won't be able to revert this!
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason..."
            rows={4}
          />
          <DialogFooter className="sm:justify-center">
            <Button onClick={confirmAction}>
              {actionDialog === "reject" ? "Reject" : "Confirm UFM"}
            </Button>
            <Button variant="secondary" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paperOpen} onOpenChange={(o) => !o && setPaperOpen(false)}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-base">Question Paper</DialogTitle>
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
              </div>
            </div>
            <DialogDescription className="text-xs">
              View only — downloading is disabled.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[75vh] overflow-auto bg-muted/40 p-6">
            {qpLoading && (
              <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
                <Loader2 className="h-7 w-7 animate-spin" />
                <div className="text-sm">Loading question paper…</div>
              </div>
            )}
            {!qpLoading && (qpError || !qpBase64) && (
              <div className="flex flex-col items-center gap-2 py-20 text-center text-muted-foreground">
                <Info className="h-7 w-7 text-destructive" />
                <div className="text-sm font-medium text-foreground">
                  Question paper not available.
                </div>
              </div>
            )}
            <div
              ref={qpCanvasRef}
              className={cn(
                "mx-auto max-w-3xl transition-transform duration-200",
                (qpLoading || qpError || !qpBase64) && "hidden",
              )}
              style={{ transform: `scale(${paperZoom})`, transformOrigin: "top center" }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={naOpen} onOpenChange={(o) => !o && setNaOpen(false)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              <DialogTitle className="text-base">List of Not Answered Questions</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Select questions that were not answered and mark them as not answered.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto px-6 py-4">
            {questions.filter((q) => q.marks === null && !q.notAnswered).length === 0 ? (
              <div className="rounded-md border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                No unanswered questions remaining.
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {questions
                  .filter((q) => q.marks === null && !q.notAnswered)
                  .map((q) => (
                    <label
                      key={q.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                        naSelected.has(q.id)
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-accent",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={naSelected.has(q.id)}
                        onChange={() => toggleNaSelection(q.id)}
                      />
                      <span className="font-medium">{q.id}</span>
                    </label>
                  ))}
              </div>
            )}
          </div>
          <DialogFooter className="border-t px-6 py-4 sm:justify-end">
            <Button variant="secondary" onClick={() => setNaOpen(false)}>
              Close
            </Button>
            <Button
              onClick={markNotAnswered}
              disabled={naSelected.size === 0}
              className="gap-1.5"
              style={{ backgroundColor: "oklch(0.55 0.18 285)", color: "white" }}
            >
              Not Answered
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetNaId !== null} onOpenChange={(o) => !o && setResetNaId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Reset Not Answered?</DialogTitle>
            <DialogDescription className="text-center">
              This will clear the <span className="font-semibold text-foreground">{resetNaId}</span>{" "}
              not-answered status and let you mark it again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button variant="secondary" onClick={() => setResetNaId(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmResetNa}
              className="gap-1.5"
              style={{ backgroundColor: "oklch(0.55 0.18 285)", color: "white" }}
            >
              <X className="h-4 w-4" /> Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={submitDialog !== null} onOpenChange={(o) => !o && setSubmitDialog(null)}>
        <DialogContent className="max-w-md">
          {submitDialog === "incomplete" ? (
            <>
              <DialogHeader className="flex flex-col items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[oklch(0.85_0.08_220)]">
                  <Info className="h-8 w-8 text-[oklch(0.55_0.12_220)]" />
                </div>
                <DialogTitle className="text-center text-xl">
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
              <DialogHeader>
                <DialogTitle className="text-center text-xl">Submit Evaluation?</DialogTitle>
                <DialogDescription className="text-center">
                  You are about to submit marks{" "}
                  <span className="font-semibold text-foreground">
                    {total}/{displayTotalMax}
                  </span>{" "}
                  for script{" "}
                  <span className="font-semibold text-foreground">{headerScriptId}</span>. This action
                  cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="sm:justify-center">
                <Button variant="secondary" onClick={() => setSubmitDialog(null)}>
                  Cancel
                </Button>
                <Button onClick={confirmSubmit} className="gap-1.5">
                  <Send className="h-4 w-4" /> Submit
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>

  );
}