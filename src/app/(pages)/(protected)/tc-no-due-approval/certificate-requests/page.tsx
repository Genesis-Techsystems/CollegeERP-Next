'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DataTable } from '@/common/components/table'
import { FilterCard, FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { toastError, toastSuccess } from '@/lib/toast'
import {
  listCollegeCertificatesByCollege,
  listFeeCertificateIssuesByCertificate,
  listOrganizations,
  updateCertificateIssueAmount,
} from '@/services'
import type { FeeCertificateIssueRow } from '@/types/tc-no-due'
import type { CollegeCertificate } from '@/types/college-certificate'
import { TcPageTitle } from '../_components/TcPageTitle'
import { useTcCollegeCascade } from '../_lib/use-tc-college-cascade'
import { IssueCertificateModal } from './IssueCertificateModal'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<FeeCertificateIssueRow>,
  student: {
    headerName: 'Student',
    minWidth: 160,
    valueGetter: (p) =>
      p.data?.studentDetailListDTO?.firstName ??
      p.data?.studentDetailListDTO?.rollNumber ??
      '—',
  } as ColDef<FeeCertificateIssueRow>,
  certificate: { field: 'certificateName', headerName: 'Certificate', minWidth: 140 } as ColDef<FeeCertificateIssueRow>,
  certificateFor: { field: 'certificateFor', headerName: 'Certificate For', minWidth: 120 } as ColDef<FeeCertificateIssueRow>,
  appliedOn: { field: 'appliedOn', headerName: 'Applied On', minWidth: 120 } as ColDef<FeeCertificateIssueRow>,
  status: { field: 'applicationStatusCode', headerName: 'Status', minWidth: 110 } as ColDef<FeeCertificateIssueRow>,
  actions: { headerName: 'Actions', minWidth: 100, flex: 0, width: 100 } as ColDef<FeeCertificateIssueRow>,
}

function statusRenderer(p: ICellRendererParams<FeeCertificateIssueRow>) {
  const code = (p.data?.applicationStatusCode ?? '').toLowerCase()
  const active = code === 'cleared' || code === 'tcissued' || code === 'approved'
  return <StatusBadge status={active} label={p.data?.applicationStatusName ?? p.data?.applicationStatusCode} />
}

function makeActionsRenderer(
  onEdit: (row: FeeCertificateIssueRow) => void,
) {
  return (p: ICellRendererParams<FeeCertificateIssueRow>) => (
    <Button type="button" size="sm" variant="ghost" onClick={() => p.data && onEdit(p.data)}>
      Update
    </Button>
  )
}

export default function CertificateRequestsPage() {
  const queryClient = useQueryClient()
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [collegeId, setCollegeId] = useState<string | null>(null)
  const [certificateId, setCertificateId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<FeeCertificateIssueRow | null>(null)
  const [certificates, setCertificates] = useState<CollegeCertificate[]>([])

  const collegeNum = Number(collegeId ?? 0)
  const certNum = Number(certificateId ?? 0)
  const { colleges, loadingColleges } = useTcCollegeCascade(collegeNum)

  const { data: orgs = [] } = useQuery({
    queryKey: ['TcNoDue', 'organizations'],
    queryFn: listOrganizations,
  })

  const orgOptions = useMemo(
    () =>
      orgs.map((o) => ({
        value: String(o.organizationId),
        label: o.orgCode ?? o.orgName ?? String(o.organizationId),
      })),
    [orgs],
  )

  const { data: rows = [], isLoading } = useQuery({
    queryKey: QK.tcNoDue.certIssues(certNum),
    queryFn: () => listFeeCertificateIssuesByCertificate(certNum),
    enabled: certNum > 0,
  })

  const pendingRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.applicationStatusCode !== 'TCISSUED' && r.applicationStatusCode !== 'CLEARED',
      ),
    [rows],
  )

  const certAmount = certificates.find((c) => c.collegeCertificateId === certNum)?.amount

  async function loadCertificates(colId: number) {
    try {
      const list = await listCollegeCertificatesByCollege(colId)
      setCertificates(list)
    } catch (e) {
      toastError(e, 'Failed to load certificates')
      setCertificates([])
    }
  }

  const columnDefs = useMemo<ColDef<FeeCertificateIssueRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.student,
      COL_DEFS.certificate,
      COL_DEFS.certificateFor,
      COL_DEFS.appliedOn,
      { ...COL_DEFS.status, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer((row) => { setEditing(row); setModalOpen(true) }) },
    ],
    [],
  )

  async function handleIssueSubmit(payload: FeeCertificateIssueRow) {
    try {
      await updateCertificateIssueAmount(payload)
      toastSuccess('Certificate request updated')
      await queryClient.invalidateQueries({ queryKey: QK.tcNoDue.certIssues(certNum) })
    } catch (e) {
      toastError(e, 'Update failed')
    }
  }

  return (
    <PageContainer className="space-y-5">
      <TcPageTitle title="Certificate Requests" />

      <FilterCard title="Certificates">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="Organization"
            className={FILTER_CARD_SELECT_CLASS}
            value={organizationId}
            onChange={setOrganizationId}
            options={orgOptions}
            placeholder="Select organization"
            searchable
          />
          <Select
            label="College"
            className={FILTER_CARD_SELECT_CLASS}
            value={collegeId}
            onChange={(v) => {
              setCollegeId(v)
              setCertificateId(null)
              void loadCertificates(Number(v))
            }}
            options={colleges}
            placeholder="Select college"
            searchable
            isLoading={loadingColleges}
          />
          <Select
            label="Certificate type"
            className={FILTER_CARD_SELECT_CLASS}
            value={certificateId}
            onChange={setCertificateId}
            options={certificates.map((c) => ({
              value: String(c.collegeCertificateId),
              label: `${c.certificateName ?? c.certifcateCode} (${c.certifcateCode})`,
            }))}
            placeholder="Select certificate"
            disabled={!collegeNum}
          />
        </div>
      </FilterCard>

      {certNum > 0 && (
        <DataTable
          columnDefs={columnDefs}
          rowData={pendingRows}
          loading={isLoading}
          height="auto"
        />
      )}

      <IssueCertificateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        row={editing}
        defaultAmount={certAmount}
        onSubmit={(p) => void handleIssueSubmit(p)}
      />
    </PageContainer>
  )
}
