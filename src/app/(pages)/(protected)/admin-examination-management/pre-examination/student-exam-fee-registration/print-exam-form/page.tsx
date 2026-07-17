'use client'

/**
 * Angular parity: exam-form.component — EXAM FORM print view.
 * On-screen preview matches Angular; Print uses iframe (avoids AppShell blank PDF).
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  clearExamFeePrintPayload,
  examFeeCollectionReturnHref,
  loadExamFeePrintPayload,
  type ExamFeePrintPayload,
} from '../_print/store'
import { fmtDate, semesterLabel } from '../_print/money'
import { printExamFeeExamForm } from '../_print/exam-form-print'

type AnyRow = Record<string, any>

export default function PrintExamFormPage() {
  const router = useRouter()
  const [data, setData] = useState<ExamFeePrintPayload | null>(null)
  const [printedDate] = useState(() => new Date())
  const orgCode =
    typeof window !== 'undefined' ? (localStorage.getItem('orgCode') ?? '') : ''

  useEffect(() => {
    const payload = loadExamFeePrintPayload()
    if (!payload) {
      router.replace(examFeeCollectionReturnHref(null))
      return
    }
    setData(payload)
  }, [router])

  const subjects: AnyRow[] = useMemo(() => {
    if (!data) return []
    const fromDto = data.examStudentDTOs?.[0]?.examStudentDetailDTOs
    if (Array.isArray(fromDto) && fromDto.length > 0) return fromDto
    const fromReg = data.examStdRegSubDTOs
    if (Array.isArray(fromReg) && fromReg.length > 0) return fromReg
    return []
  }, [data])

  function goBack() {
    const href = examFeeCollectionReturnHref(data)
    clearExamFeePrintPayload()
    router.push(href)
  }

  function onPrint() {
    if (!data) return
    printExamFeeExamForm(data, { orgCode })
  }

  if (!data) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading exam form…</div>
    )
  }

  const semester =
    semesterLabel(data.courseYearCode ?? data.course_year_code) ||
    data.courseYearName ||
    ''

  return (
    <div className="mx-auto max-w-4xl p-4" data-print-root>
      <div className="mb-4 flex items-center gap-2 text-[13px] text-muted-foreground print:hidden">
        <span>Examination</span>
        <span>/</span>
        <span>Student Exam Fee Collection</span>
        <span>/</span>
        <span>Exam Form</span>
      </div>

      {/* Screen preview — mirrors Angular #printNone / #printsection content */}
      <div id="printsection" className="border border-black bg-white p-3 text-black">
        {orgCode === 'SUK' && (
          <div className="mb-2 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/avatars/SUK_BANNER_NEW.jpg"
              alt="SUK"
              className="mx-auto max-h-24"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
            <p className="text-[11px] font-bold">
              KALABURAGI-585103, KARNATAKA, INDIA
            </p>
          </div>
        )}
        <hr className="my-3 border-black" />
        <h2 className="mb-3 text-center text-[20px] font-bold tracking-wide">
          EXAM FORM
        </h2>

        <table className="mb-3 w-full border-collapse text-[15px] font-semibold">
          <tbody>
            <tr>
              <td className="px-2 py-1 text-center">
                Application Id : {data.otherPaymentNumber ?? ''}
              </td>
              <td className="px-2 py-1 text-center">{data.examName ?? ''}</td>
            </tr>
          </tbody>
        </table>

        <table className="mb-3 w-full border-collapse text-[14px]">
          <tbody>
            <tr>
              <th className="border border-black px-2 py-1 text-left" colSpan={2}>
                USN : <span className="font-normal">{data.stdRollNumber ?? ''}</span>
              </th>
              <th className="border border-black px-2 py-1 text-left" colSpan={2}>
                Student Name : <span className="font-normal">{data.stdName ?? ''}</span>
              </th>
            </tr>
            <tr>
              <th className="border border-black px-2 py-1 text-left" colSpan={2}>
                Father Name :{' '}
                <span className="font-normal">{data.stdFatherName ?? ''}</span>
              </th>
              <th className="border border-black px-2 py-1 text-left" colSpan={2}>
                Student Type :{' '}
                <span className="font-normal">{data.studentType ?? ''}</span>
              </th>
            </tr>
            <tr>
              <th className="border border-black px-2 py-1 text-left" colSpan={4}>
                Faculty : <span className="font-normal">{data.collegeName ?? ''}</span>
              </th>
            </tr>
            <tr>
              <th className="border border-black px-2 py-1 text-left" colSpan={2}>
                Programme :{' '}
                <span className="font-normal">
                  {data.courseCode ?? ''} - {data.groupCode ?? ''}
                </span>
              </th>
              <td className="border border-black px-2 py-1" colSpan={2}>
                <span className="font-semibold">Semester : </span>
                {semester}
              </td>
            </tr>
          </tbody>
        </table>

        <table className="mb-4 w-full border-collapse text-[12px]">
          <thead>
            <tr>
              <th className="border border-black px-2 py-1 text-center">
                Course Code
              </th>
              <th className="border border-black px-2 py-1 text-center">
                Course Title
              </th>
            </tr>
          </thead>
          <tbody>
            {subjects.length === 0 ? (
              <tr>
                <td
                  className="border border-black px-2 py-2 text-center text-muted-foreground"
                  colSpan={2}
                >
                  No subjects
                </td>
              </tr>
            ) : (
              subjects.map((s, i) => (
                <tr key={`sub-${i}`}>
                  <td className="border border-black px-2 py-1 text-left">
                    {s.subjectCode ?? s.Subject_code ?? ''}
                  </td>
                  <td className="border border-black px-2 py-1 text-left">
                    {s.subjectName ?? s.Subject_name ?? s.shortName ?? ''}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <p className="mb-2 text-[13px] font-bold">FEE Details</p>
        {/* Angular leaves Receipt No blank on the exam form */}
        <div className="mb-3 grid grid-cols-2 gap-2 border-y-2 border-black py-2 text-[13px] sm:grid-cols-4">
          <div className="text-center">Receipt No :</div>
          <div className="text-center">Date : {fmtDate(data.receiptDate)}</div>
          <div className="text-center">
            UTR No : {data.transactionNo ?? ''}
          </div>
          <div className="text-center">
            Total : {data.examTotalAmount ?? ''}
          </div>
        </div>

        <p className="mb-6 text-right text-[12px]">
          Printed Date : {fmtDate(printedDate)}
        </p>

        <table className="mt-10 w-full border-collapse text-[13px] font-semibold">
          <tbody>
            <tr>
              <td className="px-2 py-6 text-center">
                Student Name &amp; Signature :
              </td>
              <td className="px-2 py-6 text-center">Chairperson Signature :</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end gap-2 print:hidden">
        <Button type="button" variant="outline" onClick={goBack}>
          Back
        </Button>
        <Button type="button" onClick={onPrint}>
          Print
        </Button>
      </div>
    </div>
  )
}
