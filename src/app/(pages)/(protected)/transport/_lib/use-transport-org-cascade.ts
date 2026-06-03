'use client'

import { useEffect, useState } from 'react'
import type { SelectOption } from '@/common/components/select'
import { listOrganizations, listTransportDetailsByOrganization } from '@/services'
import { toastError } from '@/lib/toast'

export function useTransportOrgCascade(organizationId?: number) {
  const [organizations, setOrganizations] = useState<SelectOption[]>([])
  const [transportDetails, setTransportDetails] = useState<SelectOption[]>([])
  const [loadingOrgs, setLoadingOrgs] = useState(false)
  const [loadingTransport, setLoadingTransport] = useState(false)

  useEffect(() => {
    setLoadingOrgs(true)
    void listOrganizations()
      .then((orgs) => {
        setOrganizations(
          orgs
            .filter((o) => o.isActive !== false)
            .map((o) => ({
              value: String(o.organizationId),
              label: o.orgCode ?? o.orgName ?? String(o.organizationId),
            })),
        )
      })
      .catch((err) => toastError(err, 'Failed to load organizations'))
      .finally(() => setLoadingOrgs(false))
  }, [])

  useEffect(() => {
    if (!organizationId) {
      setTransportDetails([])
      return
    }
    setLoadingTransport(true)
    void listTransportDetailsByOrganization(organizationId)
      .then((rows) => {
        setTransportDetails(
          rows.map((t) => ({
            value: String(t.transportDetailId),
            label: t.transportName ?? String(t.transportDetailId),
          })),
        )
      })
      .catch((err) => toastError(err, 'Failed to load transport details'))
      .finally(() => setLoadingTransport(false))
  }, [organizationId])

  return { organizations, transportDetails, loadingOrgs, loadingTransport }
}
