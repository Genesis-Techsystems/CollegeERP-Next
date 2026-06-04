'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
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
import type { Organization, Country, State, District, City } from '@/types/organization'
import {
  createOrganization,
  updateOrganization,
  uploadOrganizationLogo,
  listCountries,
  listStatesByCountry,
  listDistrictsByState,
  listCitiesByDistrict,
} from '@/services/admin/organization'

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  orgName: z.string().min(1, 'Organization name is required'),
  orgCode: z.string().min(1, 'Organization code is required'),
  address: z.string().min(1, 'Address is required'),
  countryId: z.number().optional().nullable(),
  stateId: z.number().optional().nullable(),
  districtId: z.number().min(1, 'District is required'),
  cityId: z.number().optional().nullable(),
  mandal: z.string().min(1, 'Mandal is required'),
  pincode: z.string().min(1, 'Pincode is required'),
  mobileNumber: z.string().optional().refine(
    (val) => !val || /^[6-9][0-9]{9}$/.test(val),
    'Enter a valid 10-digit mobile number',
  ),
  landlineNumber: z.string().optional(),
  email: z.string().optional().refine(
    (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    'Enter a valid email address',
  ),
  fax: z.string().optional(),
  googleUrl: z.string().optional(),
  facebookUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  url: z.string().optional(),
  licenseFdate: z.string().optional(),
  licenseTdate: z.string().optional(),
  noIssuedLicenses: z.preprocess(
    (val) => (val === '' || val == null ? undefined : Number(val)),
    z.number().optional(),
  ),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface OrganizationModalProps {
  open: boolean
  onClose: () => void
  organization: Organization | null
  onSaved: () => void
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function OrganizationModal({
  open,
  onClose,
  organization,
  onSaved,
}: OrganizationModalProps) {
  const fieldControlClass = 'border-slate-300 bg-white text-slate-900'
  const isEditing = organization != null
  const fileRef = useRef<HTMLInputElement>(null)
  const [countries, setCountries] = useState<Country[]>([])
  const [states, setStates] = useState<State[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [cities, setCities] = useState<City[]>([])
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
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      orgName: '',
      orgCode: '',
      address: '',
      countryId: undefined,
      stateId: undefined,
      districtId: undefined,
      cityId: undefined,
      mandal: '',
      pincode: '',
      mobileNumber: '',
      landlineNumber: '',
      email: '',
      fax: '',
      googleUrl: '',
      facebookUrl: '',
      linkedinUrl: '',
      url: '',
      licenseFdate: '',
      licenseTdate: '',
      noIssuedLicenses: undefined,
      isActive: true,
      reason: '',
    },
  })

  const countryId = watch('countryId')
  const stateId = watch('stateId')
  const districtId = watch('districtId')

  // Load countries when modal opens
  useEffect(() => {
    if (!open) return
    listCountries()
      .then(setCountries)
      .catch(console.error)
  }, [open])

  // Populate form when editing
  useEffect(() => {
    if (organization) {
      reset({
        orgName: organization.orgName,
        orgCode: organization.orgCode,
        address: organization.address,
        countryId: organization.countryId ?? undefined,
        stateId: organization.stateId ?? undefined,
        districtId: organization.districtId,
        cityId: organization.cityId ?? undefined,
        mandal: organization.mandal || '',
        pincode: String(organization.pincode || ''),
        mobileNumber: organization.mobileNumber || '',
        landlineNumber: organization.landlineNumber || '',
        email: organization.email || '',
        fax: organization.fax || '',
        googleUrl: organization.googleUrl || '',
        facebookUrl: organization.facebookUrl || '',
        linkedinUrl: organization.linkedinUrl || '',
        url: organization.url || '',
        licenseFdate: organization.licenseFdate || '',
        licenseTdate: organization.licenseTdate || '',
        noIssuedLicenses: organization.noIssuedLicenses ?? undefined,
        isActive: organization.isActive,
        reason: organization.reason || '',
      })
    } else {
      reset({
        orgName: '', orgCode: '', address: '',
        countryId: undefined, stateId: undefined, districtId: undefined, cityId: undefined,
        mandal: '', pincode: '', mobileNumber: '', landlineNumber: '',
        email: '', fax: '', googleUrl: '', facebookUrl: '', linkedinUrl: '',
        url: '', licenseFdate: '', licenseTdate: '', noIssuedLicenses: undefined,
        isActive: true, reason: '',
      })
    }
    setStates([])
    setDistricts([])
    setCities([])
    setSubmitError(null)
  }, [organization, open, reset])

  // Cascade: load states when countryId changes
  useEffect(() => {
    if (countryId == null) { setStates([]); setDistricts([]); setCities([]); return }
    listStatesByCountry(countryId).then(setStates).catch(console.error)
  }, [countryId])

  // Cascade: load districts when stateId changes
  useEffect(() => {
    if (stateId == null) { setDistricts([]); setCities([]); return }
    listDistrictsByState(stateId).then(setDistricts).catch(console.error)
  }, [stateId])

  // Cascade: load cities when districtId changes
  useEffect(() => {
    if (districtId == null) { setCities([]); return }
    listCitiesByDistrict(districtId).then(setCities).catch(console.error)
  }, [districtId])

  // Load dependent data when editing (cascade from saved IDs)
  useEffect(() => {
    if (!organization || !open) return
    if (organization.countryId) {
      listStatesByCountry(organization.countryId).then(setStates).catch(console.error)
    }
    if (organization.stateId) {
      listDistrictsByState(organization.stateId).then(setDistricts).catch(console.error)
    }
    if (organization.districtId) {
      listCitiesByDistrict(organization.districtId).then(setCities).catch(console.error)
    }
  }, [organization, open])

  // Mirror Angular's calDays(): auto-correct licenseTdate if it falls before licenseFdate
  const licenseFdate = watch('licenseFdate')
  useEffect(() => {
    const tdate = watch('licenseTdate')
    if (licenseFdate && tdate && tdate < licenseFdate) {
      setValue('licenseTdate', licenseFdate)
    }
  }, [licenseFdate]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data: FormValues) => {
    setSubmitError(null)
    try {
      let savedOrg: Organization
      if (isEditing) {
        savedOrg = await updateOrganization(organization!.organizationId, data)
      } else {
        savedOrg = await createOrganization(data as Omit<Organization, 'organizationId'>)
      }

      // Upload logo / banner logo if files were selected
      const file = fileRef.current?.files?.[0]
      if (file) {
        await uploadOrganizationLogo(savedOrg.organizationId, savedOrg.orgCode, file)
      }

      onSaved()
      onClose()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save organization')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit Organization' : 'Add Organization'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">

          {/* ── Basic info ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="orgName">Organization Name *</Label>
              <Input id="orgName" {...register('orgName')} placeholder="e.g. ABC University" />
              {errors.orgName && <p className="text-xs text-red-500">{errors.orgName.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="orgCode">Organization Code *</Label>
              <Input id="orgCode" {...register('orgCode')} placeholder="e.g. ABCU" />
              {errors.orgCode && <p className="text-xs text-red-500">{errors.orgCode.message}</p>}
            </div>
            <div className="col-span-2 space-y-0.5">
              <Label>
                Logo <span className="text-xs text-slate-400">(Accepted: .png, .jpg, .jpeg)</span>
              </Label>
              <Input
                type="file"
                accept=".png,.jpg,.jpeg"
                ref={fileRef}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {/* Country */}
            <div className="space-y-0.5">
              <Label>Country</Label>
              <Controller
                name="countryId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ''}
                    onValueChange={(v) => {
                      field.onChange(v ? Number(v) : undefined)
                      setValue('stateId', undefined)
                      setValue('districtId', undefined as unknown as number)
                      setValue('cityId', undefined)
                    }}
                  >
                    <SelectTrigger className={fieldControlClass}>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
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
            <div className="space-y-0.5">
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
                      setValue('cityId', undefined)
                    }}
                  >
                    <SelectTrigger className={fieldControlClass}>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
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
            <div className="space-y-0.5">
              <Label>District *</Label>
              <Controller
                name="districtId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ''}
                    onValueChange={(v) => {
                      field.onChange(v ? Number(v) : undefined)
                      setValue('cityId', undefined)
                    }}
                  >
                    <SelectTrigger className={fieldControlClass}>
                      <SelectValue placeholder="Select district" />
                    </SelectTrigger>
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
              {errors.districtId && <p className="text-xs text-red-500">{errors.districtId.message}</p>}
            </div>

            {/* City */}
            <div className="space-y-0.5">
              <Label>City</Label>
              <Controller
                name="cityId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ''}
                    onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  >
                    <SelectTrigger className={fieldControlClass}>
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((c) => (
                        <SelectItem key={c.cityId} value={String(c.cityId)}>
                          {c.cityName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="mandal">Mandal *</Label>
              <Input id="mandal" {...register('mandal')} placeholder="e.g. Kukatpally" />
              {errors.mandal && <p className="text-xs text-red-500">{errors.mandal.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="pincode">Pincode *</Label>
              <Input id="pincode" {...register('pincode')} placeholder="6-digit pincode" />
              {errors.pincode && <p className="text-xs text-red-500">{errors.pincode.message}</p>}
            </div>
          </div>

          {/* ── Contact ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="mobileNumber">Mobile No</Label>
              <Input id="mobileNumber" {...register('mobileNumber')} placeholder="10-digit number" />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="landlineNumber">Landline No</Label>
              <Input id="landlineNumber" {...register('landlineNumber')} placeholder="Landline number" />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} placeholder="org@example.com" />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="fax">Fax</Label>
              <Input id="fax" {...register('fax')} placeholder="Fax number" />
            </div>
          </div>

          {/* ── Social / Web ───────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="googleUrl">Google URL</Label>
              <Input id="googleUrl" {...register('googleUrl')} placeholder="https://..." />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="facebookUrl">Facebook URL</Label>
              <Input id="facebookUrl" {...register('facebookUrl')} placeholder="https://..." />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
              <Input id="linkedinUrl" {...register('linkedinUrl')} placeholder="https://..." />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="url">Website URL</Label>
              <Input id="url" {...register('url')} placeholder="https://..." />
            </div>
          </div>

          {/* ── License ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="licenseFdate">License From Date</Label>
              <Input id="licenseFdate" type="date" {...register('licenseFdate')} />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="licenseTdate">License To Date</Label>
              <Input
                id="licenseTdate"
                type="date"
                {...register('licenseTdate')}
                min={licenseFdate || undefined}
              />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="noIssuedLicenses">No. of Licenses</Label>
              <Input id="noIssuedLicenses" type="number" {...register('noIssuedLicenses')} placeholder="e.g. 100" />
              {errors.noIssuedLicenses && <p className="text-xs text-red-500">{errors.noIssuedLicenses.message}</p>}
            </div>
          </div>

          {/* ── Address ────────────────────────────────────────────────── */}
          <div className="space-y-0.5">
            <Label htmlFor="address">Address *</Label>
            <Input id="address" {...register('address')} placeholder="Full address" />
            {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
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
