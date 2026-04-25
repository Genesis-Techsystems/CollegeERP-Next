'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import noImgLogo from '@/assets/images/no-img-logo.png'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
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
import type { City, Country, District, State } from '@/types/organization'
import type { University } from '@/types/university'
import {
  createUniversity,
  listCitiesByDistrict,
  listCountries,
  listDistrictsByState,
  listStatesByCountry,
  updateUniversity,
  uploadUniversityLogo,
} from '@/services'

const schema = z.object({
  universityName: z.string().min(1, 'University name is required'),
  universityCode: z.string().min(1, 'University code is required'),
  universityShortName: z.string().optional(),
  printPrefix: z.string().optional(),
  address: z.string().min(1, 'Address is required'),
  mandal: z.string().min(1, 'Mandal is required'),
  pinCode: z.string().min(1, 'Pin code is required'),
  mobileNumber: z.string().optional().refine(
    (val) => !val || /^[6-9]\d{9}$/.test(val),
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
  countryId: z.number().optional(),
  stateId: z.number().optional(),
  districtId: z.number().min(1, 'District is required'),
  cityId: z.number().min(1, 'City is required'),
  reportLine1: z.string().optional(),
  reportLine2: z.string().optional(),
  reportLine3: z.string().optional(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface UniversityModalProps {
  open: boolean
  onClose: () => void
  university: University | null
  onSaved: () => void
}

export default function UniversityModal({
  open,
  onClose,
  university,
  onSaved,
}: Readonly<UniversityModalProps>) {
  const isEditing = university != null
  const fileRef = useRef<HTMLInputElement>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
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
    resolver: zodResolver(schema),
    defaultValues: {
      universityName: '',
      universityCode: '',
      universityShortName: '',
      printPrefix: '',
      address: '',
      mandal: '',
      pinCode: '',
      mobileNumber: '',
      landlineNumber: '',
      email: '',
      fax: '',
      googleUrl: '',
      facebookUrl: '',
      linkedinUrl: '',
      countryId: undefined,
      stateId: undefined,
      districtId: undefined,
      cityId: undefined,
      reportLine1: '',
      reportLine2: '',
      reportLine3: '',
      isActive: true,
      reason: '',
    },
  })

  const countryId = watch('countryId')
  const stateId = watch('stateId')
  const districtId = watch('districtId')
  let submitLabel = 'Save'
  if (isSubmitting) submitLabel = 'Saving...'
  else if (isEditing) submitLabel = 'Update'

  useEffect(() => {
    if (!open) return
    listCountries().then(setCountries).catch(console.error)
  }, [open])

  useEffect(() => {
    if (university) {
      reset({
        universityName: university.universityName,
        universityCode: university.universityCode,
        universityShortName: university.universityShortName ?? '',
        printPrefix: university.printPrefix ?? '',
        address: university.address,
        mandal: university.mandal,
        pinCode: String(university.pinCode ?? ''),
        mobileNumber: university.mobileNumber ?? '',
        landlineNumber: university.landlineNumber ?? '',
        email: university.email ?? '',
        fax: university.fax ?? '',
        googleUrl: university.googleUrl ?? '',
        facebookUrl: university.facebookUrl ?? '',
        linkedinUrl: university.linkedinUrl ?? '',
        countryId: university.countryId ?? undefined,
        stateId: university.stateId ?? undefined,
        districtId: university.districtId,
        cityId: university.cityId,
        reportLine1: university.reportLine1 ?? '',
        reportLine2: university.reportLine2 ?? '',
        reportLine3: university.reportLine3 ?? '',
        isActive: university.isActive,
        reason: university.reason ?? '',
      })
      setLogoPreview(university.logoFileName ?? null)
    } else {
      reset()
      setLogoPreview(null)
    }
    setStates([])
    setDistricts([])
    setCities([])
    setSubmitError(null)
  }, [university, open, reset])

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
    if (!university || !open) return
    if (university.countryId) listStatesByCountry(university.countryId).then(setStates).catch(console.error)
    if (university.stateId) listDistrictsByState(university.stateId).then(setDistricts).catch(console.error)
    if (university.districtId) listCitiesByDistrict(university.districtId).then(setCities).catch(console.error)
  }, [university, open])

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
      let savedUniversity: University
      if (isEditing) {
        savedUniversity = await updateUniversity(university!.universityId, data)
      } else {
        savedUniversity = await createUniversity(data as Omit<University, 'universityId'>)
      }

      const file = fileRef.current?.files?.[0]
      if (file) {
        await uploadUniversityLogo(savedUniversity.universityId, savedUniversity.universityCode, file)
      }

      onSaved()
      onClose()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save university')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto pt-3">
        <DialogHeader className="space-y-0 pr-8 pt-0">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? 'Edit University' : 'Add University'}
          </DialogTitle>
          <div className="-mx-6 mt-2 border-b border-slate-200" />
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="universityName">University Name *</Label>
              <Input id="universityName" {...register('universityName')} placeholder="e.g. ABC University" />
              {errors.universityName && <p className="text-xs text-red-500">{errors.universityName.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="universityCode">University Code *</Label>
              <Input id="universityCode" {...register('universityCode')} placeholder="e.g. ABCU" />
              {errors.universityCode && <p className="text-xs text-red-500">{errors.universityCode.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="universityShortName">Short Name</Label>
              <Input id="universityShortName" {...register('universityShortName')} placeholder="e.g. ABC" />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="printPrefix">Print Prefix</Label>
              <Input id="printPrefix" {...register('printPrefix')} placeholder="e.g. UNIV" />
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
            <Input id="address" {...register('address')} placeholder="Full address" />
            {errors.address && <p className="text-xs text-red-500">{errors.address.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2">
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
                      setValue('cityId', undefined as unknown as number)
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>
                      {countries.map((item) => (
                        <SelectItem key={item.countryId} value={String(item.countryId)}>
                          {item.countryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

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
                      setValue('cityId', undefined as unknown as number)
                    }}
                    disabled={!countryId || states.length === 0}
                  >
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>
                      {states.map((item) => (
                        <SelectItem key={item.stateId} value={String(item.stateId)}>
                          {item.stateName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

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
                      setValue('cityId', undefined as unknown as number)
                    }}
                    disabled={!stateId || districts.length === 0}
                  >
                    <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                    <SelectContent>
                      {districts.map((item) => (
                        <SelectItem key={item.districtId} value={String(item.districtId)}>
                          {item.districtName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.districtId && <p className="text-xs text-red-500">{errors.districtId.message}</p>}
            </div>

            <div className="space-y-0.5">
              <Label>City *</Label>
              <Controller
                name="cityId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ''}
                    onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    disabled={!districtId || cities.length === 0}
                  >
                    <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                    <SelectContent>
                      {cities.map((item) => (
                        <SelectItem key={item.cityId} value={String(item.cityId)}>
                          {item.cityName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.cityId && <p className="text-xs text-red-500">{errors.cityId.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="mandal">Mandal *</Label>
              <Input id="mandal" {...register('mandal')} placeholder="e.g. Kukatpally" />
              {errors.mandal && <p className="text-xs text-red-500">{errors.mandal.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="pinCode">Pin Code *</Label>
              <Input id="pinCode" {...register('pinCode')} placeholder="6-digit pin code" />
              {errors.pinCode && <p className="text-xs text-red-500">{errors.pinCode.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="mobileNumber">Mobile No</Label>
              <Input id="mobileNumber" {...register('mobileNumber')} placeholder="10-digit number" />
              {errors.mobileNumber && <p className="text-xs text-red-500">{errors.mobileNumber.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="landlineNumber">Landline No</Label>
              <Input id="landlineNumber" {...register('landlineNumber')} placeholder="Landline number" />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} placeholder="university@example.com" />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="fax">Fax</Label>
              <Input id="fax" {...register('fax')} placeholder="Fax number" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="reportLine1">Report Line 1</Label>
              <Input id="reportLine1" {...register('reportLine1')} />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="reportLine2">Report Line 2</Label>
              <Input id="reportLine2" {...register('reportLine2')} />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="reportLine3">Report Line 3</Label>
              <Input id="reportLine3" {...register('reportLine3')} />
            </div>
          </div>

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
