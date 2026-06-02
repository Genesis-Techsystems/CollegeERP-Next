'use client'

import { useEffect, useState } from 'react'
import type { SelectOption } from '@/common/components/select'
import { listAcademicYearsForCollege, listActiveCollegesForCollegeCertificates } from '@/services'
import { toastError } from '@/lib/toast'

export function useTcCollegeCascade(collegeId?: number) {
  const [colleges, setColleges] = useState<SelectOption[]>([])
  const [academicYears, setAcademicYears] = useState<SelectOption[]>([])
  const [loadingColleges, setLoadingColleges] = useState(false)
  const [loadingYears, setLoadingYears] = useState(false)

  useEffect(() => {
    setLoadingColleges(true)
    void listActiveCollegesForCollegeCertificates()
      .then((rows) => {
        setColleges(
          rows.map((c) => ({
            value: String(c.collegeId),
            label: c.collegeCode ?? c.collegeName ?? String(c.collegeId),
          })),
        )
      })
      .catch((err) => toastError(err, 'Failed to load colleges'))
      .finally(() => setLoadingColleges(false))
  }, [])

  useEffect(() => {
    if (!collegeId) {
      setAcademicYears([])
      return
    }
    setLoadingYears(true)
    void listAcademicYearsForCollege(collegeId)
      .then((rows) => {
        setAcademicYears(
          rows.map((y) => ({
            value: String(y.academicYearId ?? y.id),
            label: String(y.academicYearName ?? y.academicYearCode ?? y.academicYearId),
          })),
        )
      })
      .catch((err) => toastError(err, 'Failed to load academic years'))
      .finally(() => setLoadingYears(false))
  }, [collegeId])

  return { colleges, academicYears, loadingColleges, loadingYears }
}
