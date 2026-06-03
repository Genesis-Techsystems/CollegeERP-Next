'use client'

import { useEffect, useState } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormModal } from '@/common/components/feedback'
import { Select, type SelectOption } from '@/common/components/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  TRANSPORT_FIELD_LABEL_CLASS,
  TRANSPORT_INPUT_CLASS,
  TRANSPORT_MODAL_TITLE_CLASS,
} from '../_lib/modal-styles'
import {
  createTransportDetail,
  listCampusesByOrganization,
  listCollegesByCampus,
  listOrganizations,
  updateTransportDetail,
} from '@/services'
import type { TransportDetail } from '@/types/transport'
import { toastError, toastSuccess } from '@/lib/toast'

const schema = z.object({
  organizationId: z.coerce.number().min(1, 'Organization is required'),
  campusId: z.coerce.number().min(1, 'Campus is required'),
  collegeId: z.coerce.number().min(1, 'College is required'),
  transportName: z.string().min(1, 'Transport name is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface TransportDetailsModalProps {
  open: boolean
  onClose: () => void
  row: TransportDetail | null
  onSaved: () => void
}

export function TransportDetailsModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<TransportDetailsModalProps>) {
  const isEditing = row != null
  const [organizations, setOrganizations] = useState<SelectOption[]>([])
  const [campuses, setCampuses] = useState<SelectOption[]>([])
  const [colleges, setColleges] = useState<SelectOption[]>([])
  const [loadingCampuses, setLoadingCampuses] = useState(false)
  const [loadingColleges, setLoadingColleges] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      organizationId: undefined,
      campusId: undefined,
      collegeId: undefined,
      transportName: '',
      isActive: true,
      reason: 'active',
    },
  })

  const organizationId = watch('organizationId')
  const campusId = watch('campusId')

  useEffect(() => {
    if (!open) return
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
      .catch((err) => {
        toastError(err, 'Failed to load organizations')
      })
    reset(
      row
        ? {
            organizationId: row.organizationId,
            campusId: row.campusId,
            collegeId: row.collegeId,
            transportName: row.transportName ?? '',
            isActive: row.isActive ?? true,
            reason: row.reason ?? 'active',
          }
        : {
            organizationId: undefined,
            campusId: undefined,
            collegeId: undefined,
            transportName: '',
            isActive: true,
            reason: 'active',
          },
    )
  }, [open, row, reset])

  useEffect(() => {
    if (!organizationId) {
      setCampuses([])
      return
    }
    setLoadingCampuses(true)
    void listCampusesByOrganization(organizationId)
      .then((rows) => {
        setCampuses(
          rows.map((c) => ({
            value: String(c.campusId),
            label: c.campusCode ?? c.campusName ?? String(c.campusId),
          })),
        )
      })
      .catch((err) => toastError(err, 'Failed to load campuses'))
      .finally(() => setLoadingCampuses(false))
  }, [organizationId])

  useEffect(() => {
    if (!campusId) {
      setColleges([])
      return
    }
    setLoadingColleges(true)
    void listCollegesByCampus(campusId)
      .then((rows) => {
        setColleges(
          rows.map((c) => ({
            value: String(c.collegeId),
            label: String(c.collegeCode ?? c.collegeName ?? c.collegeId),
          })),
        )
      })
      .catch((err) => toastError(err, 'Failed to load colleges'))
      .finally(() => setLoadingColleges(false))
  }, [campusId])

  async function onSubmit(data: FormValues) {
    const payload = {
      ...data,
      reason: data.isActive ? 'active' : (data.reason?.trim() || 'inactive'),
    }
    try {
      if (isEditing && row?.transportDetailId) {
        await updateTransportDetail(row.transportDetailId, payload)
        toastSuccess('Transport details updated')
      } else {
        await createTransportDetail(payload)
        toastSuccess('Transport details created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, `Failed to ${isEditing ? 'update' : 'create'} transport details`)
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Transport Details' : 'Add Transport Details'}
      titleClassName={TRANSPORT_MODAL_TITLE_CLASS}
      showHeaderDivider
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(onSubmit)()
      }}
      submitLabel="Save"
      cancelLabel="Close"
      isSubmitting={isSubmitting}
      size="xl"
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Controller
            name="organizationId"
            control={control}
            render={({ field }) => (
              <Select
                label="Organization *"
                value={field.value ? String(field.value) : null}
                onChange={(v) => {
                  field.onChange(v ? Number(v) : undefined)
                  setValue('campusId', undefined as unknown as number)
                  setValue('collegeId', undefined as unknown as number)
                }}
                options={organizations}
                placeholder="Select organization"
                searchable
                error={errors.organizationId?.message}
              />
            )}
          />
          <Controller
            name="campusId"
            control={control}
            render={({ field }) => (
              <Select
                label="Campus *"
                value={field.value ? String(field.value) : null}
                onChange={(v) => {
                  field.onChange(v ? Number(v) : undefined)
                  setValue('collegeId', undefined as unknown as number)
                }}
                options={campuses}
                placeholder="Select campus"
                searchable
                isLoading={loadingCampuses}
                disabled={!organizationId}
                error={errors.campusId?.message}
              />
            )}
          />
          <Controller
            name="collegeId"
            control={control}
            render={({ field }) => (
              <Select
                label="College *"
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                options={colleges}
                placeholder="Select college"
                searchable
                isLoading={loadingColleges}
                disabled={!campusId}
                error={errors.collegeId?.message}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="transportName" className={TRANSPORT_FIELD_LABEL_CLASS}>
              Transport Name *
            </Label>
            <Input
              id="transportName"
              className={TRANSPORT_INPUT_CLASS}
              {...register('transportName')}
            />
            {errors.transportName ? (
              <p className="text-xs text-destructive">{errors.transportName.message}</p>
            ) : null}
          </div>
        </div>

        <Controller
          name="isActive"
          control={control}
          render={({ field }) => (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="transportIsActive"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <Label htmlFor="transportIsActive" className={TRANSPORT_FIELD_LABEL_CLASS}>
                  Active
                </Label>
              </div>
              {!field.value ? (
                <div className="max-w-md space-y-1">
                  <Label htmlFor="transportReason" className={TRANSPORT_FIELD_LABEL_CLASS}>
                    Reason
                  </Label>
                  <Input
                    id="transportReason"
                    className={TRANSPORT_INPUT_CLASS}
                    value={watch('reason') ?? ''}
                    onChange={(e) => setValue('reason', e.target.value)}
                    placeholder="Reason for deactivation"
                  />
                </div>
              ) : null}
            </div>
          )}
        />
      </div>
    </FormModal>
  )
}
