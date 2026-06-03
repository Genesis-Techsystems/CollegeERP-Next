'use client'

import { useEffect, useState } from 'react'
import { FormModal } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { listCertificateIssueStatuses } from '@/services'
import type { FeeCertificateIssueRow } from '@/types/tc-no-due'
import type { GeneralDetail } from '@/types/exam-master'
import { toastError } from '@/lib/toast'

interface IssueCertificateModalProps {
  open: boolean
  onClose: () => void
  row: FeeCertificateIssueRow | null
  defaultAmount?: number
  onSubmit: (payload: FeeCertificateIssueRow) => void
}

export function IssueCertificateModal({
  open,
  onClose,
  row,
  defaultAmount,
  onSubmit,
}: Readonly<IssueCertificateModalProps>) {
  const [statuses, setStatuses] = useState<GeneralDetail[]>([])
  const [applicationStatusId, setApplicationStatusId] = useState('')
  const [collectedAmount, setCollectedAmount] = useState('0')
  const [remarks, setRemarks] = useState('')

  useEffect(() => {
    if (!open) return
    void listCertificateIssueStatuses()
      .then((list) => {
        const code = (row?.certifcateCode ?? '').toUpperCase()
        const filtered =
          code === 'TC'
            ? list.filter((s) => s.generalDetailCode !== 'TCISSUED')
            : list.filter((s) => s.generalDetailCode !== 'CLEARED')
        setStatuses(filtered)
      })
      .catch((e) => toastError(e, 'Failed to load statuses'))
  }, [open, row?.certifcateCode])

  useEffect(() => {
    if (!open || !row) return
    setApplicationStatusId(String(row.applicationStatusId ?? ''))
    setCollectedAmount(String(row.collectedAmount ?? defaultAmount ?? 0))
    setRemarks(String(row.remarks ?? ''))
  }, [open, row, defaultAmount])

  const statusOptions = statuses.map((s) => ({
    value: String(s.generalDetailId),
    label: s.generalDetailName ?? s.generalDetailCode ?? String(s.generalDetailId),
  }))

  function handleSave(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!row || !applicationStatusId) return
    onSubmit({
      ...row,
      applicationStatusId: Number(applicationStatusId),
      collectedAmount: Number(collectedAmount) || 0,
      remarks,
    })
    onClose()
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Update certificate request"
      onSubmit={handleSave}
      submitLabel="Save"
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={applicationStatusId}
            onChange={(v) => setApplicationStatusId(v ?? '')}
            options={statusOptions}
            placeholder="Select status"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Collected amount</Label>
          <Input
            type="number"
            min={0}
            value={collectedAmount}
            onChange={(e) => setCollectedAmount(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Remarks</Label>
          <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </div>
      </div>
    </FormModal>
  )
}
