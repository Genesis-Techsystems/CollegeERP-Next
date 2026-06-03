'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import noImgLogo from '@/assets/images/no-img-logo.png'
import { Select, type SelectOption } from '@/common/components/select'
import { ActiveStatusField } from '@/common/components/forms'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createCollege,
  listActiveCampuses,
  listActiveOrganizations,
  listActiveUniversities,
  listAffiliations,
  listCitiesByDistrict,
  listCollegeTypes,
  listCountries,
  listDistrictsByState,
  listStatesByCountry,
  updateCollege,
  uploadCollegeLogo,
} from '@/services'
import type { College } from '@/types/college'
import type { Campus } from '@/types/campus'
import type { Organization, Country, State, District, City } from '@/types/organization'
import type { University } from '@/types/university'

const schema = z.object({
  organizationId: z.number().min(1, 'Organization is required'),
  universityId: z.number().min(1, 'University is required'),
  campusId: z.number().min(1, 'Campus is required'),
  countryId: z.number().optional(),
  stateId: z.number().optional(),
  districtId: z.number().min(1, 'District is required'),
  cityId: z.number().min(1, 'City is required'),
  collegeName: z.string().min(1, 'College name is required'),
  collegeShortName: z.string().optional(),
  collegeCode: z.string().min(1, 'College code is required'),
  affiliatedTo: z.number().min(1, 'Affiliated to is required'),
  printPrefix: z.string().optional(),
  address: z.string().min(1, 'Address is required'),
  mandal: z.string().min(1, 'Mandal is required'),
  pincode: z.string().min(1, 'Pincode is required'),
  sortOrder: z.number().min(1, 'Sort order is required'),
  collegeType: z.number().optional(),
  approvedBy: z.string().optional(),
  mobileNumber: z.string().optional().refine(
    (val) => !val || /^[6-9]\d{9}$/.test(val),
    'Enter a valid 10-digit mobile number',
  ),
  landlineNumber: z.string().optional(),
  fax: z.string().optional(),
  email: z.string().optional().refine(
    (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    'Enter a valid email address',
  ),
  facebookUrl: z.string().optional(),
  googleUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  isActive: z.boolean(),
  isUniversity: z.boolean().optional(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface CollegeModalProps {
  open: boolean
  onClose: () => void
  college: College | null
  onSaved: () => void
}

function asOptions<T>(
  rows: T[],
  getValue: (row: T) => number,
  getLabel: (row: T) => string,
): SelectOption[] {
  return rows.map((row) => ({ value: String(getValue(row)), label: getLabel(row) }))
}

export default function CollegeModal({
  open,
  onClose,
  college,
  onSaved,
}: Readonly<CollegeModalProps>) {
  const isEditing = college != null
  const fileRef = useRef<HTMLInputElement>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [universities, setUniversities] = useState<University[]>([])
  const [campuses, setCampuses] = useState<Campus[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [states, setStates] = useState<State[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [affiliations, setAffiliations] = useState<SelectOption[]>([])
  const [collegeTypes, setCollegeTypes] = useState<SelectOption[]>([])
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
      universityId: undefined,
      campusId: undefined,
      countryId: undefined,
      stateId: undefined,
      districtId: undefined,
      cityId: undefined,
      collegeName: '',
      collegeShortName: '',
      collegeCode: '',
      affiliatedTo: undefined,
      printPrefix: '',
      address: '',
      mandal: '',
      pincode: '',
      sortOrder: undefined,
      collegeType: undefined,
      approvedBy: '',
      mobileNumber: '',
      landlineNumber: '',
      fax: '',
      email: '',
      facebookUrl: '',
      googleUrl: '',
      linkedinUrl: '',
      isActive: true,
      isUniversity: false,
      reason: '',
    },
  })

  const countryId = watch('countryId')
  const stateId = watch('stateId')
  const districtId = watch('districtId')

  const organizationOptions = useMemo(
    () => asOptions(organizations, (r) => r.organizationId, (r) => r.orgName),
    [organizations],
  )
  const universityOptions = useMemo(
    () => asOptions(universities, (r) => r.universityId, (r) => r.universityName),
    [universities],
  )
  const campusOptions = useMemo(
    () => asOptions(campuses, (r) => r.campusId, (r) => r.campusName),
    [campuses],
  )
  const countryOptions = useMemo(
    () => asOptions(countries, (r) => r.countryId, (r) => r.countryName),
    [countries],
  )
  const stateOptions = useMemo(
    () => asOptions(states, (r) => r.stateId, (r) => r.stateName),
    [states],
  )
  const districtOptions = useMemo(
    () => asOptions(districts, (r) => r.districtId, (r) => r.districtName),
    [districts],
  )
  const cityOptions = useMemo(
    () => asOptions(cities, (r) => r.cityId, (r) => r.cityName),
    [cities],
  )

  useEffect(() => {
    if (!open) return
    Promise.all([
      listActiveOrganizations(),
      listActiveUniversities(),
      listActiveCampuses(),
      listCountries(),
      listAffiliations(),
      listCollegeTypes(),
    ]).then(([orgRows, univRows, campusRows, countryRows, affiliationRows, typeRows]) => {
      setOrganizations(orgRows)
      setUniversities(univRows)
      setCampuses(campusRows)
      setCountries(countryRows)
      setAffiliations(affiliationRows)
      setCollegeTypes(typeRows)
    }).catch(console.error)
  }, [open])

  useEffect(() => {
    if (college) {
      reset({
        organizationId: college.organizationId,
        universityId: college.universityId,
        campusId: college.campusId,
        countryId: college.countryId ?? undefined,
        stateId: college.stateId ?? undefined,
        districtId: college.districtId,
        cityId: college.cityId,
        collegeName: college.collegeName,
        collegeShortName: college.collegeShortName ?? '',
        collegeCode: college.collegeCode,
        affiliatedTo: college.affiliatedTo,
        printPrefix: college.printPrefix ?? '',
        address: college.address,
        mandal: college.mandal,
        pincode: college.pincode,
        sortOrder: Number(college.sortOrder ?? 0),
        collegeType: college.collegeType ?? undefined,
        approvedBy: college.approvedBy ?? '',
        mobileNumber: college.mobileNumber ?? '',
        landlineNumber: college.landlineNumber ?? '',
        fax: college.fax ?? '',
        email: college.email ?? '',
        facebookUrl: college.facebookUrl ?? '',
        googleUrl: college.googleUrl ?? '',
        linkedinUrl: college.linkedinUrl ?? '',
        isActive: college.isActive,
        isUniversity: college.isUniversity ?? false,
        reason: college.reason ?? '',
      })
      setLogoPreview(college.logo ?? null)
    } else {
      reset()
      setLogoPreview(null)
    }
    setStates([])
    setDistricts([])
    setCities([])
    setSubmitError(null)
  }, [college, open, reset])

  useEffect(() => {
    if (countryId == null) { setStates([]); setDistricts([]); setCities([]); return }
    listStatesByCountry(countryId).then(setStates).catch(console.error)
  }, [countryId])

  useEffect(() => {
    if (stateId == null) { setDistricts([]); setCities([]); return }
    listDistrictsByState(stateId).then(setDistricts).catch(console.error)
  }, [stateId])

  useEffect(() => {
    if (districtId == null) { setCities([]); return }
    listCitiesByDistrict(districtId).then(setCities).catch(console.error)
  }, [districtId])

  useEffect(() => {
    if (!college || !open) return
    if (college.countryId) listStatesByCountry(college.countryId).then(setStates).catch(console.error)
    if (college.stateId) listDistrictsByState(college.stateId).then(setDistricts).catch(console.error)
    if (college.districtId) listCitiesByDistrict(college.districtId).then(setCities).catch(console.error)
  }, [college, open])

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setLogoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    try {
      let savedCollege: College
      if (isEditing) {
        savedCollege = await updateCollege(college!.collegeId, data)
      } else {
        savedCollege = await createCollege(data as Omit<College, 'collegeId'>)
      }

      const file = fileRef.current?.files?.[0]
      if (file) {
        await uploadCollegeLogo(
          savedCollege.collegeId,
          savedCollege.universityId,
          savedCollege.collegeCode,
          file,
        )
      }

      onSaved()
      onClose()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save college')
    }
  }

  let submitLabel = 'Save'
  if (isSubmitting) submitLabel = 'Saving...'
  else if (isEditing) submitLabel = 'Update'

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit College' : 'Add College'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="grid grid-cols-3 gap-2">
            <Controller
              name="organizationId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Organization"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={organizationOptions}
                  placeholder="Select organization"
                  searchable
                  error={errors.organizationId?.message}
                />
              )}
            />
            <Controller
              name="universityId"
              control={control}
              render={({ field }) => (
                <Select
                  label="University"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={universityOptions}
                  placeholder="Select university"
                  searchable
                  error={errors.universityId?.message}
                />
              )}
            />
            <Controller
              name="campusId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Campus"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={campusOptions}
                  placeholder="Select campus"
                  searchable
                  error={errors.campusId?.message}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="collegeName">College Name *</Label>
              <Input id="collegeName" {...register('collegeName')} />
              {errors.collegeName && <p className="text-xs text-red-500">{errors.collegeName.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="collegeCode">College Code *</Label>
              <Input id="collegeCode" {...register('collegeCode')} />
              {errors.collegeCode && <p className="text-xs text-red-500">{errors.collegeCode.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="collegeShortName">Short Name</Label>
              <Input id="collegeShortName" {...register('collegeShortName')} />
            </div>
            <Controller
              name="affiliatedTo"
              control={control}
              render={({ field }) => (
                <Select
                  label="Affiliated To"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={affiliations}
                  placeholder="Select affiliation"
                  error={errors.affiliatedTo?.message}
                />
              )}
            />
            <div className="space-y-0.5">
              <Label htmlFor="sortOrder">Sort Order *</Label>
              <Input id="sortOrder" type="number" {...register('sortOrder', { valueAsNumber: true })} />
              {errors.sortOrder && <p className="text-xs text-red-500">{errors.sortOrder.message}</p>}
            </div>
          </div>

          <div className="space-y-0.5">
            <Label>Logo</Label>
            <div className="flex items-center gap-3">
              <img
                src={logoPreview ?? noImgLogo.src}
                alt="preview"
                className="h-14 w-14 rounded object-contain border"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = noImgLogo.src }}
              />
              <Input
                type="file"
                accept=".png,.jpg,.jpeg"
                ref={fileRef}
                onChange={handleLogoChange}
                className="max-w-xs"
              />
            </div>
            <p className="text-xs text-slate-400">Accepted: .png, .jpg, .jpeg</p>
          </div>

          <div className="space-y-0.5">
            <Label htmlFor="address">Address *</Label>
            <Input id="address" {...register('address')} />
            {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Controller
              name="countryId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Country"
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => {
                    field.onChange(v ? Number(v) : undefined)
                    setValue('stateId', undefined)
                    setValue('districtId', undefined as unknown as number)
                    setValue('cityId', undefined as unknown as number)
                  }}
                  options={countryOptions}
                  placeholder="Select country"
                  searchable
                />
              )}
            />
            <Controller
              name="stateId"
              control={control}
              render={({ field }) => (
                <Select
                  label="State"
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => {
                    field.onChange(v ? Number(v) : undefined)
                    setValue('districtId', undefined as unknown as number)
                    setValue('cityId', undefined as unknown as number)
                  }}
                  options={stateOptions}
                  placeholder="Select state"
                  disabled={!countryId || stateOptions.length === 0}
                  searchable
                />
              )}
            />
            <Controller
              name="districtId"
              control={control}
              render={({ field }) => (
                <Select
                  label="District"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => {
                    field.onChange(v ? Number(v) : undefined)
                    setValue('cityId', undefined as unknown as number)
                  }}
                  options={districtOptions}
                  placeholder="Select district"
                  disabled={!stateId || districtOptions.length === 0}
                  searchable
                  error={errors.districtId?.message}
                />
              )}
            />
            <Controller
              name="cityId"
              control={control}
              render={({ field }) => (
                <Select
                  label="City"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={cityOptions}
                  placeholder="Select city"
                  disabled={!districtId || cityOptions.length === 0}
                  searchable
                  error={errors.cityId?.message}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="mandal">Mandal *</Label>
              <Input id="mandal" {...register('mandal')} />
              {errors.mandal && <p className="text-xs text-red-500">{errors.mandal.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="pincode">Pincode *</Label>
              <Input id="pincode" {...register('pincode')} />
              {errors.pincode && <p className="text-xs text-red-500">{errors.pincode.message}</p>}
            </div>
            <Controller
              name="collegeType"
              control={control}
              render={({ field }) => (
                <Select
                  label="College Type"
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={collegeTypes}
                  placeholder="Select type"
                />
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="approvedBy">Approved By</Label>
              <Input id="approvedBy" {...register('approvedBy')} />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="printPrefix">Print Prefix</Label>
              <Input id="printPrefix" {...register('printPrefix')} />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="mobileNumber">Mobile No</Label>
              <Input id="mobileNumber" {...register('mobileNumber')} />
              {errors.mobileNumber && <p className="text-xs text-red-500">{errors.mobileNumber.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="landlineNumber">Landline No</Label>
              <Input id="landlineNumber" {...register('landlineNumber')} />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" {...register('email')} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="fax">Fax</Label>
              <Input id="fax" {...register('fax')} />
            </div>
          </div>

          {isEditing && (
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <ActiveStatusField
                  isActive={field.value}
                  reason={watch('reason') ?? ''}
                  onActiveChange={field.onChange}
                  onReasonChange={(value) => setValue('reason', value)}
                  reasonError={errors.reason?.message}
                />
              )}
            />
          )}

          {submitError && (
            <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>
          )}

          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
