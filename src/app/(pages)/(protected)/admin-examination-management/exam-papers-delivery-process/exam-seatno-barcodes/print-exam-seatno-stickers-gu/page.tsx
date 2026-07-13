'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ExamBundlePrintStickersView } from '../../exam-bundle-print/ExamBundlePrintStickersView'

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function txt(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return ''
}

function toStickerRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((r) => ({
    ...r,
    ec_seatno: r.ec_seat_no ?? r.ec_seatno,
    fk_univ_exam_bundle_id: num(r.pk_subject_id ?? r.fk_subject_id ?? r.fk_univ_exam_bundle_id),
    bundle_number: txt(r.bundle_number) || txt(r.subject_code),
  }))
}

export default function PrintExamSeatnoStickersGuPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [rows, setRows] = useState<Record<string, unknown>[]>([])

  useEffect(() => {
    const raw = searchParams?.get('data')
    if (!raw) {
      setRows([])
      return
    }
    try {
      const parsed = JSON.parse(raw)
      setRows(Array.isArray(parsed) ? toStickerRows(parsed as Record<string, unknown>[]) : [])
    } catch {
      setRows([])
    }
  }, [searchParams])

  const examGroupCode = useMemo(() => txt(rows[0]?.exam_group_code), [rows])

  function onBack() {
    const raw = searchParams?.get('data')
    const href = '/admin-examination-management/exam-papers-delivery-process/exam-seatno-barcodes'
    router.push(raw ? `${href}?data=${encodeURIComponent(raw)}` : href)
  }

  return (
    <ExamBundlePrintStickersView
      stickerRows={rows}
      examGroupCode={examGroupCode}
      variant="stickers-gu"
      onBack={onBack}
    />
  )
}
