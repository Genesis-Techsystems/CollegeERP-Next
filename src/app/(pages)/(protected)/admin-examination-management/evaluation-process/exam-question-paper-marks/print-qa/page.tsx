'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useSessionContext } from '@/context/SessionContext'
import { getQuestionPaperTemplateViewRows } from '@/services/evaluation-process'

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

export default function PrintQaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useSessionContext()

  const params = useMemo(
    () => ({
      pkEQPTid: Number(
        searchParams?.get('pkEQPTid') ?? searchParams?.get('examQuestionPaperTemplateId') ?? 0,
      ),
      questionPaperId: Number(
        searchParams?.get('questionPaperId') ?? searchParams?.get('examQuestionPaperId') ?? 0,
      ),
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
  const [loading, setLoading] = useState(true)

  const collegeName = String(user?.collegeName ?? user?.collegeCode ?? '')

  useEffect(() => {
    if (!params.pkEQPTid) return
    let cancelled = false
    void (async () => {
      setLoading(true)
      // Same proc as Print QP (s_get_examquestionpaper_details) — the model
      // answer (modelanswer1) is what differentiates the QA print.
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
          {collegeName ? (
            <h2 className="text-[18px] font-bold uppercase">{collegeName}</h2>
          ) : null}
          <h2 className="text-[15px] font-bold uppercase mt-2">{params.examName}</h2>
          <h1 className="text-[15px] font-bold mt-2">
            {params.subjectName}
            {params.subjectCode ? ` - ${params.subjectCode}` : ''}
          </h1>
        </div>

        <div className="flex justify-between mt-2 text-[13px]">
          <span>Time: 3 Hrs</span>
          <span>Max. Marks: {params.totalMarks || '-'}</span>
        </div>
        <hr className="my-3 border-black" />

        {/* Note block (Angular print-qa) */}
        <div className="text-[13px] mb-3">
          <b>Note :</b>
          <ol className="list-decimal pl-6">
            <li>All questions are compulsory.</li>
            <li>All questions carry equal marks.</li>
            <li>Due credit will be given to neatness and adequate dimensions.</li>
            <li>Assume suitable data wherever necessary.</li>
          </ol>
        </div>

        {loading ? (
          <div className="py-8 space-y-3" aria-live="polite">
            <div className="mx-auto h-4 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="mx-auto h-4 w-1/2 animate-pulse rounded bg-slate-200" />
            <div className="mx-auto h-4 w-3/4 animate-pulse rounded bg-slate-200" />
            <p className="pt-2 text-center text-[12px] text-muted-foreground">
              Loading question &amp; answer paper…
            </p>
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No template details found.</p>
        ) : (
          <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              {rows.map((t, i) => {
                const level1 = Number(t.level1no ?? 0)
                const groupNo = Number(t.groupno ?? 0)
                const subGroupNo = Number(t.subgroupno ?? 0)
                const code =
                  t.questioncode != null && String(t.questioncode).trim() !== ''
                    ? String(t.questioncode)
                    : null
                const down = String(t.displaydowntext ?? '').trim()
                const modelAnswer = htmlToPlaintext(t.modelanswer1 ?? t.modelAnswer1)

                const blocks: React.ReactNode[] = []
                if (level1 > 0 && groupNo === 0 && subGroupNo === 0) {
                  blocks.push(
                    <tr key={`qa-${i}-title`}>
                      <td colSpan={4} className="text-center font-bold py-1">
                        {htmlToPlaintext(t.QuestionTitle)}
                      </td>
                    </tr>,
                  )
                }
                if (level1 > 0 && groupNo > 0 && subGroupNo === 0) {
                  blocks.push(
                    <tr key={`qa-${i}-grp`}>
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
                    <tr key={`qa-${i}-code`}>
                      <td className="py-1 pr-2">&nbsp;</td>
                      <td className="py-1 pr-2 align-top">{code})</td>
                      <td className="py-1 w-full align-top">
                        <p className="m-0">{htmlToPlaintext(t.question)}</p>
                        {modelAnswer ? (
                          <p className="m-0 mt-1">
                            <b>A)</b> {modelAnswer}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-1 pl-2 text-right align-top whitespace-nowrap">
                        {t.individual_question_marks}
                      </td>
                    </tr>,
                  )
                }
                if (down) {
                  blocks.push(
                    <tr key={`qa-${i}-down`}>
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
