'use client'

import { useEffect, useState } from 'react'
import type { SelectOption } from '@/common/components/select'
import { listHostelDetails } from '@/services'
import { toastError } from '@/lib/toast'

export function useHostelSelect() {
  const [hostels, setHostels] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    void listHostelDetails()
      .then((rows) => {
        setHostels(
          rows
            .filter((h) => h.isActive !== false)
            .map((h) => ({
              value: String(h.hostelId),
              label: `${h.hostelCode ?? ''} — ${h.hostelName ?? h.hostelId}`.trim(),
            })),
        )
      })
      .catch((e) => toastError(e, 'Failed to load hostels'))
      .finally(() => setLoading(false))
  }, [])

  return { hostels, loadingHostels: loading }
}
