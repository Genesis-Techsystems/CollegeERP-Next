'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  FileText, ArrowLeft, CheckCircle2, Clock3, XCircle, BookOpen,
  ChevronRight, ListFilter,
} from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { SearchInput } from '@/common/components/search'
import { StatCard } from '@/common/components/data-display'
import { EvalStatusBadge } from '@/common/components/data-display'
import { Table, type TableColumn } from '@/common/components/table'
import {
  getStudentAnswerPapers,
  EVAL_STATUS,
  type StudentAnswerPaper,
} from '@/services/evaluation'
import { formatDate } from '@/common/generic-functions'

// ─── Constants ────────────────────────────────────────────────────────────────

const MARKING_PATH = '/admin-examination-management/evaluation-process/assign-answerpapers-dynamic'
const BACK_PATH    = '/admin-examination-management/evaluation-process/evaluator-subjects'

function isActionable(row: StudentAnswerPaper): boolean {
  const code = row.evaluationStatusCatDetCode
  if (code === 'Evaluated' || code === 'Reject') return false
  return !!row.studentAnswerPath
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TabKey = 'all' | 'todo' | 'in_progress' | 'done' | 'rejected'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'todo',        label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done',        label: 'Done' },
  { key: 'rejected',    label: 'Rejected' },
]

function matchesTab(row: StudentAnswerPaper, tab: TabKey): boolean {
  const s = row.evaluationStatusCatDetId
  switch (tab) {
    case 'all':         return true
    case 'todo':        return s === EVAL_STATUS.NEW || s === EVAL_STATUS.ASSIGNED
    case 'in_progress': return s === EVAL_STATUS.IN_PROGRESS
    case 'done':        return s === EVAL_STATUS.EVALUATED || s === EVAL_STATUS.FINALIZED
    case 'rejected':    return s === EVAL_STATUS.REJECTED || s === EVAL_STATUS.UFM
    default:            return true
  }
}

// ─── Column renderers (outside component — no state dependencies) ─────────────

function serialRenderer(row: StudentAnswerPaper) {
  const checkDate = formatDate(row.answerSheetCheckDate)
  return (
    <div>
      <p className="font-semibold font-mono text-slate-800 text-sm">{row.omrSerialNo}</p>
      {checkDate && <p className="text-[11px] text-slate-400 mt-0.5">Checked {checkDate}</p>}
    </div>
  )
}

function statusRenderer(row: StudentAnswerPaper) {
  return <EvalStatusBadge statusId={row.evaluationStatusCatDetId} />
}

function marksRenderer(row: StudentAnswerPaper) {
  if (row.evaluatedTotalMarks != null) {
    return (
      <span>
        <span className="font-bold text-slate-800">{row.evaluatedTotalMarks}</span>
        <span className="text-[11px] text-slate-400 ml-0.5">marks</span>
      </span>
    )
  }
  return <span className="text-slate-300">—</span>
}

// Factory for action renderer — needs navigate callback
function makeActionRenderer(navigate: (row: StudentAnswerPaper) => void) {
  return function actionRenderer(row: StudentAnswerPaper) {
    const actionable = isActionable(row)
    const isDone     = row.evaluationStatusCatDetId === EVAL_STATUS.EVALUATED || row.evaluationStatusCatDetId === EVAL_STATUS.FINALIZED
    const isRejected = row.evaluationStatusCatDetId === EVAL_STATUS.REJECTED  || row.evaluationStatusCatDetId === EVAL_STATUS.UFM

    if (actionable) {
      return (
        <button
          onClick={(e) => { e.stopPropagation(); navigate(row) }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition-opacity"
        >
          {row.evaluationStatusCatDetId === EVAL_STATUS.IN_PROGRESS ? 'Continue' : 'Evaluate'}
          <ChevronRight className="h-3 w-3" />
        </button>
      )
    }
    if (isDone)     return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    if (isRejected) return <XCircle className="h-4 w-4 text-red-400" />
    return null
  }
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab, hasSearch }: { tab: TabKey; hasSearch: boolean }) {
  const message = hasSearch
    ? 'No papers match your search.'
    : tab === 'all'
    ? 'No answer papers assigned.'
    : `No ${tab === 'todo' ? 'pending' : tab === 'in_progress' ? 'in-progress' : tab === 'done' ? 'evaluated' : 'rejected'} papers.`

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
        <ListFilter className="h-5 w-5 opacity-50" />
      </div>
      <p className="text-sm font-medium">{message}</p>
    </div>
  )
}

// ─── Stat cards skeleton ──────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border bg-card p-4 animate-pulse">
          <div className="h-4 w-20 bg-slate-100 rounded mb-2" />
          <div className="h-7 w-12 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnswerSheetsPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const examEvaluatorProfileId    = Number(searchParams.get('examEvaluatorProfileId') ?? 0)
  const examEvaluatorProfileDetId = Number(searchParams.get('examEvaluatorProfileDetId') ?? 0)
  const subjectName  = searchParams.get('subjectName') ?? ''
  const subjectCode  = searchParams.get('subjectCode') ?? ''

  const [rawData, setRawData]         = useState<StudentAnswerPaper[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [activeTab, setActiveTab]     = useState<TabKey>('all')

  const fetchData = useCallback(async () => {
    if (!examEvaluatorProfileId || !examEvaluatorProfileDetId) return
    setLoading(true)
    setError(null)
    try {
      const result = await getStudentAnswerPapers(examEvaluatorProfileId, examEvaluatorProfileDetId)
      setRawData([...result].sort((a, b) => a.evaluationStatusCatDetId - b.evaluationStatusCatDetId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load answer papers.')
    } finally {
      setLoading(false)
    }
  }, [examEvaluatorProfileId, examEvaluatorProfileDetId])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Derived stats ──────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total      = rawData.length
    const done       = rawData.filter((r) => r.evaluationStatusCatDetId === EVAL_STATUS.EVALUATED || r.evaluationStatusCatDetId === EVAL_STATUS.FINALIZED).length
    const inProgress = rawData.filter((r) => r.evaluationStatusCatDetId === EVAL_STATUS.IN_PROGRESS).length
    const pending    = rawData.filter((r) => r.evaluationStatusCatDetId === EVAL_STATUS.NEW || r.evaluationStatusCatDetId === EVAL_STATUS.ASSIGNED).length
    const rejected   = rawData.filter((r) => r.evaluationStatusCatDetId === EVAL_STATUS.REJECTED || r.evaluationStatusCatDetId === EVAL_STATUS.UFM).length
    return { total, done, inProgress, pending, rejected }
  }, [rawData])

  const tabCounts = useMemo<Record<TabKey, number>>(() => ({
    all:         rawData.length,
    todo:        rawData.filter((r) => matchesTab(r, 'todo')).length,
    in_progress: rawData.filter((r) => matchesTab(r, 'in_progress')).length,
    done:        rawData.filter((r) => matchesTab(r, 'done')).length,
    rejected:    rawData.filter((r) => matchesTab(r, 'rejected')).length,
  }), [rawData])

  const filtered = useMemo(() => {
    let data = rawData.filter((r) => matchesTab(r, activeTab))
    if (searchValue.trim()) {
      const lower = searchValue.toLowerCase()
      data = data.filter((r) => r.omrSerialNo.toLowerCase().includes(lower))
    }
    return data
  }, [rawData, activeTab, searchValue])

  // ── Navigation ─────────────────────────────────────────────────────────────

  const handleNavigate = useCallback((row: StudentAnswerPaper) => {
    if (!isActionable(row)) return
    const params = new URLSearchParams({
      examEvaluationAssignmentId:  String(row.examEvaluationAssignmentId),
      studentAnswerPaperId:        String(row.studentAnswerPaperId),
      examEvaluatorProfileId:      String(examEvaluatorProfileId),
      examEvaluatorProfileDetId:   String(examEvaluatorProfileDetId),
      subjectName,
      subjectCode,
    })
    router.push(`${MARKING_PATH}?${params.toString()}`)
  }, [router, examEvaluatorProfileId, examEvaluatorProfileDetId, subjectName, subjectCode])

  // ── Column definitions ─────────────────────────────────────────────────────

  const columnDefs = useMemo<TableColumn<StudentAnswerPaper>[]>(
    () => [
      { id: '#',                        label: '#',          width: 5,  type: 'id' },
      { id: 'omrSerialNo',              label: 'Serial No.', width: 30, render: serialRenderer },
      { id: 'evaluationStatusCatDetId', label: 'Status',     width: 20, render: statusRenderer },
      { id: 'evaluatedTotalMarks',      label: 'Marks',      width: 15, render: marksRenderer },
      { id: 'actions',                  label: '',           width: 15, render: makeActionRenderer(handleNavigate) },
    ],
    [handleNavigate],
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  const subtitle = [subjectCode, `${stats.total} paper${stats.total !== 1 ? 's' : ''} assigned`]
    .filter(Boolean).join(' · ')

  const emptyMessage = searchValue.trim()
    ? 'No papers match your search.'
    : activeTab === 'all'
    ? 'No answer papers assigned.'
    : `No ${activeTab === 'todo' ? 'pending' : activeTab === 'in_progress' ? 'in-progress' : activeTab === 'done' ? 'evaluated' : 'rejected'} papers.`

  return (
    <PageContainer className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.push(BACK_PATH)}
          className="mt-0.5 flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors shrink-0"
          title="Back to subjects"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">
            {subjectName || 'Answer Papers'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Stats strip ── */}
      {loading ? <StatsSkeleton /> : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard title="Assigned"     value={stats.total}                    icon={BookOpen}    colorVariant="default" />
          <StatCard title="Evaluated"    value={stats.done}                     icon={CheckCircle2} colorVariant="success" />
          <StatCard title="Pending"      value={stats.pending + stats.inProgress} icon={Clock3}    colorVariant="warning" />
          <StatCard title="Rejected / UFM" value={stats.rejected}               icon={XCircle}    colorVariant="error" />
        </div>
      )}

      {!loading && (
        <>
          {/* ── Filter tabs + Search ── */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors',
                    activeTab === tab.key
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700',
                  ].join(' ')}
                >
                  {tab.label}
                  {tabCounts[tab.key] > 0 && (
                    <span className={[
                      'text-[10px] rounded-full px-1.5 py-px font-bold leading-none',
                      activeTab === tab.key
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-slate-200 text-slate-500',
                    ].join(' ')}>
                      {tabCounts[tab.key]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <SearchInput
              className="sm:ml-auto sm:w-56"
              placeholder="Search serial no…"
              value={searchValue}
              onChange={setSearchValue}
            />
          </div>

          {/* ── Paper table ── */}
          <Table
            rows={filtered}
            columns={columnDefs}
            onRowClick={handleNavigate}
            emptyText={emptyMessage}
            pageSize={0}
          />

          {/* ── Progress bar footer ── */}
          {stats.total > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-600">Evaluation Progress</span>
                <span className="text-xs text-slate-500">
                  <span className="font-bold text-slate-800">{stats.done}</span> / {stats.total} evaluated
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.round((stats.done / stats.total) * 100)}%` }}
                />
              </div>
              <div className="flex gap-4 mt-2.5 text-[11px] text-slate-500">
                {stats.inProgress > 0 && (
                  <span><span className="font-semibold text-amber-600">{stats.inProgress}</span> in progress</span>
                )}
                {stats.pending > 0 && (
                  <span><span className="font-semibold text-slate-700">{stats.pending}</span> not started</span>
                )}
                {stats.rejected > 0 && (
                  <span><span className="font-semibold text-red-600">{stats.rejected}</span> rejected</span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </PageContainer>
  )
}
