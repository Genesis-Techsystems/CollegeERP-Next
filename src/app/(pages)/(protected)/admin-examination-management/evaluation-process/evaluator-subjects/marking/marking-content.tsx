'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo, useImperativeHandle, forwardRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertCircle, Eye, FileText, ClipboardList, ZoomIn, ZoomOut,
  ChevronLeft, ChevronRight, Clock, XCircle, Flag,
  AlertTriangle, ArrowLeft,
} from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { cn } from '@/lib/utils'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useSessionContext } from '@/context/SessionContext'
import { htmlToPlaintext } from '@/common/generic-functions'

// Set up PDF.js worker — must run once before any Document is rendered
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

import {
  getExamQpDraftMarks,
  getAnswerPaperBase64,
  getEvalSetting,
  updateEvalAssignmentStartDate,
  updateEvalAssignment,
  updateEvalsCompletedCount,
  saveStudentEvalPages,
  saveFinalEvalPdf,
  finalizeEvalMarks,
  rejectEvalAssignment,
  ufmEvalAssignment,
  deleteEvalMark,
  isEvalLocked,
  EVAL_STATUS,
  type QuestionMark,
  type EvalAssignmentDetail,
  type MarkStampPayload,
  type NotAnsweredPayload,
} from '@/services/evaluation'
import { MINIO_URL } from '@/config/constants/api'
import { PDFDocument } from 'pdf-lib'

const ANSWER_SHEETS_PATH = '/admin-examination-management/evaluation-process/evaluator-subjects/answer-sheets'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return [h, m, sec].map((v) => String(v).padStart(2, '0')).join(':')
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function partLabel(level: number): string {
  return `PART ${'ABCDEFGHIJKLMNOP'[level - 1] ?? level}`
}


function calcTotal(questions: QuestionMark[]): number {
  return questions.reduce((sum, q) => {
    if (q.isNotAnswered) return sum
    return sum + (q.answeredMarks ?? 0)
  }, 0)
}

// ─── Mark value button array — mirrors Angular questionWiseMarksFormat() ──────

function buildMarkButtons(maxMarks: number, interval: number): number[] {
  const step = interval > 0 ? interval : 1
  const buttons: number[] = []
  for (let i = 0; i <= maxMarks; i = parseFloat((i + step).toFixed(2))) {
    buttons.push(i)
    if (buttons.length > 200) break
  }
  if (buttons[buttons.length - 1] !== maxMarks) buttons.push(maxMarks)
  return buttons
}

// ─── Stamp ────────────────────────────────────────────────────────────────────

interface Stamp {
  id: string
  pageNum: number
  /** Canvas coords in BASE_SCALE (1.5) pixel space — matches Angular's saved coords */
  x: number
  y: number
  questionId: number
  label: string
  marks: number
  /**
   * Primary key from ExamStudentEvaluationPages.
   * 0 (or null) means the row has not been persisted yet. Once the first save
   * returns, subsequent saves must echo this id so the server UPDATEs instead of
   * inserting a duplicate (which violates the uniqueness constraint on
   * assignmentId+questionPaperMarksId).
   */
  studentEvaluationPageId: number | null
}

// ─── QuestionNavPanel — adapted from script-grader QuestionNav ────────────────

interface QuestionNavPanelProps {
  questions: QuestionMark[]
  activeQId: number | null
  onSelect: (id: number) => void
}

function QuestionNavPanel({ questions, activeQId, onSelect }: QuestionNavPanelProps) {
  const parts = useMemo(() => {
    const map = new Map<number, QuestionMark[]>()
    for (const q of questions) {
      const lv = q.level1No ?? 1
      if (!map.has(lv)) map.set(lv, [])
      map.get(lv)!.push(q)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b)
  }, [questions])

  return (
    <div className="space-y-3">
      {parts.map(([level, qs]) => (
        <div key={level}>
          <h4 className="text-[9px] font-bold tracking-wide text-muted-foreground mb-1.5 uppercase">
            {partLabel(level)}
          </h4>
          <div className="grid grid-cols-2 gap-1">
            {qs.map((q) => {
              const isActive = q.questionPaperMarksId === activeQId
              const isNA = q.isNotAnswered
              const isGraded = q.answeredMarks !== null && !q.isNotAnswered && q.no_action_yet === 0
              return (
                <button
                  key={q.questionPaperMarksId}
                  onClick={() => onSelect(q.questionPaperMarksId)}
                  title={htmlToPlaintext(q.question || q.qvalue)}
                  className={cn(
                    'h-8 rounded text-[11px] font-bold transition-all duration-100 border relative',
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : isNA
                      ? 'bg-muted text-muted-foreground border-border line-through opacity-60 hover:opacity-80'
                      : isGraded
                      ? 'bg-green-500/15 text-green-700 border-green-500/40 hover:bg-green-500/25'
                      : 'bg-card text-foreground border-border hover:border-primary/40',
                  )}
                >
                  {q.qvalue}
                  {isNA && !isActive && (
                    <span className="absolute -top-1.5 -right-1.5 bg-muted-foreground text-background text-[7px] font-black rounded-full h-3.5 w-3.5 flex items-center justify-center leading-none">
                      N
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── MarkSelectorPanel — adapted from script-grader MarkSelector ──────────────

interface MarkSelectorPanelProps {
  maxMarks: number
  marksInterval: number
  selectedMark: number | null
  answeredMarks: number | null
  isNotAnswered: boolean
  activeQId: number | null
  stamps: Stamp[]
  onSelect: (mark: number) => void
  onNAClick: () => void
}

function MarkSelectorPanel({
  maxMarks, marksInterval, selectedMark, answeredMarks, isNotAnswered,
  activeQId, stamps, onSelect, onNAClick,
}: MarkSelectorPanelProps) {
  const marks = buildMarkButtons(maxMarks, marksInterval)

  return (
    <div className="flex flex-col gap-1.5">
      {/* NA button */}
      <button
        onClick={onNAClick}
        className={cn(
          'h-8 rounded text-[10px] font-bold transition-all duration-100 w-full border',
          isNotAnswered
            ? 'bg-amber-500 text-white border-amber-500'
            : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100',
        )}
      >
        N / A
      </button>

      {/* Mark value buttons */}
      <div className="grid grid-cols-2 gap-1">
        {marks.map((mark, i) => {
          const isSelected = selectedMark === mark
          const isPlaced =
            answeredMarks === mark &&
            !isNotAnswered &&
            stamps.some((s) => s.questionId === activeQId && s.marks === mark)
          const isAssigned = answeredMarks === mark && !isNotAnswered
          return (
            <button
              key={i}
              onClick={() => onSelect(mark)}
              className={cn(
                'h-8 rounded text-[11px] font-bold transition-all duration-100 border',
                isSelected
                  ? 'bg-amber-500 text-white border-amber-500 shadow-md scale-105'
                  : isPlaced
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm ring-1 ring-primary/30'
                  : isAssigned
                  ? 'bg-primary/70 text-white border-primary/50'
                  : 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100',
              )}
            >
              {mark}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── PDF Canvas Viewer — mirrors Angular's canvas-based rendering ─────────────

const PDF_BASE_SCALE = 1.5

interface PdfCanvasViewerProps {
  url: string
  stamps: Stamp[]
  selectedMark: number | null
  locked: boolean
  stampSize: number
  showThumbnails: boolean
  onCloseThumbnails: () => void
  onCanvasClick: (pageNum: number, x: number, y: number) => void
  onStampDelete: (stamp: Stamp) => void
}

/**
 * Imperative handle exposed by PdfCanvasViewer so the parent can generate the
 * final annotated PDF (for Finish) without reaching into this component's DOM.
 */
export interface PdfCanvasViewerHandle {
  /**
   * Returns one JPEG blob per PDF page, with stamps baked onto the pixels.
   * Mirrors Angular's imageCanvas() + renderAnnotations() flow used by finishPaper().
   */
  captureAnnotatedPages: () => Promise<Blob[]>
}

const PdfCanvasViewer = forwardRef<PdfCanvasViewerHandle, PdfCanvasViewerProps>(function PdfCanvasViewer({
  url, stamps, selectedMark, locked, stampSize,
  showThumbnails, onCloseThumbnails, onCanvasClick,
  onStampDelete,
}, ref) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pageWrapRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({})
  const genRef = useRef<Record<number, number>>({})

  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [zoomMultiplier, setZoomMultiplier] = useState(1.0)
  const [pdfError, setPdfError] = useState(false)
  const pdfDocRef = useRef<any>(null)

  // Stamps are immovable once placed — matches Angular, which has no drag handler.
  // To reposition, the evaluator uses the Delete Mark button and clicks again.

  // ── Capture pages with stamps for Finish flow ──────────────────────────────
  // Render each page at BASE_SCALE onto a fresh offscreen canvas, draw the stamps
  // at their saved BASE_SCALE-space coordinates, and export JPEG blobs. Mirrors
  // Angular imageCanvas() + renderAnnotations() (evaluation.component.ts:990, 882).
  useImperativeHandle(ref, () => ({
    captureAnnotatedPages: async () => {
      const doc = pdfDocRef.current
      if (!doc) return []
      const total: number = doc.numPages
      const blobs: Blob[] = []

      for (let pageNum = 1; pageNum <= total; pageNum++) {
        const page = await doc.getPage(pageNum)
        const viewport = page.getViewport({ scale: PDF_BASE_SCALE })
        const off = document.createElement('canvas')
        off.width = Math.floor(viewport.width)
        off.height = Math.floor(viewport.height)
        const ctx = off.getContext('2d')!
        await page.render({ canvasContext: ctx, viewport }).promise

        // Bake stamps onto the rasterized page (coords are already in BASE_SCALE space).
        const pageStamps = stamps.filter((s) => s.pageNum === pageNum)
        if (pageStamps.length > 0) {
          const SW = stampSize
          const SH = stampSize
          for (const stamp of pageStamps) {
            // Label (e.g. "1a") to the left of the badge
            ctx.save()
            ctx.font = `bold ${Math.max(11, Math.round(SW * 0.3))}px Arial`
            ctx.fillStyle = '#0f766e' // teal-700
            ctx.textBaseline = 'middle'
            ctx.fillText(stamp.label, stamp.x - Math.round(SW * 0.9), stamp.y + SH / 2)
            ctx.restore()

            // Teal badge with the awarded marks
            ctx.save()
            ctx.fillStyle = '#0d9488' // teal-600
            ctx.fillRect(stamp.x, stamp.y, SW, SH)
            ctx.fillStyle = '#ffffff'
            ctx.font = `900 ${Math.max(11, Math.round(SW * 0.42))}px Arial`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(String(stamp.marks), stamp.x + SW / 2, stamp.y + SH / 2)
            ctx.restore()

            // Green ✓ tick to the right of the badge
            ctx.save()
            ctx.font = `bold ${Math.max(16, Math.round(SW * 0.65))}px Arial`
            ctx.fillStyle = '#16a34a' // green-600
            ctx.textBaseline = 'middle'
            ctx.fillText('\u2713', stamp.x + SW + 2, stamp.y + SH / 2)
            ctx.restore()
          }
        }

        const blob: Blob | null = await new Promise((resolve) =>
          off.toBlob((b) => resolve(b), 'image/jpeg', 0.92),
        )
        if (blob) blobs.push(blob)
      }
      return blobs
    },
  }), [ref, stamps, stampSize])

  // ── Page rendering ──────────────────────────────────────────────────────────

  const renderPage = useCallback(async (pageNum: number, zoom: number) => {
    const doc = pdfDocRef.current
    if (!doc) return
    const canvas = canvasRefs.current[pageNum]
    if (!canvas) return

    const myGen = (genRef.current[pageNum] = (genRef.current[pageNum] ?? 0) + 1)

    let page: any
    try {
      page = await doc.getPage(pageNum)
    } catch {
      return
    }
    if (genRef.current[pageNum] !== myGen) return

    const viewport = page.getViewport({ scale: PDF_BASE_SCALE * zoom })
    const newW = Math.floor(viewport.width)
    const newH = Math.floor(viewport.height)

    // Render into a throw-away canvas so PDF.js has full ownership of that 2D context.
    // PDF.js does not guarantee it restores the context transform after rendering —
    // accumulated transforms on a reused canvas cause H+V flips on pages 2+.
    const tmp = document.createElement('canvas')
    tmp.width = newW
    tmp.height = newH
    const tmpCtx = tmp.getContext('2d')!

    try {
      await page.render({ canvasContext: tmpCtx, viewport }).promise
    } catch {
      return
    }
    if (genRef.current[pageNum] !== myGen) return

    // Resize display canvas and copy rendered PDF. Stamps are rendered as HTML overlays, not on canvas.
    canvas.width = newW
    canvas.height = newH
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(tmp, 0, 0)
  }, [])

  // ── Load PDF document ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!url) return
    let cancelled = false
    setPdfError(false)
    setNumPages(0)
    setCurrentPage(1)
    pdfDocRef.current = null
    canvasRefs.current = {}
    genRef.current = {}

    pdfjs.getDocument(url).promise.then((doc) => {
      if (cancelled) return
      pdfDocRef.current = doc
      setNumPages(doc.numPages)
    }).catch(() => {
      if (!cancelled) setPdfError(true)
    })

    return () => { cancelled = true }
  }, [url])

  // ── Initial render after PDF loads ─────────────────────────────────────────

  useEffect(() => {
    if (!numPages || !pdfDocRef.current) return
    const t = setTimeout(() => {
      for (let p = 1; p <= numPages; p++) renderPage(p, zoomMultiplier)
    }, 60)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numPages, renderPage])

  // ── Re-render all pages when zoom changes ──────────────────────────────────

  useEffect(() => {
    if (!pdfDocRef.current || numPages === 0) return
    for (let p = 1; p <= numPages; p++) renderPage(p, zoomMultiplier)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomMultiplier, numPages, renderPage])


  // ── IntersectionObserver — track which page is visible ─────────────────────

  useEffect(() => {
    if (!numPages || !scrollRef.current) return
    const root = scrollRef.current
    const observer = new IntersectionObserver(
      (entries) => {
        let best: { page: number; ratio: number } | null = null
        for (const e of entries) {
          const page = Number(e.target.getAttribute('data-page'))
          if (e.isIntersecting && (!best || e.intersectionRatio > best.ratio)) {
            best = { page, ratio: e.intersectionRatio }
          }
        }
        if (best) setCurrentPage(best.page)
      },
      { root, threshold: [0.1, 0.5] },
    )
    Object.entries(pageWrapRefs.current).forEach(([, el]) => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [numPages])

  const goTo = useCallback((p: number) => {
    const clamped = Math.max(1, Math.min(numPages || 1, p))
    setCurrentPage(clamped)
    pageWrapRefs.current[clamped]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [numPages])

  // ── Render ──────────────────────────────────────────────────────────────────

  if (pdfError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-white text-slate-400 text-sm">
        <AlertCircle className="h-7 w-7 text-slate-300" />
        <p className="font-medium text-slate-500">PDF could not be loaded.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Toolbar ── */}
      <div className="shrink-0 flex items-center gap-1 bg-white border-b border-slate-200 px-3 py-1.5 text-xs select-none">
        <button
          onClick={() => setZoomMultiplier((z) => Math.max(0.5, parseFloat((z - 0.25).toFixed(2))))}
          title="Zoom out"
          className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-40 transition-colors text-slate-500"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-[44px] text-center font-mono text-slate-600">{Math.round(zoomMultiplier * 100)}%</span>
        <button
          onClick={() => setZoomMultiplier((z) => Math.min(3, parseFloat((z + 0.25).toFixed(2))))}
          title="Zoom in"
          className="p-1.5 rounded-md hover:bg-slate-100 transition-colors text-slate-500"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>

        <div className="w-px h-4 bg-slate-200 mx-1" />

        <button
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage <= 1}
          title="Previous page"
          className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-40 transition-colors text-slate-500"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-[64px] text-center font-mono text-slate-600">
          {numPages ? `${currentPage} / ${numPages}` : '—'}
        </span>
        <button
          onClick={() => goTo(currentPage + 1)}
          disabled={!numPages || currentPage >= numPages}
          title="Next page"
          className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-40 transition-colors text-slate-500"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        <div className="w-px h-4 bg-slate-200 mx-1" />
        {[0.75, 1, 1.5, 2].map((z) => (
          <button
            key={z}
            onClick={() => setZoomMultiplier(z)}
            className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors
              ${zoomMultiplier === z ? 'bg-primary text-white shadow-sm' : 'hover:bg-slate-100 text-slate-500'}`}
          >
            {Math.round(z * 100)}%
          </button>
        ))}
      </div>

      {/* ── Canvas scroll area ── */}
      <div ref={scrollRef} className="flex-1 overflow-auto bg-[#ededed]">
        {!numPages && !pdfError && (
          <div className="flex h-32 items-center justify-center text-slate-500 text-sm">
            Loading PDF…
          </div>
        )}
        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
          const pageStamps = stamps.filter((s) => s.pageNum === pageNum)
          const SW = stampSize * zoomMultiplier
          const SH = stampSize * zoomMultiplier
          return (
            <div
              key={pageNum}
              data-page={pageNum}
              ref={(el) => { pageWrapRefs.current[pageNum] = el }}
              className="flex justify-center py-3"
            >
              <div className="relative inline-block shadow-xl">
                <canvas
                  ref={(el) => { canvasRefs.current[pageNum] = el }}
                  className="block"
                  style={{ cursor: selectedMark !== null && !locked ? 'crosshair' : 'default' }}
                  onClick={(e) => {
                    if (selectedMark === null || locked) return
                    const rect = e.currentTarget.getBoundingClientRect()
                    const canvasX = e.clientX - rect.left
                    const canvasY = e.clientY - rect.top
                    onCanvasClick(pageNum, canvasX / zoomMultiplier, canvasY / zoomMultiplier)
                  }}
                />

                {/* Stamp overlay — Angular-parity: stamps are immovable once placed.
                    To reposition, use Delete Mark and click again. The ✕ button deletes. */}
                {pageStamps.length > 0 && (
                  <div className="absolute inset-0 pointer-events-none">
                    {pageStamps.map((stamp) => {
                      const badgeFont = Math.max(11, Math.round(SW * 0.42))
                      return (
                        <div
                          key={stamp.id}
                          className="absolute pointer-events-auto flex items-center gap-1 select-none group"
                          style={{
                            // Anchor badge top-left at (stamp.x, stamp.y); label extends to the left via negative margin.
                            left: stamp.x * zoomMultiplier,
                            top: stamp.y * zoomMultiplier,
                          }}
                        >
                          <span
                            className="text-teal-700 font-bold whitespace-nowrap drop-shadow-sm"
                            style={{ fontSize: Math.max(11, Math.round(SW * 0.3)), marginRight: 2, marginLeft: -Math.round(SW * 0.9) }}
                          >
                            {stamp.label}
                          </span>
                          <span
                            className="inline-flex items-center justify-center rounded bg-teal-600 text-white font-black shadow"
                            style={{ width: SW, height: SH, fontSize: badgeFont }}
                          >
                            {stamp.marks}
                          </span>
                          <span
                            className="text-green-600 font-bold leading-none"
                            style={{ fontFamily: "'Caveat', cursive", fontSize: Math.max(16, Math.round(SW * 0.65)) }}
                            aria-hidden
                          >
                            ✓
                          </span>
                          {!locked && (
                            <button
                              type="button"
                              className="hidden group-hover:inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold shadow ml-0.5 cursor-pointer hover:bg-red-600"
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onStampDelete(stamp) }}
                              title="Delete stamp"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Thumbnail overlay ── */}
      {showThumbnails && numPages > 0 && (
        <div
          className="fixed inset-0 z-[200] flex items-start justify-center bg-black/50 overflow-y-auto py-8"
          onClick={(e) => { if (e.target === e.currentTarget) onCloseThumbnails() }}
        >
          <div className="bg-white rounded-lg shadow-2xl w-[95%] max-w-7xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">View Pages ({numPages})</h2>
              <button onClick={onCloseThumbnails} className="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
            </div>
            <div className="overflow-y-auto p-6">
              <Document file={url}>
                <div className="flex flex-wrap justify-center gap-4">
                  {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => { goTo(pageNum); onCloseThumbnails() }}
                      title={`Go to page ${pageNum}`}
                      className={`flex flex-col border rounded overflow-hidden shadow-sm transition-transform duration-200 hover:scale-105
                        ${pageNum === currentPage ? 'border-primary border-2' : 'border-slate-300'}`}
                      style={{ width: 150 }}
                    >
                      <Page
                        pageNumber={pageNum}
                        width={150}
                        renderAnnotationLayer={false}
                        renderTextLayer={false}
                      />
                      <div className="bg-slate-50 text-center text-[11px] text-slate-500 py-1 border-t border-slate-200">
                        Page {pageNum}
                      </div>
                    </button>
                  ))}
                </div>
              </Document>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

// ─── MarkingRightPanel — adapted from script-grader MarkingPanel ──────────────

interface MarkingRightPanelProps {
  questions: QuestionMark[]
  totalAwarded: number
  totalMax: number
  activeQId: number | null
  onSelectQuestion: (q: QuestionMark) => void
  locked: boolean
  saving: boolean
  pendingCount: number
  onSaveAndExit: () => void
  onFinish: () => void
  onReject: () => void
  onUFM: () => void
}

function MarkingRightPanel({
  questions, totalAwarded, totalMax, activeQId, onSelectQuestion,
  locked, saving, pendingCount,
  onSaveAndExit, onFinish, onReject, onUFM,
}: MarkingRightPanelProps) {
  const parts = useMemo(() => {
    const map = new Map<number, QuestionMark[]>()
    for (const q of questions) {
      const lv = q.level1No ?? 1
      if (!map.has(lv)) map.set(lv, [])
      map.get(lv)!.push(q)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b)
  }, [questions])

  const totalVisited = questions.filter((q) => q.no_action_yet === 0).length
  const totalNotVisited = questions.length - totalVisited

  return (
    <div className="flex flex-col h-full">
      {/* Score card */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg mx-3 mt-3 shrink-0">
        <div className="text-xs font-semibold mb-1 text-center opacity-80">Calculate Total Score:</div>
        <div className="text-3xl font-black text-center">
          {totalAwarded}
          <span className="text-base font-normal opacity-75">/{totalMax}</span>
        </div>
      </div>

      {/* Primary actions — Save & Exit + Finish at top */}
      {!locked && (
        <div className="mx-3 mt-3 shrink-0 grid grid-cols-2 gap-2">
          {/* Save & Exit — teal (script-grader primary) */}
          <button
            disabled={saving}
            onClick={onSaveAndExit}
            className="h-9 rounded bg-teal-600 text-white hover:bg-teal-700 text-[11px] font-bold disabled:opacity-50 transition-colors"
          >
            {saving ? '…' : 'Save & Exit'}
          </button>
          {/* Finish — emerald */}
          <button
            disabled={saving}
            onClick={onFinish}
            className="h-9 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-bold disabled:opacity-50 transition-colors"
          >
            {saving ? '…' : 'Finish'}
          </button>
        </div>
      )}

      {pendingCount > 0 && !locked && (
        <div className="mx-3 mt-2 shrink-0 flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
          {pendingCount} pending
        </div>
      )}

      {/* Questions table */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card z-10 border-b border-slate-200">
            <tr>
              <th className="px-3 py-2 text-left font-bold text-primary">Questions</th>
              <th className="px-3 py-2 text-center font-bold text-primary">Marks</th>
              <th className="px-3 py-2 text-center font-bold text-primary">Max</th>
            </tr>
          </thead>
          <tbody>
            {parts.map(([level, qs]) => (
              <React.Fragment key={`part-${level}`}>
                <tr>
                  <td colSpan={3} className="px-3 pt-3 pb-1 font-black text-[10px] text-foreground uppercase tracking-wider">
                    {partLabel(level)}
                  </td>
                </tr>
                {qs.map((q) => {
                  const isActive = q.questionPaperMarksId === activeQId
                  const isNA = q.isNotAnswered
                  const hasMarks = q.answeredMarks !== null && !q.isNotAnswered
                  return (
                    <tr
                      key={q.questionPaperMarksId}
                      onClick={() => onSelectQuestion(q)}
                      className={cn(
                        'border-t border-slate-100 transition-colors cursor-pointer',
                        isActive && 'bg-primary/10',
                        isNA && !isActive && 'opacity-50',
                        !isActive && 'hover:bg-muted/40',
                      )}
                    >
                      <td className={cn('px-3 py-1.5 font-medium', isNA && 'line-through')}>
                        {q.qvalue}
                        {isNA && <span className="ml-1 text-[9px] text-muted-foreground font-normal">(NA)</span>}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        {isNA ? (
                          <span className="font-semibold text-muted-foreground">NA</span>
                        ) : hasMarks ? (
                          <span className="inline-flex items-center justify-center h-5 min-w-[1.75rem] px-1.5 rounded bg-teal-100 text-teal-700 border border-teal-200 text-[11px] font-bold">
                            {q.answeredMarks}
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-center text-muted-foreground">{q.questionMarks}</td>
                    </tr>
                  )
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer stats */}
      <div className="p-3 border-t border-slate-200 bg-muted/30 shrink-0">
        <div className="flex justify-between text-[11px]">
          <div>
            <span className="text-muted-foreground font-medium">Total Pages: </span>
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-primary text-primary-foreground font-bold text-[10px] ml-1">
              {questions.length}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground font-medium">Visited: </span>
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-green-500 text-white font-bold text-[10px] ml-1">
              {totalVisited}
            </span>
          </div>
        </div>
        <div className="mt-1.5 text-[11px]">
          <span className="text-muted-foreground font-medium">Not Visited: </span>
          <span className="inline-flex h-5 min-w-[1.25rem] px-1 items-center justify-center rounded bg-red-500 text-white font-bold text-[10px] ml-1">
            {totalNotVisited}
          </span>
        </div>
      </div>

      {/* Destructive actions — Reject + UFM anchored at bottom (less commonly clicked) */}
      {!locked && (
        <div className="mx-3 mb-3 mt-2 shrink-0 grid grid-cols-2 gap-2">
          <button
            disabled={saving}
            onClick={onReject}
            className="h-9 rounded bg-red-500 text-white hover:bg-red-600 text-[11px] font-semibold disabled:opacity-50 transition-colors"
          >
            <XCircle className="h-3 w-3 inline mr-1 -mt-0.5" />
            Reject Paper
          </button>
          <button
            disabled={saving}
            onClick={onUFM}
            className="h-9 rounded bg-slate-700 text-white hover:bg-slate-800 text-[11px] font-semibold disabled:opacity-50 transition-colors"
          >
            <Flag className="h-3 w-3 inline mr-1 -mt-0.5" />
            UFM
          </button>
        </div>
      )}
    </div>
  )
}

// ─── NotAnsweredDialog — adapted from script-grader NotViewedDialog ───────────

interface NotAnsweredDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  questions: QuestionMark[]
  onMarkNotAnswered: (ids: number[]) => void
}

function NotAnsweredDialog({ open, onOpenChange, questions, onMarkNotAnswered }: NotAnsweredDialogProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [confirmStep, setConfirmStep] = useState(false)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) { setSelected(new Set()); setConfirmStep(false) }
    onOpenChange(nextOpen)
  }

  const toggleQuestion = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allSelected = questions.length > 0 && selected.size === questions.length
  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === questions.length ? new Set() : new Set(questions.map((q) => q.questionPaperMarksId)),
    )
  }

  // Questions that already have marks and are about to be reset
  const markedSelected = questions.filter(
    (q) => selected.has(q.questionPaperMarksId) && q.answeredMarks !== null && !q.isNotAnswered,
  )

  const handleSubmitClick = () => {
    if (selected.size === 0) return
    if (markedSelected.length > 0) {
      setConfirmStep(true)
    } else {
      doSubmit()
    }
  }

  const doSubmit = () => {
    onMarkNotAnswered(Array.from(selected))
    setSelected(new Set())
    setConfirmStep(false)
    onOpenChange(false)
  }

  const unevaluatedCount = questions.filter((q) => q.no_action_yet === 1 && !q.isNotAnswered).length

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        {confirmStep ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                Reset existing marks?
              </DialogTitle>
              <DialogDescription>
                <span className="font-semibold">{markedSelected.length}</span> selected question(s) already have marks assigned. Marking as Not Answered will reset their marks to 0 and remove any stamps.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 mt-4">
              <button
                onClick={() => setConfirmStep(false)}
                className="px-4 py-2 rounded border border-slate-200 text-sm font-medium hover:bg-muted transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={doSubmit}
                className="px-4 py-2 rounded bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Reset & Mark Not Answered
              </button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Mark as Not Answered</DialogTitle>
              <DialogDescription>
                Select questions to assign <span className="font-semibold">0</span> marks. Questions with existing marks will require confirmation.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2">
              <button
                type="button"
                className="flex items-center gap-2 text-sm"
                onClick={toggleAll}
                disabled={questions.length === 0}
              >
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Select all"
                />
                <span className="font-medium">Select all</span>
              </button>
              <div className="text-xs text-muted-foreground">
                Unevaluated: <span className="font-medium text-foreground">{unevaluatedCount}</span>
                {' · '}
                Selected: <span className="font-medium text-foreground">{selected.size}</span>
              </div>
            </div>

            <div className="max-h-[50vh] overflow-y-auto rounded-md border divide-y">
              {questions.map((q) => {
                const hasMarks = q.answeredMarks !== null && !q.isNotAnswered
                return (
                  <button
                    key={q.questionPaperMarksId}
                    type="button"
                    onClick={() => toggleQuestion(q.questionPaperMarksId)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={selected.has(q.questionPaperMarksId)}
                      onCheckedChange={() => toggleQuestion(q.questionPaperMarksId)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{q.qvalue}</div>
                        <div className="truncate text-xs text-muted-foreground">{partLabel(q.level1No)}</div>
                      </div>
                      <div className="shrink-0">
                        {hasMarks ? (
                          <Badge variant="secondary" className="text-xs">
                            {q.answeredMarks}/{q.questionMarks}
                          </Badge>
                        ) : q.isNotAnswered ? (
                          <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">NA</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Max {q.questionMarks}</span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}

              {questions.length === 0 && (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">No questions available.</div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <button
                onClick={() => handleOpenChange(false)}
                className="px-4 py-2 rounded border border-slate-200 text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitClick}
                disabled={selected.size === 0}
                className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                Mark Not Answered
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarkingPage() {
  const router = useRouter()
  const { user } = useSessionContext()
  const searchParams = useSearchParams()

  const examEvaluationAssignmentId = Number(searchParams.get('examEvaluationAssignmentId') ?? 0)
  const studentAnswerPaperId = Number(searchParams.get('studentAnswerPaperId') ?? 0)
  const examEvaluatorProfileId = Number(searchParams.get('examEvaluatorProfileId') ?? 0)
  const examEvaluatorProfileDetId = Number(searchParams.get('examEvaluatorProfileDetId') ?? 0)
  const subjectName = searchParams.get('subjectName') ?? 'Answer Paper'
  const subjectCode = searchParams.get('subjectCode') ?? ''

  // ── State ──────────────────────────────────────────────────────────────────

  const [questions, setQuestions] = useState<QuestionMark[]>([])
  const [assignmentDetail, setAssignmentDetail] = useState<EvalAssignmentDetail | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [activeQId, setActiveQId] = useState<number | null>(null)
  const [marksInterval, setMarksInterval] = useState(0.5)
  const [deletingMark, setDeletingMark] = useState(false)
  const [showThumbnails, setShowThumbnails] = useState(false)
  const [stampSize, setStampSize] = useState(50)
  const [undoStack, setUndoStack] = useState<QuestionMark[][]>([])
  const [stamps, setStamps] = useState<Stamp[]>([])
  const [selectedMark, setSelectedMark] = useState<number | null>(null)
  const [notViewedOpen, setNotViewedOpen] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const viewerRef = useRef<PdfCanvasViewerHandle | null>(null)

  // ── Derived ────────────────────────────────────────────────────────────────

  const locked = isEvalLocked(assignmentDetail?.evaluationStatusCatDetId ?? 0)
  const omrSerialNo = assignmentDetail?.omrSerialNo ?? ''
  const totalAwarded = calcTotal(questions)
  const totalMax = assignmentDetail?.qpTotalMarks ?? questions.reduce((s, q) => s + (q.questionMarks ?? 0), 0)
  const pendingQuestions = questions.filter((q) => q.no_action_yet === 1 && !q.isNotAnswered)

  const activeQuestion = useMemo(
    () => questions.find((q) => q.questionPaperMarksId === activeQId) ?? null,
    [questions, activeQId],
  )

  // ── Navigate back ──────────────────────────────────────────────────────────

  const navigateBack = useCallback(() => {
    router.push(
      `${ANSWER_SHEETS_PATH}` +
      `?examEvaluatorProfileId=${examEvaluatorProfileId}` +
      `&examEvaluatorProfileDetId=${examEvaluatorProfileDetId}`,
    )
  }, [router, examEvaluatorProfileId, examEvaluatorProfileDetId])

  // ── Load data on mount ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!examEvaluationAssignmentId || !studentAnswerPaperId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setLoadError(null)

      try {
        const [qpResult, base64Result, intervalResult] = await Promise.allSettled([
          getExamQpDraftMarks({ examEvaluationAssignmentId, orgId: user?.organizationId ?? user?.collegeId }),
          getAnswerPaperBase64(studentAnswerPaperId),
          getEvalSetting('MarksIntervals'),
        ])

        if (cancelled) return

        if (intervalResult.status === 'fulfilled' && intervalResult.value) {
          const iv = parseFloat(intervalResult.value)
          if (!isNaN(iv) && iv > 0) setMarksInterval(iv)
        }

        if (qpResult.status === 'fulfilled') {
          const [qs, details] = qpResult.value
          setQuestions(qs)
          if (qs.length > 0) setActiveQId(qs[0].questionPaperMarksId)
          const detail = details[0] ?? null
          setAssignmentDetail(detail)
          if (detail && !isEvalLocked(detail.evaluationStatusCatDetId ?? 0)) {
            updateEvalAssignmentStartDate(examEvaluationAssignmentId, new Date().toISOString()).catch(() => {})
          }
          if (detail?.evaluationTime) setElapsedSeconds(detail.evaluationTime)

          // Restore saved stamp positions (Angular: buildAnnotations + renderAnnotations)
          const restoredStamps: Stamp[] = qs
            .filter((q) => q.mbtn_x != null && q.mbtn_y != null && q.mbtn_pageNum != null && q.answeredMarks != null)
            .map((q) => ({
              id: String(q.studentEvaluationPageId || q.questionPaperMarksId),
              pageNum: q.mbtn_pageNum!,
              x: q.mbtn_x!,
              y: q.mbtn_y!,
              questionId: q.questionPaperMarksId,
              label: q.qvalue ?? String(q.questionPaperMarksId),
              marks: q.answeredMarks!,
              studentEvaluationPageId: q.studentEvaluationPageId || null,
            }))
          setStamps(restoredStamps)
        } else {
          setLoadError(
            qpResult.reason instanceof Error ? qpResult.reason.message : 'Failed to load question paper.',
          )
        }

        if (base64Result.status === 'fulfilled' && base64Result.value) {
          try {
            const binary = atob(base64Result.value)
            const bytes = new Uint8Array(binary.length)
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
            const blob = new Blob([bytes], { type: 'application/pdf' })
            const url = URL.createObjectURL(blob)
            blobUrlRef.current = url
            setPdfUrl(url)
          } catch {
            setPdfError(true)
          }
        } else {
          setPdfError(true)
        }
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load evaluation data.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examEvaluationAssignmentId, studentAnswerPaperId])

  // ── Timer ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (loading || locked) return
    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [loading, locked])

  useEffect(() => () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current) }, [])

  useEffect(() => {
    if (locked || loading) return
    window.history.pushState(null, '', window.location.href)
    window.onpopstate = () => window.history.go(1)
    return () => { window.onpopstate = null }
  }, [locked, loading])

  // ── Undo ───────────────────────────────────────────────────────────────────

  const pushUndo = useCallback((snapshot: QuestionMark[]) => {
    setUndoStack((prev) => [...prev.slice(-49), snapshot])
  }, [])

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev
      const next = [...prev]
      const last = next.pop()!
      setQuestions(last)
      return next
    })
  }, [])

  useEffect(() => {
    if (locked) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [locked, handleUndo])

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    if (locked) return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Escape') { setSelectedMark(null); return }
      if (/^[0-9]$/.test(e.key) && activeQuestion) {
        const num = parseInt(e.key, 10)
        if (num <= activeQuestion.questionMarks) {
          e.preventDefault()
          setSelectedMark((prev) => (prev === num ? null : num))
        }
        return
      }
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowUp') && questions.length > 0) {
        e.preventDefault()
        const idx = questions.findIndex((q) => q.questionPaperMarksId === activeQId)
        if (idx > 0) { setActiveQId(questions[idx - 1].questionPaperMarksId); setSelectedMark(null) }
        return
      }
      if ((e.key === 'ArrowRight' || e.key === 'ArrowDown') && questions.length > 0) {
        e.preventDefault()
        const idx = questions.findIndex((q) => q.questionPaperMarksId === activeQId)
        if (idx < questions.length - 1) { setActiveQId(questions[idx + 1].questionPaperMarksId); setSelectedMark(null) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [locked, activeQId, activeQuestion, questions])

  // ── Marks handlers ─────────────────────────────────────────────────────────

  const handleMarksChange = useCallback((questionPaperMarksId: number, marks: number | null) => {
    setQuestions((prev) => {
      pushUndo(prev)
      return prev.map((q) =>
        q.questionPaperMarksId === questionPaperMarksId
          ? { ...q, answeredMarks: marks, no_action_yet: marks !== null ? 0 : 1, color: '#96b9b5' }
          : q,
      )
    })
  }, [pushUndo])

  // ── Payload builders — mirrors Angular exactly ─────────────────────────────
  // The backend proc keys `mbtn_*` columns off iconType = 'marksBtn'. Writing any
  // other value (e.g. 'stamp') persists the row but hides it from reload.
  // Similarly the Angular "notAnswered" path uses a different, broader shape and
  // omits iconType entirely. See evaluation.component.ts:1101-1115 and :1074-1097.

  /** Mirrors Angular evaluation.component.ts:676-728 + :1105 (marksBtn payload). */
  const buildMarkStampPayload = useCallback(
    (q: QuestionMark, pageNum: number, x: number, y: number, marks: number): MarkStampPayload => ({
      isActive: true,
      questionPaperMarksId: q.questionPaperMarksId,
      iconId: 2,
      iconValue: marks,
      iconType: 'marksBtn',
      pageNumber: pageNum,
      x_Axis: Math.round(x),
      y_Axis: Math.round(y),
      marks,
      examEvaluationAssignmentId,
      studentAnswerPaper: null,
      studentEvaluationPagePath: null,
      isBlankPage: false,
      isViewed: true,
      isNotAnswered: false,
      comments: null,
    }),
    [examEvaluationAssignmentId],
  )

  /** Mirrors Angular evaluation.component.ts:1074-1097 (notAnswered() payload). */
  const buildNotAnsweredPayload = useCallback(
    (q: QuestionMark): NotAnsweredPayload => ({
      questionPaperMarksId: q.questionPaperMarksId,
      qno: q.qno ?? '',
      qvalue: q.qvalue ?? '',
      calculated_total_marks: q.calculated_total_marks ?? 0,
      question: q.question ?? '',
      studentEvaluationPageId: q.studentEvaluationPageId ?? 0,
      isNotAnswered: true,
      questionMarks: q.questionMarks ?? 0,
      level1No: q.level1No ?? 0,
      groupNo: q.groupNo ?? 0,
      answeredMarks: q.answeredMarks,
      color: q.color,
      error_message: q.error_message ?? null,
      rgb_color: q.rgb_color ?? null,
      isCheckedForNotAnswered: q.isCheckedForNotAnswered ?? false,
      no_action_yet: q.no_action_yet,
      pageNumber: null,
      x_Axis: null,
      y_Axis: null,
      isActive: true,
      marks: null,
      examEvaluationAssignmentId,
      studentAnswerPaper: null,
      studentEvaluationPagePath: null,
      isBlankPage: false,
      isViewed: true,
      comments: null,
    }),
    [examEvaluationAssignmentId],
  )

  // ── Refresh annotations — mirrors Angular getQuestionsAnnotations('reload') ─
  // After every successful save/delete, Angular re-fetches the question paper so
  // that `studentEvaluationPageId` gets populated on any newly-inserted rows.
  // Without this, a second save on the same stamp within one session would send
  // `null` id and the server would try to INSERT a duplicate, tripping the
  // unique constraint on (assignmentId, questionPaperMarksId).
  const refreshAnnotations = useCallback(async () => {
    try {
      const [freshQs] = await getExamQpDraftMarks({
        examEvaluationAssignmentId,
        orgId: user?.organizationId ?? user?.collegeId,
      })
      const idByQ = new Map(freshQs.map((q) => [q.questionPaperMarksId, q]))
      setQuestions((prev) =>
        prev.map((q) => {
          const fresh = idByQ.get(q.questionPaperMarksId)
          return fresh
            ? {
                ...q,
                studentEvaluationPageId: fresh.studentEvaluationPageId,
                mbtn_x: fresh.mbtn_x,
                mbtn_y: fresh.mbtn_y,
                mbtn_pageNum: fresh.mbtn_pageNum,
                no_action_yet: fresh.no_action_yet,
                rgb_color: fresh.rgb_color,
                error_message: fresh.error_message,
                calculated_total_marks: fresh.calculated_total_marks,
              }
            : q
        }),
      )
      setStamps((prev) =>
        prev.map((s) => {
          const fresh = idByQ.get(s.questionId)
          return fresh && fresh.studentEvaluationPageId
            ? { ...s, studentEvaluationPageId: fresh.studentEvaluationPageId }
            : s
        }),
      )
    } catch {
      // Silent — save already succeeded; next action will retry the refresh
    }
  }, [examEvaluationAssignmentId, user?.organizationId, user?.collegeId])

  /** Place a stamp on the PDF and assign the mark — mirrors Angular's addAnnotation() */
  const handleAddStamp = useCallback(
    (pageNum: number, x: number, y: number) => {
      if (!activeQId || selectedMark === null || !activeQuestion) return
      const stamp: Stamp = {
        id: `${Date.now()}`,
        pageNum,
        x,
        y,
        questionId: activeQId,
        label: activeQuestion.qvalue ?? String(activeQId),
        marks: selectedMark,
        studentEvaluationPageId: activeQuestion.studentEvaluationPageId || null,
      }
      setStamps((prev) => [...prev.filter((s) => s.questionId !== activeQId), stamp])
      handleMarksChange(activeQId, selectedMark)
      setSelectedMark(null)

      // Immediate save (Angular: addAnnotation saves each stamp as it's placed)
      const payload = buildMarkStampPayload(activeQuestion, pageNum, x, y, selectedMark)
      saveStudentEvalPages([payload])
        .then(() => refreshAnnotations())
        .catch(() => {})
    },
    [activeQId, selectedMark, activeQuestion, handleMarksChange, buildMarkStampPayload, refreshAnnotations],
  )

  /** Mark multiple questions as Not Answered — mirrors Angular's notAnswered() */
  const handleMarkNotAnswered = useCallback((ids: number[]) => {
    if (ids.length === 0) return
    const idSet = new Set(ids)

    setQuestions((prev) => {
      pushUndo(prev)
      return prev.map((q) =>
        idSet.has(q.questionPaperMarksId)
          ? { ...q, isNotAnswered: true, answeredMarks: 0, no_action_yet: 0, color: '#96b9b5' }
          : q,
      )
    })
    setStamps((prev) => prev.filter((s) => !idSet.has(s.questionId)))
    setSelectedMark(null)

    // Immediate save — NA uses a broader payload shape than mark stamps
    const affected = questions.filter((q) => idSet.has(q.questionPaperMarksId))
    const payloads: NotAnsweredPayload[] = affected.map(buildNotAnsweredPayload)
    if (payloads.length > 0) {
      saveStudentEvalPages(payloads)
        .then(() => refreshAnnotations())
        .catch(() => {})
    }
  }, [pushUndo, questions, buildNotAnsweredPayload, refreshAnnotations])

  /** Delete saved mark for active question */
  /** Delete a specific stamp from the PDF overlay — called from canvas popup */
  const handleStampDelete = useCallback(async (stamp: Stamp) => {
    if (locked) return
    const qId = stamp.questionId
    setDeletingMark(true)
    try {
      await deleteEvalMark(examEvaluationAssignmentId, qId)
      setQuestions((prev) =>
        prev.map((q) =>
          q.questionPaperMarksId === qId
            ? { ...q, answeredMarks: null, isNotAnswered: false, no_action_yet: 1, color: '#009688', studentEvaluationPageId: 0 }
            : q,
        ),
      )
      setStamps((prev) => prev.filter((s) => s.questionId !== qId))
      setSelectedMark(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete mark.')
    } finally { setDeletingMark(false) }
  }, [locked, examEvaluationAssignmentId])

  const handleSelectQuestion = useCallback((q: QuestionMark) => {
    setActiveQId(q.questionPaperMarksId)
    setSelectedMark(null)
  }, [])

  // ── Save & Exit ────────────────────────────────────────────────────────────
  // Angular (evaluation.component.ts:1301-1341 back()) only updates the
  // assignment's status + elapsed time here. Individual stamp saves already
  // happened on-click via addAnnotation(); re-saving with incomplete payloads
  // is what triggered the ConstraintViolationException we hit before.
  const handleSaveExit = useCallback(async () => {
    if (!window.confirm('Are you sure you want to exit the evaluation?')) return
    if (locked) { navigateBack(); return }

    setSaving(true)
    try {
      await updateEvalAssignment(examEvaluationAssignmentId, {
        evaluationStatusCatDetId: EVAL_STATUS.IN_PROGRESS,
        evaluationTime: elapsedSeconds,
      })
      navigateBack()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save.')
    } finally { setSaving(false) }
  }, [locked, examEvaluationAssignmentId, elapsedSeconds, navigateBack])

  // ── Submit (Finish) ────────────────────────────────────────────────────────
  // Mirrors Angular finishPaper() (evaluation.component.ts:1361):
  //   1. Capture each rendered page as JPEG with stamps baked on.
  //   2. Build a new PDF (pdf-lib), embed each JPEG on a fresh page.
  //   3. POST multipart to saveFinalExamStdEvaluationpdf.
  //   4. Call s_pop_exam_questionpaper_details with exam_questionpaper_finalmarks_update.
  //   5. updateEvaluationsCompletedCount, then navigate back.
  const handleSubmit = useCallback(async () => {
    if (pendingQuestions.length > 0) {
      alert(`Please evaluate the following question(s): ${pendingQuestions.map((q) => q.qvalue).join(', ')}`)
      return
    }
    if (!window.confirm('Are you sure you want to complete the evaluation? This cannot be undone.')) return

    setSaving(true)
    try {
      // 1. Capture annotated page images
      const pageBlobs = viewerRef.current
        ? await viewerRef.current.captureAnnotatedPages()
        : []

      // 2. Compose into a new PDF (same page dimensions Angular uses: 300×400 pt).
      const outDoc = await PDFDocument.create()
      for (const blob of pageBlobs) {
        const buf = await blob.arrayBuffer()
        const img = await outDoc.embedJpg(buf)
        const page = outDoc.addPage([300, 400])
        page.drawImage(img, { x: 10, y: 25, width: 280, height: 365 })
      }
      const pdfBytes = await outDoc.save()
      // Copy into a fresh ArrayBuffer so Blob/File constructors see a tight view.
      const copy = new Uint8Array(pdfBytes.byteLength)
      copy.set(pdfBytes)
      const pdfBlob = new Blob([copy.buffer], { type: 'application/pdf' })
      const originalPath = assignmentDetail?.studentanswerPath ?? ''
      const filename = originalPath.split(/[\\/]/).pop() || `evaluation-${examEvaluationAssignmentId}.pdf`

      // 3. Upload the final evaluated PDF
      await saveFinalEvalPdf(examEvaluationAssignmentId, pdfBlob, filename)

      // 4. Finalize marks server-side
      await finalizeEvalMarks(examEvaluationAssignmentId)

      // 5. Bump the evaluator's completed count (best-effort, matches Angular)
      await updateEvalsCompletedCount(examEvaluatorProfileDetId).catch(() => {})

      navigateBack()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit.')
    } finally { setSaving(false) }
  }, [pendingQuestions, examEvaluationAssignmentId, examEvaluatorProfileDetId, assignmentDetail, navigateBack])

  // ── Reject ─────────────────────────────────────────────────────────────────

  const handleReject = useCallback(async () => {
    const reason = window.prompt('Enter rejection reason:')
    if (reason === null) return
    setSaving(true)
    try {
      const today = todayISO()
      await rejectEvalAssignment(examEvaluationAssignmentId, {
        evaluationStatusCatDetId: EVAL_STATUS.REJECTED,
        omrSerialNo,
        evaluationTime: elapsedSeconds,
        // Angular echoes whatever is on the assignment (typically null pre-finish).
        evaluatedTotalMarks: assignmentDetail?.evaluatedTotalMarks ?? null,
        answerSheetCheckDate: today,
        evaluationStartDate: assignmentDetail?.evaluationStartDate ?? null,
        evaluationEndDate: today,
        isUfm: false,
        ufmReason: '',
        evaluatedAnswerPaperPath: null,
        isActive: true,
        reason,
      })
      navigateBack()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject.')
    } finally { setSaving(false) }
  }, [examEvaluationAssignmentId, omrSerialNo, elapsedSeconds, assignmentDetail, navigateBack])

  // ── UFM ────────────────────────────────────────────────────────────────────

  const handleUFM = useCallback(async () => {
    const ufmReason = window.prompt('Enter UFM reason:')
    if (ufmReason === null) return
    setSaving(true)
    try {
      const today = todayISO()
      await ufmEvalAssignment(examEvaluationAssignmentId, {
        evaluationStatusCatDetId: EVAL_STATUS.REJECTED,
        omrSerialNo,
        evaluationTime: elapsedSeconds,
        evaluatedTotalMarks: assignmentDetail?.evaluatedTotalMarks ?? null,
        answerSheetCheckDate: today,
        evaluationStartDate: assignmentDetail?.evaluationStartDate ?? null,
        evaluationEndDate: today,
        isUfm: true,
        ufmReason,
        evaluatedAnswerPaperPath: null,
        isActive: true,
        reason: ufmReason,
      })
      navigateBack()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to mark UFM.')
    } finally { setSaving(false) }
  }, [examEvaluationAssignmentId, omrSerialNo, elapsedSeconds, assignmentDetail, navigateBack])

  // ── Loading / Error states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-primary mx-auto" />
          <p className="text-sm text-slate-500 font-medium">Loading evaluation…</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md text-center space-y-4 bg-white rounded-xl shadow-sm border border-red-100 p-8">
          <AlertCircle className="h-6 w-6 text-red-500 mx-auto" />
          <p className="text-sm font-medium text-slate-800">{loadError}</p>
          <button onClick={navigateBack} className="text-sm text-primary hover:underline font-medium">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    // Concrete viewport-relative height so internal panes scroll instead of the whole page.
    // 6rem ≈ AppShell Topbar (h-12 = 48px) + breadcrumb card (~44px).
    <div className="h-[calc(100dvh-6rem)] flex flex-col bg-background overflow-hidden">

      {/* ── Top header bar — matches script-grader bg-nav style ── */}
      <div className="h-10 bg-slate-800 flex items-center justify-between px-5 shrink-0">
        <div className="flex items-center gap-4 text-slate-200 text-sm">
          <button
            onClick={navigateBack}
            className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          {omrSerialNo && (
            <span className="font-semibold opacity-90">ID : {omrSerialNo}</span>
          )}
          <span className="opacity-60 hidden sm:inline">Subject :</span>
          <span className="truncate max-w-[220px]">{subjectName}</span>
          {subjectCode && (
            <span className="text-slate-400 text-xs hidden md:inline">({subjectCode})</span>
          )}
        </div>
        <div className="flex items-center gap-4 text-slate-200 text-sm shrink-0">
          {locked && (
            <span className="text-[11px] font-semibold bg-red-500/20 text-red-300 border border-red-500/30 rounded-full px-2.5 py-0.5">
              Locked
            </span>
          )}
          <span className="flex items-center gap-1.5 opacity-80">
            <Clock className="h-3.5 w-3.5" />
            {formatTime(elapsedSeconds)}
          </span>
        </div>
      </div>

      {/* ── Three-pane workspace ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left pane: Questions + Marks ── */}
        <div className="flex shrink-0 border-r border-slate-200 bg-card">

          {/* Questions column */}
          <div className="w-28 border-r border-slate-200 flex flex-col">
            <div className="px-2 py-2 border-b border-slate-200 bg-muted/50">
              <h3 className="text-[10px] font-bold text-center text-muted-foreground uppercase tracking-wider">Questions</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <QuestionNavPanel
                questions={questions}
                activeQId={activeQId}
                onSelect={(id) => { setActiveQId(id); setSelectedMark(null) }}
              />
            </div>
          </div>

          {/* Marks column */}
          <div className="w-28 flex flex-col">
            <div className="px-2 py-2 border-b border-slate-200 bg-primary/10">
              <h3 className="text-[10px] font-bold text-center text-primary uppercase tracking-wider">Marks</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 min-h-0">
              {!locked && activeQuestion ? (
                <MarkSelectorPanel
                  maxMarks={activeQuestion.questionMarks}
                  marksInterval={marksInterval}
                  selectedMark={selectedMark}
                  answeredMarks={activeQuestion.answeredMarks}
                  isNotAnswered={activeQuestion.isNotAnswered}
                  activeQId={activeQId}
                  stamps={stamps}
                  onSelect={(mark) => setSelectedMark((prev) => (prev === mark ? null : mark))}
                  onNAClick={() => setNotViewedOpen(true)}
                />
              ) : !locked ? (
                <div className="text-[10px] text-muted-foreground text-center py-4">Select a question</div>
              ) : null}
            </div>

            {/* Toolbox — view question, view answers, view all pages, stamp size.
                (Correct/Wrong icon annotations removed — only marks are sent.) */}
            {!locked && (
              <div className="shrink-0 border-t border-slate-200 p-2 bg-muted/20">
                <div className="grid grid-cols-2 gap-1.5 place-items-center">
                  {/* 📋 Question Paper — Angular openModal(questionPaperPath) */}
                  <button
                    disabled={!assignmentDetail?.questionPaperPath}
                    onClick={() => {
                      const p = assignmentDetail?.questionPaperPath
                      if (p) window.open(`${MINIO_URL}${p}`, '_blank', 'width=900,height=550')
                    }}
                    title="View Question Paper"
                    className="col-span-2 flex items-center justify-center gap-1.5 w-full h-8 rounded-lg border-2 bg-white border-slate-300 text-slate-600 text-[10px] font-medium hover:bg-slate-50 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
                  >
                    <ClipboardList className="h-3.5 w-3.5" />
                    View Questions
                  </button>
                  {/* 📄 Sample Answer Sheet — Angular openModal(modelAnswerPaperPath) */}
                  <button
                    disabled={!assignmentDetail?.modelAnswerPaperPath}
                    onClick={() => {
                      const p = assignmentDetail?.modelAnswerPaperPath
                      if (p) window.open(`${MINIO_URL}${p}`, '_blank', 'width=900,height=550')
                    }}
                    title="View Sample Answer Sheet"
                    className="col-span-2 flex items-center justify-center gap-1.5 w-full h-8 rounded-lg border-2 bg-white border-slate-300 text-slate-600 text-[10px] font-medium hover:bg-slate-50 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    View Answers
                  </button>
                  {/* 👁 View all pages */}
                  <button
                    disabled={!pdfUrl}
                    onClick={() => setShowThumbnails(true)}
                    title="View all pages"
                    className="col-span-2 flex items-center justify-center gap-1.5 w-full h-8 rounded-lg border-2 bg-white border-slate-300 text-slate-600 text-[10px] font-medium hover:bg-slate-50 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View All Pages
                  </button>

                  {/* Paper Modal button — hidden. Angular opens the question
                      paper PDF in a new window (paper-modal.component.ts).
                      Un-comment and pass a valid questionpaper path when ready:
                  <button
                    onClick={() => openPaperModal(questionPaperPath)}
                    title="Open question paper"
                    className="col-span-2 flex items-center justify-center gap-1 w-full h-8 rounded-lg border-2 bg-white border-slate-300 text-slate-500 text-[10px] font-medium hover:bg-slate-50"
                  >
                    Question Paper
                  </button>
                  */}

                  {/* Stamp size control */}
                  <div className="col-span-2 flex items-center justify-between w-full mt-0.5 gap-1">
                    <span className="text-[9px] text-muted-foreground font-medium shrink-0">Size</span>
                    <button
                      onClick={() => setStampSize((s) => Math.max(20, s - 10))}
                      title="Decrease stamp size"
                      className="flex items-center justify-center w-6 h-6 rounded border bg-white border-slate-300 text-slate-500 hover:bg-slate-50 text-sm font-bold leading-none transition-colors"
                    >
                      −
                    </button>
                    <span className="text-[10px] font-mono text-slate-600 min-w-[24px] text-center">{stampSize}</span>
                    <button
                      onClick={() => setStampSize((s) => Math.min(120, s + 10))}
                      title="Increase stamp size"
                      className="flex items-center justify-center w-6 h-6 rounded border bg-white border-slate-300 text-slate-500 hover:bg-slate-50 text-sm font-bold leading-none transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Center pane: Question header + PDF ── */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* Question header — mirrors script-grader AnswerScriptViewer header */}
          {activeQuestion && (
            <div className="px-5 py-3 border-b border-slate-200 bg-card flex items-start gap-3 shrink-0">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold tracking-wider text-muted-foreground mb-0.5 uppercase">
                  {partLabel(activeQuestion.level1No)}
                </div>
                <div className="text-sm font-medium text-foreground leading-snug">
                  <span className="font-bold mr-1">{activeQuestion.qvalue})</span>
                  {htmlToPlaintext(activeQuestion.question || '')}
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    Q.No: {activeQuestion.qvalue}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    Max Marks: {activeQuestion.questionMarks}
                  </span>
                  {activeQuestion.isNotAnswered && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Not Answered
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Selected mark banner */}
          {selectedMark !== null && !locked && (
            <div className="shrink-0 px-4 py-1.5 bg-amber-500 text-white text-xs font-bold flex items-center justify-between">
              <span>{selectedMark} selected — click on PDF to place stamp</span>
              <button
                onClick={() => setSelectedMark(null)}
                className="text-white/80 hover:text-white text-[10px] underline ml-4"
              >
                Esc — cancel
              </button>
            </div>
          )}

          {/* PDF viewer */}
          <div className="flex-1 min-h-0">
            {pdfError ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 bg-white text-slate-400 text-sm">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-slate-300" />
                </div>
                <p className="font-medium text-slate-500">PDF could not be loaded.</p>
                <p className="text-xs text-slate-400">Please evaluate using the sidebar.</p>
              </div>
            ) : pdfUrl ? (
              <PdfCanvasViewer
                ref={viewerRef}
                url={pdfUrl}
                stamps={stamps}
                selectedMark={selectedMark}
                locked={locked}
                stampSize={stampSize}
                showThumbnails={showThumbnails}
                onCloseThumbnails={() => setShowThumbnails(false)}
                onCanvasClick={handleAddStamp}
                onStampDelete={handleStampDelete}
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-white text-slate-400 text-sm">
                Loading PDF…
              </div>
            )}
          </div>
        </div>

        {/* ── Right pane: Marking panel ── */}
        <div className="w-64 border-l border-slate-200 bg-card shrink-0 flex flex-col overflow-hidden">
          <MarkingRightPanel
            questions={questions}
            totalAwarded={totalAwarded}
            totalMax={totalMax}
            activeQId={activeQId}
            onSelectQuestion={handleSelectQuestion}
            locked={locked}
            saving={saving}
            pendingCount={pendingQuestions.length}
            onSaveAndExit={handleSaveExit}
            onFinish={handleSubmit}
            onReject={handleReject}
            onUFM={handleUFM}
          />
        </div>
      </div>

      {/* ── Not Answered Dialog ── */}
      <NotAnsweredDialog
        open={notViewedOpen}
        onOpenChange={setNotViewedOpen}
        questions={questions}
        onMarkNotAnswered={handleMarkNotAnswered}
      />
    </div>
  )
}
