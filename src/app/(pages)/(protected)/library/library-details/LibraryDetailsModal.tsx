'use client'

import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormModal } from '@/common/components/feedback'
import { Select, type SelectOption } from '@/common/components/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  LIBRARY_FIELD_LABEL_CLASS,
  LIBRARY_INPUT_CLASS,
  LIBRARY_MODAL_TITLE_CLASS,
} from '../_lib/modal-styles'
import {
  createLibraryDetail,
  listCampusesByOrganization,
  listCollegesByCampus,
  listOrganizations,
  listRooms,
  updateLibraryDetail,
} from '@/services'
import type { LibraryDetail } from '@/types/library'
import { toastError, toastSuccess } from '@/lib/toast'

const schema = z.object({
  organizationId: z.coerce.number().min(1, 'Organization is required'),
  campusId: z.coerce.number().min(1, 'Campus is required'),
  collegeId: z.coerce.number().min(1, 'College is required'),
  roomId: z.coerce.number().min(1, 'Room is required'),
  libraryName: z.string().min(1, 'Library name is required'),
  libraryCode: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface LibraryDetailsModalProps {
  open: boolean
  onClose: () => void
  row: LibraryDetail | null
  onSaved: () => void
}

export function LibraryDetailsModal({
  open,
  onClose,
  row,
  onSaved,
}: Readonly<LibraryDetailsModalProps>) {
  const isEditing = row != null
  const [organizations, setOrganizations] = useState<SelectOption[]>([])
  const [campuses, setCampuses] = useState<SelectOption[]>([])
  const [colleges, setColleges] = useState<SelectOption[]>([])
  const [rooms, setRooms] = useState<SelectOption[]>([])
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
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: undefined,
      campusId: undefined,
      collegeId: undefined,
      roomId: undefined,
      libraryName: '',
      libraryCode: '',
      isActive: true,
      reason: 'active',
    },
  })

  const organizationId = watch('organizationId')
  const campusId = watch('campusId')

  useEffect(() => {
    if (!open) return
    void Promise.all([listOrganizations(), listRooms()])
      .then(([orgs, roomRows]) => {
        setOrganizations(
          orgs.map((o) => ({
            value: String(o.organizationId),
            label: o.orgCode ?? o.orgName ?? String(o.organizationId),
          })),
        )
        setRooms(
          roomRows.map((r) => ({
            value: String(r.roomId),
            label: r.roomName ?? r.roomCode ?? String(r.roomId),
          })),
        )
      })
      .catch((err) => {
        toastError(err, 'Failed to load form options')
      })
    reset(
      row
        ? {
            organizationId: row.organizationId,
            campusId: row.campusId,
            collegeId: row.collegeId,
            roomId: row.roomId,
            libraryName: row.libraryName ?? '',
            libraryCode: row.libraryCode ?? '',
            isActive: row.isActive ?? true,
            reason: row.reason ?? 'active',
          }
        : {
            organizationId: undefined,
            campusId: undefined,
            collegeId: undefined,
            roomId: undefined,
            libraryName: '',
            libraryCode: '',
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
      if (isEditing && row?.libraryId) {
        await updateLibraryDetail(row.libraryId, payload)
        toastSuccess('Library details updated')
      } else {
        await createLibraryDetail(payload)
        toastSuccess('Library details created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toastError(err, `Failed to ${isEditing ? 'update' : 'create'} library`)
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Library Details' : 'Add Library Details'}
      titleClassName={LIBRARY_MODAL_TITLE_CLASS}
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
            <Label htmlFor="libraryName" className={LIBRARY_FIELD_LABEL_CLASS}>
              Library Name *
            </Label>
            <Input id="libraryName" className={LIBRARY_INPUT_CLASS} {...register('libraryName')} />
            {errors.libraryName ? (
              <p className="text-xs text-destructive">{errors.libraryName.message}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="libraryCode" className={LIBRARY_FIELD_LABEL_CLASS}>
              Library Code
            </Label>
            <Input id="libraryCode" className={LIBRARY_INPUT_CLASS} {...register('libraryCode')} />
          </div>
          <Controller
            name="roomId"
            control={control}
            render={({ field }) => (
              <Select
                label="Room *"
                value={field.value ? String(field.value) : null}
                onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                options={rooms}
                placeholder="Select room"
                searchable
                error={errors.roomId?.message}
              />
            )}
          />
        </div>

        <Controller
          name="isActive"
          control={control}
          render={({ field }) => (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="libraryIsActive"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <Label htmlFor="libraryIsActive" className={LIBRARY_FIELD_LABEL_CLASS}>
                  Active
                </Label>
              </div>
              {!field.value ? (
                <div className="max-w-md space-y-1">
                  <Label htmlFor="libraryReason" className={LIBRARY_FIELD_LABEL_CLASS}>
                    Reason *
                  </Label>
                  <Input
                    id="libraryReason"
                    className={LIBRARY_INPUT_CLASS}
                    value={watch('reason') ?? ''}
                    onChange={(e) => setValue('reason', e.target.value)}
                    placeholder="Reason for deactivation"
                  />
                  {errors.reason ? (
                    <p className="text-xs text-destructive">{errors.reason.message}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        />
      </div>
    </FormModal>
  )
}
