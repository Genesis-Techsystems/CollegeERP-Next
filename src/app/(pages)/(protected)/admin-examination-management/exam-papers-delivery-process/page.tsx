'use client'

import Link from 'next/link'

const base = '/admin-examination-management/exam-papers-delivery-process'

/** Mirrors Angular `exam-papers-delivery-process` child routes — implement pages incrementally. */
const PAGES: { slug: string; label: string }[] = [
  { slug: 'exam-group', label: 'Exam group' },
  { slug: 'univ-exam-regional-centers', label: 'University exam regional centers' },
  { slug: 'univ-exam-centers', label: 'University exam centers' },
  { slug: 'univ-examcenter-colleges', label: 'Exam center colleges' },
  { slug: 'univ-exam-center-rooms', label: 'University exam center rooms' },
  { slug: 'univ-examcenter-students', label: 'Exam center students' },
  { slug: 'university-exam-center-profiles', label: 'University exam center profiles' },
  { slug: 'univ-exam-bundles', label: 'Exam bundles' },
  { slug: 'univ-exam-bags', label: 'Exam bags' },
  { slug: 'univ-exam-answer-paper-bags', label: 'Answer paper bags' },
  { slug: 'univ-exam-bag-transportation', label: 'Bag transportation' },
  { slug: 'univ-exam-bag-collection', label: 'Bag collection' },
  { slug: 'exam-scan-profile', label: 'Exam scan profile' },
  { slug: 'scan-bundles', label: 'Exam scan bundles' },
  { slug: 'scan-bundle-details', label: 'Scan bundle details' },
  { slug: 'univ-examcenter-question-paper-config', label: 'Question paper config (center)' },
  { slug: 'exam-center-courses', label: 'Exam center courses' },
  { slug: 'exam-center-subjects', label: 'Exam center subjects' },
  { slug: 'exam-center-barcodes', label: 'Exam center barcodes' },
  { slug: 'exam-seatno-barcodes', label: 'Exam seatno barcodes' },
  { slug: 'buildings', label: 'Exam center buildings' },
  { slug: 'blocks', label: 'Exam center blocks' },
  { slug: 'floors', label: 'Exam center floors' },
  { slug: 'rooms-type', label: 'Exam center room types' },
  { slug: 'rooms', label: 'Exam center rooms' },
  { slug: 'exam-center-seating-plan', label: 'Exam center seating plan' },
  {
    slug: 'exam-center-seating-plan/add-exam-center-allotment',
    label: 'Seating — add / edit allotment',
  },
  {
    slug: 'exam-center-seating-plan/add-exam-center-allotment/print-seating-stickers',
    label: 'Seating — print seating stickers',
  },
  {
    slug: 'exam-center-seating-plan/add-exam-center-allotment/print-group-seating-stickers',
    label: 'Seating — print group stickers',
  },
  { slug: 'exam-center-seating-plan/center-room-allotment', label: 'Seating — center room allotment' },
  { slug: 'exam-center-seating-plan/copy-existing-seating', label: 'Seating — copy existing seating' },
]

export default function ExamPapersDeliveryProcessIndexPage() {
  return (
    <div className="p-6">
      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40">
          <h2 className="app-card-title">
            Exam papers delivery process
          </h2>
        </div>
        <div className="p-4 text-[13px] space-y-3">
          <p>
            This module covers regional centers, exam centers, bags/bundles, transportation, and seating.
            Subpages below match the Angular routes; open any link to implement or verify that screen.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {PAGES.map(({ slug, label }) => (
              <Link
                key={slug}
                href={`${base}/${slug}`}
                className="text-blue-700 hover:underline block truncate"
                title={slug}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
