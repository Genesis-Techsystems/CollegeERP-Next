'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageContainer } from '@/components/layout'
import { SearchInput } from '@/common/components/search'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  getQuestionPaperMarksById,
  getQuestionPaperTemplateViewRows,
  updateQuestionPaperMarks,
} from '@/services/evaluation-process'

type AnyRow = Record<string, any>

function htmlToPlaintext(html: unknown): string {
  if (html == null) return ''
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

function pickText(row: AnyRow | null | undefined, keys: string[]) {
  if (!row) return ''
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

export default function ManageQuestionsPaperPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const params = useMemo(
    () => ({
      questionPaperId: Number(
        searchParams?.get('questionPaperId') ?? searchParams?.get('examQuestionPaperId') ?? 0,
      ),
      templateId: Number(
        searchParams?.get('examQuestionPaperTemplateId') ?? searchParams?.get('pkEQPTid') ?? 0,
      ),
      questionPaperTitle:
        searchParams?.get('questionPaperTitle') ?? searchParams?.get('questionpaper_title') ?? '',
      questionPaperCode: searchParams?.get('questionPaperCode') ?? '',
      examName: searchParams?.get('examName') ?? '',
      subjectName: searchParams?.get('subjectName') ?? '',
      subjectCode: searchParams?.get('subjectCode') ?? '',
      totalmarks: searchParams?.get('totalmarks') ?? '',
    }),
    [searchParams],
  )

  const [rows, setRows] = useState<AnyRow[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<AnyRow | null>(null)
  const [editQuestion, setEditQuestion] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)
  const [editSaving, setEditSaving] = useState(false)

  async function refresh() {
    if (!params.templateId) {
      setRows([])
      return
    }
    setLoading(true)
    try {
      const data = await getQuestionPaperTemplateViewRows(
        params.templateId,
        params.questionPaperId || undefined,
      ).catch(() => [])
      setRows(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.templateId, params.questionPaperId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const hay = [
        r.questioncode,
        htmlToPlaintext(r.question),
        htmlToPlaintext(r.QuestionTitle),
        r.question_marks,
        r.individual_question_marks,
      ]
        .map((v) => String(v ?? '').toLowerCase())
        .join(' ')
      return hay.includes(q)
    })
  }, [rows, search])

  function navigateBack() {
    const qp = new URLSearchParams()
    const carry = ['courseId', 'academicYearId', 'examId', 'subjectId', 'regulationId']
    for (const k of carry) {
      const v = searchParams?.get(k)
      if (v) qp.set(k, v)
    }
    const q = qp.toString()
    router.push(
      `/admin-examination-management/evaluation-process/exam-question-paper-marks${q ? `?${q}` : ''}`,
    )
  }

  function navigateToWithRow(path: string, row: AnyRow) {
    const qp = new URLSearchParams()
    qp.set('questionPaperId', String(params.questionPaperId))
    qp.set('examQuestionPaperTemplateId', String(params.templateId))
    qp.set('pkEQPTid', String(params.templateId))
    qp.set('questionpaper_title', params.questionPaperTitle)
    qp.set('examName', params.examName)
    qp.set('subjectName', params.subjectName)
    qp.set('subjectCode', params.subjectCode)
    qp.set('totalmarks', params.totalmarks)
    // Carry the row meta Angular sends to QB / Add Manual.
    const meta = ['level0no', 'level1no', 'groupno', 'subgroupno', 'questionnumber', 'questioncode', 'subquestioncode']
    for (const k of meta) {
      const v = row?.[k]
      if (v != null) qp.set(k, String(v))
    }
    const iqm = row?.individual_question_marks
    if (iqm != null) qp.set('iqm', String(iqm))
    router.push(`${path}?${qp.toString()}`)
  }

  function questionBank(row: AnyRow) {
    navigateToWithRow(
      '/admin-examination-management/evaluation-process/exam-question-paper-marks/question-bank',
      row,
    )
  }

  function printQuestionPaper() {
    const qp = new URLSearchParams({
      examQuestionPaperTemplateId: String(params.templateId),
      pkEQPTid: String(params.templateId),
      questionPaperId: String(params.questionPaperId),
      examQuestionPaperId: String(params.questionPaperId),
      questionpaper_title: params.questionPaperTitle,
      questionPaperTitle: params.questionPaperTitle,
      examName: params.examName,
      subjectName: params.subjectName,
      subjectCode: params.subjectCode,
      totalmarks: params.totalmarks,
    })
    router.push(
      `/admin-examination-management/evaluation-process/exam-question-paper-marks/view-template?${qp.toString()}`,
    )
  }

  function printQA() {
    const qp = new URLSearchParams({
      examQuestionPaperTemplateId: String(params.templateId),
      pkEQPTid: String(params.templateId),
      questionPaperId: String(params.questionPaperId),
      examQuestionPaperId: String(params.questionPaperId),
      questionpaper_title: params.questionPaperTitle,
      questionPaperTitle: params.questionPaperTitle,
      examName: params.examName,
      subjectName: params.subjectName,
      subjectCode: params.subjectCode,
      totalmarks: params.totalmarks,
    })
    router.push(
      `/admin-examination-management/evaluation-process/exam-question-paper-marks/print-qa?${qp.toString()}`,
    )
  }

  async function openEditQuestion(row: AnyRow) {
    const marksId = Number(row.pk_questionpaper_marks_id ?? row.questionPaperMarksId ?? 0)
    if (!marksId) {
      toastError('This row has no editable question yet.')
      return
    }
    setEditing({ ...row, _resolvedMarksId: marksId })
    setEditQuestion(String(row.question ?? ''))
    setEditIsActive(row.is_active === false ? false : true)
    // Try to enrich from the canonical record (Angular reads the full
    // QuestionPaperMarks before opening the modal).
    const full = await getQuestionPaperMarksById(marksId).catch(() => null)
    if (full) {
      setEditing({ ...row, ...full, _resolvedMarksId: marksId })
      if (full.question != null) setEditQuestion(String(full.question))
      if (full.isActive != null) setEditIsActive(Boolean(full.isActive))
    }
  }

  async function saveEditedQuestion() {
    if (!editing) return
    const marksId = Number(editing._resolvedMarksId ?? editing.questionPaperMarksId ?? 0)
    if (!marksId) return
    setEditSaving(true)
    try {
      const trimmed = editQuestion.trim()
      await updateQuestionPaperMarks(marksId, {
        ...editing,
        question: trimmed === '' ? null : editQuestion,
        isActive: editIsActive,
        questionPaperMarksId: marksId,
      })
      toastSuccess('Question updated.')
      setEditing(null)
      await refresh()
    } catch (e: any) {
      toastError(e?.message ?? 'Failed to update question.')
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">
            Manage Questions
            {params.questionPaperTitle ? (
              <span className="ml-2 text-[13px] font-medium text-blue-700">
                (Question Paper: {params.questionPaperTitle})
              </span>
            ) : null}
          </h2>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search" />
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="h-8 text-[12px]" onClick={navigateBack}>
              Back
            </Button>
            {rows.length > 0 ? (
              <>
                <Button type="button" className="h-8 text-[12px]" onClick={printQuestionPaper}>
                  Print Question Paper
                </Button>
                <Button type="button" className="h-8 text-[12px]" onClick={printQA}>
                  Print QA
                </Button>
              </>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto px-4 pb-4">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left">
                <th className="w-12 px-2 py-2">SI.No</th>
                <th className="w-24 px-2 py-2">QuestionNo</th>
                <th className="px-2 py-2">Question</th>
                <th className="w-20 px-2 py-2 text-center">Marks</th>
                <th className="w-24 px-2 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-muted-foreground">
                    No questions found.
                  </td>
                </tr>
              ) : (
                filtered.map((r, i) => {
                  const code = pickText(r, ['questioncode'])
                  const hasCode = code.length > 0
                  const questionHtml = String(r.question ?? '')
                  const questionEmpty = questionHtml.trim() === ''
                  const marksId = Number(r.pk_questionpaper_marks_id ?? r.questionPaperMarksId ?? 0)
                  return (
                    <tr key={`mq-${r.pk_questionpaper_marks_id ?? r.questioncode ?? i}`} className="border-b border-border align-top">
                      <td className="px-2 py-2">{i + 1}</td>
                      <td className="px-2 py-2">{code || '-'}</td>
                      <td className="px-2 py-2">
                        {!hasCode ? (
                          <p className="font-bold capitalize">{htmlToPlaintext(r.QuestionTitle)}</p>
                        ) : (
                          <>
                            <span
                              className="block"
                              dangerouslySetInnerHTML={{ __html: questionHtml }}
                            />
                            {questionEmpty && hasCode ? (
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-7 text-[11px]"
                                  onClick={() => questionBank(r)}
                                >
                                  <Plus className="mr-1 h-3 w-3" /> QB
                                </Button>
                              </div>
                            ) : null}
                          </>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {hasCode
                          ? (r.individual_question_marks ?? '-')
                          : (r.question_marks ?? '-')}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {hasCode && marksId > 0 ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            aria-label="Edit question"
                            title="Edit"
                            onClick={() => void openEditQuestion(r)}
                          >
                            <Pencil className="h-4 w-4 text-slate-700" />
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-muted/40">
          <Button type="button" variant="outline" className="h-8 text-[12px]" onClick={navigateBack}>
            Back
          </Button>
          {rows.length > 0 ? (
            <>
              <Button type="button" className="h-8 text-[12px]" onClick={printQuestionPaper}>
                Print Question Paper
              </Button>
              <Button type="button" className="h-8 text-[12px]" onClick={printQA}>
                Print QA
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(v) => { if (!v) setEditing(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[16px] text-[hsl(var(--primary))]">
              Edit Question
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-[13px]">
            <div>
              <Label className="text-[12px]">Question</Label>
              <textarea
                className="min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"
                value={editQuestion}
                onChange={(e) => setEditQuestion(e.target.value)}
                placeholder="Enter question"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                HTML allowed -- text rendered as innerHTML on the QP / Manage views.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="edit-isactive"
                checked={editIsActive}
                onCheckedChange={(v) => setEditIsActive(v === true)}
              />
              <Label htmlFor="edit-isactive" className="text-[12px]">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={editSaving}>
              Close
            </Button>
            <Button onClick={() => void saveEditedQuestion()} disabled={editSaving}>
              {editSaving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
