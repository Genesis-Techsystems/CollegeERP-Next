'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PageContainer } from '@/components/layout'
import { Select } from '@/common/components/select'
import { useSessionContext } from '@/context/SessionContext'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  createQuestionPaperMarks,
  listAssessmentsBySubjectCode,
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
    .trim()
}

export default function QuestionBankPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useSessionContext()
  const employeeId = Number(
    user?.employeeId ?? globalThis?.localStorage?.getItem('employeeId') ?? 0,
  )

  const params = useMemo(
    () => ({
      questionPaperId: Number(searchParams?.get('questionPaperId') ?? 0),
      templateId: Number(searchParams?.get('examQuestionPaperTemplateId') ?? searchParams?.get('pkEQPTid') ?? 0),
      questionPaperTitle:
        searchParams?.get('questionpaper_title') ?? searchParams?.get('questionPaperTitle') ?? '',
      examName: searchParams?.get('examName') ?? '',
      subjectName: searchParams?.get('subjectName') ?? '',
      subjectCode: searchParams?.get('subjectCode') ?? '',
      level0no: searchParams?.get('level0no') ?? '',
      level1no: searchParams?.get('level1no') ?? '',
      groupno: searchParams?.get('groupno') ?? '',
      subgroupno: searchParams?.get('subgroupno') ?? '',
      questionnumber: searchParams?.get('questionnumber') ?? '',
      questioncode: searchParams?.get('questioncode') ?? '',
      subquestioncode: searchParams?.get('subquestioncode') ?? '',
      iqm: Number(searchParams?.get('iqm') ?? 0),
    }),
    [searchParams],
  )

  const [banks, setBanks] = useState<AnyRow[]>([])
  const [bankId, setBankId] = useState<number>(0)
  const [questions, setQuestions] = useState<AnyRow[]>([])
  const [pickedQuestion, setPickedQuestion] = useState<AnyRow | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const rows = await listAssessmentsBySubjectCode(params.subjectCode).catch(() => [])
      if (cancelled) return
      setBanks(Array.isArray(rows) ? rows : [])
    })()
    return () => {
      cancelled = true
    }
  }, [params.subjectCode])

  function handleBankPick(id: number) {
    setBankId(id)
    const bank = banks.find((b) => Number(b.assessmentId) === id)
    const list = Array.isArray(bank?.assessmentQuestionDTOs) ? bank.assessmentQuestionDTOs : []
    setQuestions(list)
    setPickedQuestion(null)
  }

  function navigateBack() {
    const qp = new URLSearchParams()
    qp.set('questionPaperId', String(params.questionPaperId))
    qp.set('examQuestionPaperTemplateId', String(params.templateId))
    qp.set('pkEQPTid', String(params.templateId))
    qp.set('questionpaper_title', params.questionPaperTitle)
    qp.set('questionPaperTitle', params.questionPaperTitle)
    qp.set('examName', params.examName)
    qp.set('subjectName', params.subjectName)
    qp.set('subjectCode', params.subjectCode)
    const carry = ['courseId', 'academicYearId', 'examId', 'subjectId', 'regulationId', 'totalmarks']
    for (const k of carry) {
      const v = searchParams?.get(k)
      if (v) qp.set(k, v)
    }
    router.push(
      `/admin-examination-management/evaluation-process/exam-question-paper-marks/manage-questions-paper?${qp.toString()}`,
    )
  }

  async function addPickedToQuestionPaper() {
    if (!pickedQuestion) {
      toastError('Pick a question first.')
      return
    }
    const courseQ = pickedQuestion.courseQuestionDTO ?? pickedQuestion
    const modelAnswer =
      Array.isArray(courseQ?.courseQuestionOptionDTOs) && courseQ.courseQuestionOptionDTOs[0]?.options
        ? String(courseQ.courseQuestionOptionDTOs[0].options)
        : ''
    setSaving(true)
    try {
      await createQuestionPaperMarks({
        questionPaperId: params.questionPaperId,
        level0No: Number(params.level0no) || 0,
        level1No: Number(params.level1no) || 0,
        groupNo: Number(params.groupno) || 0,
        subGroupNo: Number(params.subgroupno) || 0,
        questionNumber: Number(params.questionnumber) || 0,
        questionCode: params.questioncode,
        subQuestionCode: params.subquestioncode,
        question: courseQ?.question ?? '',
        questionMarks: params.iqm || Number(courseQ?.marks) || 0,
        modelAnswer1: modelAnswer,
        courseQuestionId: Number(courseQ?.courseQuestionId) || 0,
        assessmentId: bankId || null,
        questionOwnerProfileId: employeeId,
        isActive: true,
      })
      toastSuccess('Question added to question paper.')
      navigateBack()
    } catch (e: any) {
      toastError(e?.message ?? 'Failed to add question to paper.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">
            Question Bank
            {params.questionPaperTitle ? (
              <span className="ml-2 text-[13px] font-medium text-blue-700">
                ({params.questionPaperTitle} — {params.questioncode})
              </span>
            ) : null}
          </h2>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="h-8 text-[12px]" onClick={navigateBack}>
              Back
            </Button>
            <Button
              type="button"
              className="h-8 text-[12px]"
              onClick={() => void addPickedToQuestionPaper()}
              disabled={saving || !pickedQuestion}
            >
              {saving ? 'Saving…' : 'Add Question'}
            </Button>
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-[13px]">
          <div className="space-y-1">
            <Label className="text-[12px]">Question Bank</Label>
            <Select
              value={bankId ? String(bankId) : null}
              onChange={(v) => handleBankPick(Number(v) || 0)}
              options={banks.map((b) => ({
                value: String(b.assessmentId),
                label:
                  String(b.assessmentName ?? b.assessmentCode ?? b.assessmentTitle ?? '-') +
                  (b.onlineCourseName ? ` (${b.onlineCourseName})` : ''),
              }))}
              placeholder={banks.length === 0 ? 'No question banks for this subject' : 'Select Question Bank'}
              disabled={banks.length === 0}
              searchable
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label className="text-[12px]">Subject</Label>
            <div className="rounded-md border border-input bg-background px-3 py-2 text-[12px] text-slate-700">
              {params.subjectName} {params.subjectCode ? `(${params.subjectCode})` : ''} —{' '}
              <span className="text-blue-700">{params.questioncode || '—'}</span>{' '}
              <span className="text-muted-foreground">Max Marks: {params.iqm || '—'}</span>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4">
          {questions.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-muted-foreground">
              {bankId
                ? 'No questions in this question bank.'
                : 'Pick a question bank to see its questions.'}
            </p>
          ) : (
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left">
                  <th className="w-10 px-2 py-2"></th>
                  <th className="w-12 px-2 py-2">SI.No</th>
                  <th className="px-2 py-2">Question</th>
                  <th className="w-20 px-2 py-2 text-center">Marks</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q, i) => {
                  const courseQ = q.courseQuestionDTO ?? q
                  const id = Number(q.assessmentQuestionId ?? q.courseQuestionId ?? courseQ?.courseQuestionId ?? i)
                  const isPicked = pickedQuestion === q
                  return (
                    <tr
                      key={`qb-${id}`}
                      className={`border-b border-border align-top ${
                        isPicked ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-2 py-2">
                        <input
                          type="radio"
                          name="qb-pick"
                          checked={isPicked}
                          onChange={() => setPickedQuestion(q)}
                        />
                      </td>
                      <td className="px-2 py-2">{i + 1}</td>
                      <td className="px-2 py-2">
                        <span
                          className="block"
                          dangerouslySetInnerHTML={{
                            __html: String(courseQ?.question ?? htmlToPlaintext(courseQ?.question)),
                          }}
                        />
                      </td>
                      <td className="px-2 py-2 text-center">{courseQ?.marks ?? '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
