'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EVAL_STATUS, assignNextEval, getEvalSetting, getStudentAnswerPapers, type StudentAnswerPaper } from '@/services/evaluation'
import { formatDate } from '@/common/generic-functions'

const MARKING_PATH = '/admin-examination-management/evaluation-process/assign-answerpapers-dynamic'
const BACK_PATH = '/admin-examination-management/evaluation-process/evaluator-subjects'

function getStatusLabel(row: StudentAnswerPaper): string {
  if (!row.studentAnswerPath) return 'Answer Paper Not Available'
  const code = row.evaluationStatusCatDetCode
  if (code) return code
  switch (row.evaluationStatusCatDetId) {
    case EVAL_STATUS.NEW:
      return 'New'
    case EVAL_STATUS.ASSIGNED:
      return 'Assigned'
    case EVAL_STATUS.IN_PROGRESS:
      return 'In Progress'
    case EVAL_STATUS.EVALUATED:
      return 'Evaluated'
    case EVAL_STATUS.FINALIZED:
      return 'Finalised'
    case EVAL_STATUS.REJECTED:
      return 'Rejected'
    default:
      return 'Unknown'
  }
}

function statusClassName(row: StudentAnswerPaper): string {
  if (!row.studentAnswerPath) return 'bg-rose-400'
  const status = row.evaluationStatusCatDetId
  if (status === EVAL_STATUS.REJECTED) return 'bg-rose-400'
  if (status === EVAL_STATUS.EVALUATED) return 'bg-blue-500'
  if (status === EVAL_STATUS.FINALIZED) return 'bg-emerald-600'
  if (status === EVAL_STATUS.IN_PROGRESS) return 'bg-amber-500'
  return 'bg-primary'
}

export default function EvaluatorAssignedAnswerPapersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const examEvaluatorProfileId = Number(searchParams.get('examEvaluatorProfileId') ?? 0)
  const examEvaluatorProfileDetId = Number(searchParams.get('examEvaluatorProfileDetId') ?? 0)
  const examId = Number(searchParams.get('examId') ?? 0)
  const maxNoOfEvaluationsAssign = Number(searchParams.get('maxNoOfEvaluationsAssign') ?? 0)
  const maxNoOfReevaluationsAssign = Number(searchParams.get('maxNoOfReevaluationsAssign') ?? 0)
  const isReEvaluation = (searchParams.get('isReEvaluation') ?? 'false') === 'true'
  const subjectName = searchParams.get('subjectName') ?? ''

  const [rows, setRows] = useState<StudentAnswerPaper[]>([])
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [settingValue, setSettingValue] = useState('')
  const [noOfStudentsAssigned, setNoOfStudentsAssigned] = useState(Number(searchParams.get('noOfStudentsAssigned') ?? 0))
  const [noOfEvaluationsCompleted, setNoOfEvaluationsCompleted] = useState(Number(searchParams.get('noOfEvaluationsCompleted') ?? 0))

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => row.omrSerialNo.toLowerCase().includes(q))
  }, [rows, search])

  const canShowAssignNext = noOfStudentsAssigned === noOfEvaluationsCompleted

  const fetchRows = useCallback(async () => {
    if (!examEvaluatorProfileId || !examEvaluatorProfileDetId) return
    setLoading(true)
    setError(null)
    try {
      const [setting, answerRows] = await Promise.all([
        getEvalSetting('EVALPDFSTARTEND').catch(() => null),
        getStudentAnswerPapers(examEvaluatorProfileId, examEvaluatorProfileDetId).catch(() => []),
      ])
      setSettingValue(setting ?? '')
      setRows(answerRows)
      setNoOfStudentsAssigned(answerRows.length)
      setNoOfEvaluationsCompleted(
        answerRows.filter(
          (r) => r.evaluationStatusCatDetId === EVAL_STATUS.EVALUATED || r.evaluationStatusCatDetId === EVAL_STATUS.FINALIZED,
        ).length,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load assigned answer papers.')
    } finally {
      setLoading(false)
    }
  }, [examEvaluatorProfileId, examEvaluatorProfileDetId])

  useEffect(() => {
    void fetchRows()
  }, [fetchRows])

  async function assignNext() {
    if (isReEvaluation) {
      if (noOfStudentsAssigned >= maxNoOfReevaluationsAssign && maxNoOfReevaluationsAssign > 0) {
        setError('You have been assigned the maximum number of papers.')
        return
      }
    } else if (noOfStudentsAssigned >= maxNoOfEvaluationsAssign && maxNoOfEvaluationsAssign > 0) {
      setError('You have been assigned the maximum number of papers.')
      return
    }
    setAssigning(true)
    setError(null)
    try {
      await assignNextEval(examEvaluatorProfileDetId)
      await fetchRows()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to assign next answer paper.')
    } finally {
      setAssigning(false)
    }
  }

  function openPaper(row: StudentAnswerPaper) {
    if (!row.studentAnswerPath) return
    const status = row.evaluationStatusCatDetId
    if (status === EVAL_STATUS.EVALUATED || status === EVAL_STATUS.REJECTED || status === EVAL_STATUS.UFM) return
    const params = new URLSearchParams({
      examEvaluationAssignmentId: String(row.examEvaluationAssignmentId),
      studentAnswerPaperId: String(row.studentAnswerPaperId),
      examEvaluatorProfileId: String(examEvaluatorProfileId),
      examEvaluatorProfileDetId: String(examEvaluatorProfileDetId),
      settingValue,
    })
    router.push(`${MARKING_PATH}?${params.toString()}`)
  }

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Evaluator Assigned Answer Papers" subtitle={subjectName ? `Subject: ${subjectName}` : 'Assigned answer papers list'} />

      <div className="app-card p-3 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:justify-between">
          <div className="w-full md:max-w-sm">
            <Input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-[12px]" />
          </div>
          <div className="flex items-center gap-2 justify-end">
            {canShowAssignNext && (
              <Button type="button" onClick={assignNext} disabled={assigning || loading} className="h-8 px-3 text-[12px]">
                Assign Next
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => router.push(BACK_PATH)} className="h-8 px-3 text-[12px]">
              Back
            </Button>
          </div>
        </div>

        {error && <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</div>}

        <div className="overflow-auto rounded border">
          <table className="w-full text-[12px]">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-2 py-1 text-left">SI.No</th>
                <th className="px-2 py-1 text-left">Serial Number</th>
                <th className="px-2 py-1 text-left">Check AnswerSheet</th>
                <th className="px-2 py-1 text-left">Evaluator Marks</th>
                <th className="px-2 py-1 text-left">AnswerSheet Check Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, i) => {
                const status = row.evaluationStatusCatDetId
                const isDone = status === EVAL_STATUS.EVALUATED || status === EVAL_STATUS.FINALIZED
                const canCheck =
                  row.studentAnswerPath &&
                  (status === EVAL_STATUS.NEW || status === EVAL_STATUS.ASSIGNED || status === EVAL_STATUS.IN_PROGRESS || status === 0)
                return (
                  <tr key={`${row.examEvaluationAssignmentId}-${row.omrSerialNo}-${i}`} className="border-t">
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1">{row.omrSerialNo}</td>
                    <td className="px-2 py-1">
                      {canCheck ? (
                        <Button type="button" className={`h-7 px-2 text-[11px] text-white ${statusClassName(row)}`} onClick={() => openPaper(row)}>
                          {status === EVAL_STATUS.IN_PROGRESS ? 'In Progress' : 'Check Answersheet'}
                        </Button>
                      ) : (
                        <span className={`inline-flex h-7 items-center rounded px-2 text-[11px] text-white ${statusClassName(row)}`}>
                          {getStatusLabel(row)}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1">{isDone ? row.evaluatedTotalMarks ?? '-' : '-'}</td>
                    <td className="px-2 py-1">{isDone ? formatDate(row.answerSheetCheckDate) || '-' : '-'}</td>
                  </tr>
                )
              })}
              {!loading && filteredRows.length === 0 && (
                <tr className="border-t">
                  <td colSpan={5} className="px-2 py-3 text-center text-muted-foreground">
                    No records found
                  </td>
                </tr>
              )}
              {loading && (
                <tr className="border-t">
                  <td colSpan={5} className="px-2 py-3 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-[12px] text-slate-600">
        Total Assigned: <span className="font-semibold">{noOfStudentsAssigned}</span> | Evaluated: <span className="font-semibold">{noOfEvaluationsCompleted}</span>
        {examId > 0 ? <> | Exam Id: <span className="font-semibold">{examId}</span></> : null}
      </div>
    </PageContainer>
  )
}

