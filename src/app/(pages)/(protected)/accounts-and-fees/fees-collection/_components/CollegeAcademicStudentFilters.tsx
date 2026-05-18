'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FilterCard, FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { useQuery } from '@tanstack/react-query'
import { toastError } from '@/lib/toast'
import {
  listAcademicYearsByUniversity,
  listCollegesActive,
  searchStudentsInCollege,
} from '@/services'
import type { StudentFeeSearchRow } from '@/types/fees-collection'

export type CollegeAcademicStudentFiltersProps = {
  readonly title: string
  readonly collegeId: string | null
  readonly academicYearId: string | null
  readonly studentId: string | null
  readonly onCollegeChange: (id: string | null) => void
  readonly onAcademicYearChange: (id: string | null) => void
  readonly onStudentChange: (id: string | null, student: StudentFeeSearchRow | null) => void
  readonly initialRollNumber?: string | null
}

function studentOptionLabel(s: StudentFeeSearchRow): string {
  const name = s.firstName ?? 'Student'
  const id = s.hallticketNumber ?? s.rollNumber ?? s.studentId
  return id ? `${name} (${id})` : name
}

export function CollegeAcademicStudentFilters({
  title,
  collegeId,
  academicYearId,
  studentId,
  onCollegeChange,
  onAcademicYearChange,
  onStudentChange,
  initialRollNumber,
}: CollegeAcademicStudentFiltersProps) {
  const [universityId, setUniversityId] = useState(0)
  const [studentSearchLoading, setStudentSearchLoading] = useState(false)
  const [studentRows, setStudentRows] = useState<StudentFeeSearchRow[]>([])
  const [selectedStudent, setSelectedStudent] = useState<StudentFeeSearchRow | null>(null)
  const appliedRollKey = useRef<string | null>(null)

  const { data: colleges = [] } = useQuery({
    queryKey: ['feesCollection', 'colleges'],
    queryFn: listCollegesActive,
  })

  const { data: academicYears = [] } = useQuery({
    queryKey: ['feesCollection', 'academicYears', universityId],
    queryFn: () => listAcademicYearsByUniversity(universityId),
    enabled: universityId > 0,
  })

  const collegeNum = Number(collegeId ?? 0)

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId ?? ''),
        label: String(c.collegeCode ?? c.collegeId ?? ''),
      })),
    [colleges],
  )

  const academicYearOptions = useMemo(
    () =>
      academicYears.map((ay) => ({
        value: String(ay.academicYearId ?? ''),
        label: String(ay.academicYear ?? ay.academicYearId ?? ''),
      })),
    [academicYears],
  )

  const studentOptions = useMemo(() => {
    const base = studentRows.map((s) => ({
      value: String(s.studentId),
      label: studentOptionLabel(s),
    }))
    const sid = studentId
    if (sid && selectedStudent && !base.some((o) => o.value === sid)) {
      return [{ value: sid, label: studentOptionLabel(selectedStudent) }, ...base]
    }
    return base
  }, [studentRows, studentId, selectedStudent])

  const onStudentSearch = useCallback(
    async (term: string) => {
      const q = term.trim()
      if (q.length < 5 || collegeNum <= 0) {
        setStudentRows([])
        return
      }
      setStudentSearchLoading(true)
      try {
        const rows = await searchStudentsInCollege(collegeNum, q)
        setStudentRows(Array.isArray(rows) ? rows : [])
      } catch (e) {
        toastError(e, 'Student search failed')
        setStudentRows([])
      } finally {
        setStudentSearchLoading(false)
      }
    },
    [collegeNum],
  )

  useEffect(() => {
    if (!collegeId) {
      setUniversityId(0)
      return
    }
    const college = colleges.find((c) => String(c.collegeId) === collegeId)
    setUniversityId(Number(college?.universityId ?? 0))
  }, [collegeId, colleges])

  useEffect(() => {
    const roll = initialRollNumber?.trim() ?? ''
    if (roll.length < 5 || collegeNum <= 0) return

    const key = `${collegeNum}:${roll}`
    if (appliedRollKey.current === key) return
    appliedRollKey.current = key

    void (async () => {
      setStudentSearchLoading(true)
      try {
        const rows = await searchStudentsInCollege(collegeNum, roll)
        setStudentRows(Array.isArray(rows) ? rows : [])
        const pick = rows[0] ?? null
        if (pick) {
          setSelectedStudent(pick)
          onStudentChange(String(pick.studentId), pick)
        }
      } catch (e) {
        toastError(e, 'Student search failed')
      } finally {
        setStudentSearchLoading(false)
      }
    })()
  }, [initialRollNumber, collegeNum, onStudentChange])

  function handleStudentChange(v: string | null) {
    if (!v) {
      setSelectedStudent(null)
      onStudentChange(null, null)
      return
    }
    const row =
      studentRows.find((s) => String(s.studentId) === v) ??
      (selectedStudent && String(selectedStudent.studentId) === v ? selectedStudent : null)
    setSelectedStudent(row)
    onStudentChange(v, row)
  }

  return (
    <FilterCard title={title}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Select
          label="College"
          className={FILTER_CARD_SELECT_CLASS}
          value={collegeId}
          onChange={(v) => {
            onCollegeChange(v)
            onAcademicYearChange(null)
            onStudentChange(null, null)
            setSelectedStudent(null)
            setStudentRows([])
          }}
          options={collegeOptions}
          placeholder="Select college"
          searchable
        />
        <Select
          label="Academic Year"
          className={FILTER_CARD_SELECT_CLASS}
          value={academicYearId}
          onChange={(v) => {
            onAcademicYearChange(v)
            onStudentChange(null, null)
            setSelectedStudent(null)
            setStudentRows([])
          }}
          options={academicYearOptions}
          placeholder="Select academic year"
          disabled={!collegeId}
          searchable
        />
        <Select
          label="Student"
          className={FILTER_CARD_SELECT_CLASS}
          value={studentId}
          onChange={handleStudentChange}
          options={studentOptions}
          placeholder="Search by student name or roll no."
          searchable
          onSearch={(t) => void onStudentSearch(t)}
          isLoading={studentSearchLoading}
          disabled={!collegeId}
          clearable
        />
      </div>
    </FilterCard>
  )
}
