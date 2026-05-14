'use client'

import { useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BookOpen, PencilLine, UploadCloud, Download } from 'lucide-react'
import { toast } from 'sonner'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { getAssessmentById, importQuestionsFromExcel, addOrUpdateQuestion } from '@/services/admin/question-bank'
import type { Assessment } from '@/types/question-bank'
import { useQuery } from '@tanstack/react-query'

function ActionCard({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-40 flex-col items-center rounded-md bg-[#47aea5ed] px-4 py-4 text-white shadow-sm transition hover:bg-[#3f9e96]"
    >
      <span className="mb-2 inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#47aea5ed]">
        {icon}
      </span>
      <span className="text-base font-semibold">{title}</span>
    </button>
  )
}

export default function ManageQuestionsPage() {
  const router = useRouter()
  const params = useSearchParams()
  const assessmentId = Number(params.get('assessmentId') ?? 0)
  const assessmentNameQp = params.get('assessmentName') ?? ''
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  const { data: assessment } = useQuery<Assessment | null>({
    queryKey: ['test', 'manage-question', assessmentId],
    queryFn: () => getAssessmentById(assessmentId),
    enabled: !!assessmentId,
  })

  const assessmentName = assessment?.assessmentName || assessmentNameQp || 'Test'

  const onUploadExcelClick = () => fileInputRef.current?.click()

  const onUploadExcelChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !assessmentId) return
    e.target.value = ''
    setImporting(true)
    try {
      const questions = await importQuestionsFromExcel(assessmentId, file)
      let saved = 0
      for (const q of questions) {
        await addOrUpdateQuestion({
          ...q,
          assessmentId,
          questionOwnerProfileId: null,
        })
        saved++
      }
      toast.success(`Imported ${saved} question${saved !== 1 ? 's' : ''}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <PageContainer className="space-y-4">
      <PageHeader
        title={`Manage Questions (${assessmentName})`}
        action={(
          <Button variant="outline" className="border-cyan-100 bg-cyan-50 text-teal-600 hover:bg-cyan-100 hover:text-teal-700" asChild>
            <a href="/assets/docs/QuestionSheet_bulk_upload.xlsx" download>
              <Download className="mr-2 h-4 w-4" />
              Download Sample XL
            </a>
          </Button>
        )}
      />

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap gap-6">
          <ActionCard
            icon={<BookOpen className="h-7 w-7" />}
            title="Question Bank"
            onClick={() => router.push('/assessments/question-bank')}
          />
          <ActionCard
            icon={<PencilLine className="h-7 w-7" />}
            title="Manually"
            onClick={() => router.push(`/assessments/question-bank/add-question?assessmentId=${assessmentId}&assessmentQuestionId=&permission=Add&page=/assessments/test/manage-question`)}
          />
          <ActionCard
            icon={<UploadCloud className="h-7 w-7" />}
            title={importing ? 'Uploading...' : 'Upload Excel'}
            onClick={onUploadExcelClick}
          />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xls,.xlsx"
        className="hidden"
        onChange={onUploadExcelChange}
      />

      <div className="flex justify-end">
        <Button variant="outline" className="border-cyan-100 bg-cyan-50 text-teal-600 hover:bg-cyan-100 hover:text-teal-700" onClick={() => router.push('/assessments/test')}>
          Back
        </Button>
      </div>
    </PageContainer>
  )
}

