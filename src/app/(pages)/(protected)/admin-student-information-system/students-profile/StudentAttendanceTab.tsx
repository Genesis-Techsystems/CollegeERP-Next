'use client'

import { useEffect, useMemo, useState } from 'react'
import { Settings } from 'lucide-react'
import {
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
} from 'recharts'
import { Table, type TableColumn } from '@/common/components/table'
import { buildStudentAttendanceView, loadStudentProfileTabData } from '@/services'

type AnyRow = Record<string, unknown>

/** Angular students-profile attendance — matches timetable tab chrome. */
const TITLE_COLOR = '#002b5c'
const HEADER_GOLD_BAR = '#d4af37'
const OUTER_BORDER = '#9ec5e8'
const PRESENT_COLOR = '#4caf50'
const ABSENT_COLOR = '#ff9800'

const FONT_TITLE = 'text-[15px] font-bold'
const FONT_TITLE_SUFFIX = 'text-[15px] font-normal'
const FONT_HELPER = 'text-[12px]'
const HEADER_PY = 'py-3'

type StudentAttendanceTabProps = {
  student: AnyRow
  activeTab: string
}

function pickText(row: AnyRow, keys: string[]): string {
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

function cellText(row: AnyRow, keys: string[]): string {
  return pickText(row, keys) || '-'
}

const ATTENDANCE_COLUMNS: TableColumn<AnyRow>[] = [
  {
    id: '_si',
    label: 'Sl.No',
    render: (_r, i) => i + 1,
  },
  {
    id: 'subject',
    label: 'Subject',
    render: (r) =>
      cellText(r, [
        'Subject_name',
        'Subject_Code',
        'subjectName',
        'subject_name',
        'subjectCode',
        'subject_code',
        'courseName',
        'course_name',
      ]),
  },
  {
    id: 'classesHeld',
    label: 'Classes Held',
    render: (r) =>
      cellText(r, ['Total_classes', 'classesHeld', 'classes_held', 'totalClasses', 'total_classes', 'classHeld']),
  },
  {
    id: 'present',
    label: 'Present',
    render: (r) =>
      cellText(r, ['Present_classes', 'present', 'presentCount', 'present_count', 'noOfPresent', 'presentDays']),
  },
  {
    id: 'absent',
    label: 'Absent',
    render: (r) =>
      cellText(r, ['Absent_classes', 'absent', 'absentCount', 'absent_count', 'noOfAbsent', 'absentDays']),
  },
  {
    id: 'attendancePct',
    label: 'Attendance %',
    render: (r) =>
      cellText(r, [
        'Percentage',
        'attendancePercentage',
        'attendance_percent',
        'presentPercentage',
        'present_percent',
        'attendancePer',
      ]),
  },
]

type CountLabelProps = {
  cx?: number
  cy?: number
  midAngle?: number
  innerRadius?: number
  outerRadius?: number
  value?: number
}

function renderSliceCountLabel({
  cx = 0,
  cy = 0,
  midAngle = 0,
  innerRadius = 0,
  outerRadius = 0,
  value = 0,
}: CountLabelProps) {
  if (!value) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={13}
      fontWeight={700}
    >
      {value}
    </text>
  )
}

function AttendanceDonut({
  totalClasses,
  present,
  absent,
}: {
  totalClasses: number
  present: number
  absent: number
}) {
  const slices = useMemo(
    () =>
      [
        { name: 'Absent', value: absent, color: ABSENT_COLOR },
        { name: 'Present', value: present, color: PRESENT_COLOR },
      ].filter((s) => s.value > 0),
    [absent, present],
  )

  if (totalClasses <= 0 || slices.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-[13px] text-slate-600">
        No attendance summary to display.
      </div>
    )
  }

  return (
    <div className="relative mx-auto h-[280px] w-full max-w-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={slices}
            cx="50%"
            cy="50%"
            innerRadius="62%"
            outerRadius="88%"
            dataKey="value"
            paddingAngle={1}
            labelLine={false}
            label={renderSliceCountLabel}
          >
            {slices.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
        </RechartsPieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="text-center text-[13px] font-semibold leading-snug text-slate-800">
          <p>Total Classes:</p>
          <p className="text-[15px]">{totalClasses}</p>
        </div>
      </div>
    </div>
  )
}

export function StudentAttendanceTab({ student, activeTab }: StudentAttendanceTabProps) {
  const isActive = activeTab === 'attendance'
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<AnyRow[]>([])

  useEffect(() => {
    if (!isActive) return
    let cancelled = false
    setLoading(true)
    setRows([])

    void loadStudentProfileTabData('attendance', student)
      .then((data) => {
        if (!cancelled) setRows(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setRows([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [student, isActive])

  const view = useMemo(() => buildStudentAttendanceView(rows), [rows])

  if (!isActive) return null

  let totalPctLabel = ''
  if (view.totalAttendancePct > 0) totalPctLabel = `${view.totalAttendancePct}%`
  else if (view.totalClasses > 0) totalPctLabel = '—'

  return (
    <div className="student-attendance-angular text-black">
      <div
        className="overflow-hidden rounded-sm bg-white shadow-none"
        style={{ border: `1px solid ${OUTER_BORDER}` }}
      >
        <header className="bg-white">
          <div className={`flex flex-wrap items-center justify-between gap-2 px-4 ${HEADER_PY}`}>
            <div className="flex items-center gap-2.5">
              <Settings className="h-[18px] w-[18px] shrink-0" style={{ color: TITLE_COLOR }} aria-hidden />
              <h2 className={`${FONT_TITLE} leading-tight`} style={{ color: TITLE_COLOR }}>
                Attendance Report
              </h2>
            </div>
            <p className={`${FONT_TITLE_SUFFIX} text-slate-800`} style={{ color: TITLE_COLOR }}>
              <span className="font-semibold">Total Attendance :</span>{' '}
              {totalPctLabel ? <span className="font-bold">{totalPctLabel}</span> : null}
            </p>
          </div>
          <div className="h-[3px] w-full shrink-0" style={{ backgroundColor: HEADER_GOLD_BAR }} aria-hidden />
        </header>

        {loading ? (
          <p className={`px-4 py-10 text-center ${FONT_HELPER} text-slate-600`}>Loading attendance…</p>
        ) : view.totalClasses <= 0 && view.subjects.length === 0 ? (
          <p className={`px-4 py-10 text-center ${FONT_HELPER} text-slate-600`}>
            No attendance records found for this student.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] lg:items-start">
            <AttendanceDonut
              totalClasses={view.totalClasses}
              present={view.present}
              absent={view.absent}
            />
            <Table
              rows={view.subjects}
              columns={ATTENDANCE_COLUMNS}
              loading={loading}
              emptyText="No subject-wise attendance found."
              pageSize={0}
              density="compact"
            />
          </div>
        )}
      </div>
    </div>
  )
}
