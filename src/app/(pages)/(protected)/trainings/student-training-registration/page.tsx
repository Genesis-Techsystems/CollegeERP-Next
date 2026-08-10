'use client'

import { useState, useMemo, useCallback } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { User } from 'lucide-react'
import { FilteredListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Select } from '@/common/components/select'
import {
  listTrainingsByCollege,
  listTrainingStudentsByEmployee,
  listTrainingStudentsByStudent,
  createTrainingStudent,
  searchStudentsForTrainingRegistration,
  searchEmployeesForTrainingRegistration,
} from '@/services'
import type { PlacementTraining, TrainingStudent } from '@/types/trainings'
import { rowIndexGetter } from '@/lib/utils'

type AnyRow = Record<string, unknown>
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

/** Angular `date:'MMM d, y'` style. */
function formatAngularDate(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ─── Confirm registration modal (Angular TrainingRegisterModal) ───────────────

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
            <div className="grid grid-cols-[100px_1fr] gap-1">
              <span className="text-muted-foreground">Training :</span>
              <span className="font-medium text-primary">
                {training.trainingTitle}{' '}
                {training.trainingTypeCatCode && (
                  <span className="text-muted-foreground">
                    ({training.trainingTypeCatCode})
                  </span>
                )}
              </span>
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-1">
              <span className="text-muted-foreground">Trainer:</span>
              <span className="text-primary">{training.trainerName}</span>
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-1">
              <span className="text-muted-foreground">Incharge :</span>
              <span className="text-primary">
                {training.empName}
                {training.empNumber != null ? ` - (${training.empNumber})` : ''}
              </span>
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-1">
              <span className="text-muted-foreground">Date :</span>
              <span className="text-primary">
                {formatAngularDate(training.startDate)} -{' '}
                {formatAngularDate(training.endDate)}
              </span>
            </div>
            <p className="pt-2 font-bold">Are you sure to register ?</p>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-600 rounded bg-red-50 px-3 py-2">{error}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Close
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Profile cards (Angular std-his layout) ───────────────────────────────────

function ProfilePhoto({ src, alt }: { src?: string; alt: string }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) {
    return (
      <div className="h-20 w-20 rounded-md bg-sky-100 flex items-center justify-center shrink-0">
        <User className="h-10 w-10 text-sky-600/70" aria-hidden />
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="h-20 w-20 rounded-md object-cover shrink-0 bg-sky-50"
      onError={() => setBroken(true)}
    />
  )
}

/** Angular student card: photo | firstName, rollNumber, college/course/group/year/section, mobile */
function StudentProfileCard({ row }: { row: AnyRow }) {
  const name = pickText(row, ['firstName', 'studentName', 'fullName'])
  const roll = pickText(row, ['rollNumber', 'hallticketNumber', 'admissionNumber'])
  const collegeCode = pickText(row, ['collegeCode'])
  const courseCode = pickText(row, ['courseCode'])
  const groupCode = pickText(row, ['groupCode'])
  const courseYearName = pickText(row, ['courseYearName'])
  const section = pickText(row, ['section', 'sectionName'])
  const mobile = pickText(row, ['mobile', 'mobileNumber', 'phone'])
  const photo = pickText(row, ['studentPhotoPath', 'photoPath', 'photo'])
  // Angular: collegeCode / courseCode / groupCode / courseYearName / Section {{section}}
  const meta = `${collegeCode} / ${courseCode} / ${groupCode} / ${courseYearName} / Section ${section}`

  return (
    <div className="rounded-md border border-sky-200 bg-sky-50/40 p-3 flex gap-4 items-start">
      <ProfilePhoto src={photo || undefined} alt={name || 'Student'} />
      <div className="text-sm space-y-0.5 min-w-0">
        <p className="font-medium text-foreground">{name || '—'}</p>
        <p className="text-muted-foreground">{roll || '—'}</p>
        <p className="text-muted-foreground break-words">{meta}</p>
        <p className="text-muted-foreground">{mobile || '—'}</p>
      </div>
    </div>
  )
}

/** Angular employee card: photo | firstName, empNumber, empDeptName, mobile */
function EmployeeProfileCard({ row }: { row: AnyRow }) {
  const name = pickText(row, ['firstName', 'employeeName', 'empName', 'name'])
  const empNo = pickText(row, ['empNumber', 'employeeNumber', 'empNo'])
  const dept = pickText(row, ['empDeptName', 'departmentName', 'department', 'deptName'])
  const mobile = pickText(row, ['mobile', 'mobileNumber', 'phone'])
  const photo = pickText(row, ['photoPath', 'photo', 'employeePhotoPath'])

  return (
    <div className="rounded-md border border-sky-200 bg-sky-50/40 p-3 flex gap-4 items-start">
      <ProfilePhoto src={photo || undefined} alt={name || 'Employee'} />
      <div className="text-sm space-y-0.5 min-w-0">
        <p className="font-medium text-foreground">{name || '—'}</p>
        <p className="text-muted-foreground">{empNo || '—'}</p>
        <p className="text-muted-foreground">{dept || '—'}</p>
        <p className="text-muted-foreground">{mobile || '—'}</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentTrainingRegistrationPage() {
  const [mode, setMode] = useState<Mode>('student')
  const [searchRows, setSearchRows] = useState<AnyRow[]>([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedRow, setSelectedRow] = useState<AnyRow | null>(null)
  const [trainings, setTrainings] = useState<PlacementTraining[]>([])
  const [registrations, setRegistrations] = useState<TrainingStudent[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [confirmTraining, setConfirmTraining] = useState<PlacementTraining | null>(null)

  const searchOptions = useMemo(() => {
    if (mode === 'student') {
      return searchRows.map((row) => {
        const id = pickNum(row, ['studentId', 'fk_student_id', 'student_id'])
        const name = pickText(row, ['firstName', 'studentName']) || 'Student'
        const roll = pickText(row, ['rollNumber', 'hallticketNumber'])
        return {
          value: String(id),
          // Angular: {{firstName}} ({{rollNumber}})
          label: roll ? `${name} (${roll})` : name,
        }
      })
    }
    return searchRows.map((row) => {
      const id = pickNum(row, ['employeeId', 'employee_id'])
      const name = pickText(row, ['firstName', 'employeeName', 'empName', 'name']) || 'Employee'
      const empNo = pickText(row, ['empNumber', 'employeeNumber'])
      // Angular screenshot: Ramya T(EMP-26-101)
      return {
        value: String(id),
        label: empNo ? `${name}(${empNo})` : name,
      }
    })
  }, [searchRows, mode])

  const handleSearch = useCallback(
    async (term: string) => {
      // Angular: length > 4
      if (term.trim().length < 5) {
        setSearchRows([])
        return
      }
      setLoadingSearch(true)
      try {
        if (mode === 'student') {
          const rows = await searchStudentsForTrainingRegistration(term)
          setSearchRows(Array.isArray(rows) ? (rows as AnyRow[]) : [])
        } else {
          const rows = await searchEmployeesForTrainingRegistration(term)
          setSearchRows(Array.isArray(rows) ? (rows as AnyRow[]) : [])
        }
      } catch {
        setSearchRows([])
      } finally {
        setLoadingSearch(false)
      }
    },
    [mode],
  )

  const handleSelect = useCallback(
    async (value: string | null) => {
      const id = value ? Number(value) : null
      setSelectedId(id)
      setTrainings([])
      setRegistrations([])

      if (!id) {
        setSelectedRow(null)
        return
      }

      const found =
        searchRows.find((r) => {
          if (mode === 'student') {
            return pickNum(r, ['studentId', 'fk_student_id', 'student_id']) === id
          }
          return pickNum(r, ['employeeId', 'employee_id']) === id
        }) ?? null
      setSelectedRow(found)

      const collegeId = pickNum(found, ['collegeId', 'college_id'])
      setLoadingData(true)
      try {
        // Angular: College.collegeId==X.and.isActive==true.order(createdDt=DESC)
        const [collegeTrainings, regs] = await Promise.all([
          collegeId > 0 ? listTrainingsByCollege(collegeId) : Promise.resolve([]),
          mode === 'student'
            ? listTrainingStudentsByStudent(id)
            : listTrainingStudentsByEmployee(id),
        ])
        setTrainings(collegeTrainings)
        setRegistrations(regs)
      } catch {
        setTrainings([])
        setRegistrations([])
      } finally {
        setLoadingData(false)
      }
    },
    [searchRows, mode],
  )

  function switchMode(next: Mode) {
    setMode(next)
    setSearchRows([])
    setSelectedId(null)
    setSelectedRow(null)
    setTrainings([])
    setRegistrations([])
  }

  const registeredIds = useMemo(
    () => new Set(registrations.map((r) => r.trainingId)),
    [registrations],
  )

  const tableRows = useMemo<TrainingRow[]>(
    () =>
      trainings.map((t) => ({
        ...t,
        registered: registeredIds.has(t.traningId),
      })),
    [trainings, registeredIds],
  )

  async function handleRegister(training: PlacementTraining) {
    if (!selectedId || !selectedRow) return
    // Angular student: { studentId, collegeId: data.collegeId, trainingId, isActive }
    // Angular employee: { employeeId, collegeId: employees[0].collegeId, trainingId, isActive }
    const collegeId =
      mode === 'employee'
        ? pickNum(selectedRow, ['collegeId', 'college_id']) || training.collegeId
        : training.collegeId

    const payload: Partial<TrainingStudent> = {
      trainingId: training.traningId,
      collegeId,
      isActive: true,
    }
    if (mode === 'student') payload.studentId = selectedId
    else payload.employeeId = selectedId

    await createTrainingStudent(payload)

    const updated =
      mode === 'student'
        ? await listTrainingStudentsByStudent(selectedId)
        : await listTrainingStudentsByEmployee(selectedId)
    setRegistrations(updated)
  }

  // Angular displayedColumns: id, trainingTitle, trainingTypeCatDisplayName,
  // trainerName, empName, startDate, isActive, actions
  const columnDefs = useMemo<ColDef<TrainingRow>[]>(
    () => [
      { headerName: 'No.', valueGetter: rowIndexGetter, width: 60, flex: 0 },
      { field: 'trainingTitle', headerName: 'Training', minWidth: 200, flex: 2 },
      {
        field: 'trainingTypeCatDisplayName',
        headerName: 'Training Type',
        minWidth: 150,
        flex: 1.2,
      },
      { field: 'trainerName', headerName: 'Trainer Name', minWidth: 130, flex: 1 },
      {
        headerName: 'Incharge',
        minWidth: 140,
        flex: 1,
        valueGetter: (p) => {
          const row = p.data
          if (!row?.empName) return ''
          return row.empNumber != null
            ? `${row.empName} (${row.empNumber})`
            : row.empName
        },
      },
      {
        headerName: 'Date',
        minWidth: 180,
        flex: 1.2,
        valueGetter: (p) =>
          p.data
            ? `${formatAngularDate(p.data.startDate)} - ${formatAngularDate(p.data.endDate)}`
            : '',
      },
      {
        headerName: 'Status',
        minWidth: 100,
        flex: 0.8,
        cellRenderer: (p: ICellRendererParams<TrainingRow>) => {
          const row = p.data
          if (!row) return null
          return (
            <span
              className={
                row.registered
                  ? 'text-xs font-medium text-green-700'
                  : 'text-xs font-medium text-slate-600'
              }
            >
              {row.registered ? 'Registered' : 'Register'}
            </span>
          )
        },
      },
      {
        headerName: 'Actions',
        width: 120,
        flex: 0,
        pinned: 'right',
        cellRenderer: (p: ICellRendererParams<TrainingRow>) => {
          const row = p.data
          if (!row) return null
          if (row.registered) {
            return <span className="text-muted-foreground text-xs">-</span>
          }
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

  // Angular: table only when trainingsList.length > 0
  const showTable = Boolean(selectedId) && (loadingData || tableRows.length > 0)

  return (
    <FilteredListPage
      title="Training Registration"
      filters={(
        <div className="space-y-4">
          <div className="flex flex-wrap gap-6">
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

          <div className="max-w-md">
            <Select
              label={mode === 'student' ? 'Student' : 'Employee'}
              value={selectedId ? String(selectedId) : null}
              onChange={(v) => void handleSelect(v)}
              options={searchOptions}
              placeholder="Search..."
              searchable
              onSearch={(term) => void handleSearch(term)}
              isLoading={loadingSearch}
              className={SELECT_CLASS}
            />
          </div>

          {selectedRow && mode === 'student' && <StudentProfileCard row={selectedRow} />}
          {selectedRow && mode === 'employee' && <EmployeeProfileCard row={selectedRow} />}
        </div>
      )}
      rowData={showTable ? tableRows : []}
      columnDefs={showTable ? columnDefs : undefined}
      body={!showTable ? null : undefined}
      loading={loadingData}
      pagination
      toolbar={
        showTable
          ? {
              search: true,
              searchPlaceholder: 'Search',
              pdfDocumentTitle: 'Training Registration',
            }
          : undefined
      }
    >
      <ConfirmModal
        training={confirmTraining}
        onClose={() => setConfirmTraining(null)}
        onConfirm={() => handleRegister(confirmTraining!)}
      />
    </FilteredListPage>
  )
}
