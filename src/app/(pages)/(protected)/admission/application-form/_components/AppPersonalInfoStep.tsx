'use client'

import { MapPin, User } from 'lucide-react'
import { Select } from '@/common/components/select'
import { DatePicker } from '@/common/components/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { FormSectionHeader } from '@/app/(pages)/(protected)/admin-student-information-system/edit-student/FormSectionHeader'
import { PhotoField } from '@/app/(pages)/(protected)/admin-student-information-system/edit-student/PhotoField'
import { FieldError } from './FieldError'
import {
  calcAge,
  entityOptions,
  gdOptions,
  num,
  parseDate,
  txt,
  type AnyRow,
} from './application-form-utils'

export interface AppPersonalInfoStepProps {
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
  onStudentPhoto: (file: File) => void
  onFatherPhoto: (file: File) => void
  onMotherPhoto: (file: File) => void
  /** Validation messages keyed by field — shown below each field. */
  errors?: Record<string, string>
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
}

/** Angular Personal Info step — field set/labels match add-application-form. */
export function AppPersonalInfoStep(props: AppPersonalInfoStepProps) {
  const { data, onChange, sameAsPermanent, onSameAsPermanentChange } = props
  const errors = props.errors ?? {}
  const dob = parseDate(data.dob)
  const age = calcAge(dob)
  const isNonLocal = Number(data.isLocal) === 2

  return (
    <div className="space-y-5">
      <FormSectionHeader icon={User} title="Personal Information" />
      <FieldGrid>
        <Select
          label="Title"
          placeholder="Title"
          value={data.titleId ? String(data.titleId) : ''}
          onChange={(v) => onChange({ titleId: v ? Number(v) : null })}
          options={gdOptions(props.titles)}
          searchable
          clearable
        />
        <div className="space-y-1 lg:col-span-2">
          <Label className="text-xs">
            Full Name (as per Previous Degree) <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="Full Name (as per Previous Degree)"
            value={txt(data, ['firstName'])}
            onChange={(e) => onChange({ firstName: e.target.value })}
            required
            aria-invalid={errors.firstName ? true : undefined}
          />
          <FieldError message={errors.firstName} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">
            Date Of Birth (as per Previous Degree) <span className="text-destructive">*</span>
          </Label>
          <DatePicker
            placeholder="Date Of Birth (as per Previous Degree)"
            value={dob}
            onChange={(d) => onChange({ dob: d, age: calcAge(d) })}
          />
          <FieldError message={errors.dob} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Age</Label>
          <Input value={age != null ? String(age) : ''} disabled readOnly />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <Checkbox
            checked={Boolean(data.isMinority)}
            onCheckedChange={(c) => onChange({ isMinority: c === true })}
          />
          IsMinority
        </label>
        <div className="flex items-end justify-center lg:row-span-2">
          <PhotoField src={props.studentPhotoUrl} onFile={props.onStudentPhoto} label="Student Photo" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">
            SSC/CBSE/ICSC <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="SSC/CBSE/ICSC"
            value={txt(data, ['sscNo'])}
            onChange={(e) => onChange({ sscNo: e.target.value })}
            required
            aria-invalid={errors.sscNo ? true : undefined}
          />
          <FieldError message={errors.sscNo} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">
            Identification Marks <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="Identification Marks"
            value={txt(data, ['identificationMarks'])}
            onChange={(e) => onChange({ identificationMarks: e.target.value })}
            required
            aria-invalid={errors.identificationMarks ? true : undefined}
          />
          <FieldError message={errors.identificationMarks} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Gender</Label>
          <RadioGroup
            value={data.genderId ? String(data.genderId) : ''}
            onValueChange={(v) => onChange({ genderId: v ? Number(v) : null })}
            className="flex flex-wrap gap-4 pt-1"
          >
            {props.genders.map((g) => {
              const id = String(num(g, ['generalDetailId']))
              return (
                <label key={id} className="inline-flex items-center gap-1.5 text-sm">
                  <RadioGroupItem value={id} />
                  {txt(g, ['generalDetailDisplayName'])}
                </label>
              )
            })}
          </RadioGroup>
        </div>
        <Select
          label="Qualified Exam Type"
          placeholder="Qualified Exam Type"
          value={data.qualifyingId ? String(data.qualifyingId) : ''}
          onChange={(v) => onChange({ qualifyingId: v ? Number(v) : null })}
          options={gdOptions(props.qualifyingExamTypes)}
          searchable
          clearable
        />
        <div className="space-y-1">
          <Label className="text-xs">Qualified Rank</Label>
          <Input
            placeholder="Qualified Rank"
            value={txt(data, ['eamcetRank'])}
            onChange={(e) => onChange({ eamcetRank: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Qualified HallTicket Number</Label>
          <Input
            placeholder="Qualified HallTicket Number"
            value={txt(data, ['entranceHTNumber'])}
            onChange={(e) => onChange({ entranceHTNumber: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">
            Student Mobile <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="Student Mobile"
            value={txt(data, ['mobile'])}
            onChange={(e) => onChange({ mobile: e.target.value })}
            inputMode="numeric"
            maxLength={10}
            required
            aria-invalid={errors.mobile ? true : undefined}
          />
          <FieldError message={errors.mobile} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Student Email ID</Label>
          <Input
            type="email"
            placeholder="Student Email ID"
            value={txt(data, ['email'])}
            onChange={(e) => onChange({ email: e.target.value })}
          />
        </div>
        <Select
          label="Nationality"
          placeholder="Nationality"
          value={data.nationalityId ? String(data.nationalityId) : ''}
          onChange={(v) => onChange({ nationalityId: v ? Number(v) : null })}
          options={gdOptions(props.nationalities)}
          searchable
          clearable
        />
        <Select
          label="Religion"
          placeholder="Religion"
          value={data.religionId ? String(data.religionId) : ''}
          onChange={(v) => onChange({ religionId: v ? Number(v) : null })}
          options={gdOptions(props.religions)}
          searchable
          clearable
        />
        <Select
          label="Caste"
          placeholder="Caste"
          required
          value={data.casteId ? String(data.casteId) : ''}
          onChange={(v) => props.onCasteChange(v ? Number(v) : null)}
          options={entityOptions(props.castes, ['casteId'], ['caste'])}
          searchable
          clearable
          error={errors.casteId}
        />
        {props.subCastes.length > 0 ? (
          <Select
            label="Sub Caste"
            placeholder="Sub Caste"
            value={data.subCasteId ? String(data.subCasteId) : ''}
            onChange={(v) => onChange({ subCasteId: v ? Number(v) : null })}
            options={entityOptions(props.subCastes, ['subCasteId'], ['subCaste'])}
            searchable
            clearable
          />
        ) : null}
        <Select
          label="Disability"
          placeholder="Disability"
          value={data.disabilityId ? String(data.disabilityId) : ''}
          onChange={(v) => onChange({ disabilityId: v ? Number(v) : null })}
          options={gdOptions(props.disabilities)}
          searchable
          clearable
        />
        <Select
          label="Blood Group"
          placeholder="Blood Group"
          value={data.bloodGroupId ? String(data.bloodGroupId) : ''}
          onChange={(v) => onChange({ bloodGroupId: v ? Number(v) : null })}
          options={gdOptions(props.bloodGroups)}
          searchable
          clearable
        />
        <div className="space-y-1">
          <Label className="text-xs">
            Aadhar Card Number <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="Aadhar Card Number"
            value={txt(data, ['aadharCardNo'])}
            onChange={(e) => onChange({ aadharCardNo: e.target.value })}
            inputMode="numeric"
            maxLength={12}
            aria-invalid={errors.aadharCardNo ? true : undefined}
          />
          <FieldError message={errors.aadharCardNo} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">PanCard Number</Label>
          <Input
            placeholder="PanCard Number"
            value={txt(data, ['pancardNo'])}
            onChange={(e) => onChange({ pancardNo: e.target.value })}
            maxLength={10}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Passport Number</Label>
          <Input
            placeholder="Passport Number"
            value={txt(data, ['passportNo'])}
            onChange={(e) => onChange({ passportNo: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Date Of Issue</Label>
          <DatePicker
            placeholder="Date Of Issue"
            value={parseDate(data.dateOfIssue)}
            onChange={(d) => onChange({ dateOfIssue: d })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Date Of Leaving</Label>
          <DatePicker
            placeholder="Date Of Leaving"
            value={parseDate(data.dateOfExpiry)}
            onChange={(d) => onChange({ dateOfExpiry: d })}
          />
        </div>
      </FieldGrid>

      <FormSectionHeader icon={User} title="Parent Details :" />
      <FieldGrid>
        <div className="space-y-1">
          <Label className="text-xs">
            Father Name <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="Father Name"
            value={txt(data, ['fatherName'])}
            onChange={(e) => onChange({ fatherName: e.target.value })}
            aria-invalid={errors.fatherName ? true : undefined}
          />
          <FieldError message={errors.fatherName} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Occupation</Label>
          <Input
            placeholder="Occupation"
            value={txt(data, ['fatherOccupation'])}
            onChange={(e) => onChange({ fatherOccupation: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Qualification</Label>
          <Input
            placeholder="Qualification"
            value={txt(data, ['fatherQualification'])}
            onChange={(e) => onChange({ fatherQualification: e.target.value })}
          />
        </div>
        <div className="flex items-center justify-center">
          <PhotoField src={props.fatherPhotoUrl} onFile={props.onFatherPhoto} label="Father Photo" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Annual Income</Label>
          <Input
            placeholder="Annual Income"
            value={txt(data, ['fathersIncomePa'])}
            onChange={(e) => onChange({ fathersIncomePa: e.target.value })}
            inputMode="numeric"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">
            Mobile Number <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="Mobile Number"
            value={txt(data, ['fatherMobileNo'])}
            onChange={(e) => onChange({ fatherMobileNo: e.target.value })}
            inputMode="numeric"
            maxLength={10}
            aria-invalid={errors.fatherMobileNo ? true : undefined}
          />
          <FieldError message={errors.fatherMobileNo} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Email ID</Label>
          <Input
            type="email"
            placeholder="Email ID"
            value={txt(data, ['fatherEmailId'])}
            onChange={(e) => onChange({ fatherEmailId: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Address</Label>
          <Input
            placeholder="Address"
            value={txt(data, ['fatherAddress'])}
            onChange={(e) => onChange({ fatherAddress: e.target.value })}
          />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <Checkbox
            checked={Boolean(data.isgovtempFather)}
            onCheckedChange={(c) => onChange({ isgovtempFather: c === true })}
          />
          IsGovtEmp
        </label>
      </FieldGrid>

      <FieldGrid>
        <div className="space-y-1">
          <Label className="text-xs">Mother Name</Label>
          <Input
            placeholder="Mother Name"
            value={txt(data, ['motherName'])}
            onChange={(e) => onChange({ motherName: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Occupation</Label>
          <Input
            placeholder="Occupation"
            value={txt(data, ['motherOccupation'])}
            onChange={(e) => onChange({ motherOccupation: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Qualification</Label>
          <Input
            placeholder="Qualification"
            value={txt(data, ['motherQualification'])}
            onChange={(e) => onChange({ motherQualification: e.target.value })}
          />
        </div>
        <div className="flex items-center justify-center">
          <PhotoField src={props.motherPhotoUrl} onFile={props.onMotherPhoto} label="Mother Photo" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Annual Income</Label>
          <Input
            placeholder="Annual Income"
            value={txt(data, ['motherIncomePa'])}
            onChange={(e) => onChange({ motherIncomePa: e.target.value })}
            inputMode="numeric"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Mobile Number</Label>
          <Input
            placeholder="Mobile Number"
            value={txt(data, ['motherMobileNo'])}
            onChange={(e) => onChange({ motherMobileNo: e.target.value })}
            inputMode="numeric"
            maxLength={10}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Email ID</Label>
          <Input
            type="email"
            placeholder="Email ID"
            value={txt(data, ['motherEmailId'])}
            onChange={(e) => onChange({ motherEmailId: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Address</Label>
          <Input
            placeholder="Address"
            value={txt(data, ['motherAddress'])}
            onChange={(e) => onChange({ motherAddress: e.target.value })}
          />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <Checkbox
            checked={Boolean(data.isgovtempMother)}
            onCheckedChange={(c) => onChange({ isgovtempMother: c === true })}
          />
          IsGovtEmp
        </label>
      </FieldGrid>

      <div className="px-1">
        <RadioGroup
          value={String(data.isLocal ?? 1)}
          onValueChange={(v) => onChange({ isLocal: Number(v) })}
          className="flex gap-4"
        >
          <label className="inline-flex items-center gap-1.5 text-sm">
            <RadioGroupItem value="1" />
            Local
          </label>
          <label className="inline-flex items-center gap-1.5 text-sm">
            <RadioGroupItem value="2" />
            Non-Local
          </label>
        </RadioGroup>
      </div>

      {isNonLocal ? (
        <>
          <FormSectionHeader icon={User} title="Guardian Details" />
          <FieldGrid>
            <div className="space-y-1">
              <Label className="text-xs">Guardian Name</Label>
              <Input
                placeholder="Guardian Name"
                value={txt(data, ['guardianName'])}
                onChange={(e) => onChange({ guardianName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mobile Number</Label>
              <Input
                placeholder="Mobile Number"
                value={txt(data, ['guardianMobileNo'])}
                onChange={(e) => onChange({ guardianMobileNo: e.target.value })}
                inputMode="numeric"
                maxLength={10}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email ID</Label>
              <Input
                type="email"
                placeholder="Email ID"
                value={txt(data, ['guardianEmailId'])}
                onChange={(e) => onChange({ guardianEmailId: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Annual Income</Label>
              <Input
                placeholder="Annual Income"
                value={txt(data, ['guardianIncomePa'])}
                onChange={(e) => onChange({ guardianIncomePa: e.target.value })}
                inputMode="numeric"
              />
            </div>
          </FieldGrid>
        </>
      ) : null}

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
        addressError={errors.permanentAddress}
      />

      <FormSectionHeader
        icon={MapPin}
        title="Present Address"
        action={
          <label className="flex items-center gap-2 text-xs">
            <Checkbox
              checked={sameAsPermanent}
              onCheckedChange={(c) => onSameAsPermanentChange(c === true)}
            />
            Same As Permanent Address
          </label>
        }
      />
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
  addressError,
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
  addressError?: string
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
      <div className="space-y-1 sm:col-span-2">
        <Label className="text-xs">Address Line 1{required ? ' *' : ''}</Label>
        <Input
          placeholder="Address Line 1"
          value={txt(data, [addressKey])}
          onChange={(e) => onChange({ [addressKey]: e.target.value })}
          disabled={disabled}
          required={required}
          aria-invalid={addressError ? true : undefined}
        />
        <FieldError message={addressError} />
      </div>
      <Select
        label="Country"
        placeholder="Country"
        value={data[countryKey] ? String(data[countryKey]) : ''}
        onChange={(v) => onCountryChange(v ? Number(v) : null)}
        options={entityOptions(countries, ['countryId'], ['countryName'])}
        searchable
        clearable
        disabled={disabled}
      />
      <Select
        label="State"
        placeholder="State"
        value={data[stateKey] ? String(data[stateKey]) : ''}
        onChange={(v) => onStateChange(v ? Number(v) : null)}
        options={entityOptions(states, ['stateId'], ['stateName'])}
        searchable
        clearable
        disabled={disabled}
      />
      <Select
        label="District"
        placeholder="District"
        value={data[districtKey] ? String(data[districtKey]) : ''}
        onChange={(v) => onDistrictChange(v ? Number(v) : null)}
        options={entityOptions(districts, ['districtId'], ['districtName'])}
        searchable
        clearable
        disabled={disabled}
      />
      <Select
        label="City"
        placeholder="City"
        value={data[cityKey] ? String(data[cityKey]) : ''}
        onChange={(v) => onChange({ [cityKey]: v ? Number(v) : null })}
        options={entityOptions(cities, ['cityId'], ['cityName'])}
        searchable
        clearable
        disabled={disabled}
      />
      <div className="space-y-1">
        <Label className="text-xs">Street</Label>
        <Input
          placeholder="Street"
          value={txt(data, [streetKey])}
          onChange={(e) => onChange({ [streetKey]: e.target.value })}
          disabled={disabled}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Mandal</Label>
        <Input
          placeholder="Mandal"
          value={txt(data, [mandalKey])}
          onChange={(e) => onChange({ [mandalKey]: e.target.value })}
          disabled={disabled}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Pin Code</Label>
        <Input
          placeholder="Pin Code"
          value={txt(data, [pinKey])}
          onChange={(e) => onChange({ [pinKey]: e.target.value })}
          inputMode="numeric"
          disabled={disabled}
        />
      </div>
    </div>
  )
}
