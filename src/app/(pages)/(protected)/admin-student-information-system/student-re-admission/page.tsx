'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, Filter, User } from 'lucide-react'
import defaultStudent from '@/assets/images/avatars/default_Student.png'
import { PageContainer, PageHeader } from '@/components/layout'
import { Select } from '@/common/components/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toastError } from '@/lib/toast'
import { listActiveOrganizations, listCollegesByOrganization, listDetainedStudentsForReadmission } from '@/services'

type AnyRow = Record<string, any>

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0
  for (const key of keys) {
    const value = Number(row[key] ?? 0)
    if (Number.isFinite(value) && value > 0) return value
  }
  return 0
}

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return ''
  for (const key of keys) {
    const value = row[key]
    if (value != null && String(value).trim() !== '') return String(value)
  }
  return ''
}

function studentId(row: AnyRow, fallback: number): number {
  return pickNum(row, ['studentId', 'fk_student_id', 'student_id', 'id']) || fallback
}

function mapOrganizationOptions(rows: AnyRow[]) {
  return rows.map((row) => ({
    value: String(pickNum(row, ['organizationId', 'fk_organization_id'])),
    label: pickText(row, ['orgCode', 'organizationCode', 'organizationName']) || 'Organization',
  }))
}

function mapCollegeOptions(rows: AnyRow[]) {
  return rows.map((row) => ({
    value: String(pickNum(row, ['collegeId', 'fk_college_id'])),
    label: pickText(row, ['collegeCode', 'college_code', 'collegeName']) || 'College',
  }))
}

export default function StudentReadmissionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [filterOpen, setFilterOpen] = useState(true)
  const [organizations, setOrganizations] = useState<AnyRow[]>([])
  const [colleges, setColleges] = useState<AnyRow[]>([])
  const [students, setStudents] = useState<AnyRow[]>([])
  const [search, setSearch] = useState('')
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<number | null>(null)
  const [selectedCollegeId, setSelectedCollegeId] = useState<number | null>(null)
  const [loadingOrgs, setLoadingOrgs] = useState(false)
  const [loadingColleges, setLoadingColleges] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter((row) =>
      [
        pickText(row, ['firstName', 'studentName']),
        pickText(row, ['hallticketNumber', 'admissionNumber', 'rollNumber']),
        pickText(row, ['collegeCode', 'courseCode', 'groupCode', 'courseYearName', 'section']),
        pickText(row, ['mobile', 'mobileNumber']),
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [search, students])

  useEffect(() => {
    async function loadOrganizations() {
      setLoadingOrgs(true)
      try {
        const rows = await listActiveOrganizations()
        setOrganizations(Array.isArray(rows) ? rows : [])
      } catch (error) {
        setOrganizations([])
        toastError(error, 'Failed to load organizations')
      } finally {
        setLoadingOrgs(false)
      }
    }
    void loadOrganizations()
  }, [])

  useEffect(() => {
    if (organizations.length === 0) return
    const qOrgId = Number(searchParams.get('organizationId') ?? 0)
    const validOrgId =
      qOrgId > 0 && organizations.some((row) => pickNum(row, ['organizationId']) === qOrgId)
        ? qOrgId
        : pickNum(organizations[0], ['organizationId'])
    if (validOrgId > 0 && selectedOrganizationId !== validOrgId) {
      setSelectedOrganizationId(validOrgId)
    }
  }, [organizations, searchParams, selectedOrganizationId])

  useEffect(() => {
    async function loadColleges() {
      if (!selectedOrganizationId) {
        setColleges([])
        setSelectedCollegeId(null)
        return
      }
      setLoadingColleges(true)
      try {
        const rows = await listCollegesByOrganization(selectedOrganizationId)
        setColleges(Array.isArray(rows) ? rows : [])
      } catch (error) {
        setColleges([])
        toastError(error, 'Failed to load colleges')
      } finally {
        setLoadingColleges(false)
      }
    }
    void loadColleges()
  }, [selectedOrganizationId])

  useEffect(() => {
    if (colleges.length === 0) {
      setSelectedCollegeId(null)
      return
    }
    const qCollegeId = Number(searchParams.get('collegeId') ?? 0)
    const validCollegeId =
      qCollegeId > 0 && colleges.some((row) => pickNum(row, ['collegeId']) === qCollegeId)
        ? qCollegeId
        : pickNum(colleges[0], ['collegeId'])
    if (validCollegeId > 0 && selectedCollegeId !== validCollegeId) {
      setSelectedCollegeId(validCollegeId)
    }
  }, [colleges, searchParams, selectedCollegeId])

  useEffect(() => {
    async function loadStudents() {
      if (!selectedCollegeId) {
        setStudents([])
        return
      }
      setLoadingStudents(true)
      try {
        const rows = await listDetainedStudentsForReadmission(selectedCollegeId)
        setStudents(Array.isArray(rows) ? rows : [])
      } catch (error) {
        setStudents([])
        toastError(error, 'Failed to load detained students')
      } finally {
        setLoadingStudents(false)
      }
    }
    void loadStudents()
  }, [selectedCollegeId])

  function openReadmission(row: AnyRow) {
    const sid = studentId(row, 0)
    if (!sid) return
    const universityId = pickNum(row, ['universityId', 'fk_university_id'])
    const collegeFromRow = pickNum(row, ['collegeId', 'fk_college_id', 'college_id'])
    const params = new URLSearchParams({ studentId: String(sid) })
    if (universityId > 0) params.set('universityId', String(universityId))
    if (selectedOrganizationId && selectedOrganizationId > 0) {
      params.set('organizationId', String(selectedOrganizationId))
    }
    const collegeForUrl = collegeFromRow || (selectedCollegeId ?? 0)
    if (collegeForUrl > 0) params.set('collegeId', String(collegeForUrl))
    router.push(`/admin-student-information-system/readmission-application?${params.toString()}`)
  }

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Student Re-Admission" subtitle="Student Information System" />

      <div className="app-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
          <h2 className="app-card-title">Student Detained List</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-2.5 text-[12px]"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filter
            <ChevronDown className={`ml-1.5 h-3.5 w-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {filterOpen && (
          <div className="p-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select
              label="Organization"
              value={selectedOrganizationId ? String(selectedOrganizationId) : null}
              onChange={(v) => setSelectedOrganizationId(v ? Number(v) : null)}
              options={mapOrganizationOptions(organizations)}
              placeholder="Select Organization"
              isLoading={loadingOrgs}
              className="[&_label]:text-xs [&_label]:font-medium [&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]"
            />
            <Select
              label="College"
              value={selectedCollegeId ? String(selectedCollegeId) : null}
              onChange={(v) => setSelectedCollegeId(v ? Number(v) : null)}
              options={mapCollegeOptions(colleges)}
              placeholder="Select College"
              isLoading={loadingColleges}
              disabled={!selectedOrganizationId}
              className="[&_label]:text-xs [&_label]:font-medium [&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]"
            />
          </div>
        )}
      </div>

      <div className="app-card p-4 space-y-3">
        <div className="max-w-sm">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="h-8 text-xs"
          />
        </div>

        <div className="overflow-auto rounded border">
          <table className="w-full text-[12px]">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-2 py-1 text-left w-14">Photo</th>
                <th className="px-2 py-1 text-left">Student</th>
                <th className="px-2 py-1 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingStudents ? (
                <tr className="border-t">
                  <td className="px-2 py-2 text-slate-600" colSpan={3}>Loading students…</td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr className="border-t">
                  <td className="px-2 py-2 text-slate-600" colSpan={3}>No detained students found.</td>
                </tr>
              ) : (
                filteredStudents.map((row, index) => {
                  const sid = studentId(row, index + 1)
                  const admissionNo = pickText(row, ['admissionNumber', 'hallticketNumber', 'rollNumber']) || '-'
                  const studentName = pickText(row, ['firstName', 'studentName']) || '-'
                  const details = [
                    pickText(row, ['collegeCode']),
                    pickText(row, ['courseCode']),
                    pickText(row, ['groupCode']),
                    pickText(row, ['courseYearName']),
                    pickText(row, ['section', 'sectionName']),
                  ]
                    .filter((text) => text.trim().length > 0)
                    .join(' | ')

                  return (
                    <tr key={`detained-${sid}-${index}`} className="border-t">
                      <td className="px-2 py-1 align-middle">
  <img
    src={row.studentPhotoPath || defaultStudent.src}
    alt="Student"
    className="h-10 w-10 rounded-md border object-cover"
    onError={(e) => {
      e.currentTarget.src = defaultStudent.src
    }}
  />
</td>
                      <td className="px-2 py-1">
                        <div className="font-medium text-slate-900">{admissionNo}, {studentName}</div>
                        <div className="text-slate-600">{details || '-'}</div>
                        <div className="text-slate-600">{pickText(row, ['mobile', 'mobileNumber']) || '-'}</div>
                      </td>
                      <td className="px-2 py-1">
                        <button
                          type="button"
                          onClick={() => openReadmission(row)}
                          className="inline-flex"
                          aria-label={`Open re-admission for ${studentName}`}
                        >
                          <Badge
                            variant="outline"
                            className="cursor-pointer border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/5 px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10"
                          >
                            Re-Admission
                          </Badge>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageContainer>
  )
}
