'use client'

import { useMemo, useState } from 'react'
import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { useQuery } from '@tanstack/react-query'
import { DataTable, TableCard } from '@/common/components/table'
import { FilterCard, FILTER_CARD_SELECT_CLASS } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { StatusBadge } from '@/common/components/data-display'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { toastError } from '@/lib/toast'
import { listCollegeCertificatesByCollege, listFeeCertificateIssuesByCertificate } from '@/services'
import type { FeeCertificateIssueRow } from '@/types/tc-no-due'
import type { CollegeCertificate } from '@/types/college-certificate'
import { TcPageTitle } from '../_components/TcPageTitle'
import { useTcCollegeCascade } from '../_lib/use-tc-college-cascade'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<FeeCertificateIssueRow>,
  student: {
    headerName: 'Student',
    minWidth: 160,
    valueGetter: (p) => p.data?.studentDetailListDTO?.firstName ?? '—',
  } as ColDef<FeeCertificateIssueRow>,
  certificate: { field: 'certificateName', headerName: 'Certificate', minWidth: 140 } as ColDef<FeeCertificateIssueRow>,
  certificateFor: { field: 'certificateFor', headerName: 'For', minWidth: 100 } as ColDef<FeeCertificateIssueRow>,
  appliedOn: { field: 'appliedOn', headerName: 'Applied On', minWidth: 120 } as ColDef<FeeCertificateIssueRow>,
  collectedAmount: { field: 'collectedAmount', headerName: 'Collected', minWidth: 100 } as ColDef<FeeCertificateIssueRow>,
  status: { field: 'applicationStatusCode', headerName: 'Status', minWidth: 110 } as ColDef<FeeCertificateIssueRow>,
  actions: { headerName: 'Print', minWidth: 90, flex: 0, width: 90 } as ColDef<FeeCertificateIssueRow>,
}

function statusRenderer(p: ICellRendererParams<FeeCertificateIssueRow>) {
  const code = (p.data?.applicationStatusCode ?? '').toLowerCase()
  const active = code === 'tcissued' || code === 'cleared'
  return <StatusBadge status={active} label={p.data?.applicationStatusName ?? p.data?.applicationStatusCode} />
}

function makePrintRenderer(collegeId: number) {
  return (p: ICellRendererParams<FeeCertificateIssueRow>) => {
    const sid = p.data?.studentDetailListDTO?.studentId ?? p.data?.studentId
    if (!sid || p.data?.applicationStatusCode !== 'TCISSUED') return null
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          window.open(
            `/tc-no-due-approval/certificate-requests/printTc?studentId=${sid}&collegeId=${collegeId}`,
            '_blank',
          )
        }}
      >
        Print
      </Button>
    )
  }
}

export default function CertificatesIssuedListPage() {
  const [collegeId, setCollegeId] = useState<string | null>(null)
  const [certificateId, setCertificateId] = useState<string | null>(null)
  const [certificates, setCertificates] = useState<CollegeCertificate[]>([])

  const collegeNum = Number(collegeId ?? 0)
  const certNum = Number(certificateId ?? 0)
  const { colleges, loadingColleges } = useTcCollegeCascade(collegeNum)

  const { data: rows = [], isLoading } = useQuery({
    queryKey: QK.tcNoDue.certIssues(certNum),
    queryFn: () => listFeeCertificateIssuesByCertificate(certNum),
    enabled: certNum > 0,
  })

  const issuedRows = useMemo(
    () =>
      rows.filter(
        (r) => r.applicationStatusCode === 'TCISSUED' || r.applicationStatusCode === 'CLEARED',
      ),
    [rows],
  )

  const columnDefs = useMemo<ColDef<FeeCertificateIssueRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.student,
      COL_DEFS.certificate,
      COL_DEFS.certificateFor,
      COL_DEFS.appliedOn,
      COL_DEFS.collectedAmount,
      { ...COL_DEFS.status, cellRenderer: statusRenderer },
      { ...COL_DEFS.actions, cellRenderer: makePrintRenderer(collegeNum) },
    ],
    [collegeNum],
  )

  return (
    <PageContainer className="space-y-5">
      <TcPageTitle title="Certificates Issued" />

      <FilterCard title="Filters">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="College"
            className={FILTER_CARD_SELECT_CLASS}
            value={collegeId}
            onChange={(v) => {
              setCollegeId(v)
              setCertificateId(null)
              void listCollegeCertificatesByCollege(Number(v))
                .then((list) => {
                  setCertificates(list)
                  if (list[0]) setCertificateId(String(list[0].collegeCertificateId))
                })
                .catch((e) => toastError(e, 'Failed to load certificates'))
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
              label: `${c.certificateName ?? c.certifcateCode}`,
            }))}
            placeholder="Select certificate"
            disabled={!collegeNum}
          />
        </div>
      </FilterCard>

      <TableCard headerLeft={<span className="text-sm font-semibold">Issued certificates</span>} withHeaderBorder={false}>
        <DataTable columnDefs={columnDefs} rowData={issuedRows} loading={isLoading} height="auto" />
      </TableCard>
    </PageContainer>
  )
}
