'use client'

import { useEffect, useState } from 'react'
import { StatusBadge } from '@/common/components/data-display'
import { EmptyState } from '@/common/components/feedback'
import { Table, type TableColumn } from '@/common/components/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  loadStudentCurriculumSemester,
  loadStudentCurriculumShell,
  pickProfileCell,
  type StudentCurriculumSemester,
} from '@/services'
import { formatProfileDate } from './profile-utils'

type AnyRow = Record<string, any>

const SEM_TAB_CLASS =
  'rounded-none border-b-2 border-transparent px-3 py-2 text-[11px] whitespace-nowrap data-[state=active]:border-[#ffcf46] data-[state=active]:bg-[#ffcf46]/30 data-[state=active]:text-primary data-[state=active]:shadow-none'

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="border-b border-sky-200/80 bg-sky-50/80 px-3 py-2">
        <h3 className="text-xs font-semibold text-primary">{title}</h3>
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}

function siNoColumn<T>(): TableColumn<T> {
  return {
    id: 'siNo',
    label: 'Sl.No',
    width: 8,
    render: (_row, index) => String(index + 1),
  }
}

function cols(defs: Array<{ id: string; label: string; keys: string[]; render?: TableColumn<AnyRow>['render'] }>): TableColumn<AnyRow>[] {
  return defs.map((def) => ({
    id: def.id,
    label: def.label,
    render: def.render ?? ((row) => pickProfileCell(row, def.keys) || '—'),
  }))
}

function CurriculumTable({
  rows,
  columns,
  emptyMessage,
  loading,
}: {
  rows: AnyRow[]
  columns: TableColumn<AnyRow>[]
  emptyMessage: string
  loading?: boolean
}) {
  if (loading) return <p className="py-4 text-center text-xs text-muted-foreground">Loading…</p>
  if (!rows.length) {
    return (
      <div className="overflow-hidden rounded border border-border">
        <table className="min-w-full text-xs">
          <thead className="bg-sky-50/80 text-left text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th key={String(c.id)} className="border-b border-border px-2 py-2 font-medium">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={columns.length} className="px-2 py-6 text-center text-sm font-medium text-destructive">
                {emptyMessage}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }
  return <Table rows={rows} columns={columns} pageSize={0} density="compact" emptyText={emptyMessage} />
}

function studentStatusCell(row: AnyRow) {
  const code = pickProfileCell(row, ['studentStatusCode', 'student_status_code', 'statusCode']).toUpperCase()
  const label =
    pickProfileCell(row, ['studentStatusDisplayName', 'studentStatusName', 'student_status', 'statusName']) ||
    code ||
    '—'
  if (!label || label === '—') return '—'
  let variant: 'active' | 'inactive' | 'pending' | 'published' = 'inactive'
  if (code === 'INCOLLEGE' || code === 'IN COLLEGE') variant = 'active'
  else if (code === 'PASSEDOUT' || code === 'PASSED OUT') variant = 'published'
  else if (code.includes('DETAIN')) variant = 'pending'
  return <StatusBadge status={variant} label={label} />
}

const SUBJECT_COLS = cols([
  { id: 'ay', label: 'Academic Year', keys: ['academicYear', 'academic_year', 'academicYearName'] },
  { id: 'code', label: 'Subject Code', keys: ['subjectCode', 'subject_code'] },
  { id: 'name', label: 'Subject Name', keys: ['subjectName', 'subject_name', 'shortName', 'subjectShortName'] },
  {
    id: 'type',
    label: 'Subject Type',
    keys: [],
    render: (row) => {
      const typeName =
        pickProfileCell(row, ['subjecttypeName', 'subject_type_name']) ||
        pickProfileCell(row, ['subjectTypeName', 'subject_type_name', 'subjectTypeCode', 'subject_type_code'])
      return typeName || '—'
    },
  },
])

const ELECTIVE_COLS = cols([
  { id: 'group', label: 'Elective Group', keys: ['electiveGroupName', 'elective_group_name', 'electiveGroupCode', 'groupName'] },
  {
    id: 'subject',
    label: 'Subject',
    keys: ['electiveName', 'elective_name', 'subjectName', 'subject_name', 'subjectCode', 'subject_code'],
  },
  {
    id: 'from',
    label: 'From Date',
    keys: ['fromDate', 'from_date', 'effectiveFrom'],
    render: (row) => formatProfileDate(row.fromDate ?? row.from_date ?? row.effectiveFrom),
  },
  {
    id: 'to',
    label: 'To Date',
    keys: ['toDate', 'to_date', 'effectiveTo'],
    render: (row) => formatProfileDate(row.toDate ?? row.to_date ?? row.effectiveTo),
  },
])

const LAB_COLS = cols([
  { id: 'course', label: 'Course', keys: ['displayName', 'display_name', 'courseName', 'course_name', 'courseCode', 'course_code', 'subjectName', 'subjectCode'] },
  { id: 'batch', label: 'Batch', keys: ['studentBatchName', 'batchName', 'batch_name', 'labBatchName', 'batchCode', 'batch'] },
  {
    id: 'from',
    label: 'From Date',
    keys: ['fromDate', 'from_date', 'startDate'],
    render: (row) => formatProfileDate(row.fromDate ?? row.from_date ?? row.startDate),
  },
  {
    id: 'to',
    label: 'To Date',
    keys: ['toDate', 'to_date', 'endDate'],
    render: (row) => formatProfileDate(row.toDate ?? row.to_date ?? row.endDate),
  },
])

const ACADEMIC_COLS: TableColumn<AnyRow>[] = [
  siNoColumn(),
  ...cols([
    { id: 'ay', label: 'Academic Year', keys: ['academicYear', 'academic_year', 'academicYearName'] },
    { id: 'fromCy', label: 'From Course Year', keys: ['fromCourseYearName', 'from_course_year_name', 'fromCourseYear', 'courseYearName'] },
    { id: 'fromSec', label: 'From Section', keys: ['fromSection', 'fromSectionName', 'from_group_section', 'fromGroupSectionName', 'section'] },
    { id: 'toCy', label: 'To Course Year', keys: ['toCourseYearName', 'to_course_year_name', 'toCourseYear'] },
    { id: 'toSec', label: 'To Section', keys: ['toSection', 'toSectionName', 'to_group_section', 'toGroupSectionName'] },
    {
      id: 'from',
      label: 'From Date',
      keys: ['fromDate', 'from_date'],
      render: (row) => formatProfileDate(row.fromDate ?? row.from_date),
    },
    {
      id: 'to',
      label: 'To Date',
      keys: ['toDate', 'to_date'],
      render: (row) => formatProfileDate(row.toDate ?? row.to_date),
    },
    { id: 'status', label: 'Student Status', keys: [], render: (row) => studentStatusCell(row) },
  ]),
]

export function CurriculumTab({ student }: { student: AnyRow }) {
  const [semesters, setSemesters] = useState<StudentCurriculumSemester[]>([])
  const [academicDetails, setAcademicDetails] = useState<AnyRow[]>([])
  const [activeSem, setActiveSem] = useState<string>('')
  const [subjects, setSubjects] = useState<AnyRow[]>([])
  const [electives, setElectives] = useState<AnyRow[]>([])
  const [labBatches, setLabBatches] = useState<AnyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [semLoading, setSemLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const shell = await loadStudentCurriculumShell(student)
        if (cancelled) return
        setSemesters(shell.semesters)
        setAcademicDetails(shell.academicDetails)
        if (shell.semesters[0]) setActiveSem(String(shell.semesters[0].courseYearId))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [student])

  useEffect(() => {
    const cyId = Number(activeSem)
    if (!cyId) return
    const sem = semesters.find((s) => s.courseYearId === cyId)
    let cancelled = false
    void (async () => {
      setSemLoading(true)
      try {
        const payload = await loadStudentCurriculumSemester(
          student,
          cyId,
          academicDetails,
          sem?.label,
        )
        if (cancelled) return
        setSubjects(payload.subjects)
        setElectives(payload.electives)
        setLabBatches(payload.labBatches)
      } finally {
        if (!cancelled) setSemLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [student, activeSem, academicDetails, semesters])

  const subjectCols: TableColumn<AnyRow>[] = [siNoColumn(), ...SUBJECT_COLS]
  const electiveCols: TableColumn<AnyRow>[] = [siNoColumn(), ...ELECTIVE_COLS]
  const labCols: TableColumn<AnyRow>[] = [siNoColumn(), ...LAB_COLS]

  if (loading) return <p className="py-8 text-center text-sm text-muted-foreground">Loading curriculum…</p>
  if (!semesters.length) return <EmptyState title="No curriculum data found." />

  return (
    <div className="space-y-4">
      <SectionCard title="Student Semester Wise Subjects">
        <Tabs value={activeSem} onValueChange={setActiveSem}>
          <TabsList className="mb-4 h-auto w-full justify-start overflow-x-auto rounded-none border border-[#ffcf46] bg-transparent p-0">
            {semesters.map((sem) => (
              <TabsTrigger key={sem.courseYearId} value={String(sem.courseYearId)} className={SEM_TAB_CLASS}>
                {sem.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CurriculumTable
              loading={semLoading}
              rows={subjects}
              columns={subjectCols}
              emptyMessage="No subjects for this semester."
            />
          </div>
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Elective Group</p>
              <CurriculumTable
                loading={semLoading}
                rows={electives}
                columns={electiveCols}
                emptyMessage="No Elective subjects are found."
              />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Lab Batches</p>
              <CurriculumTable
                loading={semLoading}
                rows={labBatches}
                columns={labCols}
                emptyMessage="No Lab subjects are found."
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Student Academic Details">
        {academicDetails.length > 0 ? (
          <Table rows={academicDetails} columns={ACADEMIC_COLS} pageSize={0} density="compact" emptyText="No academic details found." />
        ) : (
          <CurriculumTable
            rows={[]}
            columns={ACADEMIC_COLS}
            emptyMessage="No academic details found."
          />
        )}
      </SectionCard>
    </div>
  )
}
