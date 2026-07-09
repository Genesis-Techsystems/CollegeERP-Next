'use client'

import { useCallback, useEffect, useState } from 'react'
import { ClipboardList, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select } from '@/common/components/select'
import { searchEmployeesForHr } from '@/services/hr-payroll'
import { saveExamInvigilationAllotmentsList } from '@/services/pre-examination'

type AnyRow = Record<string, any>

export type InvigilatorModalContext = {
  collegeId: number
  examTimetableId: number
  collegeCode: string
  courseCode: string
  academicYear: string
  examName: string
  examDate: string
}

export type InvigilatorModalRoom = {
  roomId: number
  roomName?: string
  roomCode?: string
  buildingCode?: string
  blockCode?: string
  floorNo?: string | number
}

type Props = {
  open: boolean
  onClose: () => void
  context: InvigilatorModalContext | null
  room: InvigilatorModalRoom | null
  initialRows: AnyRow[]
  invigDesgs: AnyRow[]
  onSaved: () => void | Promise<void>
}

const pickNum = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return 0
  for (const k of keys) {
    const n = Number(row[k])
    if (n > 0) return n
  }
  return 0
}

const pickText = (row: AnyRow | null | undefined, keys: string[]) => {
  if (!row) return ''
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-1 px-2 py-1">
      <p className="sm:col-span-1 text-[13px] font-medium m-0">{label}</p>
      <p className="sm:col-span-4 text-[13px] font-medium m-0">
        <span className="text-[#0d29ff]">{value}</span>
      </p>
    </div>
  )
}

export function InvigilatorAllotmentModal({
  open,
  onClose,
  context,
  room,
  initialRows,
  invigDesgs,
  onSaved,
}: Props) {
  const [rows, setRows] = useState<AnyRow[]>([])
  const [employeeId, setEmployeeId] = useState<number | null>(null)
  const [designationId, setDesignationId] = useState<number | null>(null)
  const [isActive, setIsActive] = useState(true)
  const [editingAllotmentId, setEditingAllotmentId] = useState<number | null>(null)
  const [employeeOptions, setEmployeeOptions] = useState<{ value: string; label: string }[]>([])
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false)
  const [employeeCache, setEmployeeCache] = useState<AnyRow[]>([])
  const [saving, setSaving] = useState(false)
  const [formOpen, setFormOpen] = useState(true)

  useEffect(() => {
    if (!open) return
    setRows(initialRows.map((r) => ({ ...r })))
    clearForm()
  }, [open, initialRows])

  function clearForm() {
    setEmployeeId(null)
    setDesignationId(null)
    setIsActive(true)
    setEditingAllotmentId(null)
    setEmployeeOptions([])
    setEmployeeCache([])
  }

  const onEmployeeSearch = useCallback(
    async (term: string) => {
      if (!context?.collegeId || term.trim().length < 4) {
        setEmployeeOptions([])
        return
      }
      setEmployeeSearchLoading(true)
      try {
        const list = await searchEmployeesForHr(term, context.collegeId)
        const rows = Array.isArray(list) ? list : []
        setEmployeeCache(rows)
        setEmployeeOptions(
          rows.map((e, i) => ({
            value: String(pickNum(e, ['employeeId', 'fk_employee_id']) || i),
            label: `${pickText(e, ['empNumber', 'employeeCode'])} (${pickText(e, ['firstName', 'employeeName'])})`,
          })),
        )
      } finally {
        setEmployeeSearchLoading(false)
      }
    },
    [context?.collegeId],
  )

  function onUpdateRow() {
    if (!employeeId || !designationId || !context || !room) return

    const emp = employeeCache.find(
      (e) => pickNum(e, ['employeeId', 'fk_employee_id']) === Number(employeeId),
    )
    const desg = invigDesgs.find(
      (d) => Number(d.generalDetailId ?? 0) === Number(designationId),
    )
    if (!emp || !desg) return

    const duplicate = rows.find(
      (r) =>
        Number(r.invigilatorEmpId ?? 0) === Number(employeeId) &&
        Number(r.examInvgAllotmentId ?? r.examInvigilationAllotmentId ?? 0) !==
          Number(editingAllotmentId ?? 0),
    )
    if (duplicate) {
      alert('Same employee already allocated to the same day')
      return
    }

    const nextRow: AnyRow = {
      invigilatorEmpId: employeeId,
      examTimeTableId: context.examTimetableId,
      examTimetableId: context.examTimetableId,
      collegeId: context.collegeId,
      roomId: room.roomId,
      invgdesignationCatId: designationId,
      invigilatorEmpName: pickText(emp, ['firstName', 'employeeName']),
      invigilatorEmpNumber: pickText(emp, ['empNumber', 'employeeCode']),
      invgdesignationCatCode: pickText(desg, ['generalDetailCode']),
      isActive,
      dataDetails: 'oldRoom',
    }

    if (editingAllotmentId) {
      setRows((prev) =>
        prev.map((r) =>
          Number(r.examInvgAllotmentId ?? r.examInvigilationAllotmentId ?? 0) ===
          editingAllotmentId
            ? { ...r, ...nextRow, examInvgAllotmentId: editingAllotmentId }
            : r,
        ),
      )
    } else {
      setRows((prev) => [...prev, nextRow])
    }
    clearForm()
  }

  function onEditRow(row: AnyRow) {
    const id = Number(row.examInvgAllotmentId ?? row.examInvigilationAllotmentId ?? 0)
    const empId = Number(row.invigilatorEmpId ?? 0)
    setEditingAllotmentId(id || null)
    setEmployeeId(empId || null)
    setDesignationId(Number(row.invgdesignationCatId ?? 0) || null)
    setIsActive(row.isActive !== false)
    setEmployeeOptions([
      {
        value: String(empId),
        label: `${row.invigilatorEmpNumber ?? ''} (${row.invigilatorEmpName ?? ''})`,
      },
    ])
    setEmployeeCache([
      {
        employeeId: empId,
        firstName: row.invigilatorEmpName,
        empNumber: row.invigilatorEmpNumber,
      },
    ])
    setFormOpen(true)
  }

  async function onSave() {
    if (!context || !room) return
    if (rows.length === 0) {
      alert('No staff allocated to room')
      return
    }
    setSaving(true)
    try {
      await saveExamInvigilationAllotmentsList(rows)
      await onSaved()
      onClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save invigilator allotment'
      alert(msg)
    } finally {
      setSaving(false)
    }
  }

  if (!context || !room) return null

  const roomLine = [
    room.buildingCode,
    room.blockCode,
    room.floorNo,
    room.roomName,
  ]
    .filter((x) => x != null && String(x).trim() !== '')
    .join(' / ')
  const roomValue = `${roomLine} - ( ${room.roomCode ?? room.roomName ?? ''} )`

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-[950px] max-h-[92vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b border-[#B2EBF2] bg-muted/20">
          <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold">
            <ClipboardList className="h-4 w-4 text-primary" aria-hidden />
            Invigilator Room Allotment
          </DialogTitle>
        </DialogHeader>

        <div className="p-2 space-y-3">
          <div className="rounded-md border-2 border-[#B2EBF2] mx-2 p-2">
            <SummaryRow
              label="Course :"
              value={`${context.collegeCode} / ${context.courseCode} / ${context.academicYear}`}
            />
            <SummaryRow label="Exam :" value={context.examName} />
            <SummaryRow
              label="Exam Timetable :"
              value={`${context.examName} - (${context.examDate})`}
            />
            {room.buildingCode != null && (
              <SummaryRow label="Room :" value={roomValue} />
            )}
          </div>

          <div className="mx-2 rounded-md border border-border overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 bg-muted/40 text-left"
              onClick={() => setFormOpen((v) => !v)}
            >
              <Plus className="h-3.5 w-3.5 text-blue-700" />
              <strong className="text-[13px] text-blue-800">Allot Invigilator</strong>
            </button>
            {formOpen && (
              <div className="p-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-end border-t">
                <div className="md:col-span-5 space-y-1">
                  <Label>
                    Employee <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={employeeId ? String(employeeId) : null}
                    onChange={(v) => setEmployeeId(v ? Number(v) : null)}
                    options={employeeOptions}
                    placeholder="Employee"
                    searchable
                    onSearch={onEmployeeSearch}
                    isLoading={employeeSearchLoading}
                  />
                </div>
                <div className="md:col-span-3 space-y-1">
                  <Label>
                    Invigilator Designation <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={designationId ? String(designationId) : null}
                    onChange={(v) => setDesignationId(v ? Number(v) : null)}
                    options={invigDesgs.map((d, i) => ({
                      value: String(d.generalDetailId ?? i),
                      label: String(d.generalDetailCode ?? d.generalDetailDisplayName ?? '-'),
                    }))}
                    placeholder="Invigilator Designation"
                  />
                </div>
                <div className="md:col-span-1 flex items-center gap-2 pb-2">
                  <Checkbox
                    id="inv-active"
                    checked={isActive}
                    onCheckedChange={(v) => setIsActive(v === true)}
                  />
                  <Label htmlFor="inv-active" className="text-[12px] cursor-pointer">
                    Active
                  </Label>
                </div>
                <div className="md:col-span-3 flex gap-2">
                  <Button type="button" className="h-8 text-[12px] flex-1" onClick={onUpdateRow}>
                    Update
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 text-[12px] flex-1"
                    onClick={clearForm}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="mx-2 mb-2 rounded-md border-2 border-[#B2EBF2] overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-[#C3D9FF]">
                  <th className="px-2 py-2 text-left font-medium w-12">No.</th>
                  <th className="px-2 py-2 text-left font-medium">Invigilator Name</th>
                  <th className="px-2 py-2 text-left font-medium">Invigilator Designation</th>
                  <th className="px-2 py-2 text-left font-medium w-24">Status</th>
                  <th className="px-2 py-2 text-left font-medium w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={`inv-row-${row.examInvgAllotmentId ?? idx}`} className="border-t">
                    <td className="px-2 py-2">{idx + 1}</td>
                    <td className="px-2 py-2">
                      {row.invigilatorEmpName}
                      {row.invigilatorEmpNumber ? (
                        <span className="text-muted-foreground">
                          {' '}
                          ({row.invigilatorEmpNumber})
                        </span>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">{row.invgdesignationCatCode ?? '-'}</td>
                    <td className="px-2 py-2">
                      {row.isActive !== false ? (
                        <span className="text-green-600 font-medium">Active</span>
                      ) : (
                        <span className="text-red-600 font-medium">InActive</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => onEditRow(row)}
                        aria-label="Edit invigilator"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">
                      No invigilators allotted
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="px-4 py-3 border-t gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Close
          </Button>
          <Button type="button" onClick={onSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
