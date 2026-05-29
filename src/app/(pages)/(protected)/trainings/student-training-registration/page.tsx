'use client'

import { useState, useMemo, useCallback } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { PageContainer } from '@/components/layout'
import { DataTable } from '@/common/components/table'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Select } from '@/common/components/select'
import { searchStudentsByKeyword } from '@/services/student-information'
import { searchEmployeesForHr } from '@/services/hr-payroll'
import {
  listTrainings,
  listTrainingStudentsByEmployee,
  listTrainingStudentsByStudent,
  createTrainingStudent,
} from '@/services/trainings'
import type { PlacementTraining, TrainingStudent } from '@/types/trainings'
import { rowIndexGetter } from '@/lib/utils'

type AnyRow = Record<string, any>
type Mode = 'student' | 'employee'
type TrainingRow = PlacementTraining & { registered: boolean }

const SELECT_CLASS =
  "[&_label]:text-xs [&_label]:font-medium [&_button[role='combobox']]:h-8 [&_button[role='combobox']]:text-[12px]"

function pickNum(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0
  for (const k of keys) {
    const n = Number(row[k] ?? 0)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return ''
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

// ─── Confirm registration modal ───────────────────────────────────────────────

interface ConfirmModalProps {
  training: PlacementTraining | null
  onClose: () => void
  onConfirm: () => Promise<void>
}

function ConfirmModal({ training, onClose, onConfirm }: ConfirmModalProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setSaving(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={training !== null} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">Confirmation</DialogTitle>
        </DialogHeader>

        {training && (
          <div className="space-y-2 py-2 text-sm">
            <div className="grid grid-cols-3 gap-1">
              <span className="text-xs text-muted-foreground">Training</span>
              <span className="col-span-2 font-medium">
                {training.trainingTitle}
                {training.trainingTypeCatCode && (
                  <span className="text-muted-foreground ml-1">({training.trainingTypeCatCode})</span>
                )}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <span className="text-xs text-muted-foreground">Trainer</span>
              <span className="col-span-2">{training.trainerName}</span>
            </div>
            {training.empName && (
              <div className="grid grid-cols-3 gap-1">
                <span className="text-xs text-muted-foreground">Incharge</span>
                <span className="col-span-2">
                  {training.empName}
                  {training.empNumber && (
                    <span className="text-muted-foreground ml-1">({training.empNumber})</span>
                  )}
                </span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-1">
              <span className="text-xs text-muted-foreground">Date</span>
              <span className="col-span-2">{training.startDate} – {training.endDate}</span>
            </div>
            <p className="pt-2 font-semibold">Are you sure to register?</p>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-600 rounded bg-red-50 px-3 py-2">{error}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Close</Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? 'Registering…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Profile Card ─────────────────────────────────────────────────────────────

function StudentProfileCard({ row }: { row: AnyRow }) {
  const name = pickText(row, ['studentName', 'firstName', 'fullName'])
  const roll = pickText(row, ['hallticketNumber', 'rollNumber', 'admissionNumber'])
  const course = pickText(row, ['courseName', 'course_name'])
  const mobile = pickText(row, ['mobileNumber', 'mobile', 'phone'])
  const college = pickText(row, ['collegeName', 'collegeCode'])
  const dept = pickText(row, ['departmentName', 'department'])

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 flex gap-4 items-start">
      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <span className="text-primary font-bold text-lg">{name.charAt(0).toUpperCase() || 'S'}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs flex-1">
        {name && <div><span className="text-muted-foreground">Name: </span><span className="font-medium">{name}</span></div>}
        {roll && <div><span className="text-muted-foreground">Roll No: </span><span className="font-medium">{roll}</span></div>}
        {course && <div><span className="text-muted-foreground">Course: </span><span className="font-medium">{course}</span></div>}
        {dept && <div><span className="text-muted-foreground">Dept: </span><span className="font-medium">{dept}</span></div>}
        {college && <div><span className="text-muted-foreground">College: </span><span className="font-medium">{college}</span></div>}
        {mobile && <div><span className="text-muted-foreground">Mobile: </span><span className="font-medium">{mobile}</span></div>}
      </div>
    </div>
  )
}

function EmployeeProfileCard({ row }: { row: AnyRow }) {
  const name = pickText(row, ['employeeName', 'empName', 'firstName', 'fullName', 'name'])
  const empNo = pickText(row, ['empNumber', 'employeeNumber', 'employeeNo', 'empNo'])
  const dept = pickText(row, ['departmentName', 'department', 'deptName'])
  const designation = pickText(row, ['designationName', 'designation'])
  const college = pickText(row, ['collegeName', 'collegeCode'])
  const mobile = pickText(row, ['mobileNumber', 'mobile', 'phone'])

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 flex gap-4 items-start">
      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <span className="text-primary font-bold text-lg">{name.charAt(0).toUpperCase() || 'E'}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs flex-1">
        {name && <div><span className="text-muted-foreground">Name: </span><span className="font-medium">{name}</span></div>}
        {empNo && <div><span className="text-muted-foreground">Emp No: </span><span className="font-medium">{empNo}</span></div>}
        {dept && <div><span className="text-muted-foreground">Dept: </span><span className="font-medium">{dept}</span></div>}
        {designation && <div><span className="text-muted-foreground">Designation: </span><span className="font-medium">{designation}</span></div>}
        {college && <div><span className="text-muted-foreground">College: </span><span className="font-medium">{college}</span></div>}
        {mobile && <div><span className="text-muted-foreground">Mobile: </span><span className="font-medium">{mobile}</span></div>}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentTrainingRegistrationPage() {
  const [mode, setMode] = useState<Mode>('student')

  // Search state
  const [searchRows, setSearchRows] = useState<AnyRow[]>([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedRow, setSelectedRow] = useState<AnyRow | null>(null)

  // Trainings + registrations
  const [trainings, setTrainings] = useState<PlacementTraining[]>([])
  const [registrations, setRegistrations] = useState<TrainingStudent[]>([])
  const [loadingData, setLoadingData] = useState(false)

  // Confirm modal
  const [confirmTraining, setConfirmTraining] = useState<PlacementTraining | null>(null)

  // ── Search options ──────────────────────────────────────────────────────────

  const searchOptions = useMemo(() => {
    if (mode === 'student') {
      return searchRows.map((row) => ({
        value: String(pickNum(row, ['studentId', 'fk_student_id', 'student_id'])),
        label: `${pickText(row, ['studentName', 'firstName']) || 'Student'} (${pickText(row, ['hallticketNumber', 'rollNumber']) || '-'})`,
      }))
    }
    return searchRows.map((row) => ({
      value: String(pickNum(row, ['employeeId', 'employee_id'])),
      label: `${pickText(row, ['employeeName', 'empName', 'firstName', 'name']) || 'Employee'} (${pickText(row, ['empNumber', 'employeeNumber']) || '-'})`,
    }))
  }, [searchRows, mode])

  // ── Handle search ───────────────────────────────────────────────────────────

  const handleSearch = useCallback(async (term: string) => {
    if (term.trim().length < 5) {
      setSearchRows([])
      return
    }
    setLoadingSearch(true)
    try {
      if (mode === 'student') {
        const rows = await searchStudentsByKeyword(term)
        setSearchRows(Array.isArray(rows) ? rows : [])
      } else {
        const rows = await searchEmployeesForHr(term)
        setSearchRows(Array.isArray(rows) ? rows : [])
      }
    } catch {
      setSearchRows([])
    } finally {
      setLoadingSearch(false)
    }
  }, [mode])

  // ── Handle person selection ─────────────────────────────────────────────────

  const handleSelect = useCallback(async (value: string | null) => {
    const id = value ? Number(value) : null
    setSelectedId(id)
    setTrainings([])
    setRegistrations([])

    if (!id) {
      setSelectedRow(null)
      return
    }

    const found = searchRows.find((r) => {
      if (mode === 'student') return pickNum(r, ['studentId', 'fk_student_id', 'student_id']) === id
      return pickNum(r, ['employeeId', 'employee_id']) === id
    }) ?? null
    setSelectedRow(found)

    setLoadingData(true)
    try {
      const [allTrainings, regs] = await Promise.all([
        listTrainings(),
        mode === 'student'
          ? listTrainingStudentsByStudent(id)
          : listTrainingStudentsByEmployee(id),
      ])
      const filtered = allTrainings.filter(
        (t) => t.isTrackAudience == null || t.isTrackAudience,
      )
      setTrainings(filtered)
      setRegistrations(regs)
    } catch {
      setTrainings([])
      setRegistrations([])
    } finally {
      setLoadingData(false)
    }
  }, [searchRows, mode])

  // ── Switch mode ─────────────────────────────────────────────────────────────

  function switchMode(next: Mode) {
    setMode(next)
    setSearchRows([])
    setSelectedId(null)
    setSelectedRow(null)
    setTrainings([])
    setRegistrations([])
  }

  // ── Registered ID set ───────────────────────────────────────────────────────

  const registeredIds = useMemo(
    () => new Set(registrations.map((r) => r.trainingId)),
    [registrations],
  )

  // ── Rows for table ──────────────────────────────────────────────────────────

  const tableRows = useMemo<TrainingRow[]>(
    () => trainings.map((t) => ({ ...t, registered: registeredIds.has(t.traningId) })),
    [trainings, registeredIds],
  )

  // ── Register handler ────────────────────────────────────────────────────────

  async function handleRegister(training: PlacementTraining) {
    if (!selectedId) return
    const payload: Partial<import('@/types/trainings').TrainingStudent> = {
      trainingId: training.traningId,
      collegeId: training.collegeId,
      isActive: true,
    }
    if (mode === 'student') {
      ;(payload as any).studentId = selectedId
      ;(payload as any).studentDetail = { studentId: selectedId }
    } else {
      payload.employeeId = selectedId
    }
    await createTrainingStudent(payload)

    // Refresh registrations
    const updated = mode === 'student'
      ? await listTrainingStudentsByStudent(selectedId)
      : await listTrainingStudentsByEmployee(selectedId)
    setRegistrations(updated)
  }

  // ── Column defs ─────────────────────────────────────────────────────────────

  const columnDefs = useMemo<ColDef<TrainingRow>[]>(
    () => [
      { headerName: 'No.', valueGetter: rowIndexGetter, width: 60, flex: 0 },
      { field: 'trainingTitle', headerName: 'Training Title', minWidth: 180, flex: 2 },
      { field: 'trainingTypeCatDisplayName', headerName: 'Training Type', minWidth: 130, flex: 1 },
      { field: 'trainerName', headerName: 'Trainer Name', minWidth: 130, flex: 1 },
      { field: 'startDate', headerName: 'Start Date', minWidth: 110, flex: 1 },
      { field: 'endDate', headerName: 'End Date', minWidth: 110, flex: 1 },
      {
        headerName: 'Status',
        minWidth: 110,
        flex: 0.9,
        cellRenderer: (p: ICellRendererParams<TrainingRow>) => {
          const row = p.data
          if (!row) return null
          if (row.registered) {
            return (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                Registered
              </span>
            )
          }
          return (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
              Register
            </span>
          )
        },
      },
      {
        headerName: 'Actions',
        width: 150,
        flex: 0,
        cellRenderer: (p: ICellRendererParams<TrainingRow>) => {
          const row = p.data
          if (!row) return null
          if (row.registered) return <span className="text-muted-foreground text-xs">—</span>
          return (
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => setConfirmTraining(row)}
            >
              Register
            </Button>
          )
        },
      },
    ],
    [],
  )

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <PageContainer className="space-y-4">
      {/* Search card */}
      <div className="app-card p-4 space-y-4">
        <h2 className="app-card-title">Student Training Registration</h2>

        {/* Radio toggle */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="radio"
              name="trainingRegMode"
              checked={mode === 'student'}
              onChange={() => switchMode('student')}
              className="accent-primary"
            />
            Search For Student
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="radio"
              name="trainingRegMode"
              checked={mode === 'employee'}
              onChange={() => switchMode('employee')}
              className="accent-primary"
            />
            Search For Employee
          </label>
        </div>

        {/* Searchable select */}
        <div className="max-w-sm">
          <Select
            label={mode === 'student' ? 'Student' : 'Employee'}
            value={selectedId ? String(selectedId) : null}
            onChange={(v) => void handleSelect(v)}
            options={searchOptions}
            placeholder={`Search ${mode === 'student' ? 'student' : 'employee'} (min 5 chars)…`}
            searchable
            onSearch={(term) => void handleSearch(term)}
            isLoading={loadingSearch}
            className={SELECT_CLASS}
          />
        </div>

        {/* Profile card */}
        {selectedRow && mode === 'student' && <StudentProfileCard row={selectedRow} />}
        {selectedRow && mode === 'employee' && <EmployeeProfileCard row={selectedRow} />}
      </div>

      {/* Trainings grid */}
      {selectedId && (
        <div className="app-card overflow-hidden">
          <div className="px-3 pb-3 pt-2">
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <DataTable
                rowData={tableRows}
                columnDefs={columnDefs}
                loading={loadingData}
                pagination
                toolbar={{
                  search: true,
                  searchPlaceholder: 'Search trainings…',
                  pdfDocumentTitle: 'Training Registration',
                }}
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        training={confirmTraining}
        onClose={() => setConfirmTraining(null)}
        onConfirm={() => handleRegister(confirmTraining!)}
      />
    </PageContainer>
  )
}
