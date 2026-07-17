'use client'

/**
 * Angular parity: print-regular-exam-fee-receipt — EXAM FEE-RECEIPT print view.
 * Screen + print show Student Copy and Department Copy (dashed cut), like Angular.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { MINIO_URL } from '@/config/constants/api'
import {
  clearExamFeePrintPayload,
  examFeeCollectionReturnHref,
  loadExamFeePrintPayload,
  type ExamFeePrintPayload,
} from '../_print/store'
import { currencySymbol, fmtDate, numToWords } from '../_print/money'
import { printExamFeeReceipt } from '../_print/receipt-print'

function ReceiptCopy({
  data,
  copyLabel,
}: {
  data: ExamFeePrintPayload
  copyLabel: 'Student Copy' | 'Department Copy'
}) {
  const logoSrc = data.orgLogo
    ? `${MINIO_URL}${data.orgLogo}`
    : '/images/avatars/default_logo.png'

  const paymentType = `${data.paymentModeCatCode ?? data.paymentModeCatDisplayName ?? ''}${
    data.paymentMode
      ? ` (${data.paymentMode}${data.cardName ? ` -${data.cardName}` : ''})`
      : ''
  }`

  return (
    <div className="border border-black bg-white p-3 text-black">
      <div className="mb-1 flex items-start gap-3 border-b-2 border-black pb-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt="logo"
          className="h-16 w-16 object-contain"
          onError={(e) => {
            ;(e.target as HTMLImageElement).src =
              '/images/avatars/default_logo.png'
          }}
        />
        <div className="flex-1 text-center">
          <h2 className="text-[18px] font-bold uppercase">
            {data.collegeName ?? ''}
          </h2>
          <h4 className="text-[12px] font-normal">{data.address ?? ''}</h4>
        </div>
      </div>

      <div className="mb-2 flex items-center">
        <h3 className="flex-1 text-center text-[16px] font-bold underline">
          EXAM FEE-RECEIPT
        </h3>
        <div className="w-[38%] pr-1 text-right text-[13px]">{copyLabel}</div>
      </div>
      <hr className="mb-3 border-black" />

      <div className="mb-3 grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-2">
        <table className="w-full">
          <tbody>
            <tr>
              <th className="py-0.5 pr-2 text-left font-semibold">Receipt No</th>
              <td className="py-0.5">: {data.feeReceiptNo ?? ''}</td>
            </tr>
            <tr>
              <th className="py-0.5 pr-2 text-left font-semibold">
                Student Name
              </th>
              <td className="py-0.5">: {data.stdName ?? ''}</td>
            </tr>
            <tr>
              <th className="py-0.5 pr-2 text-left font-semibold">
                HallTicket No
              </th>
              <td className="py-0.5">: {data.stdRollNumber ?? ''}</td>
            </tr>
            <tr>
              <th className="py-0.5 pr-2 text-left font-semibold">Branch</th>
              <td className="py-0.5">
                : {data.courseCode ?? ''} ({data.groupCode ?? ''}
                {data.section ? `-${data.section}` : ''})
              </td>
            </tr>
          </tbody>
        </table>
        <table className="w-full">
          <tbody>
            <tr>
              <th className="py-0.5 pr-2 text-left font-semibold">Date</th>
              <td className="py-0.5">: {fmtDate(data.receiptDate, true)}</td>
            </tr>
            <tr>
              <th className="py-0.5 pr-2 text-left font-semibold">Father Name</th>
              <td className="py-0.5">: {data.stdFatherName ?? ''}</td>
            </tr>
            <tr>
              <th className="py-0.5 pr-2 text-left font-semibold">Year</th>
              <td className="py-0.5">: {data.courseYearName ?? ''}</td>
            </tr>
            <tr>
              <th className="py-0.5 pr-2 text-left font-semibold">
                Payment Type
              </th>
              <td className="py-0.5">: {paymentType}</td>
            </tr>
            <tr>
              <th className="py-0.5 pr-2 text-left font-semibold">
                Merchant Ref.No
              </th>
              <td className="py-0.5">: {data.transactionNo ?? ''}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <table className="mx-auto mb-3 w-full max-w-md border-collapse text-[13px]">
        <thead>
          <tr>
            <th className="border border-black px-2 py-1 text-center">
              Details
            </th>
            <th className="border border-black px-2 py-1 text-center">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th className="border border-black px-2 py-1 text-left font-semibold">
              Exam Fee
              {data.examtypeCatDisplayName
                ? ` (${data.examtypeCatDisplayName})`
                : ''}
            </th>
            <td className="border border-black px-2 py-1 text-right">
              {data.examFeeAmount ?? ''}
            </td>
          </tr>
          <tr>
            <th className="border border-black px-2 py-1 text-left font-semibold">
              Add. Fee
            </th>
            <td className="border border-black px-2 py-1 text-right">
              {data.examAddtFee ?? ''}
            </td>
          </tr>
          <tr>
            <th className="border border-black px-2 py-1 text-left font-semibold">
              LateFee
            </th>
            <td className="border border-black px-2 py-1 text-right">
              {data.examFineAmount ?? ''}
            </td>
          </tr>
          <tr>
            <th className="border border-t-2 border-black px-2 py-1 text-left font-semibold">
              Amount Paid
            </th>
            <td className="border border-t-2 border-black px-2 py-1 text-right font-semibold">
              {data.examTotalAmount != null
                ? `₹${currencySymbol(data.examTotalAmount)}`
                : ''}
            </td>
          </tr>
          <tr>
            <th className="border border-black px-2 py-1 text-left font-semibold">
              Amount In Words
            </th>
            <td className="border border-black px-2 py-1">
              {data.examTotalAmount != null
                ? `${numToWords(data.examTotalAmount)} Only`
                : ''}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="border border-black p-2 text-[12px]">
        <p className="font-semibold">NOTE:</p>
        <p>1. Please check the receipt before leaving the window</p>
        <p>2. This is system generated receipt</p>
      </div>
    </div>
  )
}

export default function PrintExamFeeReceiptPage() {
  const router = useRouter()
  const [data, setData] = useState<ExamFeePrintPayload | null>(null)

  useEffect(() => {
    const payload = loadExamFeePrintPayload()
    if (!payload) {
      router.replace(examFeeCollectionReturnHref(null))
      return
    }
    setData(payload)
  }, [router])

  function goBack() {
    const href = examFeeCollectionReturnHref(data)
    clearExamFeePrintPayload()
    router.push(href)
  }

  function onPrint() {
    if (!data) return
    printExamFeeReceipt(data)
  }

  if (!data) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading receipt…</div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-4" data-print-root>
      <div className="mb-4 flex items-center gap-2 text-[13px] text-muted-foreground print:hidden">
        <span>Examination</span>
        <span>/</span>
        <span>Student Exam Fee Collection</span>
        <span>/</span>
        <span>Exam Fee Receipt</span>
      </div>

      <div id="printsection" className="space-y-0">
        <ReceiptCopy data={data} copyLabel="Student Copy" />
        <div className="my-3 border-t-2 border-dashed border-black" />
        <ReceiptCopy data={data} copyLabel="Department Copy" />
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
