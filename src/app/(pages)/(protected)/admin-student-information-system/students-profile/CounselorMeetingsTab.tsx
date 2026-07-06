'use client'

import { useEffect, useMemo, useState } from 'react'
import { Select } from '@/common/components/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { loadStudentCounselorMappings, pickProfileCell } from '@/services'
import { formatProfileDate } from './profile-utils'

type AnyRow = Record<string, unknown>

const SEM_TAB_CLASS =
  'rounded-none border-b-2 border-transparent px-3 py-2 text-[11px] whitespace-nowrap data-[state=active]:border-[#ffcf46] data-[state=active]:bg-[#ffcf46]/20 data-[state=active]:text-primary data-[state=active]:shadow-none'

const TH_CLASS = 'border border-border bg-[#C3D9FF] px-2 py-1.5 text-left text-xs font-medium'
const TD_CLASS = 'border border-border px-2 py-1.5 text-left text-xs font-medium'

function meetingValue(row: AnyRow, keys: string[]): string {
  const value = pickProfileCell(row, keys)
  return value && value !== '—' ? value : '—'
}

function formatMeetingDate(value: unknown): string {
  if (!value) return '—'
  const parsed = new Date(String(value))
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  return formatProfileDate(value)
}

function counselorActivities(mapping: AnyRow): AnyRow[] {
  const acts = mapping.counselorActivityDTOs ?? mapping.counselorActivities
  return Array.isArray(acts) ? (acts as AnyRow[]) : []
}

function counselorMappingId(mapping: AnyRow): number {
  const id = mapping.counselorId ?? mapping.counselor_id ?? mapping.counselorMappingId
  const n = Number(id)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function counselorOptionLabel(mapping: AnyRow): string {
  const name = meetingValue(mapping, ['empFirstName', 'employeeName', 'counselorName', 'staffName'])
  const empNo = meetingValue(mapping, ['empNumber', 'employeeNumber', 'emp_number'])
  const from = formatMeetingDate(mapping.fromDate ?? mapping.from_date)
  const to = formatMeetingDate(mapping.toDate ?? mapping.to_date)
  const parts = [name]
  if (empNo !== '—') parts.push(`(${empNo})`)
  if (from !== '—' || to !== '—') parts.push(`(${from} - ${to})`)
  return parts.join(' ')
}

function activityStatusCode(row: AnyRow): string {
  return String(row.activityStatusCode ?? row.activity_status_code ?? '').toUpperCase()
}

function MeetingsTable({
  rows,
  dateKey,
  emptyMessage,
  loading,
}: {
  rows: AnyRow[]
  dateKey: 'conducted' | 'scheduled'
  emptyMessage: string
  loading?: boolean
}) {
  if (loading) {
    return <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>
  }

  const dateKeys =
    dateKey === 'scheduled'
      ? ['nextScheduledActivityDate', 'next_scheduled_activity_date', 'scheduleDate', 'scheduledDate']
      : ['activityDate', 'activity_date', 'meetingDate', 'counselingDate']

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className={`${TH_CLASS} w-[3%]`}>SI.No</th>
            <th className={TH_CLASS}>{dateKey === 'scheduled' ? 'Schedule Date' : 'Activity Date'}</th>
            <th className={TH_CLASS}>Activity Type</th>
            <th className={TH_CLASS}>Attendee</th>
            <th className={TH_CLASS}>Relationship</th>
            <th className={TH_CLASS}>Discussion Points</th>
            <th className={TH_CLASS}>Summary</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className={`${TH_CLASS} text-center`}>
                <span className="text-sm font-medium text-destructive">{emptyMessage}</span>
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={`${meetingValue(row, ['activityTypeName', 'activity_type_name'])}-${index}`}
                className={index % 2 === 0 ? 'bg-white' : 'bg-[#f1f6ff]'}
              >
                <td className={TD_CLASS}>{index + 1}</td>
                <td className={TD_CLASS}>{formatMeetingDate(dateKeys.map((k) => row[k]).find(Boolean))}</td>
                <td className={TD_CLASS}>
                  {meetingValue(row, ['activityTypeName', 'activity_type_name', 'activityName'])}
                </td>
                <td className={TD_CLASS}>
                  {meetingValue(row, ['attendeesName', 'attendees_name', 'attendeeName'])}
                </td>
                <td className={TD_CLASS}>{meetingValue(row, ['relationship', 'relation'])}</td>
                <td className={TD_CLASS}>
                  {meetingValue(row, ['discussionPoints', 'discussion_points', 'remarks'])}
                </td>
                <td className={TD_CLASS}>{meetingValue(row, ['summary', 'notes', 'description'])}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export function CounselorMeetingsTab({ student }: { readonly student: AnyRow }) {
  const [counselors, setCounselors] = useState<AnyRow[]>([])
  const [selectedCounselorId, setSelectedCounselorId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('conducted')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const rows = await loadStudentCounselorMappings(student)
        if (cancelled) return
        setCounselors(rows)
        if (rows[0]) {
          const id = counselorMappingId(rows[0])
          setSelectedCounselorId(id > 0 ? String(id) : '0')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [student])

  const counselorOptions = useMemo(
    () =>
      counselors.map((c, index) => {
        const id = counselorMappingId(c) || index + 1
        return { value: String(id), label: counselorOptionLabel(c) }
      }),
    [counselors],
  )

  const selectedMapping = useMemo(() => {
    if (!selectedCounselorId) return null
    return (
      counselors.find((c, index) => {
        const id = counselorMappingId(c) || index + 1
        return String(id) === selectedCounselorId
      }) ?? null
    )
  }, [counselors, selectedCounselorId])

  const { conducted, scheduled } = useMemo(() => {
    const activities = selectedMapping ? counselorActivities(selectedMapping) : []
    return {
      conducted: activities.filter((a) => activityStatusCode(a) === 'COMPLETED'),
      scheduled: activities.filter((a) => activityStatusCode(a) === 'SCHEDULED'),
    }
  }, [selectedMapping])

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
  }

  if (!counselors.length) {
    return (
      <div className="space-y-3 rounded-md border-2 border-[#B2EBF2] p-2">
        <p className="text-base font-medium text-[#0c51a4]">Student Counselor Meetings</p>
        <p className="py-6 text-center text-sm font-medium text-destructive">No counselor meetings found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-md border-2 border-[#B2EBF2] p-2">
      <p className="text-base font-medium text-[#0c51a4]">Student Counselor Meetings</p>

      <Select
        label="Counselor"
        value={selectedCounselorId}
        onChange={setSelectedCounselorId}
        options={counselorOptions}
        placeholder="Select counselor"
        searchable
        className="max-w-xl"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto rounded-sm border border-[#ffcf46]">
          <TabsList className="h-auto min-w-max justify-start rounded-none bg-transparent p-0">
            <TabsTrigger value="conducted" className={SEM_TAB_CLASS}>
              Meetings Conducted
            </TabsTrigger>
            <TabsTrigger value="scheduled" className={SEM_TAB_CLASS}>
              Scheduled Meetings
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="conducted" className="mt-3 p-2">
          <MeetingsTable
            rows={conducted}
            dateKey="conducted"
            emptyMessage="No meetings are conducted."
          />
        </TabsContent>
        <TabsContent value="scheduled" className="mt-3 p-2">
          <MeetingsTable
            rows={scheduled}
            dateKey="scheduled"
            emptyMessage="No meetings are scheduled."
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
