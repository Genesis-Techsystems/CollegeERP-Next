'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { QK } from '@/lib/query-keys'
import { getCommitteeMemberFilters } from '@/services'
import type { CommitteeFilterRow } from '@/types/committees'

function dedupeBy<T>(rows: T[], keyFn: (row: T) => unknown): T[] {
  const seen = new Set<unknown>()
  return rows.filter((row) => {
    const key = keyFn(row)
    if (key == null || key === '' || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function organizationIdFromStorage(): number {
  return Number(globalThis?.localStorage?.getItem('organizationId') ?? 0)
}

export function useCommitteeMemberFilters() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: QK.committeeFilters.members(),
    queryFn: getCommitteeMemberFilters,
  })

  const [committeeId, setCommitteeId] = useState<string | null>(null)
  const [examId, setExamId] = useState<string | null>(null)
  const [subjectCode, setSubjectCode] = useState<string | null>(null)

  const committeeOptions = useMemo(
    () =>
      dedupeBy(rows, (r) => r.pk_univ_committee_id)
        .map((r) => ({
          value: String(r.pk_univ_committee_id ?? ''),
          label: r.committee_name ?? 'Committee',
        }))
        .filter((o) => o.value),
    [rows],
  )

  const examOptions = useMemo(() => {
    if (!committeeId) return []
    return dedupeBy(
      rows.filter(
        (r) => String(r.pk_univ_committee_id) === committeeId && r.fk_university_exam_id != null,
      ),
      (r) => r.fk_university_exam_id,
    )
      .map((r) => ({
        value: String(r.fk_university_exam_id ?? ''),
        label: r.exam_name ?? 'Exam',
      }))
      .filter((o) => o.value)
  }, [rows, committeeId])

  const subjectOptions = useMemo(() => {
    if (!committeeId || !examId) return []
    return dedupeBy(
      rows.filter(
        (r) =>
          String(r.pk_univ_committee_id) === committeeId &&
          String(r.fk_university_exam_id) === examId &&
          r.subject_code,
      ),
      (r) => r.subject_code,
    )
      .map((r) => ({
        value: r.subject_code ?? '',
        label: r.subject_name
          ? `${r.subject_code} (${r.subject_name})`
          : (r.subject_code ?? ''),
      }))
      .filter((o) => o.value)
  }, [rows, committeeId, examId])

  const selectedSubjectRow = useMemo((): CommitteeFilterRow | undefined => {
    return rows.find(
      (r) =>
        String(r.pk_univ_committee_id) === committeeId &&
        String(r.fk_university_exam_id) === examId &&
        r.subject_code === subjectCode,
    )
  }, [rows, committeeId, examId, subjectCode])

  const tableHeading = useMemo(() => {
    if (!committeeId || !examId) return ''
    const committee = rows.find((r) => String(r.pk_univ_committee_id) === committeeId)
    const exam = rows.find(
      (r) =>
        String(r.pk_univ_committee_id) === committeeId &&
        String(r.fk_university_exam_id) === examId,
    )
    const subjectLabel = subjectCode ?? selectedSubjectRow?.subject_code
    return [committee?.committee_name, exam?.exam_name, subjectLabel].filter(Boolean).join(' / ')
  }, [rows, committeeId, examId, subjectCode, selectedSubjectRow])

  function handleCommitteeChange(value: string | null) {
    setCommitteeId(value)
    setExamId(null)
    setSubjectCode(null)
  }

  function handleExamChange(value: string | null) {
    setExamId(value)
    setSubjectCode(null)
  }

  const filtersReady = Boolean(committeeId && examId && subjectCode)
  const cascadeReady = Boolean(committeeId && examId)

  return {
    rows,
    isLoading,
    committeeId,
    examId,
    subjectCode,
    committeeOptions,
    examOptions,
    subjectOptions,
    setCommitteeId: handleCommitteeChange,
    setExamId: handleExamChange,
    setSubjectCode,
    filtersReady,
    cascadeReady,
    academicYear: selectedSubjectRow?.academic_year ?? '',
    tableHeading,
    orgId: organizationIdFromStorage(),
  }
}
