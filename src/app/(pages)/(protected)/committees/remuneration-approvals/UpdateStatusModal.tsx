'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FormModal } from '@/common/components/feedback'
import { Select } from '@/common/components/select'
import { GM_CODES } from '@/config/constants/ui'
import { listGeneralDetailsByMaster } from '@/services'
import type { UnivExaminationRemuneration } from '@/types/committees'

const FALLBACK_STATUS_OPTIONS = [
  { value: '318', label: 'Pending' },
  { value: '319', label: 'Approved' },
]

type UpdateStatusModalProps = {
  open: boolean
  onClose: () => void
  row: UnivExaminationRemuneration | null
  onSave: (id: number, remunerationStatusCatDetId: number) => void
  isSubmitting?: boolean
}

export function UpdateStatusModal({
  open,
  onClose,
  row,
  onSave,
  isSubmitting,
}: Readonly<UpdateStatusModalProps>) {
  const [statusId, setStatusId] = useState<string | null>(null)

  const { data: statusOptions = FALLBACK_STATUS_OPTIONS } = useQuery({
    queryKey: ['Committees', 'remunerationApprovalStatus'],
    queryFn: async () => {
      const rows = await listGeneralDetailsByMaster(GM_CODES.REMUNERATION_APPROVALS_STATUS)
      if (!rows.length) return FALLBACK_STATUS_OPTIONS
      return rows.map((item) => ({
        value: String(item.generalDetailId),
        label: String(item.generalDetailDisplayName ?? item.generalDetailCode ?? item.generalDetailId),
      }))
    },
    enabled: open,
    staleTime: Number.POSITIVE_INFINITY,
  })

  useEffect(() => {
    if (!open || !row) return
    setStatusId(
      row.remunerationStatusCatDetId != null ? String(row.remunerationStatusCatDetId) : '318',
    )
  }, [open, row])

  function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!row || !statusId) return
    onSave(row.univExaminationRemunerationId, Number(statusId))
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Update Remuneration Status"
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel="Update"
      size="sm"
    >
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {row?.profileEmployeeName ?? 'Evaluator'}
          {row?.omrSerialNo ? ` — ${row.omrSerialNo}` : ''}
        </p>
        <Select
          label="Status"
          required
          value={statusId}
          onChange={setStatusId}
          options={statusOptions}
          placeholder="Select status"
          searchable
        />
      </div>
    </FormModal>
  )
}
