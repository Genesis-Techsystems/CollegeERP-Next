'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FilteredPage } from '@/components/layout'
import { SearchInput } from '@/common/components/search'
import { RichTextEditor } from '@/common/components/rich-text-editor'
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
  const [editMarks, setEditMarks] = useState<string>('')
  const [editSaving, setEditSaving] = useState(false)
  const [editLoading, setEditLoading] = useState(false)

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
    // Forward the filter ids so downstream (Question Bank) can resolve the
    // subject code from subjectId when subjectCode isn't populated.
    const carry = ['subjectId', 'courseId', 'academicYearId', 'examId', 'regulationId']
    for (const k of carry) {
      const v = searchParams?.get(k)
      if (v) qp.set(k, v)
    }
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
    // Angular: listDetailsById first, then open EditQuestionsComponent with that row.
    setEditLoading(true)
    try {
      const full = await getQuestionPaperMarksById(marksId)
      if (!full) {
        toastError('Could not load question details.')
        return
      }
      setEditing({ ...row, ...full, _resolvedMarksId: marksId })
      setEditQuestion(String(full.question ?? ''))
      const marks =
        full.questionMarks ??
        row.individual_question_marks ??
        row.question_marks ??
        ''
      setEditMarks(marks === '' || marks == null ? '' : String(marks))
    } catch (e: any) {
      toastError(e?.message ?? 'Could not load question details.')
    } finally {
      setEditLoading(false)
    }
  }

  async function persistEditedQuestion(next: {
    question: string | null
    isActive: boolean
    questionMarks?: number | null
  }) {
    if (!editing) return
    const marksId = Number(editing._resolvedMarksId ?? editing.questionPaperMarksId ?? 0)
    if (!marksId) return
    setEditSaving(true)
    try {
      const marksRaw = editMarks.trim()
      const questionMarks =
        next.questionMarks !== undefined
          ? next.questionMarks
          : marksRaw === ''
            ? editing.questionMarks ?? null
            : Number(marksRaw)
      await updateQuestionPaperMarks(marksId, {
        ...editing,
        question: next.question,
        isActive: next.isActive,
        questionMarks,
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

  async function saveEditedQuestion() {
    // Angular submit(): question from editor, questionMarks, isActive = true
    const trimmed = editQuestion.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
    const emptyHtml =
      !editQuestion ||
      trimmed === '' ||
      editQuestion === '<p></p>' ||
      editQuestion === '<p><br></p>'
    await persistEditedQuestion({
      question: emptyHtml ? null : editQuestion,
      isActive: true,
    })
  }

  async function deleteEditedQuestion() {
    // Angular deleted(): clear question text, isActive = false, then update
    await persistEditedQuestion({
      question: null,
      isActive: false,
    })
  }

  return (
    <FilteredPage
      title={`Manage Questions${params.questionPaperTitle ? ` (${params.questionPaperTitle})` : ''}`}
      filtersCollapsible={false}
      filters={(
        <div className="flex flex-wrap items-center justify-between gap-2">
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
      )}
    >
      <div className="app-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-[hsl(var(--primary)/0.06)] text-left">
                <th className="border border-border px-3 py-2.5 w-14 text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--app-table-header-color))]">
                  SI.No
                </th>
                <th className="border border-border px-3 py-2.5 w-28 text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--app-table-header-color))]">
                  QuestionNo
                </th>
                <th className="border border-border px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--app-table-header-color))]">
                  Question
                </th>
                <th className="border border-border px-3 py-2.5 w-24 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--app-table-header-color))]">
                  Marks
                </th>
                <th className="border border-border px-3 py-2.5 w-24 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-[hsl(var(--app-table-header-color))]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="border border-border px-3 py-6 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-border px-3 py-6 text-center text-muted-foreground">
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
                    <tr
                      key={`mq-${r.pk_questionpaper_marks_id ?? r.questioncode ?? i}`}
                      className="align-top hover:bg-muted/40"
                    >
                      <td className="border border-border px-3 py-2 font-medium">{i + 1}</td>
                      <td className="border border-border px-3 py-2 font-medium">{code || '-'}</td>
                      <td className="border border-border px-3 py-2 font-medium">
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
                      <td className="border border-border px-3 py-2 text-center font-medium">
                        {hasCode
                          ? (r.individual_question_marks ?? '-')
                          : (r.question_marks ?? '-')}
                      </td>
                      <td className="border border-border px-3 py-2 text-center">
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
        <DialogContent className="max-w-[750px] gap-4">
          <DialogHeader>
            <DialogTitle className="text-[16px] text-[hsl(var(--primary))]">
              Edit Question
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-[13px]">
            <div>
              <Label className="mb-1.5 block text-[12px]">Question</Label>
              <RichTextEditor
                value={editQuestion}
                onChange={setEditQuestion}
                placeholder="Enter Question"
                minHeight={220}
              />
            </div>
            <div className="max-w-[200px]">
              <Label htmlFor="edit-marks" className="mb-1.5 block text-[12px]">
                Marks
              </Label>
              <Input
                id="edit-marks"
                type="number"
                min={0}
                step="any"
                className="h-9"
                value={editMarks}
                onChange={(e) => setEditMarks(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEditing(null)} disabled={editSaving}>
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={() => void deleteEditedQuestion()}
              disabled={editSaving}
            >
              Delete
            </Button>
            <Button onClick={() => void saveEditedQuestion()} disabled={editSaving}>
              {editSaving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editLoading ? (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-black/10">
          <div className="rounded-md bg-background px-4 py-2 text-[13px] shadow">
            Loading question…
          </div>
        </div>
      ) : null}
    </FilteredPage>
  )
}
