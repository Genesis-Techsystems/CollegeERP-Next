'use client'

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Monitor } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { StatusBadge } from '@/common/components/data-display'
import { Table, type TableColumn } from '@/common/components/table'
import { MINIO_URL } from '@/config/constants/api'
import { toastError } from '@/lib/toast'
import {
  fetchStudentDetail,
  loadStudentCurriculumSemester,
  loadStudentCurriculumShell,
  loadStudentProfileTabData,
  normalizeStudentRow,
  type StudentCurriculumSemesterPayload,
  type StudentCurriculumShell,
} from '@/services'
import { StudentAttendanceTab } from './StudentAttendanceTab'
import { StudentBacklogsTab } from './StudentBacklogsTab'
import { StudentExamResultsTab } from './StudentExamResultsTab'
import { StudentFeeTab } from './StudentFeeTab'
import { StudentProfilePrintView } from './StudentProfilePrintView'
import { StudentTimetableTab } from './StudentTimetableTab'

type AnyRow = Record<string, any>

type ProfileTab =
  | 'general'
  | 'personal'
  | 'curriculum'
  | 'timetable'
  | 'attendance'
  | 'fee'
  | 'counselor'
  | 'books'
  | 'exam_results'
  | 'backlogs'
  | 'placements'

const PROFILE_TABS: { id: ProfileTab; label: string }[] = [
  { id: 'general', label: 'General Information' },
  { id: 'personal', label: 'Personal Information' },
  { id: 'curriculum', label: 'Curriculum' },
  { id: 'timetable', label: 'Time Table' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'fee', label: 'Fee Details' },
  { id: 'counselor', label: 'Counselor Meetings' },
  { id: 'books', label: 'Books' },
  { id: 'exam_results', label: 'Exam Results' },
  { id: 'backlogs', label: 'Back Logs' },
  { id: 'placements', label: 'Placements' },
]

/** Angular students-profile: one white card, teal header, gold tab strip. */
const SIS_PROFILE_THEME = {
  headerBg: '#45b3a2',
  accentGold: '#fdd835',
  /** Section titles (Fee, Timetable, Attendance) */
  titleBlue: '#002b5c',
  nameBlue: '#1976d2',
  linkTeal: '#45b3a2',
  labelMuted: '#64748b',
  border: '#e2e8f0',
} as const

function isProfileTab(value: string | null): value is ProfileTab {
  return PROFILE_TABS.some((t) => t.id === value)
}

function pickText(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return ''
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

function mergeDetail(row: AnyRow): AnyRow {
  const chunks = [row.studentDetail, row.StudentDetail, row.studentProfile, row.StudentProfile].filter(
    (v): v is AnyRow => Boolean(v) && typeof v === 'object' && !Array.isArray(v),
  )
  const nested = chunks.reduce<AnyRow>((acc, cur) => ({ ...acc, ...cur }), {})
  const merged: AnyRow = { ...row, ...nested }
  for (const [k, v] of Object.entries(row)) {
    if (Array.isArray(v) && v.length > 0) merged[k] = v
  }
  return merged
}

function photoSrc(row: AnyRow): string {
  const p = pickText(row, ['studentPhotoPath', 'student_photo_path', 'photoPath'])
  if (!p) return '/images/avatars/default_Student.png'
  if (p.startsWith('http')) return p
  const base = MINIO_URL.replace(/\/$/, '')
  const path = p.startsWith('/') ? p : `/${p}`
  return base ? `${base}${path}` : p
}

function statusTone(code: string): 'active' | 'inactive' | 'pending' | 'draft' | 'published' {
  const c = code.toUpperCase().replace(/\s+/g, '')
  if (c === 'INCOLLEGE') return 'active'
  if (c === 'DETAINRECOMMENDED' || c === 'DTND') return 'pending'
  if (c === 'PASSEDOUT') return 'published'
  if (c === 'DISCONTINUED') return 'inactive'
  return 'inactive'
}

function academicPathSlash(row: AnyRow): string {
  const section = pickText(row, ['section', 'sectionName', 'group_section_name', 'groupSectionName'])
  return [
    pickText(row, ['collegeCode', 'college_code', 'collegeName', 'college_name']),
    pickText(row, ['academicYear', 'academic_year']),
    pickText(row, ['courseName', 'course_code']),
    pickText(row, ['groupName', 'group_code', 'groupCode']),
    pickText(row, ['courseYearName', 'course_year_name']),
    section ? `Section ${section}` : '',
  ]
    .filter(Boolean)
    .join(' / ')
}

function courseYearSection(row: AnyRow): string {
  const cy = pickText(row, ['courseYearName', 'course_year_name', 'courseYearCode'])
  const sec = pickText(row, ['section', 'sectionName', 'group_section_name'])
  if (cy && sec) return `${cy} - ${sec}`
  return cy || sec || '-'
}

function formatDate(value: unknown): string {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function InfoLink({ children }: { children: ReactNode }) {
  return <span className="font-medium" style={{ color: SIS_PROFILE_THEME.linkTeal }}>{children}</span>
}

function FieldBlock({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-[12px] mb-1" style={{ color: SIS_PROFILE_THEME.labelMuted }}>
        {label}
      </p>
      <div className="text-[13px] text-slate-900 leading-snug">{value || '-'}</div>
    </div>
  )
}

function FieldColumn({ children }: { children: ReactNode }) {
  return <div className="space-y-5">{children}</div>
}

export default function StudentsProfilePage() {
  const searchParams = useSearchParams()
  const studentId = useMemo(() => Number(searchParams.get('studentId') ?? 0), [searchParams])
  const checkMode = useMemo(() => Number(searchParams.get('check') ?? 0), [searchParams])
  const isPrintProfile = checkMode === 0
  const initialTab = useMemo(() => {
    const tab = searchParams.get('tab')
    return isProfileTab(tab) ? tab : 'general'
  }, [searchParams])

  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState<AnyRow | null>(null)
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  useEffect(() => {
    async function load() {
      if (!studentId) {
        setStudent(null)
        setLoading(false)
        toastError(new Error('Missing student id'), 'Student Details')
        return
      }
      setLoading(true)
      try {
        const row = await fetchStudentDetail(studentId, { check: checkMode })
        if (!row) {
          setStudent(null)
          toastError(new Error('Student not found'), 'Student Details')
          return
        }
        /** Align tab APIs with URL `studentId` — backend payloads sometimes expose a non-FK numeric `id`. */
        setStudent(
          mergeDetail({
            ...normalizeStudentRow(row),
            profileStudentId: studentId,
          }),
        )
      } catch (e) {
        setStudent(null)
        toastError(e, 'Failed to load student details')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [studentId, checkMode])

  const lateral = Boolean(student?.isLateral ?? student?.is_lateral)
  const stCode = student ? String(student.studentStatusCode ?? student.student_status_code ?? '').trim() : ''
  const stDisplay =
    pickText(student, ['studentStatusDisplayName', 'student_status_display_name']) ||
    (stCode === 'INCOLLEGE' ? 'IN COLLEGE' : stCode)

  return (
    <PageContainer className="pb-6">
      {loading ? (
        <p className="text-sm text-slate-600 px-1 py-4">
          {isPrintProfile ? 'Loading student profile…' : 'Loading student details…'}
        </p>
      ) : !student ? (
        <ProfileShell>
          <EmptyState />
        </ProfileShell>
      ) : isPrintProfile ? (
        <ProfileShell>
          <StudentSummaryCard
            student={student}
            lateral={lateral}
            stCode={stCode}
            stDisplay={stDisplay}
            path={academicPathSlash(student)}
          />
          <StudentProfilePrintView student={student} studentId={studentId} />
        </ProfileShell>
      ) : (
        <ProfileShell>
          <ProfileHeaderBar />
          <StudentSummaryCard
            student={student}
            lateral={lateral}
            stCode={stCode}
            stDisplay={stDisplay}
            path={academicPathSlash(student)}
          />
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ProfileTab)}>
            <ProfileTabBar activeTab={activeTab} onTabChange={setActiveTab} />
            <div className="px-5 py-5 min-h-[200px]">
              <TabsContent value="general" className="mt-0">
                <GeneralInformationTab student={student} />
              </TabsContent>
              <TabsContent value="personal" className="mt-0">
                <PersonalInformationTab student={student} />
              </TabsContent>
              <TabsContent value="curriculum" className="mt-0">
                <CurriculumTab student={student} activeTab={activeTab} />
              </TabsContent>
              <TabsContent value="timetable" className="mt-0" forceMount>
                <StudentTimetableTab student={student} activeTab={activeTab} />
              </TabsContent>
              <TabsContent value="attendance" className="mt-0" forceMount>
                <StudentAttendanceTab student={student} activeTab={activeTab} />
              </TabsContent>
              <TabsContent value="fee" className="mt-0" forceMount>
                <StudentFeeTab student={student} activeTab={activeTab} />
              </TabsContent>
              <TabsContent value="counselor" className="mt-0">
                <ProfileLazyTab
                  title="Counselor Meetings"
                  tab="counselor"
                  student={student}
                  activeTab={activeTab}
                  emptyMessage="No counselor meetings found."
                  columns={COUNSELOR_COLUMNS}
                />
              </TabsContent>
              <TabsContent value="books" className="mt-0">
                <ProfileLazyTab
                  title="Books"
                  tab="books"
                  student={student}
                  activeTab={activeTab}
                  emptyMessage="No library book issues found."
                  columns={BOOKS_COLUMNS}
                />
              </TabsContent>
              <TabsContent value="exam_results" className="mt-0">
                <StudentExamResultsTab student={student} activeTab={activeTab} />
              </TabsContent>
              <TabsContent value="backlogs" className="mt-0">
                <StudentBacklogsTab student={student} activeTab={activeTab} />
              </TabsContent>
              <TabsContent value="placements" className="mt-0">
                <ProfileLazyTab
                  title="Placements"
                  tab="placements"
                  student={student}
                  activeTab={activeTab}
                  emptyMessage="No placement records on file. If your college stores these on student profile, they will appear here when present."
                  columns={PLACEMENT_COLUMNS}
                />
              </TabsContent>
            </div>
          </Tabs>
        </ProfileShell>
      )}
    </PageContainer>
  )
}

function ProfileShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-slate-200/90 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.08)]">
      {children}
    </div>
  )
}

function ProfileHeaderBar() {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 border-b bg-white px-4 py-2.5"
      style={{ borderColor: SIS_PROFILE_THEME.border }}
    >
      <div className="flex items-center gap-2">
        <Monitor className="h-4 w-4 shrink-0" style={{ color: SIS_PROFILE_THEME.headerBg }} aria-hidden />
        <h1 className="text-[14px] font-semibold tracking-wide" style={{ color: SIS_PROFILE_THEME.headerBg }}>
          Student Details
        </h1>
      </div>
      <Link
        href="/admin-student-information-system/students-list"
        className="text-[12px] font-medium hover:underline"
        style={{ color: SIS_PROFILE_THEME.linkTeal }}
      >
        Back to Students Search
      </Link>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="p-6">
      <p className="text-sm text-slate-700">No student loaded.</p>
      <Link
        href="/admin-student-information-system/students-list"
        className="inline-block mt-3 text-[13px] hover:underline"
        style={{ color: SIS_PROFILE_THEME.linkTeal }}
      >
        Back to Students Search
      </Link>
    </div>
  )
}

function StudentSummaryCard({
  student,
  lateral,
  stCode,
  stDisplay,
  path,
}: {
  student: AnyRow
  lateral: boolean
  stCode: string
  stDisplay: string
  path: string
}) {
  const name = pickText(student, ['firstName', 'studentName', 'student_name'])
  const ht = pickText(student, ['hallticketNumber', 'rollNumber'])
  const mobile = pickText(student, ['mobileNumber', 'mobile', 'phone'])
  const quota = pickText(student, ['quotaName', 'quotaCode', 'quota_code', 'quota'])
  const category = pickText(student, ['studentCategoryName', 'categoryName', 'casteName', 'category'])
  const admissionDate = formatDate(
    student.admissionDate ?? student.admission_date ?? student.dateOfAdmission ?? student.date_of_admission,
  )

  return (
    <div
      className="flex flex-col gap-4 border-b bg-white px-5 py-4 lg:flex-row lg:items-start"
      style={{ borderColor: SIS_PROFILE_THEME.border }}
    >
      <div className="shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoSrc(student)}
          alt=""
          className="h-[80px] w-[80px] rounded-md border border-slate-200 object-cover bg-slate-50"
        />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5 text-[11px] leading-snug text-slate-600">
        <p className="text-[13px] font-semibold leading-snug">
          <span style={{ color: SIS_PROFILE_THEME.nameBlue }}>{name}</span>{' '}
          <span className="font-semibold" style={{ color: SIS_PROFILE_THEME.nameBlue }}>
            ({lateral ? 'LATERAL' : 'REGULAR'})
          </span>
        </p>
        <p>{ht}</p>
        {path ? <p>{path}</p> : null}
        <p>{mobile || '—'}</p>
      </div>
      <div className="shrink-0 space-y-1 text-[11px] leading-snug lg:min-w-[200px] lg:text-right">
        <SummaryMeta label="Admission Date" value={admissionDate || '—'} />
        <SummaryMeta
          label="Quota"
          value={quota || '—'}
          valueStyle={{ color: SIS_PROFILE_THEME.linkTeal }}
          valueClassName="font-semibold"
        />
        <SummaryMeta label="Category" value={category || '—'} />
        <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
          <span className="font-semibold text-slate-800">Student Status</span>
          <span className="text-slate-400">:</span>
          {stDisplay ? (
            <StatusBadge
              status={statusTone(stCode)}
              label={stDisplay}
              className="border-green-500/40 bg-green-50 font-semibold text-green-700"
            />
          ) : (
            <span className="text-slate-500">—</span>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryMeta({
  label,
  value,
  valueClassName = 'text-slate-600',
  valueStyle,
}: {
  label: string
  value: string
  valueClassName?: string
  valueStyle?: CSSProperties
}) {
  return (
    <p className="whitespace-nowrap">
      <span className="font-semibold text-slate-800">{label}</span>
      <span className="mx-1 text-slate-400">:</span>
      <span className={valueClassName} style={valueStyle}>
        {value}
      </span>
    </p>
  )
}

function ProfileTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: ProfileTab
  onTabChange: (tab: ProfileTab) => void
}) {
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)

  function scrollTabs(dir: -1 | 1) {
    scrollEl?.scrollBy({ left: dir * 160, behavior: 'smooth' })
  }

  return (
    <div
      className="border-y bg-white"
      style={{ borderColor: SIS_PROFILE_THEME.accentGold, borderWidth: '1px 0' }}
    >
      <div className="flex items-stretch">
        <button
          type="button"
          className="shrink-0 border-r px-2 text-slate-500 hover:bg-slate-50"
          style={{ borderColor: SIS_PROFILE_THEME.border }}
          onClick={() => scrollTabs(-1)}
          aria-label="Scroll tabs left"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div
          ref={setScrollEl}
          className="scrollbar-hidden flex flex-1 overflow-x-auto"
          role="tablist"
        >
          {PROFILE_TABS.map((tab) => {
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange(tab.id)}
                className={`shrink-0 border-r px-3 py-2.5 text-[12px] font-medium transition-colors last:border-r-0 ${
                  active ? 'text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
                style={{
                  borderColor: SIS_PROFILE_THEME.border,
                  ...(active ? { backgroundColor: SIS_PROFILE_THEME.headerBg } : {}),
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          className="shrink-0 border-l px-2 text-slate-500 hover:bg-slate-50"
          style={{ borderColor: SIS_PROFILE_THEME.border }}
          onClick={() => scrollTabs(1)}
          aria-label="Scroll tabs right"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function GeneralInformationTab({ student }: { student: AnyRow }) {
  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-3 text-[13px]">
      <FieldColumn>
        <FieldBlock
          label="College"
          value={
            <InfoLink>
              {pickText(student, ['collegeName', 'college_name']) || pickText(student, ['collegeCode']) || '-'}
            </InfoLink>
          }
        />
        <FieldBlock label="Course Year - Section" value={courseYearSection(student)} />
        <FieldBlock
          label="Regulation"
          value={
            <InfoLink>{pickText(student, ['regulationCode', 'regulation_code', 'regulationName']) || '-'}</InfoLink>
          }
        />
      </FieldColumn>
      <FieldColumn>
        <FieldBlock
          label="Course"
          value={<InfoLink>{pickText(student, ['courseName', 'course_code']) || '-'}</InfoLink>}
        />
        <FieldBlock
          label="Academic Year"
          value={<InfoLink>{pickText(student, ['academicYear', 'academic_year']) || '-'}</InfoLink>}
        />
        <FieldBlock
          label="Student Category"
          value={pickText(student, ['studentCategoryName', 'categoryName', 'student_category_name']) || '-'}
        />
      </FieldColumn>
      <FieldColumn>
        <FieldBlock
          label="Course Group"
          value={<InfoLink>{pickText(student, ['groupName', 'group_code', 'courseGroupName']) || '-'}</InfoLink>}
        />
        <FieldBlock
          label="Batch"
          value={<InfoLink>{pickText(student, ['batchName', 'batchCode', 'batch_code', 'batch']) || '-'}</InfoLink>}
        />
        <FieldBlock label="University" value={pickText(student, ['universityName', 'university_name']) || '-'} />
        <FieldBlock
          label="Admission No"
          value={pickText(student, ['admissionNo', 'admission_number', 'admissionNumber']) || '-'}
        />
      </FieldColumn>
    </div>
  )
}

function PersonalInformationTab({ student }: { student: AnyRow }) {
  const fields = [
    { label: 'Email', value: pickText(student, ['email', 'studentEmail', 'stdEmailId', 'student_email']) },
    { label: 'Mobile', value: pickText(student, ['mobileNumber', 'mobile', 'phone', 'student_mobile_no']) },
    { label: 'Father Name', value: pickText(student, ['fatherName', 'stdFatherName', 'father_name']) },
    { label: 'Mother Name', value: pickText(student, ['motherName', 'mother_name']) },
    { label: 'Date of Birth', value: formatDate(student.dateOfBirth ?? student.dob ?? student.date_of_birth) },
    { label: 'Gender', value: pickText(student, ['genderName', 'gender', 'gender_code']) },
    { label: 'Blood Group', value: pickText(student, ['bloodGroupName', 'bloodGroup', 'blood_group']) },
    { label: 'Nationality', value: pickText(student, ['nationalityName', 'nationality']) },
    { label: 'Religion', value: pickText(student, ['religionName', 'religion']) },
    { label: 'Caste', value: pickText(student, ['casteName', 'caste']) },
    { label: 'Aadhar', value: pickText(student, ['aadharNo', 'aadhar_number', 'aadhar']) },
    {
      label: 'Permanent Address',
      value: pickText(student, ['permanentAddress', 'permanent_address', 'address', 'permanentAddress1']),
    },
    {
      label: 'Communication Address',
      value: pickText(student, ['communicationAddress', 'communication_address', 'presentAddress', 'present_address']),
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-3 text-[13px]">
      {fields.map((f) => (
        <FieldBlock key={f.label} label={f.label} value={f.value || '-'} />
      ))}
    </div>
  )
}

type DataTab = Exclude<ProfileTab, 'general' | 'personal'>

function cellText(row: AnyRow, keys: string[]): string {
  return pickText(row, keys) || '-'
}

function sectionLabel(row: AnyRow, kind: 'from' | 'to'): string {
  if (kind === 'from') {
    return pickText(row, ['fromSectionName', 'from_section_name', 'fromSection', 'from_section']) || '-'
  }
  return pickText(row, ['toSectionName', 'to_section_name', 'toSection', 'to_section', 'sectionName']) || '-'
}

function siColumn(label = 'SI.No'): TableColumn<AnyRow> {
  return { id: '_si', label, render: (_r, i) => i + 1 }
}

const COUNSELOR_COLUMNS: TableColumn<AnyRow>[] = [
  siColumn(),
  {
    id: 'date',
    label: 'Date',
    render: (r) =>
      formatDate(r.meetingDate ?? r.meeting_date ?? r.counselorDate ?? r.date ?? r.createdDt) || '-',
  },
  {
    id: 'counselor',
    label: 'Counselor',
    render: (r) =>
      cellText(r, ['counselorName', 'employeeName', 'staffName', 'counselor_name', 'mappedCounselorName']),
  },
  {
    id: 'meetingType',
    label: 'Meeting type',
    render: (r) => cellText(r, ['meetingTypeName', 'meetingType', 'meeting_type', 'counselingType']),
  },
  { id: 'remarks', label: 'Remarks', render: (r) => cellText(r, ['remarks', 'meetingRemarks', 'description', 'notes']) },
]

const BOOKS_COLUMNS: TableColumn<AnyRow>[] = [
  siColumn(),
  { id: 'title', label: 'Book title', render: (r) => cellText(r, ['bookTitle', 'bookName', 'book_name', 'title']) },
  {
    id: 'accession',
    label: 'Accession no',
    render: (r) => cellText(r, ['accessionno', 'accessionNo', 'accession_no', 'bookCode', 'book_code']),
  },
  {
    id: 'issueDate',
    label: 'Issue date',
    render: (r) =>
      formatDate(r.issueFromdate ?? r.issue_from_date ?? r.issueDate ?? r.issue_date ?? r.issuedDate ?? r.bookIssueDate) ||
      '-',
  },
  {
    id: 'returnDate',
    label: 'Return date',
    render: (r) =>
      formatDate(r.issueTodate ?? r.issue_to_date ?? r.returnDate ?? r.return_date ?? r.returnedDate) || '-',
  },
  {
    id: 'issueCode',
    label: 'Issue type',
    render: (r) => cellText(r, ['bookIssuedOnCode', 'book_issued_on_code', 'issueType', 'issue_type']),
  },
  {
    id: 'status',
    label: 'Returned',
    render: (r) =>
      cellText(r, ['isreturned', 'isReturned', 'returnStatus', 'issueStatus', 'bookStatus', 'status']),
  },
]

const PLACEMENT_COLUMNS: TableColumn<AnyRow>[] = [
  siColumn(),
  {
    id: 'company',
    label: 'Company / Drive',
    render: (r) => cellText(r, ['companyName', 'company_name', 'employerName', 'organizationName', 'driveName']),
  },
  {
    id: 'role',
    label: 'Role / title',
    render: (r) =>
      cellText(r, [
        'plaecmentTitle',
        'placementTitle',
        'placement_title',
        'jobRole',
        'role',
        'designation',
        'jobTitle',
        'job_title',
      ]),
  },
  {
    id: 'date',
    label: 'Date',
    render: (r) =>
      formatDate(
        r.placementStartDate ??
          r.placement_start_date ??
          r.interviewDate ??
          r.driveDate ??
          r.placementDate ??
          r.offerDate ??
          r.createdDt,
      ) || '-',
  },
  {
    id: 'status',
    label: 'Status',
    render: (r) => cellText(r, ['placementStatus', 'status', 'offerStatus', 'selectionStatus', 'isActive']),
  },
]

const CURRICULUM_SUBJECT_COLUMNS: TableColumn<AnyRow>[] = [
  siColumn('Sl.No'),
  {
    id: 'academicYear',
    label: 'Academic Year',
    render: (r) => cellText(r, ['academicYear', 'academic_year', 'academicYearName', 'academic_year_name']),
  },
  { id: 'subjectCode', label: 'Subject Code', render: (r) => cellText(r, ['subjectCode', 'subject_code']) },
  { id: 'subjectName', label: 'Subject Name', render: (r) => cellText(r, ['subjectName', 'subject_name']) },
  {
    id: 'subjectType',
    label: 'Subject Type',
    render: (r) => cellText(r, ['subjectTypeName', 'subjectType', 'subject_type_name', 'subject_type']),
  },
]

const ELECTIVE_COLUMNS: TableColumn<AnyRow>[] = [
  siColumn('Sl.No'),
  {
    id: 'electiveGroup',
    label: 'Elective Group',
    render: (r) => cellText(r, ['electiveGroupName', 'elective_group_name', 'groupName', 'electiveGroup']),
  },
  {
    id: 'subject',
    label: 'Subject',
    render: (r) => cellText(r, ['subjectName', 'subject_name', 'subjectCode', 'subject_code']),
  },
  {
    id: 'fromDate',
    label: 'From Date',
    render: (r) => formatDate(r.fromDate ?? r.from_date ?? r.enrollmentFromDate) || '-',
  },
  {
    id: 'toDate',
    label: 'To Date',
    render: (r) => formatDate(r.toDate ?? r.to_date ?? r.enrollmentToDate) || '-',
  },
]

const LAB_BATCH_COLUMNS: TableColumn<AnyRow>[] = [
  siColumn('Sl.No'),
  {
    id: 'course',
    label: 'Course',
    render: (r) => cellText(r, ['courseName', 'course_name', 'courseCode', 'subjectName', 'subject_name']),
  },
  {
    id: 'batch',
    label: 'Batch',
    render: (r) => cellText(r, ['batchName', 'batchCode', 'batch', 'batch_name', 'labBatchName']),
  },
  { id: 'fromDate', label: 'From Date', render: (r) => formatDate(r.fromDate ?? r.from_date) || '-' },
  { id: 'toDate', label: 'To Date', render: (r) => formatDate(r.toDate ?? r.to_date) || '-' },
]

const ACADEMIC_DETAILS_COLUMNS: TableColumn<AnyRow>[] = [
  siColumn('Sl.No'),
  {
    id: 'academicYear',
    label: 'Academic Year',
    render: (r) => cellText(r, ['academicYear', 'academic_year', 'academicYearName', 'academic_year_name']),
  },
  {
    id: 'fromCourseYear',
    label: 'From Course Year',
    render: (r) => cellText(r, ['fromCourseYearName', 'from_course_year_name', 'courseYearName']),
  },
  { id: 'fromSection', label: 'From Section', render: (r) => <InfoLink>{sectionLabel(r, 'from')}</InfoLink> },
  {
    id: 'toCourseYear',
    label: 'To Course Year',
    render: (r) => cellText(r, ['toCourseYearName', 'to_course_year_name', 'courseYearName']),
  },
  { id: 'toSection', label: 'To Section', render: (r) => <InfoLink>{sectionLabel(r, 'to')}</InfoLink> },
  { id: 'fromDate', label: 'From Date', render: (r) => formatDate(r.fromDate ?? r.from_date) || '-' },
  { id: 'toDate', label: 'To Date', render: (r) => formatDate(r.toDate ?? r.to_date) || '-' },
  {
    id: 'studentStatus',
    label: 'Student Status',
    render: (r) => {
      const status =
        pickText(r, ['studentStatusDisplayName', 'student_status_display_name']) ||
        pickText(r, ['studentStatusCode', 'student_status_code', 'studentStatus'])
      const statusDisplay = status === 'INCOLLEGE' ? 'IN COLLEGE' : status
      return statusDisplay ? <span className="font-semibold text-green-700">{statusDisplay}</span> : '-'
    },
  },
]

/** Section titles and semester tab strip (profile shell). */
const PROFILE_SECTION_THEME = {
  titleColor: SIS_PROFILE_THEME.headerBg,
  border: '#90caf9',
} as const

const PROFILE_SIDE_TABLE_TITLE_CLASS = 'text-[13px] font-semibold'
const PROFILE_SIDE_TABLE_EMPTY_CLASS = 'py-2 text-[12px] font-normal'

function CurriculumTab({ student, activeTab }: { student: AnyRow; activeTab: ProfileTab }) {
  const isActive = activeTab === 'curriculum'
  const [shellLoading, setShellLoading] = useState(false)
  const [semesterLoading, setSemesterLoading] = useState(false)
  const [shell, setShell] = useState<StudentCurriculumShell | null>(null)
  const [semesterCache, setSemesterCache] = useState<Record<number, StudentCurriculumSemesterPayload>>({})
  const [semesterId, setSemesterId] = useState(0)

  const defaultSemesterId = useMemo(
    () =>
      num(student, ['courseYearId', 'fk_course_year_id', 'courseYear.courseYearId']) ||
      shell?.semesters[0]?.courseYearId ||
      0,
    [student, shell],
  )

  useEffect(() => {
    if (!isActive) return
    let cancelled = false
    setShellLoading(true)
    setShell(null)
    setSemesterCache({})
    void loadStudentCurriculumShell(student)
      .then((payload) => {
        if (!cancelled) {
          setShell(payload)
          const preferred =
            num(student, ['courseYearId', 'fk_course_year_id', 'courseYear.courseYearId']) ||
            payload.semesters[0]?.courseYearId ||
            0
          setSemesterId(preferred)
        }
      })
      .catch(() => {
        if (!cancelled) setShell(null)
      })
      .finally(() => {
        if (!cancelled) setShellLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [student, isActive])

  useEffect(() => {
    if (!semesterId && defaultSemesterId) setSemesterId(defaultSemesterId)
  }, [defaultSemesterId, semesterId])

  const activeId = semesterId || defaultSemesterId

  useEffect(() => {
    if (!isActive || !activeId || !shell) return
    if (semesterCache[activeId]) return

    let cancelled = false
    setSemesterLoading(true)
    void loadStudentCurriculumSemester(student, activeId, shell.academicDetails)
      .then((payload) => {
        if (!cancelled) {
          setSemesterCache((prev) => ({ ...prev, [activeId]: payload }))
        }
      })
      .finally(() => {
        if (!cancelled) setSemesterLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [student, isActive, activeId, shell, semesterCache])

  if (!isActive) return null

  const semData = semesterCache[activeId]
  const subjects = semData?.subjects ?? []
  const electives = semData?.electives ?? []
  const labBatches = semData?.labBatches ?? []
  const academicDetails = shell?.academicDetails ?? []
  const semesters = shell?.semesters ?? []
  const tableLoading = shellLoading || semesterLoading

  return (
    <div className="space-y-5">
      <h2 className="text-[14px] font-semibold" style={{ color: PROFILE_SECTION_THEME.titleColor }}>
        Student Semester Wise Subjects
      </h2>

      <div
        className="flex overflow-x-auto border"
        style={{ borderColor: PROFILE_SECTION_THEME.border }}
        role="tablist"
        aria-label="Semesters"
      >
        {shellLoading && semesters.length === 0 ? (
          <span className="px-3 py-2 text-[12px] text-slate-600">Loading semesters…</span>
        ) : (
          semesters.map((sem) => {
            const active = activeId === sem.courseYearId
            return (
              <button
                key={sem.courseYearId}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSemesterId(sem.courseYearId)}
                className={`shrink-0 border-r px-3 py-2 text-[11px] font-semibold uppercase tracking-wide last:border-r-0 ${
                  active ? 'text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
                style={{
                  borderColor: PROFILE_SECTION_THEME.border,
                  ...(active ? { backgroundColor: PROFILE_SECTION_THEME.titleColor } : {}),
                }}
              >
                {sem.label}
              </button>
            )
          })
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
        <Table
          rows={subjects}
          columns={CURRICULUM_SUBJECT_COLUMNS}
          loading={tableLoading}
          emptyText="No subjects found for this semester."
          pageSize={0}
          density="compact"
        />
        <div className="space-y-4">
          <Table
            title="Elective Group"
            titleClassName={PROFILE_SIDE_TABLE_TITLE_CLASS}
            titleStyle={{ color: PROFILE_SECTION_THEME.titleColor }}
            rows={electives}
            columns={ELECTIVE_COLUMNS}
            loading={tableLoading}
            emptyText="No Elective subjects are found."
            emptyTextClassName={PROFILE_SIDE_TABLE_EMPTY_CLASS}
            emptyTextStyle={{ color: PROFILE_SECTION_THEME.titleColor }}
            pageSize={0}
            density="compact"
          />
          <Table
            title="Lab Batches"
            titleClassName={PROFILE_SIDE_TABLE_TITLE_CLASS}
            titleStyle={{ color: PROFILE_SECTION_THEME.titleColor }}
            rows={labBatches}
            columns={LAB_BATCH_COLUMNS}
            loading={tableLoading}
            emptyText="No Lab subjects are found."
            emptyTextClassName={PROFILE_SIDE_TABLE_EMPTY_CLASS}
            emptyTextStyle={{ color: PROFILE_SECTION_THEME.titleColor }}
            pageSize={0}
            density="compact"
          />
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <h2 className="text-[14px] font-semibold" style={{ color: PROFILE_SECTION_THEME.titleColor }}>
          Student Academic Details
        </h2>
        <Table
          rows={academicDetails}
          columns={ACADEMIC_DETAILS_COLUMNS}
          loading={shellLoading}
          emptyText="No academic details found."
          pageSize={0}
          density="compact"
        />
      </div>
    </div>
  )
}


function num(row: AnyRow, keys: string[]): number {
  for (const k of keys) {
    const n = Number(row?.[k] ?? 0)
    if (Number.isFinite(n) && n > 0) return n
  }
  return 0
}

function ProfileLazyTab({
  title,
  tab,
  student,
  activeTab,
  columns,
  emptyMessage,
}: {
  title: string
  tab: DataTab
  student: AnyRow
  activeTab: ProfileTab
  columns: TableColumn<AnyRow>[]
  emptyMessage: string
}) {
  const isActive = activeTab === tab
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<AnyRow[]>([])

  useEffect(() => {
    if (!isActive) return
    let cancelled = false
    setLoading(true)
    setRows([])
    void loadStudentProfileTabData(tab, student)
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
  }, [tab, student, isActive])

  if (!isActive) return null

  return (
    <div className="space-y-3">
      <h2 className="text-[14px] font-semibold" style={{ color: PROFILE_SECTION_THEME.titleColor }}>
        {title}
      </h2>
      <Table
        rows={rows}
        columns={columns}
        loading={loading}
        emptyText={emptyMessage}
        pageSize={0}
        density="compact"
      />
    </div>
  )
}
