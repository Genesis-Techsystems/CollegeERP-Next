'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Filter, Table } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { getDigitalOnlineSyncFilters, listStudentsForParentAccountManage } from '@/services'

type AnyRow = Record<string, unknown>

const n = (v: unknown) => Number(v) || 0
const s = (v: unknown) => {
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return ''
}

const uniq = (rows: AnyRow[], key: string) => {
  const seen = new Set<number>()
  return rows.filter((r) => {
    const id = n(r[key])
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

export default function ParentAccountsManagePage() {
  const [filtersData, setFiltersData] = useState<AnyRow[]>([])
  const [academicData, setAcademicData] = useState<AnyRow[]>([])
  const [filterOpen, setFilterOpen] = useState(true)

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)

  useEffect(() => {
    const orgId = Number(localStorage.getItem('organizationId') ?? 0)
    const empId = Number(localStorage.getItem('employeeId') ?? 0)
    getDigitalOnlineSyncFilters(orgId, empId)
      .then((d) => {
        setFiltersData(d.filtersData as AnyRow[])
        setAcademicData(d.academicYearData as AnyRow[])
      })
      .catch(() => {
        setFiltersData([])
        setAcademicData([])
      })
  }, [])

  const colleges = useMemo(
    () => uniq(filtersData, 'fk_college_id').sort((a, b) => n(a.clg_sort_order) - n(b.clg_sort_order)),
    [filtersData],
  )

  const academicYears = useMemo(() => {
    const univId = n(filtersData.find((x) => n(x.fk_college_id) === (collegeId ?? 0))?.fk_university_id)
    return uniq(academicData.filter((r) => n(r.fk_university_id) === univId), 'fk_academic_year_id')
      .sort((a, b) => s(b.academic_year).localeCompare(s(a.academic_year)))
  }, [academicData, filtersData, collegeId])

  useEffect(() => {
    if (!collegeId && colleges.length) setCollegeId(n(colleges[0].fk_college_id))
  }, [colleges, collegeId])

  useEffect(() => {
    setAcademicYearId(null)
    setStudentId(null)
  }, [collegeId])

  useEffect(() => {
    setStudentId(null)
  }, [academicYearId])

  const { data: studentRows = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['ParentAccountManage', 'students', collegeId, academicYearId],
    queryFn: () => listStudentsForParentAccountManage({
      collegeId: collegeId ?? 0,
      academicYearId: academicYearId ?? 0,
    }),
    enabled: !!collegeId && !!academicYearId,
  })

  const studentOptions = useMemo(() => {
    const seen = new Set<number>()
    const out: { value: string; label: string }[] = []
    for (const row of studentRows) {
      const r = row as AnyRow
      const sid = n(r.studentId ?? r.fk_student_id ?? r.student_id)
      if (!sid || seen.has(sid)) continue
      seen.add(sid)
      const ht = s(r.hallticketNumber ?? r.rollNumber ?? r.admissionNumber)
      const name = s(r.studentName ?? r.firstName ?? r.fullName)
      const label = ht && name ? `${ht} — ${name}` : (name || ht || `Student ${sid}`)
      out.push({ value: String(sid), label })
    }
    return out.sort((a, b) => a.label.localeCompare(b.label))
  }, [studentRows])

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden p-0">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-3">
          <h2 className="app-card-title inline-flex items-center gap-2">
            <Table className="h-4 w-4" />
            Parent Account
          </h2>
          <button
            type="button"
            className="text-sm text-foreground inline-flex items-center gap-1.5 shrink-0"
            onClick={() => setFilterOpen((v) => !v)}
          >
            Filter
            <Filter className="h-4 w-4" />
          </button>
        </div>

        {filterOpen ? (
          <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <Select
              label="College"
              value={collegeId ? String(collegeId) : null}
              onChange={(v) => setCollegeId(v ? Number(v) : null)}
              options={colleges.map((x) => ({ value: String(n(x.fk_college_id)), label: s(x.college_code) }))}
              searchable
              clearable
            />
            <Select
              label="Academic Year"
              required
              value={academicYearId ? String(academicYearId) : null}
              onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
              options={academicYears.map((x) => ({ value: String(n(x.fk_academic_year_id)), label: s(x.academic_year) }))}
              searchable
              clearable
              disabled={!collegeId}
            />
            <Select
              label="Student"
              value={studentId}
              onChange={setStudentId}
              options={studentOptions}
              searchable
              clearable
              disabled={!collegeId || !academicYearId}
              isLoading={studentsLoading}
              placeholder={!collegeId || !academicYearId ? 'Select college and year first' : 'Select student'}
            />
          </div>
        ) : null}

        <div className="p-3 flex justify-end border-t border-slate-100">
          <Button
            type="button"
            className="min-w-[120px] bg-amber-400 text-slate-900 hover:bg-amber-500 border-0 shadow-sm"
            asChild
          >
            <Link href="/user-management/parent-accounts">Back</Link>
          </Button>
        </div>
      </div>
    </PageContainer>
  )
}
