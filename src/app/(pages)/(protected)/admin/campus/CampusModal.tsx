'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ActiveStatusField } from '@/common/components/forms'
import type { Campus } from '@/types/campus'
import type { Organization, Country, State, District } from '@/types/organization'
import {
  listActiveOrganizations,
  listCountries,
  listStatesByCountry,
  listDistrictsByState,
} from '@/services/admin/organization'
import { createCampus, updateCampus } from '@/services/admin/campus'

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  organizationId: z.number().min(1, 'Organization is required'),
  campusName: z.string().min(1, 'Campus name is required'),
  campusCode: z.string().min(1, 'Campus code is required'),
  countryId: z.number().optional(),
  stateId: z.number().optional(),
  districtId: z.number().min(1, 'District is required'),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface CampusModalProps {
  open: boolean
  onClose: () => void
  campus: Campus | null
  onSaved: () => void
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function CampusModal({
  open,
  onClose,
  campus,
  onSaved,
}: CampusModalProps) {
  const isEditing = campus != null
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [states, setStates] = useState<State[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      organizationId: undefined,
      campusName: '',
      campusCode: '',
      countryId: undefined,
      stateId: undefined,
      districtId: undefined,
      isActive: true,
      reason: '',
    },
  })

  const countryId = watch('countryId')
  const stateId = watch('stateId')

  // Load static data when modal opens
  useEffect(() => {
    if (!open) return
    listActiveOrganizations().then(setOrganizations).catch(console.error)
    listCountries().then(setCountries).catch(console.error)
  }, [open])

  // Populate form when editing
  useEffect(() => {
    if (campus) {
      reset({
        organizationId: campus.organizationId,
        campusName: campus.campusName,
        campusCode: campus.campusCode,
        countryId: campus.countryId ?? undefined,
        stateId: campus.stateId ?? undefined,
        districtId: campus.districtId,
        isActive: campus.isActive,
        reason: campus.reason || '',
      })
    } else {
      reset({
        organizationId: undefined,
        campusName: '',
        campusCode: '',
        countryId: undefined,
        stateId: undefined,
        districtId: undefined,
        isActive: true,
        reason: '',
      })
    }
    setStates([])
    setDistricts([])
    setSubmitError(null)
  }, [campus, open, reset])

  // Cascade: load states when countryId changes
  useEffect(() => {
    if (countryId == null) { setStates([]); setDistricts([]); return }
    listStatesByCountry(countryId).then(setStates).catch(console.error)
  }, [countryId])

  // Cascade: load districts when stateId changes
  useEffect(() => {
    if (stateId == null) { setDistricts([]); return }
    listDistrictsByState(stateId).then(setDistricts).catch(console.error)
  }, [stateId])

  // Load dependent data when editing
  useEffect(() => {
    if (!campus || !open) return
    if (campus.countryId) {
      listStatesByCountry(campus.countryId).then(setStates).catch(console.error)
    }
    if (campus.stateId) {
      listDistrictsByState(campus.stateId).then(setDistricts).catch(console.error)
    }
  }, [campus, open])

  const onSubmit = async (data: FormValues) => {
    setSubmitError(null)
    try {
      if (isEditing) {
        await updateCampus(campus!.campusId, data)
      } else {
        await createCampus(data as Omit<Campus, 'campusId'>)
      }
      onSaved()
      onClose()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save campus')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <div className="h-7 flex items-start">
            <DialogTitle className="text-lg font-semibold leading-none text-[hsl(var(--primary))]">
              {isEditing ? 'Edit Campus' : 'Add Campus'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">

          {/* ── Organization ───────────────────────────────────────────── */}
          <div className="space-y-1">
            <Label>Organization *</Label>
            <Controller
              name="organizationId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : ''}
                  onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}
                >
                  <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                  <SelectContent>
                    {organizations.map((o) => (
                      <SelectItem key={o.organizationId} value={String(o.organizationId)}>
                        {o.orgName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.organizationId && (
              <p className="text-xs text-red-500">{errors.organizationId.message}</p>
            )}
          </div>

          {/* ── Campus Name & Code ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="campusName">Campus Name *</Label>
              <Input id="campusName" {...register('campusName')} placeholder="e.g. Main Campus" />
              {errors.campusName && <p className="text-xs text-red-500">{errors.campusName.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="campusCode">Campus Code *</Label>
              <Input id="campusCode" {...register('campusCode')} placeholder="e.g. MC01" />
              {errors.campusCode && <p className="text-xs text-red-500">{errors.campusCode.message}</p>}
            </div>
          </div>

          {/* ── Location ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            {/* Country */}
            <div className="space-y-1">
              <Label>Country</Label>
              <Controller
                name="countryId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ''}
                    onValueChange={(v) => {
                      field.onChange(v ? Number(v) : null)
                      setValue('stateId', undefined)
                      setValue('districtId', undefined as unknown as number)
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.countryId} value={String(c.countryId)}>
                          {c.countryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* State */}
            <div className="space-y-1">
              <Label>State</Label>
              <Controller
                name="stateId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ''}
                    onValueChange={(v) => {
                      field.onChange(v ? Number(v) : undefined)
                      setValue('districtId', undefined as unknown as number)
                    }}
                    disabled={!countryId || states.length === 0}
                  >
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>
                      {states.map((s) => (
                        <SelectItem key={s.stateId} value={String(s.stateId)}>
                          {s.stateName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* District */}
            <div className="col-span-2 space-y-1">
              <Label>District *</Label>
              <Controller
                name="districtId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ''}
                    onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    disabled={!stateId || districts.length === 0}
                  >
                    <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                    <SelectContent>
                      {districts.map((d) => (
                        <SelectItem key={d.districtId} value={String(d.districtId)}>
                          {d.districtName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.districtId && (
                <p className="text-xs text-red-500">{errors.districtId.message}</p>
              )}
            </div>
          </div>

          {/* ── Status ─────────────────────────────────────────────────── */}
          {isEditing && (
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <ActiveStatusField
                  isActive={field.value}
                  reason={watch('reason') ?? ''}
                  onActiveChange={field.onChange}
                  onReasonChange={(v) => setValue('reason', v)}
                  reasonError={errors.reason?.message}
                />
              )}
            />
          )}

          {/* ── Error ──────────────────────────────────────────────────── */}
          {submitError && (
            <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEditing ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
