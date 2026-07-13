'use client'

import { useCallback, useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { UserCircle2 } from 'lucide-react'
import { Select } from '@/common/components/select'
import { FilteredListPage } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  appliedOnNow,
  applyTcCertificateWorkflow,
  getStudentDetailForTc,
  listCollegeCertificatesByCollege,
  listFeeCertificateIssuesByStudentAndCertificate,
  listFeeCertificateWorkflows,
  listCertificateIssueStatuses,
  listStudentFeeStructuresByStudent,
  searchStudentsForTc,
} from '@/services'
import type { StudentFeeStructureRow, StudentFeeSearchRow } from '@/types/fees-collection'
import { ConfirmTcDialog } from '../_components/ConfirmTcDialog'
import { useTcCollegeCascade } from '../_lib/use-tc-college-cascade'
import {
  TC_GENERAL_PROGRESS_OPTIONS,
  TC_QUALIFIED_OPTIONS,
} from '../_lib/tc-constants'

function studentLabel(s: StudentFeeSearchRow): string {
  const name = s.firstName ?? 'Student'
  const id = s.hallticketNumber ?? s.rollNumber ?? s.studentId
  return id ? `${name} (${id})` : name
}

const FEE_COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<StudentFeeStructureRow>,
  classGroupName: { field: 'classGroupName', headerName: 'Class Group', minWidth: 140 } as ColDef<StudentFeeStructureRow>,
  grossAmount: { field: 'grossAmount', headerName: 'Gross', minWidth: 90 } as ColDef<StudentFeeStructureRow>,
  netAmount: { field: 'netAmount', headerName: 'Net', minWidth: 90 } as ColDef<StudentFeeStructureRow>,
  paidAmount: { field: 'paidAmount', headerName: 'Paid', minWidth: 90 } as ColDef<StudentFeeStructureRow>,
  balanceAmount: { field: 'balanceAmount', headerName: 'Balance', minWidth: 100 } as ColDef<StudentFeeStructureRow>,
}

const TC_STATUS_OPTIONS = [{ value: 'IN COLLEGE', label: 'IN COLLEGE' }]

function balanceRenderer(p: ICellRendererParams<StudentFeeStructureRow>) {
  const bal = Number(p.data?.balanceAmount ?? 0)
  return (
    <span className={bal > 0 ? 'font-medium text-amber-700' : 'font-medium text-emerald-700'}>
      {bal > 0 ? 'Due' : 'Paid'}
    </span>
  )
}

export default function TransferCertificatePage() {
  const queryClient = useQueryClient()
  const [collegeId, setCollegeId] = useState<string | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [studentRows, setStudentRows] = useState<StudentFeeSearchRow[]>([])
  const [studentSearchLoading, setStudentSearchLoading] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<StudentFeeSearchRow | null>(null)
  const [qualified, setQualified] = useState('')
  const [generalProgress, setGeneralProgress] = useState('')
  const [reason, setReason] = useState('')
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [tcStatus, setTcStatus] = useState('IN COLLEGE')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [applying, setApplying] = useState(false)

  const collegeNum = Number(collegeId ?? 0)
  const studentNum = Number(studentId ?? 0)
  const { colleges, loadingColleges } = useTcCollegeCascade(collegeNum)

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

  const { data: feeRows = [], isLoading: feeLoading } = useQuery({
    queryKey: QK.feesCollection.studentStructures(studentNum),
    queryFn: () => listStudentFeeStructuresByStudent(studentNum),
    enabled: studentNum > 0,
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

  const canApply = tcCertId > 0 && studentNum > 0 && (!issue || issue.applicationStatusCode === 'REJECTED')

  const onStudentSearch = useCallback(
    async (term: string) => {
      const q = term.trim()
      if (q.length < 5 || !collegeNum) {
        setStudentRows([])
        return
      }
      setStudentSearchLoading(true)
      try {
        const rows = await searchStudentsForTc({ collegeId: collegeNum, q })
        setStudentRows(rows)
      } catch (e) {
        toastError(e, 'Student search failed')
        setStudentRows([])
      } finally {
        setStudentSearchLoading(false)
      }
    },
    [collegeNum],
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

  const feeColumnDefs = useMemo<ColDef<StudentFeeStructureRow>[]>(
    () => [
      FEE_COL_DEFS.siNo,
      FEE_COL_DEFS.classGroupName,
      FEE_COL_DEFS.grossAmount,
      FEE_COL_DEFS.netAmount,
      FEE_COL_DEFS.paidAmount,
      { ...FEE_COL_DEFS.balanceAmount, cellRenderer: balanceRenderer },
    ],
    [],
  )

  async function handleApply() {
    if (!tcCert || !selectedStudent) return
    const appliedStatus = statuses.find((s) => s.generalDetailCode === 'APPLIED')
    if (!appliedStatus?.generalDetailId) {
      toastError(new Error('APPLIED status not configured'), 'Cannot apply TC')
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
          academicYearId: Number(detail?.academicYearId ?? selectedStudent.academicYearId ?? 0),
          studentId: studentNum,
          appliedOn: appliedOnNow(),
          courseGroupId: Number(detail?.courseGroupId ?? 0) || undefined,
          isWorkFlowFlag: false,
        },
      ])
      toastSuccess('TC application submitted')
      await queryClient.invalidateQueries({ queryKey: QK.tcNoDue.studentIssue(studentNum, tcCertId) })
    } catch (e) {
      toastError(e, 'Failed to apply for TC')
    } finally {
      setApplying(false)
      setConfirmOpen(false)
    }
  }

  return (
    <FilteredListPage
      title="Transfer Certificate"
      filters={(
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="College"
            value={collegeId}
            onChange={(v) => {
              setCollegeId(v)
              setStudentId(null)
              setSelectedStudent(null)
              setStudentRows([])
            }}
            options={colleges}
            placeholder="Select college"
            searchable
            isLoading={loadingColleges}
          />
          <Select
            label="Student"
            value={studentId}
            onChange={(v) => {
              setStudentId(v)
              const pick = studentRows.find((r) => String(r.studentId) === v) ?? null
              setSelectedStudent(pick)
            }}
            options={studentOptions}
            placeholder="Search by name or roll no (min 5 chars)"
            searchable
            clearable
            isLoading={studentSearchLoading}
            onSearch={onStudentSearch}
            disabled={!collegeNum}
          />
        </div>
      )}
      rowData={studentNum > 0 ? feeRows : []}
      columnDefs={feeColumnDefs}
      loading={feeLoading}
      height="auto"
      toolbar={{ search: true, searchPlaceholder: 'Search fee structures…' }}
    >
      {studentNum > 0 && (
        <div className="app-card space-y-4 p-4">
          <h2 className="text-sm font-semibold text-[hsl(var(--card-title))]">TC details</h2>
          <div className="rounded-md border border-[#bdd1ef] bg-[#f9fbff] p-3">
            <div className="flex items-center gap-3">
              <UserCircle2 className="h-16 w-16 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[hsl(var(--card-title))]">
                  {selectedStudent?.firstName ?? 'Student'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedStudent?.hallticketNumber ?? selectedStudent?.rollNumber ?? '—'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedStudent?.collegeCode ?? '—'} / {selectedStudent?.academicYear ?? '—'} /{' '}
                  {selectedStudent?.courseCode ?? '—'} / {selectedStudent?.courseYearName ?? '—'} /{' '}
                  {selectedStudent?.section ?? '—'}
                </p>
                <p className="text-xs text-muted-foreground">{selectedStudent?.mobile ?? '—'}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Transfer date</Label>
              <Input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={tcStatus}
                onChange={(v) => setTcStatus(v ?? 'IN COLLEGE')}
                options={TC_STATUS_OPTIONS}
                placeholder="Select status"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Qualified for promotion</Label>
              <Select
                value={qualified}
                onChange={(v) => setQualified(v ?? '')}
                options={[...TC_QUALIFIED_OPTIONS]}
                placeholder="Select"
              />
            </div>
            <div className="space-y-1.5">
              <Label>General progress</Label>
              <Select
                value={generalProgress}
                onChange={(v) => setGeneralProgress(v ?? '')}
                options={[...TC_GENERAL_PROGRESS_OPTIONS]}
                placeholder="Select"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <div className="space-y-1.5">
              <Label>Reason for leaving</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                className="w-full"
                disabled={!canApply}
                onClick={() => setConfirmOpen(true)}
              >
                Generate
              </Button>
            </div>
          </div>

          {issue && (
            <p className="text-sm text-muted-foreground">
              Application status:{' '}
              <span className="font-medium">{issue.applicationStatusName ?? issue.applicationStatusCode}</span>
            </p>
          )}

          {workflows.length > 0 && (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2 text-left">Stage</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workflows.map((w, i) => (
                    <tr key={w.feeCertificateWorkflowId ?? i} className="border-b">
                      <td className="px-3 py-2">{w.workflowStageName ?? '—'}</td>
                      <td className="px-3 py-2">{w.approvalStatusName ?? w.approvalStatusCode ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {issue?.applicationStatusCode === 'TCISSUED' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  window.open(
                    `/tc-no-due-approval/certificate-requests/printTc?studentId=${studentNum}&collegeId=${collegeNum}`,
                    '_blank',
                  )
                }}
              >
                Print TC
              </Button>
            )}
          </div>
          {!tcCertId && collegeNum > 0 && (
            <p className="text-sm text-amber-700">TC is not configured in College Certificates for this college.</p>
          )}
        </div>
      )}

      <ConfirmTcDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Apply for Transfer Certificate"
        description="Submit TC application for the selected student?"
        onConfirm={() => void handleApply()}
        loading={applying}
      />
    </FilteredListPage>
  )
}
