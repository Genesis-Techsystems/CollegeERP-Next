'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronLeftIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RichTextEditor } from '@/common/components/rich-text-editor'
import { listQuestionsByBank, listQuestionTypes, addOrUpdateQuestion } from '@/services/admin/question-bank'
import { useSession } from '@/hooks/useSession'
import { QK } from '@/lib/query-keys'
import type {
  AssessmentQuestion,
  CourseQuestion,
  CourseQuestionOption,
  QuestionType,
} from '@/types/question-bank'
import { cn } from '@/lib/utils'

// ─── Question type selector ───────────────────────────────────────────────────

function QuestionTypeSelector({
  types,
  selected,
  onChange,
  disabled,
}: {
  types: QuestionType[]
  selected: string
  onChange: (code: string) => void
  disabled: boolean
}) {
  return (
    <div className="space-y-2">
      <Label>Question Type</Label>
      <div className="flex flex-wrap gap-2">
        {types.map((t) => (
          <button
            key={t.generalDetailId}
            type="button"
            disabled={disabled}
            onClick={() => onChange(t.generalDetailCode)}
            className={cn(
              'rounded-md border px-4 py-2 text-sm font-medium transition-colors',
              selected === t.generalDetailCode
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-foreground hover:bg-muted',
              disabled && 'pointer-events-none opacity-50',
            )}
          >
            {t.generalDetailDisplayName}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── MC option row ────────────────────────────────────────────────────────────

interface McOption {
  id: number
  inputHead: string
  options: string
  isCorrectAnswer: boolean
  courseQuestionOptionId: number | null
  isActive: boolean
}

function McOptionRow({
  opt,
  onChange,
}: {
  opt: McOption
  onChange: (updated: McOption) => void
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{opt.inputHead}</span>
        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={opt.isCorrectAnswer}
            onChange={(e) => onChange({ ...opt, isCorrectAnswer: e.target.checked })}
            className="h-4 w-4"
          />
          Correct Answer
        </label>
      </div>
      <RichTextEditor
        value={opt.options}
        onChange={(html) => onChange({ ...opt, options: html })}
        compact
        minHeight={90}
        placeholder={`Enter ${opt.inputHead.toLowerCase()}…`}
      />
    </div>
  )
}

// ─── Default option sets ──────────────────────────────────────────────────────

function makeMcOptions(): McOption[] {
  return Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    inputHead: `Choice ${i + 1}`,
    options: '',
    isCorrectAnswer: false,
    courseQuestionOptionId: null,
    isActive: true,
  }))
}

function makeTfOptions() {
  return [
    { id: 1, options: 'True',  isCorrectAnswer: false, courseQuestionOptionId: null, isActive: true },
    { id: 2, options: 'False', isCorrectAnswer: false, courseQuestionOptionId: null, isActive: true },
  ]
}

function makeFbAnswers() {
  return Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    name: `Answer ${i + 1}`,
    options: '',
    courseQuestionOptionId: null as number | null,
    isActive: true,
  }))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AddQuestionPage() {
  const router = useRouter()
  const params = useSearchParams()
  const { user } = useSession()
  const queryClient = useQueryClient()

  const assessmentId = Number(params.get('assessmentId'))
  const assessmentQuestionId = params.get('assessmentQuestionId')
    ? Number(params.get('assessmentQuestionId'))
    : null
  const permission = params.get('permission') ?? 'Add'
  const returnPage = params.get('page') ?? '/assessments/question-bank'

  const isEditing = assessmentQuestionId !== null

  // ── Question type list ────────────────────────────────────────────────────
  const { data: questionTypes = [] } = useQuery<QuestionType[]>({
    queryKey: QK.questionBanks.questionTypes(),
    queryFn: listQuestionTypes,
    staleTime: Infinity,
  })

  // ── Current question state ────────────────────────────────────────────────
  const [selectedType, setSelectedType] = useState<string>('TF')
  const [question, setQuestion] = useState('')
  const [marks, setMarks] = useState<number | ''>(1)
  const [mcOptions, setMcOptions] = useState<McOption[]>(makeMcOptions())
  const [tfCheck, setTfCheck] = useState<1 | 2>(1) // 1=True 2=False correct
  const [fbAnswers, setFbAnswers] = useState(makeFbAnswers())
  const [subExplanation, setSubExplanation] = useState('')
  const [existingQuestion, setExistingQuestion] = useState<AssessmentQuestion | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // ── Load existing question when editing ───────────────────────────────────
  const loadExisting = useCallback(async () => {
    if (!isEditing || !assessmentId || !assessmentQuestionId) return
    const rows = await listQuestionsByBank(assessmentId)
    const aq = rows.find((r) => r.assessmentQuestionId === assessmentQuestionId)
    if (!aq) return

    setExistingQuestion(aq)
    const q: CourseQuestion = aq.courseQuestionDTO
    setSelectedType(q.fbInputTypeCatCode)
    setQuestion(q.question)
    setMarks(q.marks)

    if (q.fbInputTypeCatCode === 'MC') {
      setMcOptions(
        q.courseQuestionOptionDTOs.map((o, i) => ({
          id: i + 1,
          inputHead: `Choice ${i + 1}`,
          options: o.options,
          isCorrectAnswer: o.isCorrectAnswer,
          courseQuestionOptionId: o.courseQuestionOptionId,
          isActive: o.isActive,
        })),
      )
    } else if (q.fbInputTypeCatCode === 'TF') {
      const trueOpt = q.courseQuestionOptionDTOs[0]
      setTfCheck(trueOpt?.isCorrectAnswer ? 1 : 2)
    } else if (q.fbInputTypeCatCode === 'FB') {
      setFbAnswers(
        q.courseQuestionOptionDTOs.map((o, i) => ({
          id: i + 1,
          name: `Answer ${i + 1}`,
          options: o.options,
          courseQuestionOptionId: o.courseQuestionOptionId,
          isActive: o.isActive,
        })),
      )
    } else {
      setSubExplanation(q.courseQuestionOptionDTOs[0]?.options ?? '')
    }
  }, [isEditing, assessmentId, assessmentQuestionId])

  useEffect(() => { loadExisting() }, [loadExisting])

  // ── Build payload options ─────────────────────────────────────────────────
  function buildOptions(): Partial<CourseQuestionOption>[] {
    switch (selectedType) {
      case 'MC':
        return mcOptions.map((o) => ({
          options: o.options,
          isCorrectAnswer: o.isCorrectAnswer,
          courseQuestionOptionId: o.courseQuestionOptionId,
          isActive: o.isActive,
        }))
      case 'TF': {
        const tfOpts = [
          { id: 1, options: 'True',  courseQuestionOptionId: null as number | null, isActive: true },
          { id: 2, options: 'False', courseQuestionOptionId: null as number | null, isActive: true },
        ]
        if (existingQuestion?.courseQuestionDTO.fbInputTypeCatCode === 'TF') {
          const dtos = existingQuestion.courseQuestionDTO.courseQuestionOptionDTOs
          tfOpts[0].courseQuestionOptionId = dtos[0]?.courseQuestionOptionId ?? null
          tfOpts[1].courseQuestionOptionId = dtos[1]?.courseQuestionOptionId ?? null
        }
        return tfOpts.map((o) => ({
          options: o.options,
          isCorrectAnswer: o.id === tfCheck,
          courseQuestionOptionId: o.courseQuestionOptionId,
          isActive: o.isActive,
        }))
      }
      case 'FB':
        return fbAnswers
          .filter((a) => a.options.trim() !== '')
          .map((a) => ({
            options: a.options,
            isCorrectAnswer: true,
            courseQuestionOptionId: a.courseQuestionOptionId,
            isActive: a.isActive,
          }))
      case 'SUB': {
        const subOpt = existingQuestion?.courseQuestionDTO.courseQuestionOptionDTOs[0]
        return [
          {
            options: subExplanation,
            isCorrectAnswer: true,
            courseQuestionOptionId: subOpt?.courseQuestionOptionId ?? null,
            isActive: true,
          },
        ]
      }
      default:
        return []
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!question.trim()) { toast.error('Question content is required'); return }
    if (marks === '' || marks === undefined) { toast.error('Marks are required'); return }

    const qTypeObj = questionTypes.find((t) => t.generalDetailCode === selectedType)
    if (!qTypeObj) { toast.error('Question type not found'); return }

    const evaluatorProfileId = user?.employeeId ?? null

    const payload: Parameters<typeof addOrUpdateQuestion>[0] = {
      assessmentId,
      question,
      marks: Number(marks),
      fbInputTypeCatId: qTypeObj.generalDetailId,
      isActive: true,
      correctAnswerIds: [],
      courseQuestionOptionDTOs: buildOptions() as CourseQuestionOption[],
      onlineCourseId: null,
      courseLessonId: null,
      courseLessonTopicId: null,
      questionOwnerProfileId: evaluatorProfileId,
    }

    if (isEditing && existingQuestion) {
      payload.assessmentQuestionId = existingQuestion.assessmentQuestionId
      payload.courseQuestionId = existingQuestion.courseQuestionDTO.courseQuestionId
      payload.onlineCourseId = existingQuestion.courseQuestionDTO.onlineCourseId
      payload.courseLessonId = existingQuestion.courseQuestionDTO.courseLessonId
      payload.courseLessonTopicId = existingQuestion.courseQuestionDTO.courseLessonTopicId
    }

    setSubmitting(true)
    try {
      await addOrUpdateQuestion(payload)
      toast.success(isEditing ? 'Question updated' : 'Question added')
      await queryClient.invalidateQueries({ queryKey: QK.questionBanks.all })
      router.push(`${returnPage}`)
      // leave submitting=true so the button stays disabled during navigation
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save question')
      setSubmitting(false)
    }
  }

  // ── Helpers for FB ────────────────────────────────────────────────────────
  const addFbAnswer = () =>
    setFbAnswers((prev) => [
      ...prev,
      { id: prev.length + 1, name: `Answer ${prev.length + 1}`, options: '', courseQuestionOptionId: null, isActive: true },
    ])

  const removeFbAnswer = (id: number) =>
    setFbAnswers((prev) => prev.filter((a) => a.id !== id))

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PageContainer className="space-y-6 max-w-4xl">
      <PageHeader
        title={`${permission} Question`}
        subtitle="Use $…$ for inline math, $$…$$ for display math, \\ce{…} for chemistry"
      />

      <div className="rounded-lg border border-border bg-white p-6 space-y-6">

        {/* Question type selector — disabled when editing (type can't change) */}
        <QuestionTypeSelector
          types={questionTypes}
          selected={selectedType}
          onChange={setSelectedType}
          disabled={isEditing}
        />

        {/* Question body */}
        <div className="space-y-2">
          <Label>Question *</Label>
          <RichTextEditor
            value={question}
            onChange={setQuestion}
            placeholder="Enter question… $x^2 + y^2 = r^2$  or  \ce{H2O}"
            minHeight={200}
          />
        </div>

        {/* Marks */}
        <div className="space-y-1 w-40">
          <Label htmlFor="marks">Marks *</Label>
          <Input
            id="marks"
            type="number"
            min={0}
            step={0.5}
            value={marks}
            onChange={(e) => setMarks(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>

        {/* ── Answer section by type ── */}
        <div className="rounded-md border p-4 space-y-4">
          <p className="text-sm font-medium text-muted-foreground">Answers</p>

          {/* MC */}
          {selectedType === 'MC' && (
            <div className="space-y-4">
              {mcOptions.map((opt) => (
                <McOptionRow
                  key={opt.id}
                  opt={opt}
                  onChange={(updated) =>
                    setMcOptions((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
                  }
                />
              ))}
            </div>
          )}

          {/* TF */}
          {selectedType === 'TF' && (
            <div className="flex gap-6">
              {([1, 2] as const).map((val) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="tfCorrect"
                    checked={tfCheck === val}
                    onChange={() => setTfCheck(val)}
                    className="h-4 w-4"
                  />
                  {val === 1 ? 'True' : 'False'}
                </label>
              ))}
            </div>
          )}

          {/* FB */}
          {selectedType === 'FB' && (
            <div className="space-y-3">
              {fbAnswers.map((ans) => (
                <div key={ans.id} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-sm font-medium">{ans.name}</span>
                  <Input
                    value={ans.options}
                    onChange={(e) =>
                      setFbAnswers((prev) =>
                        prev.map((a) => (a.id === ans.id ? { ...a, options: e.target.value } : a)),
                      )
                    }
                    placeholder="Accepted answer"
                    className="flex-1"
                  />
                  {fbAnswers.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFbAnswer(ans.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" size="sm" variant="outline" onClick={addFbAnswer}>
                <PlusIcon className="h-3.5 w-3.5 mr-1" />
                Add Answer
              </Button>
            </div>
          )}

          {/* SUB */}
          {selectedType === 'SUB' && (
            <div className="space-y-2">
              <Label>Model Explanation (optional)</Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-1 focus:ring-ring"
                value={subExplanation}
                onChange={(e) => setSubExplanation(e.target.value)}
                placeholder="Enter model answer or explanation"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Saving…' : isEditing ? 'Update Question' : 'Add Question'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={submitting}
          >
            <ChevronLeftIcon className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>
      </div>
    </PageContainer>
  )
}
