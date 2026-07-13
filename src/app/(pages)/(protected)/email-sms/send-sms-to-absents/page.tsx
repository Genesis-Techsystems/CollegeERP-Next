'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { History, Send } from 'lucide-react'
import { DatePicker } from '@/common/components/date-picker'
import { Select } from '@/common/components/select'
import { SearchInput } from '@/common/components/search'
import { FilteredPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useCrudList } from '@/hooks/useCrudList'
import { toastError, toastSuccess } from '@/lib/toast'
import { getErrorMessage } from '@/lib/errors'
import { QK } from '@/lib/query-keys'
import {
  fetchAbsentStudentsForSms,
  getDigitalOnlineSyncFilters,
  listSmsHistoryAbsentees,
  listSmsPatternsForAbsent,
  sendBulkSmsToMultiUsers,
  type AnySmsRow,
} from '@/services'

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

function toYmd(d: Date | null): string {
  if (!d) return ''
  return format(d, 'yyyy-MM-dd')
}

function historyRecipient(row: AnySmsRow): { mobile: string; msg: string } {
  const dto = row.messagingRecipientDto
  if (!Array.isArray(dto) || dto.length === 0 || typeof dto[0] !== 'object' || dto[0] === null) {
    return { mobile: '', msg: '' }
  }
  const r = dto[0] as Record<string, unknown>
  return {
    mobile: String(r.mobileNumber ?? r.mobile_number ?? '').trim(),
    msg: String(r.msgContent ?? r.messageContent ?? r.message ?? '').trim(),
  }
}

export default function SendSmsToAbsentsPage() {
  const [mode, setMode] = useState<'1' | '2'>('1')
  const [filtersData, setFiltersData] = useState<AnyRow[]>([])
  const [academicData, setAcademicData] = useState<AnyRow[]>([])
  const [collegeId, setCollegeId] = useState<number | null>(null)
  const [academicYearId, setAcademicYearId] = useState<number | null>(null)
  const [attendanceDay, setAttendanceDay] = useState<Date | null>(() => new Date())
  const [students, setStudents] = useState<AnySmsRow[]>([])
  const [smsHistory, setSmsHistory] = useState<AnySmsRow[]>([])
  const [tableSearch, setTableSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  const { data: patterns } = useCrudList<AnySmsRow>({
    queryKey: QK.emailSms.smsPatternsAbsent(),
    queryFn: listSmsPatternsForAbsent,
  })

  const patternId = useMemo(() => {
    const p = patterns[0] as Record<string, unknown> | undefined
    const id = n(p?.messagePatternId ?? p?.message_pattern_id)
    return id > 0 ? id : 1
  }, [patterns])

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
    return uniq(academicData.filter((r) => n(r.fk_university_id) === univId), 'fk_academic_year_id').sort((a, b) =>
      String(b.academic_year ?? '').localeCompare(String(a.academic_year ?? '')),
    )
  }, [academicData, filtersData, collegeId])

  const defaultAyFromStorage = useMemo(() => {
    const raw = typeof globalThis !== 'undefined' && 'localStorage' in globalThis ? globalThis.localStorage.getItem('academicYearId') : null
    const id = raw ? Number(raw) : 0
    return Number.isFinite(id) && id > 0 ? id : 0
  }, [])

  useEffect(() => {
    if (!collegeId && colleges.length) setCollegeId(n(colleges[0].fk_college_id))
  }, [colleges, collegeId])

  useEffect(() => {
    setAcademicYearId(null)
    setStudents([])
    setSmsHistory([])
  }, [collegeId])

  useEffect(() => {
    if (!academicYearId && academicYears.length) {
      const preferred = academicYears.find((x) => n(x.fk_academic_year_id) === defaultAyFromStorage)
      const curr = [...academicYears].sort((a, b) => n(b.is_curr_ay) - n(a.is_curr_ay))[0]
      setAcademicYearId(n((preferred ?? curr)?.fk_academic_year_id))
    }
  }, [academicYears, academicYearId, defaultAyFromStorage])

  useEffect(() => {
    setStudents([])
    setSmsHistory([])
  }, [academicYearId, attendanceDay, mode])

  const collegeOptions = useMemo(
    () => colleges.map((x) => ({ value: String(n(x.fk_college_id)), label: s(x.college_code) })),
    [colleges],
  )

  const academicYearOptions = useMemo(
    () => academicYears.map((x) => ({ value: String(n(x.fk_academic_year_id)), label: s(x.academic_year) })),
    [academicYears],
  )

  const attendanceYmd = useMemo(() => toYmd(attendanceDay), [attendanceDay])

  const filteredStudents = useMemo(() => {
    const q = tableSearch.trim().toLowerCase()
    if (!q) return students
    return students.filter((row) => {
      const roll = String(row.studentRollNo ?? row.rollNumber ?? '').toLowerCase()
      const name = String(row.studentName ?? row.firstName ?? '').toLowerCase()
      const mob = String(row.mobileNumber ?? row.mobile ?? '').toLowerCase()
      const msg = String(row.message ?? row.messageContent ?? '').toLowerCase()
      return roll.includes(q) || name.includes(q) || mob.includes(q) || msg.includes(q)
    })
  }, [students, tableSearch])

  const filteredHistory = useMemo(() => {
    const q = tableSearch.trim().toLowerCase()
    if (!q) return smsHistory
    return smsHistory.filter((row) => {
      const { mobile, msg } = historyRecipient(row)
      return mobile.toLowerCase().includes(q) || msg.toLowerCase().includes(q)
    })
  }, [smsHistory, tableSearch])

  function clearLists() {
    setStudents([])
    setSmsHistory([])
    setTableSearch('')
  }

  async function runLookup() {
    if (!collegeId || !academicYearId || !attendanceDay) {
      toastError('Please select college, academic year, and date')
      return
    }
    const empId = Number(localStorage.getItem('employeeId') ?? 0) || 1
    const ymd = toYmd(attendanceDay)
    setLoading(true)
    clearLists()
    try {
      if (mode === '1') {
        const payload: Record<string, unknown> = {
          collegeId,
          academicYearId,
          courseId: null,
          courseGroupId: null,
          courseYearId: null,
          groupSectionId: null,
          day: ymd,
          isSmsAlert: true,
          smsTemplateId: 1,
          patternId: 1,
          sentByEmployeeId: empId,
          attendanceDate: ymd,
        }
        const rows = await fetchAbsentStudentsForSms(payload)
        setStudents(rows)
        if (rows.length === 0) toastSuccess('No absentees found.')
      } else {
        const rows = await listSmsHistoryAbsentees({
          date: ymd,
          collegeId,
          patternId,
        })
        setSmsHistory(rows)
        if (rows.length === 0) toastSuccess('No SMS history for this date.')
      }
    } catch (e) {
      toastError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  async function confirmSendSms() {
    if (!collegeId || !attendanceDay) {
      toastError('College and date are required')
      return
    }
    if (students.length === 0) {
      toastError('No students to send')
      return
    }
    const ymd = toYmd(attendanceDay)
    const enriched = students.map((row) => ({
      ...row,
      messageContent: row.message ?? row.messageContent,
      messagingDate: row.messagingDate ?? ymd,
      isSmsAlert: true,
      collegeId,
      patternId,
    }))
    setSending(true)
    try {
      await sendBulkSmsToMultiUsers(enriched)
      toastSuccess('SMS sent successfully')
      setStudents([])
    } catch (e) {
      toastError(getErrorMessage(e))
    } finally {
      setSending(false)
    }
  }

  const historyDateLabel = attendanceYmd || '—'

  return (
    <FilteredPage
      title={mode === '1' ? 'Send SMS to Absents' : 'SMS history — absentees'}
      notice={(
        <RadioGroup
          value={mode}
          onValueChange={(v) => {
            setMode(v as '1' | '2')
            clearLists()
          }}
          className="flex flex-row flex-wrap gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="1" id="mode-send" />
            <Label htmlFor="mode-send" className="cursor-pointer font-normal text-sm">
              Send SMS to absentees
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="2" id="mode-history" />
            <Label htmlFor="mode-history" className="cursor-pointer font-normal text-sm inline-flex items-center gap-1">
              <History className="h-3.5 w-3.5" aria-hidden />
              Sent SMS to absentees
            </Label>
          </div>
        </RadioGroup>
      )}
      filters={(
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <Select
            label="College *"
            value={collegeId ? String(collegeId) : null}
            onChange={(v) => setCollegeId(v ? Number(v) : null)}
            options={collegeOptions}
            searchable
            className="md:col-span-2"
          />
          <Select
            label="Academic Year *"
            value={academicYearId ? String(academicYearId) : null}
            onChange={(v) => setAcademicYearId(v ? Number(v) : null)}
            options={academicYearOptions}
            searchable
            disabled={!collegeId}
            className="md:col-span-2"
          />
          <DatePicker
            label="Date *"
            value={attendanceDay}
            onChange={setAttendanceDay}
            className="md:col-span-2"
            clearable={false}
          />
          <div className="md:col-span-3">
            <Button type="button" onClick={() => void runLookup()} disabled={loading}>
              {loading ? 'Loading…' : mode === '1' ? 'Get Students' : 'Load SMS history'}
            </Button>
          </div>
        </div>
      )}
    >
      {mode === '1' && students.length > 0 ? (
        <div className="app-card p-4 space-y-4">
          <SearchInput
            value={tableSearch}
            onChange={setTableSearch}
            placeholder="Search roll no., name, mobile, message"
            className="max-w-md"
          />
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left font-medium w-14">SI.No</th>
                  <th className="p-2 text-left font-medium">Roll Number</th>
                  <th className="p-2 text-left font-medium">Student</th>
                  <th className="p-2 text-left font-medium">Mobile</th>
                  <th className="p-2 text-left font-medium">Message</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((row) => (
                  <tr key={`${String(row.studentRollNo ?? '')}-${students.indexOf(row)}`} className="border-t">
                    <td className="p-2 tabular-nums text-muted-foreground">{students.indexOf(row) + 1}</td>
                    <td className="p-2">{s(row.studentRollNo ?? row.rollNumber)}</td>
                    <td className="p-2">{s(row.studentName ?? row.firstName)}</td>
                    <td className="p-2 tabular-nums">{s(row.mobileNumber ?? row.mobile)}</td>
                    <td className="p-2">{s(row.message ?? row.messageContent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <Button type="button" onClick={() => void confirmSendSms()} disabled={sending}>
              <Send className="h-4 w-4 mr-1.5" />
              {sending ? 'Sending…' : 'Send SMS'}
            </Button>
          </div>
        </div>
      ) : null}

      {mode === '2' && smsHistory.length > 0 ? (
        <div className="app-card p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">
            SMS history of absentees on{' '}
            <span className="text-primary">{historyDateLabel}</span>
          </p>
          <SearchInput
            value={tableSearch}
            onChange={setTableSearch}
            placeholder="Search mobile or message"
            className="max-w-md"
          />
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left font-medium w-14">SI.No</th>
                  <th className="p-2 text-left font-medium">Mobile Number</th>
                  <th className="p-2 text-left font-medium">Message</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((row, idx) => {
                  const { mobile, msg } = historyRecipient(row)
                  const rid = n(row.messagingId ?? row.id ?? row.messageId)
                  return (
                    <tr key={rid > 0 ? `h-${rid}` : `h-${mobile}-${idx}`} className="border-t">
                      <td className="p-2 tabular-nums text-muted-foreground">{idx + 1}</td>
                      <td className="p-2 tabular-nums">{mobile || '—'}</td>
                      <td className="p-2">{msg || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </FilteredPage>
  )
}
