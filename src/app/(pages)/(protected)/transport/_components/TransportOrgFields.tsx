'use client'

import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import { Select } from '@/common/components/select'
import { useTransportOrgCascade } from '../_lib/use-transport-org-cascade'

type TransportOrgFieldsProps<T extends FieldValues> = {
  control: Control<T>
  organizationId?: number
  orgField?: Path<T>
  transportField?: Path<T>
  onOrganizationChange?: () => void
  orgError?: string
  transportError?: string
  transportRequired?: boolean
}

export function TransportOrgFields<T extends FieldValues>({
  control,
  organizationId,
  orgField = 'organizationId' as Path<T>,
  transportField = 'transportDetailId' as Path<T>,
  onOrganizationChange,
  orgError,
  transportError,
  transportRequired = true,
}: Readonly<TransportOrgFieldsProps<T>>) {
  const { organizations, transportDetails, loadingOrgs, loadingTransport } =
    useTransportOrgCascade(organizationId)

  return (
    <>
      <Controller
        name={orgField}
        control={control}
        render={({ field }) => (
          <Select
            label="Organization *"
            value={field.value != null ? String(field.value) : null}
            onChange={(v) => {
              field.onChange(v ? Number(v) : undefined)
              onOrganizationChange?.()
            }}
            options={organizations}
            placeholder="Select organization"
            searchable
            isLoading={loadingOrgs}
            error={orgError}
          />
        )}
      />
      <Controller
        name={transportField}
        control={control}
        render={({ field }) => (
          <Select
            label={transportRequired ? 'Transport Details *' : 'Transport Details'}
            value={field.value != null ? String(field.value) : null}
            onChange={(v) => field.onChange(v ? Number(v) : undefined)}
            options={transportDetails}
            placeholder="Select transport"
            searchable
            isLoading={loadingTransport}
            disabled={!organizationId}
            error={transportError}
          />
        )}
      />
    </>
  )
}
