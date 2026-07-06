'use client'

import { MapPin, User } from 'lucide-react'
import { Select } from '@/common/components/select'
import { DatePicker } from '@/common/components/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { FormSectionHeader } from './FormSectionHeader'
import { PhotoField } from './PhotoField'
import { calcAge, EDIT_PLACEHOLDERS, entityOptions, gdOptions, num, parseDate, txt, type AnyRow } from './edit-student-utils'

export interface PersonalInfoStepProps {
  data: AnyRow
  onChange: (patch: Partial<AnyRow>) => void
  titles: AnyRow[]
  genders: AnyRow[]
  qualifyingExamTypes: AnyRow[]
  nationalities: AnyRow[]
  religions: AnyRow[]
  castes: AnyRow[]
  subCastes: AnyRow[]
  disabilities: AnyRow[]
  bloodGroups: AnyRow[]
  countries: AnyRow[]
  presentStates: AnyRow[]
  presentDistricts: AnyRow[]
  presentCities: AnyRow[]
  permStates: AnyRow[]
  permDistricts: AnyRow[]
  permCities: AnyRow[]
  sameAsPermanent: boolean
  onSameAsPermanentChange: (checked: boolean) => void
  onCasteChange: (casteId: number | null) => void
  onPresentCountryChange: (countryId: number | null) => void
  onPresentStateChange: (stateId: number | null) => void
  onPresentDistrictChange: (districtId: number | null) => void
  onPermCountryChange: (countryId: number | null) => void
  onPermStateChange: (stateId: number | null) => void
  onPermDistrictChange: (districtId: number | null) => void
  studentPhotoUrl: string
  fatherPhotoUrl: string
  motherPhotoUrl: string
  signaturePhotoUrl: string
  onStudentPhoto: (file: File) => void
  onFatherPhoto: (file: File) => void
  onMotherPhoto: (file: File) => void
  onSignaturePhoto: (file: File) => void
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
}

export function PersonalInfoStep(props: PersonalInfoStepProps) {
  const { data, onChange, sameAsPermanent, onSameAsPermanentChange } = props
  const dob = parseDate(data.dateOfBirth)
  const age = calcAge(dob)

  return (
    <div className="space-y-5">
      <FormSectionHeader icon={User} title="Personal Information" />
      <FieldGrid>
        <Select label="Title" placeholder={EDIT_PLACEHOLDERS.title} value={data.titleId ? String(data.titleId) : ''} onChange={(v) => onChange({ titleId: v ? Number(v) : null })} options={gdOptions(props.titles)} searchable clearable />
        <div className="space-y-1"><Label className="text-xs">First Name (as per SSC) *</Label><Input placeholder={EDIT_PLACEHOLDERS.firstName} value={txt(data, ['firstName'])} onChange={(e) => onChange({ firstName: e.target.value })} required /></div>
        <div className="space-y-1"><Label className="text-xs">Middle Name</Label><Input placeholder={EDIT_PLACEHOLDERS.middleName} value={txt(data, ['middleName'])} onChange={(e) => onChange({ middleName: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">Last Name</Label><Input placeholder={EDIT_PLACEHOLDERS.lastName} value={txt(data, ['lastName'])} onChange={(e) => onChange({ lastName: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">Date Of Birth *</Label><DatePicker placeholder={EDIT_PLACEHOLDERS.dateOfBirth} value={dob} onChange={(d) => onChange({ dateOfBirth: d })} /></div>
        <div className="flex flex-wrap items-end gap-4 lg:col-span-2">
          <PhotoField src={props.studentPhotoUrl} onFile={props.onStudentPhoto} label="Student Photo" />
          <PhotoField src={props.signaturePhotoUrl} onFile={props.onSignaturePhoto} label="Signature" />
        </div>
        <div className="space-y-1"><Label className="text-xs">Age</Label><Input value={age != null ? String(age) : ''} disabled readOnly /></div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><Checkbox checked={Boolean(data.isMinority)} onCheckedChange={(c) => onChange({ isMinority: c === true })} />Is Minority</label>
        <div className="space-y-1"><Label className="text-xs">SSC Number</Label><Input placeholder={EDIT_PLACEHOLDERS.sscNo} value={txt(data, ['sscNo'])} onChange={(e) => onChange({ sscNo: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">Identification Marks</Label><Input placeholder={EDIT_PLACEHOLDERS.identificationMarks} value={txt(data, ['identificationMarks'])} onChange={(e) => onChange({ identificationMarks: e.target.value })} /></div>
        <div className="space-y-1 lg:col-span-2">
          <Label className="text-xs">Gender</Label>
          <RadioGroup value={data.genderId ? String(data.genderId) : ''} onValueChange={(v) => onChange({ genderId: v ? Number(v) : null })} className="flex flex-wrap gap-4 pt-1">
            {props.genders.map((g) => {
              const id = String(num(g, ['generalDetailId']))
              return <label key={id} className="inline-flex items-center gap-1.5 text-sm"><RadioGroupItem value={id} />{txt(g, ['generalDetailDisplayName'])}</label>
            })}
          </RadioGroup>
        </div>
        <Select label="Qualified Exam Type" placeholder={EDIT_PLACEHOLDERS.qualifyExam} value={data.qualifyingId ? String(data.qualifyingId) : ''} onChange={(v) => onChange({ qualifyingId: v ? Number(v) : null })} options={gdOptions(props.qualifyingExamTypes)} searchable clearable />
        <div className="space-y-1"><Label className="text-xs">Qualified Rank</Label><Input placeholder={EDIT_PLACEHOLDERS.eamcetRank} value={txt(data, ['eamcetRank'])} onChange={(e) => onChange({ eamcetRank: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">Qualified HallTicket Number</Label><Input placeholder={EDIT_PLACEHOLDERS.entranceHTNumber} value={txt(data, ['entranceHTNumber'])} onChange={(e) => onChange({ entranceHTNumber: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">Mobile *</Label><Input placeholder={EDIT_PLACEHOLDERS.mobile} value={txt(data, ['mobile'])} onChange={(e) => onChange({ mobile: e.target.value })} inputMode="numeric" maxLength={10} required /></div>
        <div className="space-y-1"><Label className="text-xs">Student Email ID</Label><Input type="email" placeholder={EDIT_PLACEHOLDERS.email} value={txt(data, ['stdEmailId', 'studentEmailId'])} onChange={(e) => onChange({ stdEmailId: e.target.value })} /></div>
        <Select label="Nationality" placeholder={EDIT_PLACEHOLDERS.nationality} value={data.nationalityId ? String(data.nationalityId) : ''} onChange={(v) => onChange({ nationalityId: v ? Number(v) : null })} options={gdOptions(props.nationalities)} searchable clearable />
        <Select label="Religion" placeholder={EDIT_PLACEHOLDERS.religion} value={data.religionId ? String(data.religionId) : ''} onChange={(v) => onChange({ religionId: v ? Number(v) : null })} options={gdOptions(props.religions)} searchable clearable />
        <Select label="Caste" placeholder={EDIT_PLACEHOLDERS.caste} value={data.casteId ? String(data.casteId) : ''} onChange={(v) => props.onCasteChange(v ? Number(v) : null)} options={entityOptions(props.castes, ['casteId'], ['caste'])} searchable clearable />
        <Select label="Sub Caste" placeholder={EDIT_PLACEHOLDERS.subCaste} value={data.subCasteId ? String(data.subCasteId) : ''} onChange={(v) => onChange({ subCasteId: v ? Number(v) : null })} options={entityOptions(props.subCastes, ['subCasteId'], ['subCaste'])} searchable clearable />
        <Select label="Disability" placeholder={EDIT_PLACEHOLDERS.disability} value={data.disabilityId ? String(data.disabilityId) : ''} onChange={(v) => onChange({ disabilityId: v ? Number(v) : null })} options={gdOptions(props.disabilities)} searchable clearable />
        <Select label="Blood Group" placeholder={EDIT_PLACEHOLDERS.bloodGroup} value={data.bloodgroupId ? String(data.bloodgroupId) : ''} onChange={(v) => onChange({ bloodgroupId: v ? Number(v) : null })} options={gdOptions(props.bloodGroups)} searchable clearable />
        <div className="space-y-1"><Label className="text-xs">Aadhar Card Number *</Label><Input placeholder={EDIT_PLACEHOLDERS.aadharCardNo} value={txt(data, ['aadharCardNo'])} onChange={(e) => onChange({ aadharCardNo: e.target.value })} inputMode="numeric" maxLength={12} /></div>
        <div className="space-y-1"><Label className="text-xs">PanCard Number</Label><Input placeholder={EDIT_PLACEHOLDERS.pancardNo} value={txt(data, ['pancardNo'])} onChange={(e) => onChange({ pancardNo: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">Passport Number</Label><Input placeholder={EDIT_PLACEHOLDERS.passportNo} value={txt(data, ['passportNo'])} onChange={(e) => onChange({ passportNo: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">Date Of Issue</Label><DatePicker placeholder={EDIT_PLACEHOLDERS.issueDate} value={parseDate(data.dateOfIssue)} onChange={(d) => onChange({ dateOfIssue: d })} /></div>
        <div className="space-y-1"><Label className="text-xs">Date Of Expiry</Label><DatePicker placeholder={EDIT_PLACEHOLDERS.expiryDate} value={parseDate(data.dateOfExpiry)} onChange={(d) => onChange({ dateOfExpiry: d })} /></div>
      </FieldGrid>

      <FormSectionHeader icon={User} title="Parent Details" />
      <FieldGrid>
        <div className="space-y-1"><Label className="text-xs">Father Name *</Label><Input placeholder={EDIT_PLACEHOLDERS.fatherName} value={txt(data, ['fatherName'])} onChange={(e) => onChange({ fatherName: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">Occupation</Label><Input placeholder={EDIT_PLACEHOLDERS.fatherOccupation} value={txt(data, ['fatherOccupation'])} onChange={(e) => onChange({ fatherOccupation: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">Qualification</Label><Input placeholder={EDIT_PLACEHOLDERS.fatherQualification} value={txt(data, ['fatherQualification'])} onChange={(e) => onChange({ fatherQualification: e.target.value })} /></div>
        <div className="flex items-center justify-center"><PhotoField src={props.fatherPhotoUrl} onFile={props.onFatherPhoto} label="Father Photo" /></div>
        <div className="space-y-1"><Label className="text-xs">Annual Income</Label><Input placeholder={EDIT_PLACEHOLDERS.fatherIncome} value={txt(data, ['fathersIncomePa'])} onChange={(e) => onChange({ fathersIncomePa: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">Mobile Number *</Label><Input placeholder={EDIT_PLACEHOLDERS.fatherMobile} value={txt(data, ['fatherMobileNo'])} onChange={(e) => onChange({ fatherMobileNo: e.target.value })} inputMode="numeric" maxLength={10} /></div>
        <div className="space-y-1"><Label className="text-xs">Email ID</Label><Input type="email" placeholder={EDIT_PLACEHOLDERS.fatherEmail} value={txt(data, ['fatherEmailId'])} onChange={(e) => onChange({ fatherEmailId: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">Address</Label><Input placeholder={EDIT_PLACEHOLDERS.fatherAddress} value={txt(data, ['fatherAddress'])} onChange={(e) => onChange({ fatherAddress: e.target.value })} /></div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><Checkbox checked={Boolean(data.isgovtempFather)} onCheckedChange={(c) => onChange({ isgovtempFather: c === true })} />Is Govt Emp</label>
      </FieldGrid>
      <FieldGrid>
        <div className="space-y-1"><Label className="text-xs">Mother Name</Label><Input placeholder={EDIT_PLACEHOLDERS.motherName} value={txt(data, ['motherName'])} onChange={(e) => onChange({ motherName: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">Occupation</Label><Input placeholder={EDIT_PLACEHOLDERS.motherOccupation} value={txt(data, ['motherOccupation'])} onChange={(e) => onChange({ motherOccupation: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">Qualification</Label><Input placeholder={EDIT_PLACEHOLDERS.motherQualification} value={txt(data, ['motherQualification'])} onChange={(e) => onChange({ motherQualification: e.target.value })} /></div>
        <div className="flex items-center justify-center"><PhotoField src={props.motherPhotoUrl} onFile={props.onMotherPhoto} label="Mother Photo" /></div>
        <div className="space-y-1"><Label className="text-xs">Annual Income</Label><Input placeholder={EDIT_PLACEHOLDERS.motherIncome} value={txt(data, ['motherIncomePa'])} onChange={(e) => onChange({ motherIncomePa: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">Mobile Number</Label><Input placeholder={EDIT_PLACEHOLDERS.motherMobile} value={txt(data, ['motherMobileNo'])} onChange={(e) => onChange({ motherMobileNo: e.target.value })} inputMode="numeric" maxLength={10} /></div>
        <div className="space-y-1"><Label className="text-xs">Email ID</Label><Input type="email" placeholder={EDIT_PLACEHOLDERS.motherEmail} value={txt(data, ['motherEmailId'])} onChange={(e) => onChange({ motherEmailId: e.target.value })} /></div>
        <div className="space-y-1"><Label className="text-xs">Address</Label><Input placeholder={EDIT_PLACEHOLDERS.motherAddress} value={txt(data, ['motherAddress'])} onChange={(e) => onChange({ motherAddress: e.target.value })} /></div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><Checkbox checked={Boolean(data.isgovtempMother)} onCheckedChange={(c) => onChange({ isgovtempMother: c === true })} />Is Govt Emp</label>
      </FieldGrid>

      <div className="px-1">
        <Label className="text-xs">Residence</Label>
        <RadioGroup value={data.isLocal === false ? 'nonlocal' : 'local'} onValueChange={(v) => onChange({ isLocal: v === 'local' })} className="mt-1 flex gap-4">
          <label className="inline-flex items-center gap-1.5 text-sm"><RadioGroupItem value="local" />Local</label>
          <label className="inline-flex items-center gap-1.5 text-sm"><RadioGroupItem value="nonlocal" />Non-Local</label>
        </RadioGroup>
      </div>

      <FormSectionHeader icon={MapPin} title="Permanent Address" />
      <AddressFields
        prefix="permanent"
        data={data}
        onChange={onChange}
        countries={props.countries}
        states={props.permStates}
        districts={props.permDistricts}
        cities={props.permCities}
        onCountryChange={props.onPermCountryChange}
        onStateChange={props.onPermStateChange}
        onDistrictChange={props.onPermDistrictChange}
        required
      />

      <FormSectionHeader icon={MapPin} title="Present Address" action={<label className="flex items-center gap-2 text-xs"><Checkbox checked={sameAsPermanent} onCheckedChange={(c) => onSameAsPermanentChange(c === true)} />Same As Permanent Address</label>} />
      <AddressFields
        prefix="present"
        data={data}
        onChange={onChange}
        countries={props.countries}
        states={props.presentStates}
        districts={props.presentDistricts}
        cities={props.presentCities}
        onCountryChange={props.onPresentCountryChange}
        onStateChange={props.onPresentStateChange}
        onDistrictChange={props.onPresentDistrictChange}
        disabled={sameAsPermanent}
      />
    </div>
  )
}

function AddressFields({
  prefix,
  data,
  onChange,
  countries,
  states,
  districts,
  cities,
  onCountryChange,
  onStateChange,
  onDistrictChange,
  required,
  disabled,
}: {
  prefix: 'permanent' | 'present'
  data: AnyRow
  onChange: (patch: Partial<AnyRow>) => void
  countries: AnyRow[]
  states: AnyRow[]
  districts: AnyRow[]
  cities: AnyRow[]
  onCountryChange: (id: number | null) => void
  onStateChange: (id: number | null) => void
  onDistrictChange: (id: number | null) => void
  required?: boolean
  disabled?: boolean
}) {
  const isPerm = prefix === 'permanent'
  const addressKey = isPerm ? 'permanentAddress' : 'presentAddress'
  const countryKey = isPerm ? 'permanentCountryId' : 'presentCountryId'
  const stateKey = isPerm ? 'permanentStateId' : 'presentStateId'
  const districtKey = isPerm ? 'permanentDistrictId' : 'presentDistrictId'
  const cityKey = isPerm ? 'permanentCityId' : 'presentCityId'
  const streetKey = isPerm ? 'permanentStreet' : 'presentStreetName'
  const mandalKey = isPerm ? 'permanentMandal' : 'presentMandal'
  const pinKey = isPerm ? 'permanentPincode' : 'presentPincode'

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Address Line 1{required ? ' *' : ''}</Label><Input placeholder={EDIT_PLACEHOLDERS.addressLine} value={txt(data, [addressKey])} onChange={(e) => onChange({ [addressKey]: e.target.value })} disabled={disabled} required={required} /></div>
      <Select label="Country" placeholder={EDIT_PLACEHOLDERS.country} value={data[countryKey] ? String(data[countryKey]) : ''} onChange={(v) => onCountryChange(v ? Number(v) : null)} options={entityOptions(countries, ['countryId'], ['countryName'])} searchable clearable disabled={disabled} />
      <Select label="State" placeholder={EDIT_PLACEHOLDERS.state} value={data[stateKey] ? String(data[stateKey]) : ''} onChange={(v) => onStateChange(v ? Number(v) : null)} options={entityOptions(states, ['stateId'], ['stateName'])} searchable clearable disabled={disabled} />
      <Select label="District" placeholder={EDIT_PLACEHOLDERS.district} value={data[districtKey] ? String(data[districtKey]) : ''} onChange={(v) => onDistrictChange(v ? Number(v) : null)} options={entityOptions(districts, ['districtId'], ['districtName'])} searchable clearable disabled={disabled} />
      <Select label="City" placeholder={EDIT_PLACEHOLDERS.city} value={data[cityKey] ? String(data[cityKey]) : ''} onChange={(v) => onChange({ [cityKey]: v ? Number(v) : null })} options={entityOptions(cities, ['cityId'], ['cityName'])} searchable clearable disabled={disabled} />
      <div className="space-y-1"><Label className="text-xs">Street</Label><Input placeholder={EDIT_PLACEHOLDERS.street} value={txt(data, [streetKey])} onChange={(e) => onChange({ [streetKey]: e.target.value })} disabled={disabled} /></div>
      <div className="space-y-1"><Label className="text-xs">Mandal</Label><Input placeholder={EDIT_PLACEHOLDERS.mandal} value={txt(data, [mandalKey])} onChange={(e) => onChange({ [mandalKey]: e.target.value })} disabled={disabled} /></div>
      <div className="space-y-1"><Label className="text-xs">Pin Code</Label><Input placeholder={EDIT_PLACEHOLDERS.pincode} value={txt(data, [pinKey])} onChange={(e) => onChange({ [pinKey]: e.target.value })} inputMode="numeric" disabled={disabled} /></div>
    </div>
  )
}
