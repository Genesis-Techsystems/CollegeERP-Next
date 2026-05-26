'use client'

import { useCallback, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FilterCard, FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  appliedOnNow,
  applyTcCertificateWorkflow,
  getStudentDetailForTc,
  listCollegeCertificatesByCollege,
  listFeeCertificateIssuesByStudentAndCertificate,
  listFeeCertificateWorkflows,
  listCertificateIssueStatuses,
  searchStudentsForTc,
} from '@/services'
import type { StudentFeeSearchRow } from '@/types/fees-collection'
import type { TcClearanceRow } from '@/types/tc-no-due'
import { TcPageTitle } from '../_components/TcPageTitle'
import { ClearanceTable } from '../_components/ClearanceTable'
import { ConfirmTcDialog } from '../_components/ConfirmTcDialog'
import { useTcCollegeCascade } from '../_lib/use-tc-college-cascade'
import { TC_CLEARANCE_ROWS } from '../_lib/tc-constants'

function studentLabel(s: StudentFeeSearchRow): string {
  const name = s.firstName ?? 'Student'
  const id = s.hallticketNumber ?? s.rollNumber ?? s.studentId
  return id ? `${name} (${id})` : name
}

export default function SendNoDueApprovalRequestPage() {
  const queryClient = useQueryClient()
  const [collegeId, setCollegeId] = useState<string | null>(null)
  const [academicYearId, setAcademicYearId] = useState<string | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [studentRows, setStudentRows] = useState<StudentFeeSearchRow[]>([])
  const [studentSearchLoading, setStudentSearchLoading] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<StudentFeeSearchRow | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [applying, setApplying] = useState(false)

  const collegeNum = Number(collegeId ?? 0)
  const academicYearNum = Number(academicYearId ?? 0)
  const studentNum = Number(studentId ?? 0)
  const { colleges, academicYears, loadingColleges, loadingYears } = useTcCollegeCascade(collegeNum)

  const { data: tcCerts = [] } = useQuery({
    queryKey: QK.tcNoDue.collegeCerts(collegeNum, 'TC'),
    queryFn: () => listCollegeCertificatesByCollege(collegeNum, 'TC'),
    enabled: collegeNum > 0,
  })
  const tcCert = tcCerts[0]
  const tcCertId = Number(tcCert?.collegeCertificateId ?? 0)

  const { data: statuses = [] } = useQuery({
    queryKey: ['TcNoDue', 'certStatuses'],
    queryFn: listCertificateIssueStatuses,
  })

  const { data: issues = [] } = useQuery({
    queryKey: QK.tcNoDue.studentIssue(studentNum, tcCertId),
    queryFn: () => listFeeCertificateIssuesByStudentAndCertificate(studentNum, tcCertId),
    enabled: studentNum > 0 && tcCertId > 0,
  })

  const issue = issues[0]
  const issueId = Number(issue?.feeCertificateIssueId ?? 0)

  const { data: workflows = [] } = useQuery({
    queryKey: QK.tcNoDue.workflows(issueId),
    queryFn: () => listFeeCertificateWorkflows(issueId),
    enabled: issueId > 0,
  })

  const clearanceRows: TcClearanceRow[] = useMemo(() => {
    const nodueCodes = new Set(
      workflows.map((w) => (w.approvalStatusCode ?? '').toUpperCase()).filter(Boolean),
    )
    const allNodue = workflows.length > 0 && workflows.every((w) => w.approvalStatusCode === 'NODUE')
    return TC_CLEARANCE_ROWS.map((name) => ({
      name,
      isDue: workflows.length === 0 ? true : !allNodue && !nodueCodes.has('NODUE'),
    }))
  }, [workflows])

  const onStudentSearch = useCallback(
    async (term: string) => {
      const q = term.trim()
      if (q.length < 5 || !collegeNum) {
        setStudentRows([])
        return
      }
      setStudentSearchLoading(true)
      try {
        const rows = await searchStudentsForTc({
          collegeId: collegeNum,
          academicYearId: academicYearNum || undefined,
          q,
        })
        setStudentRows(rows)
      } catch (e) {
        toastError(e, 'Student search failed')
        setStudentRows([])
      } finally {
        setStudentSearchLoading(false)
      }
    },
    [collegeNum, academicYearNum],
  )

  const studentOptions = useMemo(() => {
    const base = studentRows.map((s) => ({
      value: String(s.studentId),
      label: studentLabel(s),
    }))
    if (studentId && selectedStudent && !base.some((o) => o.value === studentId)) {
      return [{ value: studentId, label: studentLabel(selectedStudent) }, ...base]
    }
    return base
  }, [studentRows, studentId, selectedStudent])

  async function handleApply() {
    if (!tcCert || !selectedStudent) return
    const appliedStatus = statuses.find((s) => s.generalDetailCode === 'APPLIED')
    if (!appliedStatus?.generalDetailId) {
      toastError(new Error('APPLIED status not configured'), 'Cannot send request')
      return
    }
    setApplying(true)
    try {
      const detail = await getStudentDetailForTc(studentNum)
      await applyTcCertificateWorkflow([
        {
          collegeCertificateId: tcCert.collegeCertificateId,
          applicationStatusId: appliedStatus.generalDetailId,
          collegeId: collegeNum,
          academicYearId: academicYearNum || Number(detail?.academicYearId ?? 0),
          studentId: studentNum,
          appliedOn: appliedOnNow(),
          courseGroupId: Number(detail?.courseGroupId ?? 0) || undefined,
        },
      ])
      toastSuccess('No-due approval request sent')
      await queryClient.invalidateQueries({ queryKey: QK.tcNoDue.studentIssue(studentNum, tcCertId) })
    } catch (e) {
      toastError(e, 'Failed to send no-due request')
    } finally {
      setApplying(false)
      setConfirmOpen(false)
    }
  }

  return (
    <PageContainer className="space-y-5">
      <TcPageTitle title="No Due Approval Request" />

      <FilterCard title="Search student">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="College"
            className={FILTER_CARD_SELECT_CLASS}
            value={collegeId}
            onChange={(v) => {
              setCollegeId(v)
              setAcademicYearId(null)
              setStudentId(null)
              setSelectedStudent(null)
            }}
            options={colleges}
            placeholder="Select college"
            searchable
            isLoading={loadingColleges}
          />
          <Select
            label="Academic year"
            className={FILTER_CARD_SELECT_CLASS}
            value={academicYearId}
            onChange={setAcademicYearId}
            options={academicYears}
            placeholder="Select year"
            searchable
            isLoading={loadingYears}
            disabled={!collegeNum}
          />
          <Select
            label="Student"
            className={FILTER_CARD_SELECT_CLASS}
            value={studentId}
            onChange={(v) => {
              setStudentId(v)
              setSelectedStudent(studentRows.find((r) => String(r.studentId) === v) ?? null)
            }}
            options={studentOptions}
            placeholder="Search student (min 5 chars)"
            searchable
            clearable
            isLoading={studentSearchLoading}
            onSearch={onStudentSearch}
            disabled={!collegeNum}
          />
        </div>
      </FilterCard>

      {studentNum > 0 && (
        <div className="app-card space-y-4 p-4">
          <h2 className="text-sm font-semibold">Department clearances</h2>
          <ClearanceTable rows={clearanceRows} />
          {issue && (
            <p className="text-sm text-muted-foreground">
              TC request status:{' '}
              <span className="font-medium">{issue.applicationStatusName ?? issue.applicationStatusCode}</span>
            </p>
          )}
          <Button
            type="button"
            disabled={!tcCertId}
            onClick={() => setConfirmOpen(true)}
          >
            Send No Due Approval Request
          </Button>
          {!tcCertId && (
            <p className="text-sm text-amber-700">TC certificate is not configured for this college.</p>
          )}
        </div>
      )}

      <ConfirmTcDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Send no-due approval"
        description="Send this student for department no-due clearance?"
        onConfirm={() => void handleApply()}
        loading={applying}
      />
    </PageContainer>
  )
}
