'use client'

import { useEffect, useState } from 'react'
import type { SelectOption } from '@/common/components/select'
import { listLibraryDetailsByOrganization, listOrganizations } from '@/services'

export function useLibraryOrgLibraryOptions(organizationId?: number, libraryId?: number) {
  const [organizations, setOrganizations] = useState<SelectOption[]>([])
  const [libraries, setLibraries] = useState<SelectOption[]>([])
  const [loadingLibraries, setLoadingLibraries] = useState(false)

  useEffect(() => {
    void listOrganizations().then((rows) => {
      setOrganizations(
        rows.map((o) => ({
          value: String(o.organizationId),
          label: o.orgCode ?? o.orgName ?? String(o.organizationId),
        })),
      )
    })
  }, [])

  useEffect(() => {
    if (!organizationId) {
      setLibraries([])
      return
    }
    setLoadingLibraries(true)
    void listLibraryDetailsByOrganization(organizationId)
      .then((rows) => {
        setLibraries(
          rows.map((lib) => ({
            value: String(lib.libraryId),
            label: lib.libraryCode ?? lib.libraryName ?? String(lib.libraryId),
          })),
        )
      })
      .finally(() => setLoadingLibraries(false))
  }, [organizationId])

  const libraryLabel =
    libraries.find((o) => o.value === String(libraryId))?.label ?? ''

  return { organizations, libraries, loadingLibraries, libraryLabel }
}
