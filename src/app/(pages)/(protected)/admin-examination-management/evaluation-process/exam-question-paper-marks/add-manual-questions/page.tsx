'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { PageContainer } from '@/components/layout'
import { toastError, toastSuccess } from '@/lib/toast'
import { createQuestionPaperMarks } from '@/services/evaluation-process'

export default function AddManualQuestionsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const params = useMemo(
    () => ({
      questionPaperId: Number(searchParams?.get('questionPaperId') ?? 0),
      templateId: Number(
        searchParams?.get('examQuestionPaperTemplateId') ?? searchParams?.get('pkEQPTid') ?? 0,
      ),
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

  const [question, setQuestion] = useState('')
  const [modelAnswer, setModelAnswer] = useState('')
  const [marks, setMarks] = useState<string>(String(params.iqm || ''))
  const [isActive, setIsActive] = useState(true)
  const [reason, setReason] = useState('active')
  const [saving, setSaving] = useState(false)

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

  async function saveQuestion() {
    if (!question.trim() || !modelAnswer.trim()) {
      toastError('Question and Model Answer are required.')
      return
    }
    if (!params.questionPaperId) {
      toastError('Missing questionPaperId in URL.')
      return
    }
    setSaving(true)
    try {
      await createQuestionPaperMarks({
        questionPaperId: params.questionPaperId,
        groupNo: Number(params.groupno) || 0,
        subGroupNo: Number(params.subgroupno) || 0,
        questionNumber: Number(params.questionnumber) || 0,
        questionCode: params.questioncode,
        subQuestionCode: params.subquestioncode,
        question,
        questionMarks: Number(marks) || 0,
        modelAnswer1: modelAnswer,
        isActive,
        reason: isActive ? null : reason || null,
      })
      toastSuccess('Question added.')
      navigateBack()
    } catch (e: any) {
      toastError(e?.message ?? 'Failed to save question.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">
            Add Question Manually
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
              onClick={() => void saveQuestion()}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
          <div className="md:col-span-2 space-y-1">
            <Label className="text-[12px]">Question *</Label>
            <textarea
              className="min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter the question (HTML allowed)"
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <Label className="text-[12px]">Model Answer *</Label>
            <textarea
              className="min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring"
              value={modelAnswer}
              onChange={(e) => setModelAnswer(e.target.value)}
              placeholder="Enter the model answer"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[12px]">Marks</Label>
            <Input
              type="number"
              className="h-9 text-[12px]"
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 self-end">
            <Checkbox
              id="amq-isactive"
              checked={isActive}
              onCheckedChange={(v) => {
                const next = v === true
                setIsActive(next)
                setReason(next ? 'active' : '')
              }}
            />
            <Label htmlFor="amq-isactive" className="text-[12px]">Active</Label>
          </div>
          {!isActive && (
            <div className="md:col-span-2 space-y-1">
              <Label className="text-[12px]">Reason</Label>
              <Input
                className="h-9 text-[12px]"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for deactivation"
              />
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
