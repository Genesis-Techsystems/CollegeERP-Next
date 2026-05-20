'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { Filter, List, Pencil } from 'lucide-react'
import { DataTable } from '@/common/components/table'
import { StatusBadge } from '@/common/components/data-display'
import { FormModal } from '@/common/components/feedback'
import { DatePicker } from '@/common/components/date-picker'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Input } from '@/components/ui/input'
import { toastError, toastSuccess } from '@/lib/toast'
import { listAcademicBatchesOfStudent, listStudents, updateAcademicBatchRecord } from '@/services'

type AnyRow = Record<string, any>

const n = (v: unknown) => Number(v) || 0
const s = (v: unknown) => {
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return ''
}

function pickText(obj: AnyRow | null | undefined, keys: string[]): string {
  if (!obj) return ''
  for (const key of keys) {
    const parts = key.split('.')
    let cur: any = obj
    for (const p of parts) {
      cur = cur?.[p]
    }
    const out = s(cur).trim()
    if (out) return out
  }
  return ''
}

function pickIdText(obj: AnyRow | null | undefined, keys: string[]): string {
  if (!obj) return ''
  for (const key of keys) {
    const parts = key.split('.')
    let cur: any = obj
    for (const p of parts) cur = cur?.[p]
    const raw = cur ?? ''
    const out = String(raw).trim()
    if (out && out !== '0' && out !== 'null' && out !== 'undefined') return out
  }
  return ''
}

export default function AcademicBatchesPage() {
  const [filterOpen, setFilterOpen] = useState(true)
  const [searchRows, setSearchRows] = useState<AnyRow[]>([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [studentId, setStudentId] = useState<number | null>(null)
  const [studentHistoryRows, setStudentHistoryRows] = useState<AnyRow[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [tableSearch, setTableSearch] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [editRow, setEditRow] = useState<AnyRow | null>(null)
  const [editAcademicYear, setEditAcademicYear] = useState<string | null>(null)
  const [editRegulation, setEditRegulation] = useState<string | null>(null)
  const [editCourseGroup, setEditCourseGroup] = useState<string | null>(null)
  const [editFromCourseYear, setEditFromCourseYear] = useState<string | null>(null)
  const [editFromSection, setEditFromSection] = useState<string | null>(null)
  const [editFromDate, setEditFromDate] = useState<Date | null>(null)
  const [editToCourseYear, setEditToCourseYear] = useState<string | null>(null)
  const [editToSection, setEditToSection] = useState<string | null>(null)
  const [editToDate, setEditToDate] = useState<Date | null>(null)
  const [editStudentStatus, setEditStudentStatus] = useState<string | null>(null)
  const [editIsActive, setEditIsActive] = useState(true)
  const [editReason, setEditReason] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const studentOptions = useMemo(
    () =>
      searchRows.map((row) => ({
        value: String(n(row.studentId ?? row.fk_student_id ?? row.student_id ?? row.id)),
        label: `${s(row.firstName ?? row.studentName ?? '-')} (${s(row.rollNumber ?? row.hallticketNumber ?? '-')})`,
      })),
    [searchRows],
  )

  async function onSearchStudents(term: string) {
    const q = term.trim()
    if (q.length < 3) return
    setLoadingSearch(true)
    try {
      const rows = await listStudents(q)
      setSearchRows(Array.isArray(rows) ? rows : [])
    } catch {
      setSearchRows([])
    } finally {
      setLoadingSearch(false)
    }
  }

  useEffect(() => {
    async function loadHistory() {
      if (!studentId) {
        setStudentHistoryRows([])
        return
      }
      setLoadingHistory(true)
      const rows = await listAcademicBatchesOfStudent(studentId).catch(() => [])
      setStudentHistoryRows(Array.isArray(rows) ? rows : [])
      setLoadingHistory(false)
    }
    void loadHistory()
  }, [studentId])

  const selectedStudent = useMemo(
    () => searchRows.find((r) => n(r.studentId ?? r.fk_student_id ?? r.student_id ?? r.id) === (studentId ?? 0)) ?? null,
    [searchRows, studentId],
  )
  const modalStudentText = useMemo(() => {
    const name = s(selectedStudent?.firstName ?? selectedStudent?.studentName)
      || pickText(editRow, ['studentName', 'student_name', 'studentDetail.firstName', 'StudentDetail.firstName'])
    const roll = s(selectedStudent?.rollNumber ?? selectedStudent?.hallticketNumber)
      || pickText(editRow, ['rollNumber', 'hallticketNumber', 'studentDetail.rollNumber', 'StudentDetail.rollNumber'])
    return `${name || '-'} (${roll || '-'})`
  }, [selectedStudent, editRow])
  const filteredHistoryRows = useMemo(() => {
    const q = tableSearch.trim().toLowerCase()
    if (!q) return studentHistoryRows
    return studentHistoryRows.filter((row) => {
      const course = s(row.courseName ?? row.course_name ?? row.courseCode ?? row.course_code).toLowerCase()
      const fromYear = s(row.fromCourseYearName ?? row.from_course_year_name ?? row.courseYearName).toLowerCase()
      const toYear = s(row.toCourseYearName ?? row.to_course_year_name ?? row.courseYearName).toLowerCase()
      const reason = s(row.reason ?? row.changeReason).toLowerCase()
      return course.includes(q) || fromYear.includes(q) || toYear.includes(q) || reason.includes(q)
    })
  }, [studentHistoryRows, tableSearch])
  const historyColumnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      { headerName: 'SI.No', width: 70, flex: 0, valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1 },
      { headerName: 'Course', minWidth: 170, valueGetter: (p) => s(p.data?.courseName ?? p.data?.course_name ?? p.data?.courseCode ?? p.data?.course_code) || '-' },
      { headerName: 'From Course Year', minWidth: 150, valueGetter: (p) => s(p.data?.fromCourseYearName ?? p.data?.from_course_year_name ?? p.data?.courseYearName) || '-' },
      { headerName: 'From Section', minWidth: 120, valueGetter: (p) => sectionText((p.data ?? {}) as AnyRow, 'from') || '-' },
      { headerName: 'To Course Year', minWidth: 150, valueGetter: (p) => s(p.data?.toCourseYearName ?? p.data?.to_course_year_name ?? p.data?.courseYearName) || '-' },
      { headerName: 'To Section', minWidth: 120, valueGetter: (p) => sectionText((p.data ?? {}) as AnyRow, 'to') || '-' },
      { headerName: 'From Date', minWidth: 170, valueGetter: (p) => formatDateText(p.data?.fromDate ?? p.data?.from_date) },
      { headerName: 'To Date', minWidth: 170, valueGetter: (p) => formatDateText(p.data?.toDate ?? p.data?.to_date) },
      {
        headerName: 'Student Status',
        minWidth: 130,
        cellRenderer: (p: ICellRendererParams<AnyRow>) => (
          <span className="font-semibold text-green-700">
            {s(p.data?.studentStatusCode ?? p.data?.student_status_code ?? p.data?.studentStatus) || '-'}
          </span>
        ),
      },
      {
        headerName: 'Status',
        width: 100,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<AnyRow>) => (
          <StatusBadge status={p.data?.isActive !== false} />
        ),
      },
      { headerName: 'Reason', minWidth: 130, valueGetter: (p) => s(p.data?.reason ?? p.data?.changeReason) || '-' },
      {
        headerName: 'Actions',
        width: 80,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<AnyRow>) => (
          <button type="button" className="text-primary" aria-label="Edit record" onClick={() => openEdit((p.data ?? {}) as AnyRow)}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
        ),
      },
    ],
    [],
  )

  function sectionText(row: AnyRow, kind: 'from' | 'to') {
    return kind === 'from'
      ? s(row.fromSectionName ?? row.from_section_name ?? row.fromSection ?? '-')
      : s(row.toSectionName ?? row.to_section_name ?? row.toSection ?? '-')
  }
  function formatDateText(v: unknown) {
    if (!v) return '-'
    const d = new Date(String(v))
    if (Number.isNaN(d.getTime())) return s(v)
    return d.toLocaleString()
  }

  const academicYearOptions = useMemo(
    () => Array.from(new Set(studentHistoryRows.map((r) => s(r.academicYear ?? r.academic_year)).filter(Boolean))).map((x) => ({ value: x, label: x })),
    [studentHistoryRows],
  )
  const regulationOptions = useMemo(() => {
    const vals = new Set<string>()
    for (const r of studentHistoryRows) {
      const label = pickText(r, [
        'regulationName',
        'regulation',
        'regulationCode',
        'Regulation.regulationCode',
        'Regulation.regulationName',
        'regulation.regulationCode',
        'regulation.regulationName',
      ])
      if (label) vals.add(label)
      const idLabel = pickIdText(r, ['regulationId', 'fk_regulation_id', 'Regulation.regulationId', 'regulation.regulationId'])
      if (idLabel) vals.add(idLabel)
    }
    const editLabel = pickText(editRow, [
      'regulationName',
      'regulation',
      'regulationCode',
      'Regulation.regulationCode',
      'Regulation.regulationName',
      'regulation.regulationCode',
      'regulation.regulationName',
    ])
    if (editLabel) vals.add(editLabel)
    const editIdLabel = pickIdText(editRow, ['regulationId', 'fk_regulation_id', 'Regulation.regulationId', 'regulation.regulationId'])
    if (editIdLabel) vals.add(editIdLabel)
    return Array.from(vals).map((x) => ({ value: x, label: x }))
  }, [studentHistoryRows, editRow])
  const groupOptions = useMemo(() => {
    const vals = new Set<string>()
    for (const r of studentHistoryRows) {
      const label = pickText(r, [
        'groupCode',
        'groupName',
        'courseGroupName',
        'CourseGroup.groupCode',
        'CourseGroup.groupName',
        'courseGroup.groupCode',
        'courseGroup.groupName',
      ])
      if (label) vals.add(label)
      const idLabel = pickIdText(r, ['courseGroupId', 'fk_course_group_id', 'CourseGroup.courseGroupId', 'courseGroup.courseGroupId'])
      if (idLabel) vals.add(idLabel)
    }
    const editLabel = pickText(editRow, [
      'groupCode',
      'groupName',
      'courseGroupName',
      'CourseGroup.groupCode',
      'CourseGroup.groupName',
      'courseGroup.groupCode',
      'courseGroup.groupName',
    ])
    if (editLabel) vals.add(editLabel)
    const editIdLabel = pickIdText(editRow, ['courseGroupId', 'fk_course_group_id', 'CourseGroup.courseGroupId', 'courseGroup.courseGroupId'])
    if (editIdLabel) vals.add(editIdLabel)
    return Array.from(vals).map((x) => ({ value: x, label: x }))
  }, [studentHistoryRows, editRow])
  const yearOptions = useMemo(
    () => Array.from(new Set(studentHistoryRows.flatMap((r) => [s(r.fromCourseYearName ?? r.courseYearName), s(r.toCourseYearName ?? r.courseYearName)]).filter(Boolean))).map((x) => ({ value: x, label: x })),
    [studentHistoryRows],
  )
  const sectionOptions = useMemo(() => {
    const vals = new Set<string>()
    for (const r of studentHistoryRows) {
      const from = sectionText(r, 'from')
      const to = sectionText(r, 'to')
      if (from && from !== '-') vals.add(from)
      if (to && to !== '-') vals.add(to)
      const direct = pickText(r, ['section', 'sectionName', 'groupSectionName'])
      if (direct && direct !== '-') vals.add(direct)
      const fromId = pickIdText(r, ['fromSectionId', 'from_group_section_id', 'fromGroupSectionId'])
      const toId = pickIdText(r, ['toSectionId', 'to_group_section_id', 'toGroupSectionId'])
      if (fromId) vals.add(fromId)
      if (toId) vals.add(toId)
    }
    const current = s(selectedStudent?.section)
    if (current) vals.add(current)
    const editFrom = sectionText(editRow ?? {}, 'from')
    const editTo = sectionText(editRow ?? {}, 'to')
    if (editFrom && editFrom !== '-') vals.add(editFrom)
    if (editTo && editTo !== '-') vals.add(editTo)
    return Array.from(vals).map((x) => ({ value: x, label: x }))
  }, [studentHistoryRows, selectedStudent, editRow])
  const studentStatusOptions = useMemo(
    () => Array.from(new Set(studentHistoryRows.map((r) => s(r.studentStatusCode ?? r.studentStatus)).filter(Boolean))).map((x) => ({ value: x, label: x })),
    [studentHistoryRows],
  )
  const regulationOptionsWithCurrent = useMemo(() => {
    const base = [...regulationOptions]
    if (editRegulation && !base.some((o) => o.value === editRegulation)) {
      base.unshift({ value: editRegulation, label: editRegulation })
    }
    return base
  }, [regulationOptions, editRegulation])
  const groupOptionsWithCurrent = useMemo(() => {
    const base = [...groupOptions]
    if (editCourseGroup && !base.some((o) => o.value === editCourseGroup)) {
      base.unshift({ value: editCourseGroup, label: editCourseGroup })
    }
    return base
  }, [groupOptions, editCourseGroup])
  const sectionOptionsWithCurrent = useMemo(() => {
    const base = [...sectionOptions]
    if (editFromSection && !base.some((o) => o.value === editFromSection)) {
      base.unshift({ value: editFromSection, label: editFromSection })
    }
    if (editToSection && !base.some((o) => o.value === editToSection)) {
      base.unshift({ value: editToSection, label: editToSection })
    }
    return base
  }, [sectionOptions, editFromSection, editToSection])

  function openEdit(row: AnyRow) {
    setEditRow(row)
    setEditAcademicYear(s(row.academicYear ?? row.academic_year) || null)
    setEditRegulation(
      pickText(row, [
        'regulationName',
        'regulation',
        'regulationCode',
        'Regulation.regulationCode',
        'Regulation.regulationName',
        'regulation.regulationCode',
        'regulation.regulationName',
      ]) || pickIdText(row, ['regulationId', 'fk_regulation_id', 'Regulation.regulationId', 'regulation.regulationId']) || s(selectedStudent?.regulationCode ?? selectedStudent?.regulationName) || null,
    )
    setEditCourseGroup(
      pickText(row, [
        'groupCode',
        'groupName',
        'courseGroupName',
        'CourseGroup.groupCode',
        'CourseGroup.groupName',
        'courseGroup.groupCode',
        'courseGroup.groupName',
      ]) || pickIdText(row, ['courseGroupId', 'fk_course_group_id', 'CourseGroup.courseGroupId', 'courseGroup.courseGroupId']) || s(selectedStudent?.groupCode ?? selectedStudent?.groupName) || null,
    )
    setEditFromCourseYear(s(row.fromCourseYearName ?? row.courseYearName) || null)
    setEditFromSection(sectionText(row, 'from') || pickIdText(row, ['fromSectionId', 'from_group_section_id', 'fromGroupSectionId']) || s(selectedStudent?.section) || null)
    setEditFromDate(row?.fromDate ? new Date(String(row.fromDate)) : null)
    setEditToCourseYear(s(row.toCourseYearName ?? row.courseYearName) || null)
    setEditToSection(sectionText(row, 'to') || pickIdText(row, ['toSectionId', 'to_group_section_id', 'toGroupSectionId']) || s(selectedStudent?.section) || null)
    setEditToDate(row?.toDate ? new Date(String(row.toDate)) : null)
    setEditStudentStatus(s(row.studentStatusCode ?? row.studentStatus) || s(selectedStudent?.studentStatusCode ?? selectedStudent?.studentStatus) || null)
    setEditIsActive(row?.isActive !== false)
    setEditReason(s(row.reason ?? row.changeReason))
    setEditOpen(true)
  }

  async function onSaveEdit() {
    if (!editRow) return
    setSavingEdit(true)
    try {
      const payload = {
        ...editRow,
        academicYear: editAcademicYear,
        regulationName: editRegulation,
        groupCode: editCourseGroup,
        fromCourseYearName: editFromCourseYear,
        fromSectionName: editFromSection,
        fromDate: editFromDate,
        toCourseYearName: editToCourseYear,
        toSectionName: editToSection,
        toDate: editToDate,
        studentStatusCode: editStudentStatus,
        isActive: editIsActive,
        reason: editReason,
      }
      await updateAcademicBatchRecord(payload)
      toastSuccess('Academic batch record updated successfully')
      setEditOpen(false)
      if (studentId) {
        const rows = await listAcademicBatchesOfStudent(studentId).catch(() => [])
        setStudentHistoryRows(Array.isArray(rows) ? rows : [])
      }
    } catch {
      toastError('Failed to update academic batch record')
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <PageContainer>
      <div className="app-card p-0 overflow-hidden">
        <div className="px-4 py-2.5 border-b flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-primary inline-flex items-center gap-2">
            <List className="h-4 w-4" />
            Academic Batches Of Student
          </h2>
          <button type="button" className="ml-auto inline-flex items-center gap-1 text-sm text-foreground" onClick={() => setFilterOpen((v) => !v)}>
            <span>Filter</span>
            <Filter className="h-4 w-4" />
          </button>
        </div>
        {filterOpen ? (
          <div className="p-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <Select
              label="Student"
              value={studentId ? String(studentId) : null}
              onChange={(v) => setStudentId(v ? Number(v) : null)}
              options={studentOptions}
              placeholder="Student"
              searchable
              clearable
              onSearch={(term) => { void onSearchStudents(term) }}
              isLoading={loadingSearch}
              className="md:col-span-6"
            />
          </div>
        ) : null}
      </div>
      {studentId ? (
        <div className="app-card mt-4 overflow-hidden">
          <div className="px-2.5 py-2 border-b text-sm font-semibold text-primary">
            {s(selectedStudent?.collegeCode)} {s(selectedStudent?.academicYear ? `| ${selectedStudent.academicYear}` : '')} {s(selectedStudent?.courseCode ? `| ${selectedStudent.courseCode}` : '')} {s(selectedStudent?.groupCode ? `| ${selectedStudent.groupCode}` : '')} {s(selectedStudent?.courseYearName ? `| ${selectedStudent.courseYearName}` : '')} {s(selectedStudent?.section ? `| ${selectedStudent.section}` : '')}
          </div>
          <div className="p-3">
            <div className="mb-2 max-w-[320px]">
              <Input value={tableSearch} onChange={(e) => setTableSearch(e.target.value)} placeholder="Search" className="h-8" />
            </div>
            <div className="rounded border overflow-hidden">
              <DataTable
                rowData={filteredHistoryRows}
                columnDefs={historyColumnDefs}
                loading={loadingHistory}
                pagination
                toolbar={false}
              />
            </div>
          </div>
        </div>
      ) : null}
      <FormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Academic Batch"
        onSubmit={() => { void onSaveEdit() }}
        submitLabel={savingEdit ? 'Saving...' : 'Save'}
        size="xl"
        contentClassName="sm:max-w-5xl"
        titleClassName="text-teal-600"
        formClassName="space-y-5 py-1"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <div className="grid grid-cols-2 gap-y-2">
              <div>College :</div><div className="font-semibold text-primary">{s(editRow?.collegeCode)} / {s(editRow?.academicYear)}</div>
              <div>Course :</div><div className="font-semibold text-primary">{s(editRow?.courseName ?? editRow?.courseCode)}</div>
              <div>Student :</div><div className="font-semibold text-primary">{modalStudentText}</div>
              <div>Batch :</div><div className="font-semibold text-primary">{s(editRow?.batchName ?? editRow?.batch)}</div>
              <div>Reason :</div><div className="font-semibold text-primary">{editReason || '-'}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select label="Academic Year *" value={editAcademicYear} onChange={setEditAcademicYear} options={academicYearOptions} searchable className="[&_button[role='combobox']]:h-11 [&_button[role='combobox']]:rounded-xl" />
            <Select label="Regulation *" value={editRegulation} onChange={setEditRegulation} options={regulationOptionsWithCurrent} searchable className="[&_button[role='combobox']]:h-11 [&_button[role='combobox']]:rounded-xl" />
            <Select label="Course Group *" value={editCourseGroup} onChange={setEditCourseGroup} options={groupOptionsWithCurrent} searchable className="[&_button[role='combobox']]:h-11 [&_button[role='combobox']]:rounded-xl" />
            <div />
            <Select label="From Course Year *" value={editFromCourseYear} onChange={setEditFromCourseYear} options={yearOptions} searchable className="[&_button[role='combobox']]:h-11 [&_button[role='combobox']]:rounded-xl" />
            <Select label="From Section" value={editFromSection} onChange={setEditFromSection} options={sectionOptionsWithCurrent} searchable className="[&_button[role='combobox']]:h-11 [&_button[role='combobox']]:rounded-xl" />
            <DatePicker label="From Date *" value={editFromDate} onChange={setEditFromDate} placeholder="Select date" />
            <Select label="To Course Year" value={editToCourseYear} onChange={setEditToCourseYear} options={yearOptions} searchable className="[&_button[role='combobox']]:h-11 [&_button[role='combobox']]:rounded-xl" />
            <Select label="To Section" value={editToSection} onChange={setEditToSection} options={sectionOptionsWithCurrent} searchable className="[&_button[role='combobox']]:h-11 [&_button[role='combobox']]:rounded-xl" />
            <DatePicker label="To Date *" value={editToDate} onChange={setEditToDate} placeholder="Select date" />
            <Select label="Student Status *" value={editStudentStatus} onChange={setEditStudentStatus} options={studentStatusOptions} searchable className="[&_button[role='combobox']]:h-11 [&_button[role='combobox']]:rounded-xl" />
            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} />
                Active
              </label>
            </div>
          </div>
          <Input
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
            placeholder="Reason"
            className="h-11 rounded-xl"
          />
        </div>
      </FormModal>
    </PageContainer>
  )
}
