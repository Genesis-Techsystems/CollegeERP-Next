'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Filter, MessageSquare, Send } from 'lucide-react'
import { DatePicker } from '@/common/components/date-picker'
import { Select } from '@/common/components/select'
import { SearchInput } from '@/common/components/search'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import {
  buildStaffAttendanceNotMarkedSmsMessage,
  listActiveDepartments,
  listGeneralUserAccountColleges,
  listStaffAttendanceNotMarked,
  sendBulkEmailToEmployeesForAttendance,
  sendBulkSmsToMultiUsers,
  type AnySmsRow,
} from '@/services'
import type { College } from '@/types/college'
import type { Department } from '@/types/department'

/** Angular `send-staff-sms` hard-coded sender (system notification). */
const STAFF_ATTENDANCE_FROM_EMAIL = 'dev@gentechsyspro.com'

const n = (v: unknown) => Number(v) || 0
const s = (v: unknown) => {
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return ''
}

function toYmd(d: Date | null): string {
  if (!d) return ''
  return format(d, 'yyyy-MM-dd')
}

export default function SendSmsToStaffAttendancePage() {
  const [mode, setMode] = useState<'1' | '2'>('1')
  const [filterOpen, setFilterOpen] = useState(true)
  const [colleges, setColleges] = useState<College[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [departmentId, setDepartmentId] = useState<number | null>(null)
  const [day, setDay] = useState<Date | null>(() => new Date())
  const [staff, setStaff] = useState<AnySmsRow[]>([])
  const [tableSearch, setTableSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    listGeneralUserAccountColleges()
      .then((c) => {
        setColleges(c)
        if (c.length) setCollegeId((prev) => prev ?? c[0].collegeId)
      })
      .catch(() => setColleges([]))
    listActiveDepartments()
      .then(setDepartments)
      .catch(() => setDepartments([]))
  }, [])

  useEffect(() => {
    setStaff([])
    setTableSearch('')
  }, [mode, collegeId, departmentId, day])

  const collegeOptions = useMemo(
    () =>
      [...colleges]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((c) => ({ value: String(c.collegeId), label: c.collegeCode })),
    [colleges],
  )

  const departmentOptions = useMemo(
    () =>
      departments.map((d) => ({
        value: String(d.departmentId),
        label: `${d.collegeCode ?? ''} - ${d.deptName}`.replace(/^ - /, ''),
      })),
    [departments],
  )

  const filteredStaff = useMemo(() => {
    const q = tableSearch.trim().toLowerCase()
    if (!q) return staff
    return staff.filter((row) => {
      const blob = [
        row.faculty,
        row.emp_number,
        row.subject_name,
        row.subject_type,
        row.SEC_Display_Name,
        row.batch_name,
        row.mobile,
        row.Starttime,
        row.Endtime,
      ]
        .map((x) => String(x ?? '').toLowerCase())
        .join(' ')
      return blob.includes(q)
    })
  }, [staff, tableSearch])

  function resolveLookupIds(): { apiCollegeId: number; apiDeptId: number; formCollegeId: number } | null {
    const ymd = toYmd(day)
    if (!ymd) {
      toastError('Please select a date')
      return null
    }
    if (mode === '1') {
      if (!collegeId) {
        toastError('Please select a college')
        return null
      }
      return { apiCollegeId: collegeId, apiDeptId: 0, formCollegeId: collegeId }
    }
    if (!departmentId) {
      toastError('Please select a department')
      return null
    }
    const dept = departments.find((d) => d.departmentId === departmentId)
    if (!dept) {
      toastError('Department not found')
      return null
    }
    return { apiCollegeId: dept.collegeId, apiDeptId: departmentId, formCollegeId: dept.collegeId }
  }

  async function loadStaff() {
    const ids = resolveLookupIds()
    if (!ids) return
    setLoading(true)
    setStaff([])
    try {
      const ymd = toYmd(day)
      const rows = await listStaffAttendanceNotMarked({
        collegeId: ids.apiCollegeId,
        dateYmd: ymd,
        departmentId: ids.apiDeptId,
      })
      setStaff(rows)
      if (rows.length === 0) toastSuccess('No staff found for this filter.')
    } catch (e) {
      toastError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  async function sendEmailAndSms() {
    const ids = resolveLookupIds()
    if (!ids || staff.length === 0) {
      if (staff.length === 0) toastError('Load staff before sending')
      return
    }
    const smsPayload: AnySmsRow[] = []
    for (const row of staff) {
      const mobile = row.mobile
      if (mobile == null || String(mobile).trim() === '') continue
      const message = buildStaffAttendanceNotMarkedSmsMessage(row)
      smsPayload.push({
        ...row,
        message,
        messageContent: message,
        mobileNumber: mobile,
        patternId: null,
        collegeId: ids.formCollegeId,
        messagingDate: day ?? new Date(),
        isSmsAlert: true,
      })
    }
    if (smsPayload.length === 0) {
      toastError('Staff mobile numbers are empty.')
      return
    }

    const emailRows: AnySmsRow[] = staff.map((row) => {
      const mailContent = buildStaffAttendanceNotMarkedSmsMessage(row)
      const empId = n(row.pk_emp_id ?? row.employeeId ?? row.empId)
      return {
        ...row,
        subject: 'Attednadnce Not Taken',
        mailContent,
        mailContentHtml: mailContent,
        fromEmailId: STAFF_ATTENDANCE_FROM_EMAIL,
        filePath: '',
        collegeId: n(row.emp_college_id ?? row.empCollegeId ?? ids.formCollegeId),
        isEmailAlert: true,
        employeeIds: empId > 0 ? [empId] : [],
      }
    })

    setSending(true)
    try {
      await sendBulkSmsToMultiUsers(smsPayload)
      await sendBulkEmailToEmployeesForAttendance(emailRows)
      toastSuccess('Email and SMS sent successfully')
      setStaff([])
      setTableSearch('')
    } catch (e) {
      toastError(getErrorMessage(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <PageContainer className="space-y-5">
      <RadioGroup
        value={mode}
        onValueChange={(v) => setMode(v as '1' | '2')}
        className="flex flex-row flex-wrap gap-4"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="1" id="mode-all" />
          <Label htmlFor="mode-all" className="cursor-pointer font-normal text-sm">
            All employees
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="2" id="mode-dept" />
          <Label htmlFor="mode-dept" className="cursor-pointer font-normal text-sm">
            Search by department
          </Label>
        </div>
      </RadioGroup>

      <div className="app-card p-0 overflow-hidden">
        <div className="px-4 py-2.5 border-b flex items-center justify-between gap-4">
          <h1 className="text-sm font-semibold text-primary inline-flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Send SMS to Staff (attendance)
          </h1>
          <button
            type="button"
            className="text-sm text-foreground inline-flex items-center gap-1"
            onClick={() => setFilterOpen((v) => !v)}
          >
            Filter
            <Filter className="h-4 w-4" />
          </button>
        </div>
        {filterOpen ? (
          <div className="p-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {mode === '1' ? (
              <Select
                label="College *"
                value={collegeId ? String(collegeId) : null}
                onChange={(v) => setCollegeId(v ? Number(v) : null)}
                options={collegeOptions}
                searchable
                className="md:col-span-3"
              />
            ) : (
              <Select
                label="Department *"
                value={departmentId ? String(departmentId) : null}
                onChange={(v) => setDepartmentId(v ? Number(v) : null)}
                options={departmentOptions}
                searchable
                className="md:col-span-4"
              />
            )}
            <DatePicker label="Date *" value={day} onChange={setDay} className="md:col-span-2" clearable={false} />
            <div className="md:col-span-3">
              <Button type="button" onClick={() => void loadStaff()} disabled={loading}>
                {loading ? 'Loading…' : 'Get Staff'}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {staff.length > 0 ? (
        <div className="app-card p-4 space-y-4">
          <SearchInput
            value={tableSearch}
            onChange={setTableSearch}
            placeholder="Search faculty, subject, mobile…"
            className="max-w-md"
          />
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left font-medium w-14">SI.No</th>
                  <th className="p-2 text-left font-medium">Faculty</th>
                  <th className="p-2 text-left font-medium">Course year</th>
                  <th className="p-2 text-left font-medium">Subject</th>
                  <th className="p-2 text-left font-medium">Subject type</th>
                  <th className="p-2 text-left font-medium">Batch</th>
                  <th className="p-2 text-left font-medium">Time</th>
                  <th className="p-2 text-left font-medium">Mobile</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((row) => {
                  const i = staff.indexOf(row)
                  const isProxy = n(row.is_Proxy) === 1
                  return (
                    <tr key={`${String(row.pk_emp_id ?? row.faculty)}-${i}`} className="border-t">
                      <td className="p-2 tabular-nums text-muted-foreground">{i + 1}</td>
                      <td className={cn('p-2', isProxy && 'text-amber-700 font-medium')}>
                        {s(row.faculty)}
                        {row.emp_number != null && row.emp_number !== '' ? (
                          <span className="text-blue-600 font-medium"> ({s(row.emp_number)})</span>
                        ) : null}
                      </td>
                      <td className="p-2">{s(row.SEC_Display_Name)}</td>
                      <td className="p-2">{s(row.subject_name)}</td>
                      <td className="p-2">{s(row.subject_type)}</td>
                      <td className="p-2">{row.batch_name != null ? s(row.batch_name) : '—'}</td>
                      <td className="p-2 tabular-nums">
                        {s(row.Starttime)} – {s(row.Endtime)}
                      </td>
                      <td className="p-2 tabular-nums">{s(row.mobile)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <Button type="button" onClick={() => void sendEmailAndSms()} disabled={sending}>
              <Send className="h-4 w-4 mr-1.5" />
              {sending ? 'Sending…' : 'Send Email & SMS'}
            </Button>
          </div>
        </div>
      ) : null}
    </PageContainer>
  )
}
