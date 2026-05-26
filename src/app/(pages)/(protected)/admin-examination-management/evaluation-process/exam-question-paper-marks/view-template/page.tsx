'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useSessionContext } from '@/context/SessionContext'
import { getQuestionPaperTemplateViewRows } from '@/services/evaluation-process'

type AnyRow = Record<string, any>

function htmlToPlaintext(html: unknown): string {
  if (html == null) return ''
  const s = String(html)
  // Strip tags but keep line breaks (mirrors Angular htmlToPlaintext pipe).
  return s
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

export default function ViewTemplatePrintPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useSessionContext()

  const params = useMemo(
    () => ({
      pkEQPTid: Number(searchParams?.get('pkEQPTid') ?? searchParams?.get('examQuestionPaperTemplateId') ?? 0),
      questionPaperId: Number(searchParams?.get('questionPaperId') ?? searchParams?.get('examQuestionPaperId') ?? 0),
      examName: searchParams?.get('examName') ?? '',
      questionPaperTitle:
        searchParams?.get('questionPaperTitle') ?? searchParams?.get('questionpaper_title') ?? '',
      subjectName: searchParams?.get('subjectName') ?? '',
      subjectCode: searchParams?.get('subjectCode') ?? '',
      totalMarks: searchParams?.get('totalmarks') ?? '',
    }),
    [searchParams],
  )

  const [rows, setRows] = useState<AnyRow[]>([])
  const [loading, setLoading] = useState(false)

  const collegeName = String(user?.collegeName ?? user?.collegeCode ?? '')

  useEffect(() => {
    if (!params.pkEQPTid) return
    let cancelled = false
    void (async () => {
      setLoading(true)
      const data = await getQuestionPaperTemplateViewRows(
        params.pkEQPTid,
        params.questionPaperId || undefined,
      ).catch(() => [])
      if (cancelled) return
      setRows(Array.isArray(data) ? data : [])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [params.pkEQPTid, params.questionPaperId])

  function handlePrint() {
    globalThis?.print?.()
  }

  function handleBack() {
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

  return (
    <div className="bg-white text-black">
      {/* Toolbar (hidden in print) */}
      <div className="flex items-center justify-end gap-2 px-6 py-3 print:hidden">
        <Button variant="outline" className="h-8 text-[12px]" onClick={handleBack}>
          Back
        </Button>
        <Button className="h-8 text-[12px]" onClick={handlePrint} disabled={rows.length === 0}>
          Print
        </Button>
      </div>

      {/* Print sheet */}
      <div
        id="printsection"
        className="mx-auto max-w-[800px] px-10 py-6"
        style={{ fontFamily: 'Times New Roman, Times, serif' }}
      >
        <div className="text-center">
          <h2 className="text-[18px] font-bold uppercase">{collegeName}</h2>
          <h3 className="text-[14px] font-semibold uppercase mt-2">{params.examName}</h3>
          <h3 className="text-[14px] font-bold mt-2">
            {params.subjectName}
            {params.subjectCode ? ` - ${params.subjectCode}` : ''}
          </h3>
        </div>

        <div className="flex justify-between mt-2 text-[13px]">
          <span>Time: 3 Hrs</span>
          <span>Max. Marks: {params.totalMarks || '-'}</span>
        </div>
        <hr className="my-3 border-black" />

        {loading ? (
          <p className="py-8 text-center text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No template details found.</p>
        ) : (
          <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              {rows.map((t, i) => {
                const level1 = Number(t.level1no ?? 0)
                const groupNo = Number(t.groupno ?? 0)
                const subGroupNo = Number(t.subgroupno ?? 0)
                const code = t.questioncode != null && String(t.questioncode).trim() !== '' ? String(t.questioncode) : null
                const down = String(t.displaydowntext ?? '').trim()

                const blocks: React.ReactNode[] = []
                if (level1 > 0 && groupNo === 0 && subGroupNo === 0) {
                  blocks.push(
                    <tr key={`vt-${i}-title`}>
                      <td colSpan={4} className="text-center font-bold py-1">
                        {htmlToPlaintext(t.QuestionTitle)}
                      </td>
                    </tr>,
                  )
                }
                if (level1 > 0 && groupNo > 0 && subGroupNo === 0) {
                  blocks.push(
                    <tr key={`vt-${i}-grp`}>
                      <td className="py-1 pr-2 align-top w-6">
                        <b>{groupNo}.</b>
                      </td>
                      <td className="py-1 pr-2 w-2">&nbsp;</td>
                      <td className="py-1 w-full">{htmlToPlaintext(t.QuestionTitle)}</td>
                      <td className="py-1 pl-2 text-right whitespace-nowrap">
                        <b>{t.question_marks}</b>
                      </td>
                    </tr>,
                  )
                }
                if (code != null) {
                  blocks.push(
                    <tr key={`vt-${i}-code`}>
                      <td className="py-1 pr-2">&nbsp;</td>
                      <td className="py-1 pr-2 align-top">{code})</td>
                      <td
                        className="py-1 w-full"
                        dangerouslySetInnerHTML={{ __html: String(t.question ?? '') }}
                      />
                      <td className="py-1 pl-2 text-right whitespace-nowrap">
                        {t.individual_question_marks}
                      </td>
                    </tr>,
                  )
                }
                if (down) {
                  blocks.push(
                    <tr key={`vt-${i}-down`}>
                      <td colSpan={4} className="text-center py-1">
                        <b>{down}</b>
                      </td>
                    </tr>,
                  )
                }
                return blocks
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
