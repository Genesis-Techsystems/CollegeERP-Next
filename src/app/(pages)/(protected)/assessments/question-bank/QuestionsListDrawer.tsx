'use client'

import { useState } from 'react'
import { PencilIcon, Trash2Icon, ChevronDownIcon, ListChecksIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/common/components/data-display'
import { MathContent } from '@/common/components/rich-text-editor'
import { addOrUpdateQuestion } from '@/services/admin/question-bank'
import type { Assessment, AssessmentQuestion } from '@/types/question-bank'
import { cn } from '@/lib/utils'

// ─── Question type badge ──────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  MC: 'Multiple Choice',
  TF: 'True / False',
  FB: 'Fill in Blank',
  SUB: 'Subjective',
}

function TypeBadge({ code }: { code: string }) {
  const colors: Record<string, string> = {
    MC: 'bg-blue-100 text-blue-700',
    TF: 'bg-green-100 text-green-700',
    FB: 'bg-yellow-100 text-yellow-700',
    SUB: 'bg-purple-100 text-purple-700',
  }
  return (
    <span
      className={cn(
        'inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
        colors[code] ?? 'bg-muted text-muted-foreground',
      )}
    >
      {TYPE_LABELS[code] ?? code}
    </span>
  )
}

// ─── Single question accordion item ──────────────────────────────────────────

interface QuestionItemProps {
  aq: AssessmentQuestion
  index: number
  onEdit: () => void
  onDelete: () => void
  deleting: boolean
}

function QuestionItem({ aq, index, onEdit, onDelete, deleting }: QuestionItemProps) {
  const [open, setOpen] = useState(false)
  const q = aq.courseQuestionDTO

  return (
    <div className="overflow-hidden rounded-md border border-border bg-white shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 bg-slate-100 px-4 py-2.5 text-left"
        onClick={() => setOpen((p) => !p)}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 text-sm font-medium text-slate-700">
            {index + 1}.
          </span>
          <div className="min-w-0 text-[13px] font-semibold leading-tight text-slate-800">
            Question{' '}
            <span className="font-semibold">
              ({q.marks} mark{q.marks !== 1 ? 's' : ''})
            </span>
          </div>
        </div>
        <ChevronDownIcon
          className={cn('h-5 w-5 shrink-0 text-slate-500 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <TypeBadge code={q.fbInputTypeCatCode} />
            <StatusBadge status={q.isActive} />
          </div>
          <MathContent html={q.question} className="text-sm" />
          {/* Options */}
          {q.fbInputTypeCatCode !== 'SUB' && q.courseQuestionOptionDTOs?.length > 0 && (
            <div className="space-y-1">
              {q.courseQuestionOptionDTOs.map((opt, i) => (
                <div
                  key={opt.courseQuestionOptionId ?? i}
                  className={cn(
                    'flex items-start gap-2 rounded px-2 py-1.5 text-sm',
                    opt.isCorrectAnswer && 'bg-green-50 text-green-800 font-medium',
                  )}
                >
                  <span className="shrink-0 font-mono text-xs text-muted-foreground mt-0.5">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <MathContent html={opt.options} />
                  {opt.isCorrectAnswer && (
                    <span className="ml-auto shrink-0 text-[10px] font-semibold text-green-600">
                      ✓ Correct
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Subjective explanation */}
          {q.fbInputTypeCatCode === 'SUB' && q.courseQuestionOptionDTOs?.[0]?.options && (
            <div className="rounded bg-muted/50 px-3 py-2 text-sm">
              <p className="text-xs font-medium text-muted-foreground mb-1">Explanation</p>
              <MathContent html={q.courseQuestionOptionDTOs[0].options} />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" variant="outline" className="h-8 w-8 p-0" aria-label="Edit question" title="Edit" onClick={onEdit}>
              <PencilIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 hover:text-red-700"
              onClick={onDelete}
              disabled={deleting}
            >
              <Trash2Icon className="h-3.5 w-3.5 mr-1" />
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

interface Props {
  bank: Assessment | null
  onClose: () => void
  onEditQuestion: (bank: Assessment, assessmentQuestionId: number) => void
  onDeleted: () => void
  evaluatorProfileId: number | null | undefined
}

export default function QuestionsListDrawer({
  bank,
  onClose,
  onEditQuestion,
  onDeleted,
  evaluatorProfileId,
}: Props) {
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const questions = bank?.assessmentQuestionDTOs ?? []

  // TODO: Delete is currently broken — the backend `addQuestion` endpoint runs a duplicate-check
  // (courseQuestionRepo.isQuestionAvailable) before every save, including soft-deletes. When we
  // send isActive=false with the existing question text, the check finds the question itself and
  // returns "Duplicate question found for Assessment Id {id}" (success: false, statusCode: 200).
  // Fix required in AssessmentServiceImpl.addQuestion(): skip the duplicate check when
  // courseQuestionId is not null (i.e. it is an update/delete, not a new creation).
  //   if (CollectionUtils.isEmpty(list) || questionDTO.getCourseQuestionId() != null) {
  const handleDelete = async (aq: AssessmentQuestion) => {
    setDeletingId(aq.assessmentQuestionId)
    try {
      const q = aq.courseQuestionDTO
      await addOrUpdateQuestion({
        assessmentId: aq.assessmentId,           // must come from AssessmentQuestion, not courseQuestionDTO
        assessmentQuestionId: aq.assessmentQuestionId,
        courseQuestionId: q.courseQuestionId,
        question: q.question,
        marks: q.marks,
        fbInputTypeCatId: q.fbInputTypeCatId,
        isActive: false,
        correctAnswerIds: [],
        courseQuestionOptionDTOs: q.courseQuestionOptionDTOs.map((o) => ({ ...o, isActive: false })),
        onlineCourseId: q.onlineCourseId,
        courseLessonId: q.courseLessonId,
        courseLessonTopicId: q.courseLessonTopicId,
        questionOwnerProfileId: evaluatorProfileId ?? null,
      })
      toast.success('Question deleted')
      onDeleted()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete question')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Dialog open={bank !== null} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-5xl overflow-hidden border-border bg-slate-100 p-0 [&>button]:right-4 [&>button]:top-0 [&>button]:h-14 [&>button]:text-slate-500">
        <DialogHeader className="border-b border-border bg-white pt-[30px] pb-3 pl-[48px] pr-6">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-teal-600">
            <ListChecksIcon className="h-4 w-4 text-teal-600" />
            Questions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-3 pl-[48px] pr-6 pb-6">
          <div className="rounded-md border border-cyan-100 bg-cyan-50/30 px-5 py-3 text-sm">
            <div className="grid grid-cols-[220px_1fr] gap-y-1">
              <div className="font-medium text-slate-700">Assessment :</div>
              <div className="font-semibold text-blue-700">{bank?.assessmentName ?? '—'}</div>
              <div className="font-medium text-slate-700">Assessment No. :</div>
              <div className="font-semibold text-blue-700">{bank?.assessmentNo ?? 0}</div>
              <div className="font-medium text-slate-700">Description :</div>
              <div className="font-semibold text-blue-700">{bank?.assessmentDescription ?? '—'}</div>
            </div>
          </div>

          <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
            {questions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No questions found.
              </p>
            ) : (
              questions.map((aq, i) => (
                <QuestionItem
                  key={aq.assessmentQuestionId}
                  aq={aq}
                  index={i}
                  onEdit={() => bank && onEditQuestion(bank, aq.assessmentQuestionId)}
                  onDelete={() => handleDelete(aq)}
                  deleting={deletingId === aq.assessmentQuestionId}
                />
              ))
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 min-w-[104px] border-cyan-100 bg-cyan-50 text-sm font-medium text-teal-600 hover:bg-cyan-100 hover:text-teal-700"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
