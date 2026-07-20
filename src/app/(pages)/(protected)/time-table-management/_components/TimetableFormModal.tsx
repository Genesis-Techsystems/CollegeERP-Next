'use client'

import { useCallback, useEffect, useState } from 'react'
import { FormModal } from '@/common/components/feedback'
import { DatePicker } from '@/common/components/date-picker'
import { Select, type SelectOption } from '@/common/components/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toastError, toastInfo, toastSuccess } from '@/lib/toast'
import {
  listAcademicYearsForCollege,
  listCollegesForTimetable,
  saveTimetable,
  type TimetableFormPayload,
} from '@/services'

const MODAL_TITLE_CLASS = 'text-[15px] font-semibold leading-none text-[#5da394]'

type TimetableRow = Record<string, unknown>

type TimetableFormModalProps = {
  open: boolean
  onClose: () => void
  row: TimetableRow | null
  existingNames: string[]
  onSaved: () => void
}

function formatDateInput(v: unknown): Date | null {
  if (!v) return null
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? null : d
}

export function TimetableFormModal({
  open,
  onClose,
  row,
  existingNames,
  onSaved,
}: TimetableFormModalProps) {
  const editing = row != null && Number(row.timetableId ?? 0) > 0
  const [saving, setSaving] = useState(false)
  const [colleges, setColleges] = useState<SelectOption[]>([])
  const [academicYears, setAcademicYears] = useState<SelectOption[]>([])

  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [timetableName, setTimetableName] = useState('')
  const [startDate, setStartDate] = useState<Date | null>(new Date())
  const [endDate, setEndDate] = useState<Date | null>(new Date())
  const [isActive, setIsActive] = useState(true)
  const [reason, setReason] = useState('active')

  const loadYears = useCallback(async (cid: number) => {
    try {
      const years = await listAcademicYearsForCollege(cid)
      setAcademicYears(
        years.map((y) => ({
          value: String(y.academicYearId),
          label: String(y.academicYear ?? y.academicYearName ?? y.academicYearId),
        })),
      )
    } catch (e) {
      toastError(e, 'Failed to load academic years')
      setAcademicYears([])
    }
  }, [])

  useEffect(() => {
    if (!open) return
    void (async () => {
      try {
        const list = await listCollegesForTimetable()
        setColleges(
          list.map((c) => ({
            value: String(c.collegeId),
            label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
          })),
        )
      } catch (e) {
        toastError(e, 'Failed to load colleges')
      }
    })()
  }, [open])

  useEffect(() => {
    if (!open) return
    if (row) {
      const cid = Number(row.collegeId ?? 0) || null
      setCollegeId(cid)
      setAcademicYearId(Number(row.academicYearId ?? 0) || null)
      setTimetableName(String(row.timetableName ?? ''))
      setStartDate(formatDateInput(row.startDate) ?? new Date())
      setEndDate(formatDateInput(row.endDate) ?? new Date())
      setIsActive(row.isActive !== false)
      setReason(String(row.reason ?? 'active'))
      if (cid) void loadYears(cid)
    } else {
      setCollegeId(null)
      setAcademicYearId(null)
      setTimetableName('')
      setStartDate(new Date())
      setEndDate(new Date())
      setIsActive(true)
      setReason('active')
      setAcademicYears([])
    }
  }, [open, row, loadYears])

  const handleCollegeChange = (v: string | null) => {
    const cid = v ? Number(v) : null
    setCollegeId(cid)
    setAcademicYearId(null)
    if (cid) void loadYears(cid)
    else setAcademicYears([])
  }

  /** Angular add-timetable-modal `calDays()`. */
  const handleStartDateChange = (d: Date | null) => {
    setStartDate(d)
    if (d && endDate && d.getTime() > endDate.getTime()) {
      toastInfo('From date should be less then To date.')
      setEndDate(d)
    }
  }

  const handleEndDateChange = (d: Date | null) => {
    if (d && startDate && startDate.getTime() > d.getTime()) {
      toastInfo('From date should be less then To date.')
      setEndDate(startDate)
      return
    }
    setEndDate(d)
  }

  const handleSave = async () => {
    if (!collegeId || !academicYearId || !timetableName.trim() || !startDate || !endDate) {
      toastError(null, 'Please fill all required fields')
      return
    }
    const nameLower = timetableName.trim().toLowerCase()
    const duplicate = existingNames.some((n) => {
      const same = n.toLowerCase() === nameLower
      if (!same) return false
      if (!editing) return true
      return String(row?.timetableName ?? '').toLowerCase() !== nameLower
    })
    if (duplicate) {
      toastInfo('Already Timetable exists with same name.')
      return
    }

    setSaving(true)
    try {
      const payload: TimetableFormPayload = {
        collegeId,
        academicYearId,
        timetableName: timetableName.trim(),
        startDate,
        endDate,
        isActive,
        reason: isActive ? 'active' : reason.trim() || 'inactive',
        ...(editing
          ? {
              timetableId: Number(row?.timetableId),
              originalStartDate: String(row?.startDate ?? ''),
              originalEndDate: String(row?.endDate ?? ''),
            }
          : {}),
      }
      await saveTimetable(payload)
      toastSuccess(editing ? 'Timetable updated' : 'Timetable created')
      onSaved()
      onClose()
    } catch (e) {
      toastError(e, 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Timetable' : 'Add Timetable'}
      titleClassName={MODAL_TITLE_CLASS}
      showHeaderDivider
      size="md"
      contentClassName="sm:max-w-lg"
      formClassName="py-1"
      onSubmit={(e) => {
        e.preventDefault()
        void handleSave()
      }}
      submitLabel={saving ? 'Saving…' : 'Save'}
      isSubmitting={saving}
    >
      <div className="flex flex-col gap-3 text-[12px]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="College"
            required
            value={collegeId != null ? String(collegeId) : null}
            onChange={handleCollegeChange}
            options={colleges}
            placeholder="Select an option"
            searchable
          />
          <Select
            label="Academic Year"
            required
            value={academicYearId != null ? String(academicYearId) : null}
            onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
            options={academicYears}
            placeholder="Select an option"
            disabled={!collegeId}
            searchable
          />
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-[12px] font-medium text-slate-700">
              Timetable Name <span className="text-destructive">*</span>
            </Label>
            <Input
              className="h-9 text-[12px]"
              value={timetableName}
              onChange={(e) => setTimetableName(e.target.value)}
              placeholder="Timetable name"
            />
          </div>
          <div className="space-y-1 [&_button]:h-9">
            <DatePicker label="Start Date" value={startDate} onChange={handleStartDateChange} />
          </div>
          <div className="space-y-1 [&_button]:h-9">
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={handleEndDateChange}
              minDate={startDate ?? undefined}
            />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <div className="flex items-center gap-2 pt-0.5">
              <Checkbox
                id="timetable-is-active"
                checked={isActive}
                onCheckedChange={(v) => setIsActive(v === true)}
              />
              <Label htmlFor="timetable-is-active" className="cursor-pointer text-[12px] font-medium">
                Active
              </Label>
            </div>
            {!isActive ? (
              <div className="space-y-1">
                <Label className="text-[12px] text-slate-600">Reason</Label>
                <Input
                  className="h-9 text-[12px]"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for deactivation"
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </FormModal>
  )
}
